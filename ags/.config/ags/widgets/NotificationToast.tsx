/**
 * NotificationToast — toast popup with ChamferedPanel wrapper,
 * Cairo progress bar, slide-in animation, hover-pause, and depth stacking.
 */
import Gtk from "gi://Gtk?version=4.0"
import app from "ags/gtk4/app"
import { Astal } from "ags/gtk4"
import AstalNotifd from "gi://AstalNotifd"
import GLib from "gi://GLib?version=2.0"
import { notifd } from "./NotificationCenter"
import { ChamferedPanel } from "./ChamferedPanel"
import { JEWEL_PALETTE } from "./ChamferedIsland"
import { appColorIndex, JEWEL_ACCENT_CSS } from "../lib/notification-colors"

const MAX_VISIBLE = 4
const TOAST_MS = 5000
const TOAST_CRITICAL_MS = 8000
const PROGRESS_FPS_MS = 33

// ── Module-level state ───────────────────────────────────────────────────────

let _container: any = null
let _window: any = null
let _visible: AstalNotifd.Notification[] = []
let _queue: AstalNotifd.Notification[] = []
const _rowWidgets: Map<number, any> = new Map()
const _progressDAs: Map<number, any> = new Map()

// Per-toast timing state
interface ToastTiming {
  startMs: number
  totalMs: number
  pausedAt: number | null // elapsed ms when paused, null if running
}
const _timings: Map<number, ToastTiming> = new Map()
let _progressTimerId = 0

// ── Progress bar timer ───────────────────────────────────────────────────────

function ensureProgressTimer(): void {
  if (_progressTimerId !== 0) return
  _progressTimerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, PROGRESS_FPS_MS, () => {
    if (_visible.length === 0) {
      _progressTimerId = 0
      return GLib.SOURCE_REMOVE
    }
    const now = Date.now()
    for (const n of [..._visible]) {
      const timing = _timings.get(n.id)
      if (!timing) continue
      const da = _progressDAs.get(n.id)
      if (da) da.queue_draw()

      // Check if expired
      if (timing.pausedAt === null) {
        const elapsed = now - timing.startMs
        if (elapsed >= timing.totalMs) {
          removeToast(n)
        }
      }
    }
    return GLib.SOURCE_CONTINUE
  })
}

// ── Visibility / depth ───────────────────────────────────────────────────────

function updateWindowVisibility(): void {
  if (_window) _window.visible = _visible.length > 0
}

function updateDepthOpacity(): void {
  const opacities = [1.0, 0.95, 0.90, 0.85]
  _visible.forEach((n, i) => {
    const row = _rowWidgets.get(n.id)
    if (row) row.set_opacity(opacities[Math.min(i, opacities.length - 1)])
  })
}

// ── Toast row builder ────────────────────────────────────────────────────────

function buildToastRow(n: AstalNotifd.Notification): any {
  const isCritical = n.urgency === AstalNotifd.Urgency.CRITICAL
  const colorIdx = appColorIndex(n.appName || "App")
  const accentColor = JEWEL_ACCENT_CSS[colorIdx]

  return (
    <box
      class={`notif-toast notif-toast-entering${isCritical ? " notif-toast-critical" : ""}`}
      orientation={1}
      spacing={2}
      $={(box: any) => {
        // Hover-pause
        const motionCtrl = new Gtk.EventControllerMotion()
        motionCtrl.connect("enter", () => {
          const timing = _timings.get(n.id)
          if (timing && timing.pausedAt === null) {
            timing.pausedAt = Date.now() - timing.startMs
          }
        })
        motionCtrl.connect("leave", () => {
          const timing = _timings.get(n.id)
          if (timing && timing.pausedAt !== null) {
            timing.startMs = Date.now() - timing.pausedAt
            timing.pausedAt = null
          }
        })
        box.add_controller(motionCtrl)

        // Slide-in: remove entering class after a frame
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
          box.remove_css_class("notif-toast-entering")
          return GLib.SOURCE_REMOVE
        })
      }}
    >
      <box spacing={6}>
        {/* 3px accent stripe */}
        <box
          class="notif-row-accent"
          css={`background: ${accentColor};`}
        />
        <box orientation={1} hexpand spacing={2}>
          <box class="notif-toast-header" spacing={6}>
            <label
              class="notif-toast-app"
              label={n.appName || "App"}
              halign={1}
              hexpand
            />
            <button
              class="notif-toast-close"
              label={"\u{f0156}"}
              onClicked={() => removeToast(n)}
            />
          </box>
          <label
            class="notif-toast-summary"
            label={n.summary || ""}
            halign={1}
            xalign={0}
            wrap
          />
          {n.body && (
            <label
              class="notif-toast-body"
              label={n.body}
              halign={1}
              xalign={0}
              wrap
              ellipsize={3}
            />
          )}
        </box>
      </box>
      {/* 2px Cairo progress bar */}
      <drawingarea
        class="notif-toast-progress"
        widthRequest={-1}
        heightRequest={2}
        $={(da: any) => {
          _progressDAs.set(n.id, da)
          da.set_draw_func((_area: any, cr: any, w: number, h: number) => {
            const timing = _timings.get(n.id)
            if (!timing) return

            const now = Date.now()
            const elapsed = timing.pausedAt !== null
              ? timing.pausedAt
              : now - timing.startMs
            const progress = Math.max(0, 1 - elapsed / timing.totalMs)

            // Background track
            cr.setSourceRGBA(1, 1, 1, 0.1)
            cr.rectangle(0, 0, w, h)
            cr.fill()

            // Progress fill in accent color
            const hex = accentColor
            const r = parseInt(hex.slice(1, 3), 16) / 255
            const g = parseInt(hex.slice(3, 5), 16) / 255
            const b = parseInt(hex.slice(5, 7), 16) / 255
            cr.setSourceRGBA(r, g, b, 0.9)
            cr.rectangle(0, 0, w * progress, h)
            cr.fill()
          })
          da.connect("destroy", () => {
            _progressDAs.delete(n.id)
          })
        }}
      />
    </box>
  ) as any
}

// ── Toast lifecycle ──────────────────────────────────────────────────────────

function addToastToContainer(n: AstalNotifd.Notification): void {
  if (!_container) return
  const row = buildToastRow(n)
  _rowWidgets.set(n.id, row)
  _container.append(row)

  const isCritical = n.urgency === AstalNotifd.Urgency.CRITICAL
  _timings.set(n.id, {
    startMs: Date.now(),
    totalMs: isCritical ? TOAST_CRITICAL_MS : TOAST_MS,
    pausedAt: null,
  })

  ensureProgressTimer()
  updateDepthOpacity()
}

function removeToastFromContainer(n: AstalNotifd.Notification): void {
  if (!_container) return
  const row = _rowWidgets.get(n.id)
  if (row) {
    _container.remove(row)
    _rowWidgets.delete(n.id)
  }
  _timings.delete(n.id)
  _progressDAs.delete(n.id)
}

function pump(): void {
  while (_visible.length < MAX_VISIBLE && _queue.length > 0) {
    const next = _queue.shift()!
    _visible = [..._visible, next]
    addToastToContainer(next)
  }
  updateWindowVisibility()
  updateDepthOpacity()
}

function removeToast(n: AstalNotifd.Notification): void {
  _visible = _visible.filter((v) => v !== n)
  removeToastFromContainer(n)
  pump()
}

function enqueue(n: AstalNotifd.Notification): void {
  if (notifd.dontDisturb) return
  if (_visible.length < MAX_VISIBLE) {
    _visible = [..._visible, n]
    addToastToContainer(n)
    updateWindowVisibility()
  } else {
    _queue.push(n)
  }
}

// ── notifd event handlers ────────────────────────────────────────────────────

notifd.connect("notified", (_self: unknown, id: number) => {
  const n = notifd.get_notification(id)
  if (n) enqueue(n)
})

notifd.connect("resolved", (_self: unknown, id: number) => {
  const inVisible = _visible.find((v) => v.id === id)
  if (inVisible) {
    _visible = _visible.filter((v) => v.id !== id)
    removeToastFromContainer(inVisible)
  }
  _queue = _queue.filter((v) => v.id !== id)
  pump()
})

// ── Toast window ─────────────────────────────────────────────────────────────

export function NotificationToast() {
  const { TOP, RIGHT } = Astal.WindowAnchor
  return (
    <window
      namespace="chrysaki-notification-toast"
      anchor={TOP | RIGHT}
      exclusivity={Astal.Exclusivity.IGNORE}
      marginTop={48}
      marginRight={8}
      visible={false}
      application={app}
      $={(win: any) => {
        _window = win
      }}
    >
      <ChamferedPanel
        class="notif-toast-wrapper"
        $={(panel: any) => {
          panel.setChamfer({ tl: true, tr: true, bl: true, br: true })
          panel.setGradientColors(JEWEL_PALETTE)
        }}
      >
        <box
          class="notif-toast-list"
          orientation={1}
          spacing={6}
          $={(box: any) => {
            _container = box
          }}
        />
      </ChamferedPanel>
    </window>
  )
}
