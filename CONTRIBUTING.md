# Contributing a game

GiveGigsGames welcomes small, playable browser games and improvements to existing titles. New games are reviewed before they enter the full public testing catalog.

## Quick start

1. Fork [GiveGigsGames](https://github.com/mattyjacks/GiveGigsGames) and clone your fork, or download the repository ZIP.
2. Copy `templates/vanilla-game/` to `games/<your-game-slug>/`.
3. Edit `index.html`, `game.css`, and `game.js`. Keep asset paths relative to the game folder.
4. Add a catalog entry to `games/catalog.json` with a unique lowercase slug, title, description, genre, emoji, tags, and `entrypoint` such as `your-game-slug/index.html`.
5. Build the local catalog and check the size and offline paths:

   ```sh
   node scripts/build-browser-catalog.mjs
   node scripts/check-game-sizes.mjs
   node scripts/check-offline-entrypoints.mjs
   node scripts/check-game-assets.mjs
   ```

6. Open the repository's `index.html` directly and launch your game. Also test on a phone and in the browser tester at `tester/index.html`.
7. Open a pull request with a short description, controls, screenshots or a short clip, and the tests you performed.

## The 10 MB limit

Every game package must be **strictly under 10 MB (10,000,000 bytes)**. The size check counts all files inside that game's folder, including source, bundled code, fonts, images, audio, and vendor libraries. A package at exactly 10,000,000 bytes fails. Prefer compressed images and audio, and avoid duplicate libraries. Shared platform files under `games/html/` and `games/shared/` are maintained centrally; do not copy them into a game folder.

The pull-request workflow enforces this limit and checks that each catalog entry has a valid local entrypoint. Ecosystemic Evolver is currently an external React-hosted entry and is not a template for adding external games.

## Offline and phone testing

The root `index.html` and the vanilla starter use local files and relative links. To test from GitHub on desktop or phone, download the repository ZIP, extract it, and open `index.html`. Android browsers commonly open the page from the Files app. On iPhone or iPad, save and extract the ZIP in Files, then use Safari's share/open flow if available.

Local-file behavior varies by browser. Games that use cloud APIs, remote services, or browser features restricted on `file://` need an internet connection or a local HTTP server. The `games.givegigs.com` tester does not provide cloud saves; local progress stays in that browser. Do not include secrets or private data in a contribution.

## Contribution requirements

- Include the runnable `index.html` and keep all required assets in the game folder or an existing shared directory.
- Keep the game playable without an account, API key, or cloud service.
- Use relative paths for game assets. Do not use root-absolute `/games/...` paths.
- Include touch and keyboard instructions when those inputs apply.
- Credit artwork, music, fonts, code, and other borrowed material. Only contribute assets you have permission to redistribute.
- State the license for the game and its assets in `game.json` and include required notices.
- Do not add trackers, hidden network requests, secrets, or code that reads data outside the game.
- Keep GiveGigs cloud saves optional. The public test host has no cloud-save service.

Questions or a game idea? Open a GitHub issue. For code, submit a pull request from your fork.
