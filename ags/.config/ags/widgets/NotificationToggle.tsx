import { execAsync } from "ags/process"

export function NotificationToggle() {
  return (
    <button
      class="utility-button"
      label="󰂚"
      onClicked={() =>
        execAsync(["bash", "-c", "swaync-client -t"]).catch(console.error)
      }
      tooltipText="Toggle notifications"
    />
  )
}
