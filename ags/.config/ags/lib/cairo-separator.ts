/**
 * Chrysaki Cairo Separator
 *
 * Draws diagonal color transitions between tiling segments.
 * Mirrors the Nerd Font powerline glyph approach used in the tmux port,
 * but using Cairo triangles instead of glyphs.
 *
 * Edge semantics:
 *   "\" (BACK)    — diagonal top-left to bottom-right
 *                   lower-left triangle = leftColor
 *                   upper-right triangle = rightColor
 *   "/" (FORWARD) — diagonal bottom-left to top-right
 *                   upper-left triangle = leftColor
 *                   lower-right triangle = rightColor
 *   "|" (STRAIGHT) — no-op, should not be called
 */

import { type Edge } from "./tiling"

export type RGBA = readonly [number, number, number, number]

/**
 * Parse a CSS hex color string (#RRGGBB or #RRGGBBAA) into [r, g, b, a] 0-1 range.
 */
export function hexToRgba(hex: string, alpha = 1.0): RGBA {
  const h = hex.replace("#", "")
  const r = parseInt(h.substring(0, 2), 16) / 255
  const g = parseInt(h.substring(2, 4), 16) / 255
  const b = parseInt(h.substring(4, 6), 16) / 255
  const a = h.length === 8 ? parseInt(h.substring(6, 8), 16) / 255 : alpha
  return [r, g, b, a]
}

/**
 * Draw a diagonal separator using Cairo.
 *
 * @param cr      Cairo context
 * @param width   Width of the drawing area (px)
 * @param height  Height of the drawing area (px)
 * @param edge    "/" or "\" — the diagonal direction
 * @param leftColor  RGBA of the left segment
 * @param rightColor RGBA of the right segment
 */
export function drawSeparator(
  cr: any,
  width: number,
  height: number,
  edge: Edge,
  leftColor: RGBA,
  rightColor: RGBA,
): void {
  if (edge === "|") return

  const [lr, lg, lb, la] = leftColor
  const [rr, rg, rb, ra] = rightColor

  if (edge === "\\") {
    // BACK diagonal: top-left to bottom-right
    // Lower-left triangle (left color)
    cr.newPath()
    cr.moveTo(0, 0)
    cr.lineTo(0, height)
    cr.lineTo(width, height)
    cr.closePath()
    cr.setSourceRGBA(lr, lg, lb, la)
    cr.fill()

    // Upper-right triangle (right color)
    cr.newPath()
    cr.moveTo(0, 0)
    cr.lineTo(width, 0)
    cr.lineTo(width, height)
    cr.closePath()
    cr.setSourceRGBA(rr, rg, rb, ra)
    cr.fill()
  } else {
    // FORWARD diagonal: bottom-left to top-right
    // Upper-left triangle (left color)
    cr.newPath()
    cr.moveTo(0, 0)
    cr.lineTo(0, height)
    cr.lineTo(width, 0)
    cr.closePath()
    cr.setSourceRGBA(lr, lg, lb, la)
    cr.fill()

    // Lower-right triangle (right color)
    cr.newPath()
    cr.moveTo(0, height)
    cr.lineTo(width, height)
    cr.lineTo(width, 0)
    cr.closePath()
    cr.setSourceRGBA(rr, rg, rb, ra)
    cr.fill()
  }
}
