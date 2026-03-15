import { createBinding, createComputed } from "ags"
import AstalNetwork from "gi://AstalNetwork"

const network = AstalNetwork.get_default()!

function truncate(s: string | null, len: number): string {
  if (!s) return ""
  return s.length > len ? s.substring(0, len) + "\u2026" : s
}

/** Signal-strength-aware wifi icon (nf-md-wifi_1..4) */
function wifiIcon(strength: number): string {
  if (strength >= 80) return "\u{F0928}" // 󰤨 nf-md-wifi (full)
  if (strength >= 60) return "\u{F0925}" // 󰤥 nf-md-wifi_3
  if (strength >= 40) return "\u{F0922}" // 󰤢 nf-md-wifi_2
  if (strength >= 1) return "\u{F091F}"  // 󰤟 nf-md-wifi_1
  return "\u{F0927}"                      // 󰤧 nf-md-wifi_off
}

export function Network() {
  const wifi = createBinding(network, "wifi")
  const wired = createBinding(network, "wired")

  const icon = createComputed(() => {
    const w = wifi()
    if (w && w.enabled) return wifiIcon(w.strength ?? 0)
    const e = wired()
    if (e && e.speed > 0) return "\u{F0233}" // 󰈳 nf-md-ethernet
    return "\u{F0927}" // 󰤧 nf-md-wifi_off
  })

  const ssid = createComputed(() => {
    const w = wifi()
    if (w && w.enabled) return truncate(w.ssid, 10)
    const e = wired()
    if (e && e.speed > 0) return "Ethernet"
    return "Offline"
  })

  return (
    <box spacing={6} valign={3}>
      <label class="network-icon" label={icon} />
      <label class="network-ssid" label={ssid} />
    </box>
  )
}
