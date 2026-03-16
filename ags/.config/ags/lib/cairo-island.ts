/**
 * Chrysaki Island Background — Cairo drawing utilities.
 *
 * Draws chamfered glass backgrounds with texture overlays:
 *   - Animated wave gradient fill (sine-blended jewel tones, drifts over time)
 *   - Radial color ripples (expand from slash intersection points)
 *   - Autonomous sword-slash overlays (4 types: glow, wind, diamond, lightning)
 */
import cairo from 'cairo'
import type { GradientFrame, GradientStop } from './wave-state'
export type { GradientFrame, GradientStop }

export interface ChamferConfig {
  readonly tl: boolean
  readonly tr: boolean
  readonly bl: boolean
  readonly br: boolean
  /** Collapse the entire left edge to a center point (x, h/2). Overrides tl/bl. */
  readonly pointLeft?: boolean
  /** Collapse the entire right edge to a center point (x+w, h/2). Overrides tr/br. */
  readonly pointRight?: boolean
}

const CUT = 8 // chamfer cut size in pixels

/**
 * Trace a chamfered rectangle path on the Cairo context.
 * When pointLeft/pointRight are set, that side converges to a single
 * center point — the powerline-style pointed island tip.
 * Does NOT fill or stroke — caller decides.
 */
export function traceChamferedRect(
  cr: any,
  x: number,
  y: number,
  w: number,
  h: number,
  chamfer: ChamferConfig,
): void {
  cr.newPath()

  const midY = y + h / 2

  // ── Start: top-left corner or left point ──────────────────────────────────
  if (chamfer.pointLeft) {
    cr.moveTo(x, midY)
  } else if (chamfer.tl) {
    cr.moveTo(x + CUT, y)
  } else {
    cr.moveTo(x, y)
  }

  // ── Top edge → top-right corner or right point ───────────────────────────
  if (chamfer.pointRight) {
    cr.lineTo(x + w, midY)
  } else if (chamfer.tr) {
    cr.lineTo(x + w - CUT, y)
    cr.lineTo(x + w, y + CUT)
  } else {
    cr.lineTo(x + w, y)
  }

  // ── Bottom-right corner (skip when pointRight — already at the tip) ───────
  if (!chamfer.pointRight) {
    if (chamfer.br) {
      cr.lineTo(x + w, y + h - CUT)
      cr.lineTo(x + w - CUT, y + h)
    } else {
      cr.lineTo(x + w, y + h)
    }
  }

  // ── Bottom-left corner or return to left point ────────────────────────────
  if (chamfer.pointLeft) {
    cr.lineTo(x, midY)
  } else if (chamfer.bl) {
    cr.lineTo(x + CUT, y + h)
    cr.lineTo(x, y + h - CUT)
  } else {
    cr.lineTo(x, y + h)
  }

  // ── Back to top-left start (only for non-pointed, chamfered TL) ──────────
  if (!chamfer.pointLeft && chamfer.tl) {
    cr.lineTo(x, y + CUT)
  }

  cr.closePath()
}

/**
 * Descriptor for a slash event to render.
 * Matches ActiveSlash from wave-state.ts (structural typing) but keeps
 * cairo-island.ts free of wave-state imports.
 */
export interface SlashDraw {
  readonly cx: number         // normalised 0..1 along bar width
  readonly cy: number         // normalised 0..1 along bar height
  readonly dir: 'back' | 'forward'
  readonly type: 'glow' | 'wind' | 'diamond' | 'lightning'
  readonly alpha: number
  readonly colorIndex: number
}

/**
 * Descriptor for a radial ripple to render. Uses pixel coords.
 * alpha: lifecycle decay (0..1), pre-computed by caller via sqrt falloff.
 */
export interface RippleDraw {
  readonly cx: number       // pixel x
  readonly cy: number       // pixel y
  readonly radiusPx: number
  readonly colorIndex: number
  readonly alpha: number    // 0..1 — multiplied onto all ring alphas
}

/**
 * RGBA gradient color stop.
 */
export interface GradientColor {
  readonly r: number
  readonly g: number
  readonly b: number
  readonly a: number
}

// ── Transform helper ─────────────────────────────────────────────────────────

/**
 * Apply translate + optional horizontal mirror to draw a slash in any direction.
 *
 * @param canonicalDir  The direction the shape was designed for.
 * @param dir           The direction to actually render.
 * When dir !== canonicalDir, the shape is horizontally mirrored around cx.
 */
function withSlashTransform(
  cr: any,
  cx: number,
  cy: number,
  h: number,
  shapeCenterX: number,
  shapeCenterY: number,
  dir: 'back' | 'forward',
  canonicalDir: 'back' | 'forward',
  drawFn: (cr: any, s: number) => void,
): void {
  const s = h / 200
  cr.save()
  cr.translate(cx, cy)
  if (dir !== canonicalDir) cr.scale(-1, 1)
  cr.translate(-shapeCenterX * s, -shapeCenterY * s)
  drawFn(cr, s)
  cr.restore()
}

// ── Per-type slash renderers ────────────────────────────────────────────────

/** / clean slash — jewel body + white core. Canonical direction: forward (/). */
function drawSlashGlow(
  cr: any,
  cx: number,
  cy: number,
  h: number,
  color: GradientColor,
  alpha: number,
  dir: 'back' | 'forward',
): void {
  withSlashTransform(cr, cx, cy, h, 100, 100, dir, 'forward', (cr, s) => {
    cr.newPath()
    cr.moveTo(20 * s, 180 * s)
    cr.curveTo(60 * s, 120 * s, 140 * s, 60 * s, 180 * s, 20 * s)
    cr.curveTo(132 * s, 68 * s, 52 * s, 128 * s, 20 * s, 180 * s)
    cr.closePath()
    cr.setSourceRGBA(color.r, color.g, color.b, 0.85 * alpha)
    cr.fill()

    cr.newPath()
    cr.moveTo(22 * s, 178 * s)
    cr.curveTo(60 * s, 122 * s, 138 * s, 62 * s, 178 * s, 22 * s)
    cr.curveTo(134 * s, 66 * s, 56 * s, 126 * s, 22 * s, 178 * s)
    cr.closePath()
    cr.setSourceRGBA(1, 1, 1, 0.75 * alpha)
    cr.fill()
  })
}

/** / triple-layer wind slash — outer trail → mid streak → white razor edge. Canonical direction: forward (/). */
function drawSlashWind(
  cr: any,
  cx: number,
  cy: number,
  h: number,
  color: GradientColor,
  alpha: number,
  dir: 'back' | 'forward',
): void {
  withSlashTransform(cr, cx, cy, h, 100, 88, dir, 'forward', (cr, s) => {
    // Outer trailing wind
    cr.newPath()
    cr.moveTo(15 * s, 160 * s)
    cr.curveTo(60 * s, 100 * s, 140 * s, 60 * s, 185 * s, 15 * s)
    cr.curveTo(135 * s, 70 * s, 65 * s, 110 * s, 15 * s, 160 * s)
    cr.closePath()
    cr.setSourceRGBA(color.r, color.g, color.b, 0.55 * alpha)
    cr.fill()

    // Mid-layer streak
    cr.newPath()
    cr.moveTo(18 * s, 157 * s)
    cr.curveTo(62 * s, 102 * s, 138 * s, 62 * s, 182 * s, 18 * s)
    cr.curveTo(135 * s, 68 * s, 65 * s, 108 * s, 18 * s, 157 * s)
    cr.closePath()
    cr.setSourceRGBA(color.r, color.g, color.b, 0.80 * alpha)
    cr.fill()

    // Razor white inner edge
    cr.newPath()
    cr.moveTo(21 * s, 154 * s)
    cr.curveTo(64 * s, 104 * s, 136 * s, 64 * s, 179 * s, 21 * s)
    cr.curveTo(135 * s, 66 * s, 65 * s, 106 * s, 21 * s, 154 * s)
    cr.closePath()
    cr.setSourceRGBA(1, 1, 1, 0.90 * alpha)
    cr.fill()
  })
}

/** / void-core slash — jewel outer rim, black hollow centre. Canonical direction: forward (/). */
function drawSlashDiamond(
  cr: any,
  cx: number,
  cy: number,
  h: number,
  color: GradientColor,
  alpha: number,
  dir: 'back' | 'forward',
): void {
  withSlashTransform(cr, cx, cy, h, 100, 100, dir, 'forward', (cr, s) => {
    cr.newPath()
    cr.moveTo(20 * s, 180 * s)
    cr.curveTo(70 * s, 110 * s, 110 * s, 70 * s, 180 * s, 20 * s)
    cr.curveTo(104 * s, 76 * s, 64 * s, 116 * s, 20 * s, 180 * s)
    cr.closePath()
    cr.setSourceRGBA(color.r, color.g, color.b, 0.85 * alpha)
    cr.fill()

    // Black void core
    cr.newPath()
    cr.moveTo(22 * s, 178 * s)
    cr.curveTo(70 * s, 112 * s, 112 * s, 70 * s, 178 * s, 22 * s)
    cr.curveTo(106 * s, 74 * s, 66 * s, 114 * s, 22 * s, 178 * s)
    cr.closePath()
    cr.setSourceRGBA(0, 0, 0, 0.90 * alpha)
    cr.fill()
  })
}

/** \ double-strike slash — dim secondary + bright primary + white core. Canonical direction: back (\). */
function drawSlashLightning(
  cr: any,
  cx: number,
  cy: number,
  h: number,
  color: GradientColor,
  alpha: number,
  dir: 'back' | 'forward',
): void {
  withSlashTransform(cr, cx, cy, h, 100, 100, dir, 'back', (cr, s) => {
    // Secondary trailing strike
    cr.newPath()
    cr.moveTo(15 * s, 40 * s)
    cr.curveTo(65 * s, 90 * s, 115 * s, 140 * s, 160 * s, 190 * s)
    cr.curveTo(112 * s, 143 * s, 62 * s, 93 * s, 15 * s, 40 * s)
    cr.closePath()
    cr.setSourceRGBA(color.r, color.g, color.b, 0.45 * alpha)
    cr.fill()

    // Primary strike
    cr.newPath()
    cr.moveTo(30 * s, 20 * s)
    cr.curveTo(80 * s, 70 * s, 130 * s, 120 * s, 180 * s, 170 * s)
    cr.curveTo(127 * s, 123 * s, 77 * s, 73 * s, 30 * s, 20 * s)
    cr.closePath()
    cr.setSourceRGBA(color.r, color.g, color.b, 0.90 * alpha)
    cr.fill()

    // White core
    cr.newPath()
    cr.moveTo(31 * s, 21 * s)
    cr.curveTo(80 * s, 71 * s, 129 * s, 121 * s, 179 * s, 169 * s)
    cr.curveTo(128 * s, 122 * s, 78 * s, 72 * s, 31 * s, 21 * s)
    cr.closePath()
    cr.setSourceRGBA(1, 1, 1, 0.75 * alpha)
    cr.fill()
  })
}

// ── Slash dispatch lookup ────────────────────────────────────────────────────

type SlashRenderer = (
  cr: any, cx: number, cy: number, h: number,
  color: GradientColor, alpha: number, dir: 'back' | 'forward',
) => void

const SLASH_RENDERERS: Record<string, SlashRenderer> = {
  glow:      drawSlashGlow,
  wind:      drawSlashWind,
  diamond:   drawSlashDiamond,
  lightning: drawSlashLightning,
}

// ── Wave gradient ─────────────────────────────────────────────────────────────

/**
 * Fill the current clipped region with a radial gradient centered on the island.
 * Radius equals the island width — main color blooms from the center, supplementary
 * color sits at the edges. Cross-fades between color pairs over 800ms on collision.
 */
function drawWaveGradientFill(
  cr: any,
  w: number,
  h: number,
  colors: readonly GradientColor[],
  frame: GradientFrame,
): void {
  if (colors.length === 0 || frame.stops.length === 0) return

  const { stops, fromStops, transitionT } = frame

  // Resolve the two color stops (main=0, supplementary=1)
  const getC = (list: readonly GradientStop[], i: number): GradientColor =>
    colors[list[Math.min(i, list.length - 1)].colorIndex % colors.length]

  // Lerp between fromStops and stops by transitionT
  function lerpColor(from: GradientColor, to: GradientColor, t: number): GradientColor {
    return {
      r: from.r + (to.r - from.r) * t,
      g: from.g + (to.g - from.g) * t,
      b: from.b + (to.b - from.b) * t,
      a: from.a + (to.a - from.a) * t,
    }
  }

  const t = transitionT
  const main = lerpColor(getC(fromStops, 0), getC(stops, 0), t)
  const supp = lerpColor(getC(fromStops, 1), getC(stops, 1), t)

  const cx = w / 2
  const cy = h / 2
  const radius = w  // island width as radius

  const pat = new cairo.RadialGradient(cx, cy, 0, cx, cy, radius)
  pat.addColorStopRGBA(0.0, main.r, main.g, main.b, main.a * 1.3)  // centre: punchy
  pat.addColorStopRGBA(1.0, supp.r, supp.g, supp.b, supp.a * 0.6)  // edge: fades

  cr.setSource(pat)
  cr.rectangle(0, 0, w, h)
  cr.fill()
}

// ── Composite drawing functions ──────────────────────────────────────────────

/**
 * Draw the base diagonal texture and slash overlays inside a clipped region.
 *
 * Base: subtle black \ lines at 0.06 alpha (always visible).
 * Slashes: dispatched by type to the per-type renderers.
 */
function drawSlashLayer(
  cr: any,
  w: number,
  h: number,
  slashes: readonly SlashDraw[],
  colors: readonly GradientColor[],
): void {
  if (slashes.length === 0 || colors.length === 0) return

  // ── Slash dispatch ─────────────────────────────────────────────────────────
  for (const slash of slashes) {
    const renderer = SLASH_RENDERERS[slash.type]
    if (!renderer) continue
    const color  = colors[slash.colorIndex % colors.length]
    const pixelX = slash.cx * w
    const pixelY = slash.cy * h
    renderer(cr, pixelX, pixelY, h, color, slash.alpha, slash.dir)
  }
}

/**
 * Draw the wave gradient base fill and radial ripple overlays inside a clipped region.
 *
 * Base: animated sine-wave gradient blending 3-5 jewel tones (drifts over time).
 * Ripples: shockwave rings expanding from slash intersection points.
 *
 * Each ripple ring: transparent at center, peak alpha at wave front, soft outer glow.
 * A white birth flash appears at origin while the ring is young.
 * Overall alpha decays over the ripple lifetime (pre-computed by caller).
 *
 * Technique: stroked arcs (not fills) avoid the disc-overwrite problem.
 */
function drawRadialRippleFill(
  cr: any,
  w: number,
  h: number,
  chamfer: ChamferConfig,
  colors: readonly GradientColor[],
  gradientFrame: GradientFrame,
  ripples: readonly RippleDraw[],
): void {
  if (colors.length === 0) return

  cr.save()
  traceChamferedRect(cr, 0, 0, w, h, chamfer)
  cr.clip()

  // Wave gradient base fill
  drawWaveGradientFill(cr, w, h, colors, gradientFrame)

  if (ripples.length === 0) {
    cr.restore()
    return
  }

  const PEAK    = 0.85  // wave-front alpha before lifecycle decay
  const RING_W  = 50    // px: inner gradient from wave front inward
  const OUTER_S = 28    // px: outer glow past the wave front
  const STROKE  = 1     // px per ring band — fine steps for smooth gradient

  for (const ripple of ripples) {
    if (ripple.radiusPx <= 0 || ripple.alpha <= 0) continue
    const c      = colors[ripple.colorIndex % colors.length]
    const r      = ripple.radiusPx
    const life   = ripple.alpha          // 0..1 lifecycle decay
    const peakA  = PEAK * life

    // Birth flash — white fill at origin while ring is very young (r < 18px)
    if (r < 18) {
      const birthT = 1 - r / 18          // 1.0 at birth → 0.0 at r=18
      cr.newPath()
      cr.arc(ripple.cx, ripple.cy, r * 0.4, 0, 2 * Math.PI)
      cr.setSourceRGBA(1, 1, 1, birthT * 0.65 * life)
      cr.fill()
    }

    // Outer glow — fades from peakA outward to 0
    for (let off = OUTER_S; off > 0; off -= STROKE) {
      const t      = off / OUTER_S
      const smooth = t * t * (3 - 2 * t)
      cr.newPath()
      cr.arc(ripple.cx, ripple.cy, r + off, 0, 2 * Math.PI)
      cr.setLineWidth(STROKE)
      cr.setSourceRGBA(c.r, c.g, c.b, peakA * (1 - smooth))
      cr.stroke()
    }

    // Wave front — peak alpha, slightly thicker ring
    cr.newPath()
    cr.arc(ripple.cx, ripple.cy, r, 0, 2 * Math.PI)
    cr.setLineWidth(STROKE + 1)
    cr.setSourceRGBA(c.r, c.g, c.b, peakA)
    cr.stroke()

    // Inner gradient — fades from peakA at wave front back to base alpha
    for (let off = STROKE; off < RING_W && r - off > 0; off += STROKE) {
      const t      = off / RING_W
      const smooth = t * t * (3 - 2 * t)
      const a      = c.a * life + (peakA - c.a * life) * (1 - smooth)
      cr.newPath()
      cr.arc(ripple.cx, ripple.cy, r - off, 0, 2 * Math.PI)
      cr.setLineWidth(STROKE)
      cr.setSourceRGBA(c.r, c.g, c.b, a)
      cr.stroke()
    }
  }

  cr.restore()
}

/**
 * Draw the complete island background:
 *   chamfered shape → dark base → wave gradient fill → ripples → glass fill → slash layer → border → shadow.
 *
 * gradientFrame: when provided, animates the background with a sine-wave jewel gradient.
 *   Omit for static islands (e.g. center workspace island).
 */
export function drawIslandBackground(
  cr: any,
  w: number,
  h: number,
  chamfer: ChamferConfig,
  gradientColors?: readonly GradientColor[],
  gradientFrame?: GradientFrame,
  ripples?: readonly RippleDraw[],
  slashes?: readonly SlashDraw[],
): void {
  // 1. Trace chamfered rectangle
  traceChamferedRect(cr, 0, 0, w, h, chamfer)

  // 1b. Wave gradient + ripple fill (drawn before glass fill for depth)
  if (gradientColors && gradientColors.length > 0 && gradientFrame !== undefined) {
    cr.setSourceRGBA(0, 0, 0, 0.3)
    cr.fillPreserve()
    drawRadialRippleFill(cr, w, h, chamfer, gradientColors, gradientFrame, ripples ?? [])
    traceChamferedRect(cr, 0, 0, w, h, chamfer)
  }

  // 2. Glass fill
  cr.setSourceRGBA(1, 1, 1, 0.05)
  cr.fillPreserve()

  // 3. Clip and draw slash layer
  cr.save()
  traceChamferedRect(cr, 0, 0, w, h, chamfer)
  cr.clip()
  drawSlashLayer(cr, w, h, slashes ?? [], gradientColors ?? [])
  cr.restore()

  // 4. Border stroke
  traceChamferedRect(cr, 0.5, 0.5, w - 1, h - 1, chamfer)
  cr.setSourceRGBA(1, 1, 1, 0.08)
  cr.setLineWidth(1)
  cr.stroke()

  // 5. Shadow (inset-style darkening at edges)
  traceChamferedRect(cr, 0, 0, w, h, chamfer)
  cr.save()
  cr.clip()
  cr.setSourceRGBA(0, 0, 0, 0.15)
  cr.setLineWidth(3)
  traceChamferedRect(cr, -1, -1, w + 2, h + 2, chamfer)
  cr.stroke()
  cr.restore()
}
