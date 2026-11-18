# Animation Specification

## Required movement states
Idle, walk, jog, sprint, start, stop, turn-left, turn-right, jump-anticipation, jump-rise, jump-apex, jump-fall, land, slide-start, slide-loop, slide-recover, interact, sit, study, stumble, hit-reaction and rest.

Transitions are authored and interruptible where sensible. Never snap from full sprint to idle without deceleration or deliberate interruption.

## Locomotion
- Walk: alternating foot plants, readable hip shift and counter-swinging arms.
- Run: increased cadence, forward lean and feet that do not visibly skate.
- Sprint: stronger forward intent, longer stride, increased secondary motion and controlled recovery on release.
- Turn: plant outside foot, rotate hips/torso, redirect stride.
- Jump: anticipation/compression, takeoff, rise, apex, fall, contact, landing compression and recovery.
- Slide: lower centre of mass before travel; maintain contact/friction; rise through recovery.
- Collision: directional anticipation/recoil, balance recovery and return to locomotion.

## Secondary motion
Hair, loose clothing, lanyards and backpack straps lag behind acceleration and settle after stopping. Motion is subtle, deterministic and attached to the body.

## Timing and quality
Animation is frame-rate independent. Use delta time, clamp large frame gaps and blend states. Prioritize stable foot contact and silhouette readability. For frame-by-frame assets, document frame rate, frame count, pivot, canvas size and licence.

No limb popping, idle foot sliding, floating contact, sudden scale changes, floor clipping, backwards run cycles or mismatched proportions.
