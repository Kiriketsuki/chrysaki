# Chrysaki

![Version](https://img.shields.io/badge/version-1.1.0-20969c?style=flat-square&labelColor=252836&logo=semanticrelease&logoColor=20969c)
![Ports](https://img.shields.io/badge/ports-16-1a8a6a?style=flat-square&labelColor=252836&logo=github&logoColor=1a8a6a)
![License](https://img.shields.io/badge/license-MIT-FBB13C?style=flat-square&labelColor=252836&logo=opensourceinitiative&logoColor=FBB13C)

A dark-first, jewel-toned design system and theme suite. Hard geometric corners, tri-primary accent palette, and perceptually-uniform OKLCH colour engineering.

Ports for 16 applications across terminal, editor, desktop, and web categories — inspired by the porting methodology of Rosé Pine. A consistent palette-first approach where every application maps the same named colour tokens to its own theming API.

---

## Palette

### Surfaces

| Token | Hex | Swatch | Use |
|:------|:----|:-------|:----|
| Abyss | `#0f1117` | ![](https://via.placeholder.com/15/0f1117/0f1117?text=+) | Deepest background, modal backdrops |
| Base | `#161821` | ![](https://via.placeholder.com/15/161821/161821?text=+) | Primary canvas |
| Surface | `#1c1f2b` | ![](https://via.placeholder.com/15/1c1f2b/1c1f2b?text=+) | Cards, sidebars |
| Raised | `#252836` | ![](https://via.placeholder.com/15/252836/252836?text=+) | Hover states, popups |
| Elevated | `#2e3142` | ![](https://via.placeholder.com/15/2e3142/2e3142?text=+) | Tooltips, floating elements |
| Border | `#363a4f` | ![](https://via.placeholder.com/15/363a4f/363a4f?text=+) | Dividers, input borders |

### Primary Accents (Tri-Primary)

| Token | Base | Light | Dim | Domain |
|:------|:-----|:------|:----|:-------|
| Emerald | `#14664e` ![](https://via.placeholder.com/10/14664e/14664e?text=+) | `#1a8a6a` ![](https://via.placeholder.com/10/1a8a6a/1a8a6a?text=+) | `#0e4a38` ![](https://via.placeholder.com/10/0e4a38/0e4a38?text=+) | Growth, creation, links |
| Royal Blue | `#122858` ![](https://via.placeholder.com/10/122858/122858?text=+) | `#1c3d7a` ![](https://via.placeholder.com/10/1c3d7a/1c3d7a?text=+) | `#0c1a40` ![](https://via.placeholder.com/10/0c1a40/0c1a40?text=+) | Structure, navigation, depth |
| Amethyst | `#3a2068` ![](https://via.placeholder.com/10/3a2068/3a2068?text=+) | `#583090` ![](https://via.placeholder.com/10/583090/583090?text=+) | `#1e1040` ![](https://via.placeholder.com/10/1e1040/1e1040?text=+) | Creativity, identity, focus |

### Secondary Accents

| Token | Base | Light | Dim | Domain |
|:------|:-----|:------|:----|:-------|
| Teal | `#197278` ![](https://via.placeholder.com/10/197278/197278?text=+) | `#20969c` ![](https://via.placeholder.com/10/20969c/20969c?text=+) | `#0f4f54` ![](https://via.placeholder.com/10/0f4f54/0f4f54?text=+) | Transitional, metadata, tags |
| Blonde | `#FBB13C` ![](https://via.placeholder.com/10/FBB13C/FBB13C?text=+) | `#FCC96A` ![](https://via.placeholder.com/10/FCC96A/FCC96A?text=+) | `#C4861C` ![](https://via.placeholder.com/10/C4861C/C4861C?text=+) | Emphasis, numbers, highlights |
| Error | `#8C2F39` ![](https://via.placeholder.com/10/8C2F39/8C2F39?text=+) | `#b53f4a` ![](https://via.placeholder.com/10/b53f4a/b53f4a?text=+) | `#5e1f25` ![](https://via.placeholder.com/10/5e1f25/5e1f25?text=+) | Errors, danger |

### Text

| Level | Hex | Swatch |
|:------|:----|:-------|
| Primary | `#e0e2ea` | ![](https://via.placeholder.com/15/e0e2ea/e0e2ea?text=+) |
| Secondary | `#a0a4b8` | ![](https://via.placeholder.com/15/a0a4b8/a0a4b8?text=+) |
| Muted | `#6a6e82` | ![](https://via.placeholder.com/15/6a6e82/6a6e82?text=+) |
| Inverse | `#0f1117` | ![](https://via.placeholder.com/15/0f1117/0f1117?text=+) |

---

## Design Rules

- **Zero border-radius** throughout. Geometric alternatives: chamfer (`clip-path` 8px cuts), hexagonal (tags/badges), trapezoid (active tab indicators).
- **Royal Blue and Amethyst are fill colours only** — too dark for text on dark surfaces.
- **Safe text accents on dark**: Emerald Lt, Teal, Teal Lt, Blonde, Blonde Lt, Error.
- **Gradient direction**: Emerald always leads (leftmost / topmost).
- **Background hierarchy**: Editor is Base (`#161821`, lightest). Chrome (tab bar, activity bar) is Abyss (`#0f1117`, darkest). Everything in between uses Surface → Raised → Elevated.

---

## Ports

### Terminal Emulators and Shell

| App | Config Format | File |
|:----|:-------------|:-----|
| Alacritty | TOML | [`alacritty/chrysaki.toml`](alacritty/chrysaki.toml) |
| Kitty | INI conf | [`kitty/theme.conf`](kitty/theme.conf) |
| Windows Terminal | JSON scheme | [`windows-terminal/chrysaki.json`](windows-terminal/chrysaki.json) |
| tmux | `.tmux.conf` | [`tmux/chrysaki.conf`](tmux/chrysaki.conf) |
| PowerShell | PSReadLine `.ps1` | [`powershell/chrysaki-psreadline.ps1`](powershell/chrysaki-psreadline.ps1) |

### Editors and Developer Tools

| App | Config Format | File |
|:----|:-------------|:-----|
| Neovim | Lua colorscheme | [`nvim/chrysaki.lua`](nvim/chrysaki.lua) |
| VS Code | JSON theme | [`vscode/chrysaki-color-theme.json`](vscode/chrysaki-color-theme.json) |
| Gitui | RON theme | [`gitui/theme.ron`](gitui/theme.ron) |

### Desktop and System

| App | Config Format | File |
|:----|:-------------|:-----|
| GTK 3/4 | CSS + settings.ini | [`gtk/gtk.css`](gtk/gtk.css), [`gtk/settings.ini`](gtk/settings.ini) |
| Steam / SteamOS | CSS injection | [`steam/libraryroot.custom.css`](steam/libraryroot.custom.css) |
| Discord | Vencord/BetterDiscord CSS | [`discord/Chrysaki.theme.css`](discord/Chrysaki.theme.css) |
| Spotify | Spicetify color.ini + CSS | [`spicetify/color.ini`](spicetify/color.ini), [`spicetify/user.css`](spicetify/user.css) |

### Web and Documentation

| App | Config Format | File |
|:----|:-------------|:-----|
| Firefox | userChrome + userContent | [`firefox/userChrome.css`](firefox/userChrome.css), [`firefox/userContent.css`](firefox/userContent.css) |
| Marp | CSS theme | [`marp/chrysaki.css`](marp/chrysaki.css) |

---

## Installation

### VS Code

Copy the `vscode/` folder to `~/.vscode/extensions/chrysaki-theme-1.0.0/`, then select **Chrysaki** via `Ctrl+K Ctrl+T`.

### Windows Terminal

Add the contents of `windows-terminal/chrysaki.json` to the `"schemes": [...]` array in your `settings.json`, then set `"colorScheme": "Chrysaki"` in your profile defaults.

### PowerShell

Dot-source the script in your `$PROFILE`:
```powershell
. "path\to\chrysaki-psreadline.ps1"
```

### Kitty

Save `kitty/theme.conf` to `~/.config/kitty/theme.conf`, then add to `kitty.conf`:
```conf
include theme.conf
```

### tmux

Append `tmux/chrysaki.conf` to `~/.tmux.conf`, or source it:
```bash
source-file ~/.tmux/chrysaki.conf
```

### Neovim

Copy `nvim/chrysaki.lua` to `~/.config/nvim/colors/chrysaki.lua`, then:
```lua
vim.cmd("colorscheme chrysaki")
```

### Gitui

Copy `gitui/theme.ron` to `~/.config/gitui/theme.ron`. Gitui loads it automatically.

### GTK

```bash
mkdir -p ~/.config/gtk-3.0 ~/.config/gtk-4.0
cp gtk/gtk.css ~/.config/gtk-3.0/gtk.css
cp gtk/gtk.css ~/.config/gtk-4.0/gtk.css
cp gtk/settings.ini ~/.config/gtk-3.0/settings.ini
```

Log out and back in for changes to take effect.

### Steam / SteamOS

Copy `steam/libraryroot.custom.css` to the Steam UI directory:
- Linux/SteamOS: `~/.steam/steam/steamui/libraryroot.custom.css`
- Windows: `C:/Program Files (x86)/Steam/steamui/libraryroot.custom.css`

Restart Steam.

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
spicetify config color_scheme Base
spicetify apply
```

### Marp

```bash
marp --theme marp/chrysaki.css input.md
```

Or in VS Code with the Marp extension, add to `.vscode/settings.json`:
```json
{
    "markdown.marp.themes": ["./marp/chrysaki.css"]
}
```

---

## CSS Custom Properties

Drop these into any CSS project to use Chrysaki tokens:

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
