/**
 * NotificationCenter — ChamferedPanel wrapper with grouped notifications,
 * critical priority lane, incremental updates, and animations.
 *
 * Widget hierarchy:
 *   ChamferedPanel (class="notif-panel")
 *     box.notif-panel-inner (@include glass)
 *       box.notif-panel-header — title + ClearAllButton + DndToggle
 *       box.notif-critical-lane — pinned critical notifications
 *       Gtk.ScrolledWindow (max_content_height=520)
 *         box.notif-group-list
 *           GroupSection(appName)
 *             box.notif-group-header — 3px accent stripe + name + count + chevron
 *             box.notif-group-body — notification rows (visible toggle)
 */
import Gtk from "gi://Gtk?version=4.0"
import GLib from "gi://GLib?version=2.0"
import app from "ags/gtk4/app"
import { createBinding } from "ags"
import { Astal } from "ags/gtk4"
import AstalNotifd from "gi://AstalNotifd"
import AstalHyprland from "gi://AstalHyprland"
import { ChamferedPanel } from "./ChamferedPanel"
import { JEWEL_PALETTE } from "./ChamferedIsland"
import { appColorIndex, JEWEL_ACCENT_CSS, JEWEL_TEXT_CSS } from "../lib/notification-colors"

const hyprland = AstalHyprland.get_default()!

const PANEL_NAME = "chrysaki-notification-center"
const MAX_NOTIFICATIONS = 50
const ENTRY_STAGGER_MS = 40
const ENTRY_DURATION_MS = 150
const DISMISS_DURATION_MS = 200
const CASCADE_STAGGER_MS = 50
const UNREAD_GLOW_FADE_MS = 500

// ── Singleton ────────────────────────────────────────────────────────────────

export const notifd = AstalNotifd.get_default()!

// ── Unread count (module-level state) ────────────────────────────────────────

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

// ── Panel toggle ─────────────────────────────────────────────────────────────

export function toggleNotificationCenter(): void {
  const panel = app.get_window(PANEL_NAME)
  if (panel) {
    if (!panel.visible) {
      _setUnreadCount(0)
      // Mark all as seen + fade unread glow
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, UNREAD_GLOW_FADE_MS, () => {
        for (const [id] of _panelRows) {
          _seenIds.add(id)
        }
        // Remove unread class from all rows
        for (const row of _panelRows.values()) {
          row.remove_css_class("notif-row-unread")
          row.add_css_class("notif-row-read")
        }
        return GLib.SOURCE_REMOVE
      })
    }
    panel.visible = !panel.visible
  }
}

// ── Markup sanitizer ─────────────────────────────────────────────────────────

function sanitizeBodyMarkup(body: string): { markup: string; hasMarkup: boolean } {
  if (!/<[a-zA-Z]/.test(body)) {
    return { markup: body, hasMarkup: false }
  }
  const PANGO_SAFE = new Set([
    "b", "i", "u", "s", "tt", "span", "sub", "sup", "big", "small",
  ])
  const markup = body
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/<a\b[^>]*>/gi, "")
    .replace(/<\/a>/gi, "")
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

// ── Group state ──────────────────────────────────────────────────────────────

interface GroupState {
  expanded: boolean
  headerWidget: any
  bodyWidget: any
  groupWidget: any
  rowWidgets: Map<number, any>
  count: number
}

const _groups: Map<string, GroupState> = new Map()
const _panelRows: Map<number, any> = new Map()
const _seenIds: Set<number> = new Set()
let _groupList: any = null
let _criticalBox: any = null

// ── Notification row ─────────────────────────────────────────────────────────

function NotificationRow(n: AstalNotifd.Notification, isUnread: boolean): any {
  const isCritical = n.urgency === AstalNotifd.Urgency.CRITICAL
  const colorIdx = appColorIndex(n.appName || "App")
  const accentColor = JEWEL_ACCENT_CSS[colorIdx]
  const unreadClass = isUnread ? " notif-row-unread" : " notif-row-read"

  return (
    <box
      class={`notif-row notif-row-entering${isCritical ? " notif-row-critical" : ""}${unreadClass}`}
      spacing={0}
    >
      {/* 3px accent stripe */}
      <box
        class="notif-row-accent"
        css={`background: ${accentColor};`}
      />
      <box orientation={1} spacing={2} hexpand>
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
            label={"\u{f0156}"}
            onClicked={() => dismissRow(n)}
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
                    (c) =>
                      c.initialClass.toLowerCase().includes(needle) ||
                      needle.includes(c.initialClass.toLowerCase()),
                  )
                  if (client) hyprland.dispatch("focuswindow", `address:0x${client.address}`)
                }}
              />
            ))}
          </box>
        )}
      </box>
    </box>
  ) as any
}

// ── Dismiss animation ────────────────────────────────────────────────────────

function dismissRow(n: AstalNotifd.Notification): void {
  const row = _panelRows.get(n.id)
  if (row) {
    row.add_css_class("notif-row-dismissing")
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, DISMISS_DURATION_MS, () => {
      n.dismiss()
      return GLib.SOURCE_REMOVE
    })
  } else {
    n.dismiss()
  }
}

// ── Group management ─────────────────────────────────────────────────────────

function getOrCreateGroup(appName: string): GroupState {
  const existing = _groups.get(appName)
  if (existing) return existing

  const colorIdx = appColorIndex(appName)
  const accentColor = JEWEL_ACCENT_CSS[colorIdx]
  const textColor = JEWEL_TEXT_CSS[colorIdx]

  const bodyWidget = (<box class="notif-group-body" orientation={1} spacing={0} />) as any
  const countLabel = (<label class="notif-group-count" label="(0)" />) as any
  const chevronLabel = (<label class="notif-group-chevron" label={"\u{f0142}"} />) as any

  const headerWidget = (
    <button
      class="notif-group-header"
      onClicked={() => {
        const group = _groups.get(appName)
        if (!group) return
        group.expanded = !group.expanded
        bodyWidget.visible = group.expanded
        chevronLabel.label = group.expanded ? "\u{f0140}" : "\u{f0142}"

        // Stagger animation on expand
        if (group.expanded) {
          let delay = 0
          for (const [, rowWidget] of group.rowWidgets) {
            rowWidget.add_css_class("notif-row-entering")
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
              rowWidget.remove_css_class("notif-row-entering")
              return GLib.SOURCE_REMOVE
            })
            delay += ENTRY_STAGGER_MS
          }
        }
      }}
    >
      <box spacing={6}>
        <box class="notif-group-accent" css={`background: ${accentColor};`} />
        <label class="notif-group-name" label={appName} css={`color: ${textColor};`} />
        {countLabel}
        {chevronLabel}
      </box>
    </button>
  ) as any

  const groupWidget = (
    <box class="notif-group" orientation={1}>
      {headerWidget}
      {bodyWidget}
    </box>
  ) as any

  if (_groupList) _groupList.append(groupWidget)

  const state: GroupState = {
    expanded: true,
    headerWidget,
    bodyWidget,
    groupWidget,
    rowWidgets: new Map(),
    count: 0,
  }
  _groups.set(appName, state)
  return state
}

function updateGroupCount(appName: string): void {
  const group = _groups.get(appName)
  if (!group) return
  // Find the count label child in the header
  const headerBox = group.headerWidget.get_child()
  if (headerBox) {
    // The count label is the 3rd child (index 2)
    let child = headerBox.get_first_child()
    let idx = 0
    while (child) {
      if (idx === 2) {
        child.label = `(${group.count})`
        break
      }
      child = child.get_next_sibling()
      idx++
    }
  }
}

function removeGroupIfEmpty(appName: string): void {
  const group = _groups.get(appName)
  if (!group || group.count > 0) return
  if (_groupList && group.groupWidget) {
    _groupList.remove(group.groupWidget)
  }
  _groups.delete(appName)
}

// ── Incremental update handlers ──────────────────────────────────────────────

function addNotificationToPanel(n: AstalNotifd.Notification): any {
  const isCritical = n.urgency === AstalNotifd.Urgency.CRITICAL
  const isUnread = !_seenIds.has(n.id)
  const row = NotificationRow(n, isUnread)
  _panelRows.set(n.id, row)

  if (isCritical && _criticalBox) {
    _criticalBox.append(row)
  } else {
    const appName = n.appName || "App"
    const group = getOrCreateGroup(appName)
    group.rowWidgets.set(n.id, row)
    group.count++
    updateGroupCount(appName)

    // Insert at top of group body (newest first)
    group.bodyWidget.prepend(row)
  }

  return row
}

function removeNotificationFromPanel(id: number): void {
  const row = _panelRows.get(id)
  if (!row) return

  _panelRows.delete(id)
  _seenIds.delete(id)

  // Find which group owns this row
  for (const [appName, group] of _groups) {
    if (group.rowWidgets.has(id)) {
      group.bodyWidget.remove(row)
      group.rowWidgets.delete(id)
      group.count--
      updateGroupCount(appName)
      removeGroupIfEmpty(appName)
      return
    }
  }

  // Might be in critical lane
  if (_criticalBox) {
    _criticalBox.remove(row)
  }
}

function rebuildPanelRows(): void {
  // Clear all groups
  for (const [, group] of _groups) {
    if (_groupList) _groupList.remove(group.groupWidget)
  }
  _groups.clear()
  _panelRows.clear()

  // Clear critical lane
  if (_criticalBox) {
    let child = _criticalBox.get_first_child()
    while (child) {
      const next = child.get_next_sibling()
      _criticalBox.remove(child)
      child = next
    }
  }

  // Re-add all notifications (newest first)
  const all = [...notifd.notifications].reverse()
  let staggerIdx = 0
  for (const n of all) {
    addNotificationToPanel(n)
    // Stagger entry animation (cap at 10)
    if (staggerIdx < 10) {
      const row = _panelRows.get(n.id)
      if (row) {
        row.add_css_class("notif-row-entering")
        const delay = staggerIdx * ENTRY_STAGGER_MS
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
          row.remove_css_class("notif-row-entering")
          return GLib.SOURCE_REMOVE
        })
      }
    }
    staggerIdx++
  }
}

// ── 50-notification cap ──────────────────────────────────────────────────────

function enforceNotificationCap(): void {
  const notifications = notifd.notifications
  if (notifications.length > MAX_NOTIFICATIONS) {
    // Dismiss oldest (notifications are newest-first by default)
    const toDismiss = notifications.slice(MAX_NOTIFICATIONS)
    for (const n of toDismiss) {
      n.dismiss()
    }
  }
}

// ── notifd event handlers ────────────────────────────────────────────────────

notifd.connect("notified", (_self: unknown, id: number) => {
  const n = notifd.get_notification(id)
  if (n) {
    const row = addNotificationToPanel(n)
    // Single entry animation for incremental additions
    if (row) {
      GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
        row.remove_css_class("notif-row-entering")
        return GLib.SOURCE_REMOVE
      })
    }
    enforceNotificationCap()
  }
})

notifd.connect("resolved", (_self: unknown, id: number) => {
  removeNotificationFromPanel(id)
})

// ── Clear-all button ─────────────────────────────────────────────────────────

function ClearAllButton() {
  const notifications = createBinding(notifd, "notifications")
  return (
    <button
      class="notif-clear-all-btn"
      label={"\u{f01b4}  Clear all"}
      visible={notifications.as((list) => list.length > 0)}
      onClicked={() => {
        // Cascade dismiss with stagger
        const list = [...notifd.notifications]
        list.forEach((n, i) => {
          GLib.timeout_add(GLib.PRIORITY_DEFAULT, i * CASCADE_STAGGER_MS, () => {
            const row = _panelRows.get(n.id)
            if (row) row.add_css_class("notif-row-dismissing")
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, DISMISS_DURATION_MS, () => {
              n.dismiss()
              return GLib.SOURCE_REMOVE
            })
            return GLib.SOURCE_REMOVE
          })
        })
        _setUnreadCount(0)
      }}
    />
  )
}

// ── DND toggle ───────────────────────────────────────────────────────────────

function DndToggle() {
  const dnd = createBinding(notifd, "dontDisturb")
  return (
    <button
      class={dnd.as((on) => `notif-dnd-btn${on ? " notif-dnd-active" : ""}`)}
      label={dnd.as((on) => (on ? "\u{f009b}" : "\u{f009a}"))}
      tooltipText={dnd.as((on) =>
        on ? "DND on \u2014 click to disable" : "DND off \u2014 click to enable",
      )}
      onClicked={() => {
        notifd.dontDisturb = !notifd.dontDisturb
      }}
    />
  )
}

// ── Panel window ─────────────────────────────────────────────────────────────

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
      <ChamferedPanel
        class="notif-panel"
        $={(panel: any) => {
          panel.setChamfer({ tl: true, tr: true, bl: true, br: true })
          panel.setGradientColors(JEWEL_PALETTE)
        }}
      >
        <box class="notif-panel-inner" orientation={1} spacing={0}>
          {/* Header */}
          <box class="notif-panel-header" spacing={4}>
            <label
              class="notif-panel-title"
              label={"\u{f009a}  Notifications"}
              halign={1}
              hexpand
            />
            <ClearAllButton />
            <DndToggle />
          </box>

          {/* Critical lane */}
          <box
            class="notif-critical-lane"
            orientation={1}
            spacing={4}
            $={(box: any) => {
              _criticalBox = box
            }}
          />

          {/* Empty state */}
          <label
            class="notif-empty"
            label="No notifications"
            halign={3}
            valign={3}
            visible={notifications.as((list) => list.length === 0)}
          />

          {/* Scrollable group list */}
          <box
            vexpand
            $={(wrapper: any) => {
              const sw = new Gtk.ScrolledWindow({
                hscrollbarPolicy: Gtk.PolicyType.NEVER,
                vscrollbarPolicy: Gtk.PolicyType.AUTOMATIC,
                maxContentHeight: 520,
                propagateNaturalHeight: true,
              })
              sw.add_css_class("notif-scroll")

              const listBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 0,
              })
              listBox.add_css_class("notif-group-list")
              sw.set_child(listBox)
              wrapper.append(sw)

              _groupList = listBox
              rebuildPanelRows()
            }}
          />
        </box>
      </ChamferedPanel>
    </window>
  )
}
