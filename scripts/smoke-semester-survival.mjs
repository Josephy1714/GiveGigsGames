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

  assert.equal(await page.locator("[data-ss-play]").count(), 1, "A visible start screen should be mounted");
  assert.equal(await page.locator("[data-ss-fullscreen]").count(), 1, "A fullscreen control should be mounted");
  assert.equal(await page.locator("[data-ss-play-fullscreen]").count(), 1, "A fullscreen start option should be mounted");
  await page.locator("[data-ss-play]").click();
  await page.locator("[data-ss-fullscreen]").click();
  const immersive = await page.evaluate(() => Boolean(document.fullscreenElement) || document.getElementById("semester-survival-adventure").classList.contains("ss-game-immersive-fallback"));
  assert.ok(immersive, "Fullscreen control should enter fullscreen or the immersive fallback");
  await page.locator("[data-ss-fullscreen]").click();

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

  for (const district of ["township", "campus", "city", "township", "residence"]) {
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

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  mobile.on("pageerror", error => errors.push(error.message));
  await mobile.goto(`${baseUrl}/games/semester-survival/index.html`, { waitUntil: "domcontentloaded" });
  await mobile.waitForFunction(() => {
    const runtime = window.SemesterAdventureRuntimeInstance;
    return runtime && runtime.getState().ready === true;
  }, null, { timeout: 30000 });
  assert.equal(await mobile.locator("[data-ss-play]").count(), 1, "Mobile start screen should be mounted");
  assert.equal(await mobile.locator("[data-ss-action=right]").count(), 1, "Mobile right control should be mounted");
  await mobile.locator("[data-ss-play]").click();
  const mobileBefore = await mobile.evaluate(() => window.SemesterAdventureRuntimeInstance.getState().player.x);
  const rightButton = await mobile.locator("[data-ss-action=right]").boundingBox();
  await mobile.mouse.move(rightButton.x + rightButton.width / 2, rightButton.y + rightButton.height / 2);
  await mobile.mouse.down();
  await mobile.waitForTimeout(350);
  await mobile.mouse.up();
  const heldButtonAfter = await mobile.evaluate(() => window.SemesterAdventureRuntimeInstance.getState().player.x);
  assert.ok(heldButtonAfter > mobileBefore, "Holding the on-screen right control should move Jay");
  const swipeBefore = await mobile.evaluate(() => window.SemesterAdventureRuntimeInstance.getState().player.x);
  await mobile.evaluate(() => {
    const canvas = document.querySelector(".ss-adventure-shell__canvas");
    const options = { bubbles: true, pointerId: 7, pointerType: "touch", isPrimary: true };
    canvas.dispatchEvent(new PointerEvent("pointerdown", { ...options, clientX: 90, clientY: 300 }));
    canvas.dispatchEvent(new PointerEvent("pointerup", { ...options, clientX: 190, clientY: 300 }));
  });
  await mobile.waitForTimeout(450);
  const mobileAfter = await mobile.evaluate(() => window.SemesterAdventureRuntimeInstance.getState().player.x);
  assert.ok(mobileAfter > swipeBefore, "Horizontal touch swipe should move Jay");
  await mobile.locator("[data-ss-action=jump]").click();
  await mobile.waitForTimeout(180);
  const buttonJump = await mobile.evaluate(() => window.SemesterAdventureRuntimeInstance.getState().player.y);
  assert.ok(buttonJump > 0, "The on-screen jump control should trigger a jump");
  await mobile.waitForTimeout(900);
  await mobile.evaluate(() => {
    const canvas = document.querySelector(".ss-adventure-shell__canvas");
    const options = { bubbles: true, pointerId: 8, pointerType: "touch", isPrimary: true };
    canvas.dispatchEvent(new PointerEvent("pointerdown", { ...options, clientX: 190, clientY: 330 }));
    canvas.dispatchEvent(new PointerEvent("pointerup", { ...options, clientX: 190, clientY: 230 }));
  });
  await mobile.waitForTimeout(180);
  const mobileJump = await mobile.evaluate(() => window.SemesterAdventureRuntimeInstance.getState().player.y);
  assert.ok(mobileJump > 0, "Upward touch swipe should trigger a real jump");
  await mobile.evaluate(() => window.SemesterAdventureRuntimeInstance.destroy());
  await mobile.close();

  assert.deepEqual(errors, [], `Browser errors: ${errors.join(" | ")}`);
  console.log("Semester Survival browser smoke passed: Jay booted, moved, jumped, visited all four districts, opened the phone and shut down cleanly.");
} finally {
  await browser.close();
}
