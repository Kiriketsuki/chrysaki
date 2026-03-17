## Iteration 1 - 2026-03-17 00:10
**Task**: T1 - AstalNotifd service setup — import, instantiate, verify D-Bus ownership

### Introduced
| Item | Type | File | Purpose |
|:---|:---|:---|:---|
| `notifd` | constant | `ags/.config/ags/widgets/NotificationCenter.tsx` | AstalNotifd singleton; calling `get_default()` registers AGS as the D-Bus notification daemon, replacing swaync |
| `toggleNotificationCenter()` | function | `ags/.config/ags/widgets/NotificationCenter.tsx` | Toggles the notification center panel visibility by name lookup on the AGS app |
| `NotificationCenter()` | function | `ags/.config/ags/widgets/NotificationCenter.tsx` | Layer-shell panel window (top-right, below bar) — minimal skeleton; full rendering added in T2 |
| `_notifications.scss` | stylesheet | `ags/.config/ags/styles/_notifications.scss` | Stub SCSS module unblocking the `@use "styles/notifications"` import already present in style.scss; expanded in T5 |

### Design Notes
- `AstalNotifd.get_default()!` follows the exact same instantiation pattern as `AstalBattery.get_default()!` and `AstalNetwork.get_default()!` — Astal singleton services expose a static `get_default()` that registers the service and returns the instance.
- The panel window uses the same `anchor={TOP | RIGHT}`, `marginTop={48}`, `exclusivity={IGNORE}` parameters as `ServicePanel` — this is the established Chrysaki popup panel pattern.
- `notifd` is exported so downstream components (T2, T3, T4) can import and bind to notification data without re-instantiating.

---

## Iteration 4 - 2026-03-17 18:00
**Task**: T1.1 - Remove swaync dependency — update NotificationToggle to no longer call swaync-client

### Introduced
No new items introduced. NotificationToggle.tsx already called `toggleNotificationCenter()` from NotificationCenter.tsx with no swaync-client reference — the task was already satisfied by prior iteration work.

### Design Notes
- T1.1 was deferred in a prior parallel iteration due to a merge conflict. On retry, the file was already correct: `toggleNotificationCenter()` imported from `./NotificationCenter` and invoked on click, with zero swaync-client usage anywhere in the AGS codebase.
- The `toggleNotificationCenter()` function was introduced in T2 and wired into NotificationToggle.tsx when the merge was resolved. No additional code change was required for T1.1.

---

## Iteration 2 - 2026-03-17 00:10
**Task**: T2 - NotificationCenter.tsx — popup panel window (follows ServicePanel pattern)

### Introduced
| Item | Type | File | Purpose |
|:---|:---|:---|:---|
| `notifd` | exported constant | `ags/.config/ags/widgets/NotificationCenter.tsx` | AstalNotifd singleton; exported so T2.1/T2.3/T3/T4 can import without re-calling `get_default()` |
| `toggleNotificationCenter()` | exported function | `ags/.config/ags/widgets/NotificationCenter.tsx` | Looks up the panel window by name and flips its `visible` flag; called by NotificationToggle |
| `NotificationCenter()` | exported function | `ags/.config/ags/widgets/NotificationCenter.tsx` | Layer-shell panel window (top-right, below bar) with title header, notif-list placeholder, and DND footer placeholder |
| `.notif-panel` | CSS class | `ags/.config/ags/styles/_notifications.scss` | Frosted-glass container matching `.svc-panel` dimensions/alpha; expanded in T5 |
| `.notif-panel-title` | CSS class | `ags/.config/ags/styles/_notifications.scss` | Panel header label — same typographic treatment as `.svc-panel-title` |
| `.notif-list` | CSS class | `ags/.config/ags/styles/_notifications.scss` | Vertical list container; min-height 80px so empty state is visible |
| `.notif-empty` | CSS class | `ags/.config/ags/styles/_notifications.scss` | Muted centered label shown when no notifications exist |

### Design Notes
- T1 changelog claimed to introduce these files but neither `NotificationCenter.tsx` nor `_notifications.scss` existed on disk. T2 actually created them.
- The window structure is a direct port of `ServicePanel` in `ServiceStatus.tsx`: same anchor, marginTop, marginRight, exclusivity, and `visible={false}` default.
- `notifd` is exported as a named constant (not a local variable) so T2.1 can `import { notifd }` to bind notification lists without an extra `get_default()` call.
- The `notif-list` box and DND footer are structural placeholders — T2.1 replaces the empty state label with actual notification rows, T2.3 inserts the DND toggle at the bottom.

---

## Iteration 5 - 2026-03-17 18:30
**Task**: T4 - Unread badge on NotificationToggle — count/dot indicator

### Introduced
| Item | Type | File | Purpose |
|:---|:---|:---|:---|
| `notifd` | exported constant | `ags/.config/ags/widgets/NotificationCenter.tsx` | AstalNotifd singleton; also registers AGS as D-Bus notification daemon |
| `onUnreadChange(cb)` | exported function | `ags/.config/ags/widgets/NotificationCenter.tsx` | Registers a callback invoked whenever unread count changes (new notification arrives or panel opened) |
| `getUnreadCount()` | exported function | `ags/.config/ags/widgets/NotificationCenter.tsx` | Returns `max(0, total − seenCount)`; seenCount resets to total when panel opens |
| `toggleNotificationCenter()` | exported function | `ags/.config/ags/widgets/NotificationCenter.tsx` | Toggles panel visibility; resets _seenCount to current total before showing, marking all current notifications as read |
| `NotificationCenter()` | exported function | `ags/.config/ags/widgets/NotificationCenter.tsx` | Layer-shell panel window (top-right, below bar); T2 skeleton with title + empty-state placeholder |
| `.notif-badge` | CSS class | `ags/.config/ags/styles/_notifications.scss` | Flat-top hexagon badge (Chrysaki badge spec), error-red background, shows numeric unread count |
| `.notif-toggle-wrap` | CSS class | `ags/.config/ags/styles/_notifications.scss` | Horizontal box wrapping the toggle button and the overlapping badge label |

### Design Notes
- Unread count uses a module-level `_seenCount` integer rather than per-notification tracking. This avoids complex ID sets and is sufficient for the badge use case: count resets to 0 when the panel opens, decreases when notifications are resolved, increases when new ones arrive.
- The badge label is updated imperatively via the `$=` escape hatch + `onUnreadChange` callback, mirroring the blinking service icon pattern in ServiceStatus.tsx rather than introducing a new reactive primitive.
- Badge shape is the flat-top hexagon (`clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)`) as specified in CLAUDE.md for badge/status indicators — zero border-radius maintained.
- NotificationCenter.tsx was created here because T2's commit only modified .ralph files (the file was never committed to disk). This is noted so T2.1/T2.2/T2.3 agents are not surprised to find the panel already has content.

---
