# Semester Survival 3D — The University Run

This is the isolated Three.js conversion of the original Semester Survival Runner.

## Preservation contract
- The original `games/semester-survival-runner/` remains untouched and independently playable.
- This package is the working copy for the 3D conversion.
- The complete original 2D game is preserved as `legacy-2d-reference.html`, with its original assets, save modules, obstacle and power-up catalogs, animation tools, and regression tests.
- The 3D entry now runs the original runner's gameplay simulation, progression, collision rules, scoring, save store, shop, upgrades, semester bosses, pickups, and HUD. The old canvas renderer is replaced by a Three.js scene.
- Do not delete or replace the original game until the 3D edition is complete, regression-tested, and explicitly approved.

## Current conversion status
The playable 3D entry reuses the original runner simulation and renders Jay as a real skinned Three.js character from `assets/3d/jay/jay.glb`. The model is built from the supplied Ajay FBX rig with five embedded animation clips: Idle, Run, Jump, Slide and Fall. The loader checks for a skinned mesh, scales the model to gameplay height, and crossfades animation actions. The 3D renderer no longer falls back to a 2D billboard: if the GLB cannot load, the character asset failure is surfaced instead of silently showing a sprite. A compact WebP portrait is used only in the character-selection UI.

The campus scene includes layered lecture-block facades, recessed divided glazing, projecting sills, floor bands, glazed double-door entrances, canopies, columns, stepped access, parapets, rooftop service details and solar panels. Asphalt grain, shadow-casting campus trees and directional shadows improve the world lighting. Traffic includes procedural sedan, Kenyan matatu and university shuttle silhouettes with raised cabins, glazed windows, doors, mirrors, bumpers, lights, route signage, matatu roof rack/livery, shuttle service markings, detailed wheels and distance-driven wheel rotation. These remain procedural modular environment assets rather than final authored production models.

The original 2D runner remains untouched in `games/semester-survival-runner/`. The legacy reference HTML points to those original assets rather than duplicating multi-megabyte sprite sheets inside this 3D package.

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
