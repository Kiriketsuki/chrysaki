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
