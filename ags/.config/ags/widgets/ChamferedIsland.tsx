/**
 * ChamferedBar -- GObject widget extending Gtk.Box with a Cairo-drawn
 * chamfered background. Renders animated gradient, glass fill, hex grid,
 * diagonal hatching, border, and inset shadow behind children via vfunc_snapshot.
 *
 * Usage in JSX:
 *   <ChamferedBar
 *     class="island-left"
 *     $={(self) => {
 *       self.setChamfer({ tl: true, tr: false, bl: true, br: false })
 *       self.setGradientColors(JEWEL_PALETTE)
 *     }}
 *   >
 *     {children}
 *   </ChamferedBar>
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
import { WaveAnimationState } from "../lib/wave-state"

const DEFAULT_CHAMFER: ChamferConfig = Object.freeze({
  tl: false,
  tr: false,
  bl: false,
  br: false,
})

/** Chrysaki jewel-tone palette (light variants at 0.35 alpha). */
export const JEWEL_PALETTE: readonly GradientColor[] = Object.freeze([
  { r: 0x1a / 255, g: 0x8a / 255, b: 0x6a / 255, a: 0.35 }, // Emerald Lt  #1a8a6a
  { r: 0x1c / 255, g: 0x3d / 255, b: 0x7a / 255, a: 0.35 }, // Blue Lt     #1c3d7a
  { r: 0x58 / 255, g: 0x30 / 255, b: 0x90 / 255, a: 0.35 }, // Amethyst Lt #583090
  { r: 0x20 / 255, g: 0x96 / 255, b: 0x9c / 255, a: 0.35 }, // Teal Lt     #20969c
])

/** Animation tick interval in ms (~30fps). */
const TICK_MS = 33

export const ChamferedBar = GObject.registerClass(
  { GTypeName: "ChrysaChamferedBar" },
  class ChamferedBar extends Gtk.Box {
    private _chamfer: ChamferConfig = DEFAULT_CHAMFER
    private _gradientColors: readonly GradientColor[] = []
    private _waveState: WaveAnimationState | null = null
    private _timerId = 0

    setChamfer(chamfer: ChamferConfig): void {
      this._chamfer = Object.freeze({ ...chamfer })
      this.queue_draw()
    }

    setGradientColors(colors: readonly GradientColor[]): void {
      this._gradientColors = colors
      if (!this._waveState) {
        this._waveState = new WaveAnimationState(colors.length)
      }
      this._startAnimation()
      this.queue_draw()
    }

    private _startAnimation(): void {
      if (this._timerId !== 0) return

      this._timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, TICK_MS, () => {
        this._waveState?.tick()
        this.queue_draw()
        return GLib.SOURCE_CONTINUE
      })
    }

    vfunc_snapshot(snapshot: Gtk.Snapshot): void {
      const w = this.get_width()
      const h = this.get_height()

      if (w > 0 && h > 0) {
        const bounds = new Graphene.Rect()
        bounds.init(0, 0, w, h)
        const cr = snapshot.append_cairo(bounds)
        drawIslandBackground(
          cr,
          w,
          h,
          this._chamfer,
          this._gradientColors.length > 0 ? this._gradientColors : undefined,
          this._waveState?.currentFrame,
        )
      }

      // Render children on top of the Cairo background
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
