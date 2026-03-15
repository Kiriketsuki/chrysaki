/**
 * TiledBar — lays out N segments interleaved with Cairo diagonal separators.
 *
 * Uses zigzag-alt preset (S,\) as per ags-bar-spec.md §3.
 * Each separator is a 16px DrawingArea that Cairo-paints the diagonal transition.
 */

import { tile, separatorEdges, PRESETS, type Edge } from "../lib/tiling"
import { drawSeparator, hexToRgba, type RGBA } from "../lib/cairo-separator"

export interface SegmentDef {
  readonly widget: JSX.Element
  readonly cssClass: string
  /** Hex color (#RRGGBB) of this segment's background for separator drawing */
  readonly bgColor: string
  readonly bgAlpha: number
}

const SEP_WIDTH = 16

function makeSeparator(edge: Edge, leftColor: RGBA, rightColor: RGBA, barHeight: number): JSX.Element {
  return (
    <drawingarea
      widthRequest={SEP_WIDTH}
      heightRequest={barHeight}
      $={(self: any) =>
        self.set_draw_func((_area: any, cr: any, w: number, h: number) => {
          drawSeparator(cr, w, h, edge, leftColor, rightColor)
        })
      }
    />
  )
}

export function TiledBar({
  segments,
  preset = "zigzag-alt",
  barHeight = 40,
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
        const leftRgba = hexToRgba(seg.bgColor, seg.bgAlpha)
        const rightRgba = hexToRgba(segments[i + 1].bgColor, segments[i + 1].bgAlpha)
        children.push(makeSeparator(edge, leftRgba, rightRgba, barHeight))
      }
    }
  }

  return (
    <box class="tiled-bar" orientation={0} valign={3}>
      {children}
    </box>
  )
}
