# Central Game Runtime

`game-runtime.js` is the composition root for the adventure. It owns the browser lifecycle, frame scheduling, event routing, pause/visibility handling, district travel, and teardown. Individual systems remain independently testable and do not start their own frame loops.

## Required inputs

The host supplies:
- A mount element and browser document.
- A version-1 local `assetManifest` with credited, relative local assets.
- A `sceneManifest` for each playable district, including required asset IDs, a default spawn, render layers, authored hotspots, and optional NPC anchors.
- A `characterAtlas` descriptor whose asset ID resolves to a decoded `character-atlas` image and whose clip manifest contains every required locomotion clip.

The runtime refuses to start when the local artwork, scene layouts, or atlas are absent or invalid. It does not draw fallback environments, procedural people, blank placeholder scenes, or substitute animation.

## Composition and ownership

The runtime constructs one life engine, university services, campaign runtime, input manager, scene renderer, environment runtime, character controller/animator/runtime, interaction runtime, and the phone/campaign/interaction UI. All use the same local persistence provider and a single event bus.

The event bus:
1. Sends gameplay events to university services once.
2. Records those events against the current campaign objective.
3. Notifies host subscribers.
4. Refreshes the relevant UI views.

Events emitted by university services and campaign progression are tagged at the source to prevent recursive or duplicate processing. Phone event forwarding does not call university services a second time.

## Lifecycle

- `create(options)` validates dependencies and constructs the shell and services.
- `start()` preloads the character atlas, validates the authored starting district, mounts the scene, resets the character to its authored spawn, and begins the frame loop.
- `update(delta)` consumes input once, advances locomotion, handles phone/dialogue/pause intent, resolves nearby authored interactions, synchronizes deadline state, and renders the character.
- `travelTo(destination)` enforces reciprocal world routes, mounts the destination scene before committing the life-engine journey, and restores the prior scene/spawn if the journey commit fails.
- `pause()` and `resume()` stop/restart the frame loop. Escape resumes a paused session; hidden documents pause automatically.
- `submitAssessment()` and `completeSemester()` are the central academic mutation entry points and publish campaign/service events.
- `destroy()` cancels the frame loop, removes listeners, persists services, tears down overlays and disposes input.

The host may set `autoLoop:false` and call `update(delta)` itself. Otherwise the runtime uses requestAnimationFrame. It caps frame delta to 50 ms and resizes the canvas on viewport changes.

## Coursework is entirely in-game

Assignments are simulated activities. The player works on a course inside the game, earns prepared-work progress, and submits through an in-game action. Grades and deadlines are computed from simulation state. **There is no file picker, PDF upload, Word upload, attachment field, external LMS submission, or real-world document requirement.** Do not add `input[type=file]` or a file-upload workflow to coursework. Any later assignment minigame must remain playable with game controls and authored UI only.

## Current integration boundary

The central runtime API and its host wiring are committed, and the entry HTML loads its modules. It is intentionally not auto-started by default. The repository does not yet contain a complete credited environment art pack, scene-layout manifest, or production character atlas. Until those assets exist and pass validation, the original entrypoint remains in place and the adventure runtime correctly fails closed rather than pretending the game is ready.
