import { createBinding, createComputed, createState, For } from "ags"
import AstalTray from "gi://AstalTray"

const tray = AstalTray.get_default()!

/** IDs to filter out of the system tray (handled by dedicated widgets). */
const HIDDEN_IDS = ["nm-applet", "networkmanager", "network-manager"]

function isHidden(id: string | null): boolean {
  if (!id) return false
  const lower = id.toLowerCase()
  return HIDDEN_IDS.some((h) => lower.includes(h))
}

export function SystemTray() {
  const items = createBinding(tray, "items")
  const [expanded, setExpanded] = createState(false)

  const filtered = createComputed(() =>
    (items() ?? []).filter(
      (item: AstalTray.TrayItem) => !isHidden(item.id),
    ),
  )

  const chevron = createComputed(() => (expanded() ? "\u{F0142}" : "\u{F0141}")) // expanded: chevron_right (collapse), collapsed: chevron_left (expand)
  const toggleTip = createComputed(() => (expanded() ? "Collapse tray" : "Expand tray"))

  return (
    <box class="segment-tray" spacing={4}>
      <button
        class="tray-toggle"
        label={chevron}
        onClicked={() => setExpanded((v) => !v)}
        tooltipText={toggleTip}
      />
      <revealer
        revealChild={expanded}
        transitionType={2}
        transitionDuration={180}
      >
        <box spacing={4}>
          <For each={filtered}>
            {(item: AstalTray.TrayItem) => (
              <menubutton tooltipText={item.tooltipText ?? item.id}>
                <image gicon={item.gicon} pixelSize={16} />
              </menubutton>
            )}
          </For>
        </box>
      </revealer>
    </box>
  )
}
