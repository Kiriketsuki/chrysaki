import GLib from "gi://GLib?version=2.0"
import app from "ags/gtk4/app"
import { createBinding } from "ags"
import { Astal } from "ags/gtk4"
import AstalNotifd from "gi://AstalNotifd"
import AstalHyprland from "gi://AstalHyprland"

const hyprland = AstalHyprland.get_default()!

const PANEL_NAME = "chrysaki-notification-center"

export const notifd = AstalNotifd.get_default()!

// --- Panel list imperative state ---

let _panelList: any = null
const _panelRows: Map<number, any> = new Map()

function rebuildPanelRows(): void {
  if (!_panelList) return
  for (const row of _panelRows.values()) {
    _panelList.remove(row)
  }
  _panelRows.clear()
  for (const n of [...notifd.notifications].reverse()) {
    const row = NotificationRow(n)
    _panelRows.set(n.id, row)
    _panelList.append(row)
  }
}

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

// Sanitize a freedesktop.org HTML notification body to safe Pango markup.
// The spec allows a small HTML subset (<b>, <i>, <u>, <a>, <img>, <br>).
// Pango supports <b>, <i>, <u>, <s>, <tt>, <span>, <sub>, <sup>, <big>, <small>.
// Returns the processed string and whether Pango markup mode should be enabled.
function sanitizeBodyMarkup(body: string): { markup: string; hasMarkup: boolean } {
  if (!/<[a-zA-Z]/.test(body)) {
    return { markup: body, hasMarkup: false }
  }
  const PANGO_SAFE = new Set([
    "b",
    "i",
    "u",
    "s",
    "tt",
    "span",
    "sub",
    "sup",
    "big",
    "small",
  ])
  const markup = body
    // <br> and <br/> → newline
    .replace(/<br\s*\/?>/gi, "\n")
    // Strip <img> entirely (no visual equivalent in Pango)
    .replace(/<img\b[^>]*>/gi, "")
    // Strip <a> open/close tags — keep link text, Pango has no href rendering
    .replace(/<a\b[^>]*>/gi, "")
    .replace(/<\/a>/gi, "")
    // Pass Pango-safe tags through; strip everything else
    .replace(
      /<\/?\s*([a-zA-Z][a-zA-Z0-9]*)(\s[^>]*)?\s*>/g,
      (match, tag: string) => (PANGO_SAFE.has(tag.toLowerCase()) ? match : ""),
    )
  return { markup, hasMarkup: true }
}

function BodyLabel({ body }: { body: string }) {
  const { markup, hasMarkup } = sanitizeBodyMarkup(body)
  return (
    <label
      class="notif-row-body"
      label={markup}
      useMarkup={hasMarkup}
      halign={1}
      xalign={0}
      wrap
      ellipsize={3}
    />
  )
}

function formatTimestamp(unixTime: number): string {
  const nowSec = Math.floor(Date.now() / 1000)
  const diff = nowSec - unixTime
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function NotificationRow(n: AstalNotifd.Notification) {
  const isCritical = n.urgency === AstalNotifd.Urgency.CRITICAL
  return (
    <box
      class={`notif-row${isCritical ? " notif-row-critical" : ""}`}
      orientation={1}
      spacing={2}
    >
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
      {n.body && <BodyLabel body={n.body} />}
      {n.actions.length > 0 && (
        <box class="notif-actions" spacing={4}>
          {n.actions.map((action) => (
            <button
              class="notif-action-btn"
              label={action.label}
              hexpand
              onClicked={() => {
                n.invoke(action.id)
                const needle = (n.desktopEntry || n.appName || "").toLowerCase()
                if (!needle) return
                const client = (hyprland.clients as AstalHyprland.Client[]).find(
                  (c) => c.initialClass.toLowerCase().includes(needle) || needle.includes(c.initialClass.toLowerCase()),
                )
                if (client) hyprland.dispatch("focuswindow", `address:0x${client.address}`)
              }}
            />
          ))}
        </box>
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
        <box
          class="notif-panel-list"
          orientation={1}
          spacing={4}
          $={(box: any) => {
            _panelList = box
            rebuildPanelRows()
            notifd.connect("notify::notifications", () => {
              GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                rebuildPanelRows()
                return GLib.SOURCE_REMOVE
              })
            })
          }}
        >
          <label
            class="notif-empty"
            label="No notifications"
            halign={3}
            valign={3}
            visible={notifications.as((list) => list.length === 0)}
          />
        </box>
      </box>
    </window>
  )
}
