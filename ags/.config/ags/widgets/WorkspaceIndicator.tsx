import { createBinding, createState, createComputed, onCleanup } from "ags"
import AstalHyprland from "gi://AstalHyprland"

const hyprland = AstalHyprland.get_default()!

// Active pip color cycles through emerald/blue/amethyst by workspace id mod 3
const ACTIVE_CLASSES = ["pip-active-0", "pip-active-1", "pip-active-2"] as const

// Track urgent workspace id via signal (not a GObject property)
const [urgentId, setUrgentId] = createState<number | null>(null)
const urgentHandle = hyprland.connect("urgent", (_: any, client: any) => {
  setUrgentId(client?.workspace?.id ?? null)
})
onCleanup(() => hyprland.disconnect(urgentHandle))

function pipCssClass(id: number, focusedId: number, isUrgent: boolean): string {
  if (isUrgent) return "pip pip-urgent"
  if (id === focusedId) return `pip ${ACTIVE_CLASSES[(id - 1) % 3]}`
  const ws = hyprland.get_workspace(id)
  if (ws && ws.clients.length > 0) return "pip pip-occupied"
  return "pip pip-inactive"
}

export function WorkspaceIndicator() {
  const focused = createBinding(hyprland, "focusedWorkspace")

  const pips = Array.from({ length: 10 }, (_, i) => {
    const id = i + 1
    return (
      <button
        class={createComputed(() => {
          const focusedId = focused()?.id ?? 1
          return pipCssClass(id, focusedId, urgentId() === id)
        })}
        widthRequest={8}
        heightRequest={8}
        halign={3}
        valign={3}
        onClicked={() => hyprland.dispatch("workspace", String(id))}
      />
    )
  })

  return (
    <box class="workspace-pips" spacing={4}>
      {pips}
    </box>
  )
}
