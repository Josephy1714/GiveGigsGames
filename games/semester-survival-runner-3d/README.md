# Semester Survival 3D — The University Run

This is the isolated Three.js conversion of the original Semester Survival Runner.

## Non-negotiable preservation rule
- The original `games/semester-survival-runner/` remains untouched and independently playable.
- This package is the working copy for the 3D conversion.
- The original runner source is preserved here as `legacy-2d-reference.html`, alongside its original assets, gameplay catalogs, save modules, tests, and animation tooling.
- Do not delete or replace the original game until the 3D edition is complete, regression-tested, and explicitly approved.

## Current build status
The catalogue entry launches the Three.js world-development build. It currently demonstrates the road, campus blockout, roadside scenery, traffic, camera, and lane/jump/slide controls. It is **not yet the complete converted runner**: the original progression/gameplay loop is being ported into the Three.js runtime, and Jay's rigged GLB is not yet available.

## Conversion target
Keep the original runner's rules and progression intact while replacing its rendering layer with Three.js:
- eight-semester progression and graduation / alumni mode
- distance, coins, GPA, energy, assignments, and persistent save data
- obstacle patterns, semester bosses, pickups, power-ups, and collision outcomes
- shop, upgrades, character unlocks, achievements, and results screens
- pause/resume, keyboard, touch, and mobile-safe HUD
- audio and accessibility settings

## World and art direction
Build a premium, believable Kenyan university road experience: a carefully profiled asphalt road with markings, drains, curbs, sidewalks, campus gates, academic blocks, student residences, shops, street lighting, signage, landscaping, traffic, and distant skyline. Buildings and vehicles should use authored, reusable low-to-mid-poly assets with coherent materials, lighting, scale, and performance budgets—not untextured placeholder cubes in the final build.

## Development
- Entry point: `index.html`
- Three.js scene: `src/three/world-preview.js`
- Jay GLB loader and animation gate: `src/three/jay-character.js`
- Original 2D source: `legacy-2d-reference.html`
- Original gameplay assets and modules are retained in this package.
- Three.js is loaded from the pinned CDN version in the module imports; a production offline bundle still needs to be selected and tested.

## Release gate
Do not mark this game stable until the 3D build passes the original runner's gameplay regression tests, save migration tests, keyboard/touch tests, mobile performance checks, asset loading checks, and visual QA on desktop and Android.
