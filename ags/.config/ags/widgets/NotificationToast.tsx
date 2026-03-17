import app from "ags/gtk4/app"
import { Astal } from "ags/gtk4"
import AstalNotifd from "gi://AstalNotifd"
import GLib from "gi://GLib"
import { notifd } from "./NotificationCenter"

const MAX_VISIBLE = 4
const TOAST_MS = 5000

// Module-level state: visible toast array, overflow queue, widget refs
let _container: any = null
let _window: any = null
let _visible: AstalNotifd.Notification[] = []
let _queue: AstalNotifd.Notification[] = []
const _rowWidgets: Map<number, any> = new Map()

function updateWindowVisibility(): void {
  if (_window) _window.visible = _visible.length > 0
}

function buildToastRow(n: AstalNotifd.Notification): any {
  const isCritical = n.urgency === AstalNotifd.Urgency.CRITICAL
  return (
    <box
      class={`notif-toast${isCritical ? " notif-toast-critical" : ""}`}
      orientation={1}
      spacing={2}
    >
      <box class="notif-toast-header" spacing={6}>
        <label
          class="notif-toast-app"
          label={n.appName || "App"}
          halign={1}
          hexpand
        />
        <button
          class="notif-toast-close"
          label="󰅖"
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
  ) as any
}

function addToastToContainer(n: AstalNotifd.Notification): void {
  if (!_container) return
  const row = buildToastRow(n)
  _rowWidgets.set(n.id, row)
  _container.append(row)
}

function removeToastFromContainer(n: AstalNotifd.Notification): void {
  if (!_container) return
  const row = _rowWidgets.get(n.id)
  if (row) {
    _container.remove(row)
    _rowWidgets.delete(n.id)
  }
}

// Promote queued toasts into visible slots
function pump(): void {
  while (_visible.length < MAX_VISIBLE && _queue.length > 0) {
    const next = _queue.shift()!
    _visible = [..._visible, next]
    addToastToContainer(next)
    scheduleAutoDismiss(next)
  }
  updateWindowVisibility()
}

function scheduleAutoDismiss(n: AstalNotifd.Notification): void {
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, TOAST_MS, () => {
    removeToast(n)
    return GLib.SOURCE_REMOVE
  })
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
    scheduleAutoDismiss(n)
    updateWindowVisibility()
  } else {
    _queue.push(n)
  }
}

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
      <box
        class="notif-toast-list"
        orientation={1}
        spacing={6}
        $={(box: any) => {
          _container = box
        }}
      />
    </window>
  )
}
