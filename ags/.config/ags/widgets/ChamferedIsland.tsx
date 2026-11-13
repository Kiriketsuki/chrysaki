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
import type { Gdk } from "ags/gtk4"
import GLib from "gi://GLib?version=2.0"
import Graphene from "gi://Graphene?version=1.0"
import {
  drawIslandBackground,
  drawElevatedSlashes,
  type ChamferConfig,
  type GradientColor,
  type RippleDraw,
} from "../lib/cairo-island"
import { SlashEventState, RippleState, type ActiveSlash } from "../lib/wave-state"
import { BorderWaveState } from "../lib/border-wave-state"
import { isMonitorFocused, onFocusChange } from "../lib/focus-monitor"
import { ISLAND_ANIMATION } from "../lib/config"

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

/** Balanced ambient cadence without constant high-frequency full-bar redraws. */
const TICK_MS = 100

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

/** Collisions only fire in the middle 75% of bar width (12.5%–87.5%). */
const INTERSECT_X_MIN = 0.125
const INTERSECT_X_MAX = 0.875

/** Cairo clip overflow in px. Wave peaks reach about 7 px past the allocation. */
const OVERFLOW_PX = 8

export const ChamferedBar = GObject.registerClass(
  { GTypeName: "ChrysaChamferedBar" },
  class ChamferedBar extends Gtk.Overlay {
    private _chamfer: ChamferConfig = DEFAULT_CHAMFER
    private _gradientColors: readonly GradientColor[] = []
    private _slashState: SlashEventState | null = null
    private _rippleState: RippleState | null = null
    private _borderWaveState: BorderWaveState | null = null
    private _triggeredPairs: Set<string> = new Set()
    private _collidingIds: Set<number> = new Set()
    private _timerId = 0
    private _bounds: Graphene.Rect | null = null
    private _boundsW = 0
    private _boundsH = 0
    private _lastW = 0
    private _lastH = 0
    private _innerBox!: Gtk.Box
    // Slash list built once per tick. The snapshot reads it instead of rebuilding it.
    private _active: readonly ActiveSlash[] = []
    private _focused = true
    private _unsubFocus: (() => void) | null = null

    _init(params: object = {}): void {
      super._init(params)
      this.set_overflow(Gtk.Overflow.VISIBLE)

      // Main child: holds all JSX children, determines the Overlay's size.
      this._innerBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL })
      this._innerBox.set_overflow(Gtk.Overflow.VISIBLE)
      this.set_child(this._innerBox)

    }

    /** Redirect JSX children to the inner box (AGS calls append for Box-like containers). */
    append(child: Gtk.Widget): void {
      this._innerBox.append(child)
    }

    setChamfer(chamfer: ChamferConfig): void {
      this._chamfer = Object.freeze({ ...chamfer })
      this.queue_draw()
    }

    /** Ties the animation to the focus state of one monitor. */
    setMonitor(m: Gdk.Monitor): void {
      if (!ISLAND_ANIMATION) return
      this._unsubFocus?.()
      this._focused = isMonitorFocused(m)
      this._slashState?.setSpawning(this._focused)
      this._unsubFocus = onFocusChange(() => this._setFocused(isMonitorFocused(m)))
    }

    private _setFocused(f: boolean): void {
      if (f === this._focused) return
      this._focused = f
      this._slashState?.setSpawning(f)
      if (f) {
        this._slashState?.resetClock()
        this._rippleState?.resetClock()
        this._borderWaveState?.resetClock()
        if (this.get_mapped() && this._gradientColors.length > 0) this._startAnimation()
      }
    }

    setGradientColors(colors: readonly GradientColor[]): void {
      // Full render palette: jewel tones (indices 0–N-1) + slash-only colors (indices N, N+1).
      // Ripple/background picks stay in the jewel range; slash renderers use the full range.
      this._gradientColors = [...colors, ...SLASH_COLORS]
      if (!this._slashState) {
        this._slashState = new SlashEventState(this._gradientColors.length, LR_COLOR_INDEX, RL_COLOR_INDEX)
        this._slashState.setSpawning(this._focused)
      }
      if (!this._rippleState) {
        this._rippleState = new RippleState(colors.length)  // jewel range: 0-9
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
        if (this._lastW > 0 && this._lastH > 0) {
          this._slashState?.setBarDimensions(this._lastW, this._lastH)
        }
        this._slashState?.tick()
        this._active = this._slashState?.activeSlashes ?? []
        if (this._checkIntersections(this._active)) {
          // onCollision changes slash alpha, so rebuild the list.
          this._active = this._slashState?.activeSlashes ?? []
        }
        this._rippleState?.tick(this._lastW, this._lastH)
        this._borderWaveState?.tick()
        // An unfocused island stops its timer once all motion in flight ends.
        if (
          !this._focused &&
          !this._slashState?.hasSlashes &&
          (this._rippleState?.isIdle ?? true) &&
          !this._borderWaveState?.hasPulses
        ) {
          this.queue_draw()
          this._timerId = 0
          return GLib.SOURCE_REMOVE
        }
        this.queue_draw()
        return GLib.SOURCE_CONTINUE
      })
    }

    /** Returns true when it fired at least one collision. */
    private _checkIntersections(active: readonly ActiveSlash[]): boolean {
      if (!this._slashState || !this._rippleState) return false

      let collided = false
      const backs    = active.filter(s => s.dir === 'back')
      const forwards = active.filter(s => s.dir === 'forward')

      for (const b of backs) {
        for (const f of forwards) {
          // Collisions only between strokes from OPPOSITE waves (cross-wave).
          // Intra-wave pairs (\+/ from same wave) never collide with each other.
          if (b.waveSweepDir === f.waveSweepDir) continue
          // Only collide while both strokes are still drawing in (appear phase).
          if (!b.appearing || !f.appearing) continue

          const minId = Math.min(b.id, f.id)
          const maxId = Math.max(b.id, f.id)
          const key   = `${minId}-${maxId}`

          if (this._triggeredPairs.has(key)) continue

          // Use drawnCx (current visual position) for spatial proximity check.
          const midCx  = (b.drawnCx + f.drawnCx) / 2
          const cxDiff = Math.abs(b.drawnCx - f.drawnCx)
          const cyDiff = Math.abs(b.cy - f.cy)

          if (
            cxDiff < INTERSECT_CX_THRESHOLD &&
            cyDiff < INTERSECT_CY_THRESHOLD &&
            midCx >= INTERSECT_X_MIN && midCx <= INTERSECT_X_MAX
          ) {
            const midCy      = (b.cy + f.cy) / 2
            // Ripple color only from jewel range (excludes slash-only colors at tail of palette)
            const jewelCount = this._gradientColors.length - SLASH_COLORS.length
            const colorIndex = Math.floor(Math.random() * jewelCount)
            this._rippleState.addRipple(midCx, midCy, colorIndex)
            // Trigger border wave pulse at the x-fraction of the collision
            this._borderWaveState?.addPulse(midCx)
            // Reset both slashes to unified collision timing; block their waves
            // until the slashes fully fade before the next wave spawns.
            this._slashState.onCollision(b.id, f.id)
            // Mark these slashes as elevated — rendered above bar children
            this._collidingIds.add(b.id)
            this._collidingIds.add(f.id)
            this._triggeredPairs.add(key)
            collided = true
          }
        }
      }

      // Prune stale pairs / elevated IDs where slashes have retired
      const activeIds = new Set(active.map(s => s.id))
      for (const key of this._triggeredPairs) {
        const [aStr, bStr] = key.split('-')
        if (!activeIds.has(Number(aStr)) || !activeIds.has(Number(bStr))) {
          this._triggeredPairs.delete(key)
        }
      }
      for (const id of this._collidingIds) {
        if (!activeIds.has(id)) this._collidingIds.delete(id)
      }
      return collided
    }

    vfunc_snapshot(snapshot: Gtk.Snapshot): void {
      const w = this.get_width()
      const h = this.get_height()
      this._lastW = w
      this._lastH = h

      if (w > 0 && h > 0) {
        // Expand Cairo clip rect so wave peaks/troughs can draw past widget allocation.
        // Max wave displacement: 1px standing + under 6px pulse, plus 0.25px stroke.
        const bounds = this._overflowBounds(w, h)
        const cr = snapshot.append_cairo(bounds)

        // Read the frame once. The getter builds the frame on each call.
        const frame = this._rippleState?.currentFrame
        let rippleDraws: RippleDraw[] | undefined
        if (frame && this._gradientColors.length > 0) {
          const now   = Date.now()
          rippleDraws = frame.ripples
            .map(r => {
              const age   = now - r.startMs
              const alpha = Math.sqrt(Math.max(0, 1 - age / RIPPLE_LIFE_MS))
              return {
                cx:              r.cx * w,
                cy:              r.cy * h,
                radiusPx:        r.radiusPx,
                colorIndex:      r.colorIndex,
                fromColorIndex:  r.fromColorIndex,
                alpha,
              }
            })
            .filter(r => r.alpha > 0.01)
        }

        // Normal slashes rendered at reduced alpha behind content; colliding slashes
        // are drawn after super.vfunc_snapshot so they composite above text/icons.
        const NORMAL_ALPHA_SCALE = 0.25
        const allSlashes     = this._active
        const normalSlashes  = allSlashes
          .filter(s => !this._collidingIds.has(s.id))
          .map(s => ({ ...s, alpha: s.alpha * NORMAL_ALPHA_SCALE }))

        try {
          drawIslandBackground(
            cr,
            w,
            h,
            this._chamfer,
            this._gradientColors.length > 0 ? this._gradientColors : undefined,
            frame?.gradient,
            rippleDraws,
            normalSlashes,
            this._borderWaveState ?? undefined,
          )
        } finally {
          // append_cairo() transfers a native Cairo context to GJS. Releasing it
          // promptly prevents one native allocation from accumulating per frame.
          ;(cr as any).$dispose?.()
        }

        // Render children (text, icons) first.
        super.vfunc_snapshot(snapshot)

        // Colliding slashes drawn AFTER children — guaranteed above all bar content.
        const collidingSlashes = allSlashes.filter(s => this._collidingIds.has(s.id))
        if (collidingSlashes.length > 0 && this._gradientColors.length > 0) {
          const cr2 = snapshot.append_cairo(bounds)
          try {
            drawElevatedSlashes(cr2, w, h, this._chamfer, collidingSlashes, this._gradientColors)
          } finally {
            ;(cr2 as any).$dispose?.()
          }
        }
      } else {
        super.vfunc_snapshot(snapshot)
      }
    }

    vfunc_unroot(): void {
      this._stopAnimation()
      this._unsubFocus?.()
      this._unsubFocus = null
      this._triggeredPairs.clear()
      this._collidingIds.clear()
      super.vfunc_unroot()
    }
  },
)
