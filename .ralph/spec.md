# Ralph Project Specification: AGS Notification Center

## Global Goal
When this loop completes, AGS should be the sole notification daemon — receiving, displaying (toast popups + center panel), and managing all desktop notifications within the Chrysaki design system, with swaync fully removed.

## Product Overview
A native notification center for the AGS Wayland shell that replaces swaync. It provides toast popups for incoming notifications, a toggleable history panel, do-not-disturb mode, and an unread badge on the bar icon — all styled to Chrysaki's jewel-toned chamfered aesthetic.

## Target Audience
Desktop power user running a Hyprland/Wayland desktop who needs unified notification management within the Chrysaki design system instead of a disconnected external daemon.

## Feature Scope

### Must-Have (MVP)
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

## Technical Architecture
- **Stack**: TypeScript/JSX (AGS 2 / Astal), SCSS, GTK4 layer-shell
- **Components**: `NotificationCenter.tsx` (panel), `NotificationToast.tsx` (popups), `NotificationToggle.tsx` (bar button + badge), `_notifications.scss` (styles)
- **Key Integrations**: AstalNotifd (D-Bus notification daemon), GLib.timeout_add (toast auto-dismiss), existing ChamferedIsland/ServicePanel pattern

## Technical Constraints
- swaync must not be running when AGS claims D-Bus notification ownership — document removal in README
- Toast stacking capped at 3-4 visible; overflow must be queued, not dropped
- AstalNotifd API usage should follow the same Astal patterns already proven with AstalNetwork/AstalBattery

## Project Status
- **Overall Status**: IN_PROGRESS
- **Current Iteration**: 1
- **Last Update**: 2026-03-17 19:00
- **Task Selection Mode**: scored

<!-- Overall Status flow: IN_PROGRESS -> COUNCIL_PENDING -> VERIFICATION_PENDING -> MISSION_COMPLETE -->

## Acceptance Criteria for Exit
> These criteria are verified in a dedicated verification iteration after all tasks complete. The agent must not set MISSION_COMPLETE without passing verification.

- [ ] `notify-send "Test" "Hello world"` shows toast popup in AGS (not swaync)
- [ ] Toast auto-dismisses after ~5 seconds
- [ ] Multiple toasts stack (max 3-4 visible, overflow queued)
- [ ] NotificationToggle click toggles center panel showing notifications in reverse chronological order
- [ ] Individual notification dismiss button removes that notification
- [ ] Clear-all button clears list and shows empty state
- [ ] DND toggle suppresses toasts while accumulating in center
- [ ] Unread badge appears when >0 unread, disappears when center opened or cleared
- [ ] No regressions on existing bar widgets (BarLeft, BarCenter, BarRight still render correctly)
- [ ] swaync fully replaced — no `swaync-client` calls remain in codebase
- [ ] Notification center visually matches Chrysaki design system (chamfered island, jewel accents)
- [ ] Toast auto-dismiss works reliably (no orphaned windows)

## Task Matrix
| ID | Task Description | Priority | Impact | Blocking | Risk | Score | Status | Dependencies | Parent |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| T1 | AstalNotifd service setup — import, instantiate, verify D-Bus ownership | High | 4 | 4 | 3 | 23 | completed | None | - |
| T1.1 | Remove swaync dependency — update NotificationToggle to no longer call swaync-client | High | 5 | 0 | 1 | 16 | completed | T1 | - |
| T2 | NotificationCenter.tsx — popup panel window (follows ServicePanel pattern) | High | 5 | 5 | 2 | 27 | completed | T1 | - |
| T2.1 | Notification list rendering — summary, body, timestamp, dismiss button per notification | High | 5 | 3 | 1 | 22 | completed | T2 | - |
| T2.2 | Clear-all button and empty state | High | 5 | 0 | 1 | 16 | completed | T2.1 | - |
| T2.3 | DND toggle in panel header | High | 5 | 0 | 1 | 16 | completed | T2 | - |
| T3 | NotificationToast.tsx — toast popup window with auto-dismiss timer | High | 5 | 3 | 2 | 23 | pending | T1 | - |
| T3.1 | Toast stacking — max 3-4 visible, queue overflow | Med | 4 | 0 | 2 | 14 | pending | T3 | - |
| T4 | Unread badge on NotificationToggle — count/dot indicator | Med | 5 | 0 | 1 | 16 | completed | T1, T2 | - |
| T5 | _notifications.scss — panel, toast, badge styling (Chrysaki tokens, chamfered containers) | High | 5 | 2 | 2 | 21 | pending | T2, T3 | - |
| T5.1 | Register _notifications.scss in style.scss | High | 3 | 0 | 1 | 10 | pending | T5 | - |
| T6 | app.ts — register NotificationCenter() and NotificationToast() in main() | High | 4 | 0 | 1 | 13 | pending | T2, T3 | - |
| T7 | Notification actions — render action buttons, fire D-Bus callbacks | Med | 3 | 0 | 2 | 11 | pending | T2.1 | - |
| T8 | Body markup rendering — formatted text support | Med | 3 | 0 | 2 | 11 | pending | T2.1 | - |
| T9 | Urgency styling — Error red accent for critical notifications | Low | 2 | 0 | 1 | 7 | pending | T5 | - |

## Known Issues
> Append-only. The agent logs problems, warnings, or concerns detected during work.

| Timestamp | Severity | Description | Related Task |
|:---|:---|:---|:---|
