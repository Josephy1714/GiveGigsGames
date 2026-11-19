# Animation Production Specification

This document defines a release-blocking quality standard. Movement is a core part of the game's identity. A character that merely changes poses or glides across the floor is not acceptable.

## Animation principles
- Motion must communicate weight, intent, balance, momentum and contact with the ground.
- Every locomotion action has anticipation, execution, follow-through and recovery where physically appropriate.
- The same character must preserve anatomy, proportions, costume, face and drawing style across all frames and camera angles.
- Character animation is authored and reviewed as animation, not inferred from a static illustration.
- Runtime must blend authored motion cleanly; procedural code may control timing, direction and secondary response but must not substitute for missing character artwork.

## Required movement states
Idle, idle variants, walk, jog, sprint, acceleration, deceleration, start, stop, turn-left, turn-right, pivot, jump-anticipation, jump-takeoff, jump-rise, jump-apex, jump-fall, land-soft, land-hard, slide-start, slide-loop, slide-recover, crouch, dodge-left, dodge-right, stumble, trip-recovery, hit-reaction, interact, pickup, open-door, sit, stand, study, rest and transition-to/from-stairs.

State transitions must be authored, interruptible where sensible and selected from actual movement intent and grounded/airborne state. Never snap from full sprint to idle without deceleration or a deliberate interruption.

## Leg mechanics and locomotion quality

### Walk
- Clear alternating left/right foot plants with heel-to-toe roll where visible.
- Opposite arm and leg counter-swing; hips and shoulders rotate subtly in opposition.
- Support leg carries the body while the swing leg passes through; pelvis rises and falls naturally.
- Feet remain planted during stance. Do not translate a planted foot with the body.
- Stride length and cadence respond to speed rather than changing only the playback rate.

### Jog and run
- Distinct gait from walking: shorter ground contact, increased cadence, stronger arm drive and forward intent.
- Foot strike, compression, push-off, flight and recovery are readable.
- Knees lift and fold naturally; lower legs do not bicycle mechanically.
- Keep the centre of mass over the support foot during contact. Prevent skating, toe clipping and feet passing through the ground.
- Speed changes use acceleration/deceleration curves and blend stride length and cadence together.

### Sprint
- Stronger forward lean, more forceful push-off, longer stride and deliberate arm drive.
- Shoulder, torso and pelvis respond to acceleration; head remains visually stable enough to read.
- Backpack, shirt tails, hair and lanyard lag behind acceleration, then settle.
- Releasing sprint triggers a believable deceleration and return to jog/walk, not an instant pose swap.

### Starts, stops and turns
- Start: weight shift, preparatory lean, first push-off and transition into the gait cycle.
- Stop: shorten stride, plant, absorb momentum and settle into idle.
- Sharp turn: lower centre of mass, plant an outside foot, rotate hips then torso, redirect the next step.
- Tight pivot and broad running turn are separate actions.
- Direction changes must affect velocity and facing coherently; no sideways foot skating or instant 180-degree rotation at full speed.

## Jumping
A jump is a complete action, not a vertical position offset alone:
1. Anticipation: compress knees, lower centre of mass and prepare arm swing.
2. Takeoff: extend through ankles, knees and hips; feet leave the ground in a readable sequence.
3. Ascent: body follows a coherent arc; legs tuck or extend according to jump style.
4. Apex: brief reduction in vertical velocity; pose remains alive, not frozen.
5. Descent: prepare legs for landing and orient feet toward the surface.
6. Contact: feet meet the ground at the correct time; knees and hips absorb impact.
7. Recovery: torso and arms settle before returning to locomotion.

Jump height and horizontal travel must match gameplay physics. Short hops, full jumps and falling recoveries must not all use the same animation. Landing on a slope or from a higher drop must not visibly penetrate or float above the floor.

## Sliding, crouching and dodging
- Slide-start: lower centre of mass before forward travel, with a readable leg tuck and controlled arm placement.
- Slide-loop: maintain a stable low silhouette and consistent ground relationship; clothing and backpack respond to momentum.
- Slide-recover: transfer weight through a planted foot, rise in stages and regain balance before full-speed running.
- Crouch is a sustained controlled pose, not a scaled-down character.
- Dodge uses a lateral weight shift, foot plant, torso counter-rotation and recovery step. Directional dodge animations must be distinct.
- Slide and dodge must respect collision geometry and cannot pass through obstacles unless the gameplay explicitly permits it.

## Stairs and uneven ground
- Use step-aware foot placement and alternating lead legs.
- Body height changes with each step; feet contact each tread without clipping.
- Transitions between flat ground, stairs and slopes preserve momentum and facing.
- Do not fake stair climbing by sliding the whole character vertically.

## Secondary motion and facial acting
Hair, loose clothing, lanyards and backpack straps lag behind acceleration and settle after stopping. Motion is subtle, deterministic and attached to the body.
- Secondary motion follows the primary action; it must not look detached or randomly oscillate.
- Facial expression and gaze respond to exertion, surprise, conversation and recovery.
- Breathing may change after sprinting or exertion. Avoid exaggerated loops at rest.
- Hands, fingers, wrists and shoe contacts must remain coherent across frames.

## Runtime controller and blending
- Use delta time, clamp unusually large frame gaps and keep simulation independent of render frame rate.
- Drive gait from measured character speed and grounded state, not from a fixed timer.
- Blend between walk/jog/sprint by speed with hysteresis to prevent rapid state flicker.
- Use foot-contact windows or equivalent foot-locking logic to reduce sliding during stance.
- Separate facing direction, movement direction and camera direction.
- Keep collision capsule/shape stable and separate from visual squash, lean and pose offsets.
- Airborne and grounded transitions must be driven by physics/contact state, not animation duration alone.
- Pause or safely resume animation when the tab loses visibility.

## Production asset delivery
For every animation clip, record:
- Character and costume version; clip name and intended use.
- Source artwork/rig file and responsible creator.
- Frame rate or rig sampling rate, frame count/duration and loop points.
- Canvas dimensions, pivot/origin, ground line, scale and export format.
- Required transitions and blend duration.
- Licence/permission, source and final runtime file path.
- Preview showing the clip at actual gameplay camera scale.

Frame-by-frame assets must have consistent registration and transparent backgrounds. Rigged assets must include documented skeleton hierarchy, skin weights, constraints and tested deformation limits. Do not mix methods casually within one character.

## Quality assurance and acceptance tests
A movement set is rejected if any of the following occurs:
- Feet skate during planted contact or visibly pass through the floor.
- Legs switch, pop, twist unnaturally or change length between frames.
- The body floats, snaps, teleports or changes scale during a transition.
- Sprint-to-stop, jump-to-land or slide-to-run transitions are abrupt.
- The character loses costume, facial or body consistency between clips.
- Animation looks convincing only in a static frame but fails at actual gameplay speed.
- Camera framing hides contact points or makes the movement unreadable.

Review every clip at slow speed, normal speed and actual gameplay camera scale. Test at low and high frame rates. Test keyboard and touch input, rapid direction changes, repeated jump/slide inputs, interrupted actions, slopes/stairs and collisions. Record defects and fix them before marking the clip accepted.

## Release gate
No movement feature is called complete until its authored animation, controller integration, transitions, collision behavior and in-game review all pass. A concept sheet, placeholder pose, procedural stick-figure or a single looping run cycle does not pass this gate.


## Runtime implementation contract

The runtime adapter lives in `character-animation.js` and consumes the locomotion snapshot from `character-controller.js`. It is an atlas player, not an art generator.

### Atlas metadata contract

A delivered character atlas must be accompanied by metadata with this shape:

```js
{
  clips: {
    "idle": {
      fps: 8,
      playback: "loop",
      frames: [
        { x: 0, y: 0, width: 128, height: 192, pivotX: 64, pivotY: 184 }
      ]
    }
  }
}
```

- Frame rectangles are pixel coordinates in the decoded atlas.
- Pivot coordinates are relative to each frame's top-left corner; default pivot is bottom-centre.
- Playback is `loop`, `once` or `pingpong`.
- Clip names must match the state mapping in `character-animation.js`, or be explicitly mapped by the integration layer.
- The runtime rejects malformed rectangles, invalid frame rates and atlas overflow before playback.
- Clip transitions crossfade only between authored frames. Horizontal facing mirrors the rendered frame; directional actions such as dodge-left and dodge-right must still have distinct authored clips.
- A missing clip is surfaced as a missing-asset result. There is deliberately no fallback pose, geometric character or generated animation.

### Current implementation boundary

The controller-to-atlas adapter, deterministic frame sampling, crossfade, facing and canvas draw path are implemented and unit-tested. This does **not** mean character animation production is complete: the approved character atlas, model sheet, actual movement clips, transition clips and in-game visual review are still required release gates. Do not mark a clip accepted until its source artwork and runtime preview have been reviewed at gameplay scale.

## NPC path and animation handoff

NPC navigation produces authored waypoint sequences only. The eventual actor controller must consume these routes using the same delta-time, acceleration, foot-contact, facing, obstacle and recovery standards as the player controller. It must not teleport between nodes or use generic procedural figures. Each recurring NPC needs an approved model sheet, costume-consistent animation atlas/rig, walk/turn/stop/idle/dialogue clips and reviewed transitions before visible movement is enabled. A route being computable is not evidence that a character can walk it convincingly.

## Collision-aware performance

Animation must respond to actual collision/contact state, not visual overlap alone. A blocked run should plant and absorb weight; a shoulder brush should not use a full-body impact; a hard stop should settle through the feet and torso. Contact normals and material/effect tags are gameplay signals for authored animation and audiovisual reactions. Never fake collision by moving a sprite away from a wall while leaving the gameplay body embedded. Collision geometry and visual animation must be reviewed together at gameplay scale. See [Collision and Contact](COLLISION_AND_CONTACT.md).

## Dialogue voice and phoneme-aligned mouth animation

Dialogue voice uses a separate approved mouth atlas so speaking does not replace body locomotion. The lip-sync runtime samples the actual audio playback clock and selects manually aligned viseme clips. A mouth atlas must include a neutral pose and approved language-appropriate visemes; each line needs a licensed human voice recording and reviewed timestamp cue track. See [Lip-Sync and Voice](LIP_SYNC_AND_VOICE.md). Do not mark dialogue as lip-synced when any of these assets are missing.


## Authored frame event markers

Atlas frames may declare an optional `events` array of non-empty string markers. The animator emits these markers when playback enters the corresponding frame and exposes them through `drainEvents()`, which returns and clears the pending queue. Markers are emitted in playback order, including loop and ping-pong revisits; one-shot clips do not repeat the final frame marker after completion. This provides a deterministic synchronization point for foot contacts, landing impacts, cloth/prop cues and authored effects. Marker names are data only: the host must explicitly map them to approved sound or visual effects. No sound, dust, particles or other effect is fabricated by the animation runtime.


## Runtime event integration

Atlas frame markers are queued by the animator on frame entry. The character runtime exposes them through `drainAnimationEvents()`, and the central adventure runtime publishes each drained marker as `character:animation-event`. Event payloads identify the character, clip, atlas frame index, marker name, and simulation frame. This is an event contract only: it does not synthesize footsteps, impacts, particles, or sound. Those effects require authored assets and dedicated consumers.
