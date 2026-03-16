import app from "ags/gtk4/app"
import { Astal, Gdk } from "ags/gtk4"
import { TiledBar, type SegmentDef } from "./TiledSegment"
import { ChamferedBar, JEWEL_PALETTE } from "./ChamferedIsland"
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
      widget: <SystemTray />,
      cssClass: "segment-tray",
    },
    {
      widget: <MediaPlayer />,
      cssClass: "segment-media",
    },
    {
      widget: <PulseAudio />,
      cssClass: "segment-volume",
    },
    {
      widget: <Network />,
      cssClass: "segment-network",
    },
    {
      widget: <ServiceStatus />,
      cssClass: "segment-services",
    },
    {
      widget: <NotificationToggle />,
      cssClass: "segment-notifications",
    },
    {
      widget: <PowerMenu />,
      cssClass: "segment-power",
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
        $={(self: any) => {
          self.setChamfer({ tl: false, tr: false, bl: false, br: true })
          self.setGradientColors(JEWEL_PALETTE)
        }}
      >
        <TiledBar segments={segments} preset="zigzag-alt" barHeight={26} />
      </ChamferedBar>
    </window>
  )
}
