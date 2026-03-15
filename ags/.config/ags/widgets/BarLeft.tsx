import app from "ags/gtk4/app"
import { Astal, Gdk } from "ags/gtk4"
import { TiledBar, type SegmentDef } from "./TiledSegment"
import { Battery } from "./Battery"
import { Clock } from "./Clock"
import { ActiveWindow } from "./ActiveWindow"

export function BarLeft(gdkmonitor: Gdk.Monitor) {
  const { TOP, LEFT } = Astal.WindowAnchor

  const segments: readonly SegmentDef[] = [
    {
      widget: <Battery />,
      cssClass: "segment-battery",
      bgColor: "#C4861C", // blonde-dim
      bgAlpha: 0.5,
    },
    {
      widget: <Clock />,
      cssClass: "segment-clock",
      bgColor: "#0f4f54", // teal-dim
      bgAlpha: 0.7,
    },
    {
      widget: <ActiveWindow />,
      cssClass: "segment-active-window",
      bgColor: "#0e4a38", // emerald-dim
      bgAlpha: 0.7,
    },
  ]

  return (
    <window
      visible
      name="chrysaki-bar-left"
      namespace="chrysaki-bar-left"
      gdkmonitor={gdkmonitor}
      anchor={TOP | LEFT}
      exclusivity={Astal.Exclusivity.NORMAL}
      marginTop={8}
      marginLeft={8}
      application={app}
    >
      <box class="island island-left" halign={1} valign={3}>
        <TiledBar segments={segments} preset="zigzag-alt" barHeight={40} />
      </box>
    </window>
  )
}
