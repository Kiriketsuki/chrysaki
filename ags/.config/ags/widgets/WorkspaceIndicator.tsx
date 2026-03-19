import GLib from "gi://GLib?version=2.0"
import AstalHyprland from "gi://AstalHyprland"
import { Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
import { drawHexFlat } from "../lib/cairo-hex"
import { hexToRgba } from "../lib/cairo-separator"
import { drawTriangleSeparator } from "../lib/cairo-triangles"

const hyprland = AstalHyprland.get_default()!

/** Check if workspace `wsId` is the active workspace on any Hyprland monitor. */
function isActiveOnMonitor(wsId: number): boolean {
  return (hyprland.monitors as AstalHyprland.Monitor[]).some(
    (m) => m.activeWorkspace?.id === wsId,
  )
}

// Active pip: Royal Blue Light fill, Blonde text
// Occupied pip: Border fill, text-primary text
const ACTIVE_FILL  = "#1c3d7a"  // Royal Blue Light
const ACTIVE_TEXT  = "#FBB13C"  // Blonde
const OCCUPIED_FILL = "#363a4f" // Border
const OCCUPIED_TEXT = "#e0e2ea" // text-primary

const HEX_RADIUS = 10
const PIP_WIDTH  = 24
const PIP_HEIGHT = 22
const SEP_WIDTH  = 6
const SEP_HEIGHT = 22

// ── Per-pip rotation state (module-level — persists across re-renders) ────────

/** Current animated rotation (radians) for each workspace id. */
const pipCurrentRot = new Map<number, number>()
/** Active GLib timer id per pip (0 = none). */
const pipTimers     = new Map<number, number>()

const ANIM_DURATION_MS = 250
const ANIM_FPS_MS      = 16   // ~60fps

/** Flat-top orientation: horizontal edges top/bottom. */
const INACTIVE_ROT = 0
/** Pointy-top orientation: single vertex pointing up. */
const ACTIVE_ROT   = -Math.PI / 2

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Find the closest angle equivalent to `targetBase` (mod 2π) relative to `current`.
 * Ensures animation always takes the shortest arc, never more than π.
 */
function targetRotFor(current: number, targetBase: number): number {
  const diff  = current - targetBase
  const turns = Math.round(diff / (2 * Math.PI))
  return targetBase + turns * 2 * Math.PI
}

/**
 * Animate pip `id` to the orientation defined by `targetBase` (ACTIVE_ROT or INACTIVE_ROT).
 * Cancels any in-progress animation and starts fresh from the current position.
 */
function startRotationAnim(id: number, da: any, targetBase: number): void {
  // Cancel existing animation — capture current interpolated position as new start
  const existingTid = pipTimers.get(id)
  if (existingTid) {
    GLib.source_remove(existingTid)
    pipTimers.delete(id)
  }

  const fromRot = pipCurrentRot.get(id) ?? INACTIVE_ROT
  const toRot   = targetRotFor(fromRot, targetBase)

  if (Math.abs(toRot - fromRot) < 0.001) return  // already at target

  const animStartMs = Date.now()

  const tid = GLib.timeout_add(GLib.PRIORITY_DEFAULT, ANIM_FPS_MS, () => {
    const elapsed = Date.now() - animStartMs
    const t       = Math.min(1, elapsed / ANIM_DURATION_MS)
    pipCurrentRot.set(id, fromRot + (toRot - fromRot) * easeOutCubic(t))
    da.queue_draw()

    if (t >= 1) {
      pipCurrentRot.set(id, toRot)
      pipTimers.delete(id)
      return GLib.SOURCE_REMOVE
    }
    return GLib.SOURCE_CONTINUE
  })
  pipTimers.set(id, tid)
}

// ── WorkspacePip ──────────────────────────────────────────────────────────────

interface PipProps {
  readonly id: number
}

function WorkspacePip({ id }: PipProps) {
  return (
    <button
      visible={false}
      class="pip-button"
      onClicked={() => hyprland.dispatch("workspace", String(id))}
      tooltipText={`Workspace ${id}`}
      hexpand={false}
      vexpand={false}
      $={(btn: any) => {
        const updateVisibility = () => {
          if (isActiveOnMonitor(id)) {
            btn.visible = true
            return
          }
          const ws = hyprland.workspaces.find((w: AstalHyprland.Workspace) => w.id === id)
          btn.visible = ws !== undefined && ws.clients.length > 0
        }
        updateVisibility()
        const hFocus = hyprland.connect("notify::focused-workspace", updateVisibility)
        const hWs = hyprland.connect("notify::workspaces", updateVisibility)
        btn.connect("destroy", () => {
          hyprland.disconnect(hFocus)
          hyprland.disconnect(hWs)
        })
      }}
    >
      <drawingarea
        widthRequest={PIP_WIDTH}
        heightRequest={PIP_HEIGHT}
        $={(da: any) => {
          da.set_draw_func((_area: any, cr: any, w: number, h: number) => {
            const isActive  = isActiveOnMonitor(id)
            const rot       = pipCurrentRot.get(id) ?? 0

            const cx = w / 2
            const cy = h / 2

            // Draw hex fill (rotated)
            const fillHex  = isActive ? ACTIVE_FILL  : OCCUPIED_FILL
            const fillAlpha = 1.0
            drawHexFlat(cr, cx, cy, HEX_RADIUS, hexToRgba(fillHex, fillAlpha), rot)

            // Draw workspace number — always upright, no rotation
            const textHex = isActive ? ACTIVE_TEXT : OCCUPIED_TEXT
            const [tr, tg, tb, ta] = hexToRgba(textHex, 1.0)
            cr.selectFontFace("IosevkaTermSlab Nerd Font", 0, 1) // NORMAL, BOLD
            cr.setFontSize(10)
            const numStr   = id % 10 === 0 ? String(id - 10) : String(id)
            const extents  = cr.textExtents(numStr)
            const tx = cx - extents.width / 2 - extents.xBearing
            const ty = cy - extents.height / 2 - extents.yBearing
            cr.moveTo(tx, ty)
            cr.setSourceRGBA(tr, tg, tb, ta)
            cr.showText(numStr)
          })

          // Initialize rotation based on current active state at mount time
          if (!pipCurrentRot.has(id)) {
            pipCurrentRot.set(id, isActiveOnMonitor(id) ? ACTIVE_ROT : INACTIVE_ROT)
          }

          // Track per-pip active state to detect activation / deactivation
          let wasActive = isActiveOnMonitor(id)

          const hFocus = hyprland.connect("notify::focused-workspace", () => {
            const nowActive = isActiveOnMonitor(id)

            if (nowActive && !wasActive) {
              // This pip just became active — rotate to corner-up
              startRotationAnim(id, da, ACTIVE_ROT)
            } else if (!nowActive && wasActive) {
              // This pip just became inactive — rotate back to flat-top
              startRotationAnim(id, da, INACTIVE_ROT)
            }

            wasActive = nowActive
            da.queue_draw()
          })

          const hWs = hyprland.connect("notify::workspaces", () => da.queue_draw())

          da.connect("destroy", () => {
            hyprland.disconnect(hFocus)
            hyprland.disconnect(hWs)
            // Cancel any running animation timer
            const tid = pipTimers.get(id)
            if (tid) {
              GLib.source_remove(tid)
              pipTimers.delete(id)
            }
          })
        }}
      />
    </button>
  )
}

// ── PipSeparator ──────────────────────────────────────────────────────────────

/** Triangle separator drawn between visible workspace pips. */
function PipSeparator({ afterId, rangeMax }: { afterId: number; rangeMax: number }) {
  return (
    <box
      visible={false}
      hexpand={false}
      vexpand={false}
      $={(box: any) => {
        const isVisible = (wsId: number): boolean => {
          if (isActiveOnMonitor(wsId)) return true
          const ws = hyprland.workspaces.find((w: AstalHyprland.Workspace) => w.id === wsId)
          return ws !== undefined && ws.clients.length > 0
        }
        const updateVisibility = () => {
          if (!isVisible(afterId)) {
            box.visible = false
            return
          }
          for (let id = afterId + 1; id <= rangeMax; id++) {
            if (isVisible(id)) {
              box.visible = true
              return
            }
          }
          box.visible = false
        }
        updateVisibility()
        const hFocus = hyprland.connect("notify::focused-workspace", updateVisibility)
        const hWs = hyprland.connect("notify::workspaces", updateVisibility)
        box.connect("destroy", () => {
          hyprland.disconnect(hFocus)
          hyprland.disconnect(hWs)
        })
      }}
    >
      <drawingarea
        widthRequest={SEP_WIDTH}
        heightRequest={SEP_HEIGHT}
        $={(da: any) => {
          da.set_draw_func((_area: any, cr: any, w: number, h: number) => {
            drawTriangleSeparator(cr, w, h, 0x6a / 255, 0x6e / 255, 0x82 / 255, 0.5)
          })
        }}
      />
    </box>
  )
}

// ── WorkspaceIndicator ────────────────────────────────────────────────────────

export function WorkspaceIndicator({ gdkmonitor }: { gdkmonitor: Gdk.Monitor }) {
  // Determine workspace range for this monitor.
  // Monitors sorted by x position: index 0 = left (1–10), 1 = middle (11–20), 2 = right (21–30).
  const sorted = [...app.get_monitors()].sort(
    (a: Gdk.Monitor, b: Gdk.Monitor) => a.get_geometry().x - b.get_geometry().x,
  )
  const myX = gdkmonitor.get_geometry().x
  const monitorIndex = Math.max(0, sorted.findIndex((m: Gdk.Monitor) => m.get_geometry().x === myX))
  const wsMin = monitorIndex * 10 + 1
  const wsMax = monitorIndex * 10 + 10

  const children: JSX.Element[] = []

  for (let i = wsMin; i <= wsMax; i++) {
    children.push(<WorkspacePip id={i} />)
    if (i < wsMax) {
      children.push(<PipSeparator afterId={i} rangeMax={wsMax} />)
    }
  }

  return (
    <box class="workspace-pips" spacing={0}>
      {children}
    </box>
  )
}
