# Character Runtime Integration

## Purpose

`character-runtime.js` is the orchestration boundary between the deterministic locomotion controller, authored sprite-atlas animator, input intent manager, and 2.5D scene renderer. It does not own a requestAnimationFrame loop, load remote content, or synthesize character artwork.

## Construction

The host constructs the four dependencies and passes them to `SemesterCharacterRuntime.create`:

- `controller`: `update(delta, intent)`, `snapshot()`, `reset(position)`
- `animator`: `play(clip, facing)`, `update(delta)`, `snapshot()`, `render(context, x, y, scale)`, `reset()`
- `renderer`: `updateCamera(target, delta)`, `render(frame)`; optional `getLayout()` supplies the mounted scene ground line and depth scale
- `inputManager`: `consume()`; optional `destroy()`

Optional settings are `characterScale`, `cameraOffsetY`, `requiredClips`, and `clipLibrary`. When a clip library is supplied, all required locomotion/action clips are validated before runtime creation. There is no placeholder fallback.

## Frame contract

The host calls `update(delta)` once per simulation frame, then `render()` when drawing. Update consumes one normalized input intent, advances locomotion, selects the authored clip, advances animation, and follows the character with the camera. The host retains control of frame scheduling and canvas resizing.

The runtime clamps simulation delta to 50 ms. Horizontal position, depth position and jump height remain independent. Each mounted scene can author `depthBounds`; the character runtime applies those limits before movement and spawn resets. The renderer maps depth onto the authored ground plane and camera follow uses that combined screen position. The controller and animator retain their own deterministic limits. `render()` passes the animator and world position to the scene renderer; only decoded atlas pixels can appear.

## Animation mapping

Most controller state names map directly to clip names. The controller's `land-recover` state maps to the authored `land-soft` clip. A missing selected clip blocks character rendering and is surfaced through `getState().error`; movement/camera diagnostics remain available. This is intentional: missing production art must be visible as a build defect, not hidden with a fake pose.

## Lifecycle

- `reset(position)` resets movement, animation and camera tracking to idle at the requested X/depth spawn position.
- `getState()` returns movement, animation, last input, frame count, readiness and error.
- `dispose()` prevents further updates/renders and releases the input manager's event listeners.

## Current scope boundary

This is a reusable integration runtime, not yet the shipped playable game. The game entrypoint is intentionally unchanged until authored character atlases, environment scenes, interactions, UI, and the complete game loop are integrated and browser-tested.

## Collision integration

The locomotion controller accepts an optional collision world through `setCollisionWorld`. Before applying scene bounds, it submits the proposed horizontal/depth displacement and stable collision radius to the authored collision runtime. The returned resolved position replaces the proposed position; velocity directed into a blocking surface is cancelled while tangential movement remains available. Collision geometry is independent of animation pivots and sprite dimensions. See [Collision and Contact](COLLISION_AND_CONTACT.md) for the authored shape/material contract. An empty collider list is not evidence of collision-ready production content.
