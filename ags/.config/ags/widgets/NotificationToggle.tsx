/**
 * NotificationToggle — bar button with hexagonal Cairo badge and DND indicator.
 *
 * Badge: flat-top hexagon via drawHexFlat() with Cairo text rendering.
 * Pulse: 300ms radius 9->12->9 + color flash error->blonde->error on count change.
 * DND: bell-off glyph + blonde-light CSS class when dontDisturb is active.
 */
import GLib from "gi://GLib?version=2.0"
import { createBinding } from "ags"
import { drawHexFlat } from "../lib/cairo-hex"
import { hexToRgba } from "../lib/cairo-separator"
import { getUnreadCount, onUnreadChange, toggleNotificationCenter } from "./NotificationCenter"
import { notifd } from "./NotificationCenter"

const BADGE_SIZE = 22
const BASE_RADIUS = 9
const PULSE_RADIUS = 12
const PULSE_DURATION_MS = 300
const PULSE_FPS_MS = 10

const ERROR_HEX = "#8C2F39"
const BLONDE_HEX = "#FBB13C"
const TEXT_HEX = "#e0e2ea"

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function NotificationToggle() {
  const dnd = createBinding(notifd, "dontDisturb")

  return (
    <box class="notif-toggle-wrap" valign={3}>
      <button
        class={dnd.as((on) => `utility-button${on ? " notif-toggle-dnd" : ""}`)}
        label={dnd.as((on) => (on ? "\u{f009b}" : "\u{f009a}"))}
        onClicked={() => toggleNotificationCenter()}
        tooltipText={dnd.as((on) =>
          on ? "DND on \u2014 notifications hidden" : "Toggle notifications",
        )}
      />
      <drawingarea
        class="notif-badge-da"
        widthRequest={BADGE_SIZE}
        heightRequest={BADGE_SIZE}
        visible={false}
        $={(da: any) => {
          let pulseT = -1
          let pulseTimerId = 0

          da.set_draw_func((_area: any, cr: any, w: number, h: number) => {
            const count = getUnreadCount()
            if (count <= 0) return

            const cx = w / 2
            const cy = h / 2

            // Radius: interpolate during pulse
            let radius = BASE_RADIUS
            let fillHex = ERROR_HEX
            if (pulseT >= 0 && pulseT <= 1) {
              // Triangle wave: 0->1->0
              const wave = pulseT < 0.5 ? pulseT * 2 : (1 - pulseT) * 2
              radius = BASE_RADIUS + (PULSE_RADIUS - BASE_RADIUS) * easeOutCubic(wave)
              // Color flash: error -> blonde -> error
              fillHex = wave > 0.5 ? BLONDE_HEX : ERROR_HEX
            }

            drawHexFlat(cr, cx, cy, radius, hexToRgba(fillHex, 1.0))

            // Draw count text — always upright
            const [tr, tg, tb, ta] = hexToRgba(TEXT_HEX, 1.0)
            cr.selectFontFace("IosevkaTermSlab Nerd Font", 0, 1)
            cr.setFontSize(9)
            const numStr = count > 9 ? "9+" : String(count)
            const extents = cr.textExtents(numStr)
            const tx = cx - extents.width / 2 - extents.xBearing
            const ty = cy - extents.height / 2 - extents.yBearing
            cr.moveTo(tx, ty)
            cr.setSourceRGBA(tr, tg, tb, ta)
            cr.showText(numStr)
          })

          function startPulse(): void {
            if (pulseTimerId) {
              GLib.source_remove(pulseTimerId)
              pulseTimerId = 0
            }
            pulseT = 0
            const startMs = Date.now()
            pulseTimerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, PULSE_FPS_MS, () => {
              const elapsed = Date.now() - startMs
              pulseT = Math.min(1, elapsed / PULSE_DURATION_MS)
              da.queue_draw()
              if (pulseT >= 1) {
                pulseT = -1
                pulseTimerId = 0
                da.queue_draw()
                return GLib.SOURCE_REMOVE
              }
              return GLib.SOURCE_CONTINUE
            })
          }

          function update(): void {
            const count = getUnreadCount()
            da.visible = count > 0
            if (count > 0) {
              startPulse()
            }
            da.queue_draw()
          }

          onUnreadChange(update)

          da.connect("destroy", () => {
            if (pulseTimerId) {
              GLib.source_remove(pulseTimerId)
              pulseTimerId = 0
            }
          })
        }}
      />
    </box>
  )
}
