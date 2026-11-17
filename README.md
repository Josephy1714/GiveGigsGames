# GiveGigsGames

An open browser-game framework and full public test library for GiveGigs. The repository root is the site intended for **games.givegigs.com**. It includes every catalog title, including experiments, previews, and games not ready for the curated public catalog at [givegigs.com/games](https://givegigs.com/games/).

> **Build the next game in the arcade.** [Fork GiveGigsGames](https://github.com/mattyjacks/GiveGigsGames), start with the [contributor quick start](CONTRIBUTING.md), and send a pull request. Games must stay under **10 MB** each. New games, fixes, art, music, and ideas are welcome.

## Quick start — play without installing anything

### Desktop

1. Open [GiveGigsGames on GitHub](https://github.com/mattyjacks/GiveGigsGames).
2. Choose **Code → Download ZIP** and extract the download.
3. Open the extracted `index.html` in a browser.
4. Choose a game and click **Open game**. Its local `index.html` launches directly.

### Phone or tablet

1. Open the GitHub repo in your mobile browser and download the repository ZIP.
2. Extract it in the phone's Files app.
3. Tap the extracted `index.html` and choose a game.

The static games are designed to run from the downloaded folder and can be tested offline. Browser support for local files varies: Android browsers commonly open local HTML directly; iOS may require using Safari's Files/share flow. Starship Simulator uses JavaScript modules and some mobile browsers require it to be opened over HTTP instead of `file://`. A few optional features use remote services or browser APIs that need network access. Ecosystemic Evolver is currently hosted on MattyJacks and is online-only from this repo.

No Node.js, build step, account, or cloud save is needed just to play a local static game. Progress is stored in the current browser when supported. **games.givegigs.com is a testing environment: it has no cloud saves or cross-device sync.**

Read the [Terms of Use](terms.html) and [Privacy Policy](privacy.html) for information about game licenses, browser-local progress, and possible game-specific third-party connections. Hosting request logs depend on the provider used for deployment.

If a browser blocks local workers, storage, or file access, run a tiny local web server from the extracted repo folder:

```sh
python -m http.server 4173
```

Then open <http://localhost:4173/>. The searchable tester is at <http://localhost:4173/tester/>.

## Contribute a game

We welcome playable browser games and improvements. Start with [CONTRIBUTING.md](CONTRIBUTING.md), copy [`templates/vanilla-game/`](templates/vanilla-game/), and open a pull request. The template is plain HTML, CSS, and JavaScript so a game can be tested by opening its `index.html` directly.

**Every game package must be under 10 MB (10,000,000 bytes).** A GitHub Actions check enforces the limit on every pull request. Keep game assets inside `games/<slug>/`, add the game to `games/catalog.json`, regenerate the offline catalog, and use relative paths.

Contribute a game: [open a pull request](https://github.com/mattyjacks/GiveGigsGames/compare). Questions or ideas: [open an issue](https://github.com/mattyjacks/GiveGigsGames/issues/new/choose).

## Catalog and local checks

- `games/catalog.json` is the source catalog.
- `games/catalog-data.js` is generated from it so the root page works from `file://` without `fetch`.
- The main library and tester default to a compact list, with a grid toggle, tag search, multi-tag any/all filters, and sorting by title, genre, first tag, or tag count.
- `games/<slug>/` contains game files; `games/html/` and `games/shared/` contain centrally maintained support assets.
- `tester/` is the searchable, iframe-based developer view.
- `backup/mjgames1/` is a local ignored source snapshot and is not published.

After editing the catalog, run:

```sh
node scripts/build-browser-catalog.mjs
node scripts/check-game-sizes.mjs
node scripts/check-offline-entrypoints.mjs
node scripts/check-game-assets.mjs
```

Or run all repository checks with `npm run check` (Node.js 22 or newer). Playing from `index.html` does not require Node or npm.

GiveGigs can sync the same catalog and runtime files into its Next.js app:

```sh
node scripts/sync-to-givegigs.mjs /path/to/GiveGigs/v7
```

Set `NEXT_PUBLIC_GAMES_ORIGIN` in GiveGigs when the runtime is hosted on a separate games origin. Review game code and asset rights before merging: every tracked file here is publicly accessible, including titles that are still in preview.
