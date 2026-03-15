import { execAsync } from "ags/process"

export function WallpaperButton() {
  return (
    <button
      class="utility-button"
      label="󰋩"
      onClicked={() =>
        execAsync(["bash", "-c", "~/.config/hypr/scripts/wallpaper.sh"]).catch(console.error)
      }
      tooltipText="Change wallpaper"
    />
  )
}
