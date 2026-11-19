# Testing and Release

## Repository checks
Run:
- node scripts/build-browser-catalog.mjs
- node scripts/check-game-sizes.mjs
- node scripts/check-offline-entrypoints.mjs
- node scripts/check-game-assets.mjs

## Gameplay QA
First launch, continue, reset and corrupted-save recovery; keyboard movement/focus/pause/interactions; touch gestures; district navigation; dialogue and activities; consequence feedback; semester progression; save persistence; audio mute/autoplay; reduced motion and narrow-screen layout.

## Performance and package
Folder strictly below 10,000,000 bytes. No remote scripts, fonts, images, audio or fetch calls. No console errors or unhandled rejections. Stable updates during tab switching and large frame gaps. Verify desktop Chromium and mobile Chromium.

## Release checklist
- [ ] Docs match implemented behavior.
- [ ] All visible controls work.
- [ ] No placeholder content presented as finished.
- [ ] Asset manifest and credits complete.
- [ ] Metadata/catalogue match actual genre.
- [ ] Offline and package-size checks pass.
- [ ] PR includes controls, screenshots/clip and tests performed.

## NPC navigation acceptance

- Every navigation node resolves to an authored hotspot in the mounted scene.
- Every edge references valid, distinct nodes; directed edges remain directed.
- Route planner returns a shortest path through authored edges and never invents a shortcut.
- Disconnected graphs and missing graph/anchors return explicit unavailable states.
- Offscreen NPCs never receive fabricated local positions.
- No NPC is marked visually ready or movement ready until production artwork, actor controller integration, collision/path review and in-game animation QA are complete.

## Collision and contact acceptance

- Invalid, duplicate or unsupported collider definitions fail closed.
- High-speed movement cannot pass through authored static walls.
- Circle and segment contacts resolve without tunnelling; wall tangents remain traversable.
- Contact enter/impact/exit events carry the authored material/effect and finite impact position/intensity.
- Spawn points and narrow routes are reviewed against collider clearance.
- Collision geometry is overlaid against final commissioned scene artwork; no geometry is accepted solely from guessed background-image bounds.
- A scene with no colliders is not described as collision-complete.
