import { createPoll } from "ags/time"
import { execAsync } from "ags/process"

export function ThemeButton() {
  const theme = createPoll("", 3600000, ["bash", "-c", "~/.config/waybar/scripts/get_theme.sh 2>/dev/null || echo Theme"])

  return (
    <button
      class="utility-button"
      onClicked={() =>
        execAsync(["bash", "-c", "~/.config/waybar/scripts/theme_switcher.sh"]).catch(console.error)
      }
      tooltipText="Switch theme"
    >
      <label label={theme} halign={3} valign={3} />
    </button>
  )
}
