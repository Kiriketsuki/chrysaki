/**
 * MouseControls -- building blocks for the mouse quick-control panel.
 *
 *   SettingError    error line under a control, visible only after a failed write
 *   SettingSlider   stepper buttons + slider + value label for one numeric setting
 *
 * A Solaar write takes about three seconds. The slider therefore waits until the
 * value rests for COMMIT_DELAY_MS, and then it sends one write.
 */
import { createComputed, createState, onCleanup, type Accessor } from "ags"
import GLib from "gi://GLib?version=2.0"
import { mouseErrors } from "../lib/mouse-store"
import type { SettingKey } from "../lib/solaar"

const COMMIT_DELAY_MS = 450

export function SettingError({ setting }: { setting: SettingKey }) {
  const text = createComputed(() => mouseErrors()[setting] ?? "")
  return (
    <label
      class="mouse-panel-error"
      label={text.as((t) => `\u{F0026}  ${t}`)} // 󰀦 nf-md-alert
      visible={text.as((t) => t !== "")}
      halign={1}
      wrap
      maxWidthChars={36}
    />
  )
}

interface SettingSliderProps {
  readonly setting: SettingKey
  readonly title: string
  readonly min: number
  readonly max: number
  readonly step: number
  /** Current value from the store. `null` while Solaar has not reported it. */
  readonly value: Accessor<number | null>
  readonly sensitive: Accessor<boolean>
  readonly onCommit: (value: number) => void
}

export function SettingSlider({
  setting,
  title,
  min,
  max,
  step,
  value,
  sensitive,
  onCommit,
}: SettingSliderProps) {
  // The value under the pointer, before the write. `null` when nothing waits.
  const [draft, setDraft] = createState<number | null>(null)
  let timerId = 0

  const snap = (raw: number): number =>
    Math.min(max, Math.max(min, Math.round(raw / step) * step))

  const shown = createComputed(() => draft() ?? value())
  const valueText = createComputed(() => {
    const v = shown()
    return v === null ? "--" : `${v}`
  })
  const position = createComputed(() => shown() ?? min)

  function clearTimer(): void {
    if (timerId === 0) return
    GLib.source_remove(timerId)
    timerId = 0
  }

  function schedule(raw: number): void {
    const next = snap(raw)
    setDraft(next)
    clearTimer()
    timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, COMMIT_DELAY_MS, () => {
      timerId = 0
      setDraft(null)
      if (next !== value.peek()) onCommit(next)
      return GLib.SOURCE_REMOVE
    })
  }

  function nudge(delta: number): void {
    const current = draft.peek() ?? value.peek()
    if (current !== null) schedule(current + delta)
  }

  onCleanup(clearTimer)

  return (
    <box class="mouse-panel-control" orientation={1} spacing={2}>
      <box spacing={6}>
        <label class="mouse-panel-name" label={title} hexpand halign={1} />
        <label class="mouse-panel-value" label={valueText} halign={2} />
      </box>
      <box spacing={4} valign={3}>
        <button
          class="svc-panel-toggle"
          label={"\u{F0374}"} // 󰍴 nf-md-minus
          tooltipText={`${title}: -${step}`}
          sensitive={sensitive}
          onClicked={() => nudge(-step)}
        />
        <slider
          class="mouse-panel-slider"
          hexpand
          min={min}
          max={max}
          step={step}
          value={position}
          sensitive={sensitive}
          // change-value fires for user input only. A store update does not start a write.
          onChangeValue={(_self, _scroll, raw: number) => schedule(raw)}
        />
        <button
          class="svc-panel-toggle"
          label={"\u{F0415}"} // 󰐕 nf-md-plus
          tooltipText={`${title}: +${step}`}
          sensitive={sensitive}
          onClicked={() => nudge(step)}
        />
      </box>
      <SettingError setting={setting} />
    </box>
  )
}
