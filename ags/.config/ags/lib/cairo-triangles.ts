/**
 * Chrysaki Cairo Triangles — draws small alternating up/down equilateral
 * triangles stacked vertically as workspace pip separators.
 */

/**
 * Draw 3 small alternating up/down equilateral triangles stacked vertically.
 *
 * @param cr     Cairo context
 * @param w      Drawing area width (px)
 * @param h      Drawing area height (px)
 * @param r      Red component (0-1)
 * @param g      Green component (0-1)
 * @param b      Blue component (0-1)
 * @param a      Alpha component (0-1)
 */
export function drawTriangleSeparator(
  cr: any,
  w: number,
  h: number,
  r: number,
  g: number,
  b: number,
  a: number,
): void {
  const triSize = 3.5 // side length of each equilateral triangle
  const triHeight = triSize * (Math.sqrt(3) / 2)
  const count = 3
  const totalHeight = count * triHeight + (count - 1) * 1.5 // 1.5px gap between triangles
  const startY = (h - totalHeight) / 2
  const cx = w / 2

  cr.setSourceRGBA(r, g, b, a)

  for (let i = 0; i < count; i++) {
    const topY = startY + i * (triHeight + 1.5)

    // All triangles point down
    cr.newPath()
    cr.moveTo(cx - triSize / 2, topY)
    cr.lineTo(cx + triSize / 2, topY)
    cr.lineTo(cx, topY + triHeight)
    cr.closePath()
    cr.fill()
  }
}
