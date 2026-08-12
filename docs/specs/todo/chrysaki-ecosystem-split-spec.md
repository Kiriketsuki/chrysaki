# Feature: Chrysaki Ecosystem Split

## Overview

**User Story**: As the Chrysaki maintainer, I want the theme suite split into versioned core and application repositories so that each integration can evolve, release, and install independently without duplicating or drifting from the canonical design tokens.

**Problem**: Chrysaki currently combines canonical tokens, application ports, documentation, and generated artifacts in one repository. The canonical palette is embedded in an AGS SCSS file, downstream tools parse that implementation-specific format, and complex ports share release lifecycle with unrelated static themes.

**Out of Scope**: Redesigning the approved Chrysaki palette; migrating every application in the first implementation wave; changing the user's active desktop configuration during extraction; publishing every package to npm immediately; removing working legacy paths before compatibility shims and migration documentation exist.

---

## Success Condition

> This feature is complete when Chrysaki has a schema-first `chrysaki-core` repository, the umbrella repository consumes a pinned core release, complex integrations can live in independently versioned repositories, and a documented phased migration path leads from the initial hybrid layout to one repository per application without breaking existing dotfile consumers.

---

## Open Questions

| # | Question | Raised By | Resolved |
|:--|:---------|:----------|:---------|
| 1 | When should `@kiriketsuki/chrysaki-core` move from a Git dependency to npm? | Architecture | After the pinned Git contract is validated; T11 records the readiness decision. |
| 2 | Which integration follows Pi in the second extraction wave: VS Code, Firefox, AGS, or tmux? | Planning | No second port is selected during the initial implementation; T9 codifies the repeatable selection process. |
| 3 | How long should compatibility paths remain in the umbrella repository? | Migration | Until every application has migrated. |

---

## Scope

### Must-Have
- Canonical token manifest: `tokens/chrysaki.json` is the single source of truth and validates against a committed JSON Schema.
- Stable token semantics: surfaces, text hierarchy, tri-primary accents, secondary accents, extended jewels, and semantic aliases retain their approved names and values.
- Generated release artifacts: core emits committed JSON, CSS, SCSS, TypeScript, and ANSI/shell-friendly outputs deterministically.
- Validation: CI rejects schema violations, unresolved aliases, stale generated artifacts, duplicate token identifiers, and contrast regressions for declared foreground/background roles.
- Independent core repository: `Kiriketsuki/chrysaki-core` is a public source repository with semantic version tags and no application-specific knowledge.
- Umbrella transition: `Kiriketsuki/chrysaki` becomes the brand, gallery, port index, migration matrix, and temporary home for ports not yet extracted.
- Pinned dependencies: every extracted integration pins a core version so palette updates cannot silently alter installations.
- Phased repository model: complex/high-change ports extract first, simple static ports may remain temporarily, and the documented end state is one repository per application.
- Backward-compatible migration: existing dots and Stow paths continue working until their consuming configuration is deliberately updated.
- First-wave contract: the architecture supports `chrysaki-pi` as the first independent integration and provides a repeatable extraction pattern for later ports.

### Should-Have
- Shared repository template for CI, licensing, release metadata, generated-file checks, and Chrysaki branding.
- Machine-readable port registry containing repository, current version, core version, migration state, and installation method.
- Compatibility and deprecation policy defining how moved files, archived paths, and migration notices are handled.
- Automated checks that detect integrations pinned to outdated or incompatible core versions.
- Visual token documentation generated from the same canonical manifest.

### Nice-to-Have
- Publish `@kiriketsuki/chrysaki-core` to npm after the Git-based contract stabilizes.
- Automated repository creation and release workflows for later extraction waves.
- Cross-repository preview gallery and compatibility dashboard.
- Package-gallery metadata for integrations whose host platform supports discovery.

---

## Technical Plan

**Affected Components**:
- Current umbrella: `PALETTE.md`, `README.md`, `ags/.config/ags/styles/_palette.scss`, application port directories, release workflows, and version metadata.
- Current dots consumer: `~/dots/theme/scripts/generate_theme_css.py`, generated theme outputs, per-application update scripts, and the Chrysaki submodule reference.
- New core repository: `tokens/`, `schemas/`, `src/`, `dist/`, `tests/`, `package.json`, CI, and release configuration.
- New integration repositories: package manifests, pinned core dependency, application adapters, tests, installation docs, and release metadata.
- Umbrella registry: a migration/port manifest and generated port index.

**Data Model Changes**:
- Add a versioned token document with groups, canonical identifiers, literal values, aliases, semantic roles, and metadata.
- Add a JSON Schema that constrains color formats, aliases, group names, and required tokens.
- Add a port registry with `name`, `repository`, `status`, `coreVersion`, `version`, `category`, and `install` fields.
- Remove supplemental colors from downstream scripts by representing them canonically in the token manifest.

**API Contracts**:
- `dist/chrysaki.json` — resolved literal tokens for language-neutral consumers.
- `dist/chrysaki.ts` — typed readonly token exports for Node/TypeScript consumers.
- `dist/chrysaki.css` — CSS custom properties using stable `--chrysaki-*` names.
- `dist/chrysaki.scss` — SCSS variables preserving current token naming.
- `dist/chrysaki-ansi.json` and shell output — terminal-compatible RGB/ANSI mappings.
- Core releases follow semantic versioning: breaking token contract changes require a major version.

**Dependencies**:
- Node.js for schema validation and generation during development/CI.
- JSON Schema validator and color/contrast utilities selected during implementation.
- GitHub repositories and Actions under the `Kiriketsuki` personal account.
- Existing dots and Chrysaki working trees must remain untouched except for planned migration changes; unrelated dirty files must not be cleaned or overwritten.

**Risks**:
| Risk | Likelihood | Mitigation |
|:-----|:-----------|:-----------|
| Token values or aliases change accidentally during SCSS-to-JSON migration | Medium | Golden snapshot comparing every resolved old token to the new manifest before switching consumers |
| Too many repositories create release overhead | Medium | Hybrid extraction first, shared repository template, one-per-app only after the process is proven |
| Ports drift across core versions | Medium | Pin versions, record them in the port registry, and add compatibility checks |
| Existing dots scripts break when paths move | High | Preserve compatibility outputs and migrate one consumer at a time with rollback instructions |
| Generated files diverge from source | Medium | Deterministic build plus CI failure when `git diff --exit-code dist/` is non-empty |
| Core accumulates application-specific exceptions | Medium | Enforce a rule that application mappings remain in integration repositories |

---

## Acceptance Scenarios

```gherkin
Feature: Chrysaki Ecosystem Split
  As the Chrysaki maintainer
  I want versioned core tokens and independent integration repositories
  So that every port can evolve without palette drift or coupled releases

  Background:
    Given the existing Chrysaki palette and ports are available as migration inputs
    And the current resolved token values have been captured as a golden snapshot

  Rule: Core is the only canonical token source

    Scenario: Generate every supported format
      Given a valid tokens/chrysaki.json manifest
      When the core build runs
      Then JSON, CSS, SCSS, TypeScript, ANSI, and shell artifacts are generated
      And a second build produces no file changes

    Scenario: Reject an invalid token contract
      Given a token has an invalid color value or unresolved alias
      When validation runs
      Then CI fails with the token path and reason
      And no release artifact is published

    Scenario: Preserve the approved palette during extraction
      Given the old SCSS palette and supplemental downstream colors
      When the migration comparison runs
      Then every canonical token resolves to the same color in the new manifest
      And semantic aliases resolve to the same literal values

  Rule: Integrations depend on pinned core releases

    Scenario: Install an extracted integration
      Given an integration pins a compatible chrysaki-core tag
      When its build runs
      Then it consumes generated core tokens through the documented contract
      And produces only application-specific mappings

    Scenario: Prevent silent palette drift
      Given a newer core release exists
      When an integration is installed without changing its pinned dependency
      Then its generated theme remains unchanged

  Rule: Migration is incremental and reversible

    Scenario: Keep an unextracted port operational
      Given an application has not yet moved to its own repository
      When the first extraction wave completes
      Then its files and documented installation path remain available in the umbrella repository

    Scenario: Migrate an existing dots consumer
      Given dots currently reads the AGS SCSS palette path
      When the consumer is switched to a core artifact
      Then generated outputs match the approved golden snapshot
      And rollback instructions restore the previous pinned state

  Rule: Repository boundaries remain explicit

    Scenario: Reject application-specific tokens from core
      Given a proposed core token names a host application or UI component
      When repository contract validation runs
      Then the change fails review or CI policy
      And the mapping remains in the integration repository
```

---

## Task Breakdown

| ID | Task | Priority | Dependencies | Status |
|:---|:-----|:---------|:-------------|:-------|
| T1 | Inventory canonical, supplemental, generated, and application-local tokens | High | None | done |
| T1.1 | Capture a golden resolved-token snapshot from current SCSS and downstream supplements | High | T1 | done |
| T2 | Define `tokens/chrysaki.json` and `schemas/tokens.schema.json` | High | T1.1 | done |
| T2.1 | Define stable naming, aliases, semantic roles, and version metadata | High | T2 | done |
| T3 | Create `Kiriketsuki/chrysaki-core` repository and package metadata | High | T2 | done |
| T3.1 | Implement deterministic JSON, CSS, SCSS, TypeScript, ANSI, and shell generators | High | T3 | done |
| T3.2 | Add schema, alias, contrast, and stale-artifact CI checks | High | T3.1 | done |
| T4 | Publish and tag the first Git-based core release | High | T3.2 | done |
| T5 | Convert the umbrella repository to consume pinned core artifacts | High | T4 | done |
| T5.1 | Add machine-readable port registry, migration matrix, and compatibility policy | High | T5 | done |
| T5.2 | Preserve legacy paths for unextracted ports and document rollback | High | T5 | done |
| T6 | Update the dots generation pipeline to consume a pinned core artifact | High | T5.2 | pending |
| T6.1 | Verify generated desktop/application outputs against golden snapshots | High | T6 | pending |
| T7 | Create reusable integration repository template and extraction checklist | Medium | T4 | done |
| T8 | Validate the contract by extracting `chrysaki-pi` | High | T4, T7 | done |
| T9 | Define a repeatable process for selecting and executing later complex-port extraction waves | Medium | T8 | done |
| T10 | Plan staged movement from hybrid layout to one repository per application | Medium | T9 | done |
| T11 | Evaluate npm publication after the Git dependency contract stabilizes | Low | T8 | done |

---

## Exit Criteria

- [ ] All Must-Have scenarios pass in CI.
- [ ] No regressions occur in existing Chrysaki ports or dots-generated themes.
- [ ] Generated API contracts match their documented formats and token names.
- [ ] Core builds are deterministic and leave no uncommitted generated changes.
- [ ] Golden token and contrast checks prove the extraction did not alter the approved palette.
- [ ] The umbrella migration matrix identifies every port, current location, target repository, and migration state.
- [ ] Existing consumer rollback instructions have been exercised successfully.
- [ ] `chrysaki-pi` can pin and consume the first core release without importing umbrella implementation files.

---

## References

- `PALETTE.md`
- `README.md`
- `ags/.config/ags/styles/_palette.scss`
- `~/dots/theme/scripts/generate_theme_css.py`
- `~/dots/AGENTS.md`
- Related spec: `~/dev/chrysaki-pi/docs/specs/todo/chrysaki-pi-interface-suite-spec.md`

---
*Authored by: OpenAI Codex GPT-5.6-sol*
