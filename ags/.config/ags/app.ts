import app from "ags/gtk4/app"
import GLib from "gi://GLib?version=2.0"
import { gc } from "system"
import style from "./style.scss"
import { BarLeft } from "./widgets/BarLeft"
import { BarCenter } from "./widgets/BarCenter"
import { BarRight } from "./widgets/BarRight"
import { ServicePanel } from "./widgets/ServiceStatus"
import { MousePanel } from "./widgets/MousePanel"
import { NotificationCenter } from "./widgets/NotificationCenter"
import { NotificationToast } from "./widgets/NotificationToast"

const GC_INTERVAL_S = 30

app.start({
  instanceName: "chrysaki-bar",
  css: style,
  main() {
    app.get_monitors().map((monitor) => {
      BarLeft(monitor)
      BarCenter(monitor)
      BarRight(monitor)
    })
    // Single-instance panels (not per-monitor)
    ServicePanel()
    MousePanel()
    NotificationCenter()
    NotificationToast()

    // SpiderMonkey sees only the small JS heap. It does not see the native memory
    // behind the GTK, Graphene and cairo wrappers that the bar creates on every
    // frame. gjs collects on its own only after RSS grows by a quarter, and glibc
    // keeps the freed heap, so RSS climbs in steps for days. A collection every
    // 30 s keeps that native garbage small.
    GLib.timeout_add_seconds(GLib.PRIORITY_LOW, GC_INTERVAL_S, () => {
      gc()
      return GLib.SOURCE_CONTINUE
    })
  },
})
