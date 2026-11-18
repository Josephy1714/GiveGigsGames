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

`environment-runtime.js` owns district entry, reciprocal-route enforcement, spawn selection, scene mounting, interaction-anchor validation and environment diagnostics. The renderer supplies authored scene assets through a manifest; the runtime never fabricates missing environments or interaction anchors. A district may be present in world design while remaining unavailable in play until its authored scene is delivered. Integration tests must cover failed mounts, route restrictions, spawn validation and unavailable interactions.
