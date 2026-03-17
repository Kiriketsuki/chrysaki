# Feature: Autonomous Slash Events

<!-- SpecKit /specify layer: what and why -->
## Overview

**User Story**: As the desktop author, I want slash animations on the AGS bar that fire independently and trigger color transitions only when slashes visually intersect, so the bar feels alive and organic rather than mechanically timed.

**Problem**: The current wave system ties slash marks to a fixed sweep timer -- color transitions are predictable and feel robotic. Slashes should be spontaneous events, and color changes should feel earned by visual interaction, not scheduled.

**Out of Scope**: Changing the chamfered island shape, adding new palette colors, modifying other bar widgets.

### Design Principles

1. **Super randomized** -- any slash type can face any direction, random position, random color. No type-direction coupling.
2. **Organic motion** -- slashes drift vertically during their lifetime; they are not static marks.
3. **Interaction earns transition** -- color changes happen only when slashes physically cross. No timer-based transitions.
4. **Radial ripple** -- color expands outward from the intersection point as a true circle, not a linear sweep. Multiple ripples coexist; newest wins in overlap zones.

---

<!-- SpecKit /clarify layer: resolve ambiguities before planning -->
## Open Questions

| # | Question | Raised By | Resolved |
|:--|:---------|:----------|:---------|
| - | None | - | [x] |

---

<!-- MoSCoW from Ralph spec.md -->
## Scope

### Must-Have
- Autonomous slash spawning at random intervals (~2-3/sec): random type + direction + position -- acceptance: all 4 types and both directions observed within 10 seconds
- Vertical drift on each slash during its lifetime -- acceptance: visible Y-position shift during linger phase
- All 4 slash types (glow, wind, diamond, lightning) can face either `\` or `/` with equal 25% type probability -- acceptance: any type appears in any direction
- Intersection detection with X+Y proximity check, both slashes alpha > 0.35 -- acceptance: overlapping slashes trigger a ripple event
- Radial color ripple expanding as a true circle from each intersection point -- acceptance: color change visibly radiates outward from the crossing
- Multi-ripple stacking (newest wins in overlap) -- acceptance: two ripples active simultaneously, overlap zone shows newer color
- 4 Cairo-rendered slash shapes (glow, wind, diamond, lightning) with multi-layer depth -- acceptance: each shape visually distinct with outer/main/core layers

### Should-Have
- Intersection flash (star burst) at the crossing point before ripple starts
- Ripple edge softness (gradient at ripple boundary instead of hard circle)

### Nice-to-Have
- Randomized spawn rate intervals (range itself varies over time)

---

<!-- SpecKit /plan layer: technical decomposition -->
## Technical Plan

**Affected Components:**
- `ags/.config/ags/lib/wave-state.ts` -- update `SlashEventState` (add `cy`, `driftY`, decouple type/direction, equal weights); new `RippleState` class replacing `WaveAnimationState`
- `ags/.config/ags/lib/cairo-island.ts` -- new slash renderers with direction mirroring, `drawRadialRippleFill` (replaces `drawWaveColorFill`), `drawSlashLayer` (replaces `drawAnimatedHatch`), updated `drawIslandBackground` signature
- `ags/.config/ags/widgets/ChamferedIsland.tsx` -- wire `SlashEventState` + `RippleState`, intersection detection with X+Y proximity, pass slashes + ripples to draw calls

**Data Model Changes:**
- `InternalSlash` / `ActiveSlash`: add `cy: number` (0..1), `driftY: number` (px/ms drift rate)
- `SlashDraw` interface: add `cy: number`
- New `RippleState` class with `ActiveRipple { cx, cy, colorIndex, radiusPx, speedPxPerMs, startMs }`
- Remove `WaveAnimationState` (linear sweep no longer used)

**Dependencies:** None (all Cairo/GLib/GTK4)

**Risks:**
| Risk | Likelihood | Mitigation |
|:-----|:-----------|:-----------|
| Radial fill per-pixel cost at 30fps with multiple ripples | Medium | Cap max active ripples (e.g. 5); use 2px strips not 1px; retire ripples aggressively |
| Cairo redraw cost with many active slashes | Low | Max ~8 active slashes (spawn rate + lifetime balances this naturally) |

---

<!-- Gherkin /specify layer: executable acceptance criteria -->
## Acceptance Scenarios

```gherkin
Feature: Autonomous Slash Events with Radial Color Ripple

  Background:
    Given the AGS bar is running on Hyprland
    And at least one ChamferedIsland has gradient colors set

  Rule: Slashes spawn autonomously with full randomization

    Scenario: Random slash spawning
      When the bar is idle for 2 seconds
      Then at least 4 slashes should have appeared and faded
      And all 4 types (glow, wind, diamond, lightning) can appear
      And both directions (\ and /) can appear for any type
      And each slash appears at a random X position and random Y position

    Scenario: Vertical drift
      Given a slash has spawned
      When observed during its linger phase
      Then its Y position should visibly shift up or down

  Rule: Intersection triggers radial color ripple

    Scenario: Two slashes overlap
      Given two slashes are active with close X and Y positions
      And both have alpha > 0.35
      When their positions overlap within threshold
      Then a circular color ripple expands outward from the intersection point
      And the ripple color is a random palette color

    Scenario: No intersection -- no color change
      When no slashes overlap during a 5-second window
      Then the island background color remains unchanged

  Rule: Multiple ripples can coexist

    Scenario: Stacked ripples
      Given a ripple is expanding from point A
      When a second intersection occurs at point B
      Then a second ripple expands from point B simultaneously
      And pixels covered by both ripples show the newer ripple's color

    Scenario: Ripple completion
      When a ripple's radius exceeds the island diagonal
      Then the entire island is that ripple's color
      And the ripple is retired from the active list
```

---

<!-- SpecKit /tasks layer: implementation breakdown -->
## Task Breakdown

| ID | Task | Priority | Dependencies | Status |
|:---|:-----|:---------|:-------------|:-------|
| T1 | Update `SlashEventState` in `wave-state.ts` | High | None | pending |
| T1.1 | Add `cy` + `driftY` fields to `InternalSlash`/`ActiveSlash` | High | None | pending |
| T1.2 | Decouple type from direction (fully random, 25% each type) | High | None | pending |
| T1.3 | Add vertical drift in `tick()` | High | T1.1 | pending |
| T2 | New `RippleState` class (replaces `WaveAnimationState`) | High | None | pending |
| T2.1 | Track multiple active ripples: center, colorIndex, radius, speed | High | None | pending |
| T2.2 | `addRipple(cx, cy, colorIndex)` + `tick()` + retire completed | High | T2.1 | pending |
| T3 | Rewrite slash renderers in `cairo-island.ts` | High | None | pending |
| T3.1 | Strip `drawSlashGlow` to `\` only, add `dir` param for mirroring | High | None | pending |
| T3.2 | Add `drawSlashWind`, `drawSlashDiamond`, `drawSlashLightning` | High | T3.1 | pending |
| T3.3 | Replace `drawWaveColorFill` with `drawRadialRippleFill` | High | T2 | pending |
| T3.4 | Replace `drawAnimatedHatch` with `drawSlashLayer` | High | T3.2 | pending |
| T3.5 | Update `drawIslandBackground` signature and calls | High | T3.3, T3.4 | pending |
| T4 | Wire `ChamferedIsland.tsx` | High | T1, T2, T3 | pending |
| T4.1 | Import + init `SlashEventState` + `RippleState` | High | T1, T2 | pending |
| T4.2 | Intersection detection (`_checkIntersections`) with X+Y proximity | High | T4.1 | pending |
| T4.3 | Pass slashes + ripples to `drawIslandBackground` | High | T3.5, T4.1 | pending |
| T5 | Should-have: Intersection flash visual | Med | T4.2 | pending |
| T6 | Should-have: Ripple edge softness | Med | T3.3 | pending |
| T7 | Visual verification (kill + restart AGS, observe) | High | T4 | pending |

---

<!-- SpecKit /analyze layer: exit gate -->
## Exit Criteria

- [ ] AGS compiles without errors (`ags run` starts successfully)
- [ ] All 4 slash types visible in both `\` and `/` directions
- [ ] Slashes drift vertically during their lifetime
- [ ] Intersection between two slashes triggers a visible radial color ripple
- [ ] Multiple ripples coexist (newest color wins in overlap)
- [ ] No regressions on existing bar widgets (workspaces, clock, tray)
- [ ] No visible performance degradation at 30fps

---

## References

- PR: https://github.com/Kiriketsuki/chrysaki/pull/4
- SVG path reference: see appendix below
- Chrysaki palette: `chrysaki/CLAUDE.md` (Palette Reference section)

---

## SVG Path Reference

### \ glow (3 curved layers, center 110,90):
```
Outer: M 10 30 C 60 70, 110 120, 170 190 C 100 130, 50 80, 10 30 Z   -> 0.38a
Main:  M 30 10 C 80 50, 130 100, 190 170 C 120 110, 70 60, 30 10 Z   -> 0.72a
Core:  M 35 15 C 80 55, 125 100, 185 165 C 120 105, 75 60, 35 15 Z   -> white 0.28a
```

### / wind (3 curved layers, center 100,80):
```
Outer: M 10 150 C 50 50, 150 50, 190 10 C 130 70, 70 120, 10 150 Z   -> 0.35a
Mid:   M 20 145 C 55 60, 145 55, 185 15 C 130 70, 75 115, 20 145 Z   -> 0.65a
Inner: M 30 140 C 60 70, 140 60, 180 20 C 130 70, 80 110, 30 140 Z   -> white 0.30a
```

### / diamond (2 straight layers, center 100,100):
```
Main: M 15 185 L 100 110 L 185 15 L 110 100 Z                         -> 0.70a
Core: M 25 175 L 102 108 L 175 25 L 108 102 Z                         -> white 0.55a
```

### / lightning (2 zigzag layers + 3 sparks, center 90,100):
```
Main:   M 20 180 L 90 130 L 60 90 L 180 20 L 80 85 L 105 125 Z       -> 0.75a
Core:   M 28 170 L 88 127 L 65 92 L 170 28 L 82 87 L 100 125 Z       -> white 0.45a
Sparks: (150,50 160,40 155,60), (40,150 50,140 45,160)                 -> jewel 0.75a
        (90,70 100,60 85,80)                                            -> white 0.85a
Only draw sparks when a > 0.30; scale spark alpha: min(1, (a-0.30)/0.40) * a
```

### Intersection flash (4-point star at cx, cy):
```
Outer: 8-vertex star, r = h*0.32, arm ratio 0.22   -> jewel 0.90a
Inner: diamond, r*0.32                              -> white 1.0a
```

### Direction mirroring

All shapes are defined in their canonical direction. To render the opposite direction, apply a horizontal mirror: `cr.scale(-1, 1)` around the shape center before drawing, then restore.

---
*Authored by: Clault KiperS 4.6*
