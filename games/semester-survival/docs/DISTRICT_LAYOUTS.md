# District Layout Contracts

The four playable districts have authored 2.5D geometry contracts in `district-layouts.js`:

- Residence: shared room, courtyard, laundry corner and the roommate anchor.
- Township: kiosk, print hub, barber, mini-mart, transport stage and study café.
- Campus: gate, lecture hall, library, data lab, student commons, administration and lecturer offices.
- Nairobi city: career centre, interview suite, bookshop arcade and innovation hub.

Each contract defines a 2880×1080 world canvas, ground plane, depth scale and bounds, camera limits, a default spawn, route-specific arrival spawns, three parallax art layers, a hotspot for every world place, and explicit NPC anchors. The layout validator checks place coverage, NPC references, spawn bounds and reciprocal routes.

The browser entrypoint loads this module before `game-runtime.js`. A host can build its district-keyed scene manifest with:

```js
const sceneManifest = SemesterDistrictLayouts.createSceneManifest(SemesterWorldContent);
```

This module defines geometry and stable asset IDs only. It does **not** create or pretend to supply scene art. The matching local background, midground and foreground images still need to be authored, dimension-checked and credited in the asset manifest. The adventure remains fail-closed and opt-in until those assets and the real character atlas are ready.
