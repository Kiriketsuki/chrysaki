# Compatibility and deprecation policy

## Guarantee

Existing umbrella paths remain available until every application is recorded as `extracted` in `ports/registry.json`. Extraction does not silently modify dotfiles, Stow links, or active desktop configuration.

Each extracted repository pins an exact `chrysaki-core` semantic tag. Updating core requires an explicit dependency change, regenerated adapter output, and snapshot verification.

## Moving a port

1. Mark the registry entry `extracting` while its existing umbrella files remain authoritative.
2. Create the integration repository from `templates/integration/`.
3. Pin core, move only application-specific mappings, and verify generated output against the umbrella copy.
4. Tag the integration release and exercise installation and rollback.
5. Mark the registry entry `extracted`; retain the umbrella compatibility path with a migration notice.
6. Remove compatibility files only after every registry entry is `extracted` and a final umbrella release announces the removal.

## Rollback

1. Restore the previous Chrysaki umbrella/submodule commit in the consuming repository.
2. Restore the consumer's previous palette source path.
3. Run that consumer's normal generation command.
4. Compare generated output with the pre-migration snapshot before applying it.

For dots, this means restoring both the `chrysaki` submodule commit and `theme/scripts/generate_theme_css.py` from the same dots commit. No migration command deletes the legacy `_palette.scss` path.
