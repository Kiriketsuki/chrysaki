# Ecosystem migration plan

## Current phase: hybrid umbrella

`chrysaki-core` owns canonical tokens. This repository owns brand documentation, the port registry, and unextracted integrations. `chrysaki-pi` proves the independent integration contract.

## Later extraction waves

Choose the next port using recorded evidence rather than a fixed order:

1. Score change frequency, adapter complexity, host release cadence, user impact, and maintainer readiness from 1–5.
2. Prefer the highest combined score whose tests can prove parity.
3. Open an extraction issue containing the template checklist and rollback owner.
4. Set the registry state to `extracting`, without moving or deleting compatibility files.
5. Release, install, snapshot-test, and roll back the independent port once.
6. Set the registry state to `extracted` and record its pinned versions.

Only one complex port should be extracted per wave until two consecutive migrations complete without rollback defects. Simple static ports may then move in parallel.

## End state

Every application has a public, independently versioned repository containing only its adapter and installation contract. The umbrella remains the Chrysaki gallery, registry, compatibility dashboard, and migration history. Compatibility paths are removed together only after all registry entries are `extracted`.

## npm readiness

Git tags remain the distribution contract until:

- two independent integrations consume tagged core releases;
- one compatible core update proves that pinned integrations do not drift;
- release automation verifies schema, contrast, golden values, and generated artifacts;
- package ownership, provenance, and rollback are documented.

Meeting these gates permits an npm publication proposal; it does not publish automatically.
