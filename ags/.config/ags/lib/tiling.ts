/**
 * Chrysaki Tiling Engine — TypeScript port of tools/tiling.py
 *
 * Generates trapezoid tiling sequences for the AGS bar using
 * the Cairo separator approach (no CSS clip-path in GTK4).
 */

export type Edge = "|" | "/" | "\\"

export interface TileElement {
  readonly left: Edge
  readonly right: Edge
}

const OPPOSITE: Record<Edge, Edge> = {
  "/":  "\\",
  "\\": "/",
  "|":  "|",
}

export function opposite(e: Edge): Edge {
  return OPPOSITE[e]
}

/**
 * Generate a tiling strip of N elements.
 *
 * Algorithm (from TILING.md §4):
 *   N=1 : [(firstLeft, |)]
 *   N>1 : element 1      = (firstLeft, firstRight)
 *          element i (mid) = (prev.right, opposite(prev.right))
 *          element N (last) = (prev.right, |)
 */
export function tile(firstLeft: Edge, firstRight: Edge, n: number): readonly TileElement[] {
  if (n <= 0) return []
  if (n === 1) return [{ left: firstLeft, right: "|" }]

  const elements: TileElement[] = []
  elements.push({ left: firstLeft, right: firstRight })

  for (let i = 1; i < n - 1; i++) {
    const prevRight = elements[elements.length - 1].right
    elements.push({ left: prevRight, right: opposite(prevRight) })
  }

  const prevRight = elements[elements.length - 1].right
  elements.push({ left: prevRight, right: "|" })

  return elements
}

/**
 * Extract the N-1 separator edges between adjacent segments.
 * Returns the shared edge between segment i and segment i+1
 * (which equals element[i].right = element[i+1].left).
 *
 * Only returns "/" and "\" separators — "|" means flat boundary, no separator drawn.
 */
export function separatorEdges(elements: readonly TileElement[]): readonly Edge[] {
  const edges: Edge[] = []
  for (let i = 0; i < elements.length - 1; i++) {
    edges.push(elements[i].right)
  }
  return edges
}

// Presets (matching tools/tiling.py PRESETS)
export const PRESETS = {
  "zigzag":     { firstLeft: "|" as Edge, firstRight: "/" as Edge },
  "zigzag-alt": { firstLeft: "|" as Edge, firstRight: "\\" as Edge },
  "chevron":    { firstLeft: "/" as Edge, firstRight: "/" as Edge },
  "flat":       { firstLeft: "|" as Edge, firstRight: "|" as Edge },
}
