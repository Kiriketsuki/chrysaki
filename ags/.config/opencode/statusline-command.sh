#!/usr/bin/env bash
# OpenCode tmux statusline — queries SQLite for active session stats
# Usage: add to tmux status-right: #(~/.config/opencode/statusline-command.sh)

set -euo pipefail

DB="$HOME/.local/share/opencode/opencode.db"

if [[ ! -f "$DB" ]]; then
  echo ""
  exit 0
fi

FIVE_MIN_AGO=$(( $(date +%s) * 1000 - 300000 ))

IFS='|' read -r model time_created total_cost total_input total_output total_reasoning total_tokens < <(
  sqlite3 -separator '|' "$DB" "
    SELECT COALESCE(json_extract(s.model, '\$.id'), 'unknown'),
           s.time_created,
           COALESCE(SUM(json_extract(m.data, '\$.cost')), 0),
           COALESCE(SUM(json_extract(m.data, '\$.tokens.input')), 0),
           COALESCE(SUM(json_extract(m.data, '\$.tokens.output')), 0),
           COALESCE(SUM(json_extract(m.data, '\$.tokens.reasoning')), 0),
           COALESCE(SUM(json_extract(m.data, '\$.tokens.total')), 0)
    FROM session s
    LEFT JOIN message m ON m.session_id = s.id AND json_extract(m.data, '\$.role') = 'assistant'
    WHERE s.time_updated > $FIVE_MIN_AGO
    GROUP BY s.id
    ORDER BY s.time_updated DESC
    LIMIT 1
  " 2>/dev/null
) || true

if [[ -z "${model:-}" ]]; then
  echo ""
  exit 0
fi

# Model context limits (tokens)
declare -A CTX_LIMITS=(
  [claude-sonnet-4-6]=200000
  [claude-opus-4-6]=200000
  [claude-opus-4-6-1m]=1000000
  [claude-haiku-4-5]=200000
  [deepseek-v4-pro]=1000000
  [deepseek-v3]=131072
  [gpt-5.4]=200000
  [gpt-4.1]=1047576
  [gpt-4o]=128000
  [o4-mini]=200000
  [gemini-2.5-pro]=1048576
  [gemini-2.5-flash]=1048576
)

short_model="${model##*/}"
case "$short_model" in
  claude-sonnet-4-6) short_model="sonnet-4.6" ;;
  claude-opus-4-6)   short_model="opus-4.6" ;;
  claude-haiku-4-5)  short_model="haiku-4.5" ;;
  deepseek-v4-pro)   short_model="ds-v4-pro" ;;
  gpt-5.4*)          short_model="gpt-5.4" ;;
  gemini-2.5-pro*)   short_model="gem-2.5p" ;;
  gemini-2.5-flash*) short_model="gem-2.5f" ;;
esac

# Context window %
ctx_limit="${CTX_LIMITS[${model##*/}]:-0}"
if (( ctx_limit > 0 && total_tokens > 0 )); then
  ctx_pct=$(( total_tokens * 100 / ctx_limit ))
  (( ctx_pct > 100 )) && ctx_pct=100
  ctx_display="${ctx_pct}%"
else
  ctx_display="--"
fi

# Cost
cost_display=$(awk "BEGIN { printf \"\$%.2f\", $total_cost }")

# Token formatting
format_tokens() {
  local n=$1
  if (( n >= 1000000 )); then
    echo "$(( n / 1000000 )).$(( (n % 1000000) / 100000 ))M"
  elif (( n >= 1000 )); then
    echo "$(( n / 1000 )).$(( (n % 1000) / 100 ))K"
  else
    echo "$n"
  fi
}

input_display=$(format_tokens "$total_input")
output_display=$(format_tokens "$total_output")

# Duration
now_ms=$(( $(date +%s) * 1000 ))
duration_s=$(( (now_ms - time_created) / 1000 ))
if (( duration_s >= 3600 )); then
  duration_display="$(( duration_s / 3600 ))h$(( (duration_s % 3600) / 60 ))m"
elif (( duration_s >= 60 )); then
  duration_display="$(( duration_s / 60 ))m$(( duration_s % 60 ))s"
else
  duration_display="${duration_s}s"
fi

echo "OC ${short_model} ${ctx_display} ${input_display}/${output_display} ${cost_display} ${duration_display}"
