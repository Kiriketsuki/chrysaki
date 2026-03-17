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
  readonly cx: number        // meeting point (normalised 0..1) — where the pair converges
  readonly drawnCx: number   // current visual x = cx + pairOffset * (1 - closeT)
  readonly cy: number        // normalised 0..1 along bar height
  readonly dir: SlashDir
  readonly type: SlashType
  readonly alpha: number     // 0..0.92 current opacity
  readonly colorIndex: number
  readonly waveSweepDir: 1 | -1  // which spawner produced this slash (+1 = L→R, -1 = R→L)
  readonly appearing: boolean    // true while still in the appear phase (elapsed < appearMs)
  readonly closeT: number        // 0=open (at pairOffset from cx), 1=closed (at cx)
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
  readonly cx: number           // normalised 0..1
  readonly cy: number           // normalised 0..1
  readonly colorIndex: number   // target color
  readonly fromColorIndex: number  // gradient base color at spawn — for ring color lerp
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
    // Capture current gradient base color for the ring color lerp
    const fromColorIndex = this._toStops[0]?.colorIndex ?? 0
    this._ripples = [
      ...ripples,
      { cx, cy, colorIndex, fromColorIndex, radiusPx: 0, startMs: Date.now() },
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

/**
 * A spawner: a directional cursor that marches across the bar one slash at a time.
 * Position of each new slash = previous slash position + slashSpacing.
 * Timing of each new slash = triggered when the current slash is near end of fade.
 */
interface InternalSpawner {
  sweepDir: 1 | -1           // +1 = L→R, -1 = R→L
  currentX: number           // x of the most recently spawned slash (normalised 0..1)
  nextDir: SlashDir          // direction of the next slash — alternates each spawn
  fixedColorIndex: number    // all slashes from this spawner share one color
  activeSlashId: number | null  // ID of the slash currently being tracked for timing
  done: boolean              // true when currentX has left the bar; waits for last slash to fade
}

interface InternalSlash {
  id: number
  cx: number   // visual x position (normalised 0..1)
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

// ── Fixed slash timing ────────────────────────────────────────────────────────
const SLASH_APPEAR_MS = 200  // ms to reach full alpha
const SLASH_LINGER_MS = 300  // ms at full alpha before fade
const SLASH_FADE_MS   = 200  // ms to fade out

// Colliding slashes are reset to these unified values; their spawners stay blocked
// until the slashes are fully gone.
const COLLISION_LINGER_MS = 1200  // 3× normal linger
const COLLISION_FADE_MS   =  400  // 2× normal fade

/**
 * Fraction through the linger phase at which the next slash is pre-spawned.
 * 0.5 = spawn at the midpoint of linger → next slash appears while current is still bright.
 */
const SPAWN_LINGER_THRESHOLD = 0.5

/** ms of cooldown between spawner runs — controls tempo. */
const WAVE_INTERVAL_MIN = 600
const WAVE_INTERVAL_MAX = 2000

export class SlashEventState {
  private _slashes: InternalSlash[] = []
  // Two dedicated spawners — one per direction.
  private _lrSpawner: InternalSpawner | null = null  // always L→R
  private _rlSpawner: InternalSpawner | null = null  // always R→L
  private _lrTimer: number  // cooldown until next L→R run
  private _rlTimer: number  // cooldown until next R→L run
  // Slash IDs that the spawners are blocked on — run restarts only once the slash fades.
  private _lrWaitId: number | null = null
  private _rlWaitId: number | null = null
  private _lastTickMs: number
  private _nextId = 0
  private readonly _paletteLength: number
  private readonly _lrColorIndex: number  // fixed color for all L→R slashes
  private readonly _rlColorIndex: number  // fixed color for all R→L slashes
  // Bar pixel dimensions — updated each tick from ChamferedBar.
  private _barW = 800
  private _barH = 40

  constructor(paletteLength = 4, lrColorIndex?: number, rlColorIndex?: number) {
    this._paletteLength = paletteLength
    this._lrColorIndex = lrColorIndex ?? Math.floor(Math.random() * paletteLength)
    this._rlColorIndex = rlColorIndex ?? Math.floor(Math.random() * paletteLength)
    this._lastTickMs = Date.now()
    // Stagger initial runs so L→R and R→L don't fire simultaneously.
    this._lrTimer = 300  + Math.random() * 700
    this._rlTimer = 1500 + Math.random() * 1500
  }

  /** Update bar pixel dimensions so spawn spacing stays proportional to bar geometry. */
  setBarDimensions(w: number, h: number): void {
    this._barW = Math.max(1, w)
    this._barH = Math.max(1, h)
  }

  /** Normalised x-distance between consecutive slashes (≈ one slash-height wide). */
  private _slashSpacing(): number {
    return Math.min(0.05, Math.max(0.008, (0.55 * this._barH) / this._barW))
  }

  /**
   * Handle a collision between two slashes (one from each spawner direction).
   * Resets both slashes to shared unified linger/fade durations, kills their
   * respective active spawners, and blocks those spawners until each slash fully fades.
   */
  onCollision(idA: number, idB: number): void {
    for (const s of this._slashes) {
      if (s.id === idA || s.id === idB) {
        // Fast-forward to full alpha if still appearing — no alpha jump
        if (s.elapsed < s.appearMs) s.elapsed = s.appearMs
        // Extend linger from current position so there's no restart to 0
        s.lingerMs = (s.elapsed - s.appearMs) + COLLISION_LINGER_MS
        s.fadeMs   = COLLISION_FADE_MS
        s.driftY   = 0
      }
    }
    const slashA = this._slashes.find(s => s.id === idA)
    const slashB = this._slashes.find(s => s.id === idB)
    if (slashA) this._blockWave(slashA.waveSweepDir, slashA.id)
    if (slashB) this._blockWave(slashB.waveSweepDir, slashB.id)
  }

  private _blockWave(sweepDir: 1 | -1, waitId: number): void {
    if (sweepDir === 1) {
      this._lrSpawner = null
      this._lrWaitId  = waitId
    } else {
      this._rlSpawner = null
      this._rlWaitId  = waitId
    }
  }

  get activeSlashes(): readonly ActiveSlash[] {
    return this._slashes
      .map(s => ({
        id:           s.id,
        cx:           s.cx,
        drawnCx:      s.cx,
        cy:           s.cy,
        dir:          s.dir,
        type:         s.type,
        colorIndex:   s.colorIndex,
        alpha:        this._alpha(s),
        waveSweepDir: s.waveSweepDir,
        appearing:    s.elapsed < s.appearMs,
        closeT:       1,
      }))
      .filter(s => s.alpha > 0.01)
  }

  tick(): void {
    const now = Date.now()
    const dt  = now - this._lastTickMs
    this._lastTickMs = now

    // Advance slash lifetimes + vertical drift.
    for (const s of this._slashes) {
      s.elapsed += dt
      s.cy += s.driftY * dt
    }
    this._slashes = this._slashes.filter(
      s => s.elapsed < s.appearMs + s.lingerMs + s.fadeMs,
    )

    // Unblock spawners whose collision slash has fully faded.
    if (this._lrWaitId !== null && !this._slashes.some(s => s.id === this._lrWaitId)) {
      this._lrWaitId = null
      this._lrTimer  = 300 + Math.random() * 300
    }
    if (this._rlWaitId !== null && !this._slashes.some(s => s.id === this._rlWaitId)) {
      this._rlWaitId = null
      this._rlTimer  = 300 + Math.random() * 300
    }

    // L→R spawner — blocked while waiting on a collision slash to fade.
    if (this._lrSpawner !== null) {
      if (this._tickSpawner(this._lrSpawner)) {
        this._lrSpawner = null
        this._lrTimer = WAVE_INTERVAL_MIN + Math.random() * (WAVE_INTERVAL_MAX - WAVE_INTERVAL_MIN)
      }
    } else if (this._lrWaitId === null) {
      this._lrTimer -= dt
      if (this._lrTimer <= 0) this._lrSpawner = this._makeSpawner(1)
    }

    // R→L spawner — blocked while waiting on a collision slash to fade.
    if (this._rlSpawner !== null) {
      if (this._tickSpawner(this._rlSpawner)) {
        this._rlSpawner = null
        this._rlTimer = WAVE_INTERVAL_MIN + Math.random() * (WAVE_INTERVAL_MAX - WAVE_INTERVAL_MIN)
      }
    } else if (this._rlWaitId === null) {
      this._rlTimer -= dt
      if (this._rlTimer <= 0) this._rlSpawner = this._makeSpawner(-1)
    }
  }

  /**
   * Tick one spawner. Spawns the next slash when the active slash is near end of fade.
   * Returns true when the spawner is fully retired (done + last slash has faded).
   */
  private _tickSpawner(spawner: InternalSpawner): boolean {
    const spacing = this._slashSpacing()

    // Determine whether it's time to spawn the next slash.
    let shouldSpawn = false
    if (spawner.activeSlashId === null) {
      shouldSpawn = true  // first slash, or previous slash retired naturally
    } else {
      const active = this._slashes.find(s => s.id === spawner.activeSlashId)
      if (!active) {
        shouldSpawn = true  // slash expired — spawn immediately at next position
      } else {
        const lingerElapsed = active.elapsed - active.appearMs
        if (lingerElapsed >= active.lingerMs * SPAWN_LINGER_THRESHOLD) shouldSpawn = true
      }
    }

    if (!spawner.done && shouldSpawn) {
      const nextX = spawner.currentX + spawner.sweepDir * spacing
      if (nextX >= 0 && nextX <= 1) {
        spawner.currentX      = nextX
        spawner.activeSlashId = this._spawnSlashFromSpawner(spawner)
      } else {
        spawner.done = true
      }
    }

    // Retire when done and the tracked slash has fully faded.
    if (spawner.done) {
      const lastAlive = spawner.activeSlashId !== null &&
        this._slashes.some(s => s.id === spawner.activeSlashId)
      return !lastAlive
    }
    return false
  }

  private _makeSpawner(sweepDir: 1 | -1): InternalSpawner {
    const spacing = this._slashSpacing()
    return {
      sweepDir,
      // Start one spacing-step outside the bar so the first spawn lands at the edge.
      currentX:        sweepDir === 1 ? -spacing : 1 + spacing,
      nextDir:         Math.random() < 0.5 ? 'forward' : 'back',
      fixedColorIndex: sweepDir === 1 ? this._lrColorIndex : this._rlColorIndex,
      activeSlashId:   null,
      done:            false,
    }
  }

  private _spawnSlashFromSpawner(spawner: InternalSpawner): number {
    const jitter   = (Math.random() - 0.5) * 0.005
    const cx       = Math.max(0.02, Math.min(0.98, spawner.currentX + jitter))
    const cy       = 0.5 + (Math.random() - 0.5) * 0.1
    const driftMag = 0.00002 + Math.random() * 0.00006
    const driftY   = Math.random() < 0.5 ? driftMag : -driftMag
    const id       = this._nextId++

    const tjitter = () => Math.round((Math.random() - 0.5) * 40)  // ±20ms
    this._slashes.push({
      id, cx, cy,
      dir:          spawner.nextDir,
      type:         this._pickType(),
      colorIndex:   spawner.fixedColorIndex,
      appearMs:     SLASH_APPEAR_MS + tjitter(),
      lingerMs:     SLASH_LINGER_MS + tjitter(),
      fadeMs:       SLASH_FADE_MS   + tjitter(),
      elapsed:      0,
      driftY,
      waveSweepDir: spawner.sweepDir,
    })

    spawner.nextDir = spawner.nextDir === 'forward' ? 'back' : 'forward'
    return id
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
