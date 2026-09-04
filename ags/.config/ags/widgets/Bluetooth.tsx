/**
 * Bluetooth — bar segment showing adapter power and connected device count.
 *
 * Controls:
 *   left-click    toggle adapter power
 *   right-click   open bluetoothctl in a ghostty window
 *
 * Reactivity note: same pattern as Network.tsx — `is-powered`/`is-connected`
 * live on the AstalBluetooth singleton and notify on change, but the devices
 * list contents (a paired device connecting) only fire `notify::devices` on
 * add/remove, so the connected count is re-derived from both signals.
 */
import { createComputed, createState, onCleanup } from "ags"
import { execAsync } from "ags/process"
import { Gtk, Gdk } from "ags/gtk4"
import AstalBluetooth from "gi://AstalBluetooth"

const bluetooth = AstalBluetooth.get_default()!

const BLUETOOTHCTL_COMMAND = ["ghostty", "-e", "bluetoothctl"]

interface BtState {
  readonly powered: boolean
  readonly connectedCount: number
}

const BT_OFF: BtState = { powered: false, connectedCount: 0 }

/** nf-md bluetooth glyphs keyed on power/connection state */
function btIcon(s: BtState): string {
  if (!s.powered) return "\u{F00B2}" // 󰂲 nf-md-bluetooth_off
  if (s.connectedCount > 0) return "\u{F00B1}" // 󰂱 nf-md-bluetooth_connect
  return "\u{F00AF}" // 󰂯 nf-md-bluetooth
}

export function Bluetooth() {
  const [state, setState] = createState<BtState>(BT_OFF)

  const sync = (): void => {
    const devices = bluetooth.get_devices() ?? []
    setState({
      powered: bluetooth.is_powered,
      connectedCount: devices.filter((d) => d.connected).length,
    })
  }

  const ids = [
    bluetooth.connect("notify::is-powered", sync),
    bluetooth.connect("notify::is-connected", sync),
    bluetooth.connect("notify::devices", sync),
    bluetooth.connect("device-added", sync),
    bluetooth.connect("device-removed", sync),
  ]
  sync()
  onCleanup(() => ids.forEach((id) => bluetooth.disconnect(id)))

  const icon = createComputed(() => btIcon(state()))

  const label = createComputed(() => {
    const s = state()
    if (!s.powered) return ""
    return s.connectedCount > 0 ? `${s.connectedCount}` : ""
  })

  const tooltip = createComputed(() => {
    const s = state()
    if (!s.powered) return "Bluetooth off — click to enable"
    const devices = s.connectedCount === 1 ? "device" : "devices"
    return s.connectedCount > 0
      ? `Bluetooth — ${s.connectedCount} ${devices} connected (right-click: bluetoothctl)`
      : "Bluetooth on — no devices (right-click: bluetoothctl)"
  })

  function togglePower(): void {
    bluetooth.toggle()
  }

  function openBluetoothctl(): void {
    execAsync(BLUETOOTHCTL_COMMAND).catch((error: unknown) => {
      console.error(`Bluetooth: failed to launch ${BLUETOOTHCTL_COMMAND.join(" ")}`, error)
    })
  }

  return (
    <box class="bluetooth-box" valign={3}>
      <button
        class={state.as((s) => (s.powered ? "bluetooth-button" : "bluetooth-button bluetooth-off"))}
        onClicked={togglePower}
        tooltipText={tooltip}
        $={(self: Gtk.Widget) => {
          const secondary = new Gtk.GestureClick({ button: 0 })
          secondary.connect("pressed", (gesture: Gtk.GestureClick) => {
            if (gesture.get_current_button() === Gdk.BUTTON_SECONDARY) openBluetoothctl()
          })
          self.add_controller(secondary)
        }}
      >
        <box spacing={6} valign={3}>
          <label class="bluetooth-icon" label={icon} />
          <label class="bluetooth-count" label={label} visible={label.as((l) => l !== "")} />
        </box>
      </button>
    </box>
  )
}
