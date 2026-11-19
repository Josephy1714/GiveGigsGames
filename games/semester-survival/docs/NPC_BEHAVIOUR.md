# NPC Behaviour and Actor Simulation

## Daily routine decisions
The schedule runtime selects each cast member's authored daily destination from the in-game clock. Weather can redirect exposed routines to an authored sheltered or indoor place. Offscreen characters remain offscreen; no world coordinates are fabricated for another district.

## Route following
The navigation runtime resolves a path only through the active district's designer-authored navigation graph and mounted interaction hotspots. The actor simulation consumes those waypoints and advances deterministically with a bounded frame delta. It tracks position, facing, walking/idle state, route progress and arrival. A route change rebases the actor at the new authored route start; an unavailable route produces no position.

## Visual production gate
Simulation state is not a rendered character. NPC actors remain invisible unless a credited, approved per-character animator is supplied with the required authored walk/idle clips. The runtime and renderer integration now support those animators, depth-sorted sprite rendering and foreground occlusion. No placeholder geometry, generated portraits or procedural people are drawn. Character art approval remains a separate production gate.

## Current limitations
- Brian, Amina, Sumeya, Einstein, Ernest, Wanjiku, Mama Njeri and Dr. Mwangi have authored daily schedules. Their schedule targets are validated against actual world places.
- Route following is available only where a scene manifest, NPC start anchor, destination hotspot and connected navigation graph are all authored and mounted.
- The Study Circle is an authored five-person group conversation at the Student Commons from 13:00 to 16:00 game time. It opens only when all five participant schedules match the gathering place and the place has a mounted authored hotspot. Its text dialogue and relationship outcomes are implemented; this does not create visible actors or physical group staging.
- NPC sprite rendering is supported only when approved atlases and animators are injected; this repository does not currently include approved NPC atlases, so no production NPC sprites are ready by default.
- No crowd simulation, collision avoidance, animated group formations, facial acting, gestures or completed visible dialogue lip-sync are claimed by this milestone.
- NPC movement does not yet use a production collision mesh; scene navigation graph design must keep authored routes clear.


## Authored NPC sprite rendering hook

The NPC actor runtime accepts optional per-character authored animators. It advances the matching walk or idle clip using the actor's actual route state and facing, and exposes renderables only when the animator confirms that the required authored clip exists. The character runtime passes those renderables to the 2.5D scene compositor, which draws player and NPC sprites in ground-position order for depth-aware overlap. The game runtime accepts `npcAnimators` and optional `npcCharacterScales` at creation.

No animator is fabricated. With no approved NPC atlases supplied, the runtime continues to report zero visually ready NPC actors and draws no substitute figures. Each NPC atlas must be independently approved, credited, loaded from the local asset manifest, and include at least real walk and idle clips before it can appear.
