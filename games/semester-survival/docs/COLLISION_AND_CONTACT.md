# Collision and Contact Specification

## Coordinate contract

Collision geometry is authored in each district's gameplay plane: horizontal `x` and scene depth. It is independent of camera pixels and visual sprite bounds. A scene manifest may provide:

```js
collision: {
  colliders: [
    { id: "library-wall-west", type: "aabb",
      minX: 120, maxX: 180, minDepth: -40, maxDepth: 60,
      material: "concrete", effect: "dust", friction: 0.82 }
  ]
}
```

Supported solid shapes are axis-aligned boxes (`aabb`), circles and capsule-like segments. IDs must be unique. Geometry is never inferred from background art, hotspots or image pixels. Designers must author and review collider placement against the final environment artwork. The current collision layer is static; moving doors, crowds, vehicles and destructible props require separately authored dynamic-collider ownership before they are enabled.

## Response model

Actors are represented by a stable gameplay collision circle, separate from their visual pose, clothing and animation squash. Proposed movement is subdivided according to collider radius to prevent ordinary high-speed tunnelling. Penetration is resolved against authored solids; movement can continue tangentially along a wall. The player controller receives the resolved position and cancels velocity into a blocking surface. District changes replace the collider set and clear stale contacts.

Materials are explicit: concrete, stone, wood, metal, glass, grass, gravel, water and soft. Restitution and friction are bounded and authored per collider. The first implementation is intentionally conservative: no unreviewed bounce force is applied to the player.

## Contact events and effects

The collision runtime emits `collision:enter`, `collision:impact` and `collision:exit` events with actor/collider identity, material, authored effect tag, contact normal and impact intensity. Effects are metadata signals for the audiovisual layer; tags include dust, spark, splash, debris and none. A metal collider can request sparks; a soft or grassy surface must not produce a metal impact. The runtime does not claim to render particles or play sound merely because an event is emitted. Impact position is reported in gameplay coordinates for a later renderer/audio adapter.

## Readiness and QA

An empty collider list is valid during early integration but means no authored collision geometry is active. Production scenes must include reviewed collision geometry before being called physically complete. Test high-speed movement, corner grazing, wall sliding, narrow passages, spawn clearance, diagonal approach, depth-axis movement, repeated contact, exit transitions and district changes. Verify collider overlays against the commissioned art at gameplay scale. Never infer colliders from approximate visual rectangles and call them final.


## Animation-driven surface contacts

A district may declare `contactSurfaces` in its scene manifest. Each entry has a unique ID, authored gameplay-plane geometry (`aabb` or `circle`), a supported material, an optional audiovisual effect tag, and optional priority. The contact resolver checks Jay's grounded animation frame markers against these authored regions and emits `character:surface-contact` with the foot side or landing action, character, district, surface ID, material, effect tag and gameplay position. Overlapping regions resolve by priority, then smallest area, then stable ID.

Only `left-foot-contact`, `right-foot-contact` and `landing-impact` markers are interpreted. Missing surface metadata produces no contact effect. Airborne foot markers are ignored. The resolver supplies event metadata only: no footsteps, dust, splashes, sparks or landing sounds are drawn or played until commissioned local assets and explicit audiovisual consumers are supplied. District changes replace the contact-surface set; teardown clears it.
