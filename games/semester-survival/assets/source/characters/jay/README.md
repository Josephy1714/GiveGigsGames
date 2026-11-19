# Jay — original character artwork

Jay is the original protagonist of **GiveGigsGames: Semester Survival**. The project owner has approved the character's canonical visual identity and four-view turnaround.

## Approved design reference

- File: `1795073501939.jpg`
- Views: front, three-quarter, side profile and rear
- Design: deep brown skin, short textured natural curls, deep-blue overshirt, warm-white T-shirt, dark trousers, sneakers, backpack and wristwatch
- Role: canonical model reference only; **not** a runtime sprite sheet or animation atlas

Preserve this source file unchanged. All future Jay expressions, poses, costumes and animation frames must maintain the approved identity, proportions, outfit construction and accessories unless a separately approved design update is made.

## Animation source intake

The project owner has uploaded a first batch of separate Jay action-sheet source images. Their auto-generated filenames are preserved. See [SOURCE_INTAKE.md](SOURCE_INTAKE.md) for the verified action mapping, measured dimensions and byte-signature audit. Important: seven files carry a `.webp` filename suffix but their actual bytes are JPEG/JFIF; treat them as JPEG when decoding and never trust the suffix alone.

Gemini's current export path may produce a flattened JPEG or WebP with a solid white background rather than a transparent PNG, and may assign its own filename. That is acceptable for **source intake only**. Do not rename an extension to pretend the file is PNG, do not overwrite the originals, and do not put a white rectangle into the game.

The white source background must be removed with a subject-aware matte that preserves Jay's white T-shirt, shoe highlights and other pale details. A simple white colour-key is not acceptable. If a clean matte cannot be achieved without damaging the character, keep the source out of the runtime atlas and request a corrected export.

## Runtime integration gates

An uploaded sheet is not automatically an approved animation clip. Before runtime use:

1. Visually inspect the actual file and classify its action.
2. Confirm the frame grid, frame count, consistent cell size, ground line, facing and character continuity.
3. Check anatomy and motion continuity; reject duplicated, malformed or inconsistent frames.
4. Produce a clean transparent working copy while preserving the original source.
5. Pack approved frames into the runtime atlas and author exact crop rectangles, pivots, FPS, playback mode and state mapping.
6. Verify the atlas against the animation manifest and test it in the 2.5D scene at gameplay scale.

No guessed frame coordinates, synthetic replacement poses, procedural people or unreviewed source images may enter the production manifest. Missing clips must remain visible as integration errors.

## Working branch

Use `semester-survival-premium-rebuild`. Do not upload this work to `main` or merge the replacement game until the project owner explicitly approves the completed build.
