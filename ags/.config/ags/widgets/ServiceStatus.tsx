/**
 * ServiceStatus — hex dots for OV, GitNexus, Ollama, Syncthing health.
 * Each dot is a ⬢ label with a CSS class toggled by createComputed.
 */
import { createComputed } from "ags"
import { createPoll } from "ags/time"

interface ServiceDef {
  readonly name: string
  readonly interval: number
  readonly command: string
  readonly cssOk: string
}

const SERVICES: readonly ServiceDef[] = [
  {
    name: "OV",
    interval: 5000,
    command: "curl -sf http://localhost:7700/health && echo ok || echo fail",
    cssOk: "svc-emerald",
  },
  {
    name: "GitNexus",
    interval: 10000,
    command: "npx gitnexus status --quiet 2>/dev/null && echo ok || echo fail",
    cssOk: "svc-teal",
  },
  {
    name: "Ollama",
    interval: 10000,
    command: "curl -sf http://localhost:11434/api/version && echo ok || echo fail",
    cssOk: "svc-amethyst",
  },
  {
    name: "Syncthing",
    interval: 15000,
    command: "systemctl --user is-active syncthing && echo ok || echo fail",
    cssOk: "svc-blonde",
  },
]

function ServiceDot({ name, interval, command, cssOk }: ServiceDef) {
  const status = createPoll("fail", interval, ["bash", "-c", command])

  const dotClass = createComputed(() => {
    const isOk = status().trim() === "ok"
    return isOk ? `svc-dot ${cssOk}` : "svc-dot svc-error"
  })

  return (
    <label
      tooltipText={name}
      label="⬢"
      class={dotClass}
      valign={3}
    />
  )
}

export function ServiceStatus() {
  return (
    <box class="service-status" spacing={2} valign={3}>
      {SERVICES.map((svc) => ServiceDot(svc))}
    </box>
  )
}
