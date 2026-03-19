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
import { BorderWaveState } from './border-wave-state'
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

const CUT = 12 // chamfer cut size in pixels

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
  readonly cx: number         // meeting point (normalised 0..1) — where pair converges
  readonly drawnCx: number    // current visual position (normalised); use this for rendering
  readonly cy: number         // normalised 0..1 along bar height
  readonly dir: 'back' | 'forward'
  readonly type: 'glow' | 'wind' | 'diamond' | 'lightning'
  readonly alpha: number
  readonly colorIndex: number
}

/**
 * Descriptor for a radial ripple to render. Uses pixel coords.
 * alpha: lifecycle decay (0..1), pre-computed by caller via sqrt falloff.
 * fromColorIndex: gradient base color at ripple spawn — ring color lerps toward colorIndex.
 */
export interface RippleDraw {
  readonly cx: number           // pixel x
  readonly cy: number           // pixel y
  readonly radiusPx: number
  readonly colorIndex: number   // target ripple color
  readonly fromColorIndex: number  // color at spawn — used for smooth lerp
  readonly alpha: number        // 0..1 — lifecycle decay
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
    // Jewel body — width ≈21 units (CP offset ±10 from spine)
    cr.newPath()
    cr.moveTo(20 * s, 180 * s)
    cr.curveTo(50 * s, 110 * s, 130 * s, 50 * s, 180 * s, 20 * s)
    cr.curveTo(150 * s, 70 * s, 70 * s, 130 * s, 20 * s, 180 * s)
    cr.closePath()
    cr.setSourceRGBA(color.r, color.g, color.b, 0.85 * alpha)
    cr.fill()

    // White core — width ≈7 units (CP offset ±3 from spine)
    cr.newPath()
    cr.moveTo(20 * s, 180 * s)
    cr.curveTo(57 * s, 117 * s, 137 * s, 57 * s, 180 * s, 20 * s)
    cr.curveTo(143 * s, 63 * s, 63 * s, 123 * s, 20 * s, 180 * s)
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
  withSlashTransform(cr, cx, cy, h, 100, 100, dir, 'forward', (cr, s) => {
    // Outer trailing wind — width ≈28 units (CP offset ±13 from spine)
    cr.newPath()
    cr.moveTo(20 * s, 180 * s)
    cr.curveTo(47 * s, 107 * s, 127 * s, 47 * s, 180 * s, 20 * s)
    cr.curveTo(153 * s, 73 * s, 73 * s, 133 * s, 20 * s, 180 * s)
    cr.closePath()
    cr.setSourceRGBA(color.r, color.g, color.b, 0.45 * alpha)
    cr.fill()

    // Mid streak — width ≈21 units (CP offset ±10 from spine)
    cr.newPath()
    cr.moveTo(20 * s, 180 * s)
    cr.curveTo(50 * s, 110 * s, 130 * s, 50 * s, 180 * s, 20 * s)
    cr.curveTo(150 * s, 70 * s, 70 * s, 130 * s, 20 * s, 180 * s)
    cr.closePath()
    cr.setSourceRGBA(color.r, color.g, color.b, 0.80 * alpha)
    cr.fill()

    // Razor white core — width ≈7 units (CP offset ±3 from spine)
    cr.newPath()
    cr.moveTo(20 * s, 180 * s)
    cr.curveTo(57 * s, 117 * s, 137 * s, 57 * s, 180 * s, 20 * s)
    cr.curveTo(143 * s, 63 * s, 63 * s, 123 * s, 20 * s, 180 * s)
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
    // Jewel body — width ≈21 units (CP offset ±10 from spine)
    cr.newPath()
    cr.moveTo(20 * s, 180 * s)
    cr.curveTo(50 * s, 110 * s, 130 * s, 50 * s, 180 * s, 20 * s)
    cr.curveTo(150 * s, 70 * s, 70 * s, 130 * s, 20 * s, 180 * s)
    cr.closePath()
    cr.setSourceRGBA(color.r, color.g, color.b, 0.85 * alpha)
    cr.fill()

    // Black void core — width ≈7 units (CP offset ±3 from spine)
    cr.newPath()
    cr.moveTo(20 * s, 180 * s)
    cr.curveTo(57 * s, 117 * s, 137 * s, 57 * s, 180 * s, 20 * s)
    cr.curveTo(143 * s, 63 * s, 63 * s, 123 * s, 20 * s, 180 * s)
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
    // Secondary trailing strike — width ≈14 units, offset from primary
    // For \ slash: perpendicular is (+d,-d)/(−d,+d). Spine CPs: (63,87),(112,137).
    cr.newPath()
    cr.moveTo(15 * s, 40 * s)
    cr.curveTo(70 * s, 83 * s, 119 * s, 133 * s, 160 * s, 190 * s)
    cr.curveTo(105 * s, 147 * s, 56 * s, 97 * s, 15 * s, 40 * s)
    cr.closePath()
    cr.setSourceRGBA(color.r, color.g, color.b, 0.45 * alpha)
    cr.fill()

    // Primary strike — width ≈21 units (CP offset ±10 from spine (80,70),(130,120))
    cr.newPath()
    cr.moveTo(30 * s, 20 * s)
    cr.curveTo(90 * s, 60 * s, 140 * s, 110 * s, 180 * s, 170 * s)
    cr.curveTo(120 * s, 130 * s, 70 * s, 80 * s, 30 * s, 20 * s)
    cr.closePath()
    cr.setSourceRGBA(color.r, color.g, color.b, 0.90 * alpha)
    cr.fill()

    // White core — width ≈7 units (CP offset ±3 from spine)
    cr.newPath()
    cr.moveTo(30 * s, 20 * s)
    cr.curveTo(83 * s, 67 * s, 133 * s, 117 * s, 180 * s, 170 * s)
    cr.curveTo(127 * s, 123 * s, 77 * s, 73 * s, 30 * s, 20 * s)
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
    const pixelX = slash.drawnCx * w
    const pixelY = slash.cy * h
    renderer(cr, pixelX, pixelY, h, color, slash.alpha, slash.dir)
  }
}

/**
 * Draw the wave gradient base fill and smooth radial ripple overlays inside a clipped region.
 *
 * Base: animated sine-wave gradient blending jewel tones (drifts over time).
 * Ripples: smooth shockwave rings expanding from slash intersection points.
 *
 * Each ripple uses a cairo.RadialGradient for a continuous, banding-free ring:
 *   transparent core → Gaussian peak at wave front → transparent outer glow.
 * Ring color lerps from fromColorIndex toward colorIndex over the ripple lifetime.
 * Birth flash is jewel-toned (not white) for coherence with the palette.
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

  // Always clip to chamfered rect — the wave border is a stroke-only effect.
  // Clipping to the wavy path would cause troughs to eat into island content.
  cr.save()
  traceChamferedRect(cr, 0, 0, w, h, chamfer)
  cr.clip()

  // Wave gradient base fill
  drawWaveGradientFill(cr, w, h, colors, gradientFrame)

  if (ripples.length === 0) {
    cr.restore()
    return
  }

  const PEAK      = 0.95  // leading ring alpha before lifecycle decay
  const N_RINGS   = 5     // number of concentric echo rings
  const RING_W    = 2     // px: solid body of each ring (thin = sharp)
  const RING_EDGE = 1     // px: minimal anti-alias blend — nearly hard edge
  const RING_GAP  = 14    // px: center-to-center spacing between rings

  for (const ripple of ripples) {
    if (ripple.radiusPx <= 0 || ripple.alpha <= 0) continue

    const life = ripple.alpha   // 0..1 lifecycle decay from sqrt falloff

    // Color lerp: from spawn color → target color over ripple lifetime
    const lerpT  = 1 - life
    const cFrom  = colors[ripple.fromColorIndex % colors.length]
    const cTo    = colors[ripple.colorIndex    % colors.length]
    const c: GradientColor = {
      r: cFrom.r + (cTo.r - cFrom.r) * lerpT,
      g: cFrom.g + (cTo.g - cFrom.g) * lerpT,
      b: cFrom.b + (cTo.b - cFrom.b) * lerpT,
      a: cFrom.a + (cTo.a - cFrom.a) * lerpT,
    }

    const peakA = PEAK * life

    // Hard concentric rings: leading ring at r, echo rings spaced RING_GAP px behind
    for (let i = 0; i < N_RINGS; i++) {
      const ringR = ripple.radiusPx - i * RING_GAP
      if (ringR <= 0) continue

      // Exponential alpha falloff per echo ring (0=1.0, 1=0.65, 2=0.42 ...)
      const ringA = peakA * Math.pow(0.65, i)
      if (ringA < 0.01) continue

      // RadialGradient spans only the ring band: innerR → outerR
      // 2px soft blend at each edge gives anti-alias look without blurring the circle
      const innerR = Math.max(0, ringR - RING_W / 2 - RING_EDGE)
      const outerR = ringR + RING_W / 2 + RING_EDGE
      const span   = outerR - innerR
      const eT     = RING_EDGE / span  // fraction of span occupied by one soft edge

      const pat = new cairo.RadialGradient(ripple.cx, ripple.cy, innerR, ripple.cx, ripple.cy, outerR)
      pat.addColorStopRGBA(0,       c.r, c.g, c.b, 0)      // soft inner fade in
      pat.addColorStopRGBA(eT,      c.r, c.g, c.b, ringA)  // hard inner edge
      pat.addColorStopRGBA(1 - eT,  c.r, c.g, c.b, ringA)  // hard outer edge
      pat.addColorStopRGBA(1,       c.r, c.g, c.b, 0)      // soft outer fade out
      cr.setSource(pat)
      cr.arc(ripple.cx, ripple.cy, outerR, 0, 2 * Math.PI)
      cr.fill()
    }

    // Birth flash — jewel-toned radial glow at origin (r < 20px)
    if (ripple.radiusPx < 20) {
      const birthT   = 1 - ripple.radiusPx / 20
      const flashRad = Math.max(1, ripple.radiusPx * 0.55)
      const flash    = new cairo.RadialGradient(ripple.cx, ripple.cy, 0, ripple.cx, ripple.cy, flashRad)
      flash.addColorStopRGBA(0.0, c.r, c.g, c.b, birthT * 0.75 * life)
      flash.addColorStopRGBA(1.0, c.r, c.g, c.b, 0)
      cr.setSource(flash)
      cr.arc(ripple.cx, ripple.cy, flashRad, 0, 2 * Math.PI)
      cr.fill()
    }
  }

  cr.restore()
}

// ── Perimeter helpers for sine wave border ──────────────────────────────────

/**
 * Build the ordered vertex list of a chamfered rectangle at [0, 0, w, h].
 * Follows the same winding order as traceChamferedRect (clockwise in screen coords).
 */
function buildChamferedVertices(
  w: number,
  h: number,
  c: ChamferConfig,
): Array<[number, number]> {
  const verts: Array<[number, number]> = []
  const midY = h / 2

  // Start vertex
  if (c.pointLeft) {
    verts.push([0, midY])
  } else if (c.tl) {
    verts.push([CUT, 0])
  } else {
    verts.push([0, 0])
  }

  // Top-right
  if (c.pointRight) {
    verts.push([w, midY])
  } else if (c.tr) {
    verts.push([w - CUT, 0])
    verts.push([w, CUT])
  } else {
    verts.push([w, 0])
  }

  // Right side + bottom-right (skip when pointRight)
  if (!c.pointRight) {
    if (c.br) {
      verts.push([w, h - CUT])
      verts.push([w - CUT, h])
    } else {
      verts.push([w, h])
    }
  }

  // Bottom-left
  if (!c.pointLeft) {
    if (c.bl) {
      verts.push([CUT, h])
      verts.push([0, h - CUT])
    } else {
      verts.push([0, h])
    }
  }

  // TL closing vertex
  if (!c.pointLeft && c.tl) {
    verts.push([0, CUT])
  }

  return verts
}

/**
 * Trace the wavy island perimeter onto the Cairo context (path only, no stroke/fill).
 *
 * Each perimeter point is displaced outward (peaks) or inward (troughs) perpendicular
 * to the edge. Displacement is keyed on xNorm = pixelX / w (NOT perimeter arc length),
 * so top and bottom edges at the same x share the same spatial phase. This produces
 * vertically-aligned oval loops — peaks on top directly above peaks on bottom.
 *
 * Positive displacement = outward. Negative = inward (on the island surface — never
 * clips content because fill/clip always uses traceChamferedRect).
 */
function traceSineWavePath(
  cr: any,
  w: number,
  h: number,
  chamfer: ChamferConfig,
  borderWave: BorderWaveState,
): void {
  const verts = buildChamferedVertices(w, h, chamfer)
  if (verts.length < 2) return

  const STEP = 2
  cr.newPath()
  let started = false

  for (let i = 0; i < verts.length; i++) {
    const [x1, y1] = verts[i]
    const [x2, y2] = verts[(i + 1) % verts.length]
    const dx = x2 - x1
    const dy = y2 - y1
    const segLen = Math.hypot(dx, dy)
    if (segLen <= 0) continue

    // Outward normal for clockwise path in screen coords: N = (dy/len, -dx/len)
    const nx = dy / segLen
    const ny = -dx / segLen

    let segDist = 0
    while (segDist < segLen) {
      const px = x1 + (dx / segLen) * segDist
      const py = y1 + (dy / segLen) * segDist
      // x-position normalized to island width — same value for top and bottom at
      // the same horizontal position, so peaks align vertically into oval loops
      const xNorm = Math.max(0, Math.min(1, px / w))
      const disp  = borderWave.displacementAt(xNorm, w)

      if (!started) { cr.moveTo(px + nx * disp, py + ny * disp); started = true }
      else           { cr.lineTo(px + nx * disp, py + ny * disp) }

      segDist += STEP
    }

    // Segment endpoint — avoids gaps at corners
    const xNormEnd = Math.max(0, Math.min(1, x2 / w))
    const dispEnd  = borderWave.displacementAt(xNormEnd, w)
    cr.lineTo(x2 + nx * dispEnd, y2 + ny * dispEnd)
  }

  cr.closePath()
}

/**
 * Trace the island outline — wavy when borderWave is present, chamfered rect otherwise.
 * Used as the fill/clip path for all island drawing operations.
 */
function traceIslandPath(
  cr: any,
  w: number,
  h: number,
  chamfer: ChamferConfig,
  borderWave?: BorderWaveState,
): void {
  if (borderWave) {
    traceSineWavePath(cr, w, h, chamfer, borderWave)
  } else {
    traceChamferedRect(cr, 0, 0, w, h, chamfer)
  }
}

/**
 * Stroke a thin white highlight along the wavy island edge.
 * The fill edge IS the visual border — this just adds a subtle polish line.
 */
function drawSineWaveBorder(
  cr: any,
  w: number,
  h: number,
  chamfer: ChamferConfig,
  borderWave: BorderWaveState,
): void {
  traceSineWavePath(cr, w, h, chamfer, borderWave)
  cr.setSourceRGBA(0, 0, 0, 0.70)
  cr.setLineWidth(0.5)
  cr.stroke()
}

/**
 * Draw colliding slashes above all other island content (called after child snapshot).
 * Clips to the chamfered island shape so slashes don't bleed outside the island,
 * but because this runs after super.vfunc_snapshot the slashes appear on top of
 * children (text labels, icons, etc.).
 */
export function drawElevatedSlashes(
  cr: any,
  w: number,
  h: number,
  chamfer: ChamferConfig,
  slashes: readonly SlashDraw[],
  colors: readonly GradientColor[],
): void {
  if (slashes.length === 0 || colors.length === 0) return
  cr.save()
  traceChamferedRect(cr, 0, 0, w, h, chamfer)
  cr.clip()
  drawSlashLayer(cr, w, h, slashes, colors)
  cr.restore()
}

/**
 * Draw the complete island background:
 *   chamfered shape → dark base → wave gradient fill → ripples → glass fill → slash layer → border → shadow.
 *
 * gradientFrame: when provided, animates the background with a sine-wave jewel gradient.
 *   Omit for static islands (e.g. center workspace island).
 * borderWaveState: when provided, replaces the flat border with an animated sine wave border
 *   that pulses on collisions. When absent, falls back to a flat 1px white highlight.
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
  borderWaveState?: BorderWaveState,
): void {
  // Fill/clip operations always use the clean chamfered rect so that the wave
  // border (which can displace inward or outward) never cuts into island content.
  // The wave lives exclusively on the border stroke drawn in step 4.

  // 1. Base dark fill
  traceChamferedRect(cr, 0, 0, w, h, chamfer)

  // 1b. Wave gradient + ripple fill (drawn before glass fill for depth)
  if (gradientColors && gradientColors.length > 0 && gradientFrame !== undefined) {
    cr.setSourceRGBA(0, 0, 0, 0.85)
    cr.fillPreserve()
    drawRadialRippleFill(cr, w, h, chamfer, gradientColors, gradientFrame, ripples ?? [])
    traceChamferedRect(cr, 0, 0, w, h, chamfer)
  } else {
    // Static islands (no wave animation) — Abyss dark base so the island is readable
    cr.setSourceRGBA(0.059, 0.067, 0.090, 0.90)  // #0f1117 at 90% opacity
    cr.fillPreserve()
  }

  // 2. Glass fill
  cr.setSourceRGBA(1, 1, 1, 0.05)
  cr.fillPreserve()

  // 3. Slash layer — clipped to chamfered rect
  cr.save()
  traceChamferedRect(cr, 0, 0, w, h, chamfer)
  cr.clip()
  drawSlashLayer(cr, w, h, slashes ?? [], gradientColors ?? [])
  cr.restore()

  // 4. Border: wave stroke when borderWaveState set, flat highlight otherwise.
  // The wave stroke is the ONLY place displacement is applied — it extends
  // outward (past the bar edge) or inward (on the island surface) as the
  // standing wave oscillates, without affecting any fill geometry.
  if (borderWaveState) {
    drawSineWaveBorder(cr, w, h, chamfer, borderWaveState)
  } else {
    traceChamferedRect(cr, 0.5, 0.5, w - 1, h - 1, chamfer)
    cr.setSourceRGBA(0, 0, 0, 0.70)
    cr.setLineWidth(1)
    cr.stroke()
  }

  // 5. Shadow — inset darkening, always chamfered rect clip
  cr.save()
  traceChamferedRect(cr, 0, 0, w, h, chamfer)
  cr.clip()
  cr.setSourceRGBA(0, 0, 0, 0.15)
  cr.setLineWidth(3)
  traceChamferedRect(cr, 0, 0, w, h, chamfer)
  cr.stroke()
  cr.restore()
}
