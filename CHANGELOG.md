# Changelog

All notable changes to the Chrysaki theme suite are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.1.0] — 2026-03-03

### Added

- `kitty/theme.conf` — Kitty terminal theme (INI format, 16-slot ANSI mapping)
- `tmux/chrysaki.conf` — tmux status bar, pane border, and mode styling
- `nvim/chrysaki.lua` — Neovim Lua colorscheme with TreeSitter highlight groups
- `gitui/theme.ron` — Gitui RON theme (diff, commit log, gauge, branch colours)
- `marp/chrysaki.css` — Marp presentation theme with title, invert, and split layout variants
- `gtk/gtk.css` — GTK 3/4 CSS overrides for Adwaita-dark base
- `gtk/settings.ini` — GTK settings file (Papirus-Dark icons, Inter font)
- `steam/libraryroot.custom.css` — Steam client CSS injection for library and store UI

### Changed

- `README.md` — Full port index with direct file links, colour swatches, and per-app installation steps
- Version badge added to README header

---

## [1.0.0] — 2026-03-03

### Added

- Initial release of the Chrysaki theme suite
- Palette defined: Surfaces (Abyss through Border), Tri-Primary accents (Emerald, Royal Blue, Amethyst), Secondary accents (Teal, Blonde, Error), Text roles
- `alacritty/chrysaki.toml` — Alacritty TOML theme
- `windows-terminal/chrysaki.json` — Windows Terminal JSON colour scheme
- `powershell/chrysaki-psreadline.ps1` — PSReadLine syntax colours for PowerShell
- `vscode/chrysaki-color-theme.json` + `vscode/package.json` — VS Code extension theme
- `discord/Chrysaki.theme.css` — Vencord/BetterDiscord CSS theme
- `spicetify/color.ini` + `spicetify/user.css` — Spicetify theme for Spotify
- `firefox/userChrome.css` + `firefox/userContent.css` — Firefox chrome and content theme
- `tools/color-converter.html` — Interactive hex to OKLCH converter
- `README.md` — Palette reference, design rules, and installation instructions
