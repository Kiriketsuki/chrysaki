# Tmux Rice — Zigzag Status Bar + fzf Command Palette

## Situation
Implementing Chrysaki tmux theme enhancements on `feat/tmux-rice`.
Two features completed: zigzag tessellation on left-side status bar windows,
and a fzf floating command palette on `Prefix+Space`. Dotfiles symlink
infrastructure also fixed this session.

## Current State
- Branch: `feat/tmux-rice`
- Uncommitted: `vscode/chrysaki-workbench.css` (pre-existing, unrelated to tmux work), `CLAUDE.md` (new, untracked)
- Tests: none (no build system)
- What works:
  - Zigzag window tabs: even=`\___/`, odd=`/___\`, last=`*___|`
  - Session badge right edge = E0B0 (straight, not diagonal — E0BC caused height overflow)
  - `renumber-windows on` added to chrysaki.conf
  - `git-branch.sh` created and working (shows branch in status-right)
  - fzf palette: 53 entries, tab-delimited, Chrysaki colors, heavy Emerald popup border
  - All `~/.tmux*` → Chrysaki repo symlinks set up
  - `~/dots/bootstrap.sh` updated: added `tmux` to package list + section 7b for Chrysaki symlinks
- What's incomplete:
  - User reported "can't type" in fzf popup — unconfirmed whether fixed after symlink repair
  - `vscode/chrysaki-workbench.css` changes uncommitted (pre-existing, not this session's work)

## Key Files
- `tmux/chrysaki.conf` — theme: zigzag format strings, colors, status bar
- `tmux/tmux.conf` — keybindings: `Prefix+Space` → palette, `Prefix+w` smart close, etc.
- `tmux/scripts/palette.sh` — fzf palette script (53 entries, temp-file executor)
- `tmux/scripts/git-branch.sh` — git branch display for status-right
- `tmux/help.sh` — existing help popup (Prefix+?)
- `~/dots/bootstrap.sh` — dotfiles bootstrap; section 7b has Chrysaki symlink logic

## Decisions Made
- **E0B0 not E0BC for session badge right edge** — E0BC (`\` diagonal) caused visible height overflow on the session badge. Kept as E0B0 (straight powerline arrow). Only window tabs use E0BC/E0B8.
- **Even/odd formula uses `(window_index - 1) % 2`** — user has `base-index 1`, so raw `window_index % 2` gives wrong alternation. Subtracting 1 normalises it.
- **is_last uses `window_index == session_windows`** — correct for base-index=1. The old `session_windows - 1` formula was wrong (off-by-one).
- **Temp-file executor in palette.sh** — `tmux run-shell -b "tmux $CMD"` breaks on commands with nested quotes. Writing `tmux $CMD` to a temp file and `sh`-ing it handles all quoting correctly.
- **source-file didn't apply long format strings** — root cause was stale `~/.tmux/chrysaki.conf` (regular file, not symlink). Fixed by symlinking `~/.tmux/chrysaki.conf` → repo. `source-file` now works reliably.
- **Symlinks not in dots/stow** — tmux config lives in Chrysaki repo (not dots). Added explicit `ln -sf` section to bootstrap.sh rather than a stow package.

## Failed Approaches
- **E0BC for session badge right edge** — visually overflows the badge height. Reverted to E0B0.
- **`set-option` via `source-file`** — initially thought source-file was broken for long strings. Actually it was the stale installed file. Direct `set-option` via Python subprocess was a workaround, not the fix.
- **`window_index % 2` for even/odd** — wrong when `base-index=1`. First window (index 1) came out ODD, getting `/` left edge instead of `\`.
- **`session_windows - 1` for is_last** — wrong for base-index=1. Last window index = N = session_windows, not N-1.

## Active Constraints
- `base-index 1` is set in user's tmux.conf — all index math must account for this
- No build system — every file is standalone config, no compilation
- IosevkaTermSlab Nerd Font required for glyphs (E0B0, E0B8, E0BC, ⬢)
- Zero border-radius rule — no rounded corners anywhere in Chrysaki
- Royal Blue and Amethyst are fill-only colors — never use as text fg on dark surfaces
- Chrysaki CLAUDE.md at `tmux/` dir level has full palette and design rules

## Next Steps
1. Verify fzf palette typing works after symlink fix — user to confirm `Prefix+Space` opens interactive fzf
2. If typing still broken: check if fzf exits immediately (popup closes) vs shows but ignores keys. If exits: try adding `< /dev/tty` redirect or switching to process substitution `< <(printf '%s\n' "$ENTRIES")` in `palette.sh:62`
3. Decide whether to merge `feat/tmux-rice` → `main` or keep iterating
4. `vscode/chrysaki-workbench.css` has uncommitted changes — check with user what those are before committing

## Open Questions
- Does the fzf palette accept typing after the symlink fix? User hadn't confirmed at handoff time.
- Should `Prefix+Space` palette also include a "fuzzy find file" or pane-specific actions, or is 53 entries enough?
