/**
 * ServiceStatus -- icon indicators for OV, GitNexus, Ollama, Syncthing health.
 * Each service displays its SVG icon via Gio.FileIcon; healthy services show
 * their accent color, unhealthy ones dim to error red.
 *
 * Clicking a service icon opens a popup panel showing status and a toggle
 * button to start/stop the service (where applicable).
 */
import app from "ags/gtk4/app"
import { createComputed } from "ags"
import { createPoll } from "ags/time"
import { execAsync } from "ags/process"
import { Astal } from "ags/gtk4"
import Gio from "gi://Gio"
import GLib from "gi://GLib?version=2.0"

const ICON_DIR = `${GLib.get_home_dir()}/.config/ags/icons/hicolor/scalable/status`

interface ServiceDef {
  readonly name: string
  readonly iconFile: string
  readonly interval: number
  readonly command: string
  readonly cssOk: string
  readonly startCmd: string | null
  readonly stopCmd: string | null
}

const SERVICES: readonly ServiceDef[] = [
  {
    name: "OpenViking",
    iconFile: `${ICON_DIR}/openviking-symbolic.svg`,
    interval: 5000,
    command: "curl -sf http://localhost:1933/health >/dev/null 2>&1 && echo ok || echo fail",
    cssOk: "svc-emerald",
    startCmd: "systemctl --user start openviking",
    stopCmd: "systemctl --user stop openviking",
  },
  {
    name: "GitNexus",
    iconFile: `${ICON_DIR}/gitnexus-symbolic.svg`,
    interval: 10000,
    command:
      "/home/kiriketsuki/.nvm/versions/node/v24.14.0/bin/gitnexus status >/dev/null 2>&1 && echo ok || echo fail",
    cssOk: "svc-teal",
    startCmd: null,
    stopCmd: null,
  },
  {
    name: "Ollama",
    iconFile: `${ICON_DIR}/ollama-symbolic.svg`,
    interval: 10000,
    command:
      "curl -sf http://localhost:11434/api/version >/dev/null 2>&1 && echo ok || echo fail",
    cssOk: "svc-amethyst",
    startCmd: "systemctl start ollama",
    stopCmd: "systemctl stop ollama",
  },
  {
    name: "Syncthing",
    iconFile: `${ICON_DIR}/syncthing-symbolic.svg`,
    interval: 15000,
    command: "systemctl --user is-active syncthing >/dev/null 2>&1 && echo ok || echo fail",
    cssOk: "svc-blonde",
    startCmd: "systemctl --user start syncthing",
    stopCmd: "systemctl --user stop syncthing",
  },
]

const PANEL_NAME = "chrysaki-service-panel"

function togglePanel(): void {
  const panel = app.get_window(PANEL_NAME)
  if (panel) {
    panel.visible = !panel.visible
  }
}

function ServiceIcon({ name, iconFile, interval, command, cssOk }: ServiceDef) {
  const status = createPoll("ok", interval, ["bash", "-c", command])
  const isOk = createComputed(() => status().trim() === "ok")
  const gicon = Gio.FileIcon.new(Gio.File.new_for_path(iconFile))

  return (
    <button
      class="svc-button"
      tooltipText={name}
      onClicked={() => togglePanel()}
    >
      <image
        gicon={gicon}
        pixelSize={16}
        class="svc-icon"
        valign={3}
        $={(self: any) => {
          let blinkOn = true
          GLib.timeout_add(GLib.PRIORITY_DEFAULT, 600, () => {
            if (!isOk()) {
              blinkOn = !blinkOn
              self.set_opacity(blinkOn ? 0.85 : 0.15)
            } else {
              self.set_opacity(1.0)
            }
            return GLib.SOURCE_CONTINUE
          })
        }}
      />
    </button>
  )
}

function ServiceRow({
  name,
  iconFile,
  interval,
  command,
  cssOk,
  startCmd,
  stopCmd,
}: ServiceDef) {
  const status = createPoll("ok", interval, ["bash", "-c", command])

  const isHealthy = createComputed(() => status().trim() === "ok")

  const statusLabel = createComputed(() =>
    isHealthy() ? "Healthy" : "Unhealthy",
  )

  const statusClass = createComputed(() =>
    isHealthy() ? "svc-panel-healthy" : "svc-panel-unhealthy",
  )

  const toggleLabel = createComputed(() =>
    isHealthy() ? "\u{F04DB}" : "\u{F040A}", // nf-md-stop / nf-md-play
  )

  const isToggleable = startCmd !== null && stopCmd !== null

  const gicon = Gio.FileIcon.new(Gio.File.new_for_path(iconFile))

  return (
    <box class={`svc-panel-row svc-row-${cssOk}`} spacing={8} valign={3}>
      <image gicon={gicon} pixelSize={18} class={`svc-icon ${cssOk}`} />
      <label class="svc-panel-name" label={name} hexpand halign={1} />
      <label class={statusClass} label={statusLabel} />
      {isToggleable ? (
        <button
          class="svc-panel-toggle"
          label={toggleLabel}
          onClicked={() => {
            const cmd = isHealthy() ? stopCmd : startCmd
            if (cmd) {
              execAsync(["bash", "-c", cmd]).catch(console.error)
            }
          }}
        />
      ) : (
        <label class="svc-panel-no-toggle" label="--" />
      )}
    </box>
  )
}

export function ServicePanel() {
  const { TOP, RIGHT } = Astal.WindowAnchor

  return (
    <window
      name={PANEL_NAME}
      namespace={PANEL_NAME}
      visible={false}
      anchor={TOP | RIGHT}
      exclusivity={Astal.Exclusivity.IGNORE}
      marginTop={48}
      marginRight={8}
      application={app}
    >
      <box class="svc-panel" orientation={1} spacing={4}>
        <label class="svc-panel-title" label={"\u{F0614}  Services"} halign={1} />
        {SERVICES.map((svc) => ServiceRow(svc))}
      </box>
    </window>
  )
}

export function ServiceStatus() {
  return (
    <box class="service-status" spacing={6} valign={3}>
      {SERVICES.map((svc) => ServiceIcon(svc))}
    </box>
  )
}
