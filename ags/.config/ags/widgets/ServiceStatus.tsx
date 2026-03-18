/**
 * ServiceStatus -- config-driven service health panel.
 * Service definitions are loaded from services.json at startup — add new services
 * by editing that file only, no TypeScript changes required.
 *
 * Supports three service types:
 *   daemon  — systemd unit; health via http/systemctl
 *   process — background process; health via pgrep
 *   cli     — installed CLI tool; health via version check
 *
 * Services are grouped by category in the popup panel.
 * Per-service bar visibility is toggled in the panel and persisted to service-prefs.json.
 */
import app from "ags/gtk4/app"
import { createComputed, createState } from "ags"
import { createPoll } from "ags/time"
import { execAsync } from "ags/process"
import { Astal } from "ags/gtk4"
import Gio from "gi://Gio"
import GLib from "gi://GLib?version=2.0"

const ICON_DIR = `${GLib.get_home_dir()}/.config/ags/icons/hicolor/scalable/status`
const CONFIG_PATH = `${GLib.get_home_dir()}/.config/ags/services.json`
const PREFS_PATH = `${GLib.get_home_dir()}/.config/ags/service-prefs.json`

interface ServiceDef {
  readonly name: string
  readonly type: "daemon" | "process" | "cli"
  readonly category: string
  readonly icon: string
  readonly healthCmd: string
  readonly startCmd: string | null
  readonly stopCmd: string | null
  readonly guiCmd: string | null
  readonly cssAccent: string
  readonly interval: number
}

function loadServices(): readonly ServiceDef[] {
  try {
    const [, raw] = GLib.file_get_contents(CONFIG_PATH)
    return JSON.parse(new TextDecoder().decode(raw)) as ServiceDef[]
  } catch (e) {
    console.error(`[ServiceStatus] Failed to load services.json: ${e}`)
    return []
  }
}

function loadPrefs(): Record<string, boolean> {
  try {
    const [, raw] = GLib.file_get_contents(PREFS_PATH)
    return JSON.parse(new TextDecoder().decode(raw)) as Record<string, boolean>
  } catch {
    return {}
  }
}

function savePrefs(prefs: Record<string, boolean>): void {
  try {
    GLib.file_set_contents(PREFS_PATH, new TextEncoder().encode(JSON.stringify(prefs, null, 2)))
  } catch (e) {
    console.error(`[ServiceStatus] Failed to save prefs: ${e}`)
  }
}

function getGicon(iconName: string): Gio.Icon {
  const file = Gio.File.new_for_path(`${ICON_DIR}/${iconName}.svg`)
  if (file.query_exists(null)) {
    return Gio.FileIcon.new(file)
  }
  return Gio.ThemedIcon.new("application-x-executable-symbolic")
}

function groupByCategory(services: readonly ServiceDef[]): [string, ServiceDef[]][] {
  const map = new Map<string, ServiceDef[]>()
  for (const svc of services) {
    if (!map.has(svc.category)) map.set(svc.category, [])
    map.get(svc.category)!.push(svc)
  }
  return Array.from(map.entries())
}

const SERVICES = loadServices()

const CATEGORY_ICONS: Record<string, string> = {
  "System": "\uf013",    // nf-fa-cog
  "MCP": "\uf1e6",       // nf-fa-plug
  "CLI Tools": "\uf120", // nf-fa-terminal
}

const PANEL_NAME = "chrysaki-service-panel"

// --- Bar visibility prefs ---
// Module-level signal: bump version to propagate prefs changes to all reactive consumers.
const [barPrefsVersion, setBarPrefsVersion] = createState(0)
let _barPrefs: Record<string, boolean> = loadPrefs()

function isVisibleInBar(name: string): boolean {
  barPrefsVersion() // Subscribe — invalidated when any pref changes
  return _barPrefs[name] !== false // Default: visible
}

function toggleBarVisibility(name: string): void {
  _barPrefs = { ..._barPrefs, [name]: !(_barPrefs[name] !== false) }
  savePrefs(_barPrefs)
  setBarPrefsVersion((v) => v + 1)
}
// ---

function togglePanel(): void {
  const panel = app.get_window(PANEL_NAME)
  if (panel) panel.visible = !panel.visible
}

function ServiceIcon({ name, icon, interval, healthCmd }: ServiceDef) {
  const status = createPoll("ok", interval, ["bash", "-c", healthCmd])
  const isOk = createComputed(() => status().trim() === "ok")
  const iconClass = createComputed(() => (isOk() ? "svc-icon" : "svc-icon svc-error"))
  const gicon = getGicon(icon)

  return (
    <button class="svc-button" tooltipText={name} onClicked={() => togglePanel()}>
      <image
        gicon={gicon}
        pixelSize={16}
        class={iconClass}
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

function ServiceRow({ name, icon, interval, healthCmd, cssAccent, startCmd, stopCmd, guiCmd }: ServiceDef) {
  const status = createPoll("ok", interval, ["bash", "-c", healthCmd])
  const isHealthy = createComputed(() => status().trim() === "ok")
  const statusLabel = createComputed(() => (isHealthy() ? "Healthy" : "Unhealthy"))
  const statusClass = createComputed(() => (isHealthy() ? "svc-panel-healthy" : "svc-panel-unhealthy"))
  const toggleLabel = createComputed(() => (isHealthy() ? "\u{F04DB}" : "\u{F040A}"))
  // Sensitive only when the relevant command exists for the current health state
  const toggleSensitive = createComputed(() => (isHealthy() ? stopCmd !== null : startCmd !== null))
  const gicon = getGicon(icon)

  const eyeLabel = createComputed(() => (isVisibleInBar(name) ? "\uf06e" : "\uf070"))
  const eyeClass = createComputed(() =>
    `svc-panel-eye ${isVisibleInBar(name) ? "svc-eye-on" : "svc-eye-off"}`
  )

  return (
    <box class={`svc-panel-row svc-row-${cssAccent}`} spacing={4} valign={3}>
      <image gicon={gicon} pixelSize={18} class={`svc-icon ${cssAccent}`} />
      <label class="svc-panel-name" label={name} hexpand halign={1} />
      <label class={statusClass} label={statusLabel} />
      <button
        class="svc-panel-toggle"
        label={toggleLabel}
        sensitive={toggleSensitive}
        onClicked={() => {
          const cmd = isHealthy() ? stopCmd : startCmd
          if (cmd) execAsync(["bash", "-c", cmd]).catch(console.error)
        }}
      />
      <button
        class={`svc-panel-gui${guiCmd === null ? " svc-no-gui" : ""}`}
        label={"\uf08e"}
        tooltipText={guiCmd !== null ? "Open GUI" : ""}
        sensitive={guiCmd !== null}
        onClicked={() => guiCmd !== null && execAsync(["bash", "-c", guiCmd]).catch(console.error)}
      />
      <button
        class={eyeClass}
        label={eyeLabel}
        tooltipText="Toggle bar icon"
        onClicked={() => toggleBarVisibility(name)}
      />
    </box>
  )
}

function CategorySection({ category, services }: { category: string; services: ServiceDef[] }) {
  const catIcon = CATEGORY_ICONS[category] ?? "\uf111"
  return (
    <box class="svc-category-section" orientation={1} spacing={0}>
      <label
        class="svc-category-header"
        label={`${catIcon}  ${category.toUpperCase()}`}
        halign={1}
      />
      {services.map((svc) => ServiceRow(svc))}
    </box>
  )
}

export function ServicePanel() {
  const { TOP, RIGHT } = Astal.WindowAnchor
  const categories = groupByCategory(SERVICES)

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
        {categories.map(([cat, svcs]) => CategorySection({ category: cat, services: svcs }))}
      </box>
    </window>
  )
}

function ServiceIconConditional(svc: ServiceDef) {
  const visible = createComputed(() => isVisibleInBar(svc.name))
  return (
    <box visible={visible}>
      {ServiceIcon(svc)}
    </box>
  )
}

export function ServiceStatus() {
  return (
    <box class="service-status" spacing={6} valign={3}>
      {SERVICES.map((svc) => ServiceIconConditional(svc))}
    </box>
  )
}
