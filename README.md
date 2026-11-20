# GiveGigsGames

An open HTML5 browser-game framework, arcade shell, procedural 3D model library, and automated gameplay testing suite powering **[games.givegigs.com](https://games.givegigs.com/)**.

This repository hosts the **full public testing library** — released games, works in progress, experiments, and previews — separate from the curated catalog at [givegigs.com/games](https://givegigs.com/games/).

> **Build the next game in the arcade.** [Fork GiveGigsGames](https://github.com/mattyjacks/GiveGigsGames), follow [CONTRIBUTING.md](CONTRIBUTING.md), keep every game strictly under **10 MB**, and [open a pull request](https://github.com/mattyjacks/GiveGigsGames/compare). New games, bug fixes, walkthroughs, 3D models, audio, and ideas are welcome.

---

## Quick start — play online, locally, or offline

### 1. Play online right now

Open **[games.givegigs.com](https://games.givegigs.com/)** in any desktop or mobile browser. No account, installation, or build step is required.

### 2. Run the full arcade locally (recommended)

For full `/ggg/*` routes, the **Shared 3D Model Library** (`/models/`), and the **Automated Gameplay Tester & Local Companion Bridge** (`/tester/`), clone or download the repository and run (Node.js 22+):

```sh
npm run tester:bridge
```

Then open <http://127.0.0.1:42069/>. This local server mirrors all hosted `/ggg/*` route rewrites from [`vercel.json`](vercel.json) and enables the Tester Studio's Local Companion Bridge.

If you do not have Node.js installed and only want a static file server, use Python 3:

```sh
python -m http.server 4173
```

Then open <http://localhost:4173/>. On a plain static server, direct files (`/games/<slug>/index.html`, `/tester/`, `/models/`) and query-parameter URLs (`play.html?game=<slug>`, `game.html?game=<slug>`, `ggg-guide.html?game=<slug>`, `roadmap.html?game=<slug>`) work directly, while pretty `/ggg/*` paths require `npm run tester:bridge` or Vercel.

### 3. Play individual games offline (desktop & mobile)

Static games are built with portable relative links so they can run directly from a downloaded copy:

1. Open [GiveGigsGames on GitHub](https://github.com/mattyjacks/GiveGigsGames) and choose **Code → Download ZIP** (or pull the repo).
2. Extract the archive on your computer, Android device, or iPhone/iPad (using the Files app).
3. Open a static game's entrypoint directly — for example, `games/platform-wars/index.html` or `games/gravegain2dD/index.html`.

**Offline & platform caveats:**

- **Arcade shell pages** (`index.html`, `play.html`, `game.html`, `ggg-guide.html`, `roadmap.html`, `models/index.html`, `tester/index.html`) use root-absolute `/...` paths designed for HTTP hosting (`npm run tester:bridge`, `npm run serve`, or Vercel) rather than `file://`.
- **Mobile `file://` support varies**: Android browsers commonly open local `.html` files directly from the Files app; iOS/iPadOS may restrict local file execution and require Safari's share/open flow or a local HTTP server.
- **ES modules & browser APIs**: Titles that use JavaScript ES modules (such as Starship Simulator at [`games/spaceships/index.html`](games/spaceships/index.html)) or browser features blocked on `file://` (such as storage or workers in strict browsers) should be opened over HTTP via `npm run tester:bridge` or `python -m http.server 4173`.
- **Online-only entries & features**: `ecosystemic-evolver` is externally hosted (`https://mattyjacks.com/games/ecosystemic-evolver`) and requires an internet connection, as do optional multiplayer or third-party features inside specific games.

---

## Arcade features & routes

The hosted Vercel deployment ([`vercel.json`](vercel.json)) and `npm run tester:bridge` expose clear routes for every catalog entry, alongside dedicated tools for browsing 3D assets and testing builds:

| Hosted / Bridge Route | Local Static Equivalent | Purpose |
| :--- | :--- | :--- |
| `/ggg/` (and `/`) | `index.html` | Full searchable game library and save backup/restore manager. |
| `/ggg/play/<slug>` | `play.html?game=<slug>` | Framed game player with Game Info modal, controls summary, fullscreen toggle, and links to Guide, Roadmap, and direct launch. |
| `/ggg/test/<slug>` | `tester/index.html?game=<slug>` | Automated Gameplay Tester & AI Debugger Studio with responsive viewport presets. |
| `/ggg/info/<slug>` | `game.html?game=<slug>` | Game details, runtime requirements, controls, and featured gameplay screenshots. |
| `/ggg/guide/<slug>` | `ggg-guide.html?game=<slug>` | Walkthrough page — embeds the game's authored `guideEntrypoint` when available, or displays a generated starter guide. |
| `/ggg/roadmap/<slug>` | `roadmap.html?game=<slug>` | Living improvement ideas generated from the game's catalog profile (genre, inputs, modes, tags). |
| `/models/` | `models/index.html` | **Shared 3D Model Library** for inspecting and copying procedural Three.js assets. |
| `/tester/` | `tester/index.html` | Standalone Automated Gameplay Tester Studio (catalog games, custom URLs, screen capture, native windows). |

For example, `platform-wars` resolves at `/ggg/play/platform-wars`, `/ggg/test/platform-wars`, `/ggg/info/platform-wars`, `/ggg/guide/platform-wars`, and `/ggg/roadmap/platform-wars`.

### Catalog search, filtering & sorting

The main library (`index.html`) defaults to a **Grid** layout (10 games per page with **Show 10 more** and **Show all** controls) and includes a **List** toggle, plus:

- **Typo-tolerant search** across game titles, genres, descriptions, and tags.
- **Sort options**: Featured first, File size · largest first, Title A–Z, Genre A–Z, Tag A–Z, Most tags, and Fewest tags.
- **Collection filter**: All games, Favorites, Recently played, and Downloadable browser games (`runtimeType: "static"`).
- **Input & mode filters**: Filter by `touch`, `keyboard`, or `gamepad`, and by `solo` or `multiplayer`.
- **Multi-tag picker**: Search tags and match **any** or **all** selected tags.

### Shared 3D Model Library (`/models/`)

Open [`models/index.html`](models/index.html) (or `/models/` when served) to browse procedural Three.js models collected from across GiveGigsGames — characters, enemies, weapons, spaceships, worlds, and 4D/abstract geometry:

- Search and filter by **game** or **category**.
- Click any model to open the interactive 3D inspector (**Auto-Rotate**, **Wireframe**, **Reset View**, and an **Animation** selector for rigged models).
- Copy the standalone `build(THREE)` function directly into your own game or project.

### Local saves, backup & restore

**`games.givegigs.com` is a public testing environment: it has no user accounts, cloud saves, or cross-device sync.** Progress is saved in the current browser's `localStorage` and is scoped to that browser origin.

On the home page under **Back up or restore game saves**:

- Download individual `localStorage` entries as structured `.txt` files (`givegigsgames-save` format), or click **Download all saves** to export `givegigsgames-backup.txt` (`givegigsgames-backup` format).
- Upload saved `.txt` or `.json` files later to restore them in the current browser through an interactive confirmation dialog (entries matching existing keys remain unchecked by default so you do not overwrite progress accidentally). Reload the game after restoring.

### Universal gamepad support

[`games/_shared/gamepad-adapter.js`](games/_shared/gamepad-adapter.js) is wired into the arcade shell and into static games (loaded automatically via [`games/_shared/game-select.js`](games/_shared/game-select.js)), mapping standard controller sticks, D-pad, buttons, and cursor emulation to keyboard and pointer events.

---

## Automated Gameplay Tester & AI Debugger Studio (`/tester/`)

Open `/tester/` (or `/ggg/test/<slug>`) on the web or locally to playtest and debug any GiveGigsGames title, any arbitrary web game URL, or any desktop game window:

- **100% offline — zero API keys required**: Run deterministic tests using per-game playbooks, reflex drivers, **GiveGigs BotScript** JSON rules, and DOM/canvas heuristics.
- **Bring Your Own API Key (BYOK)**: Connect **OpenRouter**, **OpenAI**, **Google Gemini**, **DeepSeek**, any **Custom OpenAI-compatible** endpoint, or local **Ollama / LM Studio**. API keys stay in your browser (`sessionStorage` or optional `localStorage`) and are sent directly to your chosen provider.
- **Multiple target modes**:
  1. **Catalog / Web Game (Iframe)** with viewport presets (`390×844` phone portrait, `844×390` phone landscape, `768×1024` tablet, `1280×720` desktop) and a live bot cursor & heatmap overlay.
  2. **Custom Web Game URL** for any `http://` or `https://` game.
  3. **Screen / Window Capture** (`getDisplayMedia`) to inspect and test any external browser tab or desktop window visually.
  4. **Local Native Bridge** (`npm run tester:bridge` + [`scripts/input_sim.py`](scripts/input_sim.py) on Windows) for Win32 desktop game input, window screenshots, and static source-code auditing.
- **Five Studio panels**:
  - **Auto-Tester & API Key**: Target/driver controls, foveated vision (640×360 overview + detail crops), adaptive tick timing, live reasoning, and console log.
  - **Vision & Timeline**: Frame scrubber with captured overview frames and detail crops.
  - **Bugs, Audits & Fixer**: Automated live DOM/WebGL/asset/overflow audit, bridge static source audit, AI fix suggestions, ready-to-paste **AI Mega-Prompt** generator, and Markdown/JSON session export.
  - **Replays, BotScript & State**: Record/replay/export/import action sequences, save/restore `localStorage` checkpoints, and edit deterministic BotScript presets.
  - **25 AI QA Plays**: Curated QA and creative analysis prompts with BYOK or offline fallback.

### CLI & Bridge commands

```sh
npm run tester:bridge                                           # Serve arcade + /ggg/* routes + Local Bridge on http://127.0.0.1:42069
npm run tester:self-test                                        # Run unit/integration checks on tester engines
node scripts/gameplay-tester.mjs --game gravegain2dD --steps 8  # Run headless Playwright gameplay test on a catalog game
node scripts/gameplay-tester.mjs --url https://example.com/game --steps 8
node scripts/gameplay-tester.mjs --audit gravegain2dD           # Run static source-code audit on a local game folder
node scripts/gameplay-tester.mjs --native "Window Title" --steps 8
```

---

## Repository layout

| Path | Description |
| :--- | :--- |
| [`games/catalog.json`](games/catalog.json) | Source-of-truth game catalog (slugs, metadata, tags, inputs, modes, entrypoints, guides, screenshots). |
| [`games/catalog-data.js`](games/catalog-data.js) | Auto-generated JS catalog (including computed `packageBytes`) so the arcade loads without `fetch`. |
| `games/<slug>/` | Self-contained static game folders (each strictly under 10,000,000 bytes). |
| `games/_shared/` | Centrally maintained arcade UI bridge ([`game-select.js`](games/_shared/game-select.js), [`game-interface.css`](games/_shared/game-interface.css), [`gamepad-adapter.js`](games/_shared/gamepad-adapter.js)). |
| `games/shared/` & `games/html/` | Centrally maintained shared game runtimes, audio engines, UI helpers, and vendor libraries (such as Three.js). |
| `games/images/screenshots/` | Featured gameplay screenshots referenced by `featuredScreenshots`. |
| [`models/`](models/index.html) | Shared 3D Model Library UI and procedural Three.js model catalog ([`models/catalog.js`](models/catalog.js)). |
| [`templates/vanilla-game/`](templates/vanilla-game/) | Minimal plain HTML/CSS/JS starter template for new games. |
| [`tester/`](tester/index.html) | Automated Gameplay Tester & AI Debugger Studio frontend and `tester/engine/` modules. |
| `scripts/` | Catalog generator, CI validation checks, Playwright smoke test, gameplay tester CLI/bridge, and GiveGigs sync script. |
| [`vercel.json`](vercel.json) | Redirect and rewrite rules for `/ggg/*` routes. |
| `backup/mjgames1/` | Gitignored local snapshot directory (not tracked or published). |

---

## Development scripts & syncing to GiveGigs

Tooling requires **Node.js 22+** (Python 3 is optional for `npm run serve` and native Win32 bridge input).

```sh
npm run catalog:build   # Regenerate games/catalog-data.js from games/catalog.json
npm run check           # Verify catalog freshness + size limits + offline relative paths & assets
npm run check:size      # Check every static game folder is strictly under 10,000,000 bytes
npm run check:offline   # Check portable relative links and local HTML asset resolution
npm run test:mobile     # Open catalog play routes at phone width and exercise selected touch controls
npm run serve           # Start a basic Python static server on port 4173
```

The smoke suite uses Playwright. Set `ARCADE_BROWSER` to `firefox` or `webkit` to test another engine, `ARCADE_SMOKE_ORIENTATION=landscape` for a shorter phone viewport, `ARCADE_SMOKE_INPUT=desktop` for mouse and keyboard, or `ARCADE_SMOKE_GAMES` to a comma-separated list of game slugs for a focused run.

### Syncing to the GiveGigs Next.js app

GiveGigs can mirror `games/` and `games/catalog.json` directly into its Next.js repository (`public/games/` and `src/lib/games-catalog.generated.json`) using [`scripts/sync-to-givegigs.mjs`](scripts/sync-to-givegigs.mjs):

```sh
node scripts/sync-to-givegigs.mjs /path/to/GiveGigs/v7
```

Set `NEXT_PUBLIC_GAMES_ORIGIN` in GiveGigs when hosting the game runtime on a separate origin.

---

## Contributing, privacy, analytics & licensing

- **Contribute**: Read [CONTRIBUTING.md](CONTRIBUTING.md), copy [`templates/vanilla-game/`](templates/vanilla-game/), and [open a pull request](https://github.com/mattyjacks/GiveGigsGames/compare). Have a pitch or bug? [Open an issue](https://github.com/mattyjacks/GiveGigsGames/issues/new/choose).
- **Legal & Privacy**: Review the [Terms of Use](terms.html) and [Privacy Policy](privacy.html) for details on per-game licenses, browser-local storage, and third-party requests.
- **Analytics**: Vercel Web Analytics is wired into the arcade HTML pages and activates only on hosted HTTP/HTTPS deployments with Analytics enabled in Vercel (`file://` and `localhost`/`127.0.0.1` sessions are excluded).
- **Public visibility**: Every tracked file in this repository is publicly readable, including previews and experiments. Review all code, third-party assets, and license notices before merging.
