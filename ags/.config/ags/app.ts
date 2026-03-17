import app from "ags/gtk4/app"
import style from "./style.scss"
import { BarLeft } from "./widgets/BarLeft"
import { BarCenter } from "./widgets/BarCenter"
import { BarRight } from "./widgets/BarRight"
import { ServicePanel } from "./widgets/ServiceStatus"

app.start({
  instanceName: "chrysaki-bar",
  css: style,
  main() {
    app.get_monitors().map((monitor) => {
      BarLeft(monitor)
      BarCenter(monitor)
      BarRight(monitor)
    })
    // Service toggle panel (single instance, not per-monitor)
    ServicePanel()
  },
})
