# Semester Survival: The University Run

A standalone 2D/2.5D Kenyan university endless runner. Jay automatically runs through an endless three-lane course; dodge academic and campus-life obstacles, jump, slide, collect coins and survive all eight semesters.

## Controls
- **Keyboard:** Left/Right or A/D to change lanes; Up/W/Space to jump; Down/S to slide; Escape to pause.
- **Touch:** Swipe left/right to change lanes, up to jump, down to slide.

## Included
- Jay's approved sprite atlas and animation frames, stored locally in this game package.
- Endless-run loop, lane switching, jump/slide actions, obstacles, coins, semester progression and local save.
- Modular obstacle, power-up and save helpers with Node tests.

## Scope
This is a runner only. It does not load the old university-life simulation, NPC schedules, dialogue, student phone, service interactions or open-world systems. The original `games/semester-survival/` folder is not modified.

## Current visual note
Jay's atlas includes idle, walk, jog, sprint, jump, fall and recovery clips, but no dedicated slide clip. The current slide pose is a temporary runtime squash/lean treatment; a proper authored slide animation is still needed before calling the character animation production-final.

## Test
Run `npm run test:runner-modules` from this folder. The repository browser smoke test also checks lane changes, jumping, sliding, pause/resume and run completion.
