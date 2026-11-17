# GiveGigsGames

Browser games shared by GiveGigs and the MattyJacks arcade.

## Public full-library host

The repository root is the landing page intended for `games.givegigs.com`. This host is a public testing environment: it lists every title in `games/catalog.json`, including previews and experimental builds, and `/tester/` launches the current build without filtering by public-release readiness. **Cloud saves and cross-device save sync are not available on this host.** Games that save progress use browser-local storage, which is specific to the browser and host.

`https://givegigs.com/games/` is the curated public catalog. A game can remain absent from that page while still being reachable through the full-library host. Because `games.givegigs.com` is public, anything stored in this repository's tracked `games/` tree should be treated as publicly accessible. Keep secrets and private user data out of the game assets.

## Developer tester

The tester is plain HTML, CSS, and JavaScript. It loads each game's static entry point in an iframe, so no Next.js app or game build is required for ordinary play checks.

From this repository root, run a static HTTP server:

```powershell
python -m http.server 4173
```

Open <http://localhost:4173/> for the intro and full catalog, or <http://localhost:4173/tester/> for the search/filter player. The tester supports direct links such as `http://localhost:4173/tester/?game=gravegain2dA`.

## Game source and hosting

- `games/catalog.json` is the game list and runtime entrypoint map.
- `games/<slug>/` contains the static game payload. `games/shared`, `games/html`, and other shared directories are kept beside the titles because some games use root-relative or sibling assets.
- `backup/mjgames1/` is a local ignored snapshot of MattyJacks' original static game tree. It is not part of the public source tree.
- `scripts/sync-to-givegigs.mjs` copies the static payload and catalog into a checked-out GiveGigs v7 app.

To sync into the local GiveGigs checkout:

```powershell
node scripts/sync-to-givegigs.mjs C:/GitHub5/GiveGigs/v7
```

Keep the tester and hosted game paths on the same static directory layout. Each hosted game page is a GiveGigs wrapper around the corresponding `/games/<entrypoint>` file.

The GiveGigs integration accepts `NEXT_PUBLIC_GAMES_ORIGIN` to serve the static payload from a dedicated game host while keeping page URLs on `givegigs.com`. Configure that origin before accepting untrusted game contributions: the current same-origin fallback supports legacy localStorage saves, so game code must be reviewed before deployment. A separate host keeps game scripts away from GiveGigs account cookies and app storage.

## Current catalog caveat

The MattyJacks catalog has one React-hosted title, Ecosystemic Evolver, whose source is outside the static game tree. Its current catalog record links to the existing MattyJacks game page. The remaining 39 titles have local static entrypoints. Move that React game into the static source tree before claiming the whole catalog runs offline from this repository.

Before making this repository public, review per-game ownership and third-party asset licenses. The backup is ignored so it cannot be included accidentally. Once hosted, all tracked files under `games/` and every title linked from the landing page will be publicly reachable, regardless of readiness on GiveGigs.com.
