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

Example shape (illustrative only; it does not claim these files exist):

```js
{
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
}
```

Preloading verifies decoded image dimensions and reports failures explicitly. A scene is not ready when any required image fails; no substitute image is generated. Declared byte budgets must also be checked against actual repository file sizes during release validation.
