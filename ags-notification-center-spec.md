# Feature: AGS Notification Center

## Overview

**User Story**: As a desktop power user, I want a native notification center built into my AGS shell so that I can view, dismiss, and manage notifications within the Chrysaki design system instead of relying on swaync.

**Problem**: Notifications are currently handled by swaync, an external daemon completely disconnected from the Chrysaki aesthetic. `NotificationToggle.tsx` just shells out to `swaync-client -t` — the notification panel uses swaync's own styling, breaking visual cohesion with the jewel-toned chamfered bar.

**Out of Scope**:
- Notification grouping by application (v2 concern)
- Notification sound/audio management
- Custom per-app notification rules or filtering

---

## Open Questions

| # | Question | Raised By | Resolved |
|:--|:---------|:----------|:---------|
| 1 | D-Bus ownership conflict — swaync and AGS Notifd cannot coexist as notification daemons | Claude | [x] Resolved: replace swaync entirely |
| 2 | Toast popups — brief auto-dismissing toasts in addition to full center panel? | Claude | [x] Resolved: toasts + center both required |

---

## Scope

### Must-Have
- **AstalNotifd integration**: AGS registers as the D-Bus notification daemon, replacing swaync — acceptance: `notify-send` test notification appears in AGS, not swaync
- **Notification center panel**: Layer-shell popup (top-right, below bar) showing notification history — acceptance: panel toggles on NotificationToggle click, shows all received notifications in reverse chronological order
- **Toast popups**: Incoming notifications show a brief auto-dismissing toast (top-right, ~5s) — acceptance: toast appears on `notify-send`, fades after ~5s, stacks max 3-4 with overflow queued
- **Dismiss individual**: Each notification has a dismiss/close button — acceptance: clicking dismiss removes notification from list
- **Clear all**: Button to dismiss all notifications at once — acceptance: clears list, shows empty state
- **Do-not-disturb toggle**: Suppresses toast popups while still accumulating in the center — acceptance: with DND on, `notify-send` adds to center but no toast appears
- **Chrysaki styling**: Chamfered island container, jewel tone accents, glassmorphism background — acceptance: visually matches existing bar panels (ServicePanel pattern)
- **Unread badge**: NotificationToggle icon shows unread count — acceptance: badge appears when >0 unread, disappears when center opened or cleared

### Should-Have
- **Notification actions**: Render action buttons from the notification (e.g., "Reply", "Open") — acceptance: action buttons visible, clicking fires the D-Bus action callback
- **Notification body markup**: Render HTML body content (bold, links, images) — acceptance: rich notifications from apps render formatted text

### Nice-to-Have
- **Notification urgency styling**: Critical notifications get Error red accent — acceptance: critical notifications visually distinct
- **Scroll overflow**: Panel scrolls when notification count exceeds visible area

---

## Technical Plan

**Affected Components**:

| File | Change |
|:-----|:-------|
| `widgets/NotificationToggle.tsx` | Rewrite — replace swaync shell-out with toggle for AGS panel + unread badge |
| `widgets/NotificationCenter.tsx` | New — notification center popup panel (follows ServicePanel pattern) |
| `widgets/NotificationToast.tsx` | New — toast popup window for incoming notifications |
| `app.ts` | Register `NotificationCenter()` and `NotificationToast()` in `main()` (single instance, outside monitor loop) |
| `styles/_notifications.scss` | New — panel, toast, and badge styling |
| `styles/style.scss` | Add `@use` import for `_notifications.scss` |

**Data Model Changes**:
- None — AstalNotifd manages notification state in-memory via D-Bus

**API Contracts**: N/A — desktop widget, no HTTP APIs

**Dependencies**:
- `AstalNotifd` (`gi://AstalNotifd`) — the notification daemon service, replaces swaync
- `GLib.timeout_add` — toast auto-dismiss timer
- Existing: `ChamferedBar`, `JEWEL_PALETTE`, `app.get_window()` toggle pattern, `createState`, `createBinding`, `createComputed`

**Key Technical Decisions**:
- Toast window: separate layer-shell `<window>` anchored `TOP | RIGHT`, auto-hides after ~5s. Max 3-4 concurrent toasts, overflow queued
- Center panel: follows ServicePanel pattern — `<window visible={false}>` toggled via `app.get_window(name).visible`
- DND state: `createState(false)` boolean — when true, toast window stays hidden but notifications accumulate
- Unread tracking: counter derived from `notifd.notifications.length` vs last-seen-count at panel-open time

**Risks**:

| Risk | Likelihood | Mitigation |
|:-----|:-----------|:-----------|
| D-Bus name conflict if swaync still running at startup | Medium | Document in README: remove swaync from autostart before enabling AGS notification daemon |
| Toast stacking overflow (burst of notifications) | Low | Cap at 3-4 visible toasts, queue overflow; auto-dismiss clears slots |
| AstalNotifd API differences from docs | Low | Already using AstalNetwork/AstalBattery successfully — same Astal stack |

---

## Acceptance Scenarios

```gherkin
Feature: AGS Notification Center
  As a desktop power user
  I want a native notification center in my AGS shell
  So that I can manage notifications within the Chrysaki design system

  Background:
    Given AGS is running with AstalNotifd as the D-Bus notification daemon
    And swaync is not running

  Rule: Toast popups appear for incoming notifications

    Scenario: Incoming notification shows toast
      Given DND is off
      When a notification is sent via notify-send "Test" "Hello world"
      Then a toast popup appears anchored to top-right
      And the toast displays the notification summary and body
      And the toast auto-dismisses after ~5 seconds

    Scenario: Multiple toasts stack vertically
      Given DND is off
      When 4 notifications arrive within 2 seconds
      Then 3 toasts are visible stacked vertically (newest on top)
      And the 4th toast appears when the oldest dismisses

    Scenario: DND suppresses toasts
      Given DND is on
      When a notification is sent via notify-send
      Then no toast popup appears
      And the notification is added to the center panel history

  Rule: Notification center panel shows history

    Scenario: Toggle center panel from bar
      When the user clicks the NotificationToggle button in BarRight
      Then the notification center panel appears anchored top-right below the bar
      And it displays all received notifications in reverse chronological order

    Scenario: Dismiss individual notification
      Given the center panel is open with 3 notifications
      When the user clicks dismiss on the second notification
      Then that notification is removed from the list
      And the remaining 2 notifications are still visible

    Scenario: Clear all notifications
      Given the center panel is open with 5 notifications
      When the user clicks "Clear All"
      Then all notifications are removed
      And the panel shows an empty state message

  Rule: Unread badge on bar icon

    Scenario: Badge appears for unread notifications
      Given the center panel is closed
      When 2 notifications arrive
      Then the NotificationToggle icon shows an unread count badge of "2"

    Scenario: Badge clears when panel opened
      Given there are 3 unread notifications
      When the user opens the notification center panel
      Then the unread badge disappears

  Rule: DND toggle

    Scenario: Toggle DND from center panel
      Given DND is off
      When the user clicks the DND toggle in the center panel header
      Then DND is enabled
      And the DND icon changes to indicate active state
      And subsequent notifications do not produce toasts
```

---

## Task Breakdown

| ID | Task | Priority | Dependencies | Status |
|:---|:-----|:---------|:-------------|:-------|
| T1 | AstalNotifd service setup — import, instantiate, verify D-Bus ownership | High | None | pending |
| T1.1 | Remove swaync dependency — update NotificationToggle to no longer call swaync-client | High | T1 | pending |
| T2 | `NotificationCenter.tsx` — popup panel window (follows ServicePanel pattern) | High | T1 | pending |
| T2.1 | Notification list rendering — summary, body, timestamp, dismiss button per notification | High | T2 | pending |
| T2.2 | Clear-all button and empty state | High | T2.1 | pending |
| T2.3 | DND toggle in panel header | High | T2 | pending |
| T3 | `NotificationToast.tsx` — toast popup window with auto-dismiss timer | High | T1 | pending |
| T3.1 | Toast stacking — max 3-4 visible, queue overflow | Med | T3 | pending |
| T4 | Unread badge on NotificationToggle — count/dot indicator | Med | T1, T2 | pending |
| T5 | `_notifications.scss` — panel, toast, badge styling (Chrysaki tokens, chamfered containers) | High | T2, T3 | pending |
| T5.1 | Register `_notifications.scss` in `style.scss` | High | T5 | pending |
| T6 | `app.ts` — register `NotificationCenter()` and `NotificationToast()` in `main()` | High | T2, T3 | pending |
| T7 | Notification actions — render action buttons, fire D-Bus callbacks | Med | T2.1 | pending |
| T8 | Body markup rendering — formatted text support | Med | T2.1 | pending |
| T9 | Urgency styling — Error red accent for critical notifications | Low | T5 | pending |

---

## Exit Criteria

- [ ] All Must-Have scenarios pass manually (`notify-send` test)
- [ ] No regressions on existing bar widgets (BarLeft, BarCenter, BarRight still render correctly)
- [ ] swaync fully replaced — no `swaync-client` calls remain in codebase
- [ ] Notification center visually matches Chrysaki design system (chamfered island, jewel accents, glassmorphism)
- [ ] Toast auto-dismiss works reliably (no orphaned windows)

---

## References

- Issue: [#5 feat: AGS Notification Center](https://github.com/Kiriketsuki/chrysaki/issues/5)
- ServicePanel pattern: `widgets/ServiceStatus.tsx` (popup toggle reference implementation)
- Chrysaki design tokens: `styles/_palette.scss`
- Popup styling reference: `styles/_services.scss`

---
*Authored by: Clault KiperS 4.6*
