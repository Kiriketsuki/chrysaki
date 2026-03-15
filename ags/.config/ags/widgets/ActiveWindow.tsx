import { createBinding, createComputed } from "ags"
import AstalHyprland from "gi://AstalHyprland"

const hyprland = AstalHyprland.get_default()!

function truncate(s: string | null | undefined, len: number): string {
  if (!s) return ""
  return s.length > len ? s.substring(0, len) + "…" : s
}

export function ActiveWindow() {
  const client = createBinding(hyprland, "focusedClient")

  const text = createComputed(() => {
    const c = client()
    return c ? truncate(c.title, 30) : "Desktop"
  })

  return (
    <label
      class="active-window-label"
      label={text}
      halign={3}
      valign={3}
    />
  )
}
