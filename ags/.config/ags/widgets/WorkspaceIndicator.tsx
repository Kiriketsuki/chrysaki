import { createBinding, createComputed } from "ags"
import GLib from "gi://GLib?version=2.0"
import AstalHyprland from "gi://AstalHyprland"
import { drawHexFlat } from "../lib/cairo-hex"
import { hexToRgba } from "../lib/cairo-separator"
import { drawTriangleSeparator } from "../lib/cairo-triangles"

const hyprland = AstalHyprland.get_default()!

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
  const focused    = createBinding(hyprland, "focusedWorkspace")
  const workspaces = createBinding(hyprland, "workspaces")

  const visible = createComputed(() => {
    const focusedId = focused()?.id ?? 1
    if (id === focusedId) return true
    const ws = workspaces().find((w: AstalHyprland.Workspace) => w.id === id)
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
        widthRequest={PIP_WIDTH}
        heightRequest={PIP_HEIGHT}
        $={(da: any) => {
          da.set_draw_func((_area: any, cr: any, w: number, h: number) => {
            const focusedId = hyprland.focusedWorkspace?.id ?? 1
            const isActive  = id === focusedId
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
            const numStr   = String(id)
            const extents  = cr.textExtents(numStr)
            const tx = cx - extents.width / 2 - extents.xBearing
            const ty = cy - extents.height / 2 - extents.yBearing
            cr.moveTo(tx, ty)
            cr.setSourceRGBA(tr, tg, tb, ta)
            cr.showText(numStr)
          })

          // Initialize rotation based on current active state at mount time
          const initFocusedId = hyprland.focusedWorkspace?.id ?? 1
          if (!pipCurrentRot.has(id)) {
            pipCurrentRot.set(id, id === initFocusedId ? ACTIVE_ROT : INACTIVE_ROT)
          }

          // Track previous focused id to detect activation / deactivation
          let prevFocusedId = initFocusedId

          const hFocus = hyprland.connect("notify::focused-workspace", () => {
            const newFocusedId = hyprland.focusedWorkspace?.id ?? 1

            if (newFocusedId === id && prevFocusedId !== id) {
              // This pip just became active — rotate to corner-up
              startRotationAnim(id, da, ACTIVE_ROT)
            } else if (prevFocusedId === id && newFocusedId !== id) {
              // This pip just became inactive — rotate back to flat-top
              startRotationAnim(id, da, INACTIVE_ROT)
            }

            prevFocusedId = newFocusedId
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
function PipSeparator({ afterId }: { afterId: number }) {
  const focused    = createBinding(hyprland, "focusedWorkspace")
  const workspaces = createBinding(hyprland, "workspaces")

  const visible = createComputed(() => {
    const focusedId = focused()?.id ?? 1
    const wss       = workspaces()

    const isVisible = (wsId: number): boolean => {
      if (wsId === focusedId) return true
      const ws = wss.find((w: AstalHyprland.Workspace) => w.id === wsId)
      return ws !== undefined && ws.clients.length > 0
    }

    if (!isVisible(afterId)) return false
    for (let id = afterId + 1; id <= 10; id++) {
      if (isVisible(id)) return true
    }
    return false
  })

  return (
    <box visible={visible} hexpand={false} vexpand={false}>
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

export function WorkspaceIndicator() {
  const children: JSX.Element[] = []

  for (let i = 1; i <= 10; i++) {
    children.push(<WorkspacePip id={i} />)
    if (i < 10) {
      children.push(<PipSeparator afterId={i} />)
    }
  }

  return (
    <box class="workspace-pips" spacing={0}>
      {children}
    </box>
  )
}
