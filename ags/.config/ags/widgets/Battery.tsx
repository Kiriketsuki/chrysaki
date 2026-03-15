import { createBinding, createComputed } from "ags"
import AstalBattery from "gi://AstalBattery"

const battery = AstalBattery.get_default()!

function batteryIcon(pct: number, charging: boolean): string {
  if (charging) return "󰂄"
  if (pct > 80) return "󰁹"
  if (pct > 20) return "󰁾"
  return "󰁺"
}

function batteryClass(pct: number, charging: boolean): string {
  if (charging) return "battery-label battery-charging"
  if (pct > 80) return "battery-label battery-full"
  if (pct > 20) return "battery-label battery-medium"
  return "battery-label battery-low"
}

export function Battery() {
  const isPresent = createBinding(battery, "isPresent")
  const pct = createBinding(battery, "percentage")
  const charging = createBinding(battery, "charging")

  const text = createComputed(() => {
    const p = Math.round(pct() * 100)
    const c = charging()
    return `${batteryIcon(p, c)}  ${p}%`
  })

  const cssClass = createComputed(() =>
    batteryClass(Math.round(pct() * 100), charging())
  )

  return (
    <box visible={isPresent}>
      <label class={cssClass} label={text} />
    </box>
  )
}
