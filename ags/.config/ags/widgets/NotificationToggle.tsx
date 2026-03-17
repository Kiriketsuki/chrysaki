import { getUnreadCount, onUnreadChange, toggleNotificationCenter } from "./NotificationCenter"

export function NotificationToggle() {
  return (
    <box class="notif-toggle-wrap" valign={3}>
      <button
        class="utility-button"
        label="󰂚"
        onClicked={() => toggleNotificationCenter()}
        tooltipText="Toggle notifications"
      />
      <label
        class="notif-badge"
        visible={false}
        label=""
        valign={1}
        $={(self: any) => {
          function update() {
            const count = getUnreadCount()
            if (count > 0) {
              self.label = count > 9 ? "9+" : String(count)
              self.visible = true
            } else {
              self.label = ""
              self.visible = false
            }
          }
          onUnreadChange(update)
        }}
      />
    </box>
  )
}
