# Semester Survival: The University Run

A standalone 2D/2.5D endless runner. Jay auto-runs through three lanes; use lane changes, jumps and slides to avoid academic and campus obstacles, collect coins and progress through eight semesters.

## Controls
- Keyboard: Left/Right or A/D to change lanes; Up/W/Space to jump; Down/S to slide; Escape to pause.
- Touch: swipe left/right to change lanes, up to jump, down to slide.

## Jay animation assets
The runner loads its own local atlas from `assets/processed/jay-runtime/` and the authored animation runtime in `src/animation/`. Current atlas clips include idle, walk, jog, sprint, standing jump, running jump, fall and recovery. Jump and sprint are connected to live gameplay.

Slide input and slide collision logic are implemented. The current checked-in Jay atlas does not contain a dedicated slide clip, so the character currently retains the sprint artwork during the slide action rather than substituting an unrelated pose. The slide source sheet must be added to the atlas before an authored slide animation can play.

## Project boundaries
Only runner gameplay is active here. The old `games/semester-survival/` directory remains untouched. No NPC schedules, dialogue, student phone, service interactions or open-world simulation systems are included in this runtime.

## Validation
Run `npm run test:runner-modules` for runner catalogs, save storage and animation runtime tests.
