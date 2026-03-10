# Firefox Chrysaki Theme: Hex Textures + Trapezoid Tabs

## Situation
Adding hex grid textures and trapezoid /-\ tab shapes to the Chrysaki Firefox theme, inspired by the VSCode workbench textures (`vscode/chrysaki-workbench.css`). Colors apply correctly but **no visual textures or tab shape changes have appeared** after 3 rounds of attempts. The user explicitly confirmed `toolkit.legacyUserProfileCustomizations.stylesheets` is `true`.

## Current State
- Branch: `main`
- Uncommitted changes: `firefox/userChrome.css`, `firefox/userContent.css`
- Tests: N/A (visual CSS theme — manual verification only)
- What works: Base colors, borders, accent gradients all apply. The dark Chrysaki palette IS rendering.
- What's incomplete: **Zero** texture/pattern visibility. **Zero** tab shape change. Something fundamental is preventing `background-image` patterns and `clip-path` from taking effect.

## Key Files
- `firefox/userChrome.css` — main file being edited, browser chrome styles
- `firefox/userContent.css` — new tab page styles
- `vscode/chrysaki-workbench.css` — reference: working texture approach (SVG base64 in ::before pseudo-elements)
- `tools/texture-explorer.html` — may contain useful texture experiments (untracked, unexamined)

## Decisions Made
- Hex grid geometry matches VSCode: 23.094x40px tile (flat-top hexagons, hex_size=20)
- Texture applied to: `#TabsToolbar`, `#nav-bar`, `#sidebar-box`, `#PersonalToolbar`
- New tab page uses 2x tile (46.188x80px) for spacious grid
- Top site tiles clipped to hexagons via `clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)`
- Tab shape: /-\ trapezoid (full-width top, 12px inset at bottom)
- User wants hexagons EVERYWHERE instead of squares/rectangles

## Failed Approaches

### Attempt 1: SVG data URI with rgba() in presentation attributes
- `stroke='rgba(26,138,106,0.07)'` in inline SVG
- **Result**: Invisible. SVG `rgba()` in presentation attributes is invalid SVG 1.1. Firefox's SVG renderer may silently drop these.
- Bumped opacity to 0.15 in second pass — still invisible.

### Attempt 2: Pure CSS gradient patterns (radial-gradient + repeating-linear-gradient)
- Replaced all SVG data URIs with hex dot lattice (two offset radial-gradient layers) + three repeating-linear-gradient lines at 0°, ±60°.
- **Result**: Still invisible. This is extremely suspicious because the ORIGINAL theme had `radial-gradient(rgba(54,58,79,0.35) 1px, transparent 1px)` on `#sidebar-box` which was presumably visible.
- **Root cause hypothesis**: Either (a) the file being edited is NOT the one Firefox is loading, or (b) there's a CSS parse error earlier in the file that's breaking everything after it.

### Attempt 3: clip-path on .tab-background
- `clip-path: polygon(0 0, 100% 0, calc(100% - 12px) 100%, 12px 100%)`
- **Result**: Tabs still rectangular. Expanded to target `.tab-stack`, added `-moz-appearance: none !important`.
- Still no change. The clip-path itself might work, but the selector may not match Firefox's actual DOM.

## Active Constraints
- User confirmed `toolkit.legacyUserProfileCustomizations.stylesheets = true` in about:config
- Firefox version appears to be 128+ (from CSS compatibility comment)
- Platform: Windows 11
- No emojis anywhere (CLAUDE.md constraint)
- The ORIGINAL dot grid on `#sidebar-box` (before our changes) may or may not have been visible — user never confirmed

## Critical Investigation Needed

**The #1 question is: IS the modified file even being loaded?**

The next session MUST start by verifying the file path:

1. Open `about:support` in Firefox → find "Profile Folder" path
2. Check if `<profile>/chrome/userChrome.css` exists and matches `Chrysaki/firefox/userChrome.css`
3. If the profile's chrome folder has a DIFFERENT userChrome.css, that explains everything — the user is editing a repo copy, not the one Firefox actually reads

**Alternative**: Open Browser Toolbox (Ctrl+Shift+Alt+I, requires `devtools.chrome.enabled = true` in about:config) and inspect `#TabsToolbar` to see what CSS rules are applied. This directly shows whether our rules are loaded.

## Next Steps

1. **Verify file loading** — Ask user where their Firefox profile folder is (`about:support` → Profile Folder). Check if `<profile>/chrome/userChrome.css` is a symlink/copy/the same file as `Chrysaki/firefox/userChrome.css`. This is the most likely failure: the repo file is NOT the file Firefox reads.

2. **If file mismatch confirmed** — Either symlink the repo file to the profile's chrome folder, or copy the file there. Then restart Firefox.

3. **If file IS being loaded** — Open Browser Toolbox and inspect `#TabsToolbar` to see which CSS rules are applying. Check for:
   - Parse errors that break the file partway through
   - Selector mismatches (Firefox 128+ may use different class names)
   - Specificity overrides from Firefox's user-agent stylesheet

4. **For SVG approach** — If re-attempting SVG data URIs, fix the syntax to use valid SVG opacity: `stroke='#1a8a6a' stroke-opacity='0.15'` instead of `stroke='rgba(26,138,106,0.15)'`. OR use `<g opacity='0.15'>` wrapper.

5. **For tabs** — Use Browser Toolbox to find the actual DOM element class names for tabs in the user's Firefox version. The selector may need to match Firefox 128+ specific elements.

## Open Questions
- Is `Chrysaki/firefox/userChrome.css` the same file that Firefox is reading from the profile folder, or is this a separate repo copy?
- Was the original dot grid (pre-changes) visible in the sidebar?
- Would the user accept using the Browser Toolbox to debug which CSS rules are active?
- `tools/texture-explorer.html` exists but was never examined — may contain useful experiments
