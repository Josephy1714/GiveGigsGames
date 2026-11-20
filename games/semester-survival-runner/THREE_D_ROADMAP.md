# Semester Survival 3D — development preview

This is an isolated Three.js world prototype. It does not replace `index.html` and is not wired into the public catalogue.

## Open locally

Serve the repository over HTTP (ES modules cannot be opened reliably with `file://`) and visit:

`games/semester-survival-runner/three-preview.html`

Three.js is currently loaded from the pinned jsDelivr release `0.180.0`. A later production pass should vendor or bundle the exact dependency and add offline handling.

## Current prototype scope

- Perspective camera, fog, ACES tone mapping and shadow-enabled lighting.
- Campus road, sidewalks/grounds, multi-storey lecture-block facades, window bays, canopies, entrance columns, roof details and campus signs.
- Trees, streetlights, benches and moving traffic silhouettes (matatu, shuttle and cars).
- Three-lane movement, jump/slide input, touch swipes and a temporary scale-test avatar.

## Explicitly not production-ready

The test avatar is a temporary 3D scale/animation stand-in, **not Jay's final character model**. The current prototype does not yet include the original runner's collision rules, obstacles, pickups, boss encounters, eight-semester progression, shop, upgrades, save migration, audio or final HUD. Those remain in the original Canvas build and must be integrated and regression-tested before the 3D preview can replace it.

## Next implementation gates

1. Replace the test avatar with a properly modelled, rigged Jay based on the approved source turnaround.
2. Integrate the existing runner simulation and save store behind renderer-independent interfaces.
3. Build authored, reusable traffic, campus, obstacle and pickup assets; replace prototype blockout geometry.
4. Add animation state retargeting, collision parity, accessibility and graphics quality tiers.
5. Run mobile performance and browser regression tests before changing the public entrypoint.
