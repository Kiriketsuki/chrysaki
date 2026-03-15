import { createBinding, createComputed } from "ags"
import AstalHyprland from "gi://AstalHyprland"
import { drawHexFlat } from "../lib/cairo-hex"
import { hexToRgba } from "../lib/cairo-separator"

const hyprland = AstalHyprland.get_default()!

// Active pip colors cycle by (workspaceId - 1) % 3
const ACTIVE_COLORS = ["#1a8a6a", "#1c3d7a", "#583090"] as const  // emerald-lt, blue-lt, amethyst-lt
const OCCUPIED_COLOR = "#0e4a38"  // emerald-dim
const URGENT_COLOR = "#8C2F39"   // error

interface PipProps {
  readonly id: number
}

function WorkspacePip({ id }: PipProps) {
  const focused = createBinding(hyprland, "focusedWorkspace")
  const workspaces = createBinding(hyprland, "workspaces")

  // Only visible if this workspace is active or has clients
  const visible = createComputed(() => {
    const focusedId = focused()?.id ?? 1
    if (id === focusedId) return true
    const wss = workspaces()
    const ws = wss.find((w: AstalHyprland.Workspace) => w.id === id)
    return ws !== undefined && ws.clients.length > 0
  })

  return (
    <button
      visible={visible}
      class="pip-button"
      onClicked={() => hyprland.dispatch("workspace", String(id))}
      tooltipText={`Workspace ${id}`}
      hexpand={false}
      vexpand={false}
    >
      <drawingarea
        widthRequest={18}
        heightRequest={16}
        $={(da: any) => {
          da.set_draw_func((_area: any, cr: any, w: number, h: number) => {
            const focusedId = hyprland.focusedWorkspace?.id ?? 1
            const isActive = id === focusedId
            const colorHex = isActive ? ACTIVE_COLORS[(id - 1) % 3] : OCCUPIED_COLOR
            const alpha = isActive ? 1.0 : 0.8
            drawHexFlat(cr, w / 2, h / 2, 7, hexToRgba(colorHex, alpha))
          })

          // Trigger redraw when focus or workspaces change
          const hFocus = hyprland.connect("notify::focused-workspace", () => da.queue_draw())
          const hWs = hyprland.connect("notify::workspaces", () => da.queue_draw())
          da.connect("destroy", () => {
            hyprland.disconnect(hFocus)
            hyprland.disconnect(hWs)
          })
        }}
      />
    </button>
  )
}

export function WorkspaceIndicator() {
  const pips = Array.from({ length: 10 }, (_, i) => (
    <WorkspacePip id={i + 1} />
  ))

  return (
    <box class="workspace-pips" spacing={4}>
      {pips}
    </box>
  )
}
