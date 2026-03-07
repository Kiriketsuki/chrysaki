#!/usr/bin/env bash
# Chrysaki tmux Help -- displayed via display-popup (Prefix + ?)
# Uses ANSI colors matching the Chrysaki palette

# Colors
EM='\033[38;2;26;138;106m'   # Emerald Lt  #1a8a6a
TL='\033[38;2;32;150;156m'   # Teal Lt     #20969c
AM='\033[38;2;88;48;144m'    # Amethyst Lt #583090
BL='\033[38;2;251;177;60m'   # Blonde      #FBB13C
PR='\033[38;2;224;226;234m'  # Primary     #e0e2ea
SC='\033[38;2;160;164;184m'  # Secondary   #a0a4b8
MT='\033[38;2;106;110;130m'  # Muted       #6a6e82
BD='\033[1m'                  # Bold
RS='\033[0m'                  # Reset

HR="${MT}$(printf '%.0s─' {1..58})${RS}"

printf "\n"
printf "${EM}${BD} ⬢  Chrysaki tmux -- Keybinding Reference ${RS}\n"
printf "${HR}\n"
printf "\n"

printf "${TL}${BD}  PREFIX KEY${RS}\n"
printf "${HR}\n"
printf "  ${PR}Ctrl + Space${RS}     ${SC}Arm tmux for a command (release, then press key)${RS}\n"
printf "  ${PR}Ctrl + Space  ?${RS}  ${SC}This help screen${RS}\n"
printf "  ${PR}Ctrl + Space  Space${RS}  ${SC}Command palette (interactive menu)${RS}\n"
printf "\n"

printf "${TL}${BD}  PANES  ${MT}(split sections inside a window)${RS}\n"
printf "${HR}\n"
printf "  ${PR}Prefix + \\\\${RS}        ${SC}Split pane right (vertical split)${RS}\n"
printf "  ${PR}Prefix + -${RS}         ${SC}Split pane below (horizontal split)${RS}\n"
printf "  ${PR}Prefix + Arrow${RS}     ${SC}Move focus to pane in that direction${RS}\n"
printf "  ${PR}Prefix + Ctrl+Arrow${RS} ${SC}Resize pane (hold Ctrl, tap arrow repeatedly)${RS}\n"
printf "  ${PR}Prefix + z${RS}         ${SC}Zoom pane to fullscreen / restore${RS}\n"
printf "  ${PR}Prefix + x${RS}         ${SC}Close pane (prompts for confirmation)${RS}\n"
printf "  ${PR}Prefix + q${RS}         ${SC}Show pane numbers briefly${RS}\n"
printf "\n"

printf "${TL}${BD}  WINDOWS  ${MT}(tabs, each with their own pane layout)${RS}\n"
printf "${HR}\n"
printf "  ${PR}Alt + 1-9${RS}          ${SC}Switch to window 1-9 directly (no prefix)${RS}\n"
printf "  ${PR}Prefix + 1-9${RS}       ${SC}Switch to window by number${RS}\n"
printf "  ${PR}Prefix + c${RS}         ${SC}New window (opens in current directory)${RS}\n"
printf "  ${PR}Prefix + n${RS}         ${SC}Next window${RS}\n"
printf "  ${PR}Prefix + p${RS}         ${SC}Previous window${RS}\n"
printf "  ${PR}Prefix + Tab${RS}       ${SC}Toggle between last two windows${RS}\n"
printf "  ${PR}Prefix + ,${RS}         ${SC}Rename current window${RS}\n"
printf "\n"

printf "${TL}${BD}  SESSIONS  ${MT}(persistent workspaces, survive disconnect)${RS}\n"
printf "${HR}\n"
printf "  ${PR}Prefix + s${RS}         ${SC}Session picker (tree view, arrow keys + Enter)${RS}\n"
printf "  ${PR}Prefix + d${RS}         ${SC}Detach from session (keeps it running)${RS}\n"
printf "  ${MT}tmux attach${RS}        ${SC}Re-attach to last session (from shell)${RS}\n"
printf "  ${MT}tmux new -s name${RS}   ${SC}Create named session (from shell)${RS}\n"
printf "  ${MT}tmux ls${RS}            ${SC}List all sessions (from shell)${RS}\n"
printf "\n"

printf "${TL}${BD}  COPY MODE  ${MT}(scroll through terminal history)${RS}\n"
printf "${HR}\n"
printf "  ${PR}Mouse scroll${RS}       ${SC}Enter copy mode automatically${RS}\n"
printf "  ${PR}Prefix + [${RS}         ${SC}Enter copy mode manually${RS}\n"
printf "  ${PR}/ (in copy mode)${RS}   ${SC}Search backward${RS}\n"
printf "  ${PR}q (in copy mode)${RS}   ${SC}Exit copy mode${RS}\n"
printf "  ${SC}Mouse drag to select text copies to clipboard automatically.${RS}\n"
printf "\n"

printf "${TL}${BD}  UTILITY${RS}\n"
printf "${HR}\n"
printf "  ${PR}Prefix + r${RS}         ${SC}Reload tmux config (after editing ~/.tmux.conf)${RS}\n"
printf "  ${PR}Prefix + :${RS}         ${SC}tmux command prompt (like a shell for tmux)${RS}\n"
printf "  ${PR}Prefix + t${RS}         ${SC}Show a clock in the current pane${RS}\n"
printf "\n"

printf "${TL}${BD}  MOUSE${RS}\n"
printf "${HR}\n"
printf "  ${SC}Click pane${RS}         ${MT}Focus that pane${RS}\n"
printf "  ${SC}Drag pane border${RS}   ${MT}Resize panes${RS}\n"
printf "  ${SC}Click window tab${RS}   ${MT}Switch to that window${RS}\n"
printf "  ${SC}Scroll wheel${RS}       ${MT}Scroll history (enters copy mode)${RS}\n"
printf "\n"

printf "${HR}\n"
printf "  ${MT}Press ${PR}q${MT} to close this help screen.${RS}\n\n"
