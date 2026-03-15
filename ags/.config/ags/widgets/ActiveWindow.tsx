import { createBinding, createComputed, createState } from "ags"
import { execAsync } from "ags/process"
import AstalHyprland from "gi://AstalHyprland"
import GLib from "gi://GLib?version=2.0"

const hyprland = AstalHyprland.get_default()!

/** Terminal emulator class names (lowercase for matching). */
const TERMINAL_CLASSES = new Set([
  "com.mitchellh.ghostty",
  "ghostty",
  "alacritty",
  "kitty",
  "foot",
  "org.wezfurlong.wezterm",
  "wezterm",
])

/** Map window class → Nerd Font icon glyph. */
const APP_ICONS: ReadonlyMap<string, string> = new Map([
  ["firefox", "\u{F0239}"],          // nf-md-firefox
  ["chromium", "\u{F035A}"],         // nf-md-google_chrome
  ["google-chrome", "\u{F035A}"],
  ["code", "\u{F0A1E}"],             // nf-md-microsoft_visual_studio_code
  ["obsidian", "\u{F0219}"],         // nf-md-file_document
  ["discord", "\u{F066F}"],          // nf-md-discord
  ["spotify", "\u{F04C7}"],          // nf-md-spotify
  ["steam", "\u{F04B2}"],            // nf-md-steam
  ["nautilus", "\u{F024B}"],         // nf-md-folder
  ["thunar", "\u{F024B}"],
  ["org.gnome.nautilus", "\u{F024B}"],
  ["slack", "\u{F04B1}"],            // nf-md-slack
  ["telegram-desktop", "\u{F04C0}"], // nf-md-send
  ["vlc", "\u{F057C}"],              // nf-md-vlc
  ["mpv", "\u{F040A}"],              // nf-md-play
  ["gimp", "\u{F030D}"],             // nf-md-image_edit
  ["obs", "\u{F0587}"],              // nf-md-video
])

function truncate(s: string, len: number): string {
  return s.length > len ? s.substring(0, len) + "\u{2026}" : s
}

function isTerminal(windowClass: string): boolean {
  return TERMINAL_CLASSES.has(windowClass.toLowerCase())
}

function appIcon(windowClass: string): string {
  const lower = windowClass.toLowerCase()
  return APP_ICONS.get(lower) ?? "\u{F0219}" // fallback: nf-md-file_document
}

/**
 * Shell script to find the tmux session for a given terminal PID.
 * Ghostty uses a single process for all windows, so multiple tmux clients
 * may share the same ancestor PID. We sort by activity (most recent first)
 * so the most recently interacted-with session wins.
 */
function tmuxScript(pid: number): string {
  return `
TPID=${pid}
tmux list-clients -F '#{client_activity} #{client_pid} #{session_name}' 2>/dev/null \\
  | sort -rn \\
  | while read _act cpid session; do
      p=$cpid
      while [ "$p" -gt 1 ] 2>/dev/null; do
        [ "$p" = "$TPID" ] && echo "$session" && exit 0
        p=$(sed 's/.*) //' /proc/$p/stat 2>/dev/null | awk '{print $2}')
      done
    done \\
  | head -1
`
}

export function ActiveWindow() {
  const client = createBinding(hyprland, "focusedClient")
  const [tmuxSession, setTmuxSession] = createState("")
  const [forceUpdate, setForceUpdate] = createState(0)

  let timerId: number | null = null

  function pollTmux(pid: number): void {
    execAsync(["bash", "-c", tmuxScript(pid)])
      .then((out) => setTmuxSession(out.trim()))
      .catch(() => setTmuxSession(""))
  }

  function startTmuxPoll(pid: number): void {
    // Immediate poll
    pollTmux(pid)
    // Rapid follow-up at 300ms for snappy workspace switch response
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
      pollTmux(pid)
      return GLib.SOURCE_REMOVE
    })
    // Steady-state polling every 2s
    timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
      pollTmux(pid)
      return GLib.SOURCE_CONTINUE
    })
  }

  function stopTmuxPoll(): void {
    if (timerId !== null) {
      GLib.source_remove(timerId)
      timerId = null
    }
    setTmuxSession("")
  }

  function handleFocusChange(): void {
    const c = hyprland.focusedClient
    const windowClass = c?.class ?? ""
    const pid = c?.pid ?? 0

    if (isTerminal(windowClass)) {
      // Always re-poll — Ghostty shares one PID across windows
      stopTmuxPoll()
      startTmuxPoll(pid)
    } else {
      stopTmuxPoll()
    }
    // Bump force-update counter to trigger createComputed re-eval
    setForceUpdate((v) => v + 1)
  }

  // Listen for BOTH focused client AND focused workspace changes
  hyprland.connect("notify::focused-client", handleFocusChange)
  hyprland.connect("notify::focused-workspace", handleFocusChange)

  const text = createComputed(() => {
    // Touch forceUpdate to ensure re-eval on workspace switch
    forceUpdate()
    const c = client()
    if (!c) return "\u{F0379}  Desktop" // nf-md-home

    const windowClass = c.class ?? ""
    const title = c.title ?? ""

    if (isTerminal(windowClass)) {
      const session = tmuxSession()
      if (session) {
        // Tmux session: terminal glyph + session name
        return `\u{F120}  ${truncate(session, 26)}`  // nf-fa-terminal
      }
      // Terminal without tmux: show title with terminal glyph
      return `\u{F120}  ${truncate(title, 26)}` // nf-fa-terminal
    }

    const icon = appIcon(windowClass)
    const display = title || windowClass.split(".").pop() || windowClass
    return `${icon}  ${truncate(display, 30)}`
  })

  return (
    <label
      class="active-window-label"
      label={text}
      halign={3}
      valign={3}
      $={(self: any) => {
        self.connect("destroy", () => stopTmuxPoll())
      }}
    />
  )
}
