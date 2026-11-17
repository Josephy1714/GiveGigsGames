# GraveGain2dD implementation plan

## Target

Build a lightweight, mobile-first endless parkour runner. The player guides Lira, an agile female elf, through a moonlit graveyard that scrolls to the right. A single virtual joystick controls both pace and movement: push right to accelerate, pull left to brake, and push up to jump or vault. Keyboard controls remain available on desktop.

The complete game package must stay below **10 MB** and work without network access after it loads.

## Current project state

- `index.html` contains the responsive game frame, HUD, start/game-over overlay, and one-finger joystick.
- `game.js` contains the canvas loop, scrolling graveyard, speed control, jumping, generated hazards and pickups, score, lives, and restart flow.
- The transparent WebP atlases use 32 × 32 cells. `assets/lira-motion.webp` has 18 hero frames and `assets/moonlit-props.webp` has 12 props, pickups, and effects. The canvas draws the ground.
- `games/catalog.json` and `games/catalog-data.js` now list the game as featured and recommended.
- `games/index.html` now leads with GraveGain2dD in the featured carousel.
- The current package is about 0.04 MB; the repository size checker confirms it is below the 10 MB limit.

## Implementation phases

### 1. Finish the runner loop

- [x] Wire atlas cells to the intended poses and props, including run, jump, vault, hazards, and collectibles.
- Tune acceleration, braking, jump height, obstacle spacing, and collision boxes for readable one-finger play.
- Make vaulting respond consistently to an upward joystick gesture when the elf reaches a vaultable obstacle.
- Add a short, clear first-run instruction and immediate restart after a run ends.
- Keep endless difficulty progression fair: increase pace and hazard variety gradually, while retaining reaction time on touch screens.

### 2. Make mobile play comfortable

- Check the layout in portrait and landscape, including safe-area insets and common phone aspect ratios.
- Keep the joystick reachable and visible without covering Lira, upcoming hazards, or the score.
- Ensure pointer capture, release, cancellation, and interrupted touches always return the joystick to neutral.
- Support reduced-motion preferences where practical and keep HUD text legible over the game scene.

### 3. Polish feedback and progression

- Add compact visual feedback for successful vaults, near misses, damage, and collected moonshards.
- Distinguish hazards by silhouette and give the player enough visual warning to react.
- [x] Save the best distance locally and show it on the HUD and results screen.
- Add optional sound effects only if they remain local, small, and easy to mute.

### 4. Publish it as the featured easy-play game

- Add `gravegain2dD` to `games/catalog.json` with touch and keyboard input metadata and a concise description.
- Add the game to `games/index.html` and make it the lead featured-carousel item, linking directly to `gravegain2dD/index.html`.
- Regenerate `games/catalog-data.js` from the catalog source.
- Confirm the catalog entry resolves and the featured link launches this game.

### 5. Check the deliverable

- Verify the sprite atlas is WebP with a working transparent alpha channel and 32 × 32 cells.
- Verify local asset paths load when served from the repository and the game can start, run, end, and restart.
- Measure the entire `games/gravegain2dD` directory and keep it below 10,000,000 bytes. Prefer small local assets and avoid remote runtime dependencies.
- Record the final package size and any remaining known limitations here before calling the game complete.

## Completion checklist

- [ ] Joystick reliably controls speed, braking, jumping, and vaulting with one finger.
- [ ] Obstacles, gaps, and pickups have clear collision behavior and feedback.
- [ ] Best distance persists locally; restarting is immediate.
- [ ] Layout and controls work on phone and desktop.
- [x] The game is the lead featured item and appears in the generated catalog.
- [x] The complete package is under 10 MB (current measured size: about 0.04 MB).
- [ ] Verify the full run, restart, and local best-distance flow in a browser.
