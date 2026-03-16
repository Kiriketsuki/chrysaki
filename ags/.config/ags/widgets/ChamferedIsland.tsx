/**
 * ChamferedBar -- GObject widget extending Gtk.Box with a Cairo-drawn
 * chamfered background. Renders radial ripple fill, glass fill, diagonal
 * hatching, slash overlays, border, and inset shadow behind children via
 * vfunc_snapshot.
 *
 * Slash events fire autonomously at random intervals. When a \ and / slash
 * physically intersect, a radial color ripple expands from the crossing point.
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
  type RippleDraw,
} from "../lib/cairo-island"
import { SlashEventState, RippleState } from "../lib/wave-state"

const DEFAULT_CHAMFER: ChamferConfig = Object.freeze({
  tl: false,
  tr: false,
  bl: false,
  br: false,
})

/**
 * Chrysaki jewel-tone palette — 10 gradient-eligible colors (indices 0-9).
 * Used for wave gradient fills and ripple colors.
 */
export const JEWEL_PALETTE: readonly GradientColor[] = Object.freeze([
  { r: 0x1a / 255, g: 0x8a / 255, b: 0x6a / 255, a: 0.35 }, // 0  emerald   #1a8a6a
  { r: 0x1c / 255, g: 0x3d / 255, b: 0x7a / 255, a: 0.35 }, // 1  royalBlue #1c3d7a
  { r: 0x58 / 255, g: 0x30 / 255, b: 0x90 / 255, a: 0.35 }, // 2  amethyst  #583090
  { r: 0x20 / 255, g: 0x96 / 255, b: 0x9c / 255, a: 0.35 }, // 3  teal      #20969c
  { r: 0xd4 / 255, g: 0x76 / 255, b: 0x22 / 255, a: 0.35 }, // 4  topaz     #d47622
  { r: 0x9e / 255, g: 0x2d / 255, b: 0x6e / 255, a: 0.35 }, // 5  rhodolite #9e2d6e
  { r: 0x9d / 255, g: 0xa8 / 255, b: 0x2a / 255, a: 0.35 }, // 6  peridot   #9da82a
  { r: 0x3d / 255, g: 0x95 / 255, b: 0xe0 / 255, a: 0.35 }, // 7  cerulean  #3d95e0
  { r: 0x62 / 255, g: 0x75 / 255, b: 0x8a / 255, a: 0.35 }, // 8  slate     #62758a
  { r: 0xb3 / 255, g: 0x8b / 255, b: 0x62 / 255, a: 0.35 }, // 9  bronze    #b38b62
])

/**
 * Slash-only colors appended to the palette at render time (indices 10-11).
 * reservedRed for L→R slashes, reservedYellow for R→L slashes.
 * Excluded from gradient/ripple color picks.
 */
const SLASH_COLORS: readonly GradientColor[] = Object.freeze([
  { r: 0xfc / 255, g: 0xa5 / 255, b: 0xa5 / 255, a: 0.35 }, // 10 reservedRed    #fca5a5 — L→R
  { r: 0xfe / 255, g: 0xf0 / 255, b: 0x8a / 255, a: 0.35 }, // 11 reservedYellow #fef08a — R→L
])

const LR_COLOR_INDEX = 10  // reservedRed
const RL_COLOR_INDEX = 11  // reservedYellow

/** Animation tick interval in ms (~30fps). */
const TICK_MS = 33

/**
 * Ripple lifetime in ms. Alpha decays with sqrt falloff over this period
 * so ripples stay bright while young and fade gracefully as they expand.
 * At bar height 40px and typical island widths, ripples physically exit the
 * bar boundary well before this expires — the decay applies mostly near the edge.
 */
const RIPPLE_LIFE_MS = 700

/** Intersection thresholds (normalised units). */
const INTERSECT_CX_THRESHOLD = 0.08  // ~96px on 1200px island
const INTERSECT_CY_THRESHOLD = 0.35  // ~14px on 40px bar

export const ChamferedBar = GObject.registerClass(
  { GTypeName: "ChrysaChamferedBar" },
  class ChamferedBar extends Gtk.Box {
    private _chamfer: ChamferConfig = DEFAULT_CHAMFER
    private _gradientColors: readonly GradientColor[] = []
    private _slashState: SlashEventState | null = null
    private _rippleState: RippleState | null = null
    private _triggeredPairs: Set<string> = new Set()
    private _timerId = 0
    private _lastW = 0
    private _lastH = 0

    setChamfer(chamfer: ChamferConfig): void {
      this._chamfer = Object.freeze({ ...chamfer })
      this.queue_draw()
    }

    setGradientColors(colors: readonly GradientColor[]): void {
      // Full render palette: jewel tones (indices 0–N-1) + slash-only colors (indices N, N+1).
      // Ripple/background picks stay in the jewel range; slash renderers use the full range.
      this._gradientColors = [...colors, ...SLASH_COLORS]
      if (!this._slashState) {
        this._slashState = new SlashEventState(this._gradientColors.length, LR_COLOR_INDEX, RL_COLOR_INDEX)
      }
      if (!this._rippleState) {
        this._rippleState = new RippleState(colors.length)  // jewel range: 0-9
      }
      this._startAnimation()
      this.queue_draw()
    }

    private _startAnimation(): void {
      if (this._timerId !== 0) return

      this._timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, TICK_MS, () => {
        this._slashState?.tick()
        this._checkIntersections()
        this._rippleState?.tick(this._lastW, this._lastH)
        this.queue_draw()
        return GLib.SOURCE_CONTINUE
      })
    }

    private _checkIntersections(): void {
      if (!this._slashState || !this._rippleState) return

      const active   = this._slashState.activeSlashes
      const backs    = active.filter(s => s.dir === 'back')
      const forwards = active.filter(s => s.dir === 'forward')

      for (const b of backs) {
        for (const f of forwards) {
          if (b.alpha < 0.35 || f.alpha < 0.35) continue

          const minId = Math.min(b.id, f.id)
          const maxId = Math.max(b.id, f.id)
          const key   = `${minId}-${maxId}`

          if (this._triggeredPairs.has(key)) continue

          const cxDiff = Math.abs(b.cx - f.cx)
          const cyDiff = Math.abs(b.cy - f.cy)

          if (cxDiff < INTERSECT_CX_THRESHOLD && cyDiff < INTERSECT_CY_THRESHOLD) {
            const midCx      = (b.cx + f.cx) / 2
            const midCy      = (b.cy + f.cy) / 2
            // Ripple color only from jewel range (excludes slash-only colors at tail of palette)
            const jewelCount = this._gradientColors.length - SLASH_COLORS.length
            const colorIndex = Math.floor(Math.random() * jewelCount)
            this._rippleState.addRipple(midCx, midCy, colorIndex)
            // Intersecting slashes get double fade — they linger as the ripple expands
            this._slashState.extendFade(b.id, 2)
            this._slashState.extendFade(f.id, 2)
            // Both waves stop — they spent themselves on this crossing
            this._slashState.stopWave(b.waveSweepDir)
            this._slashState.stopWave(f.waveSweepDir)
            this._triggeredPairs.add(key)
          }
        }
      }

      // Prune stale pairs where either slash has retired
      const activeIds = new Set(active.map(s => s.id))
      for (const key of this._triggeredPairs) {
        const [aStr, bStr] = key.split('-')
        if (!activeIds.has(Number(aStr)) || !activeIds.has(Number(bStr))) {
          this._triggeredPairs.delete(key)
        }
      }
    }

    vfunc_snapshot(snapshot: Gtk.Snapshot): void {
      const w = this.get_width()
      const h = this.get_height()
      this._lastW = w
      this._lastH = h

      if (w > 0 && h > 0) {
        const bounds = new Graphene.Rect()
        bounds.init(0, 0, w, h)
        const cr = snapshot.append_cairo(bounds)

        // Convert normalised coords to pixel draw descriptors for the renderer
        let rippleDraws: RippleDraw[] | undefined
        if (this._rippleState && this._gradientColors.length > 0) {
          const now   = Date.now()
          const frame = this._rippleState.currentFrame
          rippleDraws = frame.ripples
            .map(r => {
              const age   = now - r.startMs
              const alpha = Math.sqrt(Math.max(0, 1 - age / RIPPLE_LIFE_MS))
              return {
                cx:         r.cx * w,
                cy:         r.cy * h,
                radiusPx:   r.radiusPx,
                colorIndex: r.colorIndex,
                alpha,
              }
            })
            .filter(r => r.alpha > 0.01)
        }

        drawIslandBackground(
          cr,
          w,
          h,
          this._chamfer,
          this._gradientColors.length > 0 ? this._gradientColors : undefined,
          this._rippleState?.currentFrame.gradient,
          rippleDraws,
          this._slashState?.activeSlashes,
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
      this._triggeredPairs.clear()
      super.vfunc_unroot()
    }
  },
)
