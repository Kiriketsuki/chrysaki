/**
 * Chrysaki Cairo Hex — flat-top hexagon drawing utility.
 *
 * Flat-top hexagon: horizontal top and bottom edges, pointed left and right.
 * Vertices at angles 0°, 60°, 120°, 180°, 240°, 300° from center
 * in screen coordinates (Y increases downward).
 */

import { type RGBA } from "./cairo-separator"

/**
 * Draw a filled flat-top hexagon at (cx, cy) with circumradius `radius`.
 *
 * @param cr      Cairo context
 * @param cx      Center x
 * @param cy      Center y
 * @param radius  Circumradius (center to vertex), in pixels
 * @param rgba    Fill color as [r, g, b, a] in 0-1 range
 */
export function drawHexFlat(
  cr: any,
  cx: number,
  cy: number,
  radius: number,
  rgba: RGBA,
): void {
  const [r, g, b, a] = rgba
  cr.newPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i  // 0, π/3, 2π/3, π, 4π/3, 5π/3
    const x = cx + radius * Math.cos(angle)
    const y = cy + radius * Math.sin(angle)
    if (i === 0) cr.moveTo(x, y)
    else cr.lineTo(x, y)
  }
  cr.closePath()
  cr.setSourceRGBA(r, g, b, a)
  cr.fill()
}
