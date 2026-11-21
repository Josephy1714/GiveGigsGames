# Semester Survival 3D — The University Run

This is the isolated Three.js conversion of the original Semester Survival Runner.

## Preservation contract
- The original `games/semester-survival-runner/` remains untouched and independently playable.
- This package is the working copy for the 3D conversion.
- The complete original 2D game is preserved as `legacy-2d-reference.html`, with its original assets, save modules, obstacle and power-up catalogs, animation tools, and regression tests.
- The 3D entry now runs the original runner's gameplay simulation, progression, collision rules, scoring, save store, shop, upgrades, semester bosses, pickups, and HUD. The old canvas renderer is replaced by a Three.js scene.
- Do not delete or replace the original game until the 3D edition is complete, regression-tested, and explicitly approved.

## Current conversion status
The playable 3D entry reuses the original game loop and state. Three.js renders the road, campus blocks, gate, sidewalks, lane markings, streetlights, trees, roadside furniture, traffic, obstacles, coins, power-ups, and Jay's existing animated sprite atlas as a temporary billboard in the 3D world.

Jay's final skinned 3D GLB is not yet present. Until that model is authored and rigged, the renderer uses the complete approved Jay runtime atlas as a camera-facing sprite in the 3D world. The bridge now plays the authored jog, sprint, running-jump, fall, and three-part slide clips with frame-accurate timing, pivot alignment, smooth lane easing, and short crossfades. This is a polished 2D-to-3D bridge, not a finished 3D character or a substitute for a true skinned model. The campus lecture blocks now have layered facade treatment: recessed divided glazing, projecting sills, floor bands, glazed double-door entrances, canopies, columns, stepped access, parapets, rooftop service details and solar panels. Asphalt grain, shadow-casting campus trees and soft directional shadows improve the world lighting. Traffic now includes distinct procedural sedan, Kenyan matatu and university shuttle silhouettes with raised cabins, glazed windows, doors, mirrors, bumpers, lights, route signage, matatu roof rack/livery, shuttle service markings, detailed wheels and distance-driven wheel rotation. These are still procedural modular assets, not final authored production models.

## Preserved game systems
- eight-semester progression and graduation / alumni mode
- distance, coins, GPA, energy, assignments, and persistent save data
- obstacle patterns, semester bosses, pickups, power-ups, and collision outcomes
- shop, upgrades, character unlocks, achievements, and results screens
- pause/resume, keyboard, touch, and mobile-safe HUD
- original audio and accessibility settings

## World and art direction
The target is a premium, believable Kenyan university road experience: a carefully profiled asphalt road with markings, drains, curbs, sidewalks, campus gates, academic blocks, student residences, shops, street lighting, signage, landscaping, traffic, and a distant Nairobi skyline. Buildings and vehicles should graduate into authored, reusable assets with coherent materials, lighting, scale, and mobile performance budgets—not untextured placeholder cubes in the final build.

## Development
- Entry point: `index.html`
- Three.js renderer: `src/three/runner-three-renderer.js`
- Jay GLB loader and animation gate: `src/three/jay-character.js`
- Original 2D source: `legacy-2d-reference.html`
- Run the original module tests from this folder with `npm run test:runner-modules`.

## Release gate
Do not mark this game stable until the 3D build passes the original runner's gameplay regression tests, save migration tests, keyboard/touch tests, mobile performance checks, asset loading checks, and visual QA on desktop and Android.
