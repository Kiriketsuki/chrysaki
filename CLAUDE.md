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
