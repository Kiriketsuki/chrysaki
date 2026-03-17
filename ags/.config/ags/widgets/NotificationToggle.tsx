import { toggleNotificationCenter } from "./NotificationCenter"

export function NotificationToggle() {
  return (
    <button
      class="utility-button"
      label="󰂚"
      onClicked={() => toggleNotificationCenter()}
      tooltipText="Toggle notifications"
    />
  )
}
