/**
 * mouse-store -- one shared reading of the Logitech mouse for every monitor and the panel.
 *
 * One queue runs every Solaar command. Two CLI processes must not talk to the
 * receiver at the same time, and a refresh that follows a write must see that write.
 *
 * A write updates the reading first and reverts it if Solaar rejects the value.
 * The rejected setting keeps its error text until the next write of that setting.
 */
import { createState } from "ags"
import GLib from "gi://GLib?version=2.0"
import {
  NO_READING,
  readMouse,
  writeSetting,
  type MouseReading,
  type Presence,
  type SettingKey,
} from "./solaar"

/** `solaar show` wakes the radio, so the poll stays slow. */
const POLL_SECONDS = 120
/** A panel open skips the refresh if the reading is younger than this. */
const FRESH_MS = 10_000

export type SettingErrors = Readonly<Partial<Record<SettingKey, string>>>
type SettingPatch = Partial<Pick<MouseReading, "dpi" | "ratchet" | "smartShift" | "haptic">>

const [reading, setReading] = createState<MouseReading>(NO_READING)
const [errors, setErrors] = createState<SettingErrors>({})

export { reading as mouseReading, errors as mouseErrors }

let queue: Promise<void> = Promise.resolve()
let refreshQueued = false
let lastRefreshMs = 0

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job)
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

/** Logs a presence change once. A removed receiver must not fill the log on each poll. */
function logTransition(before: Presence, after: MouseReading): void {
  if (before === after.presence) return
  if (after.presence === "error") {
    console.error(`Mouse: solaar show failed. ${after.detail}`)
  } else if (after.presence === "absent") {
    console.log(`Mouse: device absent, indicator hidden. ${after.detail}`)
  }
}

export function refreshMouse(): void {
  if (refreshQueued) return
  refreshQueued = true
  enqueue(readMouse)
    .then((next) => {
      logTransition(reading.peek().presence, next)
      setReading(next)
    })
    .catch((error: unknown) => console.error("Mouse: refresh failed.", error))
    .finally(() => {
      refreshQueued = false
      lastRefreshMs = Date.now()
    })
}

export function refreshMouseIfStale(): void {
  if (Date.now() - lastRefreshMs > FRESH_MS) refreshMouse()
}

function pick(source: MouseReading, patch: SettingPatch): SettingPatch {
  const keys = Object.keys(patch) as (keyof SettingPatch)[]
  return Object.fromEntries(keys.map((key) => [key, source[key]])) as SettingPatch
}

function withoutKey(map: SettingErrors, key: SettingKey): SettingErrors {
  return Object.fromEntries(Object.entries(map).filter(([name]) => name !== key))
}

/** Writes one setting. `patch` holds the reading fields that the write changes. */
export function applyMouseSetting(key: SettingKey, value: string, patch: SettingPatch): void {
  const previous = pick(reading.peek(), patch)
  setReading((current) => ({ ...current, ...patch }))
  setErrors((current) => withoutKey(current, key))

  enqueue(() => writeSetting(key, value)).catch((error: unknown) => {
    const reason = error instanceof Error ? error.message : String(error)
    console.error(`Mouse: solaar config ${key} ${value} failed. ${reason}`)
    setReading((current) => ({ ...current, ...previous }))
    setErrors((current) => ({ ...current, [key]: reason }))
  })
}

refreshMouse()
GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, POLL_SECONDS, () => {
  refreshMouse()
  return GLib.SOURCE_CONTINUE
})
