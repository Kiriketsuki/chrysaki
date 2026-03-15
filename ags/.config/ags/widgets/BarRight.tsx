import app from "ags/gtk4/app"
import { Astal, Gdk } from "ags/gtk4"
import { TiledBar, type SegmentDef } from "./TiledSegment"
import { ChamferedBar } from "./ChamferedIsland"
import { MediaPlayer } from "./MediaPlayer"
import { PulseAudio } from "./PulseAudio"
import { Network } from "./Network"
import { SystemTray } from "./SystemTray"
import { ServiceStatus } from "./ServiceStatus"
import { NotificationToggle } from "./NotificationToggle"
import { PowerMenu } from "./PowerMenu"

export function BarRight(gdkmonitor: Gdk.Monitor) {
  const { TOP, RIGHT } = Astal.WindowAnchor

  const segments: readonly SegmentDef[] = [
    {
      widget: <MediaPlayer />,
      cssClass: "segment-media",
      bgColor: "#1e1040", // amethyst-dim
      bgAlpha: 0.7,
    },
    {
      widget: <PulseAudio />,
      cssClass: "segment-volume",
      bgColor: "#0c1a40", // blue-dim
      bgAlpha: 0.7,
    },
    {
      widget: <Network />,
      cssClass: "segment-network",
      bgColor: "#0f4f54", // teal-dim
      bgAlpha: 0.7,
    },
    {
      widget: <SystemTray />,
      cssClass: "segment-tray",
      bgColor: "#1c1f2b", // surface
      bgAlpha: 0.7,
    },
    {
      widget: <ServiceStatus />,
      cssClass: "segment-services",
      bgColor: "#252836", // raised
      bgAlpha: 0.7,
    },
    {
      widget: (
        <box spacing={4} valign={3}>
          <NotificationToggle />
          <PowerMenu />
        </box>
      ),
      cssClass: "segment-actions",
      bgColor: "#0e4a38", // emerald-dim
      bgAlpha: 0.7,
    },
  ]

  return (
    <window
      visible
      name="chrysaki-bar-right"
      namespace="chrysaki-bar-right"
      gdkmonitor={gdkmonitor}
      anchor={TOP | RIGHT}
      exclusivity={Astal.Exclusivity.IGNORE}
      marginTop={8}
      marginRight={8}
      application={app}
    >
      <ChamferedBar
        class="island-right"
        halign={2}
        valign={3}
        $={(self: any) =>
          self.setChamfer({ tl: false, tr: true, bl: false, br: true })
        }
      >
        <TiledBar segments={segments} preset="zigzag-alt" barHeight={40} />
      </ChamferedBar>
    </window>
  )
}
