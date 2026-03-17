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
