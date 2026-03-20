/**
 * ChamferedPanel -- Vertical fork of ChamferedBar for popup panels.
 *
 * Calm animation profile: wave gradient + border sine wave only.
 * No slash events, no ripple collisions, no elevated slash pass.
 * Tick rate: 66ms (15fps) vs ChamferedBar's 33ms (30fps).
 *
 * Usage in JSX:
 *   <ChamferedPanel
 *     class="notif-panel"
 *     $={(self) => {
 *       self.setChamfer({ tl: true, tr: true, bl: true, br: true })
 *       self.setGradientColors(JEWEL_PALETTE)
 *     }}
 *   >
 *     {children}
 *   </ChamferedPanel>
 */
import GObject from "gi://GObject"
import Gtk from "gi://Gtk?version=4.0"
import GLib from "gi://GLib?version=2.0"
import Graphene from "gi://Graphene?version=1.0"
import {
  drawIslandBackground,
  type ChamferConfig,
  type GradientColor,
} from "../lib/cairo-island"
import { RippleState } from "../lib/wave-state"
import { BorderWaveState } from "../lib/border-wave-state"

const DEFAULT_CHAMFER: ChamferConfig = Object.freeze({
  tl: false,
  tr: false,
  bl: false,
  br: false,
})

/** Animation tick interval in ms (~15fps). */
const TICK_MS = 66

export const ChamferedPanel = GObject.registerClass(
  { GTypeName: "ChrysaChamferedPanel" },
  class ChamferedPanel extends Gtk.Overlay {
    private _chamfer: ChamferConfig = DEFAULT_CHAMFER
    private _gradientColors: readonly GradientColor[] = []
    private _rippleState: RippleState | null = null
    private _borderWaveState: BorderWaveState | null = null
    private _timerId = 0
    private _lastW = 0
    private _lastH = 0
    private _innerBox!: Gtk.Box

    _init(params: object = {}): void {
      super._init(params)
      this.set_overflow(Gtk.Overflow.VISIBLE)

      this._innerBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL })
      this._innerBox.set_overflow(Gtk.Overflow.VISIBLE)
      this.set_child(this._innerBox)
    }

    /** Redirect JSX children to the inner box. */
    append(child: Gtk.Widget): void {
      this._innerBox.append(child)
    }

    setChamfer(chamfer: ChamferConfig): void {
      this._chamfer = Object.freeze({ ...chamfer })
      this.queue_draw()
    }

    setGradientColors(colors: readonly GradientColor[]): void {
      this._gradientColors = [...colors]
      if (!this._rippleState) {
        this._rippleState = new RippleState(colors.length)
      }
      if (!this._borderWaveState) {
        this._borderWaveState = new BorderWaveState()
      }
      this._startAnimation()
      this.queue_draw()
    }

    private _startAnimation(): void {
      if (this._timerId !== 0) return

      this._timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, TICK_MS, () => {
        this._rippleState?.tick(this._lastW, this._lastH)
        this._borderWaveState?.tick()
        this.queue_draw()
        return GLib.SOURCE_CONTINUE
      })
    }

    vfunc_snapshot(snapshot: Gtk.Snapshot): void {
      const w = this.get_width()
      const h = this.get_height()
      this._lastW = w
      this._lastH = h

      if (w > 0 && h > 0) {
        const OVF = 12
        const bounds = new Graphene.Rect()
        bounds.init(-OVF, -OVF, w + 2 * OVF, h + 2 * OVF)
        const cr = snapshot.append_cairo(bounds)

        drawIslandBackground(
          cr,
          w,
          h,
          this._chamfer,
          this._gradientColors.length > 0 ? this._gradientColors : undefined,
          this._rippleState?.currentFrame.gradient,
          undefined, // no ripple draws
          undefined, // no slash draws
          this._borderWaveState ?? undefined,
        )
      }

      super.vfunc_snapshot(snapshot)
    }

    vfunc_unroot(): void {
      if (this._timerId !== 0) {
        GLib.source_remove(this._timerId)
        this._timerId = 0
      }
      super.vfunc_unroot()
    }
  },
)
