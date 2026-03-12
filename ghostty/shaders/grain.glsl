// Chrysaki — Ghostty terminal shader
// Hex wave: Chrysaki color cycling — each wave cycle transitions to a new accent color

vec4 hexCoords(vec2 uv) {
    const vec2 r = vec2(1.0, 1.7320508);
    vec2 h = r * 0.5;
    vec2 a = mod(uv, r) - h;
    vec2 b = mod(uv - h, r) - h;
    vec2 gv = dot(a, a) < dot(b, b) ? a : b;
    return vec4(gv, uv - gv);
}

// Flat-top hex SDF: 0 = centre, 0.5 = edge
float hexDist(vec2 p) {
    p = abs(p);
    return max(dot(p, normalize(vec2(1.0, 1.7320508))), p.x);
}

// Equilateral triangle SDF (IQ formulation), pointing up, size controlled by r
float triSDF(vec2 p, float r) {
    const float k = 1.73205;
    p.x = abs(p.x) - r;
    p.y = p.y + r / k;
    if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) * 0.5;
    p.x -= clamp(p.x, -2.0 * r, 0.0);
    return -length(p) * sign(p.y);
}

// ~2px hex ring at radius r
float hexRing(float d, float r) {
    float k = r * 2.0;
    return step(0.490 * k, d) * (1.0 - step(0.510 * k, d));
}

// Perceived luminance (Rec. 709)
float percLum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// Scale c so its perceived luminance matches Amethyst's (#583090 = 0.345,0.188,0.565)
const float TARGET_LUM = 0.2126 * 0.345 + 0.7152 * 0.188 + 0.0722 * 0.565;
vec3 normLum(vec3 c) { return c * (TARGET_LUM / max(percLum(c), 0.001)); }

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv  = fragCoord / iResolution.xy;
    float ar = iResolution.x / iResolution.y;
    vec4 color = texture(iChannel0, uv);

    // ── Hex grid ─────────────────────────────────────────────────────────────
    float cellSize   = 120.0;
    vec4  hc         = hexCoords(fragCoord / cellSize);
    vec2  cellCenter = hc.zw;

    // ── Wave: new random direction each cycle ────────────────────────────────
    float speed  = 2.5;
    float period = 50.0;  // 25% slower than 40 (10 s per cycle)
    float cycleT = mod(iTime * speed, period);
    float cycleN = floor(iTime * speed / period);
    float slot     = floor(fract(sin(cycleN * 127.1 + 43.5) * 43758.5) * 8.0);
    float dirAngle = slot * 0.7853982;
    vec2  waveDir  = vec2(cos(dirAngle), sin(dirAngle));

    // ── Chrysaki accent palette (light variants) ──────────────────────────────
    const vec3 ACCENTS[4] = vec3[4](
        vec3(0.102, 0.541, 0.416),   // Emerald   #1a8a6a
        vec3(0.110, 0.239, 0.478),   // Royal Blue #1c3d7a
        vec3(0.345, 0.188, 0.565),   // Amethyst  #583090
        vec3(0.125, 0.588, 0.612)    // Teal      #20969c
    );
    // Complementary triangle colors — one per ACCENTS index
    const vec3 TRI_COLORS[4] = vec3[4](
        vec3(0.839, 0.122, 0.565),   // Magenta    #D61F90 — complement of Emerald
        vec3(0.984, 0.694, 0.235),   // Blonde     #FBB13C — complement of Royal Blue
        vec3(0.506, 0.773, 0.125),   // Chartreuse #81C520 — complement of Amethyst
        vec3(0.714, 0.247, 0.290)    // Error Lt   #b53f4a — complement of Teal
    );

    // Pick new color from cycleN, old color from cycleN-1 (offset by 1 so they differ)
    int newIdx = int(mod(fract(sin(cycleN        * 127.1 + 43.5) * 43758.5) * 4.0, 4.0));
    int oldIdx = int(mod(fract(sin((cycleN - 1.0) * 127.1 + 43.5) * 43758.5) * 4.0, 4.0));
    // Ensure they differ by shifting if equal
    if (oldIdx == newIdx) oldIdx = int(mod(float(oldIdx + 1), 4.0));
    vec3 newColor = ACCENTS[newIdx];
    vec3 oldColor = ACCENTS[oldIdx];

    float extX    = iResolution.x / cellSize;
    float extY    = iResolution.y / cellSize;
    float minProj = min(0.0, waveDir.x * extX) + min(0.0, waveDir.y * extY);
    float wavePos = cycleT + minProj - 4.0;

    float cellProj = dot(cellCenter, waveDir);
    float dx       = cellProj - wavePos;

    // ── Wave envelope: 7 hexes wide ──────────────────────────────────────────
    float lead  = exp(-max(dx,  0.0) * max(dx,  0.0) * 0.35);
    float trail = exp(-max(-dx, 0.0) * max(-dx, 0.0) * 0.10);
    float pop   = lead * trail;

    // ── Continuous spin: sigmoid progress + bell-curve growth ────────────────
    float progress  = smoothstep(-2.5, 2.5, -dx);     // 0→1 as wave passes

    // ── Color: blend old → new as wave passes (progress 0→1) ────────────────
    vec3 hexColor = normLum(mix(oldColor, newColor, progress));
    vec3 triColor = mix(TRI_COLORS[oldIdx], TRI_COLORS[newIdx], progress);
    vec3 waveCol  = hexColor;
    float spinAngle = progress * 1.04720;              // 60° total rotation
    float growPop   = exp(-dx * dx * 0.8);             // bell: 1.0 at dx=0, ~0.45 at ±1
    float ringScale = 1.0 + 0.038 * growPop;          // fills gap: 1.042x at centre, ~1.02x at ±1

    float ca = cos(spinAngle), sa = sin(spinAngle);
    vec2 rotP = vec2(ca * hc.x - sa * hc.y, sa * hc.x + ca * hc.y);
    float d     = hexDist(rotP);
    float dBase = hexDist(hc.xy);  // unrotated, for the permanent base grid

    // ── Base hex grid: hidden while hex is spinning ───────────────────────────
    float normalMask = 1.0 - smoothstep(0.2, 0.7, growPop);
    float baseEdge = hexRing(dBase, 0.43);
    color.rgb += hexColor * baseEdge * 0.012 * normalMask;

    // ── Tactical triangles at hex corners ─────────────────────────────────────
    // Each corner is shared by 3 hexes; triangles alternate up/down
    const vec2 TRI_POS[6] = vec2[6](
        vec2( 0.0,    0.57735),   // down
        vec2( 0.5,    0.28868),   // up
        vec2( 0.5,   -0.28868),   // down
        vec2( 0.0,   -0.57735),   // up
        vec2(-0.5,   -0.28868),   // down
        vec2(-0.5,    0.28868)    // up
    );
    const float TRI_DIR[6] = float[6](-1.0, 1.0, -1.0, 1.0, -1.0, 1.0);
    float triMask = 0.0;
    for (int j = 0; j < 6; j++) {
        vec2 lp = hc.xy - TRI_POS[j];
        lp.y *= TRI_DIR[j];
        triMask = max(triMask, smoothstep(0.003, -0.003, triSDF(lp, 0.018)));
    }
    color.rgb += triColor * triMask * 0.020;
    color.rgb += triColor * triMask * growPop * 0.040;

    // ── Wave ring: groove-style, wave-coloured ────────────────────────────────
    float edge   = hexRing(d, 0.43);
    float bright = mix(0.00165, 0.0077, pop);
    color.rgb   += waveCol * edge * bright * normalMask;

    // ── Expanded rings: all hex candidates in wave ────────────────────────────
    const vec2 OFF[7] = vec2[7](
        vec2( 0.0,  0.0      ),
        vec2( 1.0,  0.0      ),
        vec2(-1.0,  0.0      ),
        vec2( 0.5,  0.8660254),
        vec2(-0.5,  0.8660254),
        vec2( 0.5, -0.8660254),
        vec2(-0.5, -0.8660254)
    );

    float bestEdge = 0.0;
    vec3  bestCol  = vec3(0.0);

    for (int i = 0; i < 7; i++) {
        vec2 cand = cellCenter + OFF[i];

        float cProj     = dot(cand, waveDir);
        float cDx       = cProj - wavePos;
        float cProgress = smoothstep(-2.5, 2.5, -cDx);
        float cGrowPop  = exp(-cDx * cDx * 0.8);
        float cRingScale = 1.0 + 0.038 * cGrowPop;
        if (cGrowPop < 0.02) continue;

        vec2  lp  = hc.xy - OFF[i];
        float ang = cProgress * 1.04720;
        float c   = cos(ang), s = sin(ang);
        vec2  rlp = vec2(c * lp.x - s * lp.y, s * lp.x + c * lp.y);

        float bigD    = hexDist(rlp);
        float ringR   = 0.43 * cRingScale;
        float bigEdge = hexRing(bigD, ringR);
        float val     = bigEdge * cGrowPop;

        if (val > bestEdge) {
            bestEdge = val;
            bestCol = normLum(mix(oldColor, newColor, cProgress));
        }
    }

    color.rgb += bestCol * bestEdge * 0.0545;

    // ── Vignette ─────────────────────────────────────────────────────────────
    vec2 q = uv - 0.5;
    q.x *= ar;
    float vig = clamp(smoothstep(0.0, 1.0, 1.0 - dot(q, q) * 1.8), 0.0, 1.0);
    color.rgb *= mix(0.85, 1.0, vig);

    fragColor = color;
}
