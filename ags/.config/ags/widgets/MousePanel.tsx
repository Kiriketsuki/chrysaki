/**
 * MousePanel -- quick-control popup for the Logitech mouse.
 *
 * Layout follows ServicePanel: same anchor, same `.svc-panel` shell, same section headers.
 * Each control writes through mouse-store, which runs `solaar config` asynchronously.
 * A failed write shows its reason under the control that sent it.
 *
 * `change-host` is absent on purpose. It moves the mouse to another computer.
 */
import app from "ags/gtk4/app"
import { createComputed, createState } from "ags"
import { execAsync } from "ags/process"
import { Astal } from "ags/gtk4"
import { applyMouseSetting, mouseReading, refreshMouseIfStale } from "../lib/mouse-store"
import { DEVICE_NAME, SOLAAR_GUI_COMMAND, errorSummary, type Ratchet } from "../lib/solaar"
import { SettingError, SettingSlider } from "./MouseControls"

const PANEL_NAME = "chrysaki-mouse-panel"

const DPI_PRESETS: readonly number[] = [800, 1200, 1600, 2400]
const DPI_RANGE = { min: 200, max: 8000, step: 50 } as const
const SMART_SHIFT_RANGE = { min: 1, max: 50, step: 1 } as const
const HAPTIC_RANGE = { min: 0, max: 100, step: 5 } as const

const RATCHET_MODES: readonly { readonly value: Ratchet; readonly label: string }[] = [
  { value: "Ratcheted", label: "Ratchet" },
  { value: "Freespinning", label: "Free spin" },
]

export function toggleMousePanel(): void {
  const panel = app.get_window(PANEL_NAME)
  if (!panel) return
  if (!panel.visible) refreshMouseIfStale()
  panel.visible = !panel.visible
}

const online = createComputed(() => mouseReading().presence === "online")

function statusText(): string {
  const r = mouseReading()
  if (r.presence === "online") return r.battery === null ? "Online" : `${r.battery}%`
  if (r.presence === "offline") return "Offline"
  if (r.presence === "error") return "Error"
  return "Not found"
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return <label class="svc-category-header" label={`${icon}  ${title}`} halign={1} />
}

function DpiPresets() {
  return (
    <box class="mouse-panel-control" orientation={1} spacing={2}>
      <box spacing={4} homogeneous>
        {DPI_PRESETS.map((dpi) => (
          <button
            class={mouseReading.as((r) =>
              r.dpi === dpi ? "svc-panel-toggle mouse-panel-active" : "svc-panel-toggle",
            )}
            label={`${dpi}`}
            tooltipText={`Set ${dpi} DPI`}
            sensitive={online}
            onClicked={() => applyMouseSetting("dpi", `${dpi}`, { dpi })}
          />
        ))}
      </box>
    </box>
  )
}

function RatchetToggle() {
  return (
    <box class="mouse-panel-control" orientation={1} spacing={2}>
      <box spacing={4} homogeneous>
        {RATCHET_MODES.map(({ value, label }) => (
          <button
            class={mouseReading.as((r) =>
              r.ratchet === value ? "svc-panel-toggle mouse-panel-active" : "svc-panel-toggle",
            )}
            label={label}
            sensitive={online}
            onClicked={() => applyMouseSetting("scroll-ratchet", value, { ratchet: value })}
          />
        ))}
      </box>
      <SettingError setting="scroll-ratchet" />
    </box>
  )
}

function SolaarButton() {
  const [launchError, setLaunchError] = createState("")

  function openSolaar(): void {
    setLaunchError("")
    execAsync(SOLAAR_GUI_COMMAND).catch((error: unknown) => {
      const reason = errorSummary(error)
      console.error(`Mouse: failed to launch ${SOLAAR_GUI_COMMAND.join(" ")}. ${reason}`)
      setLaunchError(reason)
    })
  }

  return (
    <box class="mouse-panel-footer" orientation={1} spacing={2}>
      <button
        class="svc-panel-gui mouse-panel-open"
        label={"\uf08e  Open Solaar"}
        onClicked={openSolaar}
      />
      <label
        class="mouse-panel-error"
        label={launchError.as((t) => `\u{F0026}  ${t}`)}
        visible={launchError.as((t) => t !== "")}
        halign={1}
        wrap
        maxWidthChars={36}
      />
    </box>
  )
}

export function MousePanel() {
  const { TOP, RIGHT } = Astal.WindowAnchor
  const status = createComputed(statusText)
  const statusClass = createComputed(() =>
    online() ? "svc-panel-healthy" : "svc-panel-unhealthy",
  )

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
      <box class="svc-panel mouse-panel" orientation={1} spacing={4}>
        <box class="svc-panel-title" spacing={6}>
          <label label={`\u{F037D}  ${DEVICE_NAME}`} hexpand halign={1} />
          <label class={statusClass} label={status} />
        </box>

        <SectionHeader icon={"\uf245"} title="POINTER" />
        <DpiPresets />
        <SettingSlider
          setting="dpi"
          title="DPI"
          {...DPI_RANGE}
          value={mouseReading.as((r) => r.dpi)}
          sensitive={online}
          onCommit={(dpi) => applyMouseSetting("dpi", `${dpi}`, { dpi })}
        />

        <SectionHeader icon={"\uf021"} title="WHEEL" />
        <RatchetToggle />
        <SettingSlider
          setting="smart-shift"
          title="SmartShift threshold"
          {...SMART_SHIFT_RANGE}
          value={mouseReading.as((r) => r.smartShift)}
          sensitive={online}
          onCommit={(smartShift) =>
            applyMouseSetting("smart-shift", `${smartShift}`, { smartShift })
          }
        />

        <SectionHeader icon={"\u{F0566}"} title="HAPTICS" />
        <SettingSlider
          setting="haptic-level"
          title="Haptic level"
          {...HAPTIC_RANGE}
          value={mouseReading.as((r) => r.haptic)}
          sensitive={online}
          onCommit={(haptic) => applyMouseSetting("haptic-level", `${haptic}`, { haptic })}
        />

        <SolaarButton />
      </box>
    </window>
  )
}
