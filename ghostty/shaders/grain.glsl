// Chrysaki hex-wave shader for Ghostty.
// A faint hex grid with tactical triangles at the corners. A wave band crosses
// the grid, spins each hex 60 degrees, and blends the grid from one Chrysaki
// accent to the next. A soft vignette darkens the edges.

// ── Mode ──────────────────────────────────────────────────────────────────────
// 1 animates the wave. Pair it with custom-shader-animation = true.
// 0 draws the grid at rest. Pair it with custom-shader-animation = false.
// With animation off, Ghostty redraws only when the terminal changes. A moving
// wave then jumps to a new place on every keystroke, so mode 0 removes time.
// The ghostty-shader script switches modes without an edit to this file.
#define ANIMATE 0

// ── Tunables ──────────────────────────────────────────────────────────────────
const float CELL   = 120.0;       // Hex cell size in px.
const float PX     = 1.0 / CELL;  // One pixel in cell units.
const float SPEED  = 2.5;         // Wave speed in cells per second.
const float PERIOD = 50.0;        // Cells per cycle. 20 s per cycle at SPEED 2.5.
const float RING_R = 0.43;        // Ring radius in hexDist units.
const float TRI_R  = 0.018;       // Corner triangle size.

// Rest state for mode 0. The band sits past the right edge, so every hex has
// finished its 60 degree turn and reads as upright in one colour.
const int   STILL_IDX    = 2;     // Amethyst.
const float STILL_MARGIN = 8.0;   // Cells past the edge. The trail is below 0.2% here.

// ── Palette ───────────────────────────────────────────────────────────────────
const vec3 ACCENTS[4] = vec3[4](
    vec3(0.102, 0.541, 0.416),    // Emerald Lt    #1a8a6a
    vec3(0.110, 0.239, 0.478),    // Royal Blue Lt #1c3d7a
    vec3(0.345, 0.188, 0.565),    // Amethyst Lt   #583090
    vec3(0.125, 0.588, 0.612)     // Teal Lt       #20969c
);
// One complementary triangle colour per ACCENTS entry.
const vec3 TRI_COLORS[4] = vec3[4](
    vec3(0.839, 0.122, 0.565),    // Magenta    #D61F90, against Emerald
    vec3(0.984, 0.694, 0.235),    // Blonde     #FBB13C, against Royal Blue
    vec3(0.506, 0.773, 0.125),    // Chartreuse #81C520, against Amethyst
    vec3(0.714, 0.247, 0.290)     // Error Lt   #b53f4a, against Teal
);

// Hex corners in cell units, with the direction each triangle points.
const vec2 TRI_POS[6] = vec2[6](
    vec2( 0.0,  0.57735), vec2( 0.5,  0.28868), vec2( 0.5, -0.28868),
    vec2( 0.0, -0.57735), vec2(-0.5, -0.28868), vec2(-0.5,  0.28868)
);
const float TRI_DIR[6] = float[6](-1.0, 1.0, -1.0, 1.0, -1.0, 1.0);

// The cell and its six neighbours. A spun ring can spill into a neighbour.
const vec2 OFF[7] = vec2[7](
    vec2( 0.0,  0.0),       vec2( 1.0,  0.0),       vec2(-1.0,  0.0),
    vec2( 0.5,  0.8660254), vec2(-0.5,  0.8660254),
    vec2( 0.5, -0.8660254), vec2(-0.5, -0.8660254)
);

// ── Geometry ──────────────────────────────────────────────────────────────────
// Returns the offset inside the nearest hex (xy) and that hex's centre (zw).
vec4 hexCoords(vec2 uv) {
    const vec2 r = vec2(1.0, 1.7320508);
    vec2 h = r * 0.5;
    vec2 a = mod(uv, r) - h;
    vec2 b = mod(uv - h, r) - h;
    vec2 gv = dot(a, a) < dot(b, b) ? a : b;
    return vec4(gv, uv - gv);
}

// Hex distance: 0 at the centre, 0.5 at a corner. It is 1-Lipschitz, so one
// pixel of screen distance changes it by at most PX.
float hexDist(vec2 p) {
    p = abs(p);
    return max(dot(p, vec2(0.5, 0.8660254)), p.x);
}

// Equilateral triangle SDF (IQ formulation), pointing up, half side r.
float triSDF(vec2 p, float r) {
    const float k = 1.7320508;
    p.x = abs(p.x) - r;
    p.y = p.y + r / k;
    if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) * 0.5;
    p.x -= clamp(p.x, -2.0 * r, 0.0);
    return -length(p) * sign(p.y);
}

// Anti-aliased ring about 2 px wide at radius r. The old step() ring aliased.
float hexRing(float d, float r) {
    float halfWidth = 0.02 * r;
    return 1.0 - smoothstep(halfWidth - 0.5 * PX, halfWidth + 0.5 * PX, abs(d - r));
}

vec2 rotate(vec2 p, float a) {
    float c = cos(a), s = sin(a);
    return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

// Scales c so that its Rec. 709 luminance matches Amethyst Lt. All four
// accents then read at the same brightness.
const vec3  LUM        = vec3(0.2126, 0.7152, 0.0722);
const float TARGET_LUM = 0.2126 * 0.345 + 0.7152 * 0.188 + 0.0722 * 0.565;
vec3 normLum(vec3 c) { return c * (TARGET_LUM / max(dot(c, LUM), 0.001)); }

float hash(float n) { return fract(sin(n * 127.1 + 43.5) * 43758.5); }

// ── Main ──────────────────────────────────────────────────────────────────────
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv    = fragCoord / iResolution.xy;
    vec4 color = texture(iChannel0, uv);

    vec4  hc         = hexCoords(fragCoord / CELL);
    vec2  cellCenter = hc.zw;
    vec2  extent     = iResolution.xy / CELL;

    // ── Wave state: direction, colour pair and band position ─────────────────
#if ANIMATE
    float cycleN = floor(iTime * SPEED / PERIOD);
    float cycleT = mod(iTime * SPEED, PERIOD);
    float seed   = hash(cycleN);
    float angle  = floor(seed * 8.0) * 0.7853982;
    int   newIdx = int(seed * 4.0);
    int   oldIdx = int(hash(cycleN - 1.0) * 4.0);
    // Each cycle must change colour.
    if (oldIdx == newIdx) oldIdx = (oldIdx + 1) % 4;
    vec2  waveDir = vec2(cos(angle), sin(angle));
    // Start the band just outside the first corner it reaches.
    float minProj = min(0.0, waveDir.x * extent.x) + min(0.0, waveDir.y * extent.y);
    float wavePos = cycleT + minProj - 4.0;
#else
    int   oldIdx  = STILL_IDX;
    int   newIdx  = STILL_IDX;
    vec2  waveDir = vec2(1.0, 0.0);
    float wavePos = extent.x + STILL_MARGIN;
#endif

    vec3 oldCol = normLum(ACCENTS[oldIdx]);
    vec3 newCol = normLum(ACCENTS[newIdx]);

    // ── This cell's place in the band ────────────────────────────────────────
    float dx       = dot(cellCenter, waveDir) - wavePos;
    float lead     = exp(-max(dx, 0.0) * max(dx, 0.0) * 0.35);
    float trail    = exp(-max(-dx, 0.0) * max(-dx, 0.0) * 0.10);
    float pop      = lead * trail;
    float progress = smoothstep(-2.5, 2.5, -dx);   // 0 to 1 as the band passes.
    float growPop  = exp(-dx * dx * 0.8);          // 1 at the band centre.

    vec3 hexColor = mix(oldCol, newCol, progress);
    vec3 triColor = mix(TRI_COLORS[oldIdx], TRI_COLORS[newIdx], progress);

    // ── Base grid and resting ring, hidden while the hex spins ───────────────
    float normalMask = 1.0 - smoothstep(0.2, 0.7, growPop);
    float dBase      = hexDist(hc.xy);
    float dSpun      = hexDist(rotate(hc.xy, progress * 1.0471976));
    color.rgb += hexColor * hexRing(dBase, RING_R) * 0.012 * normalMask;
    color.rgb += hexColor * hexRing(dSpun, RING_R) * mix(0.00165, 0.0077, pop) * normalMask;

    // ── Corner triangles ─────────────────────────────────────────────────────
    // A triangle lies within its circumradius (about 0.021) of a corner, where
    // hexDist is 0.5. Pixels below 0.47 cannot touch one, which skips the loop
    // for about 88% of each cell.
    if (dBase > 0.47) {
        float triMask = 0.0;
        for (int j = 0; j < 6; j++) {
            vec2 lp = hc.xy - TRI_POS[j];
            lp.y *= TRI_DIR[j];
            triMask = max(triMask, smoothstep(0.003, -0.003, triSDF(lp, TRI_R)));
        }
        color.rgb += triColor * triMask * (0.020 + 0.040 * growPop);
    }

    // ── Spun and grown rings of this cell and its neighbours ─────────────────
    // A neighbour's projection differs from this cell's by at most 1, and a
    // ring with growPop below 0.02 is skipped (|dx| above 2.21). So a cell
    // further than 3.3 from the band has nothing to draw here.
    if (abs(dx) < 3.3) {
        float bestEdge = 0.0;
        float bestProg = 0.0;
        for (int i = 0; i < 7; i++) {
            float cDx      = dot(cellCenter + OFF[i], waveDir) - wavePos;
            float cGrowPop = exp(-cDx * cDx * 0.8);
            if (cGrowPop < 0.02) continue;
            float cProg = smoothstep(-2.5, 2.5, -cDx);
            float d     = hexDist(rotate(hc.xy - OFF[i], cProg * 1.0471976));
            float val   = hexRing(d, RING_R * (1.0 + 0.038 * cGrowPop)) * cGrowPop;
            if (val > bestEdge) {
                bestEdge = val;
                bestProg = cProg;
            }
        }
        color.rgb += mix(oldCol, newCol, bestProg) * bestEdge * 0.0545;
    }

    // ── Vignette ─────────────────────────────────────────────────────────────
    vec2 q = uv - 0.5;
    q.x *= iResolution.x / iResolution.y;
    float vig = clamp(smoothstep(0.0, 1.0, 1.0 - dot(q, q) * 1.8), 0.0, 1.0);
    color.rgb *= mix(0.85, 1.0, vig);

    fragColor = color;
}
