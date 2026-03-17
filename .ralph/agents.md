# Operational Guide

This file is seeded during the planning session and augmented by agents at runtime.
Agents: read this at iteration start. Append discoveries under `## Agent Learnings`.

## Build & Run
```
ags run
```
Run from `ags/.config/ags/` — this starts the AGS shell and applies all widget changes.

## Test
No automated test suite. Manual verification:
- `notify-send "Test" "Hello world"` — verify toast appears
- Click NotificationToggle in bar — verify center panel toggles
- Check bar widgets still render (BarLeft, BarCenter, BarRight)

## Lint / Format
```
npx prettier --write .
```
Prettier config in `package.json`: `semi: false`, `tabWidth: 2`.

## Agent Learnings
<!-- Agents append discoveries below. Do not edit existing entries. -->
