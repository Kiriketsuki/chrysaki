/**
 * solaar -- thin wrapper around the Solaar CLI for one Logitech device.
 *
 * The kernel exposes no hidpp_battery node on this host, and UPower does not list
 * the mouse. The Solaar CLI is the only source for battery and settings.
 * `solaar show` takes several seconds and wakes the radio, so callers poll it slowly.
 *
 * The CLI prints a Wayland warning on stderr. execAsync returns stdout only, so
 * the parser never sees that line.
 */
import { execAsync } from "ags/process"

export const DEVICE_NAME = "MX Master 4"

// `ags run` sets LD_PRELOAD to the GTK4 layer-shell library, and child processes
// inherit it. Solaar is a GTK3 program and aborts under that library with
// "gdk_display_manager_get() was called before gtk_init()". Every Solaar call
// therefore starts through `env -u LD_PRELOAD`.
const CLEAN_ENV = ["env", "-u", "LD_PRELOAD"]

export const SOLAAR_GUI_COMMAND = [...CLEAN_ENV, "solaar"]

export type Presence = "unknown" | "absent" | "offline" | "online" | "error"

/** CLI setting names that the panel writes. */
export type SettingKey = "dpi" | "scroll-ratchet" | "smart-shift" | "haptic-level"

export type Ratchet = "Ratcheted" | "Freespinning"

export interface MouseReading {
  readonly presence: Presence
  readonly battery: number | null
  readonly charging: boolean
  readonly dpi: number | null
  readonly ratchet: Ratchet | null
  readonly smartShift: number | null
  readonly haptic: number | null
  /** Reason for the `absent` or `error` presence. Empty otherwise. */
  readonly detail: string
}

export const NO_READING: MouseReading = Object.freeze({
  presence: "unknown",
  battery: null,
  charging: false,
  dpi: null,
  ratchet: null,
  smartShift: null,
  haptic: null,
  detail: "",
})

// Labels that `solaar show` prints for each setting.
const LABEL_DPI = "Sensitivity (DPI)"
const LABEL_RATCHET = "Scroll Wheel Ratcheted"
const LABEL_SMART_SHIFT = "Scroll Wheel Ratchet Speed"
const LABEL_HAPTIC = "Haptic Feedback Level"

// Messages that mean "no such device here", not "the CLI broke".
const ABSENT_MARKERS = [
  "no device found matching",
  "No supported device found",
  "Failed to execute child process",
]

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Reads one setting from `solaar show` output. The live line wins. An offline
 * device prints only the `(saved)` line, so the parser reads that line next.
 */
function readSetting(output: string, label: string): string | null {
  const name = escapeRegExp(label)
  const live = output.match(new RegExp(`^\\s*${name}\\s*:\\s*(.+?)\\s*$`, "m"))
  if (live) return live[1]
  const saved = output.match(new RegExp(`^\\s*${name} \\(saved\\)\\s*:\\s*(.+?)\\s*$`, "m"))
  return saved ? saved[1] : null
}

function toInt(text: string | null): number | null {
  if (text === null) return null
  const value = Number.parseInt(text, 10)
  return Number.isNaN(value) ? null : value
}

function toRatchet(text: string | null): Ratchet | null {
  return text === "Ratcheted" || text === "Freespinning" ? text : null
}

export function parseShow(output: string): MouseReading {
  const offline = /^\s*Device is offline\./m.test(output)
  const battery = output.match(/Battery:\s*(\d+)%,\s*BatteryStatus\.(\w+)/)
  const status = battery ? battery[2] : ""

  return {
    presence: offline ? "offline" : "online",
    battery: battery ? Number.parseInt(battery[1], 10) : null,
    charging: status.includes("CHARG") && !status.includes("DISCHARG"),
    dpi: toInt(readSetting(output, LABEL_DPI)),
    ratchet: toRatchet(readSetting(output, LABEL_RATCHET)),
    smartShift: toInt(readSetting(output, LABEL_SMART_SHIFT)),
    haptic: toInt(readSetting(output, LABEL_HAPTIC)),
    detail: "",
  }
}

/** Solaar ends a failure with `Exception: <reason>`. That last line is the useful part. */
export function errorSummary(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error)
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
  // A crash adds shell job lines after the reason, so a line that names an error wins.
  const named = lines.filter((line) => /(error|exception)\b/i.test(line))
  const last = named[named.length - 1] ?? lines[lines.length - 1] ?? "unknown error"
  return last.replace(/^Exception:\s*/, "")
}

function isAbsent(summary: string): boolean {
  return ABSENT_MARKERS.some((marker) => summary.includes(marker))
}

// `solaar show` prints a NUL byte inside the firmware list. GLib reads stdout as a
// C string and stops at that byte, so `tr` removes it before the text reaches gjs.
// `pipefail` keeps the exit status of solaar.
const SHOW_COMMAND = [
  ...CLEAN_ENV,
  "bash",
  "-c",
  'set -o pipefail; solaar show "$1" | tr -d "\\000"',
  "solaar-show",
  DEVICE_NAME,
]

/** Never rejects. A failure becomes an `absent` or `error` reading. */
export async function readMouse(): Promise<MouseReading> {
  try {
    return parseShow(await execAsync(SHOW_COMMAND))
  } catch (error: unknown) {
    const detail = errorSummary(error)
    return { ...NO_READING, presence: isAbsent(detail) ? "absent" : "error", detail }
  }
}

/** Rejects with a short reason if Solaar refuses the write. */
export async function writeSetting(key: SettingKey, value: string): Promise<void> {
  try {
    await execAsync([...CLEAN_ENV, "solaar", "config", DEVICE_NAME, key, value])
  } catch (error: unknown) {
    throw new Error(errorSummary(error))
  }
}
