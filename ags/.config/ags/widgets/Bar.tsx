import app from "ags/gtk4/app"
import { Astal, Gdk } from "ags/gtk4"
import { TiledBar, type SegmentDef } from "./TiledSegment"
import { WorkspaceIndicator } from "./WorkspaceIndicator"
import { SystemTray } from "./SystemTray"
import { MediaPlayer } from "./MediaPlayer"
import { Network } from "./Network"
import { Clock } from "./Clock"
import { ServiceStatus } from "./ServiceStatus"
import { Battery } from "./Battery"
import { PowerMenu } from "./PowerMenu"

export function Bar(gdkmonitor: Gdk.Monitor) {
  const { TOP } = Astal.WindowAnchor

  // Segments defined inside Bar() so JSX evaluates within the window's
  // reactive scope, not at module load time.
  const segments: readonly SegmentDef[] = [
    {
      widget: <WorkspaceIndicator />,
      cssClass: "segment-workspaces",
      bgColor: "#0e4a38", // emerald-dim
      bgAlpha: 0.4,
    },
    {
      widget: <SystemTray />,
      cssClass: "segment-tray",
      bgColor: "#1c1f2b", // surface
      bgAlpha: 0.5,
    },
    {
      widget: <MediaPlayer />,
      cssClass: "segment-media",
      bgColor: "#1e1040", // amethyst-dim
      bgAlpha: 0.4,
    },
    {
      widget: <Network />,
      cssClass: "segment-network",
      bgColor: "#0c1a40", // royal-blue-dim
      bgAlpha: 0.4,
    },
    {
      widget: <Clock />,
      cssClass: "segment-clock",
      bgColor: "#0f4f54", // teal-dim
      bgAlpha: 0.4,
    },
    {
      widget: <ServiceStatus />,
      cssClass: "segment-services",
      bgColor: "#1c1f2b", // surface
      bgAlpha: 0.5,
    },
    {
      widget: <Battery />,
      cssClass: "segment-battery",
      bgColor: "#C4861C", // blonde-dim
      bgAlpha: 0.2,
    },
    {
      widget: <PowerMenu />,
      cssClass: "segment-power",
      bgColor: "#8C2F39", // error
      bgAlpha: 0.3,
    },
  ]

  return (
    <window
      visible
      name="chrysaki-bar"
      namespace="chrysaki-bar"
      gdkmonitor={gdkmonitor}
      anchor={TOP}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      marginTop={8}
      application={app}
    >
      <box class="island" halign={3} valign={3}>
        <TiledBar segments={segments} />
      </box>
    </window>
  )
}
