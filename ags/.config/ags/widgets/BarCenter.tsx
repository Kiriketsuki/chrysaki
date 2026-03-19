import app from "ags/gtk4/app"
import { Astal, Gdk } from "ags/gtk4"
import { ChamferedBar } from "./ChamferedIsland"
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
      <ChamferedBar
        class="island-center"
        halign={3}
        valign={3}
        $={(self: any) =>
          self.setChamfer({ tl: true, tr: true, bl: true, br: true })
        }
      >
        <WorkspaceIndicator gdkmonitor={gdkmonitor} />
      </ChamferedBar>
    </window>
  )
}
