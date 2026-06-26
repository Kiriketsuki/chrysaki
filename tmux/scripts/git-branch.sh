#!/usr/bin/env bash
# git-branch.sh -- print current git branch for tmux status-right
# Usage: git-branch.sh <path>
# Prints nothing (silently) if not in a git repo.

dir="${1:-$PWD}"
width="${2:-200}"
branch=$(git -C "$dir" symbolic-ref --short HEAD 2>/dev/null) || \
branch=$(git -C "$dir" rev-parse --short HEAD 2>/dev/null) || exit 0
if [ "${width}" -lt 120 ] 2>/dev/null; then
    printf '%s' "$branch"
else
    printf ' %s' "$branch"
fi
