import app from "ags/gtk4/app"
import { Astal, Gdk } from "ags/gtk4"
import { TiledBar, type SegmentDef } from "./TiledSegment"
import { ChamferedBar, JEWEL_PALETTE } from "./ChamferedIsland"
import { Battery } from "./Battery"
import { Clock } from "./Clock"
import { ActiveWindow } from "./ActiveWindow"

export function BarLeft(gdkmonitor: Gdk.Monitor) {
  const { TOP, LEFT } = Astal.WindowAnchor

  const segments: readonly SegmentDef[] = [
    {
      widget: <Battery />,
      cssClass: "segment-battery",
    },
    {
      widget: <Clock />,
      cssClass: "segment-clock",
    },
    {
      widget: <ActiveWindow />,
      cssClass: "segment-active-window",
    },
  ]

  return (
    <window
      visible
      name="chrysaki-bar-left"
      namespace="chrysaki-bar-left"
      gdkmonitor={gdkmonitor}
      anchor={TOP | LEFT}
      exclusivity={Astal.Exclusivity.IGNORE}
      marginTop={8}
      marginLeft={8}
      application={app}
    >
      <ChamferedBar
        class="island-left"
        halign={1}
        valign={3}
        $={(self: any) => {
          self.setChamfer({ tl: false, tr: false, bl: true, br: false })
          self.setGradientColors(JEWEL_PALETTE)
        }}
      >
        <TiledBar segments={segments} preset="zigzag" barHeight={26} />
      </ChamferedBar>
    </window>
  )
}
