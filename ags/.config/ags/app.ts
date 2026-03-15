import app from "ags/gtk4/app"
import style from "./style.scss"
import { Bar } from "./widgets/Bar"

app.start({
  instanceName: "chrysaki-bar",
  css: style,
  main() {
    app.get_monitors().map(Bar)
  },
})
