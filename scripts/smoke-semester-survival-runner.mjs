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
  const initialLane = await page.evaluate(() => window.__runnerSmoke.state().lane);
  await page.keyboard.press("ArrowLeft");
  assert.equal(await page.evaluate(() => window.__runnerSmoke.state().lane), Math.max(0, initialLane - 1), "Left input should change lanes");
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.evaluate(() => window.__runnerSmoke.state().lane), initialLane, "Right input should restore the lane");
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
