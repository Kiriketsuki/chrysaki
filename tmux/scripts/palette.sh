#!/usr/bin/env bash
# palette.sh -- Chrysaki fzf command palette
# Bound to: Prefix + Space
# Protocol: LABEL<TAB>COMMAND -- fzf shows only the label column.
#            On selection, command is written to a temp file and run
#            via `tmux run-shell -b` so the popup closes first.

set -euo pipefail

if ! command -v fzf &>/dev/null; then
  tmux display-message " palette: fzf not found -- pacman -S fzf"
  exit 1
fi

ENTRIES=$(cat <<'EOF'
Split pane right	split-window -h -c "#{pane_current_path}"
Split pane below	split-window -v -c "#{pane_current_path}"
Zoom / Unzoom pane (toggle fullscreen)	resize-pane -Z
Show pane numbers	display-panes
Focus pane left	select-pane -L
Focus pane right	select-pane -R
Focus pane above	select-pane -U
Focus pane below	select-pane -D
Resize pane left	resize-pane -L 5
Resize pane right	resize-pane -R 5
Resize pane up	resize-pane -U 5
Resize pane down	resize-pane -D 5
Break pane into new window	break-pane
Join pane from another window	command-prompt -p "Join from window:" "join-pane -s '%%'"
Rotate panes in window	rotate-window
Swap pane with next	swap-pane -D
Swap pane with previous	swap-pane -U
Kill current pane	kill-pane
Respawn pane (restart shell)	respawn-pane -k
Clear pane scrollback history	clear-history
Synchronize panes (type to all)	set-window-option synchronize-panes on
Unsynchronize panes	set-window-option synchronize-panes off
Pipe pane output to file	command-prompt -p "Log to file:" "pipe-pane -o 'cat >> %%'"
Stop piping pane output	pipe-pane
Layout: even horizontal	select-layout even-horizontal
Layout: even vertical	select-layout even-vertical
Layout: main horizontal	select-layout main-horizontal
Layout: main vertical	select-layout main-vertical
Layout: tiled	select-layout tiled
New window (current directory)	new-window -c "#{pane_current_path}"
Next window	next-window
Previous window	previous-window
Toggle last window	last-window
Rename current window	command-prompt -I "#W" "rename-window '%%'"
Find window by name	command-prompt -p "Find window:" "find-window -N '%%'"
Move window to index	command-prompt -p "Move to index:" "move-window -t '%%'"
Kill current window	confirm-before -p "Kill window? (y/n)" kill-window
Session picker (tree view)	choose-tree -Zs
Window picker (tree view)	choose-tree -Zw
New session	command-prompt -p "Session name:" "new-session -s '%%'"
Rename current session	command-prompt -I "#S" "rename-session '%%'"
Switch to session by name	command-prompt -p "Session name:" "switch-client -t '%%'"
Detach from session	detach-client
Kill current session	confirm-before -p "Kill session? (y/n)" kill-session
Enter copy mode	copy-mode
Enter copy mode and search	copy-mode ; send-keys /
Show clock	clock-mode
Show all keybindings	list-keys
Show tmux messages / log	show-messages
Show environment variables	show-environment
Open tmux command prompt	command-prompt
Reload tmux config	source-file ~/.tmux.conf
Help popup	display-popup -E -T " ⬢  Chrysaki tmux Help " -h 90% -w 62 "~/.tmux/help.sh | less -R"
EOF
)

SELECTED=$(printf '%s\n' "$ENTRIES" \
  | fzf \
      --ansi \
      --delimiter=$'\t' \
      --with-nth=1 \
      --layout=reverse \
      --border=sharp \
      --border-label=" \u2b22  Chrysaki Commands " \
      --border-label-pos=3 \
      --padding=0,1 \
      --prompt=" \u276f  " \
      --pointer="\u258c" \
      --marker="  " \
      --header=" \u2191\u2193 navigate  \u23ce execute  esc cancel" \
      --header-first \
      --color="dark" \
      --color="bg:#0f1117,bg+:#252836" \
      --color="fg:#a0a4b8,fg+:#e0e2ea" \
      --color="hl:#1a8a6a,hl+:#1a8a6a" \
      --color="border:#363a4f,label:#1a8a6a" \
      --color="prompt:#FBB13C,pointer:#FBB13C" \
      --color="header:#6a6e82,query:#e0e2ea,gutter:#0f1117" \
      --no-sort \
  2>/dev/null) || exit 0

COMMAND=$(printf '%s' "$SELECTED" | cut -f2-)
[[ -z "$COMMAND" ]] && exit 0

# Write to temp file so the popup closes before the command executes
tmp=$(mktemp /tmp/tmux-palette-XXXXXX.sh)
printf 'tmux %s\n' "$COMMAND" > "$tmp"
tmux run-shell -b "sh '$tmp'; rm -f '$tmp'"
