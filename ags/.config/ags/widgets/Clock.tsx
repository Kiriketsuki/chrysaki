import { createPoll } from "ags/time"
import GLib from "gi://GLib?version=2.0"

export function Clock() {
  const time = createPoll("00:00", 1000, () =>
    `󰥔  ${GLib.DateTime.new_now_local()!.format("%H:%M")!}`
  )

  return (
    <label
      class="clock-label"
      label={time}
      halign={3}
      valign={3}
    />
  )
}
