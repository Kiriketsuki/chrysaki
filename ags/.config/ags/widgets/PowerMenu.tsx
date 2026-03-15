import { execAsync } from "ags/process"

export function PowerMenu() {
  return (
    <button
      class="power-button"
      label="⏻"
      onClicked={() =>
        execAsync(["bash", "-c", "~/dots/rofi/scripts/powermenu.sh"]).catch(console.error)
      }
      tooltipText="Power menu"
    />
  )
}
