import { createState } from "ags"
import GLib from "gi://GLib?version=2.0"

const fmt = () => `󰥔  ${GLib.DateTime.new_now_local()!.format("%H:%M")!}`

// One clock shared by every monitor. It wakes once a minute, just after the minute changes.
const [time, setTime] = createState(fmt())

function arm(): void {
  const now = GLib.DateTime.new_now_local()!
  const ms = (60 - now.get_second()) * 1000 - Math.floor(now.get_microsecond() / 1000) + 50
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
    setTime(fmt())
    arm()
    return GLib.SOURCE_REMOVE
  })
}

arm()

export function Clock() {
  return (
    <label
      class="clock-label"
      label={time}
      halign={3}
      valign={3}
    />
  )
}
