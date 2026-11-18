# Technical Architecture

## Runtime constraints
Static browser game, no account/server/API key/network dependency. Local scripts and assets only; relative paths only. Test static hosting and local HTTP. Folder size strictly below 10,000,000 bytes. Avoid copying libraries already in shared platform folders.

## Boundaries
Separate input, world/navigation, character controller, animation, interaction/dialogue, gameplay state, persistence, UI and audio. Use explicit events or narrow interfaces; avoid global mutable state where practical.

## Rendering
Use the simplest renderer that meets art/performance needs. A 2.5D scene with authored 2D character art is preferred over low-poly placeholder people. Do not depend on remote Three.js/CDN assets. If WebGL is used, include graceful failure/fallback.

## Persistence
Use a namespaced, versioned localStorage key. Validate parsed values and provide safe defaults. Store no personal data unrelated to gameplay.

## Performance
Target stable 60 FPS on desktop and usable performance on mid-range phones. Cap device pixel ratio, avoid unbounded particles, pool transient effects and pause simulation when hidden.

## Environment scene orchestration

`environment-runtime.js` owns district entry, reciprocal-route enforcement, spawn selection, scene mounting, interaction-anchor validation and diagnostics. It requires an injected `scene-assets.js` pipeline. Every authored scene must declare one or more `requiredAssetIds`, and each ID must belong to that district in the validated asset manifest.

District entry is asynchronous: `enter(districtId, options)` first validates the route and spawn, then awaits `prepareDistrict(districtId)`. Preparation preloads the district's local images, verifies the pipeline reports every required image as loaded, and confirms each asset is retrievable from the decoded cache. Only then may the renderer mount the scene. Renderer mounting is awaited; a failed mount leaves the previous logical district active. Concurrent transitions are rejected.

A district without a scene manifest remains unavailable. A scene with missing or corrupt artwork reports a failed readiness state and cannot be entered. The runtime does not fabricate fallback scenes, assets, interaction anchors or spawn points. A district can be present in world design while remaining unavailable in play until its complete authored scene is delivered.

Tests must cover asset ownership, missing/corrupt art, readiness gating, route/spawn checks, overlapping transitions, async renderer failures and unavailable interactions.

## Authored scene compositor

`scene-renderer.js` is the renderer adapter consumed by the environment runtime. The runtime passes its authored `render` descriptor, interaction anchors and decoded asset map to `mountScene`. The compositor validates the design viewport, every image layer, fit mode, z-order, parallax and hotspot bounds before committing a mounted scene. It draws only decoded assets; missing layers or hotspots fail closed.

The renderer letterboxes the authored scene viewport, caps device pixel ratio, composites artwork in z-order, supports camera-follow parallax and hit-tests interaction hotspots in authored scene coordinates. Character animation atlases can be drawn through the existing animator interface in the same camera/world coordinate space. This renderer is an integration layer, not a replacement for commissioned illustrations, detailed environment art, animation atlases or visual review.

## Character orchestration

`character-runtime.js` composes the input intent manager, deterministic locomotion controller, authored atlas animator, and 2.5D scene renderer. The host owns frame scheduling; the runtime owns per-frame intent consumption, state-to-clip selection, camera follow, render payloads, reset, and input disposal. It requires authored animation clips and fails closed when a selected clip is missing. See [Character Runtime](CHARACTER_RUNTIME.md) for the dependency and lifecycle contract.

## Interaction and dialogue orchestration

`interaction-runtime.js` resolves player proximity against authored renderer hotspots, routes supported place actions into the life engine, and exposes authored NPC dialogue state for the host UI. Dialogue choices persist affinity/trust and journal history through `recordRelationship`. The renderer exposes read-only hotspot bounds; it does not synthesize target positions. See [Interaction Runtime](INTERACTION_RUNTIME.md) for integration and input contracts.
