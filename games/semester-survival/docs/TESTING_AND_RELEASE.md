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
