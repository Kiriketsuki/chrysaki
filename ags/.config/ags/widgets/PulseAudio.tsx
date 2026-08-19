/**
 * PulseAudio — bar segment showing default speaker volume, with click controls.
 *
 * Interaction:
 *   - Left click       toggle mute
 *   - Scroll up/down   volume +/- VOLUME_STEP
 *   - Middle click     reset to DEFAULT_VOLUME
 *   - Right click      open pavucontrol
 *
 * Reactivity note: AstalWp.Endpoint is a nested GObject — binding only to
 * `defaultSpeaker` fires when the *device* changes, not when its volume or
 * mute state does. The effect below re-subscribes to `notify::volume` and
 * `notify::mute` on whichever endpoint is currently default, so the label
 * tracks live changes (including ones made outside AGS, e.g. wpctl).
 */
import { createBinding, createComputed, createEffect, createState, onCleanup } from "ags"
import { Gdk, Gtk } from "ags/gtk4"
import { execAsync } from "ags/process"
import AstalWp from "gi://AstalWp?version=0.1"

const wp = AstalWp.get_default()!

const VOLUME_STEP = 0.05
const MAX_VOLUME = 1.0
const DEFAULT_VOLUME = 0.35
const MIXER_COMMAND = "pavucontrol"

interface SpeakerLevel {
  readonly volume: number
  readonly muted: boolean
}

const SILENT: SpeakerLevel = { volume: 0, muted: true }

function volumeIcon(vol: number, muted: boolean): string {
  if (muted) return "\u{F075F}" // 󰝟 nf-md-volume_off
  if (vol < 0.3) return "\u{F0580}" // 󰖀 nf-md-volume_low
  return "\u{F057E}" // 󰕾 nf-md-volume_high
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function PulseAudio() {
  const speaker = createBinding(wp, "defaultSpeaker")
  const [level, setLevel] = createState<SpeakerLevel>(SILENT)

  // Re-subscribe whenever the default speaker is swapped (e.g. earbuds connect).
  createEffect(() => {
    const s = speaker()
    if (!s) {
      setLevel(SILENT)
      return
    }

    const sync = (): void => setLevel({ volume: s.volume, muted: s.mute })
    const volumeId = s.connect("notify::volume", sync)
    const muteId = s.connect("notify::mute", sync)
    sync()

    onCleanup(() => {
      s.disconnect(volumeId)
      s.disconnect(muteId)
    })
  })

  const label = createComputed(() => {
    if (!speaker()) return "\u{F075F} --%"
    const { volume, muted } = level()
    return `${volumeIcon(volume, muted)} ${Math.round(volume * 100)}%`
  })

  const tooltip = createComputed(() => {
    const s = speaker()
    if (!s) return "No audio output"
    const { muted } = level()
    const state = muted ? " (muted)" : ""
    return `${s.description ?? s.name ?? "Output"}${state}\nScroll: volume · Click: mute · Right click: mixer`
  })

  const visible = createComputed(() => speaker() !== null)

  function adjustVolume(delta: number): void {
    const s = speaker.peek()
    if (!s) return
    s.volume = clamp(s.volume + delta, 0, MAX_VOLUME)
    if (s.mute && delta > 0) s.mute = false
  }

  function toggleMute(): void {
    const s = speaker.peek()
    if (!s) return
    s.mute = !s.mute
  }

  function openMixer(): void {
    execAsync(MIXER_COMMAND).catch((error: unknown) => {
      console.error(`PulseAudio: failed to launch ${MIXER_COMMAND}`, error)
    })
  }

  return (
    <box class="pulseaudio-box" visible={visible} valign={3}>
      <button
        class="pulseaudio-button"
        onClicked={toggleMute}
        tooltipText={tooltip}
        $={(self: Gtk.Widget) => {
          const scroll = new Gtk.EventControllerScroll({
            flags: Gtk.EventControllerScrollFlags.VERTICAL,
          })
          // GTK reports dy > 0 for scroll-down, so invert for "up = louder".
          scroll.connect("scroll", (_ctrl: unknown, _dx: number, dy: number) => {
            if (dy === 0) return false
            adjustVolume(dy < 0 ? VOLUME_STEP : -VOLUME_STEP)
            return true
          })
          self.add_controller(scroll)

          const secondary = new Gtk.GestureClick({ button: 0 })
          secondary.connect("pressed", (gesture: Gtk.GestureClick) => {
            const button = gesture.get_current_button()
            if (button === Gdk.BUTTON_SECONDARY) openMixer()
            else if (button === Gdk.BUTTON_MIDDLE) {
              const s = speaker.peek()
              if (s) {
                s.volume = DEFAULT_VOLUME
                s.mute = false
              }
            }
          })
          self.add_controller(secondary)
        }}
      >
        <label class="pulseaudio-label" label={label} halign={3} valign={3} />
      </button>
    </box>
  )
}
