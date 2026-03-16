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
 * Draw animated diagonal hatching with a wave that flips line direction.
 *
 * Default: 45° lines (\). When the WaveFrame is active, the wave center
 * sweeps across in frame.waveDirection. Lines near the wave flip to /
 * and brighten, then settle back after the wave passes.
 */
function drawAnimatedHatch(cr: any, w: number, h: number, frame: WaveFrame): void {
  const spacing = 7
  const diag = w + h

  // Wave center in pixel-space — offscreen (-60) during idle
  let waveCenter: number
  if (frame.isWaving) {
    const rawProgress = frame.waveDirection === 1 ? frame.waveProgress : 1 - frame.waveProgress
    waveCenter = rawProgress * (w + 120) - 60
  } else {
    waveCenter = -60
  }

  // Per-line timing: each line slashes itself when the wave front reaches it.
  // SLASH_SPAN: fraction of waveProgress for a line to fully extend (~150ms).
  // FADE_SPAN:  fraction to fade back to rest (~200ms).
  const SLASH_SPAN = 0.06
  const FADE_SPAN  = 0.08

  for (let d = -h - spacing; d < diag + spacing; d += spacing) {
    const lineX = d + h * 0.5

    // When does the wave front reach this line? Normalised to [0,1].
    const hitNorm = Math.max(0, Math.min(1, (lineX + 60) / (w + 120)))
    // R→L flips: rightmost lines get hit first when wave comes from the right.
    const hitProgress = frame.waveDirection === 1 ? hitNorm : 1 - hitNorm

    let alpha         = 0.08
    let lineWidth     = 0.8
    let drawSlash     = false
    let slashFraction = 1   // portion of the line segment drawn (0=none, 1=full)

    if (frame.isWaving) {
      const afterHit   = frame.waveProgress - hitProgress
      const afterSlash = afterHit - SLASH_SPAN

      if (afterHit >= 0 && afterHit < SLASH_SPAN) {
        // Extending: line draws itself from tip toward tail
        const p  = afterHit / SLASH_SPAN
        drawSlash     = true
        slashFraction = p
        alpha         = 0.88 * p
        lineWidth     = 0.8 + 3.0 * p
      } else if (afterSlash >= 0 && afterSlash < FADE_SPAN) {
        // Fading: fully drawn, bleeding back to rest
        const p  = afterSlash / FADE_SPAN
        drawSlash     = true
        slashFraction = 1
        alpha         = 0.88 - 0.80 * p
        lineWidth     = 3.8 - 3.0 * p
      }
    }

    cr.setLineWidth(lineWidth)
    cr.setSourceRGBA(0, 0, 0, alpha)
    cr.newPath()

    if (drawSlash) {
      // Slash direction /: grows from top-right corner toward bottom-left
      cr.moveTo(d + h, 0)
      cr.lineTo(d + h - h * slashFraction, h * slashFraction)
    } else {
      // Resting direction \
      cr.moveTo(d, 0)
      cr.lineTo(d + h, h)
    }
    cr.stroke()
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
  drawAnimatedHatch(cr, w, h, frame ?? DEFAULT_FRAME)

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
