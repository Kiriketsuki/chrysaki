/**
 * Mouse -- bar indicator for the Logitech mouse: icon, battery percent, offline state.
 *
 * Controls:
 *   left-click    open the quick-control panel (MousePanel)
 *
 * The indicator hides itself while the device is absent, for example on a laptop
 * with no Bolt receiver. The shared reading lives in lib/mouse-store.
 */
import { createComputed } from "ags"
import { mouseReading } from "../lib/mouse-store"
import { DEVICE_NAME, type MouseReading } from "../lib/solaar"
import { toggleMousePanel } from "./MousePanel"

const LOW_BATTERY_PERCENT = 20

const ICON_MOUSE = "\u{F037D}" // nf-md-mouse
const ICON_MOUSE_OFF = "\u{F037E}" // nf-md-mouse_off

function mouseLabel(r: MouseReading): string {
  if (r.presence === "offline") return "off"
  if (r.presence === "error") return "err"
  return r.battery === null ? "--%" : `${r.battery}%`
}

function mouseClass(r: MouseReading): string {
  if (r.presence === "error") return "mouse-button mouse-error"
  if (r.presence === "offline") return "mouse-button mouse-offline"
  if (r.charging) return "mouse-button mouse-charging"
  if (r.battery !== null && r.battery <= LOW_BATTERY_PERCENT) return "mouse-button mouse-low"
  return "mouse-button"
}

function mouseTooltip(r: MouseReading): string {
  if (r.presence === "error") return `${DEVICE_NAME}: Solaar failed. ${r.detail}`
  if (r.presence === "offline") return `${DEVICE_NAME}: offline. Click: controls`
  const battery = r.battery === null ? "battery unknown" : `battery ${r.battery}%`
  const charging = r.charging ? ", charging" : ""
  return `${DEVICE_NAME}: ${battery}${charging}. Click: controls`
}

export function Mouse() {
  const visible = createComputed(() => {
    const { presence } = mouseReading()
    return presence !== "unknown" && presence !== "absent"
  })
  const icon = createComputed(() =>
    mouseReading().presence === "online" ? ICON_MOUSE : ICON_MOUSE_OFF,
  )

  return (
    <box class="mouse-box" visible={visible} valign={3}>
      <button
        class={mouseReading.as(mouseClass)}
        onClicked={() => toggleMousePanel()}
        tooltipText={mouseReading.as(mouseTooltip)}
      >
        <box spacing={4} valign={3}>
          <label class="mouse-icon" label={icon} />
          <label class="mouse-label" label={mouseReading.as(mouseLabel)} />
        </box>
      </button>
    </box>
  )
}
