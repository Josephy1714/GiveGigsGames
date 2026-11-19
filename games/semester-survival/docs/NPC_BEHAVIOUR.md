# NPC Behaviour and Actor Simulation

## Daily routine decisions
The schedule runtime selects each cast member's authored daily destination from the in-game clock. Weather can redirect exposed routines to an authored sheltered or indoor place. Offscreen characters remain offscreen; no world coordinates are fabricated for another district.

## Route following
The navigation runtime resolves a path only through the active district's designer-authored navigation graph and mounted interaction hotspots. The actor simulation consumes those waypoints and advances deterministically with a bounded frame delta. It tracks position, facing, walking/idle state, route progress and arrival. A route change rebases the actor at the new authored route start; an unavailable route produces no position.

## Visual production gate
Simulation state is not a rendered character. NPC actor snapshots explicitly report `visualReady: false`; no placeholder geometry, monograms, generated portraits or procedural people are drawn. Visible NPCs require approved character model sheets, credited sprite atlases, validated animation clips and a future renderer integration. Character art approval remains a separate production gate.

## Current limitations
- Brian, Amina, Sumeya, Einstein, Ernest, Wanjiku, Mama Njeri and Dr. Mwangi have authored daily schedules. Their schedule targets are validated against actual world places.
- Route following is available only where a scene manifest, NPC start anchor, destination hotspot and connected navigation graph are all authored and mounted.
- The Study Circle is an authored five-person group conversation at the Student Commons from 13:00 to 16:00 game time. It opens only when all five participant schedules match the gathering place and the place has a mounted authored hotspot. Its text dialogue and relationship outcomes are implemented; this does not create visible actors or physical group staging.
- No crowd simulation, collision avoidance, visible group formations, facial animation, gestures, dialogue lip-sync or visible NPC sprites are claimed by this milestone.
- NPC movement does not yet use a production collision mesh; scene navigation graph design must keep authored routes clear.
