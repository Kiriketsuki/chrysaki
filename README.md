# Chrysaki

A dark-first, jewel-toned design system and theme suite. Hard geometric corners, tri-primary accent palette, and perceptually-uniform OKLCH colour engineering.

Ports for 16 applications across terminal, editor, desktop, and web categories.

---

## Palette

### Surfaces

| Name | Hex | Use |
|:-----|:----|:----|
| Abyss | `#0f1117` | Deepest background, modal backdrops |
| Base | `#161821` | Primary canvas |
| Surface | `#1c1f2b` | Cards, sidebars |
| Raised | `#252836` | Hover states, popups |
| Elevated | `#2e3142` | Tooltips, floating elements |
| Border | `#363a4f` | Dividers, input borders |

### Primary Accents (Tri-Primary)

| Name | Base | Light | Dim | Domain |
|:-----|:-----|:------|:----|:-------|
| Emerald | `#14664e` | `#1a8a6a` | `#0e4a38` | Growth, creation, links |
| Royal Blue | `#122858` | `#1c3d7a` | `#0c1a40` | Structure, navigation, depth |
| Amethyst | `#3a2068` | `#583090` | `#1e1040` | Creativity, identity, focus |

### Secondary Accents

| Name | Base | Light | Dim | Domain |
|:-----|:-----|:------|:----|:-------|
| Teal | `#197278` | `#20969c` | `#0f4f54` | Transitional, metadata, tags |
| Blonde | `#FBB13C` | `#FCC96A` | `#C4861C` | Emphasis, numbers, highlights |
| Error | `#8C2F39` | `#b53f4a` | `#5e1f25` | Errors, danger |

### Text

| Level | Hex |
|:------|:----|
| Primary | `#e0e2ea` |
| Secondary | `#a0a4b8` |
| Muted | `#6a6e82` |
| Inverse | `#0f1117` |

---

## Design Rules

- **Zero border-radius** throughout. Geometric alternatives: chamfer (`clip-path` 8px cuts), hexagonal (tags/badges), trapezoid (active tab indicators).
- **Royal Blue and Amethyst are fill colours only** — too dark for text on dark surfaces.
- **Safe text accents on dark**: Emerald Lt, Teal, Teal Lt, Blonde, Blonde Lt, Error.
- **Gradient direction**: Emerald always leads (leftmost / topmost).
- **Background hierarchy**: Editor is Base (#161821, lightest). Chrome (tab bar, activity bar) is Abyss (#0f1117, darkest). Everything in between uses Surface → Raised → Elevated.

---

## Ports

| App | Format | Path |
|:----|:-------|:-----|
| Alacritty | TOML | `alacritty/chrysaki.toml` |
| Windows Terminal | JSON scheme | `windows-terminal/chrysaki.json` |
| Kitty | conf | *(see vault documentation)* |
| tmux | `.tmux.conf` | *(see vault documentation)* |
| PowerShell | PSReadLine `.ps1` | `powershell/chrysaki-psreadline.ps1` |
| Neovim | Lua colorscheme | *(see vault documentation)* |
| VS Code | JSON theme | `vscode/chrysaki-color-theme.json` |
| Gitui | RON | *(see vault documentation)* |
| GTK 3/4 | CSS | *(see vault documentation)* |
| Discord | Vencord/BetterDiscord CSS | `discord/Chrysaki.theme.css` |
| Spotify | Spicetify | `spicetify/` |
| Firefox | userChrome + userContent | `firefox/` |
| Marp | CSS theme | *(see vault documentation)* |

---

## Installation

### VS Code

Copy `vscode/` to `~/.vscode/extensions/chrysaki-theme-1.0.0/`, then select **Chrysaki** via `Ctrl+Shift+P` → Color Theme.

### Windows Terminal

Paste the contents of `windows-terminal/chrysaki.json` into the `"schemes": [...]` array in your `settings.json`, then set `"colorScheme": "Chrysaki"` in your profile defaults.

### PowerShell

Dot-source `powershell/chrysaki-psreadline.ps1` in your `$PROFILE`:
```powershell
. "path\to\chrysaki-psreadline.ps1"
```

### Firefox

1. Enable `toolkit.legacyUserProfileCustomizations.stylesheets` in `about:config`
2. Copy `firefox/userChrome.css` and `firefox/userContent.css` to `<profile>/chrome/`
3. Restart Firefox

### Discord (Vencord)

Copy `discord/Chrysaki.theme.css` to `~/.config/Vencord/themes/` and enable in Vencord settings.

### Spotify (Spicetify)

```bash
mkdir -p ~/.config/spicetify/Themes/Chrysaki
cp spicetify/* ~/.config/spicetify/Themes/Chrysaki/
spicetify config current_theme Chrysaki
spicetify apply
```

---

## CSS Custom Properties

```css
--chrysaki-abyss:        #0f1117;
--chrysaki-base:         #161821;
--chrysaki-surface:      #1c1f2b;
--chrysaki-raised:       #252836;
--chrysaki-elevated:     #2e3142;
--chrysaki-border:       #363a4f;
--chrysaki-emerald:      #14664e;
--chrysaki-emerald-lt:   #1a8a6a;
--chrysaki-emerald-dim:  #0e4a38;
--chrysaki-blue:         #122858;
--chrysaki-blue-lt:      #1c3d7a;
--chrysaki-blue-dim:     #0c1a40;
--chrysaki-amethyst:     #3a2068;
--chrysaki-amethyst-lt:  #583090;
--chrysaki-amethyst-dim: #1e1040;
--chrysaki-teal:         #197278;
--chrysaki-teal-lt:      #20969c;
--chrysaki-teal-dim:     #0f4f54;
--chrysaki-blonde:       #FBB13C;
--chrysaki-blonde-lt:    #FCC96A;
--chrysaki-blonde-dim:   #C4861C;
--chrysaki-error:        #8C2F39;
--chrysaki-error-lt:     #b53f4a;
--chrysaki-error-dim:    #5e1f25;
--chrysaki-text:         #e0e2ea;
--chrysaki-text-sec:     #a0a4b8;
--chrysaki-text-muted:   #6a6e82;
--chrysaki-text-inverse: #0f1117;
```

---

*Part of the [obKidian](https://github.com/Kiriketsuki/obKidian) vault system.*
