/**
 * TiledBar -- lays out N segments interleaved with Cairo diagonal separators.
 *
 * Uses zigzag-alt preset (S,\) as per ags-bar-spec.md S3.
 * Each separator is a 16px DrawingArea that Cairo-paints the diagonal transition.
 *
 * Segments have transparent backgrounds -- the animated gradient on the
 * ChamferedBar island handles the color. Separators use a fixed
 * text-primary-at-low-alpha color for subtle diagonal dividers.
 */

import { tile, separatorEdges, PRESETS, type Edge } from "../lib/tiling"

export interface SegmentDef {
  readonly widget: JSX.Element
  readonly cssClass: string
}

const SEP_WIDTH = 16

/**
 * Draw a single diagonal line separator (not two filled triangles).
 * The gradient shows through; only a thin line marks the segment boundary.
 */
function drawDiagonalLine(
  cr: any,
  w: number,
  h: number,
  edge: Edge,
): void {
  if (edge === "|") return

  cr.setSourceRGBA(0xe0 / 255, 0xe2 / 255, 0xea / 255, 0.18)
  cr.setLineWidth(1.2)

  if (edge === "\\") {
    cr.moveTo(0, 0)
    cr.lineTo(w, h)
  } else {
    cr.moveTo(0, h)
    cr.lineTo(w, 0)
  }
  cr.stroke()
}

function makeSeparator(edge: Edge, barHeight: number): JSX.Element {
  return (
    <drawingarea
      widthRequest={SEP_WIDTH}
      heightRequest={barHeight}
      $={(self: any) =>
        self.set_draw_func((_area: any, cr: any, w: number, h: number) => {
          drawDiagonalLine(cr, w, h, edge)
        })
      }
    />
  )
}

export function TiledBar({
  segments,
  preset = "zigzag-alt",
  barHeight = 32,
}: {
  segments: readonly SegmentDef[]
  preset?: keyof typeof PRESETS
  barHeight?: number
}) {
  const { firstLeft, firstRight } = PRESETS[preset]
  const elements = tile(firstLeft, firstRight, segments.length)
  const sepEdges = separatorEdges(elements)

  const children: JSX.Element[] = []

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]

    children.push(
      <box class={`segment ${seg.cssClass}`} valign={3}>
        {seg.widget}
      </box>
    )

    if (i < segments.length - 1) {
      const edge = sepEdges[i]
      if (edge !== "|") {
        children.push(makeSeparator(edge, barHeight))
      }
    }
  }

  return (
    <box class="tiled-bar" orientation={0} valign={3}>
      {children}
    </box>
  )
}
