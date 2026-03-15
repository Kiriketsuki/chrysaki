# Chrysaki — Colour Palette

Canonical token reference for use in AGS/Waybar/SCSS.

---

## Surface Layers (dark mode)

| Token        | Hex       | OKLCH                  | Usage                          |
|:-------------|:----------|:-----------------------|:-------------------------------|
| Abyss        | `#0f1117` | `oklch(0.10 0.01 270)` | Deepest bg, modal backdrops    |
| Base         | `#161821` | `oklch(0.14 0.01 270)` | Primary canvas                 |
| Surface      | `#1c1f2b` | `oklch(0.17 0.02 270)` | Cards, sidebars, panels        |
| Raised       | `#252836` | `oklch(0.21 0.02 270)` | Hover, active, popups          |
| Elevated     | `#2e3142` | `oklch(0.25 0.02 270)` | Tooltips, floating elements    |
| Border       | `#363a4f` | `oklch(0.29 0.03 270)` | Dividers, input borders        |

---

## Tri-Primary Accents

Three hero colours. Each owns a domain — none dominates.

| Name        | Base      | Light     | Dim       | OKLCH (base)           | Domain                    |
|:------------|:----------|:----------|:----------|:-----------------------|:--------------------------|
| Emerald     | `#14664e` | `#1a8a6a` | `#0e4a38` | `oklch(0.39 0.07 168)` | Growth, creation, left modules |
| Royal Blue  | `#122858` | `#1c3d7a` | `#0c1a40` | `oklch(0.22 0.08 258)` | Structure, depth, bg fills     |
| Amethyst    | `#3a2068` | `#583090` | `#1e1040` | `oklch(0.28 0.12 305)` | Creativity, focus, right modules |

---

## Secondary Accents

| Name    | Base      | Light     | Dim       | OKLCH (base)           | Usage                         |
|:--------|:----------|:----------|:----------|:-----------------------|:------------------------------|
| Teal    | `#197278` | `#20969c` | `#0f4f54` | `oklch(0.44 0.07 196)` | Transitional, tags, metadata  |
| Blonde  | `#FBB13C` | `#FCC96A` | `#C4861C` | `oklch(0.80 0.17 68)`  | Emphasis, metrics, active states |

---

## Semantic

| Purpose | Hex       | Derived From |
|:--------|:----------|:-------------|
| Success | `#14664e` | Emerald      |
| Info    | `#122858` | Royal Blue   |
| Accent  | `#3a2068` | Amethyst     |
| Warning | `#FBB13C` | Blonde       |
| Error   | `#8C2F39` | Muted ruby   |

---

## Text

| Level     | Hex       | Usage                        |
|:----------|:----------|:-----------------------------|
| Primary   | `#e0e2ea` | Body, headings               |
| Secondary | `#a0a4b8` | Metadata, timestamps         |
| Muted     | `#6a6e82` | Placeholders, disabled       |
| Inverse   | `#0f1117` | Text on bright accent fills  |

---

## Gradient Patterns

```css
/* Tri-Primary Sweep — use for bar accent lines */
background: linear-gradient(135deg, #14664e, #122858, #3a2068);

/* Jewel Glow Border — thin top/bottom edge accents */
background: linear-gradient(90deg, #1a8a6a, #1c3d7a, #583090);

/* Animated gradient (keyframe over background-position) */
background: linear-gradient(90deg, #1a8a6a, #1c3d7a, #583090, #1a8a6a);
background-size: 200% 100%;
animation: gradientShift 4s linear infinite;
```

---

## Hyprland Border Colours

```
Active:   rgba(14664eee) rgba(3a2068ee) 45deg   (emerald → amethyst)
Inactive: rgba(122858aa)                         (royal blue, dimmed)
```

---

## SCSS Variable Block (for AGS)

```scss
// Surfaces
$abyss:    #0f1117;
$base:     #161821;
$surface:  #1c1f2b;
$raised:   #252836;
$elevated: #2e3142;
$border:   #363a4f;

// Tri-primary
$emerald:       #14664e;
$emerald-light: #1a8a6a;
$emerald-dim:   #0e4a38;
$blue:          #122858;
$blue-light:    #1c3d7a;
$blue-dim:      #0c1a40;
$amethyst:      #3a2068;
$amethyst-light:#583090;
$amethyst-dim:  #1e1040;

// Secondary
$teal:        #197278;
$teal-light:  #20969c;
$teal-dim:    #0f4f54;
$blonde:      #FBB13C;
$blonde-light:#FCC96A;
$blonde-dim:  #C4861C;

// Semantic
$error:   #8C2F39;
$warning: $blonde;
$success: $emerald;

// Text
$text-primary:   #e0e2ea;
$text-secondary: #a0a4b8;
$text-muted:     #6a6e82;
$text-inverse:   #0f1117;
```
