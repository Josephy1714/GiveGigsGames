# Scene Renderer

`scene-renderer.js` is a canvas 2D compositor for supplied, decoded environment artwork. It is not an art generator. It accepts a scene layout with design dimensions, image layers, z-order, parallax, opacity, fit mode and authored interaction hotspots. Every layer must resolve to an already decoded asset; missing art fails scene mounting.

The renderer letterboxes the authored design viewport into the canvas, caps device pixel ratio, composites layers in z-order, supports a player-centred camera with authored bounds and per-layer parallax, and exposes hotspot hit-testing/focus. An optional character animator can draw its current authored atlas frame into the same world coordinate space. It does not create geometry, draw fake buildings, or synthesize character sprites.

Each scene's `render` descriptor separates the camera viewport from the traversable world:
- `width`, `height`: camera viewport dimensions in authored design-space pixels. Use a deliberate composition size (the four district layouts use 960×540).
- `worldBounds`: `{ width, height }` for the complete traversable scene. The district layouts use 2880×1080, so the camera sees only a portion of the environment at once.
- `layers`: non-empty list of unique `id`, `assetId`, `x`, `y`, `width`, `height`; optional `zIndex`, `parallax` (0–1), `opacity` (0–1), and `fit` (`stretch`, `contain`, `cover`).
- `hotspots`: map from the exact interaction anchor ID to authored `x`, `y`, `width`, `height`.
- `spawnPoints` in the district manifest: named `{ x, depth }` world coordinates, validated against district player/depth bounds when supplied.
- `npcAnchors` in the district manifest: optional `{ characterId, anchor, radius? }` entries; each character and rendered hotspot must exist.
- `groundY` (optional): baseline for a character standing at depth zero; defaults to 82% of scene height.
- `depthScale` (optional): vertical screen displacement per depth unit; must be greater than zero and at most 10.
- `depthBounds` (optional): `{ min, max }` player depth limits for the district; defaults to -120 through 120.
- `playerBounds` (optional): `{ minX, maxX }` horizontal world limits; defaults to the design viewport width. This may extend beyond the camera viewport for longer authored districts.
- `cameraBounds` (optional): `{ minX, minY, maxX, maxY }` camera limits in scene coordinates; defaults to the full design viewport.

The camera treats `scene.width` and `scene.height` as its authored viewport size, centres the player within that viewport, and clamps the resulting camera origin to `cameraBounds`. `worldBounds` contains the full traversable environment; layers and hotspots must remain inside it, and camera bounds must never expose an area outside it. This is what makes a long district scroll naturally while retaining a stable 16:9 composition. The player has independent horizontal and depth coordinates. The depth plane changes the character's screen-space ground position while jump height remains a separate vertical offset. I/K keyboard intent drives depth movement; camera follow uses the resulting ground position and clamps to authored camera bounds. Horizontal and depth input are normalized together, so diagonal movement never exceeds the selected walk/jog/sprint speed. Scene-specific horizontal and depth bounds prevent the player leaving the authored traversable area.

Every interactive anchor declared by the environment runtime must have a corresponding hotspot. Coordinates are authored layout data; they are not substitutes for visual assets. No scene is considered complete until the real illustrations, layers, hotspot positions and character atlases are supplied and visually reviewed.
