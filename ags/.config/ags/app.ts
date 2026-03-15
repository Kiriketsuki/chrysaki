import app from "ags/gtk4/app"
import style from "./style.scss"
import { BarLeft } from "./widgets/BarLeft"
import { BarCenter } from "./widgets/BarCenter"
import { BarRight } from "./widgets/BarRight"

app.start({
  instanceName: "chrysaki-bar",
  css: style,
  main() {
    app.get_monitors().map((monitor) => {
      BarLeft(monitor)
      BarCenter(monitor)
      BarRight(monitor)
    })
  },
})
