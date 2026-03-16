/**
 * Animation state machines for island color transitions.
 *
 *   SlashEventState — manages two autonomous wave spawners per island.
 *     One wave always travels L→R, the other always R→L. Each spawner runs
 *     independently with randomised cooldown between waves so they drift in
 *     and out of phase. When a \ and / slash from different waves physically
 *     overlap, ChamferedIsland fires a radial color ripple.
 *
 *   RippleState — owns radial color-ripple expansions triggered by intersections.
 */

export type SlashType = 'glow' | 'wind' | 'diamond' | 'lightning'
export type SlashDir  = 'back' | 'forward'  // \ | /

export interface ActiveSlash {
  readonly id: number
  readonly cx: number        // normalised 0..1 along bar width
  readonly cy: number        // normalised 0..1 along bar height
  readonly dir: SlashDir
  readonly type: SlashType
  readonly alpha: number     // 0..0.92 current opacity
  readonly colorIndex: number
  readonly waveSweepDir: 1 | -1  // which spawner produced this slash (+1 = L→R, -1 = R→L)
}

// ── Gradient types ───────────────────────────────────────────────────────────

/**
 * One color stop in the animated wave gradient.
 * freq and phase control the sine wave modulation for this stop along the x-axis.
 */
export interface GradientStop {
  readonly colorIndex: number  // into JEWEL_PALETTE (indices 0-9)
  readonly freq: number        // sine wave frequency: 0.5..3.0
  readonly phase: number       // sine wave phase offset in radians
}

/**
 * Snapshot of the gradient state for one render frame.
 * stops: the target color set (fully active when transitionT = 1)
 * fromStops: the previous color set (fully shown when transitionT = 0)
 * transitionT: 0 = fully fromStops, 1 = fully stops
 */
export interface GradientFrame {
  readonly stops: readonly GradientStop[]
  readonly fromStops: readonly GradientStop[]
  readonly wavePhaseOffset: number
  readonly transitionT: number
}

// ── RippleState ──────────────────────────────────────────────────────────────

export interface ActiveRipple {
  readonly cx: number        // normalised 0..1
  readonly cy: number        // normalised 0..1
  readonly colorIndex: number
  readonly radiusPx: number
  readonly startMs: number
}

export interface RippleFrame {
  readonly gradient: GradientFrame
  readonly ripples: readonly ActiveRipple[]
}

const MAX_RIPPLES = 5

function makeGradientStops(indices: readonly number[]): GradientStop[] {
  return indices.map(colorIndex => ({
    colorIndex,
    freq:  0.5 + Math.random() * 2.5,
    phase: Math.random() * Math.PI * 2,
  }))
}

function pickColors(paletteLength: number, count: number, avoid: readonly number[] = []): number[] {
  const pool = Array.from({ length: paletteLength }, (_, i) => i).filter(i => !avoid.includes(i))
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, Math.min(count, pool.length))
}

export class RippleState {
  private _ripples: ActiveRipple[] = []
  private _fromStops: GradientStop[]
  private _toStops: GradientStop[]
  private _transitionT: number
  private _wavePhaseOffset: number
  private _lastTickMs: number
  private readonly _paletteLength: number

  constructor(paletteLength = 10) {
    this._paletteLength = paletteLength
    const initial = pickColors(paletteLength, 2)
    this._fromStops = makeGradientStops(initial)
    this._toStops   = this._fromStops
    this._transitionT    = 1
    this._wavePhaseOffset = Math.random() * Math.PI * 2
    this._lastTickMs = Date.now()
  }

  addRipple(cx: number, cy: number, colorIndex: number): void {
    const ripples = this._ripples.length >= MAX_RIPPLES
      ? this._ripples.slice(1)
      : this._ripples
    this._ripples = [
      ...ripples,
      { cx, cy, colorIndex, radiusPx: 0, startMs: Date.now() },
    ]

    // Trigger gradient regen — new main + supplementary avoiding the current pair
    const current = this._toStops.map(s => s.colorIndex)
    const next    = pickColors(this._paletteLength, 2, current)
    this._fromStops   = this._toStops
    this._toStops     = makeGradientStops(next)
    this._transitionT = 0
  }

  tick(islandW: number, islandH: number): void {
    const now = Date.now()
    const dt  = now - this._lastTickMs
    this._lastTickMs = now

    // Wave drift ~1 rad/s
    this._wavePhaseOffset += dt * 0.001

    // Gradient transition over 800ms
    if (this._transitionT < 1) {
      this._transitionT = Math.min(1, this._transitionT + dt / 800)
    }

    if (islandW <= 0 || islandH <= 0) return

    const diagonal = Math.hypot(islandW, islandH)
    this._ripples = this._ripples
      .map(r => {
        const speed = 0.8 + ((r.startMs % 1000) / 1000) * 0.8
        return { ...r, radiusPx: r.radiusPx + speed * dt }
      })
      .filter(r => r.radiusPx < diagonal)
  }

  get currentFrame(): RippleFrame {
    return {
      gradient: {
        stops:            this._toStops,
        fromStops:        this._fromStops,
        wavePhaseOffset:  this._wavePhaseOffset,
        transitionT:      this._transitionT,
      },
      ripples: [...this._ripples],
    }
  }
}

// ── SlashEventState ─────────────────────────────────────────────────────────

/** A wave: a swordsman advancing across the bar, spawning slashes as it goes. */
interface InternalWave {
  sweepDir: 1 | -1    // +1 = L→R, -1 = R→L (advance direction)
  sweepX: number      // current wave front position (normalised 0..1)
  sweepSpeed: number  // normalised units per ms — fixed at spawn
  spawnTimer: number  // ms until next slash spawn within this wave
  // Slash timing — fixed at wave spawn, constant for all slashes in this wave.
  slashAppearMs: number
  slashLingerMs: number
  slashFadeMs: number
  elapsed: number
  totalLifeMs: number // retire after this many ms
  lastSlashDir: SlashDir | null  // alternates each spawn; null = first slash, pick randomly
  fixedColorIndex: number         // all slashes in this wave share one color
}

interface InternalSlash {
  id: number
  cx: number
  cy: number
  dir: SlashDir
  type: SlashType
  colorIndex: number
  appearMs: number
  lingerMs: number
  fadeMs: number
  elapsed: number
  driftY: number
  waveSweepDir: 1 | -1
}

/**
 * Fraction of the previous slash's total lifetime to wait before spawning
 * the next one. 0.82 = next slash starts when the previous is ~82% through
 * its fade — almost gone but not fully invisible.
 */
const SLASH_WAIT_FRACTION = 0.4

/** ms of cooldown between waves per spawner — controls tempo. */
const WAVE_INTERVAL_MIN = 600
const WAVE_INTERVAL_MAX = 2000

export class SlashEventState {
  private _slashes: InternalSlash[] = []
  // Two dedicated spawners — one per direction.
  private _lrWave: InternalWave | null = null  // always L→R
  private _rlWave: InternalWave | null = null  // always R→L
  private _lrTimer: number  // cooldown until next L→R wave
  private _rlTimer: number  // cooldown until next R→L wave
  private _lastTickMs: number
  private _nextId = 0
  private readonly _paletteLength: number
  private readonly _lrColorIndex: number  // fixed color for all L→R slashes
  private readonly _rlColorIndex: number  // fixed color for all R→L slashes

  constructor(paletteLength = 4, lrColorIndex?: number, rlColorIndex?: number) {
    this._paletteLength = paletteLength
    this._lrColorIndex = lrColorIndex ?? Math.floor(Math.random() * paletteLength)
    this._rlColorIndex = rlColorIndex ?? Math.floor(Math.random() * paletteLength)
    this._lastTickMs = Date.now()
    // Stagger initial waves so L→R and R→L don't fire simultaneously.
    this._lrTimer = 300  + Math.random() * 700
    this._rlTimer = 1500 + Math.random() * 1500
  }

  /** Double the fade duration of a slash by id. Called when it participates in an intersection. */
  extendFade(id: number, multiplier: number): void {
    const slash = this._slashes.find(s => s.id === id)
    if (slash) slash.fadeMs = slash.fadeMs * multiplier
  }

  /**
   * Kill the active wave for the given sweep direction and start a normal cooldown.
   * Called when a slash from that wave participates in an intersection — the wave
   * "spent itself" on the crossing and stops spawning further slashes.
   */
  stopWave(sweepDir: 1 | -1): void {
    if (sweepDir === 1) {
      this._lrWave = null
      this._lrTimer = WAVE_INTERVAL_MIN + Math.random() * (WAVE_INTERVAL_MAX - WAVE_INTERVAL_MIN)
    } else {
      this._rlWave = null
      this._rlTimer = WAVE_INTERVAL_MIN + Math.random() * (WAVE_INTERVAL_MAX - WAVE_INTERVAL_MIN)
    }
  }

  get activeSlashes(): readonly ActiveSlash[] {
    return this._slashes
      .map(s => ({
        id:           s.id,
        cx:           s.cx,
        cy:           s.cy,
        dir:          s.dir,
        type:         s.type,
        colorIndex:   s.colorIndex,
        alpha:        this._alpha(s),
        waveSweepDir: s.waveSweepDir,
      }))
      .filter(s => s.alpha > 0.01)
  }

  tick(): void {
    const now = Date.now()
    const dt  = now - this._lastTickMs
    this._lastTickMs = now

    // Advance slash lifetimes + vertical drift
    for (const s of this._slashes) {
      s.elapsed += dt
      s.cy += s.driftY * dt
    }
    this._slashes = this._slashes.filter(
      s => s.elapsed < s.appearMs + s.lingerMs + s.fadeMs,
    )

    // L→R spawner
    if (this._lrWave !== null) {
      this._lrWave = this._tickWave(this._lrWave, dt)
      if (this._lrWave === null) {
        // Wave just finished — start cooldown for next one.
        this._lrTimer = WAVE_INTERVAL_MIN + Math.random() * (WAVE_INTERVAL_MAX - WAVE_INTERVAL_MIN)
      }
    } else {
      this._lrTimer -= dt
      if (this._lrTimer <= 0) {
        this._lrWave = this._makeWave(1)
      }
    }

    // R→L spawner
    if (this._rlWave !== null) {
      this._rlWave = this._tickWave(this._rlWave, dt)
      if (this._rlWave === null) {
        this._rlTimer = WAVE_INTERVAL_MIN + Math.random() * (WAVE_INTERVAL_MAX - WAVE_INTERVAL_MIN)
      }
    } else {
      this._rlTimer -= dt
      if (this._rlTimer <= 0) {
        this._rlWave = this._makeWave(-1)
      }
    }
  }

  /** Advance one wave by dt ms. Returns null when the wave has exited the bar. */
  private _tickWave(wave: InternalWave, dt: number): InternalWave | null {
    wave.elapsed += dt
    wave.sweepX  += wave.sweepDir * wave.sweepSpeed * dt
    wave.spawnTimer -= dt

    if (wave.spawnTimer <= 0) {
      if (wave.sweepX >= 0.0 && wave.sweepX <= 1.0) {
        this._spawnSlashFromWave(wave)
      }
      // Spacing is constant for this wave — set once at spawn, never changes.
      wave.spawnTimer = (wave.slashAppearMs + wave.slashLingerMs + wave.slashFadeMs) * SLASH_WAIT_FRACTION
    }

    const exitedBar = wave.sweepDir === 1 ? wave.sweepX > 1.1 : wave.sweepX < -0.1
    if (wave.elapsed >= wave.totalLifeMs || exitedBar) return null
    return wave
  }

  private _makeWave(sweepDir: 1 | -1): InternalWave {
    // Speed: crosses bar in ~1.5s (fast) to ~3.5s (slow) — fixed for this wave.
    const sweepSpeed  = 0.0003 + Math.random() * 0.0005
    const crossTimeMs = 1.0 / sweepSpeed
    // Slash timing — randomised once, constant for all slashes in this wave. (+20% vs original)
    const slashAppearMs = 180 + Math.random() * 240   // 180–420ms
    const slashLingerMs = 180 + Math.random() * 540   // 180–720ms
    const slashFadeMs   = 300 + Math.random() * 420   // 300–720ms
    return {
      sweepDir,
      sweepX:       sweepDir === 1 ? -0.02 : 1.02,
      sweepSpeed,
      spawnTimer:   0,  // spawn first slash immediately when in range
      slashAppearMs,
      slashLingerMs,
      slashFadeMs,
      elapsed:         0,
      totalLifeMs:     crossTimeMs + 800,
      lastSlashDir:    null,
      fixedColorIndex: sweepDir === 1 ? this._lrColorIndex : this._rlColorIndex,
    }
  }

  private _spawnSlashFromWave(wave: InternalWave): void {
    const jitter    = (Math.random() - 0.5) * 0.03
    const cx        = Math.max(0.01, Math.min(0.99, wave.sweepX + jitter))
    const dir: SlashDir = wave.lastSlashDir === null
      ? (Math.random() < 0.5 ? 'back' : 'forward')
      : (wave.lastSlashDir === 'back' ? 'forward' : 'back')
    wave.lastSlashDir = dir
    const type      = this._pickType()
    // cy: ±2px of bar centre in normalised units. Bar height ~40px → 2px = 0.05.
    const cy        = 0.5 + (Math.random() - 0.5) * 0.1
    const driftMag  = 0.00002 + Math.random() * 0.00006
    const driftY    = Math.random() < 0.5 ? driftMag : -driftMag
    this._slashes.push({
      id:           this._nextId++,
      cx,
      cy,
      dir,
      type,
      colorIndex:   wave.fixedColorIndex,
      // Use wave-fixed timing — every slash in this wave has the same duration.
      appearMs:     wave.slashAppearMs,
      lingerMs:     wave.slashLingerMs,
      fadeMs:       wave.slashFadeMs,
      elapsed:      0,
      driftY,
      waveSweepDir: wave.sweepDir,
    })
  }

  private _alpha(s: InternalSlash): number {
    if (s.elapsed < s.appearMs) return (s.elapsed / s.appearMs) * 0.92
    const afterLinger = s.elapsed - s.appearMs - s.lingerMs
    if (afterLinger <= 0) return 0.92
    if (afterLinger < s.fadeMs) return 0.92 * (1 - afterLinger / s.fadeMs)
    return 0
  }

  /** Equal 25% weights — type is independent of direction. */
  private _pickType(): SlashType {
    const r = Math.random()
    if (r < 0.25) return 'glow'
    if (r < 0.50) return 'wind'
    if (r < 0.75) return 'diamond'
    return 'lightning'
  }

}
