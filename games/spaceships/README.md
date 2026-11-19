# Starship Simulator — Space Sim & Career Sandbox

A 3D arcade-sim starfighter, exploration, and pilot career sandbox built with **Three.js r128** (`../html/vendor/three-r128.min.js`) with zero external runtime dependencies and full offline support.

## Features

### Flight, Combat & Camera Modes
- **Arcade-Sim 6-DOF Flight**: Smooth quaternion pitch, yaw, roll, variable throttle, boost capacity, air-brakes, gamepad support, optional mouse-steer (`V` or right-drag), and 1-key toggles between Manual Helm and Autopilot (`P`) or Auto-Fire (`H`).
- **4 Weapon Systems (`F` to cycle)**:
  - **Dual Plasma Cannons (`PLASMA`)**: Balanced coherent bolts effective against shields and hulls.
  - **Rapid Pulse Blasters (`RAPID`)**: High-velocity repeaters for intercepting nimble scouts.
  - **Ion EMP Disruptor (`ION EMP`)**: Strips enemy shields (+60%) and stuns thrusters for 2.4s.
  - **High-Yield Mining Laser (`MINING`)**: Breaks ore-bearing asteroids 3.2x faster.
- **Ordnance & Countermeasures**: Lock targets (`Tab`) for guided homing missiles (`M`), deploy thermal chaff/flares (`G`) to decoy incoming missiles, manage weapon heat, and trigger shield/hull impact feedback.
- **Multi-Camera Director**: 3rd-person Chase, First-Person **3D Cockpit** (`C`) with dynamic HUD/planet/station scanner, dual-console telemetry, center spherical radar and forward-locked manual view (right-drag free-look), Gun Sight bore view, Wingman cam, and Cinematic Auto-Sequence.

### Solar System, Stations & Planetary Operations
- **6 Charted Worlds**: `Ember`, `Azure`, `Viridian`, `Cryo`, `Obsidian`, and ringed gas giant `Aurelia` (with landable `Aurelia-IV` moon).
- **3 Orbital Space Stations**: `Starfleet Outpost Alpha`, `Vulcan Mining Refinery`, and `Aurelia Trade Citadel`, built from 20 modular `parts/stations/` components with animated habitat/gravity rings and docking corridors.
- **Asteroid Mining & Derelict Salvage**: 85 asteroids (35 glowing mineable ore asteroids that respawn on a timer) and 4 derelict salvage wrecks scattered across the system, plus tractor-beam loot collection.
- **Star Map & Warp Drive (`N`)**: Interactive tactical chart displaying all 6 worlds, 3 stations, salvage wrecks, current coordinates, and 1-click warp navigation.
- **Planetary Surface Rover (`L` to Land/Dock)**: Atmospheric descent onto planets/moons transitioning into an all-terrain rover with terrain-aligned suspension, jump jets (`Space`) under planetary gravity, site scanning, probe/mineral recovery (`E`), research outpost deployment, and orbital ascent.

### Ship Progression, Squadron Command & Pilot Career
- **6 Playable Ship Classes**:
  - `vanguard` — Vanguard Mk-I Starfighter (starter)
  - `dart` — Zephyr Interceptor (`8,500 CR`)
  - `gunship` — Aegis Heavy Gunship (`45,000 CR`)
  - `corvette` — Valkyrie Strike Corvette (`180,000 CR`)
  - `frigate` — Hyperion Fleet Frigate (`950,000 CR`)
  - `sovereign` — Sovereign Star-Yacht Dreadnought (`15,000,000 CR`, +120 CR/s charter income)
- **6 Upgrade Tracks (Lv 0–5)**: `engines` (Impulse Thrusters), `shields` (Deflector Grid), `hull` (Titanium Bulkheads), `weapons` (Weapon Capacitors), `missiles` (Ordnance Bays), and `scanner` (Tractor & Sensor Array), plus **6 Liveries**.
- **Station Services, Shipyard & Contracts**: Dock at any Space Station (`L` nearby or via Star Map) for repairs/refills, ship purchases, upgrades, liveries, and contract missions (`max 3 active`).
- **Pilot Life Career & Stakes**: Persistent **Skills** (0–6) and **Connections** (0–8) scale weapon damage, mining yield, ship agility, shipyard discounts, and contract tiers. Hull failure triggers **Emergency Station Tow** (5% CR fee when credits ≥ 500, else free) while keeping career progress—or toggle **Ironman Mode** in Pilot Life for permadeath stakes.
- **Persistent Squadron Command**: Shift between 4 fleet formations (`1`–`4`) and issue squadron tactical orders (`F1`–`F4`: Escort, Attack Target, Defend Station, Hunt Hostiles).
- **Starfleet Academy (`T`)**: 10 interactive tutorials covering flight controls, fleet tactics, dogfighting, homing missiles, shields, 3D cockpit avionics, camera director, orbital descent, surface rover operations, and pilot career commerce.
- **Embed Mode (`?embed=true` / `?bg=true`)**: Autonomous muted background showcase on autopilot & cinematic camera sequence.

## Controls

| Input | Action (Flight) | Action (Surface Rover) |
| :--- | :--- | :--- |
| `W` / `S` or `↑` / `↓` | Pitch down / up | Drive forward / reverse |
| `A` / `D` or `←` / `→` | Yaw left / right | Steer left / right |
| `Q` / `E` | Roll left / right | `E`: Interact with anomaly/site |
| `Shift` | Afterburner Boost | — |
| `X` / `Ctrl` | Air-Brake | — |
| Mouse Wheel | Adjust Throttle | — |
| `V` / Right-Drag | Mouse-Steer toggle / Cockpit Free-Look | — |
| `Space` / Left-Click | Fire primary weapon | `Space`: Jump Jets |
| `F` | Cycle weapon (`PLASMA` / `RAPID` / `ION EMP` / `MINING`) | — |
| `M` | Launch homing missile | — |
| `G` | Deploy decoy flare | — |
| `Tab` | Lock nearest target | — |
| `C` | Toggle 3D Cockpit View | Toggle camera perspective |
| `N` | Open / close Star Map & Warp | Open / close Star Map |
| `L` | Land on planet or Dock at nearby Station | Return to orbit |
| `P` / `H` | Toggle Autopilot / Auto-Fire | — |
| `1`–`4` | Squadron Formation | — |
| `F1`–`F4` | Squadron Tactical Order | — |
| `T` | Toggle Starfleet Academy | Toggle Starfleet Academy |
| `Esc` | Unlock mouse / close modals | Close modals |

## Module Architecture

- `index.html` — Entry HTML, launch screen, collapsible controls legend, Pilot Life panel, Academy modal hook, and camera bar.
- `main.js` — Application bootstrap, animation loop, launch screen vs embed mode handling, resize/lifecycle management.
- `core.js` — Central `SpaceGameCore` coordinator integrating rendering, weapons, mining/salvage, career persistence, station docking, warp, planetary landing, and tow/Ironman flow.
- `ship-catalog.js` — Definitions for ship classes, Lv 0–5 upgrade tracks, 6 liveries, 4 weapon types, and pilot bonus formulas.
- `ship-builder.js` — Procedural 3D player flagship (all 6 classes), enemy fighters, boss destroyer, and themed modular Space Stations (`outpost`, `refinery`, `citadel`).
- `environment-manager.js` — Solar system generator (6 planets, moons, 3 stations, 85 asteroids, 4 salvage wrecks, comets, space dust).
- `flight-dynamics.js` — 6-DOF flight physics, AI dogfighting behaviors, ion stun handling, station obstacle avoidance, and squadron formations/orders.
- `camera-director.js` — Chase, forward-locked Cockpit (with free-look), Gun Sight, Wingman cam, and Auto-Sequence camera modes.
- `cockpit-view.js` — Interactive 3D flight deck interior, holographic center radar, left combat/ordnance console, right solar map console, and dynamic proximity scanner.
- `planet-surface.js` — Biome terrain generator, 6 planetary palettes, atmospheric lighting, all-terrain rover driving/jump-jet physics, scanning, probes, outposts, and mini-radar data.
- `contracts-system.js` — Loot pods, tractor beam extraction, wave/boss director, and Station Contract boards.
- `tactical-hud.js` — Tactical HUD strip, crosshair & target lead pip, Star Map & Warp UI, 3-tab Station Docking modal, Tow/Ironman modal, and surface rover overlay.
- `fx-manager.js` — Particle explosions, thruster plumes, shield impacts, tractor beams, flare bursts, fireworks, and floating world text.
- `sound-system.js` — Procedural Web Audio synthesizer (lasers, explosions, missiles, ion blasts, flares, docking chimes, engine hum, rover jump jets).
- `celestial-effects.js` & `cosmic-backdrop.js` — Nebulae, starfield backdrop, and celestial visual shaders.
- `mobile-controls.js` — Responsive virtual joystick and context-sensitive space/surface action buttons.
- `tutorial-system.js` — Starfleet Academy 10-mission interactive training system with voice synthesis and step validation.
- `parts/` — Modular Three.js geometry builders (`hulls.js`, `wings.js`, `cockpits.js`, `thrusters.js`, `weapons.js`, `details.js`, and 20 `parts/stations/*.js` modules).
