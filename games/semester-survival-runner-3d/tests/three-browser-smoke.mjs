import test from "node:test";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");

test("production 3D runner loads Jay and plays real jump and slide states", async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"]
  });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 });
  await page.addInitScript(() => {
    localStorage.setItem("semester-survival-runner-3d-v1", JSON.stringify({
      version: 1, semester: 8, semesterDistance: 990, gpa: 3.2, coins: 0,
      totalDistance: 0, best: 0, runs: 0, collected: 0, cats: 0,
      up: { magnet: 0, shield: 0, double: 0, head: 0, score: 0, coffee: 0 },
      sound: true, vibration: true, motion: false, quality: "High", shop: []
    }));
  });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  try {
    await page.goto("http://127.0.0.1:4173/?smoke=1", { waitUntil: "domcontentloaded" });
    const world = page.locator("#three-world");
    await page.waitForFunction(() => document.querySelector("#three-world")?.dataset.rendererReady === "true", null, { timeout: 60000 });
    const diagnostics = await world.evaluate(node => ({
      clipCount: Number(node.dataset.jayClipCount),
      clips: node.dataset.jayClips.split(","),
      mouthPose: node.dataset.jayMouthPose,
      runMotionFound: node.dataset.jayRunMotionFound === "true",
      runMotionTracks: Number(node.dataset.jayRunMotionTracks),
      runMotionFallback: node.dataset.jayRunMotionFallback === "true",
      runApproachEndpoint: Number(node.dataset.jayRunApproachEndpoint),
      neutralizedMouthMorphs: Number(node.dataset.jayMouthMorphsNeutralized),
      quality: node.dataset.graphicsQuality,
      canvas: Boolean(node.querySelector("canvas")),
      canvasWidth: node.querySelector("canvas")?.width || 0,
      webgl2: Boolean(node.querySelector("canvas")?.getContext("webgl2"))
    }));
    assert.ok(diagnostics.canvas, "Three.js canvas must be mounted");
    assert.ok(diagnostics.canvasWidth > 0, "WebGL canvas must have a real drawing buffer");
    assert.ok(diagnostics.webgl2, "Three.js must acquire a WebGL2 context");
    assert.ok(diagnostics.clipCount >= 5, "Jay must load at least five authored clips");
    for (const clip of ["idle", "run", "jump", "slide", "fall"]) {
      assert.ok(diagnostics.clips.includes(clip), "missing Jay clip: " + clip);
    }
    assert.equal(diagnostics.quality, "High");
    assert.equal(diagnostics.mouthPose, "neutral", "Jay must start with a neutral closed-mouth facial pose");
    assert.equal(diagnostics.runMotionFound, true, "Jay run clip must expose a detectable root-motion channel");
    assert.equal(diagnostics.runMotionTracks, 0, "the authored in-place run clip should contain no root-motion tracks");
    assert.equal(diagnostics.runMotionFallback, false, "the endless run must use the authored in-place clip, not a fallback");
    assert.ok(diagnostics.runApproachEndpoint > 0, "the first run must stop at its forward-most pose");
    assert.ok(Number.isFinite(diagnostics.neutralizedMouthMorphs), "facial pose diagnostics must be present");

    await page.locator('[data-page="settings"]').first().click();
    await page.locator("#quality").selectOption({ label: "Performance" });
    await page.waitForFunction(() => document.querySelector("#three-world")?.dataset.graphicsQuality === "Performance", null, { timeout: 3000 });

    await page.locator("#nav-play").click();
    await page.waitForFunction(() => ["run", "idle"].includes(document.querySelector("#three-world")?.dataset.activeAnimation), null, { timeout: 5000 });
    await page.waitForFunction(() => document.querySelector("#three-world")?.dataset.jayRunPhase === "loop", null, { timeout: 12000 });
    const coinProbe = await page.evaluate(() => window.__runnerSmoke.probeCoin());
    assert.equal(coinProbe.coins, 1, "same-lane coin pickup must award a coin");
    assert.equal(coinProbe.remaining, 0, "collected coins must leave the active world");
    const powerupProbe = await page.evaluate(() => window.__runnerSmoke.probePowerup({ kind: "COFFEE", type: "food" }));
    assert.equal(powerupProbe.collected, 1, "campus power-ups must be collectible");
    assert.ok(powerupProbe.energy > 50, "energy power-ups must restore energy");
    assert.equal(powerupProbe.remaining, 0, "collected power-ups must leave the active world");
    const collisionProbe = await page.evaluate(() => window.__runnerSmoke.probeObstacle({ action: "jump", jump: 0 }));
    assert.equal(collisionProbe.hit, true, "a mistimed jump must register an obstacle collision");
    assert.ok(Math.abs(collisionProbe.energy - 68) < 0.02, "a standard obstacle collision must apply the expected energy penalty, allowing the frame energy drain");
    const bossProbe = await page.evaluate(() => window.__runnerSmoke.probeBoss());
    assert.equal(bossProbe.active, true, "semester boss must activate at its distance threshold");
    assert.equal(bossProbe.label, "FINAL EXAMS", "semester eight must select the final-exams boss");
    assert.equal(bossProbe.queued, 3, "boss challenge must queue all three attacks");
    const bossClearProbe = await page.evaluate(() => window.__runnerSmoke.probeBossClear());
    assert.equal(bossClearProbe.cleared, 1, "clearing the boss must advance its cleared count");
    assert.equal(bossClearProbe.coins, 125, "semester-eight boss reward must be awarded");
    assert.ok(Math.abs(bossClearProbe.energy - 52) < 0.01, "boss victory must restore energy, allowing the frame energy drain");
    await page.waitForTimeout(6000);
    assert.equal(await world.getAttribute("data-jay-run-phase"), "loop", "Jay must remain in the endless run loop after the forward approach finishes");
    const lateBusModels = await page.evaluate(() => window.__runnerSmoke.probeLateBus());
    assert.equal(lateBusModels, 1, "a late bus obstacle must render as a real 3D vehicle");

    await page.keyboard.press("ArrowLeft");
    await page.waitForFunction(() => window.__runnerSmoke.state().lane === 0, null, { timeout: 2500 });
    await page.waitForFunction(() => {
      const world = document.querySelector("#three-world");
      return world && Number.isFinite(Number(world.dataset.jayLean));
    }, null, { timeout: 2500 });
    assert.ok(Number.isFinite(Number((await world.evaluate(node => node.dataset.jayImpact)))), "impact response telemetry should be available");
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(100);
    assert.equal((await page.evaluate(() => window.__runnerSmoke.state().lane)), 0, "left movement must clamp at the left lane");
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(() => window.__runnerSmoke.state().lane === 1, null, { timeout: 2500 });
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(() => window.__runnerSmoke.state().lane === 2, null, { timeout: 2500 });
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(100);
    assert.equal((await page.evaluate(() => window.__runnerSmoke.state().lane)), 2, "right movement must clamp at the right lane");

    const swipe = async (x1, x2, y = 420) => page.evaluate(({ x1, x2, y }) => {
      const target = document.querySelector("#game");
      const makeTouch = (x) => new Touch({ identifier: 7, target, clientX: x, clientY: y });
      target.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, changedTouches: [makeTouch(x1)] }));
      target.dispatchEvent(new TouchEvent("touchend", { bubbles: true, changedTouches: [makeTouch(x2)] }));
    }, { x1, x2, y });
    await swipe(300, 100);
    await page.waitForFunction(() => window.__runnerSmoke.state().lane === 1, null, { timeout: 2500 });
    await swipe(100, 300);
    await page.waitForFunction(() => window.__runnerSmoke.state().lane === 2, null, { timeout: 2500 });
    await swipe(100, 300);
    await page.waitForTimeout(100);
    assert.equal((await page.evaluate(() => window.__runnerSmoke.state().lane)), 2, "touch swipes must clamp at the right lane");
    await swipe(300, 100);
    await page.waitForFunction(() => window.__runnerSmoke.state().lane === 1, null, { timeout: 2500 });

    await page.keyboard.press("ArrowUp");
    await page.waitForFunction(() => document.querySelector("#three-world")?.dataset.activeAnimation === "jump", null, { timeout: 2500 });
    await page.waitForFunction(() => document.querySelector("#three-world")?.dataset.activeAnimation === "run", null, { timeout: 4000 });

    await page.keyboard.press("ArrowDown");
    await page.waitForFunction(() => document.querySelector("#three-world")?.dataset.activeAnimation === "slide", null, { timeout: 2500 });
    await page.waitForFunction(() => document.querySelector("#three-world")?.dataset.activeAnimation === "run", null, { timeout: 4000 });

    await page.locator("#pause").click();
    await page.waitForFunction(() => document.querySelector("#pause-modal")?.classList.contains("show"), null, { timeout: 2000 });
    assert.equal(await page.evaluate(() => window.__runnerSmoke.state().paused), true, "pause must stop the simulation");
    await page.locator("#resume").click();
    await page.waitForFunction(() => !window.__runnerSmoke.state().paused, null, { timeout: 2000 });
    await page.evaluate(() => window.__runnerSmoke.endRun(20));
    await page.waitForFunction(() => document.querySelector("#result-modal")?.classList.contains("show"), null, { timeout: 2000 });
    assert.equal(await page.locator("#result-title").textContent(), "YOU GRADUATED!", "finishing the eighth semester must unlock graduation");
    const graduationSave = await page.evaluate(() => JSON.parse(localStorage.getItem("semester-survival-runner-3d-v1")));
    assert.equal(graduationSave.semester, 9, "graduation must persist the alumni semester");
    assert.equal(graduationSave.graduated, true, "graduation status must persist");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("#three-world")?.dataset.rendererReady === "true", null, { timeout: 60000 });
    await page.locator('[data-page="journey"]').first().click();
    assert.equal(await page.locator("#semester-grid .semester-card").count(), 8, "the journey must display all eight semesters");
    assert.equal(await page.locator("#semester-grid .semester-card:not(.locked)").count(), 8, "all semesters must remain cleared after reload");
    assert.deepEqual(pageErrors, [], "browser runtime should not throw page errors");
  } finally {
    await browser.close();
  }
});
