import app from "ags/gtk4/app"
import { Astal, Gdk } from "ags/gtk4"
import { TiledBar, type SegmentDef } from "./TiledSegment"
import { MediaPlayer } from "./MediaPlayer"
import { PulseAudio } from "./PulseAudio"
import { Network } from "./Network"
import { SystemTray } from "./SystemTray"
import { ServiceStatus } from "./ServiceStatus"
import { NotificationToggle } from "./NotificationToggle"
import { WallpaperButton } from "./WallpaperButton"
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
      bgColor: "#1c1f2b", // surface
      bgAlpha: 0.7,
    },
    {
      widget: <NotificationToggle />,
      cssClass: "segment-notifications",
      bgColor: "#0e4a38", // emerald-dim
      bgAlpha: 0.7,
    },
    {
      widget: <WallpaperButton />,
      cssClass: "segment-wallpaper",
      bgColor: "#0f4f54", // teal-dim
      bgAlpha: 0.7,
    },
    {
      widget: <PowerMenu />,
      cssClass: "segment-power",
      bgColor: "#8C2F39", // error
      bgAlpha: 0.6,
    },
  ]

  return (
    <window
      visible
      name="chrysaki-bar-right"
      namespace="chrysaki-bar-right"
      gdkmonitor={gdkmonitor}
      anchor={TOP | RIGHT}
      exclusivity={Astal.Exclusivity.NORMAL}
      marginTop={8}
      marginRight={8}
      application={app}
    >
      <box class="island island-right" halign={2} valign={3}>
        <TiledBar segments={segments} preset="zigzag-alt" barHeight={40} />
      </box>
    </window>
  )
}
