# Chrysaki Bar — Design Spec

Status: Phase 3 of the Chrysaki Design System. Goal: build a custom AGS bar.

---

## Decision: AGS v2 (recommended)

AGS v2 is already scaffolded at `Bar.tsx` (TypeScript + GTK4 + SCSS). It's the right pick because:
- Full programmatic control — every pixel is code
- GTK4 CSS supports gradients, blur, border-radius, animations natively
- Queries Hyprland IPC directly for workspace/window state
- TypeScript type safety vs EWW's Yuck or Fabric's looser Python

**Waybar** remains as a fallback/quick theme option (see Option A below).

---

## Option A: Chrysaki CSS Theme for Waybar (low effort)

Create `~/dots/styles/chrysaki.css` to plug into the existing theme pipeline.

Pipeline: `theme_switcher.sh` lists all `~/dots/styles/*.css` in Rofi — Chrysaki becomes a selectable theme without any structural changes.

**Approach:**
- Write CSS vars matching the existing `@define-color` format
- Tri-primary gradient assignment:
  - Left modules → Emerald
  - Centre workspaces → Amethyst
  - Right modules → Royal Blue
  - Active/focused states → Blonde
  - Critical/urgent → Ruby (`#8C2F39`)

**Constraint:** Waybar is limited to predefined modules. No custom widgets.

---

## Option B: Full AGS Bar (target)

### Layout Ideas

#### Floating Island (centre-top, pill shape)
```
+--------------------------------------------------+
| [ws-pips] | [clock] | [media] | [sys] | [power] |
+--------------------------------------------------+
  emerald     teal    amethyst   blonde    ruby
```

#### Split Panel (left + right islands, gap in middle)
```
+------------------+          +------------------+
| bat | clock | win|          |media|vol|net|pwr |
+------------------+          +------------------+
  emerald border               amethyst border
```

#### Minimal Dock (bottom-centre, macOS style)
```
          +----------------------------+
          | [1][2][3][4][5] | 14:30 | |
          +----------------------------+
           workspace dots    clock  tray
```

---

## Workspace Pips Design

Small coloured circles instead of numbered buttons:

| State    | Colour                              |
|:---------|:------------------------------------|
| Inactive | `#363a4f` (border, barely visible)  |
| Active   | Emerald / Blue / Amethyst (cycling) |
| Urgent   | Ruby `#8C2F39` + pulse animation    |
| Occupied | Dim variant of the active colour    |

---

## Widget Modules (planned)

| Widget              | Colour Domain | Data Source                |
|:--------------------|:--------------|:---------------------------|
| `WorkspaceIndicator`| Emerald       | Hyprland IPC               |
| `Clock`             | Teal          | System time                |
| `MediaPlayer`       | Amethyst      | MPRIS (playerctl)          |
| `SystemTray`        | Secondary     | XDG tray protocol          |
| `PowerMenu`         | Ruby          | Custom                     |
| `Battery`           | Blonde → Ruby | UPower / sysfs             |
| `Network`           | Blue          | NetworkManager / iw        |

---

## Glassmorphism Style

Hyprland already has blur enabled for layers. AGS panels should use:

```scss
background: rgba($surface, 0.75);
border: 1px solid rgba($border, 0.6);
border-radius: 12px;
// GTK4 blur is applied via Hyprland layerrule
```

Hyprland layerrule to add to config:
```
layerrule = blur, gtk-layer-shell
layerrule = ignorezero, gtk-layer-shell
```

---

## Integration with Existing Pipeline

1. `~/dots/styles/chrysaki.css` — Chrysaki tokens as `@define-color` CSS vars
2. `ensure_contrast.py` — pass-through (Chrysaki values already OKLCH-calibrated)
3. `theme_switcher.sh` (Rofi) — Chrysaki appears as a selectable theme
4. Waybar theme button — toggle between wallpaper-derived and Chrysaki

---

## Phase 3 Checklist (from Chrysaki Design System project)

- [ ] Create `~/dots/styles/chrysaki.css` for Waybar pipeline
- [ ] Build custom AGS bar with Chrysaki styling
- [ ] Apply Chrysaki border colours to Hyprland
- [ ] Chrysaki Rofi theme
