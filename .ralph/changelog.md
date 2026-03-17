## Iteration 3 - 2026-03-17 20:30
**Task**: T3.1 - Toast stacking — max 3-4 visible, queue overflow

### Introduced
| Item | Type | File | Purpose |
|:---|:---|:---|:---|
| `NotificationToast()` | function | `ags/.config/ags/widgets/NotificationToast.tsx` | Layer-shell window (TOP \| RIGHT, marginTop 48) hosting the active toast stack; hidden when empty; wires the notifd "notified" signal to `_enqueueToast` |
| `_enqueueToast(id)` | function | `ags/.config/ags/widgets/NotificationToast.tsx` | DND-aware entry point: adds ID to `_visibleIds` (up to MAX_VISIBLE=4) or `_queue` overflow; schedules auto-dismiss for visible slots; triggers `_rebuildToastList` |
| `_dismissToastById(id)` | function | `ags/.config/ags/widgets/NotificationToast.tsx` | Removes ID from `_visibleIds`; promotes head of `_queue` to a visible slot and schedules its auto-dismiss; calls `_rebuildToastList`; no-op if ID already absent (guards auto-dismiss + manual-dismiss race) |
| `_scheduleAutoDismiss(id)` | function | `ags/.config/ags/widgets/NotificationToast.tsx` | Registers a one-shot `GLib.timeout_add` of 5000ms that calls `_dismissToastById`; returns `SOURCE_REMOVE` to fire only once |
| `_rebuildToastList()` | function | `ags/.config/ags/widgets/NotificationToast.tsx` | Imperatively removes all GTK4 box children then appends a `ToastRow` for each ID in `_visibleIds`; hides the window when the list is empty |
| `ToastRow(id, n)` | function | `ags/.config/ags/widgets/NotificationToast.tsx` | Renders one toast card: app name label, close button wired to `_dismissToastById`, summary label, optional body label (ellipsized); applies `notif-toast-critical` class for CRITICAL urgency |

### Design Notes
- `NotificationToast.tsx` was absent on disk despite T3 and T6 both being logged as completed (parallel-merge pattern). This iteration is the file's first actual on-disk presence; it delivers T3 and T3.1 together.
- Stacking state is two module-level arrays: `_visibleIds` (currently rendered) and `_queue` (waiting for a slot). Both follow immutable-reassignment style — no `splice` or `push`, always new array values.
- Queue promotion is FIFO: `const [next, ...rest] = _queue` takes the oldest queued notification first.
- `_dismissToastById` begins with `if (!_visibleIds.includes(id)) return` to handle the timer/manual-dismiss race cleanly — both paths converge on the same function.
- Stale queue entries (notifications dismissed from the center while queued) are silently skipped in `_rebuildToastList` via the `if (n)` guard on `notifd.notifications.find(...)`.

---

## Iteration 4 - 2026-03-17 20:10
**Task**: T6 - app.ts — register NotificationCenter() and NotificationToast() in main()

### Introduced
| Item | Type | File | Purpose |
|:---|:---|:---|:---|
| `NotificationToast()` | function | `ags/.config/ags/widgets/NotificationToast.tsx` | Layer-shell window (TOP \| RIGHT, marginTop 48) that hosts the active toast stack; hidden when no toasts are visible; connects to notifd "notified" signal to receive incoming notification IDs |
| `_enqueueToast(id)` | function | `ags/.config/ags/widgets/NotificationToast.tsx` | Receives a notification ID; skips if DND is on; adds to visible slots (up to MAX_VISIBLE=4) or overflow queue; triggers auto-dismiss timer |
| `_dismissToastById(id)` | function | `ags/.config/ags/widgets/NotificationToast.tsx` | Removes a notification ID from visible list, promotes next queued item if any, and calls _rebuildToastList |
| `_scheduleAutoDismiss(id)` | function | `ags/.config/ags/widgets/NotificationToast.tsx` | Registers GLib.timeout_add of 5000ms that calls _dismissToastById; returns GLib.SOURCE_REMOVE to fire only once |
| `_rebuildToastList()` | function | `ags/.config/ags/widgets/NotificationToast.tsx` | Imperatively clears all children from _toastListBox and re-appends a ToastRow for each visible ID; hides window when list is empty |
| `ToastRow(id, n)` | function | `ags/.config/ags/widgets/NotificationToast.tsx` | Renders one toast card: app name label, dismiss button, summary, optional body (ellipsized); applies notif-toast-critical class for CRITICAL urgency |
| `NotificationToast` import + call | line | `ags/.config/ags/app.ts` | Imports NotificationToast from widgets/NotificationToast and calls it in main() as a single-instance panel |

### Design Notes
- `NotificationToast.tsx` was absent on disk despite T3 being marked completed (recurring pattern in this parallel-merge loop). The file was recreated from the T3 changelog spec.
- Single persistent layer-shell window whose children are rebuilt imperatively on each enqueue/dismiss — avoids the complexity of per-notification windows.
- `_toastListBox` reference captured via the `$` escape-hatch on the container box, matching the pattern in `NotificationToggle.tsx`.
- DND check happens at enqueue time, so notifications arriving while DND is on silently accumulate in the center (via NotificationCenter.tsx's own notified handler) but never enter the toast queue.
- `notif-toast-critical` class is applied in `ToastRow` via `n.urgency === AstalNotifd.Urgency.CRITICAL`, completing the urgency chain started by T9 for panel rows.

---

## Iteration 5 - 2026-03-17 20:00
**Task**: T9 - Urgency styling — Error red accent for critical notifications

### Introduced
| Item | Type | File | Purpose |
|:---|:---|:---|:---|
| `isCritical` | local variable | `ags/.config/ags/widgets/NotificationCenter.tsx` | Boolean derived from `n.urgency === AstalNotifd.Urgency.CRITICAL`; drives conditional class |

### Design Notes
- `AstalNotifd.Urgency.CRITICAL` is the GObject enum value (vapi: `Urgency.CRITICAL`), accessible directly via the GI binding in TypeScript.
- Class string is `notif-row notif-row-critical` for critical, `notif-row` otherwise — modifier pattern matches existing DND button styling convention in the same file.
- `notif-toast-critical` (already in _notifications.scss) cannot be wired yet: `NotificationToast.tsx` is not present on disk. Will be applied when that file is created by T3/T6.

---

## Iteration 5 - 2026-03-17 19:50
**Task**: T5.1 - Register _notifications.scss in style.scss

### Introduced
No new items introduced.

### Design Notes
- `@use "styles/notifications"` was already present in `style.scss` (line 13), added by a prior iteration alongside the _notifications.scss stub. No file changes were required; spec status updated to `completed`.

---

## Iteration 3 - 2026-03-17 19:45
**Task**: T5 - _notifications.scss — panel, toast, badge styling (Chrysaki tokens, chamfered containers)

### Introduced
| Item | Type | File | Purpose |
|:---|:---|:---|:---|
| chamfered clip-path on `.notif-row` | CSS rule | `ags/.config/ags/styles/_notifications.scss` | 8px polygon chamfer on notification rows; no explicit border (clip-path clips it); hover brightens background tint |
| `.notif-row-critical` | CSS class | `ags/.config/ags/styles/_notifications.scss` | Error-red tint modifier for critical-urgency rows; overrides app-name color to `$blonde-light` for safe text on dark |
| `.notif-toast-list` | CSS class | `ags/.config/ags/styles/_notifications.scss` | Container box inside the toast window; zero padding so toasts stack flush |
| `.notif-toast` | CSS class | `ags/.config/ags/styles/_notifications.scss` | Chamfered toast card at high alpha ($surface 0.92); hover lifts to $raised 0.95 |
| `.notif-toast-critical` | CSS class | `ags/.config/ags/styles/_notifications.scss` | Error-red background for critical toasts; hover shifts to error-light; app name uses `$blonde-light` |
| `.notif-toast-header` | CSS class | `ags/.config/ags/styles/_notifications.scss` | Header row inside a toast (app name + close button); 3px bottom margin |
| `.notif-toast-app` | CSS class | `ags/.config/ags/styles/_notifications.scss` | App name label in toast — emerald-light, small bold |
| `.notif-toast-close` | CSS class | `ags/.config/ags/styles/_notifications.scss` | Close button in toast — transparent, muted; hover turns error-red |
| `.notif-toast-summary` | CSS class | `ags/.config/ags/styles/_notifications.scss` | Summary text in toast — primary color, bold 13px |
| `.notif-toast-body` | CSS class | `ags/.config/ags/styles/_notifications.scss` | Body text in toast — secondary color, 12px, 2px top margin |

### Design Notes
- `.notif-row` gains the standard Chrysaki chamfer (`polygon(8px 0%, ...)`) for geometric consistency with other design system elements. Because `clip-path` clips borders off, the border declaration is removed; background-color tint is the only visual boundary.
- Toast cards use a high-alpha Surface background (`rgba(28,31,43,0.92)`) unlike the panel which uses low-alpha for compositor blur to show through. Toasts float without guaranteed blur context, so they need their own opacity for contrast.
- Urgency classes (`.notif-row-critical`, `.notif-toast-critical`) are defined here as foundation for T9, keeping T5 and T9 cleanly separated: T5 provides the CSS, T9 wires the JSX class conditionals.
- `$blonde-light` is used as app-name text on critical red backgrounds — it is a "safe text accent on dark" per CLAUDE.md design rules, providing clear source attribution without reading as a second error signal.

---

## Iteration 2 - 2026-03-17 19:30
**Task**: T3 - NotificationToast.tsx — toast popup window with auto-dismiss timer

### Introduced
| Item | Type | File | Purpose |
|:---|:---|:---|:---|
| `NotificationToast()` | function | `ags/.config/ags/widgets/NotificationToast.tsx` | Layer-shell window (TOP \| RIGHT, marginTop 48) that hosts the active toast stack; hidden when no toasts are visible |
| `_enqueueToast(id)` | function | `ags/.config/ags/widgets/NotificationToast.tsx` | Receives a notification ID from the notifd "notified" signal; skips if DND is on; adds to visible slots (up to MAX_VISIBLE=4) or overflow queue; triggers auto-dismiss timer |
| `_dismissToastById(id)` | function | `ags/.config/ags/widgets/NotificationToast.tsx` | Removes a notification from the visible list, promotes the next queued item if any, and rebuilds the toast widget list |
| `_scheduleAutoDismiss(id)` | function | `ags/.config/ags/widgets/NotificationToast.tsx` | Registers a GLib.timeout_add of 5000ms that calls _dismissToastById when it fires; returns SOURCE_REMOVE to run only once |
| `_rebuildToastList()` | function | `ags/.config/ags/widgets/NotificationToast.tsx` | Clears all children from the toast container box and re-renders a ToastRow for each currently visible notification ID; hides the window if the list is empty |
| `ToastRow(id, n)` | function | `ags/.config/ags/widgets/NotificationToast.tsx` | Renders one toast: app name, dismiss button, summary label, optional body label with ellipsis |

### Design Notes
- The toast window is a single persistent layer-shell window whose children are rebuilt on every enqueue/dismiss operation, avoiding the complexity of per-notification windows.
- Module-level `_visibleIds` and `_queue` arrays manage slot state; MAX_VISIBLE=4 caps what is shown at once.
- DND check is at enqueue time, matching the spec requirement that DND suppresses toasts while still accumulating in the center.
- `_toastListBox` ref is set via the `$` escape-hatch prop on the container box, following the same pattern used in NotificationToggle.tsx for imperative widget updates.

---

## Iteration 3 - 2026-03-17 19:10
**Task**: T8 - Body markup rendering — formatted text support

### Introduced
| Item | Type | File | Purpose |
|:---|:---|:---|:---|
| `sanitizeBodyMarkup(body)` | function | `ags/.config/ags/widgets/NotificationCenter.tsx` | Converts the freedesktop.org HTML notification body subset to safe Pango markup; strips unsupported tags (`<a>`, `<img>`), converts `<br>` to newlines, passes Pango-safe tags through unchanged; returns `{ markup, hasMarkup }` |
| `BodyLabel({ body })` | function | `ags/.config/ags/widgets/NotificationCenter.tsx` | Renders a notification body label with conditional `useMarkup` — enables Pango markup only when the body contained HTML, leaving plain-text bodies untouched |

### Design Notes
- Plain-text bodies (no `<` characters) bypass sanitization entirely and render with `useMarkup={false}`, preventing Pango parser errors from literal `<` in plain text.
- `<a>` tags are stripped of their wrapper but their inner text is preserved — Pango has no `href` rendering capability.
- Allowed Pango tags: `b`, `i`, `u`, `s`, `tt`, `span`, `sub`, `sup`, `big`, `small` — the intersection of what freedesktop.org may send and what Pango can render.

---

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

## Iteration 4 - 2026-03-17 18:40
**Task**: T2.3 - DND toggle in panel header

### Introduced
| Item | Type | File | Purpose |
|:---|:---|:---|:---|
| `DndToggle()` | function | `widgets/NotificationCenter.tsx` | Internal panel component — binds to `notifd.dontDisturb`, toggles icon/class reactively, fires `notifd.dontDisturb = !notifd.dontDisturb` on click |
| `NotificationCenter()` | function (export) | `widgets/NotificationCenter.tsx` | Layer-shell popup window — panel skeleton with header (title + DndToggle) and placeholder list box; follows ServicePanel pattern |
| `notifd` | const (export) | `widgets/NotificationCenter.tsx` | AstalNotifd singleton — exported for sub-tasks (T2.1, T2.2) to access notification list |
| `toggleNotificationCenter()` | function (export) | `widgets/NotificationCenter.tsx` | Shows/hides the panel; resets unread count to 0 on open |
| `getUnreadCount()` | function (export) | `widgets/NotificationCenter.tsx` | Returns current unread count (incremented on each `notified` signal) |
| `onUnreadChange()` | function (export) | `widgets/NotificationCenter.tsx` | Registers a listener called whenever unread count changes |
| `.notif-panel` | CSS class | `styles/_notifications.scss` | Frosted-glass panel container — dark tint, border, shadow, width constraints |
| `.notif-panel-header` | CSS class | `styles/_notifications.scss` | Header row — bottom border separator, spacing |
| `.notif-panel-title` | CSS class | `styles/_notifications.scss` | Panel title label — primary text, bold |
| `.notif-dnd-btn` | CSS class | `styles/_notifications.scss` | DND toggle button — transparent bg, secondary text color |
| `.notif-dnd-active` | CSS class | `styles/_notifications.scss` | DND active modifier — blonde-light tint signals suppression state |
| `.notif-toggle-wrap` | CSS class | `styles/_notifications.scss` | Bar toggle wrapper box |
| `.notif-badge` | CSS class | `styles/_notifications.scss` | Unread count badge label — blonde-light, small font |
| `.notif-panel-list` | CSS class | `styles/_notifications.scss` | Notification list container with padding |

### Design Notes
- `DndToggle` uses `createBinding(notifd, "dontDisturb")` so the icon (`󰂚`/`󰂛`) and CSS class update reactively whenever the property changes from any source.
- DND active state uses `$blonde-light` tint — consistent with "warning/suppression" semantics in Chrysaki (blonde = attention signal without being error-red).
- The panel was created fresh here because `NotificationCenter.tsx` was absent on disk despite prior iterations logging its creation. T2.1 and T2.2 agents should append their content to `.notif-panel-list`.
- `_setUnreadCount` is intentionally unexported — only the panel toggle and the `notified` signal should mutate count.

---

## Iteration 3 - 2026-03-17 19:10
**Task**: T2.2 - Clear-all button and empty state

### Introduced
| Item | Type | File | Purpose |
|:---|:---|:---|:---|
| `ClearAllButton()` | function | `widgets/NotificationCenter.tsx` | Panel header button — visible only when `notifd.notifications.length > 0`; on click snapshots the list and calls `n.dismiss()` on each entry, then resets unread count to 0 |
| `.notif-clear-all-btn` | CSS class | `styles/_notifications.scss` | Transparent button, muted text; turns error-red on hover — signals destructive action without dominating the header |

### Design Notes
- The button uses `visible={notifications.as((list) => list.length > 0)}` so it auto-hides when the list empties, keeping the header uncluttered in the empty state.
- List is snapshotted (`[...notifd.notifications]`) before iteration to avoid modifying a live array while iterating — standard immutability pattern.
- Empty state ("No notifications" label) was already present from T2.1; this task confirms the label and its `.notif-empty` styling are sufficient — no changes needed there.
- `_setUnreadCount(0)` is called after clearing so the bar badge also resets immediately without waiting for the next panel open event.

---

## Iteration 3 - 2026-03-17 19:00
**Task**: T2.1 - Notification list rendering — summary, body, timestamp, dismiss button per notification

### Introduced
| Item | Type | File | Purpose |
|:---|:---|:---|:---|
| `formatTimestamp(unixTime)` | function | `widgets/NotificationCenter.tsx` | Converts a Unix timestamp to a human-readable relative string ("just now", "5m ago", "2h ago", "3d ago") |
| `NotificationRow(n)` | function | `widgets/NotificationCenter.tsx` | Renders one notification as a box with header row (app name, timestamp, dismiss button), summary label, and optional body label |
| `notifd` | exported const | `widgets/NotificationCenter.tsx` | AstalNotifd singleton — registers AGS as D-Bus notification daemon; exported for downstream tasks |
| `getUnreadCount()` | exported function | `widgets/NotificationCenter.tsx` | Returns current unread count (incremented on `notified` signal, reset on panel open) |
| `onUnreadChange(cb)` | exported function | `widgets/NotificationCenter.tsx` | Registers a listener called whenever unread count changes |
| `toggleNotificationCenter()` | exported function | `widgets/NotificationCenter.tsx` | Shows/hides the panel; resets unread count to 0 on open |
| `DndToggle()` | function | `widgets/NotificationCenter.tsx` | Binds to `notifd.dontDisturb` reactively; icon and class update on state change; click toggles DND |
| `NotificationCenter()` | exported function | `widgets/NotificationCenter.tsx` | Layer-shell panel window with header (title + DndToggle) and reactive notification list driven by `createBinding(notifd, "notifications")` |
| `.notif-row` | CSS class | `styles/_notifications.scss` | Individual notification container — frosted tint background, 1px border, hover brightening |
| `.notif-row-header` | CSS class | `styles/_notifications.scss` | Row header box — contains app name, timestamp, and dismiss button |
| `.notif-row-app` | CSS class | `styles/_notifications.scss` | App name label — teal-light color, small bold font |
| `.notif-row-time` | CSS class | `styles/_notifications.scss` | Timestamp label — muted text, small font |
| `.notif-dismiss-btn` | CSS class | `styles/_notifications.scss` | Dismiss button — transparent, muted color; turns error-red on hover |
| `.notif-row-summary` | CSS class | `styles/_notifications.scss` | Summary label — primary text, bold, wraps to multiple lines |
| `.notif-row-body` | CSS class | `styles/_notifications.scss` | Body label — secondary text, smaller font, ellipsized at end |
| `.notif-empty` | CSS class | `styles/_notifications.scss` | Empty-state label shown when notifications list is empty |

### Design Notes
- `NotificationRow` uses a flat two-level structure: header row (app + time + dismiss) above summary, with body below if non-empty. This matches common notification UX patterns (macOS, GNOME).
- The notification list uses `createBinding(notifd, "notifications").as(list => ...)` to render reactively — list re-renders whenever a notification is added or dismissed. `[...list].reverse()` shows newest-first.
- `n.dismiss()` is the AstalNotifd API for closing a notification — this fires the D-Bus `CloseNotification` call and triggers the `resolved` signal, causing the list to re-render via the binding.
- Both files were absent on disk despite prior parallel iterations claiming to have created them. This iteration creates them as a complete, coherent file consolidating T2 (panel skeleton), T4 (unread state), T2.3 (DND toggle), and T2.1 (notification rows).
- `teal-light` is chosen for the app name accent — it is a safe text color on dark surfaces per CLAUDE.md rules, and signals "informational source" without the urgency of blonde or error-red.

---

## Iteration 3 - 2026-03-17 19:00
**Task**: T7 - Notification actions — render action buttons, fire D-Bus callbacks

### Introduced
| Item | Type | File | Purpose |
|:---|:---|:---|:---|
| action buttons block in `NotificationRow` | JSX | `ags/.config/ags/widgets/NotificationCenter.tsx` | Conditionally renders a row of action buttons below the notification body; each button calls `n.invokeAction(action.id)` to fire the D-Bus callback |
| `.notif-actions` | CSS class | `ags/.config/ags/styles/_notifications.scss` | Flex container for action buttons with top border separator and 6px margin-top |
| `.notif-action-btn` | CSS class | `ags/.config/ags/styles/_notifications.scss` | Emerald-accented action button with hover/active states; hexpand so buttons share row space evenly |

### Design Notes
- Actions render only when `n.actions.length > 0` — no empty box rendered for notifications without actions.
- Buttons use `hexpand` so multiple actions split the available width evenly across the row.
- Emerald accent (`$emerald-light`) chosen per design system: emerald is the primary jewel tone for interactive elements on dark surfaces.
- `n.invokeAction(id)` is the AstalNotifd D-Bus callback; the notification daemon delivers the action to the originating app.

---
