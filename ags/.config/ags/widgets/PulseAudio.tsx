import { createBinding, createComputed } from "ags"
import AstalWp from "gi://AstalWp?version=0.1"

const wp = AstalWp.get_default()!

function volumeIcon(vol: number, muted: boolean): string {
  if (muted) return "󰝟"
  if (vol < 0.3) return "󰖀"
  return "󰕾"
}

export function PulseAudio() {
  const speaker = createBinding(wp, "defaultSpeaker")

  const text = createComputed(() => {
    const s = speaker()
    if (!s) return "󰝟 --%"
    const vol = Math.round(s.volume * 100)
    const icon = volumeIcon(s.volume, s.mute)
    return `${icon} ${vol}%`
  })

  const visible = createComputed(() => speaker() !== null)

  return (
    <box visible={visible}>
      <label class="pulseaudio-label" label={text} halign={3} valign={3} />
    </box>
  )
}
