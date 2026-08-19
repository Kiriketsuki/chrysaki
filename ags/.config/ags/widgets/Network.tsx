/**
 * Network — bar segment showing wifi signal strength or wired link state.
 *
 * Reactivity note: AstalNetwork.Wifi and .Wired are nested GObjects — binding
 * only to `wifi`/`wired` fires when the *device* is swapped, not when its
 * strength, ssid, or speed changes. The effects below re-subscribe to the
 * relevant `notify::` signals on whichever device is current, so the icon and
 * label track live signal changes.
 */
import { createBinding, createComputed, createEffect, createState, onCleanup } from "ags"
import AstalNetwork from "gi://AstalNetwork"

const network = AstalNetwork.get_default()!

const SSID_MAX_LEN = 3

interface WifiState {
  readonly enabled: boolean
  readonly strength: number
  readonly ssid: string | null
}

interface WiredState {
  readonly speed: number
}

const NO_WIFI: WifiState = { enabled: false, strength: 0, ssid: null }
const NO_WIRED: WiredState = { speed: 0 }

function truncate(s: string | null, len: number): string {
  if (!s) return ""
  return s.length > len ? s.substring(0, len) + "…" : s
}

/** Signal-strength-aware wifi icon (nf-md-wifi_1..4) */
function wifiIcon(strength: number): string {
  if (strength >= 80) return "\u{F0928}" // 󰤨 nf-md-wifi (full)
  if (strength >= 60) return "\u{F0925}" // 󰤥 nf-md-wifi_3
  if (strength >= 40) return "\u{F0922}" // 󰤢 nf-md-wifi_2
  if (strength >= 1) return "\u{F091F}" // 󰤟 nf-md-wifi_1
  return "\u{F0927}" // 󰤧 nf-md-wifi_off
}

export function Network() {
  const wifi = createBinding(network, "wifi")
  const wired = createBinding(network, "wired")

  const [wifiState, setWifiState] = createState<WifiState>(NO_WIFI)
  const [wiredState, setWiredState] = createState<WiredState>(NO_WIRED)

  createEffect(() => {
    const w = wifi()
    if (!w) {
      setWifiState(NO_WIFI)
      return
    }

    const sync = (): void =>
      setWifiState({ enabled: w.enabled, strength: w.strength ?? 0, ssid: w.ssid })
    const ids = [
      w.connect("notify::enabled", sync),
      w.connect("notify::strength", sync),
      w.connect("notify::ssid", sync),
    ]
    sync()

    onCleanup(() => ids.forEach((id) => w.disconnect(id)))
  })

  createEffect(() => {
    const e = wired()
    if (!e) {
      setWiredState(NO_WIRED)
      return
    }

    const sync = (): void => setWiredState({ speed: e.speed ?? 0 })
    const ids = [e.connect("notify::speed", sync), e.connect("notify::state", sync)]
    sync()

    onCleanup(() => ids.forEach((id) => e.disconnect(id)))
  })

  const icon = createComputed(() => {
    const w = wifiState()
    if (w.enabled) return wifiIcon(w.strength)
    if (wiredState().speed > 0) return "\u{F0233}" // 󰈳 nf-md-ethernet
    return "\u{F0927}" // 󰤧 nf-md-wifi_off
  })

  const ssid = createComputed(() => {
    const w = wifiState()
    if (w.enabled) return truncate(w.ssid, SSID_MAX_LEN)
    if (wiredState().speed > 0) return "Ethernet"
    return "Offline"
  })

  const tooltip = createComputed(() => {
    const w = wifiState()
    if (w.enabled) return `${w.ssid ?? "Wifi"} — ${w.strength}%`
    const speed = wiredState().speed
    if (speed > 0) return `Ethernet — ${speed} Mb/s`
    return "Offline"
  })

  return (
    <box spacing={14} valign={3} tooltipText={tooltip}>
      <label class="network-icon" label={icon} />
      <label class="network-ssid" label={ssid} />
    </box>
  )
}
