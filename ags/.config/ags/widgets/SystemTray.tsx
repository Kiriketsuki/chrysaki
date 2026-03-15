import { createBinding } from "ags"
import AstalTray from "gi://AstalTray"

const tray = AstalTray.get_default()!

export function SystemTray() {
  const items = createBinding(tray, "items")

  return (
    <box class="segment-tray" spacing={4}>
      {items.as((its: AstalTray.TrayItem[]) =>
        its.map((item: AstalTray.TrayItem) => (
          <menubutton tooltipText={item.tooltipText ?? item.id}>
            <image gicon={item.gicon} pixelSize={16} />
          </menubutton>
        ))
      )}
    </box>
  )
}
