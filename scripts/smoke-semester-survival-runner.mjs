import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch();
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(10000);
  page.on("pageerror", error => errors.push(error.message));
  const baseUrl = process.env.ARCADE_SMOKE_URL || "http://127.0.0.1:4173";
  await page.goto(`${baseUrl}/games/semester-survival-runner/index.html?smoke=1`, { waitUntil: "domcontentloaded" });
  await page.locator("#home.active").waitFor();
  await page.waitForFunction(() => typeof window.__runnerSmoke?.endRun === "function", null, { timeout: 5000 }).catch(() => { throw new Error("Runner smoke hook did not initialize: " + errors.join(" | ")); });
  await page.waitForFunction(() => {
    const image = document.querySelector("#jay-home");
    return image && image.complete && image.naturalWidth > 0;
  }, { timeout: 10000 });
  await page.locator("#play").click();
  await page.locator("#game.open").waitFor();
  await page.locator("#world").waitFor({ state: "visible" });

  // Verify obstacle height maps to the correct evasive action.
  const probe = (action, movement = {}) => page.evaluate(
    ({ action, movement }) => window.__runnerSmoke.probeObstacle({ action, ...movement }),
    { action, movement }
  );
  assert.equal((await probe("jump", { jump: 0 })).hit, true, "Failing to jump should collide with a low obstacle");
  assert.equal((await probe("jump", { jump: 1 })).hit, false, "A successful jump should clear a low obstacle");
  assert.equal((await probe("slide", { slide: 0 })).hit, true, "Failing to slide should collide with a high obstacle");
  assert.equal((await probe("slide", { slide: 0.9 })).hit, false, "A successful slide should clear a high obstacle");
  assert.equal((await probe("lane", { slide: 0.9 })).hit, true, "Sliding should not clear a full-height obstacle");
  assert.equal((await probe("lane", { lane: 0, obstacleLane: 1 })).hit, false, "Changing lanes should avoid a full-height obstacle");
  const pickup = movement => page.evaluate(movement => window.__runnerSmoke.probePowerup(movement), movement);
  assert.equal((await pickup({ lane: 1, powerupLane: 1 })).collected, 1, "A same-lane power-up should be collected");
  assert.equal((await pickup({ lane: 1, powerupLane: 2 })).collected, 0, "An adjacent power-up should not be collected without the magnet upgrade");
  assert.equal((await pickup({ lane: 1, powerupLane: 2, magnet: 1 })).collected, 1, "The magnet upgrade should collect from an adjacent lane");
  const boss = await page.evaluate(() => window.__runnerSmoke.probeBoss());
  assert.equal(boss.active, true, "Reaching the boss threshold should start a boss encounter");
  assert.equal(boss.queued, 3, "Each semester boss should launch a three-wave attack pattern");
  assert.ok(boss.label, "The boss encounter should identify the current semester challenge");

  await page.locator("#fullscreen").click();
  await page.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 5000 });
  assert.equal(await page.evaluate(() => document.fullscreenElement?.id), "game", "Fullscreen should expand the game overlay");
  await page.locator("#fullscreen").click();
  await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 5000 });
  const initialLane = await page.evaluate(() => window.__runnerSmoke.state().lane);
  await page.keyboard.press("ArrowLeft");
  assert.equal(await page.evaluate(() => window.__runnerSmoke.state().lane), Math.max(0, initialLane - 1), "Left input should change lanes");
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.evaluate(() => window.__runnerSmoke.state().lane), initialLane, "Right input should restore the lane");

  // Exercise the actual touch handlers on the mobile-sized browser context.
  const swipe = async (x1, y1, x2, y2) => page.evaluate(({ x1, y1, x2, y2 }) => {
    const surface = document.querySelector("#game");
    const start = new Touch({ identifier: 41, target: surface, clientX: x1, clientY: y1 });
    const end = new Touch({ identifier: 41, target: surface, clientX: x2, clientY: y2 });
    surface.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, changedTouches: [start], touches: [start] }));
    surface.dispatchEvent(new TouchEvent("touchend", { bubbles: true, changedTouches: [end], touches: [] }));
  }, { x1, y1, x2, y2 });
  const beforeTouchLane = await page.evaluate(() => window.__runnerSmoke.state().lane);
  await swipe(310, 500, 90, 500);
  assert.equal(await page.evaluate(() => window.__runnerSmoke.state().lane), Math.max(0, beforeTouchLane - 1), "Left swipe should change lanes");
  await swipe(180, 650, 180, 420);
  assert.ok(await page.evaluate(() => window.__runnerSmoke.state().jump > 0), "Up swipe should trigger a jump");
  await page.waitForFunction(() => window.__runnerSmoke.state().jump === 0);
  await swipe(180, 420, 180, 650);
  assert.ok(await page.evaluate(() => window.__runnerSmoke.state().slide > 0), "Down swipe should trigger a slide");
  await page.waitForFunction(() => window.__runnerSmoke.state().slide === 0);
  await page.keyboard.press("ArrowDown");
  assert.ok(await page.evaluate(() => window.__runnerSmoke.state().slide > 0), "Down input should activate Jay's slide");
  await page.waitForFunction(() => window.__runnerSmoke.state().slide === 0);
  await page.keyboard.press("Space");
  assert.ok(await page.evaluate(() => window.__runnerSmoke.state().jump > 0), "Jump input should activate Jay's jump");
  await page.keyboard.press("Escape");
  await page.locator("#pause-modal.show").waitFor();
  await page.locator("#resume").click();
  await page.waitForFunction(() => !document.querySelector("#pause-modal").classList.contains("show"));
  await page.locator("#pause").click();
  await page.locator("#pause-modal.show").waitFor();
  const quitWired = await page.locator("#quit").evaluate(button => typeof button.onclick === "function");
  assert.equal(quitWired, true, "Quit button should have a click handler");
  await page.locator("#quit").click();
  await page.waitForFunction(() => document.querySelector("#result-modal").classList.contains("show"), null, { timeout: 5000 });
  await page.locator("#back").click();
  await page.locator("#journey").waitFor({ state: "hidden" });
  await page.locator('button[data-page="journey"]').first().click();
  await page.locator("#journey.active").waitFor();
  assert.deepEqual(errors, [], "Runner page should not throw browser JavaScript errors");
  console.log("Semester Survival runner smoke passed: Jay atlas loaded, runner started, keyboard controls responded, pause/resume/game-over worked, and Journey navigation opened.");
} finally {
  await browser.close();
}
