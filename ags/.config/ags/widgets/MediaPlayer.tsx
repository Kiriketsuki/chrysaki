import { createBinding, createComputed } from "ags"
import AstalMpris from "gi://AstalMpris"

const mpris = AstalMpris.get_default()!

function truncate(s: string | null, len: number): string {
  if (!s) return ""
  return s.length > len ? s.substring(0, len) + "…" : s
}

export function MediaPlayer() {
  const players = createBinding(mpris, "players")

  const text = createComputed(() => {
    const player = players()[0]
    if (!player) return "—"
    const artist = truncate(player.artist, 8)
    const title = truncate(player.title, 12)
    return artist ? `󰎆  ${artist} — ${title}` : `󰎆  ${title}`
  })

  const visible = createComputed(() => players().length > 0)

  return (
    <box visible={visible}>
      <label class="media-label" label={text} />
    </box>
  )
}
