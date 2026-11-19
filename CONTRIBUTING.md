# Contributing to GiveGigsGames

GiveGigsGames welcomes playable HTML5 browser games, bug fixes, balance/UX polish, authored walkthroughs, procedural 3D models, audio, tester playbooks, and ideas. All tracked contributions live publicly in this repository and power the public testing arcade at **[games.givegigs.com](https://games.givegigs.com/)**.

New games and changes are reviewed before entering the testing catalog. Every static game package must stay **strictly under 10 MB (10,000,000 bytes)** and work cleanly inside the arcade shell as well as standalone from a downloaded folder.

---

## Ways to contribute

- **Add a new browser game** (`games/<your-slug>/` + [`games/catalog.json`](games/catalog.json))
- **Improve an existing game** (bug fixes, mobile touch polish, gamepad support, audio, performance, accessibility)
- **Write an authored walkthrough** (`games/<slug>/guide.html` via `guideEntrypoint`) or capture featured gameplay screenshots (`games/images/screenshots/`)
- **Contribute procedural Three.js 3D models** in [`models/catalog.js`](models/catalog.js)
- **Add or refine tester playbooks & BotScript rules** in [`tester/engine/playbooks.js`](tester/engine/playbooks.js)
- **Pitch a game idea or report a bug** via [GitHub Issues](https://github.com/mattyjacks/GiveGigsGames/issues/new/choose) (using the [Suggest a game template](.github/ISSUE_TEMPLATE/game-idea.yml))

---

## Prerequisites

- **Editing a plain HTML/CSS/JS game**: Any code editor and modern web browser.
- **Running catalog builds, CI validation checks, and the local bridge/server**: **Node.js 22 or newer** (matches the CI workflow in [`.github/workflows/validate-games.yml`](.github/workflows/validate-games.yml)).
- **Optional**: Python 3 (for `npm run serve` or Windows native Win32 automation via [`scripts/input_sim.py`](scripts/input_sim.py)).

---

## Quick start: adding a new game

### 1. Fork, clone, and branch

1. Fork [GiveGigsGames](https://github.com/mattyjacks/GiveGigsGames) on GitHub and clone your fork locally.
2. Create a topic branch for your game or fix.

### 2. Copy the starter template

Copy [`templates/vanilla-game/`](templates/vanilla-game/) to `games/<your-slug>/`.

- **Slug naming rule**: Your slug must be unique (case-insensitive) and contain only letters, digits, and hyphens (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/i`). Lowercase hyphenated slugs (for example, `moonlit-dash`) are recommended.
- **Keep your folder clean**: Place your HTML, CSS, JavaScript, images, audio, and `game.json` inside `games/<your-slug>/`.

> [!IMPORTANT]
> **Fix the template's back link before running checks:**
> [`templates/vanilla-game/index.html`](templates/vanilla-game/index.html) includes `<a class="home-link" href="../../index.html#all-games" target="_top">← Back to game select</a>`. Because `../../index.html` resolves outside `games/`, [`scripts/check-game-assets.mjs`](scripts/check-game-assets.mjs) will reject it.
>
> Remove that `<a class="home-link" ...>` element and instead include the shared navigation helper right before `</body>`:
>
> ```html
> <script src="../_shared/game-select.js" defer></script>
> ```
>
> [`games/_shared/game-select.js`](games/_shared/game-select.js) passes asset validation, injects the floating **Game select** button (which returns via `postMessage` inside the arcade frame or navigates back to game select when opened standalone), loads [`games/_shared/game-interface.css`](games/_shared/game-interface.css), and loads [`games/_shared/gamepad-adapter.js`](games/_shared/gamepad-adapter.js).

### 3. Build your game & update `game.json`

- Use **relative paths** for all local files (`./game.css`, `./game.js`, `./assets/...`). Do not use root-absolute `/...` paths.
- Update `games/<your-slug>/game.json` (starting from [`templates/vanilla-game/game.json`](templates/vanilla-game/game.json)) with your title, slug, description, controls, third-party credits, and an explicit license.
- **Shared assets**: `games/_shared/`, `games/shared/`, and `games/html/` are centrally maintained. You may reference existing shared vendor libraries (such as `../html/vendor/three-r128.min.js`) via relative paths inside `games/` to stay well under the size cap, but do **not** copy shared directories into your game folder or modify shared files unless coordinated with maintainers.
- **Optional walkthrough & screenshots**:
  - Add `games/<your-slug>/guide.html` for a custom walkthrough embedded on `/ggg/guide/<your-slug>`.
  - Add up to 3 compressed `.jpg` screenshots in `games/images/screenshots/` (for example, `games/images/screenshots/<your-slug>-1.jpg` through `-3.jpg`).

### 4. Register your game in `games/catalog.json`

Add an entry to the `games` array in [`games/catalog.json`](games/catalog.json):

```json
{
  "slug": "your-game-slug",
  "title": "Your Game Title",
  "description": "Describe the objective and core mechanic in one or two clear sentences.",
  "genre": "Arcade",
  "tags": ["Arcade", "Offline-friendly"],
  "emoji": "🎮",
  "status": "preview",
  "inputs": ["touch", "keyboard"],
  "controls": "Arrow keys or WASD to move, Space to jump. On touch devices, tap left/right to move and swipe up to jump.",
  "modes": ["solo"],
  "runtimeType": "static",
  "entrypoint": "your-game-slug/index.html"
}
```

#### Catalog field reference

| Field | Required | Allowed values / notes |
| :--- | :--- | :--- |
| `slug` | Yes | Unique (case-insensitive) identifier matching `/^[a-z0-9]+(?:-[a-z0-9]+)*$/i`. |
| `title` | Yes | Non-empty display title. |
| `description` | Yes | Concise summary shown on catalog cards, info, guide, and roadmap pages. |
| `genre` | Yes | Genre label (e.g., `Action`, `Adventure`, `Arcade`, `Creative`, `Endless Runner`, `Puzzle`, `RPG`, `Racing`, `Rogue-like`, `Shooter`, `Simulation`, `Strategy`). |
| `tags` | Yes | Array of short filterable tags. |
| `emoji` | Yes | Single emoji icon used in the player bar and game cards. |
| `runtimeType` | Yes | Must be `"static"` for contributed games. (`ecosystemic-evolver` is a legacy `"external"` entry, not a template for new games.) |
| `entrypoint` | Yes (`static`) | Relative HTML path inside `games/` matching `/^(?:[\w-]+\/)+[\w-]+\.html$/` (typically `"<slug>/index.html"`). |
| `controls` | Recommended | Human-readable keyboard, mouse, touch, and gamepad instructions displayed in Game Info and Walkthrough fallback views. |
| `inputs` | Recommended | Subset of `["touch", "keyboard", "gamepad"]`. Enables input filtering in the library. |
| `modes` | Recommended | Subset of `["solo", "multiplayer"]`. Enables mode filtering in the library. |
| `status` | Optional | One of `"stable"`, `"preview"`, or `"experimental"`. |
| `guideEntrypoint` | Optional | Relative HTML path inside `games/` matching `/^(?:[\w-]+\/)+[\w-]+\.html$/` (e.g., `"<slug>/guide.html"`). |
| `featuredScreenshots` | Optional | Array of repo-relative paths such as `["games/images/screenshots/<slug>-1.jpg"]`. |
| `featured` / `recommended` | Maintainer-curated | Omit or set to `false` in new PRs. |
| `packageBytes` | Auto-generated | **Never set manually.** Computed automatically into [`games/catalog-data.js`](games/catalog-data.js). |

### 5. Rebuild the offline catalog & run validation checks

```sh
npm run catalog:build
npm run check
```

> [!WARNING]
> **Re-run `npm run catalog:build` after any file change in your game folder.**
> `scripts/build-browser-catalog.mjs` embeds each game folder's total `packageBytes` into [`games/catalog-data.js`](games/catalog-data.js). If you edit, add, or compress files inside `games/<your-slug>/` — even without touching `games/catalog.json` — CI (`npm run check`) will fail with `games/catalog-data.js is stale` until you re-run `npm run catalog:build` and commit the updated file.

### 6. Test locally (arcade views, responsive layout, offline & audits)

1. **Run the full arcade + Local Bridge**:
   ```sh
   npm run tester:bridge
   ```
   Open <http://127.0.0.1:42069/> and verify:
   - Your game appears in search, filters, and launches cleanly at `/ggg/play/<your-slug>`.
   - `/ggg/info/<your-slug>`, `/ggg/guide/<your-slug>`, and `/ggg/roadmap/<your-slug>` display accurate info.
   - Clicking **Game select** (from [`games/_shared/game-select.js`](games/_shared/game-select.js)) returns cleanly to the library.
2. **Test responsive viewports & live audits**:
   - Open `/ggg/test/<your-slug>` in the **Automated Gameplay Tester Studio**.
   - Check the **Preview viewport** presets: **Phone portrait (`390×844`)**, **Phone landscape (`844×390`)**, **Tablet (`768×1024`)**, and **Desktop (`1280×720`)**.
   - Run **Start Auto-Test** (offline heuristic mode works without any API key) and **Run Full Game & Site Audit** on the **Bugs, Audits & Fixer** tab to verify zero console errors, broken assets, or horizontal overflow.
   - Test on a real phone if your game supports `touch`.
3. **Run static source audit & tester self-tests**:
   ```sh
   node scripts/gameplay-tester.mjs --audit <your-slug>
   npm run tester:self-test
   ```
4. **Test standalone offline opening**:
   - Open `games/<your-slug>/index.html` directly from disk (`file://`). If your game uses ES modules or features restricted on `file://`, verify over `npm run tester:bridge` or `npm run serve` and note that requirement in your pull request.

### 7. Open a pull request

[Open a pull request](https://github.com/mattyjacks/GiveGigsGames/compare) and fill out [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md) with:

- What you added or changed
- Keyboard, touch, and gamepad controls (plus any online-only features)
- Screenshots or a short gameplay clip
- Third-party asset/code credits and license notes
- The checks and tests you ran

---

## Automated CI validation rules

Every pull request and push to `main` runs [`.github/workflows/validate-games.yml`](.github/workflows/validate-games.yml), which enforces five checks:

1. **Catalog schema & freshness** (`node scripts/build-browser-catalog.mjs --check`):
   - Unique, valid slugs; allowed `status`, `inputs`, `modes`, and `runtimeType` values; existing `entrypoint` and `guideEntrypoint` files; no symlinks; and an up-to-date [`games/catalog-data.js`](games/catalog-data.js).
2. **Strict 10 MB per-game size limit** (`node scripts/check-game-sizes.mjs` / `npm run check:size`):
   - Every static game folder must be **strictly under 10,000,000 bytes** (exactly `10,000,000` bytes fails).
   - Counts all files recursively inside the game's entrypoint directory and rejects symbolic links.
   - *Tips to stay small*: compress `.jpg`/`.webp`/`.png` assets, synthesize sound effects and music with the Web Audio API or shared music scripts, generate 3D meshes procedurally instead of shipping large binary models, and reuse existing vendor libraries under `games/html/vendor/` rather than duplicating them.
3. **Portable relative entrypoint links** (`node scripts/check-offline-entrypoints.mjs`):
   - Rejects root-absolute `/...` paths in `src`, `href`, `data-src`, CSS `url(...)`, and `location.href` assignments inside static game HTML entrypoints (the optional hosted-only Vercel Web Analytics snippet is exempt).
4. **Local HTML assets resolve inside `games/`** (`node scripts/check-game-assets.mjs`):
   - Verifies that every relative `src`, `href`, `poster`, and `data-src` in each static game's entrypoint exists on disk and does not escape `games/`.
5. **Playwright arcade smoke check** (`node scripts/smoke-arcade.mjs`):
   - Launches headless Chromium against the arcade and verifies catalog search, launching a game, returning via **Back to game select** with restored focus/search state, favorites filtering, game details navigation, and `localStorage` save backup/restore.

---

## Gameplay, storage, security & licensing standards

### Playability & optional services

- Keep the core game **100% playable without an account, API key, or cloud backend**.
- Keep any GiveGigs cloud-save or multiplayer integration strictly optional with a graceful solo/local fallback. Remember that `games.givegigs.com` does not host a cloud-save service.

### Save-manager-friendly `localStorage` keys

The home page includes **Back up or restore game saves**, which exports and imports `localStorage` entries as `.txt` files. Follow two rules so your game integrates cleanly:

- **Include your game's `slug` in your `localStorage` keys** (for example, `my-game:save` or `my-game-highscore`). The save manager matches alphanumeric characters in key names against catalog slugs to label each entry with your game's title.
- **Never prefix a game's key with `arcade:`** — keys starting with `arcade:` (`arcade:favorites`, `arcade:recent`, `arcade:catalog`) are reserved by the arcade shell and are excluded from save export and restore.

### Controls, audio & code hygiene

- Document all supported controls clearly inside the game and in `games/catalog.json` (`inputs` and `controls`).
- Make touch controls ergonomic on small screens (keep interactive buttons at least ~44×44 px and account for viewport safe-area insets).
- Avoid common static-audit hazards checked by `scripts/gameplay-tester.mjs --audit`:
  - Resume `AudioContext` (`ctx.resume()`) after a user gesture rather than assuming autoplay works.
  - Cancel active `requestAnimationFrame` loops if your code calls `location.reload()`.
  - Never hardcode `file:///C:/...` or other local filesystem URIs.
  - Re-initialize canvas context state when resizing `canvas.width` / `canvas.height` on `resize`.

### Privacy, security & asset rights

- **No trackers, hidden requests, or secrets**: Do not include third-party analytics trackers, undocumented telemetry calls, API keys, private tokens, or code that reads data outside your game. Everything tracked in this repository is public.
- **Permission & licensing**: Only commit code, artwork, music, sound effects, and fonts that you created or have permission to redistribute in a public open-source repository.
- **Attribution**: State the license in `game.json`, credit all borrowed assets and libraries, and include any required license text/notices inside your game folder.

---

## Other contributions

### Improving an existing game

1. Make your edits inside `games/<slug>/`.
2. Re-run `npm run catalog:build && npm run check` (remember that `packageBytes` in `games/catalog-data.js` updates whenever file sizes change).
3. Verify the game in `/ggg/play/<slug>` and `/ggg/test/<slug>`, plus static audit:
   ```sh
   node scripts/gameplay-tester.mjs --audit <slug>
   ```

### Adding procedural 3D models (`models/`)

Add a self-contained procedural builder entry to `window.GGG_MODEL_CATALOG` in [`models/catalog.js`](models/catalog.js) with `id`, `name`, `game`, `category`, `tags`, `description`, and `build(THREE)` returning a `THREE.Group`, then verify it renders and copies cleanly at `/models/` (`models/index.html`).

### Adding tester playbooks (`tester/engine/`)

Add or refine per-game controls, goals, boot/autoplay guidance, and `preferredKeys` in [`tester/engine/playbooks.js`](tester/engine/playbooks.js), then verify the tester engines with:

```sh
npm run tester:self-test
```

### Reporting bugs or suggesting games

- Pitch a new game using the [Suggest a game issue form](.github/ISSUE_TEMPLATE/game-idea.yml).
- When reporting a bug, you can use **Draft a bug report** or **Export Markdown Report** inside `/tester/` (`/ggg/test/<slug>`) to include console telemetry, reproduction steps, and viewport info.
