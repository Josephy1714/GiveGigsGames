# Asset Manifest

No third-party art, music, fonts or code may be added without redistribution rights and a recorded source.

| Asset group | Source / creator | Licence / permission | Format | Status |
|---|---|---|---|---|
| Existing game code | Existing repository contributors; history audit required | Verify repository terms before reuse | JS/CSS/HTML | Legacy |
| New interface/prototype code | Josephy1714 / project contributors | Confirm in game metadata | HTML/CSS/JS | In progress |
| Character model sheets | Not yet supplied | Must be confirmed | To specify | Not started |
| Background illustrations | Not yet supplied | Must be confirmed | To specify | Not started |
| Audio | Not yet supplied | Must be confirmed | To specify | Not started |

For every final asset record exact path, author/source, licence, original URL, edits, dimensions, compression and byte size. No remote fonts or runtime CDN assets.

## Runtime scene manifest schema

The scene asset pipeline validates and preloads authored local images declared by a version-1 manifest. Each asset needs a unique ID, safe relative path, supported role (`background`, `layer`, `prop`, `character-atlas`), exact pixel dimensions, a maximum byte budget, and author/licence attribution. Remote URLs, absolute paths, traversal paths, duplicate IDs and uncredited assets are rejected.

Each district scene manifest supplied to `environment-runtime.js` must declare a non-empty `requiredAssetIds` array. Every required ID must exist in the asset pipeline manifest and belong to that same district. This prevents a district from borrowing another district's asset to satisfy readiness.

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
    spawnPoints: { default: "room-entry" },
    interactables: {}
  }
};
```

Preloading verifies decoded image dimensions and reports failures explicitly. `environment-runtime.js` awaits this preload and verifies required assets are retrievable before asking the renderer to mount a district. A failed preload or mount does not activate the destination scene. No substitute image is generated. Declared byte budgets must also be checked against actual repository file sizes during release validation.

No real district artwork has been supplied yet; the schema above is illustrative, not a claim that these image files exist or that any district is currently playable.
