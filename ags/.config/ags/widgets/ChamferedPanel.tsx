/**
 * ChamferedPanel -- Vertical fork of ChamferedBar for popup panels.
 *
 * Calm animation profile: wave gradient + border sine wave only.
 * No slash events, no ripple collisions, no elevated slash pass.
 * Tick rate: 66 ms (15 fps). ChamferedBar runs at 100 ms (10 fps).
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
import { ISLAND_ANIMATION } from "../lib/config"

const DEFAULT_CHAMFER: ChamferConfig = Object.freeze({
  tl: false,
  tr: false,
  bl: false,
  br: false,
})

/** Animation tick interval in ms (~15fps). */
const TICK_MS = 66

/** Cairo clip overflow in px. Wave peaks reach about 10 px past the allocation. */
const OVERFLOW_PX = 12

export const ChamferedPanel = GObject.registerClass(
  { GTypeName: "ChrysaChamferedPanel" },
  class ChamferedPanel extends Gtk.Overlay {
    private _chamfer: ChamferConfig = DEFAULT_CHAMFER
    private _gradientColors: readonly GradientColor[] = []
    private _rippleState: RippleState | null = null
    private _borderWaveState: BorderWaveState | null = null
    private _timerId = 0
    private _bounds: Graphene.Rect | null = null
    private _boundsW = 0
    private _boundsH = 0
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
      if (this.get_mapped()) this._startAnimation()
      this.queue_draw()
    }

    /** Returns a cached overflow rect. It rebuilds only when the size changes. */
    private _overflowBounds(w: number, h: number): Graphene.Rect {
      if (this._bounds === null || w !== this._boundsW || h !== this._boundsH) {
        this._bounds = new Graphene.Rect().init(
          -OVERFLOW_PX, -OVERFLOW_PX, w + 2 * OVERFLOW_PX, h + 2 * OVERFLOW_PX,
        )
        this._boundsW = w
        this._boundsH = h
      }
      return this._bounds
    }

    private _stopAnimation(): void {
      if (this._timerId !== 0) {
        GLib.source_remove(this._timerId)
      }
      this._timerId = 0
    }

    vfunc_map(): void {
      super.vfunc_map()
      if (this._gradientColors.length > 0) this._startAnimation()
    }

    vfunc_unmap(): void {
      this._stopAnimation()
      super.vfunc_unmap()
    }

    private _startAnimation(): void {
      if (!ISLAND_ANIMATION || this._timerId !== 0) return

      this._timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, TICK_MS, () => {
        // Popup windows remain constructed while hidden. Avoid advancing state
        // and redrawing until the panel is actually mapped on screen.
        if (!this.get_mapped()) return GLib.SOURCE_CONTINUE

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
        const bounds = this._overflowBounds(w, h)
        const cr = snapshot.append_cairo(bounds)

        try {
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
        } finally {
          ;(cr as any).$dispose?.()
        }
      }

      super.vfunc_snapshot(snapshot)
    }

    vfunc_unroot(): void {
      this._stopAnimation()
      super.vfunc_unroot()
    }
  },
)
