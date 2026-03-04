# Chrysaki Redesign Findings

Research synthesis for v2.0 direction: Firefox + VSCode.
Agents: firefox-researcher (complete), vscode-researcher (pending), geo-researcher (pending).

---

## Design Direction

**User intent:**
- Less harsh contrast while staying within the Chrysaki jewel-tone palette
- Geometric shapes replacing plain rectangles: trapezoids, hexagons, equilateral triangles
- Zero border-radius (unchanged)
- Glass morphism, backdrop-filter blur, and faded edges are permitted

---

## Firefox

### Contrast Softening

**Do not fight contrast with brighter colors — fight it with opacity.**

Rose Pine's softness comes from muted value differences (~20-25% lightness steps), not from borders or distinct blocks. Their active tab vs inactive is `#403C58` vs `#1F1D29` — a shift, not a hard cut.

Techniques to adopt for Chrysaki:

1. **HSLA white fog overlays** — instead of solid jewel-tone backgrounds for active states, layer fog over the dark base. Jewel tones then appear only in text and borders.
   ```css
   /* Active state: dark base + subtle white lift */
   background-color: rgba(28, 31, 43, 0.85);                    /* Surface at 85% */
   box-shadow: inset 0 0 0 1px hsla(0, 0%, 100%, 0.06);         /* Inner edge ghost */
   ```

2. **`color-mix()` tinting** — tint surfaces toward a jewel tone without a hard jump:
   ```css
   background: color-mix(in srgb, var(--chrysaki-emerald) 12%, var(--chrysaki-base));
   ```

3. **Semi-transparent accents** — replace solid jewel fills with washes:
   ```css
   background: rgba(88, 48, 144, 0.25);     /* Amethyst at 25% — focus wash */
   background: rgba(26, 138, 106, 0.18);    /* Emerald at 18% — hover wash */
   ```

4. **Edge fading via mask-image** (URL bar, text overflow):
   ```css
   mask-image: linear-gradient(
       to right,
       transparent,
       black 12px,
       black calc(100% - 12px),
       transparent
   );
   ```

5. **Multi-layer box-shadow instead of hard borders**:
   ```css
   box-shadow:
       0 0 0 1px rgba(26, 138, 106, 0.15),       /* Emerald ghost border */
       0 2px 8px rgba(0, 0, 0, 0.30),             /* Depth */
       inset 0 1px 0 rgba(255, 255, 255, 0.04);   /* Top highlight sliver */
   ```

6. **Thin vertical tab separators** instead of full side borders:
   ```css
   border-left: 1px solid rgba(54, 58, 79, 0.4) !important;
   border-right: none !important;
   ```

### Glassmorphism

**Prerequisites (user must enable in about:config):**
- `layout.css.backdrop-filter.enabled = true`
- `gfx.webrender.all = true`

**Standard Chrysaki glass stack:**
```css
.glass {
    background: rgba(15, 17, 23, 0.65);              /* Abyss at 65% */
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.06);     /* Ghost edge */
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}
```

**Blur values by element weight:**
| Element | Blur |
|:--------|:-----|
| Tab strip background | `blur(12px)` |
| Bookmark bar | `blur(10px)` |
| URL bar popup | `blur(8px)` |
| Tooltip / audio indicator | `blur(6px)` |

**Critical Firefox bug — Bug 1579957:**
`backdrop-filter` does NOT respect `clip-path` on the same element in Firefox. They must be on separate elements.

**Workaround pattern (geometry + glass):**
```css
/* Wrapper: carries the clip-path geometry */
.tab-shape-wrapper {
    clip-path: polygon(5% 100%, 12% 0%, 88% 0%, 95% 100%);
    overflow: hidden;
}

/* Inner child: carries the backdrop-filter */
.tab-shape-wrapper .tab-bg {
    position: absolute;
    inset: 0;
    background: rgba(15, 17, 23, 0.65);
    backdrop-filter: blur(10px);
}
```

### Geometric Shapes — Verified clip-path Values

```css
/* Active tab — trapezoid (wider top, angled sides, grounded bottom) */
clip-path: polygon(5% 100%, 12% 0%, 88% 0%, 95% 100%);

/* Inverted trapezoid (wider bottom — for indicators/footers) */
clip-path: polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%);

/* Hexagon — flat top (badges, icons) */
clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);

/* Hexagon — pointy top (tag chips, pills) */
clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);

/* Equilateral triangle — up (accent, expand) */
clip-path: polygon(50% 0%, 0% 87%, 100% 87%);

/* Equilateral triangle — down (collapse, caret) */
clip-path: polygon(0% 13%, 100% 13%, 50% 100%);

/* Equilateral triangle — right (expand, nav arrow) */
clip-path: polygon(0% 0%, 100% 50%, 0% 100%);

/* Chamfered rectangle — 8px cuts (replaces border-radius) */
clip-path: polygon(
    8px 0%, calc(100% - 8px) 0%,
    100% 8px, 100% calc(100% - 8px),
    calc(100% - 8px) 100%, 8px 100%,
    0% calc(100% - 8px), 0% 8px
);

/* Parallelogram (tab badge, decorative accent stripe) */
clip-path: polygon(12% 0%, 100% 0%, 88% 100%, 0% 100%);
```

### Architecture Changes (Firefox)

**Adopt modular `@import` manifest pattern** (from Firefox-Mod-Blur / CustomCSSforFx community):

```
firefox/
  userChrome.css        <- manifest only (@import statements)
  css/
    variables.css       <- all --chrysaki-* tokens
    tabs.css            <- tab geometry, active indicator
    navbar.css          <- URL bar, toolbar
    sidebar.css         <- sidebar, header
    effects.css         <- blur, glass, fog overlays
    menus.css           <- context menus, panels
    findbar.css
```

**New tab indicator approach** — replace the 2px bottom line with a trapezoid wrapper:
The active tab gets a full trapezoid-clipped background using the wrapper/child split pattern above, with an emerald-led gradient inner border (`border-image` on the child or a pseudo-element).

---

## VSCode

### Contrast Strategy Options

**Root problem**: The current theme has 6 distinct background levels with jumps of ~4 lightness points each. The Abyss-to-editor gap is the harshest.

**Option A — "Flat" (Rose Pine approach)**
Collapse sidebar, editor, panels to the same base. Use foreground tiers for hierarchy — not background color shifts.
```jsonc
"editor.background":                  "#1a1d2a",   // anchor unchanged
"sideBar.background":                 "#1a1d2a",   // match editor
"activityBar.background":             "#161821",   // one subtle step darker
"statusBar.background":               "#161821",   // match activity bar
"titleBar.activeBackground":          "#161821",
"editorGroupHeader.tabsBackground":   "#1a1d2a",   // match editor
"tab.inactiveBackground":             "#1a1d2a00", // fully transparent
"tab.activeBackground":               "#e0e2ea08", // subtle bright overlay only
"panel.background":                   "#1a1d2a",
"terminal.background":                "#1a1d2a"
```

**Option B — "Layered" (Catppuccin approach)**
Keep 3 tiers but compress the delta to ~2-3 lightness points instead of 4.
```
Tier 1 (deepest):  #13151e  — activity bar, status bar (lighter than current #0f1117)
Tier 2 (middle):   #171a24  — sidebar, tab bar, panel
Tier 3 (surface):  #1a1d2a  — editor (unchanged)
```

Recommendation: **Option B** preserves Chrysaki's depth hierarchy while eliminating the harshness.

### Alpha Transparency — Adopt Throughout

Rose Pine and Catppuccin both use 8-digit hex alpha heavily. Current Chrysaki uses almost none in workbench colors (only in scrollbars). Apply alpha to:

```jsonc
// Borders — from opaque to ghost
"sideBar.border":                     "#2c2f4230",  // 19% alpha
"editorGroup.border":                 "#2c2f4230",
"activityBar.border":                 "#2c2f4230",
"panel.border":                       "#2c2f4230",
"tab.border":                         "#2c2f4230",

// List states — from solid fills to washes
"list.hoverBackground":               "#1a8a6a15",  // emerald at 8%
"list.activeSelectionBackground":     "#1a8a6a33",  // emerald at 20%
"list.inactiveSelectionBackground":   "#1a8a6a1f",  // emerald at 12%
"list.focusBackground":               "#1a8a6a4d",  // emerald at 30%

// Editor overlays
"editor.lineHighlightBackground":     "#e0e2ea08",  // soft white lift
"editor.selectionBackground":         "#1c3d7a50",  // blue at 31% (keep existing logic)
"editor.wordHighlightBackground":     "#19727825",  // teal at 15%
"editor.findMatchBackground":         "#FBB13C35",  // blonde at 21%

// Input chrome
"input.background":                   "#13151e80",  // 50% alpha
"input.border":                       "#363a4f45",  // 27% alpha

// Section headers — transparent like Rose Pine
"sideBarSectionHeader.background":    "#00000000",
```

**VSCode limitation**: `editor.background` does not respect alpha — always opaque. All other chrome elements do.

### Tab Active Indicator

Replace the current single top-border line with a compound indicator:
```jsonc
"tab.activeBorderTop":                "#1a8a6acc",  // emerald at 80% (not hard)
"tab.activeBackground":               "#e0e2ea0a",  // very faint white lift
"tab.inactiveBackground":             "#00000000",  // fully transparent
"tab.unfocusedActiveBackground":      "#e0e2ea05",
"tab.activeForeground":               "#e0e2ea",
"tab.inactiveForeground":             "#8085a0"     // slightly brighter than comments
```

### TokenColor Refinements

| Scope | Current | Proposed | Rationale |
|:------|:--------|:---------|:----------|
| Keywords / Storage | `#583090` | `#7a52b3` | Lighten amethyst — current is too saturated/dark against dark bg, causes vibration |
| Comments | `#6a6e82` | `#6a6e8299` | Add 60% alpha — comments should recede |
| Line numbers | `#363a4f` | `#6a6e8266` | Currently near-invisible; brighter base + 40% alpha |
| Active line number | `#6a6e82` | `#1a8a6a` | Emerald for current-line pop |
| Strings | `#FBB13C` | `#FBB13Ccc` | 80% alpha — softens without changing hue |
| Numbers / Constants | `#FCC96A` | `#FCC96A` | Keep — already lighter variant |
| Functions | `#1a8a6a` | `#1a8a6a` | Keep — already soft |
| Types / Tags | `#20969c` | `#20969c` | Keep — teal works well |
| Punctuation | `#a0a4b8` | `#a0a4b8cc` | 80% alpha — reduces bracket/semicolon noise |
| Decorators | `#583090` | `#7a52b3` | Match softened keyword |
| Inactive tab fg | `#6a6e82` | `#8085a0` | Differentiate from comments/breadcrumbs |

**Most impactful single change**: `#583090` → `#7a52b3` for keywords. The current amethyst is too dark/saturated — it causes a "vibrating" effect at this contrast ratio.

### Gutter Indicators — Add Alpha

Catppuccin uses `cc` (80%) alpha on all gutter colors to prevent distracting vividness:
```jsonc
"editorGutter.addedBackground":       "#1a8a6acc",
"editorGutter.modifiedBackground":    "#FBB13Ccc",
"editorGutter.deletedBackground":     "#8C2F39cc"
```

### Glassmorphic Feel Without Extension Patching

True backdrop-filter in VSCode requires workbench.html patching (Frosted Glass Theme or Vibrancy Continued extensions). Without extensions, simulate the aesthetic through:
1. Heavy alpha on all chrome backgrounds
2. Very subtle borders (`#2c2f4230` range)
3. Multiple foreground opacity tiers
4. Windows 11 user: **Vibrancy Continued** (`illixion.vscode-vibrancy-continued`) supports Acrylic blur natively — recommend as an optional companion

---

## Geometric Design Patterns

### Primary Shape Language

**Chamfered rectangle** is the anchor shape — replaces border-radius everywhere. Hexagons for badges. Trapezoids for tabs and dropdowns.

```css
/* -- CHAMFERED RECTANGLE -- */
/* All panels, containers, inputs */
:root { --notch: 8px; }

clip-path: polygon(
  0% var(--notch),
  var(--notch) 0%,
  calc(100% - var(--notch)) 0%,
  100% var(--notch),
  100% calc(100% - var(--notch)),
  calc(100% - var(--notch)) 100%,
  var(--notch) 100%,
  0% calc(100% - var(--notch))
);

/* Top corners only (tabs, toolbar items) */
clip-path: polygon(
  0% 8px, 8px 0%, calc(100% - 8px) 0%, 100% 8px,
  100% 100%, 0% 100%
);

/* -- TRAPEZOID -- */
/* Active browser tab (wider top, angled sides, grounded bottom) */
clip-path: polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%);

/* Dropdown / tooltip pointer (wider top, narrower bottom) */
clip-path: polygon(0% 0%, 100% 0%, 80% 100%, 20% 100%);

/* -- HEXAGON -- */
/* Flat-top: badges, status indicators, avatar frames */
clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);

/* Pointy-top: vertical badges, icon frames */
clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);

/* -- TRIANGLES -- */
clip-path: polygon(50% 0%, 100% 100%, 0% 100%);   /* up */
clip-path: polygon(0% 0%, 100% 0%, 50% 100%);      /* down */
clip-path: polygon(0% 0%, 100% 50%, 0% 100%);      /* right */

/* -- PARALLELOGRAM (tab badges, accent bars) -- */
clip-path: polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%);

/* -- CHEVRON (breadcrumb segments) -- */
clip-path: polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%, 15% 50%);

/* -- DIAMOND (decorative separator) -- */
clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
```

### Dark Glassmorphism

Dark-glass requires white tinting, not dark overlay. The key add: `saturate()` prevents blur from washing out jewel tones.

```css
/* Subtle (sidebars, panels) */
background: rgba(255, 255, 255, 0.05);
backdrop-filter: blur(16px) saturate(140%);
border: 1px solid rgba(255, 255, 255, 0.08);
box-shadow: 0 4px 30px rgba(0, 0, 0, 0.30);

/* Medium (cards, floating panels) */
background: rgba(255, 255, 255, 0.10);
backdrop-filter: blur(12px) saturate(180%) brightness(90%);
border: 1px solid rgba(255, 255, 255, 0.12);
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.40),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);

/* Emerald-tinted (Chrysaki accent panels) */
background: rgba(0, 180, 120, 0.08);
backdrop-filter: blur(20px) saturate(160%);
border: 1px solid rgba(0, 180, 120, 0.15);

/* Faded-edge toolbar */
background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
backdrop-filter: blur(16px) brightness(110%) saturate(120%);
mask-image: linear-gradient(to bottom, black 0%, black 70%, transparent 100%);
```

**Blur values by element:**
| Element | Blur |
|:--------|:-----|
| Command palette / modal | `blur(24px)` |
| Sidebar / panel | `blur(16-20px)` |
| Tab strip | `blur(12px)` |
| Tooltip / audio badge | `blur(6-8px)` |

**White tint alpha range**: 0.03–0.12. Above 0.15 looks milky on dark backgrounds.

### Geometry + Glass Coexistence

`clip-path` and `backdrop-filter` can coexist on the same element — no wrapper needed (this contradicts the Firefox Bug 1579957 limitation, which is Firefox userChrome-specific; in standard web CSS they work together).

```css
/* Hexagonal glass badge */
.hex-glass-badge {
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px) saturate(160%);
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
}

/* Chamfered glass panel (signature Chrysaki container) */
.chamfer-glass {
  --notch: 12px;
  clip-path: polygon(
    0% var(--notch), var(--notch) 0%,
    calc(100% - var(--notch)) 0%, 100% var(--notch),
    100% calc(100% - var(--notch)), calc(100% - var(--notch)) 100%,
    var(--notch) 100%, 0% calc(100% - var(--notch))
  );
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px) saturate(150%);
  filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.3));
}

/* Trapezoid glass tab */
.trapezoid-glass-tab {
  clip-path: polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%);
  background: rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(12px) saturate(140%);
}
```

**Borders on clipped elements** — `clip-path` clips borders off. Three approaches:

```css
/* Method 1: Wrapper as border (recommended) */
.border-wrapper {
  clip-path: polygon(...);      /* same shape */
  background: rgba(255,255,255,0.15);  /* border color */
  padding: 1px;                 /* border width */
}
.border-wrapper > .inner {
  clip-path: polygon(...);
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(16px) saturate(160%);
}

/* Method 2: drop-shadow (simpler, less precise) */
filter: drop-shadow(0 0 1px rgba(255, 255, 255, 0.3));

/* Method 3: ::before pseudo-element outline */
.glass-shape::before {
  content: '';
  position: absolute;
  inset: 0;
  clip-path: polygon(...);
  background: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05));
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  padding: 1px;
}
```

**Note for Firefox userChrome specifically** (Bug 1579957): `backdrop-filter` does NOT respect `clip-path` on the same element. Use the wrapper/child split pattern there only.

### OKLCH Gradient Softening

OKLCH gradients never pass through gray between jewel tones. Use `shorter hue` for adjacent tones, `longer hue` for rainbow arcs.

```css
/* Emerald -> Royal Blue (direct path) */
background: linear-gradient(in oklch shorter hue to right,
  oklch(0.55 0.15 155), oklch(0.45 0.18 265));

/* Emerald -> Amethyst (through blue) */
background: linear-gradient(in oklch shorter hue to right,
  oklch(0.55 0.15 155), oklch(0.50 0.16 310));

/* Full Chrysaki jewel spectrum */
background: linear-gradient(in oklch shorter hue to right,
  oklch(0.55 0.15 155),   /* emerald */
  oklch(0.45 0.18 265),   /* royal blue */
  oklch(0.50 0.16 310),   /* amethyst */
  oklch(0.55 0.12 195),   /* teal */
  oklch(0.75 0.14 85)     /* blonde */
);

/* Radial jewel glow (badge/icon bg) */
background: radial-gradient(in oklch circle at center,
  oklch(0.55 0.15 155 / 0.3),   /* emerald glow */
  oklch(0.15 0.02 155 / 0)      /* fade to transparent */
);
```

**OKLCH custom properties for glass tinting:**
```css
:root {
  --chrysaki-emerald-glass:    oklch(0.55 0.04 155 / 0.08);
  --chrysaki-blue-glass:       oklch(0.45 0.04 265 / 0.08);
  --chrysaki-amethyst-glass:   oklch(0.50 0.04 310 / 0.08);
  --chrysaki-teal-glass:       oklch(0.55 0.04 195 / 0.08);
}
```

### Clip-Path Morphing (Hover Transitions)

Polygons with the same point count are interpolable. Use this for hover/active states:

```css
/* Rectangle → Chamfered on hover (must match point count: 8 points each) */
.panel {
  clip-path: polygon(0% 0%, 0% 0%, 100% 0%, 100% 0%, 100% 100%, 100% 100%, 0% 100%, 0% 100%);
  transition: clip-path 0.25s ease-out;
}
.panel:hover {
  clip-path: polygon(
    0% 8px, 8px 0%, calc(100% - 8px) 0%, 100% 8px,
    100% calc(100% - 8px), calc(100% - 8px) 100%,
    8px 100%, 0% calc(100% - 8px)
  );
}
```

---

## Glow + Drop-Shadow Technique

For small icon jewel accents (audio playing indicator, container tab dots):
```css
filter: drop-shadow(0 0 4px var(--chrysaki-emerald-lt));
/* or */
filter: drop-shadow(0 0 3px rgba(26, 138, 106, 0.6));
```

---

*Research complete as of 2026-03-04. All three agents (firefox-researcher, vscode-researcher, geo-researcher) have reported.*

---

*Authored by: Clault KiperS 4.6*
