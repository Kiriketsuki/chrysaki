/**
 * Chrysaki Island Background — Cairo drawing utilities.
 *
 * Draws chamfered glass backgrounds with texture overlays inspired by
 * the Ghostty hex-wave shader and AutoConnect HEX-GEO design system.
 *
 * Textures:
 *   - Diagonal hatching (45° lines) — AutoConnect pattern-diagonal
 *   - Hex ring outlines — Ghostty hex grid
 *   - Equilateral triangles at hex vertices — Ghostty tactical triangles
 */
import type { WaveFrame } from "./wave-state"

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

/** Static frame used when no wave animation is active (e.g. BarCenter). */
const DEFAULT_FRAME: WaveFrame = {
  currentColorIndex: 0,
  nextColorIndex: 0,
  waveProgress: 0,
  waveDirection: 1,
  isWaving: false,
}

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
    // Entire right side converges — draw straight to the point
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
 * Draw a sword-slash cluster at position cx, centered vertically.
 *
 * Ports both SVG shapes as Cairo bezier fills, creating an X crossing:
 *
 * SVG 2 (\): Three-layer glowing slash — outer glow + primary strike +
 *            white highlight core. Goes top-left → bottom-right.
 * SVG 1 (/): Two-layer chrome slash — colored outer rim + dark void center.
 *            Goes bottom-left → top-right.
 *
 * Both are drawn at the same cx so they cross, forming an impact mark.
 * Colors are light-variant Chrysaki jewel tones passed from the palette.
 */
function drawSwordSlash(
  cr: any,
  cx: number,
  h: number,
  color: GradientColor,
  alpha: number,
): void {
  const s = h / 200

  // ── Shape 1: \ diagonal (SVG 2 — three-layer glowing slash) ───────────────
  // Shape center at (110, 90) in SVG space → translate to (cx, h/2).
  cr.save()
  cr.translate(cx - 110 * s, h / 2 - 90 * s)

  // Outer glow (secondary strike, emerald-dim equivalent)
  cr.newPath()
  cr.moveTo(10 * s, 30 * s)
  cr.curveTo(60 * s, 70 * s, 110 * s, 120 * s, 170 * s, 190 * s)
  cr.curveTo(100 * s, 130 * s, 50 * s, 80 * s, 10 * s, 30 * s)
  cr.closePath()
  cr.setSourceRGBA(color.r, color.g, color.b, 0.38 * alpha)
  cr.fill()

  // Primary strike (main blade body)
  cr.newPath()
  cr.moveTo(30 * s, 10 * s)
  cr.curveTo(80 * s, 50 * s, 130 * s, 100 * s, 190 * s, 170 * s)
  cr.curveTo(120 * s, 110 * s, 70 * s, 60 * s, 30 * s, 10 * s)
  cr.closePath()
  cr.setSourceRGBA(color.r, color.g, color.b, 0.72 * alpha)
  cr.fill()

  // Bright highlight core (white inset)
  cr.newPath()
  cr.moveTo(35 * s, 15 * s)
  cr.curveTo(80 * s, 55 * s, 125 * s, 100 * s, 185 * s, 165 * s)
  cr.curveTo(120 * s, 105 * s, 75 * s, 60 * s, 35 * s, 15 * s)
  cr.closePath()
  cr.setSourceRGBA(1, 1, 1, 0.28 * alpha)
  cr.fill()

  cr.restore()

  // ── Shape 2: / diagonal (SVG 1 — chrome-edged slash) ─────────────────────
  // Shape center at (100, 100) in SVG space → translate to (cx, h/2).
  cr.save()
  cr.translate(cx - 100 * s, h / 2 - 100 * s)

  // Outer rim (colored blade edge)
  cr.newPath()
  cr.moveTo(15 * s, 185 * s)
  cr.curveTo(70 * s, 110 * s, 120 * s, 60 * s, 185 * s, 15 * s)
  cr.curveTo(110 * s, 80 * s, 60 * s, 130 * s, 15 * s, 185 * s)
  cr.closePath()
  cr.setSourceRGBA(color.r, color.g, color.b, 0.45 * alpha)
  cr.fill()

  // Void core (dark interior — chrome-edge look)
  cr.newPath()
  cr.moveTo(25 * s, 175 * s)
  cr.curveTo(70 * s, 120 * s, 120 * s, 70 * s, 175 * s, 25 * s)
  cr.curveTo(120 * s, 80 * s, 70 * s, 130 * s, 25 * s, 175 * s)
  cr.closePath()
  cr.setSourceRGBA(0, 0, 0, 0.55 * alpha)
  cr.fill()

  cr.restore()
}

/**
 * Draw the base diagonal texture and, during a wave, sword-slash shapes
 * at the wave front using Chrysaki jewel-tone colors.
 *
 * Base: subtle black \ lines at 0.06 alpha (always visible).
 * Wave: SVG-ported \ + / bezier slashes that appear fast (~100ms) then
 *       linger and fade slowly (~1400ms). Colors are the next palette color.
 */
function drawAnimatedHatch(
  cr: any,
  w: number,
  h: number,
  frame: WaveFrame,
  colors?: readonly GradientColor[],
): void {
  // ── Base diagonal texture ──────────────────────────────────────────────────
  const spacing = 8
  const diag = w + h
  for (let d = -h - spacing; d < diag + spacing; d += spacing) {
    cr.setLineWidth(0.6)
    cr.setSourceRGBA(0, 0, 0, 0.06)
    cr.newPath()
    cr.moveTo(d, 0)
    cr.lineTo(d + h, h)
    cr.stroke()
  }

  if (!frame.isWaving || !colors || colors.length === 0) return

  // ── Sword-slash layer (wave front only) ────────────────────────────────────
  // SLASH_SPAN: fraction of waveProgress for slash to fully appear (~100ms at 5s wave).
  // FADE_SPAN:  fraction to fully fade (~1400ms at 5s wave).
  const SLASH_SPAN = 0.02
  const FADE_SPAN  = 0.28

  const slashColor   = colors[frame.nextColorIndex % colors.length]
  const slashSpacing = Math.max(h * 0.85, 30)

  for (let slashX = -h; slashX < w + h; slashX += slashSpacing) {
    const hitNorm     = Math.max(0, Math.min(1, (slashX + 60) / (w + 120)))
    const hitProgress = frame.waveDirection === 1 ? hitNorm : 1 - hitNorm
    const afterHit    = frame.waveProgress - hitProgress
    const afterSlash  = afterHit - SLASH_SPAN

    let alpha = 0
    if (afterHit >= 0 && afterHit < SLASH_SPAN) {
      alpha = (afterHit / SLASH_SPAN) * 0.92
    } else if (afterSlash >= 0 && afterSlash < FADE_SPAN) {
      alpha = 0.92 * (1 - afterSlash / FADE_SPAN)
    }

    if (alpha > 0.01) {
      drawSwordSlash(cr, slashX, h, slashColor, alpha)
    }
  }
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

/**
 * Linearly interpolate between two gradient colors at fraction t (0..1).
 */
function lerpColor(a: GradientColor, b: GradientColor, t: number): GradientColor {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
    a: a.a + (b.a - a.a) * t,
  }
}

/**
 * Draw a wave-driven flat color fill across a chamfered rectangle.
 *
 * Mirrors Ghostty's mix(oldColor, newColor, progress) pattern:
 * — During idle: single fill with colors[currentColorIndex] — cheap, no strips.
 * — During wave: 2px vertical strips blending old→new via smoothstep.
 *
 * Wave center formula matches drawAnimatedHatch for perfect visual sync.
 * Transition half-width of 50px gives a ~100px soft boundary.
 */
function drawWaveColorFill(
  cr: any,
  w: number,
  h: number,
  chamfer: ChamferConfig,
  colors: readonly GradientColor[],
  frame: WaveFrame,
): void {
  if (colors.length === 0) return

  cr.save()
  traceChamferedRect(cr, 0, 0, w, h, chamfer)
  cr.clip()

  if (!frame.isWaving) {
    const c = colors[frame.currentColorIndex % colors.length]
    cr.setSourceRGBA(c.r, c.g, c.b, c.a)
    cr.rectangle(0, 0, w, h)
    cr.fill()
  } else {
    const colorA = colors[frame.currentColorIndex % colors.length]
    const colorB = colors[frame.nextColorIndex % colors.length]
    const rawProgress = frame.waveDirection === 1 ? frame.waveProgress : 1 - frame.waveProgress
    const waveCenter = rawProgress * (w + 120) - 60
    const halfWidth = 50

    const stripWidth = 2
    for (let x = 0; x < w; x += stripWidth) {
      // blend=1: swept side (new color), blend=0: unswept side (old color).
      // Formula flips per direction so "swept" always maps to blend=1.
      // L→R: swept = left of wave → high blend for small x.
      // R→L: swept = right of wave → high blend for large x.
      const raw =
        frame.waveDirection === 1
          ? ((waveCenter + halfWidth) - x) / (2 * halfWidth)
          : (x - (waveCenter - halfWidth)) / (2 * halfWidth)
      const t = Math.max(0, Math.min(1, raw))
      const blend = t * t * (3 - 2 * t)
      const c = lerpColor(colorA, colorB, blend)
      cr.setSourceRGBA(c.r, c.g, c.b, c.a)
      cr.rectangle(x, 0, Math.min(stripWidth, w - x), h)
      cr.fill()
    }
  }

  cr.restore()
}

/**
 * Draw the complete island background: chamfered shape + optional wave-driven
 * gradient + glass fill + diagonal hatch texture.
 */
export function drawIslandBackground(
  cr: any,
  w: number,
  h: number,
  chamfer: ChamferConfig,
  gradientColors?: readonly GradientColor[],
  frame?: WaveFrame,
): void {
  // 1. Trace chamfered rectangle
  traceChamferedRect(cr, 0, 0, w, h, chamfer)

  // 1b. Animated gradient (drawn before glass fill for depth)
  if (gradientColors && gradientColors.length > 0 && frame !== undefined) {
    // Fill base shape first to prevent bleed
    cr.setSourceRGBA(0, 0, 0, 0.3)
    cr.fillPreserve()
    drawWaveColorFill(cr, w, h, chamfer, gradientColors, frame)
    // Re-trace for glass fill
    traceChamferedRect(cr, 0, 0, w, h, chamfer)
  }

  // 2. Glass fill
  cr.setSourceRGBA(1, 1, 1, 0.05)
  cr.fillPreserve()

  // 3. Save path for clipping, then clip
  cr.save()
  traceChamferedRect(cr, 0, 0, w, h, chamfer)
  cr.clip()

  // 4. Draw animated hatching texture inside the clip
  drawAnimatedHatch(cr, w, h, frame ?? DEFAULT_FRAME, gradientColors)

  // 5. Restore (removes clip)
  cr.restore()

  // 6. Border stroke on the chamfered shape
  traceChamferedRect(cr, 0.5, 0.5, w - 1, h - 1, chamfer)
  cr.setSourceRGBA(1, 1, 1, 0.08)
  cr.setLineWidth(1)
  cr.stroke()

  // 7. Shadow (inset-style darkening at edges)
  traceChamferedRect(cr, 0, 0, w, h, chamfer)
  cr.save()
  cr.clip()
  cr.setSourceRGBA(0, 0, 0, 0.15)
  cr.setLineWidth(3)
  traceChamferedRect(cr, -1, -1, w + 2, h + 2, chamfer)
  cr.stroke()
  cr.restore()
}
