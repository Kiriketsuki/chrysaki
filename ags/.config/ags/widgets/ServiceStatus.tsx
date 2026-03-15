/**
 * ServiceStatus — micro hexagon dots for OV, GitNexus, Ollama, Syncthing health.
 * Uses createPoll to query each service at different intervals.
 */
import { createComputed } from "ags"
import { createPoll } from "ags/time"

interface ServiceDef {
  readonly name: string
  readonly interval: number
  readonly command: string
  readonly healthyClass: string
}

const SERVICES: readonly ServiceDef[] = [
  {
    name: "OV",
    interval: 5000,
    command: "curl -sf http://localhost:7700/health && echo ok || echo fail",
    healthyClass: "dot-ov",
  },
  {
    name: "GitNexus",
    interval: 10000,
    command: "npx gitnexus status --quiet 2>/dev/null && echo ok || echo fail",
    healthyClass: "dot-gitnexus",
  },
  {
    name: "Ollama",
    interval: 10000,
    command: "curl -sf http://localhost:11434/api/version && echo ok || echo fail",
    healthyClass: "dot-ollama",
  },
  {
    name: "Syncthing",
    interval: 15000,
    command: "systemctl --user is-active syncthing && echo ok || echo fail",
    healthyClass: "dot-syncthing",
  },
]

function ServiceDot({ name, interval, command, healthyClass }: ServiceDef) {
  const status = createPoll("fail", interval, ["bash", "-c", command])
  const cssClass = createComputed(() =>
    `service-dot ${status().trim() === "ok" ? healthyClass : "dot-error"}`
  )

  return (
    <box
      class={cssClass}
      widthRequest={6}
      heightRequest={6}
      tooltipText={name}
    />
  )
}

export function ServiceStatus() {
  return (
    <box class="service-status" spacing={4}>
      {SERVICES.map((svc) => ServiceDot(svc))}
    </box>
  )
}
