/**
 * Notification color utilities — deterministic app-to-jewel-tone mapping.
 *
 * Maps application names to JEWEL_PALETTE indices via DJB2 hash so the same
 * app always gets the same accent color across sessions.
 */

import type { RGBA } from "./cairo-separator"

/**
 * DJB2 hash of appName (lowercased) mod 10 → JEWEL_PALETTE index.
 * Deterministic: the same app always maps to the same jewel tone.
 */
export function appColorIndex(appName: string): number {
  const lower = appName.toLowerCase()
  let hash = 5381
  for (let i = 0; i < lower.length; i++) {
    hash = ((hash << 5) + hash + lower.charCodeAt(i)) | 0
  }
  return ((hash % 10) + 10) % 10
}

/**
 * 10 jewel-tone hex strings for accent stripe backgrounds (indices 0-9).
 * Matches JEWEL_PALETTE order in ChamferedIsland.tsx.
 */
export const JEWEL_ACCENT_CSS: readonly string[] = Object.freeze([
  "#1a8a6a", // 0  emerald
  "#1c3d7a", // 1  royalBlue
  "#583090", // 2  amethyst
  "#20969c", // 3  teal
  "#d47622", // 4  topaz
  "#9e2d6e", // 5  rhodolite
  "#9da82a", // 6  peridot
  "#3d95e0", // 7  cerulean
  "#62758a", // 8  slate
  "#b38b62", // 9  bronze
])

/**
 * 10 text-safe hex strings for foreground text on dark surfaces.
 * Royal Blue (#1c3d7a) and Amethyst (#583090) are too dark for text,
 * substituted with cerulean and teal-light respectively.
 */
export const JEWEL_TEXT_CSS: readonly string[] = Object.freeze([
  "#1a8a6a", // 0  emerald — safe on dark
  "#3d95e0", // 1  royalBlue → cerulean substitute
  "#20969c", // 2  amethyst → teal-light substitute
  "#20969c", // 3  teal — safe on dark
  "#d47622", // 4  topaz — safe on dark
  "#9e2d6e", // 5  rhodolite — safe on dark
  "#9da82a", // 6  peridot — safe on dark
  "#3d95e0", // 7  cerulean — safe on dark
  "#a0a4b8", // 8  slate → text-secondary substitute
  "#b38b62", // 9  bronze — safe on dark
])

/**
 * Get the JEWEL_PALETTE RGBA for an app's accent color at 0.75 alpha.
 * Suitable for Cairo fill operations (accent stripes, glow effects).
 */
export function getAppAccentRGBA(appName: string): RGBA {
  const idx = appColorIndex(appName)
  const hex = JEWEL_ACCENT_CSS[idx]
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return [r, g, b, 0.75]
}
