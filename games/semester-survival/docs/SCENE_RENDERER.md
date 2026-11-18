# Scene Renderer

`scene-renderer.js` is a canvas 2D compositor for supplied, decoded environment artwork. It is not an art generator. It accepts a scene layout with design dimensions, image layers, z-order, parallax, opacity, fit mode and authored interaction hotspots. Every layer must resolve to an already decoded asset; missing art fails scene mounting.

The renderer letterboxes the authored design viewport into the canvas, caps device pixel ratio, composites layers in z-order, supports camera follow offsets with per-layer parallax, and exposes hotspot hit-testing/focus. An optional character animator can draw its current authored atlas frame into the same world coordinate space. It does not create geometry, draw fake buildings, or synthesize character sprites.

Each scene's `render` descriptor must contain:
- `width`, `height`: authored design-space dimensions.
- `layers`: non-empty list of unique `id`, `assetId`, `x`, `y`, `width`, `height`; optional `zIndex`, `parallax` (0–1), `opacity` (0–1), and `fit` (`stretch`, `contain`, `cover`).
- `hotspots`: map from the exact interaction anchor ID to authored `x`, `y`, `width`, `height`.

Every interactive anchor declared by the environment runtime must have a corresponding hotspot. Coordinates are authored layout data; they are not substitutes for visual assets. No scene is considered complete until the real illustrations, layers, hotspot positions and character atlases are supplied and visually reviewed.
