# Modular runner architecture

Restored original production source, Jay artwork/runtime atlas, animation manifest, scene assets, technical documentation, asset tools and automated tests into the new runner using Git blob references. The original `semester-survival` folder is unchanged.

- `assets/`: original Jay artwork, atlas, animation metadata and scene assets.
- `src/core/`: lifecycle, state, input and game foundations.
- `src/player/`: character controller/runtime.
- `src/animation/`: Jay animation runtime and manifest.
- `src/physics/`: collision/contact systems.
- `src/world/`: renderer, environments, districts, weather and NPC systems.
- `src/obstacles/`: reserved for runner obstacle adapters.
- `src/powerups/`: reserved for runner pickup adapters.
- `src/progression/`: campaign, services and life systems.
- `src/ui/`: campaign, mobile, interaction and phone interfaces.
- `src/audio/`: sound runtime.
- `src/save/`: reserved for persistence adapter.
- `tests/`: original automated system tests.
- `src/docs/`, `src/tools/`: original specifications and asset pipeline.

**Important:** Imported modules are preserved source, not yet a fully wired replacement runtime. The current `index.html` remains the runner entrypoint while compatibility adapters and end-to-end gameplay tests are implemented. The original atlas metadata references a staging filename; integration must verify and correct that path before use.
