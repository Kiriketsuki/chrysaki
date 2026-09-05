/**
 * focus-monitor — map a Gdk.Monitor to its Hyprland monitor and report whether
 * it is the focused one.
 *
 * Used to gate per-monitor bar animations: the perpetual border-wave / slash
 * shimmer only needs to run on the monitor the user is actually looking at.
 * Bars on unfocused monitors freeze their last frame (zero CPU) until focus
 * returns to them.
 *
 * Matching is by DRM connector name (e.g. "DP-1"), which both Gdk and Hyprland
 * expose identically, with a geometry fallback. If no match is found we
 * fail-open (treat the monitor as focused) so a matching glitch never freezes a
 * real, in-use bar.
 */
import AstalHyprland from "gi://AstalHyprland"
import type { Gdk } from "ags/gtk4"

const hyprland = AstalHyprland.get_default()!

/** Find the AstalHyprland monitor matching a Gdk.Monitor (connector, then geometry). */
function matchAstalMonitor(gdkmonitor: Gdk.Monitor): AstalHyprland.Monitor | null {
  const monitors = hyprland.monitors as AstalHyprland.Monitor[]

  const connector = gdkmonitor.get_connector?.() ?? null
  if (connector) {
    const byName = monitors.find((m) => m.name === connector)
    if (byName) return byName
  }

  const geo = gdkmonitor.get_geometry()
  return monitors.find((m) => m.x === geo.x && m.y === geo.y) ?? null
}

/** True if this Gdk.Monitor is the Hyprland-focused monitor (fail-open when unmatched). */
export function isMonitorFocused(gdkmonitor: Gdk.Monitor): boolean {
  const m = matchAstalMonitor(gdkmonitor)
  if (!m) return true
  return m.focused
}

/** Run `cb` whenever the focused monitor changes. Returns a disconnect function. */
export function onFocusChange(cb: () => void): () => void {
  const id = hyprland.connect("notify::focused-monitor", cb)
  return () => hyprland.disconnect(id)
}
