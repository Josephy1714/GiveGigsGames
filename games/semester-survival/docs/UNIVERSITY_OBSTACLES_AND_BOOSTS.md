# University Obstacles, Boosts and Traversal

Obstacles are grounded in student life, not generic arcade hazards. Designers author zones against the finished scene layout. Every zone has a stable ID, a shape, an effect and a gameplay purpose.

## Slowing / draining encounters
- **Muddy construction path:** campus or township route under maintenance. Reduces speed and acceleration and increases sprint stamina drain.
- **Crowded corridor:** busy class-change foot traffic. Creates a traversal bottleneck without randomly knocking the player down.
- **Wet floor:** freshly cleaned or rain-wet surface. Reduces traction-like acceleration and speed. It does not force an uncontrolled fall.
- **Heavy backpack:** applied only when inventory/equipment confirms the student is carrying the load. Slows movement and raises stamina use.

## Helpful movement / recovery
- **Campus athletics track:** clear, maintained running route. Gives a modest speed benefit and makes sprinting more stamina-efficient while inside the authored zone.
- **Coffee kiosk:** purchased coffee grants a short, modest alertness/sprint benefit with a clear expiry; never a free infinite pickup.
- **Water fountain:** a brief recovery effect representing hydration and a breather. It improves stamina recovery, not GPA or intelligence.
- **Campus shuttle / matatu:** contextual transport interaction moves the student between authored stops with a time and fare cost. It is transport, not a magical speed boost.

## Rules
- Zones are authored per district in sceneManifest[district].gameplayZones, separately from solid collision geometry. Supported shapes: AABB and circle.
- Continuous zones apply only while inside. Trigger zones grant a timed effect and cooldown. Leaving a trigger does not instantly cancel its benefit.
- Modifiers combine multiplicatively and are clamped. The player controller applies them to target speed, acceleration, stamina drain and recovery. They do not directly change grades, finances or relationships.
- Enter, exit, effect-start and effect-end events are emitted for future HUD, sound and VFX adapters. The simulation does not pretend to render particles or audio before those assets exist.
- Make effects legible: show the surface/zone, explain it in a short hint, and keep boundaries predictable.
- No forced knockdowns, random stuns or unfair collision traps. Reward route choice, timing and awareness.
