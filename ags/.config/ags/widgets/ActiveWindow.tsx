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

/** Parent pid of a process, read from /proc. Returns 0 when the read fails. */
function parentPid(pid: number): number {
  try {
    const [, raw] = GLib.file_get_contents(`/proc/${pid}/stat`)
    const text = new TextDecoder().decode(raw)
    // The comm field can hold spaces and parentheses, so cut after the last ")".
    const rest = text.slice(text.lastIndexOf(")") + 1).trim().split(/\s+/)
    return Number(rest[1]) || 0
  } catch {
    return 0
  }
}

/** True when `ancestor` is `pid` or one of its parents. */
function hasAncestor(pid: number, ancestor: number): boolean {
  let p = pid
  for (let depth = 0; p > 1 && depth < 64; depth++) {
    if (p === ancestor) return true
    p = parentPid(p)
  }
  return false
}

/**
 * Find the tmux session for a given terminal PID from `tmux list-clients` output.
 * Ghostty uses a single process for all windows, so multiple tmux clients
 * may share the same ancestor PID. We sort by activity (most recent first)
 * so the most recently interacted-with session wins.
 */
function findTmuxSession(out: string, terminalPid: number): string {
  const clients = out
    .split("\n")
    .map((line) => line.trim().split(/\s+/))
    .filter((f) => f.length >= 3)
    .map((f) => ({ activity: Number(f[0]), pid: Number(f[1]), session: f.slice(2).join(" ") }))
    .sort((x, y) => y.activity - x.activity)
  for (const c of clients) {
    if (hasAncestor(c.pid, terminalPid)) return c.session
  }
  return ""
}

// Active-window state is desktop-global, so all monitor labels share one
// Hyprland subscription and one tmux poller.
const focusedClient = createBinding(hyprland, "focusedClient")
const [tmuxSession, setTmuxSession] = createState("")
const [forceUpdate, setForceUpdate] = createState(0)
let timerId: number | null = null
let kickId: number | null = null
let focusPending = 0
let pollGeneration = 0

function pollTmux(pid: number, generation: number): void {
  execAsync(["tmux", "list-clients", "-F", "#{client_activity} #{client_pid} #{session_name}"])
    .then((out) => {
      if (generation === pollGeneration) setTmuxSession(findTmuxSession(out, pid))
    })
    .catch(() => {
      if (generation === pollGeneration) setTmuxSession("")
    })
}

function startTmuxPoll(pid: number): void {
  const generation = pollGeneration
  pollTmux(pid, generation)
  kickId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
    kickId = null
    pollTmux(pid, generation)
    return GLib.SOURCE_REMOVE
  })
  timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 5000, () => {
    pollTmux(pid, generation)
    return GLib.SOURCE_CONTINUE
  })
}

function stopTmuxPoll(): void {
  pollGeneration++
  if (kickId !== null) {
    GLib.source_remove(kickId)
    kickId = null
  }
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

  stopTmuxPoll()
  if (isTerminal(windowClass) && pid > 0) startTmuxPoll(pid)
  setForceUpdate((v) => v + 1)
}

// A focus change often fires both signals. One idle callback handles them together.
function scheduleFocus(): void {
  if (focusPending) return
  focusPending = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
    focusPending = 0
    handleFocusChange()
    return GLib.SOURCE_REMOVE
  })
}

hyprland.connect("notify::focused-client", scheduleFocus)
hyprland.connect("notify::focused-workspace", scheduleFocus)
handleFocusChange()

const activeWindowText = createComputed(() => {
  forceUpdate()
  const c = focusedClient()
  if (!c) return "\u{F0379}  Desktop"

  const windowClass = c.class ?? ""
  const title = c.title ?? ""

  if (isTerminal(windowClass)) {
    const session = tmuxSession()
    if (session) return `\u{F120}  ${truncate(session, 26)}`
    return `\u{F120}  ${truncate(title, 26)}`
  }

  const icon = appIcon(windowClass)
  const display = title || windowClass.split(".").pop() || windowClass
  return `${icon}  ${truncate(display, 30)}`
})

export function ActiveWindow() {
  return (
    <label
      class="active-window-label"
      label={activeWindowText}
      halign={3}
      valign={3}
    />
  )
}
