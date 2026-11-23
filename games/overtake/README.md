# Overtake for 4weird

A dependency-light Out Run/Horizon Chase style canvas racer built for the 4weird HTML5 game platform.

## Run

Run a static server from the repository root, then open the game route:

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173/games/overtake/index.html`.

## Files

- `src/main.ts` contains the game source.
- `game.js` is the browser-ready build checked in for immediate play.
- `models.js` builds the six Three.js car bodies and adapts the shared GraveGain drivers to the race renderer.
- `game.css` contains the frame-scoped game UI styles.
- `game.json` contains 4weird metadata, credits, controls, and asset notes.
- Runtime image and audio assets are hosted at `https://overtake-assets.vercel.app/`.

## Controls

- Arrow keys or WASD steer, accelerate, and brake.
- C or Ctrl applies the handbrake. Release it on the pavement after a sustained corner drift to earn a mini-turbo.
- Space, Shift, or N uses nitro while the bar has charge.
- P or Escape pauses/resumes the race.
- R restarts the current route.
- Drive through canvas-drawn powerups for nitro refills.

## Progression

- The first screen has Start, Garage, Drivers, Career, and Options.
- Start opens level selection.
- Cars opens the garage, where coins buy and equip faster cars.
- All six routes and both directions are available from the start.
- The Drivers menu offers all 16 GraveGain race and class combinations. Each combines race and class modifiers for acceleration, cornering grip, braking force, and nitro duration.

## Build

Only needed when editing `src/main.ts`.

```bash
npm install
npm run build
npm run check:js
```

The build script compiles TypeScript into `dist/main.js` and copies that output to `game.js`, which is what `index.html` loads. Commit `src/main.ts` and `game.js`; do not commit `node_modules/` or `dist/`.
