# Firefox Chrysaki: Trapezoid Tabs + Hex Textures (v2.7.0)

## Situation
Building the Chrysaki Firefox theme with alternating trapezoid tab shapes and subtle hex grid textures matching the VSCode workbench CSS. This session resolved the root cause of 3 failed texture attempts (wrong file being loaded), deployed the deploy script, and iterated through 7 versions of the tab shape system.

## Current State
- Branch: `main` (HEAD detached at `f026d21`)
- Uncommitted changes:
  - `firefox/userChrome.css` — v2.7.0, all texture + tab work
  - `firefox/userContent.css` — new tab page styles (unchanged this session)
  - `tools/deploy-firefox.sh` — NEW, OS-agnostic deploy script
  - `tools/texture-explorer.html` — untracked, unexamined
  - `.claude/` — handoffs directory
- Tests: N/A (visual CSS theme — manual verification only)
- What works:
  - Hex dot lattice textures at VSCode-matched opacity (~8% dots, 3% grid lines)
  - Alternating trapezoid tabs: odd=/-\ even=\_/ using `nth-child(N of S)` selector
  - Pinned tabs: |_/ shape (all pins get it, natural stacking hides intermediate / flares)
  - Tab contrast: inactive=surface, active=elevated, hover=raised
  - Close button: parallelogram clip-path on hover
  - Equal 22px padding on both sides of tab content
  - Deploy script: `bash tools/deploy-firefox.sh` auto-detects OS + Firefox profile
- What's incomplete:
  - **New tab button shape**: CSS written (v2.7.0) but UNTESTED — user triggered handoff before restart
  - `nth-child(odd/even of .tabbrowser-tab:not([pinned]))` — untested in userChrome.css (works in web CSS since FF113, but may fail in chrome sheets like `:has()` did)
  - New tab button uses `+` adjacent sibling combinator to detect last tab's shape — needs confirmation that `#tabs-newtab-button` IS a direct sibling of the last `.tabbrowser-tab`

## Key Files
- `firefox/userChrome.css` — all browser chrome styles, v2.7.0
- `firefox/userContent.css` — new tab page styles
- `vscode/chrysaki-workbench.css` — texture opacity reference (6-8% fills)
- `tools/deploy-firefox.sh` — deploy script (must run after every edit)
- `tools/texture-explorer.html` — unexplored, may contain texture experiments

## Decisions Made
- **Deploy workflow**: Repo files are NOT what Firefox reads. Profile files live at `C:\Users\Kidriel\AppData\Roaming\Mozilla\Firefox\Profiles\2ps3r5kh.default-release-1732553928924\chrome\`. Run `bash tools/deploy-firefox.sh` after every CSS change and restart Firefox.
- **Texture opacity**: Matched VSCode levels. Dots 0.08, offset dots 0.04, grid lines 0.03, diagonals 0.02, jewel pools 0.06. Previous values (0.45, 0.25) were far too prominent.
- **Tab shapes**: Alternating /-\ and \_/ with 16px inset and -16px margin overlap. The seam between adjacent shapes is seamless when alternating.
- **Pinned tabs**: All pins get |_/ shape (polygon: 0 0, calc(100%-16px) 0, 100% 100%, 0 100%). Between pins, next pin's straight left wall covers previous pin's / flare naturally. Only the last pin's / is visible.
- **nth-child(N of S)**: Used `nth-child(odd of .tabbrowser-tab:not([pinned]))` to count only within non-pinned tab set. This ensures the alternation pattern works correctly regardless of how many pinned tabs exist.
- **Close button style**: Parallelogram `clip-path: polygon(4px 0%, 100% 0%, calc(100%-4px) 100%, 0% 100%)` with error color on hover — matches VSCode geometric style.
- **Tab content padding**: Equal 22px on both sides (start and end) for symmetric favicon/close-button distribution.
- **New tab button**: Uses `+` adjacent sibling combinator to detect the preceding tab's parity and apply the opposite shape. No extra -16px margin needed since the last tab's -16px end margin already positions the button.

## Failed Approaches
- **`:has()` in userChrome.css**: Used `.tabbrowser-tab[pinned]:has(+ .tabbrowser-tab:not([pinned]))` to select the "last pinned tab". Firefox 148 supports `:has()` in web content but it does NOT work in chrome stylesheets (userChrome.css). Fix: apply |_/ to ALL pinned tabs unconditionally.
- **Simple nth-child(odd/even)**: Breaks when there's an odd number of pinned tabs (parity shifts). Fix: use `nth-child(N of S)` to count within non-pinned set only.
- **SVG data URI textures**: rgba() in SVG presentation attributes is invalid SVG 1.1. Use pure CSS gradients instead.
- **Unequal tab padding**: 22px start + 26px end caused asymmetric favicon/close-button spacing. User wanted equal distribution.
- **|_\ border pin**: Originally had polygon(0 0, 100% 0, calc(100%-16px) 100%, 0 100%) which ENDS with \ on the right. User wanted it to end with / to create seamless / junction with first regular tab (/-\). Corrected to polygon(0 0, calc(100%-16px) 0, 100% 100%, 0 100%).

## Active Constraints
- **No emojis** anywhere (CLAUDE.md)
- Firefox version: 148.0 (released 2026-02-16)
- Profile path: `C:\Users\Kidriel\AppData\Roaming\Mozilla\Firefox\Profiles\2ps3r5kh.default-release-1732553928924`
- `toolkit.legacyUserProfileCustomizations.stylesheets = true` is confirmed ON
- User has 1 pinned tab (Gmail via "Pinned GMail" extension)
- `:has()` does NOT work in userChrome.css — avoid using it
- `nth-child(N of S)` — untested in userChrome.css, may also fail like `:has()`. If it does, fall back to hardcoded parity (reverse odd/even since there's 1 pin)
- Every CSS edit requires: (1) edit repo file, (2) `bash tools/deploy-firefox.sh`, (3) restart Firefox

## Next Steps

1. **User restarts Firefox** to test v2.7.0 — specifically verify:
   - New tab button has the correct alternating shape (\_/ or /-\ depending on last tab)
   - Pinned Gmail tab shows |_/ shape (right edge flares outward toward bottom)
   - `nth-child(odd of .tabbrowser-tab:not([pinned]))` actually works in userChrome.css

2. **If `nth-child(N of S)` fails in chrome sheets**: Fall back to reversed parity approach — swap odd/even since user has 1 pin. Use `.tabbrowser-tab:not([pinned]):nth-child(even)` for /-\ and `:nth-child(odd)` for \_/. Add special override for first-regular-tab and second-regular-tab using adjacent sibling combinators.

3. **If new tab button `+` combinator doesn't match**: The `#tabs-newtab-button` may not be a direct sibling of the last tab. Inspect with Browser Toolbox (Ctrl+Shift+Alt+I with devtools.chrome.enabled=true) to find actual DOM structure and correct the selector.

4. **userContent.css textures**: The new tab page (`about:newtab`) has no hex textures yet. Apply the same subtle lattice to the new tab page background and consider hexagon-clipped top site tiles.

5. **Commit when stable**: Stage `firefox/userChrome.css`, `firefox/userContent.css`, `tools/deploy-firefox.sh`. Message: `feat(firefox): v2 alternating trapezoid tabs + hex lattice textures + deploy script`

## Open Questions
- Does `nth-child(odd of .tabbrowser-tab:not([pinned]))` work in userChrome.css? (`:has()` didn't)
- Is `#tabs-newtab-button` a direct adjacent sibling of the last `.tabbrowser-tab` in Firefox 148's DOM?
- Should the new tab page (userContent.css) also get hex textures and hex-clipped top site tiles?
- `tools/texture-explorer.html` exists but has never been examined — may contain useful texture experiments from earlier work
