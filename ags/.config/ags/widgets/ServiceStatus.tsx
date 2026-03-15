/**
 * ServiceStatus — Cairo hex dots for OV, GitNexus, Ollama, Syncthing health.
 */
import { createComputed } from "ags"
import { createPoll } from "ags/time"
import { drawHexFlat } from "../lib/cairo-hex"
import { hexToRgba } from "../lib/cairo-separator"

interface ServiceDef {
  readonly name: string
  readonly interval: number
  readonly command: string
  readonly healthyHex: string
}

const SERVICES: readonly ServiceDef[] = [
  {
    name: "OV",
    interval: 5000,
    command: "curl -sf http://localhost:7700/health && echo ok || echo fail",
    healthyHex: "#1a8a6a",  // emerald-light
  },
  {
    name: "GitNexus",
    interval: 10000,
    command: "npx gitnexus status --quiet 2>/dev/null && echo ok || echo fail",
    healthyHex: "#20969c",  // teal-light
  },
  {
    name: "Ollama",
    interval: 10000,
    command: "curl -sf http://localhost:11434/api/version && echo ok || echo fail",
    healthyHex: "#583090",  // amethyst-light
  },
  {
    name: "Syncthing",
    interval: 15000,
    command: "systemctl --user is-active syncthing && echo ok || echo fail",
    healthyHex: "#FBB13C",  // blonde
  },
]

const ERROR_HEX = "#8C2F39"  // error

function ServiceDot({ name, interval, command, healthyHex }: ServiceDef) {
  const status = createPoll("fail", interval, ["bash", "-c", command])
  const isOk = createComputed(() => status().trim() === "ok")

  return (
    <box tooltipText={name}>
      {isOk.as((ok: boolean) => (
        <drawingarea
          widthRequest={12}
          heightRequest={10}
          $={(da: any) => {
            const color = hexToRgba(ok ? healthyHex : ERROR_HEX, 1.0)
            da.set_draw_func((_area: any, cr: any, w: number, h: number) => {
              drawHexFlat(cr, w / 2, h / 2, 5, color)
            })
          }}
        />
      ))}
    </box>
  )
}

export function ServiceStatus() {
  return (
    <box class="service-status" spacing={4}>
      {SERVICES.map((svc) => ServiceDot(svc))}
    </box>
  )
}
