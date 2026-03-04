#!/usr/bin/env bash
# deploy-firefox.sh — Copy Chrysaki Firefox theme to the active Firefox profile.
# OS-agnostic: works on macOS, Linux, and Windows (Git Bash / MSYS2 / Cygwin).
# Run from anywhere; the script locates itself.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
THEME_DIR="$(dirname "$SCRIPT_DIR")/firefox"

# ── Locate Firefox profiles root ────────────────────────────────────────────
case "$(uname -s)" in
    Darwin*)
        PROFILES_BASE="$HOME/Library/Application Support/Firefox/Profiles"
        ;;
    Linux*)
        PROFILES_BASE="$HOME/.mozilla/firefox"
        ;;
    CYGWIN*|MINGW*|MSYS*)
        # Git Bash / MSYS2 / Cygwin on Windows — $APPDATA may use backslashes
        APPDATA_UNIX="${APPDATA//\\//}"
        PROFILES_BASE="${APPDATA_UNIX}/Mozilla/Firefox/Profiles"
        ;;
    *)
        echo "ERROR: Unsupported OS '$(uname -s)'. Add a case entry in deploy-firefox.sh."
        exit 1
        ;;
esac

if [ ! -d "$PROFILES_BASE" ]; then
    echo "ERROR: Firefox profiles directory not found: $PROFILES_BASE"
    exit 1
fi

# ── Pick profile: prefer *default-release*, then any *default* ──────────────
PROFILE=""
while IFS= read -r candidate; do
    PROFILE="$candidate"
    break
done < <(ls "$PROFILES_BASE" | grep -E "\.default-release" | head -1)

if [ -z "$PROFILE" ]; then
    while IFS= read -r candidate; do
        PROFILE="$candidate"
        break
    done < <(ls "$PROFILES_BASE" | grep "default" | head -1)
fi

if [ -z "$PROFILE" ]; then
    echo "ERROR: Could not find a Firefox profile. Profiles directory: $PROFILES_BASE"
    ls "$PROFILES_BASE" || true
    exit 1
fi

CHROME_DIR="$PROFILES_BASE/$PROFILE/chrome"
mkdir -p "$CHROME_DIR"

# ── Deploy ───────────────────────────────────────────────────────────────────
cp "$THEME_DIR/userChrome.css"  "$CHROME_DIR/userChrome.css"
cp "$THEME_DIR/userContent.css" "$CHROME_DIR/userContent.css"

echo "Deployed Chrysaki Firefox theme."
echo "  Profile : $PROFILE"
echo "  Chrome  : $CHROME_DIR"
echo ""
echo "Restart Firefox to apply changes."
