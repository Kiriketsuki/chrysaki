import app from "ags/gtk4/app"
import { createBinding } from "ags"
import { Astal } from "ags/gtk4"
import AstalNotifd from "gi://AstalNotifd"

const PANEL_NAME = "chrysaki-notification-center"

export const notifd = AstalNotifd.get_default()!

// --- Unread count (module-level state, no GObject needed) ---

let _unreadCount = 0
const _unreadListeners: Array<() => void> = []

function _setUnreadCount(n: number): void {
  _unreadCount = Math.max(0, n)
  _unreadListeners.forEach((cb) => cb())
}

export function getUnreadCount(): number {
  return _unreadCount
}

export function onUnreadChange(cb: () => void): void {
  _unreadListeners.push(cb)
}

notifd.connect("notified", () => {
  _setUnreadCount(_unreadCount + 1)
})

// --- Panel toggle ---

export function toggleNotificationCenter(): void {
  const panel = app.get_window(PANEL_NAME)
  if (panel) {
    if (!panel.visible) {
      _setUnreadCount(0)
    }
    panel.visible = !panel.visible
  }
}

// --- Notification list helpers ---

function formatTimestamp(unixTime: number): string {
  const nowSec = Math.floor(Date.now() / 1000)
  const diff = nowSec - unixTime
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function NotificationRow(n: AstalNotifd.Notification) {
  return (
    <box class="notif-row" orientation={1} spacing={2}>
      <box class="notif-row-header" spacing={6}>
        <label
          class="notif-row-app"
          label={n.appName || "App"}
          halign={1}
          hexpand
        />
        <label
          class="notif-row-time"
          label={formatTimestamp(n.time)}
          halign={2}
        />
        <button
          class="notif-dismiss-btn"
          label="󰅖"
          onClicked={() => n.dismiss()}
        />
      </box>
      <label
        class="notif-row-summary"
        label={n.summary || ""}
        halign={1}
        xalign={0}
        wrap
      />
      {n.body && (
        <label
          class="notif-row-body"
          label={n.body}
          halign={1}
          xalign={0}
          wrap
          ellipsize={3}
        />
      )}
    </box>
  )
}

// --- Clear-all button ---

function ClearAllButton() {
  const notifications = createBinding(notifd, "notifications")
  return (
    <button
      class="notif-clear-all-btn"
      label="󰆴  Clear all"
      visible={notifications.as((list) => list.length > 0)}
      onClicked={() => {
        const list = [...notifd.notifications]
        list.forEach((n) => n.dismiss())
        _setUnreadCount(0)
      }}
    />
  )
}

// --- DND toggle (header button) ---

function DndToggle() {
  const dnd = createBinding(notifd, "dontDisturb")
  return (
    <button
      class={dnd.as((on) => `notif-dnd-btn${on ? " notif-dnd-active" : ""}`)}
      label={dnd.as((on) => (on ? "󰂛" : "󰂚"))}
      tooltipText={dnd.as((on) =>
        on ? "DND on — click to disable" : "DND off — click to enable",
      )}
      onClicked={() => {
        notifd.dontDisturb = !notifd.dontDisturb
      }}
    />
  )
}

// --- Panel window ---

export function NotificationCenter() {
  const { TOP, RIGHT } = Astal.WindowAnchor
  const notifications = createBinding(notifd, "notifications")

  return (
    <window
      name={PANEL_NAME}
      namespace={PANEL_NAME}
      visible={false}
      anchor={TOP | RIGHT}
      exclusivity={Astal.Exclusivity.IGNORE}
      marginTop={48}
      marginRight={8}
      application={app}
    >
      <box class="notif-panel" orientation={1} spacing={0}>
        <box class="notif-panel-header" spacing={4}>
          <label
            class="notif-panel-title"
            label="󰂚  Notifications"
            halign={1}
            hexpand
          />
          <ClearAllButton />
          <DndToggle />
        </box>
        <box class="notif-panel-list" orientation={1} spacing={4}>
          {notifications.as((list) =>
            list.length === 0
              ? [
                  <label
                    class="notif-empty"
                    label="No notifications"
                    halign={3}
                    valign={3}
                  />,
                ]
              : [...list].reverse().map((n) => NotificationRow(n)),
          )}
        </box>
      </box>
    </window>
  )
}
