import app from "ags/gtk4/app"
import { Astal, Gdk } from "ags/gtk4"
import { WorkspaceIndicator } from "./WorkspaceIndicator"

export function BarCenter(gdkmonitor: Gdk.Monitor) {
  const { TOP } = Astal.WindowAnchor

  return (
    <window
      visible
      name="chrysaki-bar-center"
      namespace="chrysaki-bar-center"
      gdkmonitor={gdkmonitor}
      anchor={TOP}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      marginTop={8}
      application={app}
    >
      <box class="island island-center" halign={3} valign={3}>
        <WorkspaceIndicator />
      </box>
    </window>
  )
}
