# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Chrysaki is a dark-first design system and theme suite ported to 16 applications. There is no build system — every port is a standalone config file (CSS, TOML, JSON, Lua, RON, INI, conf). No compilation, no tests, no linting pipeline.

## Palette Reference

### Surfaces (dark → light)
| Token | Hex | Role |
|:------|:----|:-----|
| Abyss | `#0f1117` | Deepest background, chrome (activity bar, status bar) |
| Base | `#161821` | Primary editor canvas |
| Surface | `#1c1f2b` | Cards, sidebars |
| Raised | `#252836` | Hover states, active window blocks |
| Elevated | `#2e3142` | Tooltips, floating elements |
| Border | `#363a4f` | Dividers, input borders |

### Tri-Primary Accents
| Token | Base | Light | Dim |
|:------|:-----|:------|:----|
| Emerald | `#14664e` | `#1a8a6a` | `#0e4a38` |
| Royal Blue | `#122858` | `#1c3d7a` | `#0c1a40` |
| Amethyst | `#3a2068` | `#583090` | `#1e1040` |

### Secondary Accents
| Token | Base | Light | Dim |
|:------|:-----|:------|:----|
| Teal | `#197278` | `#20969c` | `#0f4f54` |
| Blonde | `#FBB13C` | `#FCC96A` | `#C4861C` |
| Error | `#8C2F39` | `#b53f4a` | `#5e1f25` |

### Text
| Level | Hex |
|:------|:----|
| Primary | `#e0e2ea` |
| Secondary | `#a0a4b8` |
| Muted | `#6a6e82` |

## Design Rules (non-negotiable)

- **Zero border-radius** — use geometric alternatives only: chamfered (`clip-path` 8px cuts), hexagonal (badges/tags), trapezoid (active tab indicators)
- **Royal Blue and Amethyst are fill colors only** — both are too dark for text on dark surfaces. Never use as foreground text.
- **Safe text accents on dark**: Emerald Lt, Teal, Teal Lt, Blonde, Blonde Lt, Error
- **Gradient direction**: Emerald always leads (leftmost / topmost)
- **Background hierarchy**: Editor is Base (`#161821`, lightest visible surface). Chrome (tab bar, activity bar) is Abyss (`#0f1117`, darkest). Everything between uses Surface → Raised → Elevated
- **OKLCH gradients**: Use `shorter hue` for adjacent jewel tones, `longer hue` for rainbow arcs. OKLCH never passes through gray between jewel tones.

## Geometric Shape Library (clip-path values)

```css
/* Chamfered rectangle — primary container shape */
clip-path: polygon(8px 0%, calc(100% - 8px) 0%, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0% calc(100% - 8px), 0% 8px);

/* Trapezoid — active browser tabs */
clip-path: polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%);

/* Hexagon flat-top — badges, status indicators */
clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);

/* Hexagon pointy-top — tag chips */
clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);

/* Parallelogram — tab badges, accent bars */
clip-path: polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%);

/* Chevron — breadcrumb segments */
clip-path: polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%, 15% 50%);
```

## Tiling System

Trapezoid segments tile by edge-type propagation. Three edge types: `|` (straight), `/` (forward), `\` (back).

```
tile(first_left, first_right, N):
  Element 1:   (first_left, first_right)          — or (first_left, |) if N=1
  Element i:   (prev.right, opposite(prev.right))  — middle elements
  Element N:   (prev.right, |)                    — last always terminates with |
opposite(/) = \,  opposite(\) = /,  opposite(|) = |
```

Default preset: `zigzag-alt` `(|,\)` — used by tmux port. Other presets: `zigzag` `(|,/)`, `chevron` `(/,/)`, `flat` `(|,|)`.

**Overlap defaults:**

| Renderer | Inset | Overlap mechanism |
|:---------|:------|:------------------|
| CSS | 16px | `margin-left: -16px` on all except first |
| Terminal | glyph-native | Nerd Font glyphs are single-cell |

Full spec: [`TILING.md`](TILING.md) · Generator: [`tools/tiling.py`](tools/tiling.py)

## Glassmorphism (v2 direction)

Standard dark-glass stack (use `saturate()` to preserve jewel tone saturation through blur):

```css
background: rgba(255, 255, 255, 0.05);
backdrop-filter: blur(16px) saturate(140%);
border: 1px solid rgba(255, 255, 255, 0.08);
box-shadow: 0 4px 30px rgba(0, 0, 0, 0.30);
```

White tint alpha range: **0.03–0.12**. Above 0.15 looks milky on dark backgrounds.

**Firefox Bug 1579957**: `backdrop-filter` does NOT respect `clip-path` on the same element in userChrome CSS. Split into wrapper (carries `clip-path`) + inner child (carries `backdrop-filter`). In standard web CSS they can coexist on the same element.

**Borders on clipped elements**: `clip-path` clips borders off. Preferred fix: wrapper element with same shape + 1px padding as border color.

## Per-Port Notes

### tmux (`tmux/chrysaki.conf`)
- Requires **IosevkaTermSlab Nerd Font** for powerline glyphs (U+E0B0, U+E0B2) and `⬢` badge
- Prefix feedback: session badge turns Blonde when `client_prefix` is active
- Status bar: Abyss bg → Surface for right info shelf → Raised for time block
- Window list uses `zigzag-alt` tiling preset (`|,\` lead); see `TILING.md` for the full edge algebra and `tools/tiling.py` to generate or validate sequences

### VSCode (`vscode/`)
- Theme JSON: `vscode/chrysaki-color-theme.json`
- Workbench CSS: `vscode/chrysaki-workbench.css` — injected via Custom CSS and JS Loader (`be5invis.vscode-custom-css`)
- `editor.background` does not support alpha — always opaque. All other chrome elements do.
- True glassmorphism requires **Vibrancy Continued** extension (`illixion.vscode-vibrancy-continued`)

### Firefox (`firefox/`)
- Requires `toolkit.legacyUserProfileCustomizations.stylesheets = true` in `about:config`
- Glassmorphism requires `layout.css.backdrop-filter.enabled = true` and `gfx.webrender.all = true`

### Neovim (`nvim/chrysaki.lua`)
- Install to `~/.config/nvim/colors/chrysaki.lua`, activate with `vim.cmd("colorscheme chrysaki")`

### Spicetify (`spicetify/`)
- Two files required: `color.ini` + `user.css`

## Port Map

| Category | App | File |
|:---------|:----|:-----|
| Terminal | Alacritty | `alacritty/chrysaki.toml` |
| Terminal | Kitty | `kitty/theme.conf` |
| Terminal | Windows Terminal | `windows-terminal/chrysaki.json` |
| Terminal | tmux | `tmux/chrysaki.conf` |
| Terminal | PowerShell | `powershell/chrysaki-psreadline.ps1` |
| Editor | Neovim | `nvim/chrysaki.lua` |
| Editor | VS Code | `vscode/chrysaki-color-theme.json` + `vscode/chrysaki-workbench.css` |
| Editor | Gitui | `gitui/theme.ron` |
| Desktop | GTK 3/4 | `gtk/gtk.css` + `gtk/settings.ini` |
| Desktop | Steam | `steam/libraryroot.custom.css` |
| Desktop | Discord | `discord/Chrysaki.theme.css` |
| Desktop | Spotify | `spicetify/color.ini` + `spicetify/user.css` |
| Web | Firefox | `firefox/userChrome.css` + `firefox/userContent.css` |
| Docs | Marp | `marp/chrysaki.css` |
| Tool | Color converter | `tools/color-converter.html` |
| Tool | Tiling generator | `tools/tiling.py` |

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **chrysaki-ralph-ags-notification-center-T3** (88 symbols, 101 relationships, 6 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/chrysaki-ralph-ags-notification-center-T3/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/chrysaki-ralph-ags-notification-center-T3/context` | Codebase overview, check index freshness |
| `gitnexus://repo/chrysaki-ralph-ags-notification-center-T3/clusters` | All functional areas |
| `gitnexus://repo/chrysaki-ralph-ags-notification-center-T3/processes` | All execution flows |
| `gitnexus://repo/chrysaki-ralph-ags-notification-center-T3/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## CLI

- Re-index: `npx gitnexus analyze`
- Check freshness: `npx gitnexus status`
- Generate docs: `npx gitnexus wiki`

<!-- gitnexus:end -->

---

## Design Context

### Users
Single power user (the author) running a Hyprland/Wayland desktop on Arch Linux. Every Chrysaki port — bar, editor, browser, terminal — is part of a unified desktop experience glanced at constantly while working across multiple workspaces. The job to be done is quick situational awareness and aesthetic cohesion across all applications.

### Brand Personality
**Jeweled · Modern · Geometric.**
Chrysaki should feel like a precision instrument made of dark glass and gemstones. It is not minimal — it has visual presence — but it is never cluttered. Every element earns its place.

### Anti-References
- **Flat Material Design** — too sterile, no depth, no personality. Chrysaki has dimension and texture.
- **Rounded corners** — the zero border-radius rule is non-negotiable. Use chamfered, hexagonal, or trapezoid shapes instead.

### Aesthetic Direction (all ports)
- Dark surfaces with jewel-tone accent segments that pop against the Abyss background
- Icons precede every text label (Nerd Font glyphs) — bare text labels are not acceptable
- Accent colors use **light variants** (`$emerald-light`, `$teal-light`, `$blonde-light`) for text — never dim variants as foreground
- Segment backgrounds use higher alpha (0.6–0.8) so jewel tones are clearly distinguishable from each other
- Geometric shapes rendered via the best available method per platform: CSS `clip-path` for web/browser, Cairo DrawingArea for GTK4/AGS, Nerd Font glyphs for terminal

### Aesthetic Direction (bar — AGS/GTK4)
- Three-island layout: **Left** (battery + clock + active window), **Center** (floating workspace island), **Right** (media + volume + network + tray + services + power)
- Workspace island uses the **zigzag-alt `(|,\)`** tiling preset and shows **only occupied + active workspaces** (not all 10)
- Workspace pips are **flat-top hexagons** via Cairo DrawingArea, matching the badge/status shape in the design system
- Bar height: **40px** — enough room for hex pips and icons to breathe
- Segment edges use Cairo-drawn trapezoid separators (GTK4 does not support CSS `clip-path`)

### Design Principles
1. **Jewel tones are the signal, not the noise** — accent segment backgrounds must be visibly distinct from each other and from the Abyss ground. Use 0.6+ alpha on dim-variant backgrounds, or switch to mid-variant.
2. **Icons are mandatory** — every data label (clock, battery, network, media) must have a Nerd Font glyph prefix. Text-only is never finished.
3. **Only show what exists** — workspace pips render only for occupied and active workspaces; empty workspaces are invisible. Presence implies activity.
4. **Geometric shapes carry meaning** — hexagons for status indicators (pips, dots), parallelograms for tab/badge elements, trapezoids for segment boundaries. Shape consistency is part of the language.
5. **Three islands, clear hierarchy** — Left anchors context (who am I, what time), Center anchors position (where am I), Right anchors environment (what's running). Never collapse these zones.
6. **Dark glass, not flat panels** — where the platform supports it, use glassmorphism: `backdrop-filter: blur(16px) saturate(140%)` with white tint at 0.03–0.12 alpha. Surfaces should feel like tinted glass over a dark void, not opaque rectangles. Ports that cannot do backdrop-filter (terminal, GTK4) should approximate depth with layered surface tokens instead.
