/**
 * BorderWaveState — standing sine wave + collision pulses on island border.
 *
 * displacementAt(xNorm, islandWidthPx) returns outward pixel displacement.
 *
 * Both top and bottom edges use the same temporal phase so their features stay
 * vertically aligned (ovals, not slants). A shared spatial phase gradient makes
 * the oscillation appear faster/slower at different x positions — the "locally
 * varying frequency" effect the user requested.
 *
 * Formula:
 *   A · G(x) · sin(2π·N·x) · cos(phase(t) + x · spatialGrad(t))
 *
 *   G(x) = exp(-((x-0.5)/σ)²/2)   — Gaussian amplitude envelope
 *   N = round(islandWidth / WAVELENGTH_PX)
 *   phase(t) — accumulated temporal phase with modulated frequency
 *   spatialGrad(t) — slowly drifting phase gradient
 *
 * Collision pulse: amplitude 4–6px, decays over 800ms, travels bidirectionally in x-space.
 */

interface BorderPulse {
  readonly originFraction: number
  readonly amplitude: number
  readonly startMs: number
}

const PULSE_DURATION_MS = 800
const PULSE_SPEED = 0.5
const PULSE_WIDTH  = 0.10

const GAUSSIAN_SIGMA = 0.45
const WAVELENGTH_PX  = 6
const FREQ_MOD_DEPTH = 0.3

/**
 * Time-independent part of the standing wave: gaussian * spatial sine.
 * Callers can cache it per island width and x position.
 */
export function standingEnvelope(xNorm: number, islandWidthPx: number): number {
  const N        = Math.max(1, Math.round(islandWidthPx / WAVELENGTH_PX))
  const gaussian = Math.exp(-Math.pow((xNorm - 0.5) / GAUSSIAN_SIGMA, 2) / 2)
  const spatial  = Math.sin(xNorm * 2 * Math.PI * N)
  return gaussian * spatial
}

export class BorderWaveState {
  private _phase: number = Math.random() * Math.PI * 2
  private readonly _periodBase: number = 1500 + Math.random() * 800
  private readonly _modPeriod:  number = 5000 + Math.random() * 4000
  private readonly _modOffset:  number = Math.random() * Math.PI * 2

  private _spatialGrad: number = (Math.random() - 0.5) * Math.PI
  private _gradRate: number    = (0.2 + Math.random() * 0.3) * (Math.random() < 0.5 ? 1 : -1) * 0.001
  private readonly _gradMax    = Math.PI * 1.5

  private _pulses: BorderPulse[] = []
  private _lastTickMs: number = Date.now()
  private readonly _t0: number = Date.now()

  /** True while at least one collision pulse is alive. */
  get hasPulses(): boolean {
    return this._pulses.length > 0
  }

  /** Resets the tick clock so the next tick does not see a long gap. */
  resetClock(): void {
    this._lastTickMs = Date.now()
  }

  tick(): void {
    const now = Date.now()
    const dt  = now - this._lastTickMs
    this._lastTickMs = now

    const modT      = ((now - this._t0) % this._modPeriod) / this._modPeriod
    const freqMod   = 1 + FREQ_MOD_DEPTH * Math.sin(modT * 2 * Math.PI + this._modOffset)
    this._phase    += dt * 2 * Math.PI * freqMod / this._periodBase
    // The phase grows without a wrap, and Math.cos becomes about 9x slower once
    // the argument passes about 1.6e6 rad, which takes 4.5 to 7 days of uptime.
    // Cos has period 2pi, so the wrap leaves the visual result unchanged.
    this._phase    %= 2 * Math.PI

    this._spatialGrad += this._gradRate * dt
    if (Math.abs(this._spatialGrad) > this._gradMax) {
      this._spatialGrad = Math.sign(this._spatialGrad) * this._gradMax
      this._gradRate    = -this._gradRate
    }

    this._pulses = this._pulses.filter(p => now - p.startMs < PULSE_DURATION_MS)
  }

  addPulse(originX: number): void {
    this._pulses = [
      ...this._pulses,
      {
        originFraction: Math.max(0, Math.min(1, originX)),
        amplitude: 4 + Math.random() * 2,
        startMs: Date.now(),
      },
    ]
  }

  /** Displacement from a precomputed envelope and a caller-supplied clock. */
  displacementWithEnvelope(xNorm: number, envelope: number, now: number): number {
    const standing = envelope * Math.cos(this._phase + xNorm * this._spatialGrad)

    if (this._pulses.length === 0) return standing

    let pulseDelta = 0
    for (const p of this._pulses) {
      const age         = (now - p.startMs) / PULSE_DURATION_MS
      const travelDist  = age * PULSE_SPEED
      const distToFront = Math.min(
        Math.abs(xNorm - (p.originFraction + travelDist)),
        Math.abs(xNorm - (p.originFraction - travelDist)),
      )
      if (distToFront < PULSE_WIDTH) {
        const shape = Math.pow(1 - distToFront / PULSE_WIDTH, 2)
        pulseDelta += p.amplitude * (1 - age) * shape
      }
    }

    return standing + pulseDelta
  }

  displacementAt(xNorm: number, islandWidthPx = 300): number {
    return this.displacementWithEnvelope(xNorm, standingEnvelope(xNorm, islandWidthPx), Date.now())
  }
}
