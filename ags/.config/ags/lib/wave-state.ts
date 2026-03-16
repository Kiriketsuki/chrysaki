/**
 * Wave animation state machine for island color transitions.
 *
 * Pure state: no GTK/GLib deps — owns only timing math.
 * Each ChamferedBar instance creates one; desynchronization
 * comes from random initial indices and idle durations.
 */

export interface WaveFrame {
  /** Index of the current stable color in the palette */
  readonly currentColorIndex: number
  /** Index of the color the wave is transitioning toward */
  readonly nextColorIndex: number
  /** Wave sweep progress (0..1); 0 when idle */
  readonly waveProgress: number
  /** 1 = left→right, -1 = right→left */
  readonly waveDirection: 1 | -1
  /** Whether a wave is currently sweeping */
  readonly isWaving: boolean
}

const IDLE_MIN_MS = 6000
const IDLE_MAX_MS = 10000
const WAVE_DURATION_MS = 5000

export class WaveAnimationState {
  private _currentColorIndex: number
  private _nextColorIndex: number
  private _waveProgress = 0
  private _waveDirection: 1 | -1 = 1
  private _isWaving = false
  private _idleRemaining: number
  private _lastTickMs: number
  private readonly _paletteLength: number

  constructor(paletteLength = 4) {
    this._paletteLength = paletteLength
    this._currentColorIndex = Math.floor(Math.random() * paletteLength)
    this._nextColorIndex = this._currentColorIndex
    this._idleRemaining = IDLE_MIN_MS + Math.random() * (IDLE_MAX_MS - IDLE_MIN_MS)
    this._lastTickMs = Date.now()
  }

  get currentFrame(): WaveFrame {
    return {
      currentColorIndex: this._currentColorIndex,
      nextColorIndex: this._nextColorIndex,
      waveProgress: this._waveProgress,
      waveDirection: this._waveDirection,
      isWaving: this._isWaving,
    }
  }

  tick(): void {
    const now = Date.now()
    const dtMs = now - this._lastTickMs
    this._lastTickMs = now

    if (this._isWaving) {
      this._waveProgress += dtMs / WAVE_DURATION_MS
      if (this._waveProgress >= 1) {
        // Wave complete — snap to next color and return to idle
        this._currentColorIndex = this._nextColorIndex
        this._isWaving = false
        this._waveProgress = 0
        this._idleRemaining = IDLE_MIN_MS + Math.random() * (IDLE_MAX_MS - IDLE_MIN_MS)
      }
    } else {
      this._idleRemaining -= dtMs
      if (this._idleRemaining <= 0) {
        // Pick a next color that differs from current (mirrors Ghostty's pattern)
        let next = Math.floor(Math.random() * this._paletteLength)
        if (next === this._currentColorIndex) {
          next = (next + 1) % this._paletteLength
        }
        this._nextColorIndex = next
        this._isWaving = true
        this._waveProgress = 0
        this._waveDirection = Math.random() < 0.5 ? 1 : -1
      }
    }
  }
}
