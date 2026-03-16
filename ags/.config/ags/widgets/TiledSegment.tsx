/**
 * TiledBar -- lays out N segments interleaved with Cairo diagonal separators.
 *
 * Uses zigzag-alt preset (S,\) as per ags-bar-spec.md S3.
 * Each separator is a 16px DrawingArea that Cairo-paints the diagonal transition.
 *
 * Separator color is mathematically derived from the jewel palette:
 *   1. Compute the expected effective background = Base blended with avg jewel at palette alpha
 *   2. Lerp 50% toward white to lift the color into readable range
 * This gives a muted jewel-tinted grey that contrasts with the dark glass without using
 * white or any hardcoded color.
 */

import { tile, separatorEdges, PRESETS, type Edge } from "../lib/tiling"
import { JEWEL_PALETTE } from "./ChamferedIsland"

export interface SegmentDef {
  readonly widget: JSX.Element
  readonly cssClass: string
}

const SEP_WIDTH = 16

/**
 * Derive the separator stroke color from the jewel palette.
 *
 * Steps:
 *   1. Average all jewel colors into a single representative jewel tone
 *   2. Blend it over the Chrysaki Base (#161821) at palette alpha (0.35)
 *      → effective background color at the separator
 *   3. Lerp 50% toward white to lift it into perceptually readable range
 *
 * Result: a muted jewel-tinted grey (~#8E98A1) that reads as a theme-appropriate
 * divider on the dark glass surface, derived purely from palette math.
 */
function deriveContrastColor(): [number, number, number] {
  // Chrysaki Base surface color
  const base = { r: 0x16 / 255, g: 0x18 / 255, b: 0x21 / 255 }

  // Average of all jewel light variants
  const avg = JEWEL_PALETTE.reduce(
    (acc, c) => ({
      r: acc.r + c.r / JEWEL_PALETTE.length,
      g: acc.g + c.g / JEWEL_PALETTE.length,
      b: acc.b + c.b / JEWEL_PALETTE.length,
    }),
    { r: 0, g: 0, b: 0 },
  )

  // Blend jewel over base at the palette's own alpha (0.35)
  const a = 0.35
  const bg = {
    r: base.r * (1 - a) + avg.r * a,
    g: base.g * (1 - a) + avg.g * a,
    b: base.b * (1 - a) + avg.b * a,
  }

  // Lerp 50% toward white to land in readable mid-tone range
  const lift = 0.5
  return [
    bg.r + lift * (1 - bg.r),
    bg.g + lift * (1 - bg.g),
    bg.b + lift * (1 - bg.b),
  ]
}

const [SEP_R, SEP_G, SEP_B] = deriveContrastColor()

function drawDiagonalLine(cr: any, w: number, h: number, edge: Edge): void {
  if (edge === "|") return

  cr.setSourceRGBA(SEP_R, SEP_G, SEP_B, 0.65)
  cr.setLineWidth(1.5)
  cr.setDash([3, 4], 0)

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
