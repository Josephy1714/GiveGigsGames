# Asset Manifest

No third-party art, music, fonts or code may be added without redistribution rights and a recorded source.

| Asset group | Source / creator | Licence / permission | Format | Status |
|---|---|---|---|---|
| Existing game code | Existing repository contributors; history audit required | Verify repository terms before reuse | JS/CSS/HTML | Legacy |
| New interface/prototype code | Josephy1714 / project contributors | Confirm in game metadata | HTML/CSS/JS | In progress |
| Jay character turnaround | Original GiveGigsGames character; supplied and approved by project owner | Project-owner approval recorded; retain source/rights record | JPEG, 4-view model reference | Approved reference; not runtime-ready |
| Other character model sheets | Not yet supplied | Must be confirmed | To specify | Not started |
| Background illustrations | Not yet supplied | Must be confirmed | To specify | Not started |
| Audio | Not yet supplied | Must be confirmed | To specify | Not started |

For every final asset record exact path, author/source, licence, original URL where applicable, edits, dimensions, compression and byte size. No remote fonts or runtime CDN assets.

## Runtime scene manifest schema

The scene asset pipeline validates and preloads authored local images declared by a version-1 manifest. Each asset needs a unique ID, safe relative path, supported role (`background`, `layer`, `prop`, `character-atlas`), exact pixel dimensions, a maximum byte budget, and author/licence attribution. Remote URLs, absolute paths, traversal paths, duplicate IDs and uncredited assets are rejected.

Each district scene manifest supplied to `environment-runtime.js` must declare a non-empty `requiredAssetIds` array. In the renderer, `render.width` and `render.height` are the camera viewport; `render.worldBounds` describes the full district. All layers and hotspots must fit inside world bounds, and camera bounds must keep the complete viewport inside that world. Every spawn point must be a numeric `{ x, depth }` world coordinate; string labels are rejected. Optional `npcAnchors` entries must reference a known authored character and a real hotspot in the rendered scene. Every required ID must exist in the asset pipeline manifest and belong to that same district. This prevents a district from borrowing another district's asset to satisfy readiness.

Example shape (illustrative only; it does not claim these files exist):

```js
const sceneAssets = {
  version: 1,
  scenes: {
    residence: {
      assets: [{
        id: "residence-room-background",
        src: "assets/scenes/residence/room.webp",
        role: "background",
        width: 1920,
        height: 1080,
        maxBytes: 900000,
        credit: { author: "Artist name", license: "Original project asset" }
      }]
    }
  }
};

const sceneManifest = {
  residence: {
    sceneId: "residence-main",
    requiredAssetIds: ["residence-room-background"],
    spawnPoints: { default: { x: 240, depth: 0 } },
    interactables: {},
    npcAnchors: []
  }
};
```

Preloading verifies decoded image dimensions and reports failures explicitly. `environment-runtime.js` awaits this preload and verifies required assets are retrievable before asking the renderer to mount a district. A failed preload or mount does not activate the destination scene. No substitute image is generated. Declared byte budgets must also be checked against actual repository file sizes during release validation.

No real district artwork has been supplied yet; the schema above is illustrative, not a claim that these image files exist or that any district is currently playable.

## Authored NPC navigation graph

A scene may optionally define `navigation: { nodes, edges }`. Every node has a unique `id` and references an existing NPC or place hotspot via `anchor`. Every edge references two different declared node IDs and may set `bidirectional: false` for a one-way traversal. The environment rejects unknown anchors, duplicate IDs/anchors, self-edges and invalid edge references. The renderer then verifies every node resolves to an actual hotspot in the decoded scene. NPC path planning uses breadth-first search over this graph and obtains waypoint coordinates from renderer hotspot bounds; it never guesses positions or draws a substitute route. Scenes without a navigation graph remain valid but NPC navigation reports `navigation-not-authored`.

## Original character artwork intake

Character designs are original intellectual property of the Semester Survival project. The project owner reviews and approves each canonical model reference before it can guide production. Preserve original source exports unchanged under `assets/source/characters/<character-id>/`; record the exact file path, source/creator declaration, rights/permission status, dimensions, byte size and any edits.

A turnaround is a design reference only. It is not an animation atlas and must never be registered as one. Action sheets must preserve the approved identity and pass frame-grid, anatomy, continuity, transparency, timing and in-game scale review. Separate source sheets must be packed into the runtime atlas with exact authored clip metadata. Unapproved or inconsistent art stays out of the runtime manifest.
