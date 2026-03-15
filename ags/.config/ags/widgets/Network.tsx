import { createBinding, createComputed } from "ags"
import AstalNetwork from "gi://AstalNetwork"

const network = AstalNetwork.get_default()!

function truncate(s: string | null, len: number): string {
  if (!s) return ""
  return s.length > len ? s.substring(0, len) + "…" : s
}

export function Network() {
  const wifi = createBinding(network, "wifi")
  const wired = createBinding(network, "wired")

  const text = createComputed(() => {
    const w = wifi()
    if (w && w.enabled) return `⌾ ${truncate(w.ssid, 16)}`
    const e = wired()
    if (e && e.speed > 0) return "⏚ Ethernet"
    return "⊗ No network"
  })

  return (
    <box class="segment-network">
      <label class="network-label" label={text} />
    </box>
  )
}
