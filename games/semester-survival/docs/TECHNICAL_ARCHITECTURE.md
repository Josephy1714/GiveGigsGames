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

## Cinematic district travel

`district-transition-ui.js` renders an accessible destination overlay with honest preparation and arrival phases, an indeterminate loading indicator, and reduced-motion support. The central runtime locks and flushes player input while the transition is active. Travel validates route and route-specific spawn first, then prepares and mounts the destination before committing the life-system journey, collision/gameplay zones, weather, NPC schedule/navigation state and player spawn. Failed scene mounting leaves the previous district active; a post-mount failure attempts to restore the previous district and the player's exact prior position. The overlay is always removed and controls are restored in a `finally` path. It never reports fabricated percentage progress or substitutes missing artwork.

## Authored scene compositor

`scene-renderer.js` is the renderer adapter consumed by the environment runtime. The runtime passes its authored `render` descriptor, interaction anchors and decoded asset map to `mountScene`. The compositor validates the design viewport, every image layer, fit mode, z-order, parallax and hotspot bounds before committing a mounted scene. It draws only decoded assets; missing layers or hotspots fail closed.

The renderer letterboxes the authored scene viewport, caps device pixel ratio, composites artwork in z-order, supports camera-follow parallax and hit-tests interaction hotspots in authored scene coordinates. Character animation atlases can be drawn through the existing animator interface in the same camera/world coordinate space. This renderer is an integration layer, not a replacement for commissioned illustrations, detailed environment art, animation atlases or visual review.

## Character orchestration

`character-runtime.js` composes the input intent manager, deterministic locomotion controller, authored atlas animator, and 2.5D scene renderer. The host owns frame scheduling; the runtime owns per-frame intent consumption, state-to-clip selection, camera follow, render payloads, reset, and input disposal. It requires authored animation clips and fails closed when a selected clip is missing. See [Character Runtime](CHARACTER_RUNTIME.md) for the dependency and lifecycle contract.

## Interaction and dialogue orchestration

`interaction-runtime.js` resolves player proximity against authored renderer hotspots, routes supported place actions into the life engine, and exposes authored NPC dialogue state for the host UI. Dialogue choices persist affinity/trust and journal history through `recordRelationship`. The renderer exposes read-only hotspot bounds; it does not synthesize target positions. See [Interaction Runtime](INTERACTION_RUNTIME.md) for integration and input contracts.

## Contextual interaction UI

`interaction-ui.js` is a host-mounted, accessible overlay for proximity prompts and authored NPC dialogue. It delegates all actions to `interaction-runtime.js`, inserts authored strings as text rather than HTML, supports touch buttons and Escape-to-close, and has an explicit destroy lifecycle. It does not own simulation timing or fabricate portraits. See [Interaction UI](INTERACTION_UI.md) for the host contract.

## Campaign progression and objective HUD

`campaign-runtime.js` owns ordered chapter progression, per-step counts, completion events and a separate versioned local save. It consumes domain events from the host and authored chapter rules from `world-content.js`; it does not mutate academic records or simulate activities. `campaign-ui.js` renders a compact, collapsible objective checklist with semantic progress information. The host forwards successful interaction, travel, assessment and phone milestone events. See [Campaign Runtime](CAMPAIGN_RUNTIME.md).


## Student phone and academic portal

`university-services.js` owns persisted coursework deadlines, submission lifecycle, authored inbox messages and notifications; it calls the life engine for actual course registration and assignment results. The life engine owns the active semester catalogue, prerequisite-aware registration, academic progress and a finance transaction ledger. `student-phone-runtime.js` exposes those services to the phone UI. The central game runtime routes dialogue, assessment, travel and university-service events through one event bus, preventing duplicate delivery to services and campaign progression. `student-phone-ui.js` is a host-mounted, accessible and responsive overlay; Tab intent is already reserved by the input manager and `phoneOpen` blocks world movement. See [Student Phone](STUDENT_PHONE.md) for validation, data ownership and lifecycle.

## Central adventure composition root

`game-runtime.js` composes the browser game lifecycle and owns the requestAnimationFrame loop, event bus, pause/resume, visibility pause, travel transactions, UI mounting and disposal. It routes successful domain events once to university services and campaign progression. It requires a complete credited local scene manifest and authored character atlas before starting; missing art is a hard readiness failure, never a reason to invent placeholders. See [Game Runtime](GAME_RUNTIME.md).

Coursework remains entirely inside the game. Players complete authored work sessions and submit using an in-game action. No PDF, Word document, file picker, attachment, external LMS or real-world upload is part of the design.
## Weather and atmospheric rendering

`weather-runtime.js` derives deterministic local weather from the saved in-game calendar and active district. It exposes current conditions and a three-day forecast without network calls. `scene-renderer.js` accepts validated atmosphere state and composes daylight tint, cloud cover, fog and precipitation over the authored environment. The central runtime updates weather before rendering, refreshes it on district travel, emits weather-change events, and disposes the simulation with the game lifecycle. The first release of this system is visual/ambient only; gameplay penalties are not silently applied.


## NPC schedules and weather-aware routine decisions

`npc-schedule-runtime.js` owns authored daily schedule slots for the named cast. It validates every scheduled destination against `world-content.js`, evaluates each NPC's weather in that NPC's own district, and redirects exposed routines to explicitly authored indoor/sheltered destinations during heavy rain. It emits routine-change events and exposes schedule state through the central runtime. This is a decision layer only: it does not fabricate coordinates, sprites, portraits or animation. NPC visual/path movement readiness remains false until production art, scene anchors and navigation are delivered.


## NPC navigation graph contract

Scenes may provide a designer-authored navigation graph. Each node references an existing NPC or place hotspot anchor; each edge connects two declared node IDs. The environment validates node identity and edge references, and the renderer verifies that every waypoint has a real hotspot in the mounted authored scene. The NPC navigation runtime uses breadth-first routing and obtains waypoint coordinates only from mounted hotspot bounds. Missing graph data, disconnected routes or missing anchors remain explicit unavailable states; no coordinates, paths, collision geometry, character artwork or movement are invented. Route readiness is not actor movement: visual and movement readiness remain false until commissioned character assets, navigation collision review and an authored movement integration are complete.

## NPC navigation planning

The NPC schedule runtime selects time- and weather-aware destinations. The NPC navigation runtime then checks whether the scheduled NPC is in the active district, resolves its authored start anchor and destination place anchor, and runs breadth-first search over the district's validated navigation graph. Waypoints are resolved from mounted scene hotspot bounds. Missing graphs, anchors and disconnected routes are explicit states. This milestone plans routes only; it does not animate or move NPCs. Visual and movement readiness remain false until authored character art, collision/path validation and movement integration pass.

## Authored collision and contact

`collision-runtime.js` validates per-district static collider descriptors and resolves player movement against authored AABBs, circles and capsule-like segments in gameplay X/depth coordinates. Movement is radius-substepped to reduce tunnelling; contact resolution preserves tangential movement and cancels velocity into blocking surfaces. Material, friction, restitution and effect tags are authored data. Contact enter/impact/exit events flow through the central event bus. Collision geometry is not inferred from art or interaction hotspots. Empty geometry remains an explicit non-production state; see [Collision and Contact](COLLISION_AND_CONTACT.md).

## Gameplay zone modifiers

`gameplay-zones.js` evaluates authored district AABB/circle zones and timed trigger effects after the character simulation step. It produces bounded speed, acceleration and stamina modifiers for the next simulation step, plus explicit enter/exit/start/end events. Zones are separate from solid colliders: a muddy path can slow movement without acting as an invisible wall; a track can boost sprint efficiency without moving the player automatically. See [University Obstacles and Boosts](UNIVERSITY_OBSTACLES_AND_BOOSTS.md).

## NPC behaviour and route simulation

Daily schedules, weather-aware destination decisions, authored-anchor path planning and deterministic NPC route following are separate runtimes. Actor positions exist only for a mounted scene with a connected authored route; offscreen or unrouteable characters have no local position. Simulation snapshots do not imply visible characters: approved model sheets, sprite atlases and animation clips remain mandatory. See [NPC Behaviour](NPC_BEHAVIOUR.md).
