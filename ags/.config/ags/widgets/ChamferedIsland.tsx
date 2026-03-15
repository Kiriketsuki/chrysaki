/**
 * ChamferedBar — GObject widget extending Gtk.Box with a Cairo-drawn
 * chamfered background. Renders glass fill, hex grid, diagonal hatching,
 * border, and inset shadow behind children via vfunc_snapshot.
 *
 * Usage in JSX:
 *   <ChamferedBar
 *     class="island-left"
 *     $={(self) => self.setChamfer({ tl: true, tr: false, bl: true, br: false })}
 *   >
 *     {children}
 *   </ChamferedBar>
 */
import GObject from "gi://GObject"
import Gtk from "gi://Gtk?version=4.0"
import Graphene from "gi://Graphene?version=1.0"
import { drawIslandBackground, type ChamferConfig } from "../lib/cairo-island"

const DEFAULT_CHAMFER: ChamferConfig = Object.freeze({
  tl: false,
  tr: false,
  bl: false,
  br: false,
})

export const ChamferedBar = GObject.registerClass(
  { GTypeName: "ChrysaChamferedBar" },
  class ChamferedBar extends Gtk.Box {
    private _chamfer: ChamferConfig = DEFAULT_CHAMFER

    setChamfer(chamfer: ChamferConfig): void {
      this._chamfer = Object.freeze({ ...chamfer })
      this.queue_draw()
    }

    vfunc_snapshot(snapshot: Gtk.Snapshot): void {
      const w = this.get_width()
      const h = this.get_height()

      if (w > 0 && h > 0) {
        const bounds = new Graphene.Rect()
        bounds.init(0, 0, w, h)
        const cr = snapshot.append_cairo(bounds)
        drawIslandBackground(cr, w, h, this._chamfer)
      }

      // Render children on top of the Cairo background
      super.vfunc_snapshot(snapshot)
    }
  },
)
