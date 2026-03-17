# MANGA-INK.md

Design ideation for incorporating manga/manhwa comic art aesthetics into the Chrysaki system. This is an exploration document — nothing here is enforced yet. Graduate elements into CLAUDE.md once tested and decided.

---

## Conceptual Synthesis

Current brand personality: **Jeweled · Modern · Geometric.**

Proposed extension: **Jeweled · Modern · Geometric · Inked.**

The apparent tension between "dark glass + gemstones" and "manga ink" resolves through the right reference: not shounen on white paper, but **manhwa dark panels** — Tower of God, Solo Leveling, Omniscient Reader. Those share:

- Heavy black ink outlines on jewel-tone color fills
- Precisely composed, angular panel layouts
- Rich saturated color against near-black backgrounds
- Screentone used for depth and atmosphere, not surface decoration

Chrysaki already *is* this — it just hasn't named the lineage.

**The metaphor: "A manhwa set in a gemstone vault."**

- Trapezoid tiling segments → panel composition
- Jewel-tone fills → panel color
- Abyss ground between islands → the gutter
- Geometric shapes → panel crops

The geometry doesn't change. It gets **ink weight**.

---

## Elements

### 1. Screentone — ambient surface texture

Classic manga screentone: dot or line grid at a specific angle/density, filling panel backgrounds to suggest depth or atmosphere.

```css
/* Neutral dot screentone — on Surface-level containers */
background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
background-size: 8px 8px;

/* Jewel-colored screentone — on accent segment fills */
background-image: radial-gradient(circle, rgba(26,138,106,0.25) 1.5px, transparent 1.5px);
background-size: 6px 6px;

/* Diamond grid variant (offset rows) */
background-image: radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px);
background-size: 8px 8px;
background-position: 4px 4px;
```

**Rules**:
- Screentone is a texture layer, not a fill — always behind content
- Neutral alpha: 0.04–0.08. Jewel-tone alpha: 0.15–0.30
- Only on Surface-or-higher containers — never on Abyss chrome
- Never on interactive elements (buttons, clickable segments)

**Where it goes**: sidebar/card backgrounds, jewel-tone segment interiors for richness, panel gutter texture.

---

### 2. Hatching and cross-hatching — shadow and state encoding

Single-direction hatching = light shadow/depth. Cross-hatching = deep shadow or blocked state. This creates a **second channel of state information** beyond color — useful for accessibility and for ports where color alone is ambiguous.

```css
/* Single hatch — "shadowed" or secondary elements */
background-image: repeating-linear-gradient(
  45deg,
  transparent 0px, transparent 4px,
  rgba(255,255,255,0.04) 4px, rgba(255,255,255,0.04) 5px
);

/* Cross-hatch — disabled or blocked state */
background-image:
  repeating-linear-gradient(
    45deg,
    transparent 0px, transparent 4px,
    rgba(255,255,255,0.03) 4px, rgba(255,255,255,0.03) 5px
  ),
  repeating-linear-gradient(
    -45deg,
    transparent 0px, transparent 4px,
    rgba(255,255,255,0.03) 4px, rgba(255,255,255,0.03) 5px
  );

/* Coarse dots — error or critical state */
background-image: radial-gradient(circle, rgba(140,47,57,0.35) 2px, transparent 2px);
background-size: 10px 10px;
```

**Proposed state encoding table**:

| Pattern | State |
|:--------|:------|
| Clean fill | Normal |
| Dot screentone (fine) | Ambient / idle |
| Single hatch | Inactive / secondary |
| Cross-hatch | Disabled / blocked |
| Coarse dots (error-toned) | Error / critical |

---

### 3. Speed lines — reserved emphasis

Radial bursts are how manga directs the eye to the most important thing on a page. **Only one speed-line context on screen at a time.** If everything radiates, nothing does.

```css
/* Radial speed lines — as ::before pseudo-element behind active item */
background: repeating-conic-gradient(
  rgba(255,255,255,0.07) 0deg 2deg,
  transparent 2deg 10deg
);
```

For Cairo (GTK4/AGS), the equivalent is programmatic line drawing radiating from the pip center.

**Permitted use cases** (pick at most one at a time):
- Active workspace pip — burst radiates behind the hex on focus
- Critical alert icon emphasis
- Power menu trigger on hover

Nowhere else.

---

### 4. Ink weight — borders have hierarchy

Manga inkers vary line weight deliberately. Primary outlines are heavy; interior details are thin. Chrysaki currently treats all borders as 1px. The ink hierarchy:

| Context | Weight | Color |
|:--------|:-------|:------|
| Primary container / island outline | 2px | Jewel-tone (light variant) |
| Active / focused selection | 2px | Jewel-tone (light variant) |
| Interior dividers between segments | 1px | Border token (`#363a4f`) |
| Ghost / secondary grouping | 1px | Border token at 50% alpha |

**Ink pressure trick** — asymmetric border simulates pen weight variation (more pressure top-left as the stroke begins):

```css
border-top:    2px solid var(--emerald-light);
border-left:   2px solid var(--emerald-light);
border-bottom: 1px solid var(--emerald-dim);
border-right:  1px solid var(--emerald-dim);
```

---

### 5. Hard shadow vs. soft shadow

Glassmorphism uses soft, diffused shadows. Manga uses hard, zero-blur offset shadows — the "dropped ink" shadow. Both have a place in Chrysaki; the choice signals layer type.

```css
/* Hard shadow — grounded/planted elements (bar islands, status blocks) */
box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.70);

/* Soft shadow — floating/glass elements (tooltips, popovers) */
box-shadow: 0 4px 30px rgba(0, 0, 0, 0.30);
```

**Rule**: Glass surfaces (floating panels, tooltips, overlays) keep soft shadows. Grounded segment elements (bar islands, status blocks, active items) use hard shadows. The distinction signals floating vs. planted.

---

### 6. Panel gutter as first-class design element

The Abyss gaps between the three bar islands are already panel gutters. Make this explicit:

- Gutter width is intentional and consistent: **8px between islands**, **4px between intra-island segments**
- Gutters are never filled — Abyss always shows through
- Optional: gutter screentone at 3% opacity (the panel ink barely bleeds into the gutter)
- **Panel bleed**: elements near an island edge may touch the border — icons don't require internal padding buffer. Implied continuation beyond the frame is a valid compositional choice.

---

## Productive Tensions (preserve, do not resolve)

**Glass vs. Ink**
Glass = floating / digital layer. Ink = grounded / planted layer. Both coexist. A tooltip floats on glass. A status segment is planted in ink. The distinction creates depth — collapsing them into one mode flattens the hierarchy.

**Clean vs. Textured**
Texture is the exception, not the ambient state. A screentone surface reads as "this has depth" only when neighboring elements are clean. Texture everything and it becomes visual noise. Ratio target: no more than 30% of visible surface area carrying a texture pattern.

**Precise vs. Organic**
Chrysaki stays geometric and precise. The manga influence is in *pattern logic* (screentone, hatching) and *weight hierarchy* (ink weight), not in hand-drawn imprecision. The reference is digitally-produced manhwa, not rough traditional manga with visible brush wobble.

---

## Hard No's

- **No white or light backgrounds** — reference is dark manhwa panels, not white-page shounen
- **No literal speech/thought bubbles** — tooltips stay chamfered. The shape library does not grow a bubble shape.
- **No SVG noise/grain filters for paper texture** — that's risograph/zine aesthetic. Chrysaki stays crisp.
- **No rough edges** — `filter: url(#roughen)` / SVG turbulence breaks the precision identity entirely
- **No texture on every surface** — screentone is an accent, not wallpaper

---

## Candidate Design Principle (for eventual graduation to CLAUDE.md)

> **Ink gives weight, texture gives depth.** The manga/manhwa lineage of Chrysaki is expressed through three instruments: *screentone* (dot or line patterns at 4–8% opacity on surface containers, for ambient depth), *ink weight* (2px active borders vs 1px dividers, asymmetric to imply pen pressure), and *hard shadows* (zero-blur 3px drop shadows on grounded elements, as opposed to diffused glass shadows on floating elements). Speed lines (radial bursts) are reserved for the single most important active state visible on screen. Cross-hatching encodes disabled/blocked states as a second channel beyond color. These are structural tools, not decoration — each used sparingly and purposefully.
