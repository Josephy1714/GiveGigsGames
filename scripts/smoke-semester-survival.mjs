import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch();
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  const baseUrl = process.env.ARCADE_SMOKE_URL || "http://127.0.0.1:4173";
  await page.goto(`${baseUrl}/games/semester-survival/index.html`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const runtime = window.SemesterAdventureRuntimeInstance;
    return runtime && runtime.getState().ready === true;
  }, null, { timeout: 30000 });

  const runtimeState = await page.evaluate(() => {
    const runtime = window.SemesterAdventureRuntimeInstance;
    const state = runtime.getState();
    const canvas = document.querySelector(".ss-adventure-shell__canvas");
    return {
      lifecycle: state.lifecycle,
      district: state.district,
      atlasReady: state.atlasReady,
      canvas: !!canvas,
      canvasWidth: canvas?.width || 0,
      canvasHeight: canvas?.height || 0,
      character: state.player
    };
  });
  assert.equal(runtimeState.lifecycle, "running");
  assert.equal(runtimeState.district, "residence");
  assert.equal(runtimeState.atlasReady, true);
  assert.equal(runtimeState.canvas, true);
  assert.ok(runtimeState.canvasWidth > 0 && runtimeState.canvasHeight > 0);

  const before = await page.evaluate(() => window.SemesterAdventureRuntimeInstance.getState().player.x);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(500);
  await page.keyboard.up("ArrowRight");
  const after = await page.evaluate(() => window.SemesterAdventureRuntimeInstance.getState().player.x);
  assert.ok(after > before, `Jay should move right: before=${before}, after=${after}`);

  await page.keyboard.press("Space");
  await page.waitForTimeout(180);
  const jumpState = await page.evaluate(() => window.SemesterAdventureRuntimeInstance.getState().player);
  assert.ok(jumpState && jumpState.y > 0, "Space should trigger a real jump with positive vertical movement");

  for (const district of ["township", "campus", "city", "residence"]) {
    await page.evaluate(async districtName => {
      await window.SemesterAdventureRuntimeInstance.travelTo(districtName);
    }, district);
    const actual = await page.evaluate(() => window.SemesterAdventureRuntimeInstance.getState().district);
    assert.equal(actual, district, `Expected to enter ${district}`);
  }

  await page.evaluate(() => window.SemesterAdventureRuntimeInstance.openPhone());
  assert.equal(await page.evaluate(() => window.SemesterAdventureRuntimeInstance.getState().phone.open), true);
  await page.evaluate(() => window.SemesterAdventureRuntimeInstance.closePhone());
  await page.evaluate(() => window.SemesterAdventureRuntimeInstance.destroy());
  assert.deepEqual(errors, [], `Browser errors: ${errors.join(" | ")}`);
  console.log("Semester Survival browser smoke passed: Jay booted, moved, jumped, visited all four districts, opened the phone and shut down cleanly.");
} finally {
  await browser.close();
}
