# Feature: AGS Bar Fixes

## Overview

**User Story**: As a desktop user, I want the AGS bar widgets to work correctly so that workspace navigation and notification management function as expected.

**Problem**: Three bugs in the AGS bar: (1) the active workspace pip does not appear in the centre island when switching to a workspace with no clients, (2) opening the notification centre instantly clears all notifications instead of displaying them, and (3) the notification panel renders `[object instance wrapper GIName:Gtk.Box...]` garbage instead of actual notification content.

**Out of Scope**:
- Notification grouping by application (v2)
- Notification sounds or audio management
- Custom per-app notification rules or filtering
- Visual redesign of existing bar panels
- New widget additions to any island

---

## Open Questions

| # | Question | Raised By | Resolved |
|:--|:---------|:----------|:---------|
| 1 | Root cause of instant-dismiss — is it AstalNotifd D-Bus behavior (marking notifications resolved when read) or our toggle/rendering code triggering dismiss as a side effect? | Claude | [ ] |
| 2 | Does `createComputed` in AGS 3.1.0 properly track nested property access on binding return values (e.g., `focused()?.id`)? | Claude | [ ] |

---

## Scope

### Must-Have
- **Active workspace pip visible**: The hex pip for the currently focused workspace appears in the centre island regardless of client count — acceptance: switch to an empty workspace via `hyprctl dispatch workspace N`, its pip appears with Royal Blue fill and Blonde text
- **Opening notification centre preserves notifications**: Clicking the bell icon toggles the panel without dismissing any notifications — acceptance: send 3 test notifications via `notify-send`, open panel, all 3 are listed with summary/body/timestamp
- **Notification panel renders content**: Panel shows formatted notification rows (app name, summary, body, timestamp, dismiss button) instead of `[object instance wrapper...]` — acceptance: `notify-send "Test App" "Hello world"` renders a styled notification row matching `_notifications.scss`

### Should-Have
- **Toast popups functional**: Incoming notifications produce auto-dismissing toasts anchored top-right — acceptance: with panel closed, `notify-send` triggers a toast that auto-dismisses after ~5s
- **Dismiss/clear-all/DND functional**: Individual dismiss removes one notification, clear-all removes all, DND suppresses toasts while accumulating in center — acceptance: each button does exactly its stated action

### Nice-to-Have
- **Scroll overflow**: Panel scrolls when notification count exceeds visible area — acceptance: send 20 notifications, panel is scrollable without clipping

---

## Technical Plan

**Affected Components**:

| File | Change |
|:-----|:-------|
| `widgets/WorkspaceIndicator.tsx` | Fix `createComputed` reactivity for focused workspace — `focused()?.id` property access may not be tracked by the reactive system; may need direct signal subscription or alternative reactive pattern |
| `widgets/NotificationCenter.tsx` | (1) Fix rendering — `notifications.as((list) => list.map(...))` returns widget arrays as JSX children, which AGS/GTK4 likely coerces to strings; switch to imperative `Gtk.Box` child management (subscribe to notifd signals, call `container.append()`/`container.remove()`). (2) Fix instant-dismiss — investigate what triggers mass notification resolution when panel visibility changes |
| `widgets/NotificationToast.tsx` | Verify toast rendering after center fix; already uses imperative child management (the correct pattern) — may only need minor adjustments |
| `styles/_notifications.scss` | No changes expected unless rendering fix changes widget structure or class names |

**Data Model Changes**: None — AstalNotifd manages notification state in-memory via D-Bus

**API Contracts**: N/A — desktop widgets, no HTTP APIs

**Dependencies**:
- `AstalNotifd` (`gi://AstalNotifd`) — D-Bus notification daemon
- `AstalHyprland` (`gi://AstalHyprland`) — workspace state via Hyprland IPC
- AGS 3.1.0 / Astal reactive system (`createBinding`, `createComputed`)

**Key Technical Decisions**:
- NotificationToast already uses imperative child management (`_container.append(row)` / `_container.remove(row)`) and works. NotificationCenter should adopt the same pattern.
- WorkspaceIndicator may need to replace `createComputed` + `createBinding` with direct `hyprland.connect("notify::focused-workspace", ...)` signal handlers, similar to how the draw function already does it (line 153).

**Risks**:

| Risk | Likelihood | Mitigation |
|:-----|:-----------|:-----------|
| `.as()` widget-array rendering is an AGS framework limitation, not a code bug — requires full rewrite to imperative pattern | High | NotificationToast already proves the imperative pattern works; port it |
| Instant-dismiss is AstalNotifd D-Bus behavior (resolves on read) rather than our code | Medium | Test with `dbus-monitor` to observe resolve signals; if daemon behavior, suppress resolve on panel-open |
| `createComputed` doesn't track binding property access — workspace fix requires alternative reactive approach | Medium | Fall back to manual signal subscription (already used in the draw function) |

---

## Acceptance Scenarios

```gherkin
Feature: AGS Bar Fixes
  As a desktop user
  I want the AGS bar widgets to work correctly
  So that workspace navigation and notification management function as expected

  Background:
    Given AGS is running with all three bar islands
    And AstalNotifd is the D-Bus notification daemon
    And swaync is not running

  Rule: Active workspace pip is always visible in centre island

    Scenario: Focused workspace with no clients shows its pip
      Given workspace 5 has no client windows
      When the user switches to workspace 5 via keybind or hyprctl
      Then a hex pip labelled "5" appears in the centre island
      And the pip has Royal Blue fill and Blonde text (active style)

    Scenario: Leaving a workspace with no clients hides its pip
      Given the user is on workspace 5 (no clients)
      When the user switches to workspace 1
      Then the pip for workspace 5 disappears from the centre island
      And the pip for workspace 1 shows active style

    Scenario: Occupied workspaces always show their pips
      Given workspace 3 has 2 client windows
      And the user is on workspace 1
      Then pips for both workspace 1 (active) and workspace 3 (occupied) are visible

  Rule: Opening notification centre does not dismiss notifications

    Scenario: Panel opens with all notifications intact
      Given 3 notifications have been sent via notify-send
      When the user clicks the notification bell icon in BarRight
      Then the notification centre panel appears
      And all 3 notifications are listed with summary and body text
      And the unread badge on the bell icon clears

    Scenario: Closing and reopening preserves notifications
      Given the notification centre is open with 3 notifications
      When the user closes the panel by clicking the bell icon
      And then reopens the panel
      Then all 3 notifications are still listed

  Rule: Notification panel renders formatted content

    Scenario: Notification row shows app name, summary, body, and dismiss button
      Given a notification was sent: notify-send -a "Firefox" "Download complete" "file.zip saved"
      When the notification centre is open
      Then a row displays "Firefox" as the app name
      And "Download complete" as the summary
      And "file.zip saved" as the body
      And a dismiss button is present on the row

    Scenario: Critical notification gets urgency styling
      Given a critical notification was sent: notify-send -u critical "Alert" "Disk full"
      When the notification centre is open
      Then the notification row has the notif-row-critical class (Error red accent)

  Rule: Individual notification actions work

    Scenario: Dismiss removes one notification
      Given the panel is open with 3 notifications
      When the user clicks dismiss on the second notification
      Then that notification is removed
      And the other 2 remain

    Scenario: Clear all removes all notifications
      Given the panel is open with 5 notifications
      When the user clicks "Clear all"
      Then all notifications are removed
      And the panel shows "No notifications" empty state

    Scenario: DND suppresses toasts
      Given DND is enabled via the panel toggle
      When a notification arrives via notify-send
      Then no toast popup appears
      And the notification is added to the centre panel list
```

---

## Task Breakdown

| ID | Task | Priority | Dependencies | Status |
|:---|:-----|:---------|:-------------|:-------|
| T1 | Diagnose workspace pip reactivity — test whether `createComputed` tracks `focused()?.id`; check if the binding re-evaluates on workspace switch | High | None | pending |
| T1.1 | Fix workspace pip visibility — either fix `createComputed` usage or replace with direct `hyprland.connect("notify::focused-workspace")` signal subscription | High | T1 | pending |
| T2 | Diagnose instant-dismiss — use `dbus-monitor` or add logging to identify whether panel open triggers `notifd.resolved` signals; check if the `.as()` binding callback has side effects | High | None | pending |
| T2.1 | Fix instant-dismiss — prevent notification resolution on panel open; ensure `toggleNotificationCenter` only toggles visibility and unread badge | High | T2 | pending |
| T3 | Rewrite notification list rendering — replace `notifications.as()` JSX child binding with imperative `Gtk.Box` child management (mirror NotificationToast's working pattern) | High | None | pending |
| T3.1 | Wire notification signals — subscribe to `notifd.notified` and `notifd.resolved` to imperatively append/remove `NotificationRow` widgets from the container | High | T3 | pending |
| T4 | Verify toast popups — confirm `NotificationToast` works correctly after center fixes; fix if needed | Med | T3.1 | pending |
| T5 | Verify dismiss, clear-all, DND — test each interaction after rendering fix; fix if needed | Med | T3.1 | pending |
| T6 | Manual acceptance testing — run through all Gherkin scenarios with `notify-send` and workspace switching | Med | T1.1, T2.1, T3.1 | pending |

---

## Exit Criteria

- [ ] All Must-Have acceptance scenarios pass manually (`notify-send` + workspace switching)
- [ ] No regressions on existing bar widgets (BarLeft, BarCenter, BarRight all render correctly)
- [ ] Workspace pip reactivity — switching workspaces updates centre island within 1 frame
- [ ] Notification centre opens/closes without dismissing any notifications
- [ ] Notification rows render formatted content (app, summary, body, timestamp, dismiss button)
- [ ] Toast auto-dismiss works reliably (no orphaned windows)

---

## References

- Issue: [#5 feat: AGS Notification Center](https://github.com/Kiriketsuki/chrysaki/issues/5)
- Existing notification center spec: `ags-notification-center-spec.md`
- Working imperative pattern reference: `widgets/NotificationToast.tsx` (uses `_container.append()` / `_container.remove()`)
- Chrysaki design tokens: `styles/_palette.scss`
- Branch: `feat/5-ags-notification-center`

---
*Authored by: Clault KiperS 4.6*
