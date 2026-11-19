# Jay source artwork intake

All files below are preserved as uploaded under `assets/source/characters/jay/`. The original file extensions are retained. This inventory confirms repository presence only; it does not claim that every sheet has passed visual inspection or is approved for runtime use.

## Canonical reference

| File | Known role | Status |
|---|---|---|
| `1795073501939.jpg` | Four-view Jay turnaround | Project-owner approved design reference; not an animation sheet |

## Action-sheet candidates

The following files are part of the first animation-source intake. Their exact action labels and frame layouts must be confirmed by inspecting the images; filenames alone are not reliable evidence.

- `1795074192816.jpg`
- `1795074517333.jpg`
- `1795074841200.jpg`
- `Meta_AI_sprint_20261119_110406.jpg`
- `Meta_AI_916811181_1450185383862546_3331141356748851519_n_20261119_111431.webp`
- `Meta_AI_916882035_28451130907895002_8609570660650290104_n_20261119_115527.webp`
- `Meta_AI_916882081_994725666517201_3357036583534970929_n_20261119_120922.webp`
- `Meta_AI_916882119_2702665886828845_97200770314772330_n_20261119_112422.webp`
- `Meta_AI_916951766_1841479800241068_9219361324369617113_n_20261119_110911.webp`
- `Meta_AI_916952132_1143042368122950_6500628437492435153_n_20261119_112204.webp`
- `Meta_AI_916953425_2325867808197235_9058160883401323934_n_20261119_121150.webp`

## Intake facts and constraints

- Repository presence is confirmed for the 11 candidate action-sheet files and the turnaround.
- Source formats include JPEG and WebP. Do not relabel or rename file extensions without actually converting the bytes.
- The generator may return a flattened image with a white background rather than an alpha channel. The white background is not part of the in-game character or environment.
- No source dimensions, frame counts, frame-cell coordinates, FPS or playback modes are recorded yet. Measure them from the actual images; do not guess.
- The white matte must be removed in a subject-aware way. Jay's warm-white T-shirt and other pale details must remain intact. A global white chroma-key would destroy character pixels and is prohibited.
- Keep originals immutable. Derivatives belong in a separate processed/runtime directory and must be traceable to their source file.
- A source image is not a runtime atlas. Only visually reviewed, approved, correctly segmented and tested frames may be packed into the atlas.
- The runtime currently requires authored clips for idle, walk, jog, sprint, jump phases, landing, slide and dodge. Additional clips such as phone use, greeting, sit/stand, interaction, study and rest should be added only when their source sheets pass review and their gameplay states are wired.

## Next production steps

1. Inspect every source image at full resolution and assign a verified action label.
2. Record pixel dimensions, frame grid, frame count and any anomalies.
3. Create subject-preserving transparent derivatives; inspect edges and white clothing at 100%.
4. Pack a runtime atlas with consistent frame cells and stable pivots.
5. Write a machine-readable clip manifest with exact rectangles, FPS, playback and event markers.
6. Run manifest validation and render Jay in a test scene before wiring the atlas into the live game.
