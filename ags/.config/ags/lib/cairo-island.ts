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

export interface ChamferConfig {
  readonly tl: boolean
  readonly tr: boolean
  readonly bl: boolean
  readonly br: boolean
}

const CUT = 8 // chamfer cut size in pixels

/**
 * Trace a chamfered rectangle path on the Cairo context.
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

  // Top-left
  if (chamfer.tl) {
    cr.moveTo(x + CUT, y)
  } else {
    cr.moveTo(x, y)
  }

  // Top-right
  if (chamfer.tr) {
    cr.lineTo(x + w - CUT, y)
    cr.lineTo(x + w, y + CUT)
  } else {
    cr.lineTo(x + w, y)
  }

  // Bottom-right
  if (chamfer.br) {
    cr.lineTo(x + w, y + h - CUT)
    cr.lineTo(x + w - CUT, y + h)
  } else {
    cr.lineTo(x + w, y + h)
  }

  // Bottom-left
  if (chamfer.bl) {
    cr.lineTo(x + CUT, y + h)
    cr.lineTo(x, y + h - CUT)
  } else {
    cr.lineTo(x, y + h)
  }

  // Back to top-left
  if (chamfer.tl) {
    cr.lineTo(x, y + CUT)
  }

  cr.closePath()
}

/**
 * Draw diagonal hatching lines at 45° angle.
 * Clipped to the current path — call traceChamferedRect first, then cr.clip().
 */
function drawDiagonalHatch(cr: any, w: number, h: number): void {
  const spacing = 8
  const diag = w + h
  cr.setLineWidth(0.5)
  cr.setSourceRGBA(1, 1, 1, 0.04) // very subtle white lines

  for (let d = -h; d < diag; d += spacing) {
    cr.moveTo(d, 0)
    cr.lineTo(d + h, h)
  }
  cr.stroke()
}

/**
 * Draw a flat-top hexagon ring (outline only) centered at (cx, cy).
 */
function drawHexRing(cr: any, cx: number, cy: number, radius: number): void {
  cr.newPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i
    const px = cx + radius * Math.cos(angle)
    const py = cy + radius * Math.sin(angle)
    if (i === 0) cr.moveTo(px, py)
    else cr.lineTo(px, py)
  }
  cr.closePath()
  cr.stroke()
}

/**
 * Draw an equilateral triangle (pointing up or down) centered at (cx, cy).
 */
function drawTriangle(
  cr: any,
  cx: number,
  cy: number,
  size: number,
  pointUp: boolean,
): void {
  const h = size * 0.866 // height = size * sqrt(3)/2
  const dir = pointUp ? -1 : 1
  cr.newPath()
  cr.moveTo(cx, cy + dir * h * 0.667) // apex
  cr.lineTo(cx - size / 2, cy - dir * h * 0.333) // bottom-left
  cr.lineTo(cx + size / 2, cy - dir * h * 0.333) // bottom-right
  cr.closePath()
  cr.stroke()
}

/**
 * Draw hex grid with triangles at vertices — Ghostty-inspired texture.
 * Clipped to current path.
 */
function drawHexGridTexture(cr: any, w: number, h: number): void {
  const cellSize = 24 // smaller than Ghostty's 120px — scaled for 40px bar
  const hexR = cellSize * 0.43

  // Hex ring outlines
  cr.setLineWidth(0.5)
  cr.setSourceRGBA(1, 1, 1, 0.03)

  const rowH = cellSize * 0.866
  const cols = Math.ceil(w / cellSize) + 1
  const rows = Math.ceil(h / rowH) + 1

  for (let row = -1; row <= rows; row++) {
    for (let col = -1; col <= cols; col++) {
      const cx = col * cellSize + (row % 2 === 0 ? 0 : cellSize * 0.5)
      const cy = row * rowH
      drawHexRing(cr, cx, cy, hexR)
    }
  }

  // Small triangles at hex vertices — Ghostty tactical triangles
  cr.setLineWidth(0.4)
  cr.setSourceRGBA(1, 1, 1, 0.025)
  const triSize = 3

  for (let row = -1; row <= rows; row++) {
    for (let col = -1; col <= cols; col++) {
      const cx = col * cellSize + (row % 2 === 0 ? 0 : cellSize * 0.5)
      const cy = row * rowH

      // Place triangles at each hex vertex (6 vertices)
      for (let v = 0; v < 6; v++) {
        const angle = (Math.PI / 3) * v
        const vx = cx + hexR * Math.cos(angle)
        const vy = cy + hexR * Math.sin(angle)
        drawTriangle(cr, vx, vy, triSize, v % 2 === 0)
      }
    }
  }
}

/**
 * Draw the complete island background: chamfered shape + glass fill + textures.
 */
export function drawIslandBackground(
  cr: any,
  w: number,
  h: number,
  chamfer: ChamferConfig,
): void {
  // 1. Trace chamfered rectangle
  traceChamferedRect(cr, 0, 0, w, h, chamfer)

  // 2. Glass fill
  cr.setSourceRGBA(1, 1, 1, 0.05)
  cr.fillPreserve()

  // 3. Save path for clipping, then clip
  cr.save()
  traceChamferedRect(cr, 0, 0, w, h, chamfer)
  cr.clip()

  // 4. Draw textures inside the clip
  drawDiagonalHatch(cr, w, h)
  drawHexGridTexture(cr, w, h)

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
