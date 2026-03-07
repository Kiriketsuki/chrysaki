# Chrysaki VSCode Texture System -- Layering, Shadows, Animation

## Situation
Iterating on the Chrysaki VSCode workbench CSS (`feat/vscode-v2-redesign`). Session rebuilt the texture system from a multi-layer CSS-gradient approach (which had dot-line misalignment) into a single-SVG hex grid tile. Then added a tech grid on the sidebar file list, animated terminal texture, auxiliary bar (right chat) hex grid, and panel shadows. The user gave feedback on the latest iteration and further tuning is needed.

## Current State
- Branch: `feat/vscode-v2-redesign` (3 commits ahead of origin, not pushed)
- Uncommitted changes:
  - `vscode/chrysaki-workbench.css` (major rewrite -- textures only, no geometric UI)
  - `powershell/chrysaki-psreadline.ps1` (unrelated, pre-existing)
- Untracked: `tools/texture-explorer.html`, `.claude/`, `bash.exe.stackdump`
- Tests: N/A (pure CSS project)
- **Deployment path**: CSS is authored in the repo at `vscode/chrysaki-workbench.css` and copied to `~/.vscode/extensions/chrysaki-theme-1.0.0/chrysaki-workbench.css` for the `be5invis.vscode-custom-css` extension to inject. After every change: copy file, then Ctrl+Shift+P > "Reload Custom CSS and JS" in VSCode.

### What works
- Hex grid SVG (sidebar bg + activity bar + auxiliary bar) -- single SVG tile with lines + markers, alignment correct
- Tech grid on `.monaco-list::before` (sidebar file list) at z-index:1, opacity 0.04
- Angled hatching on editor at reduced opacity 0.025
- Animated tech grid on `.part.panel::before` with `panel-drift` keyframes, 15s loop, opacity 0.03
- All pseudo-elements use `pointer-events: none` so no interaction issues

### What's incomplete / needs tuning
- **User's last feedback (not yet addressed):**
  - "shadows should be bottom" -- shadows were fixed to inset-bottom but user said they "look off"; reduced to `inset 0 -4px 6px` at 0.20-0.30 opacity. User has NOT yet confirmed these look right -- may need more tuning or a fundamentally different approach (consider removing them, switching to `::after` gradient fade, or using border-bottom instead)
  - The screenshot showed the texture and layout after the last z-index swap was applied but BEFORE the shadow fix was reloaded
- CSS has NOT been committed or pushed yet

## Key Files
- `vscode/chrysaki-workbench.css` -- the full workbench CSS (textures, shadows, animation)
- `vscode/chrysaki-color-theme.json` -- theme colors (sidebar bg `#1a1d2a`, activitybar bg `#161922`, editor bg `#1a1d2a`)
- `tools/texture-explorer.html` -- interactive texture playground for previewing patterns
- `~/.vscode/extensions/chrysaki-theme-1.0.0/chrysaki-workbench.css` -- deployed copy (what VSCode actually loads)

## Decisions Made
- **Single-SVG for hex grid**: lines + knockout circles + hexagon markers all in one SVG tile (23.094x40px). Eliminates CSS gradient drift that caused dot-line misalignment in the multi-layer approach.
- **z-index layering for sidebar**: hex grid at `z-index: -1` (behind rows, deep background), tech grid at `z-index: 1` (overlays rows). User explicitly requested this arrangement.
- **`isolation: isolate` on `.monaco-list`**: needed for `z-index: -1` on the tech grid's parent context to behave correctly. Added when the tech grid was at -1; kept when swapped to +1 -- harmless and may still be useful.
- **All geometric UI removed**: tab shapes, parallelogram tiles, diamond dots, folder trapezoids, scrollbar chamfers, breadcrumb arrows, widget clip-paths, notification clip-path resets, border-radius reset -- all stripped. Only textures remain.
- **Panel has NO `isolation: isolate`**: only `position: relative`. Adding isolation broke terminal internals in earlier testing.
- **Editor opacity halved**: 0.05 -> 0.025 at user request.
- **Panel animation opacity**: 0.05 was too strong; reduced to 0.03.

## Failed Approaches
- **Multi-layer CSS gradients + separate SVG markers**: CSS `repeating-linear-gradient` at `background-size: auto` drifts relative to the SVG tile because the gradient origin depends on element height. The dots never lined up with the lines.
- **z-index: -1 on all textures**: sidebar hex grid at z-index:-1 was invisible -- child element backgrounds (`.monaco-list-row`, etc.) are opaque and painted over it. Fixed by using z-index:1 for textures that need to be visible through opaque children.
- **Heavy inset shadows (12-24px spread, 0.45 opacity)**: created a dark vignette that visually consumed the last few visible items in the sidebar. User said they "look off." Reduced to 4-6px spread, 0.20-0.30 opacity -- status TBD.

## Active Constraints
- Workbench CSS is injected via `be5invis.vscode-custom-css` -- all rules need `!important`.
- VSCode `window.zoomLevel: 1` (120% zoom) affects effective pixel sizes.
- Knockout circles in the hex grid SVG must match the panel background color to work (`#1a1d2a` for sidebar, `#161922` for activity bar).
- The deployed CSS path is `file:///C:/Users/Kidriel/.vscode/extensions/chrysaki-theme-1.0.0/chrysaki-workbench.css` (set in VSCode `settings.json > vscode_custom_css.imports`).
- User explicitly wants NO geometric UI (tabs, dots, folder clips, etc.) -- textures and shadows only.

## Next Steps
1. Ask user to reload and confirm whether the current shadow values (reduced `inset 0 -4px 6px`) look acceptable or need further adjustment. If still wrong, consider removing shadows entirely or switching to a `::after` gradient-fade approach at the bottom of panels.
2. Visually verify the z-index swap (hex behind, tech above) rendered correctly in the sidebar file list.
3. Confirm the animated panel grid and the auxiliary bar hex grid are visible and acceptable.
4. Once user is happy with the visual result, commit the two files (`vscode/chrysaki-workbench.css`, optionally `tools/texture-explorer.html`) and push.

## Open Questions
- User has not yet reloaded after the latest shadow + z-index fix. Visual confirmation pending.
- Whether the shadows should exist at all, or if a different depth-cue approach (like a 1px gradient border or a faint `::after` overlay) would be preferred.
- Activity bar texture: was applied for consistency with sidebar -- user hasn't explicitly commented on it this session.
- Whether the auxiliary bar hex grid knockout should use `#1a1d2a` or a different color (needs to match `sideBarSectionHeader.background` or similar from the color theme for the secondary sidebar).
