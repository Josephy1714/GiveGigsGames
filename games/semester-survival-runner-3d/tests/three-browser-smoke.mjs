import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";

test("production 3D runner loads Jay and plays real jump and slide states", async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"]
  });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  try {
    await page.goto("http://127.0.0.1:4173/?smoke=1", { waitUntil: "domcontentloaded" });
    const world = page.locator("#three-world");
    await page.waitForFunction(() => document.querySelector("#three-world")?.dataset.rendererReady === "true", null, { timeout: 60000 });
    const diagnostics = await world.evaluate(node => ({
      clipCount: Number(node.dataset.jayClipCount),
      clips: node.dataset.jayClips.split(","),
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

    await page.locator('[data-page="settings"]').first().click();
    await page.locator("#quality").selectOption({ label: "Performance" });
    await page.waitForFunction(() => document.querySelector("#three-world")?.dataset.graphicsQuality === "Performance", null, { timeout: 3000 });

    await page.locator("#nav-play").click();
    await page.waitForFunction(() => ["run", "idle"].includes(document.querySelector("#three-world")?.dataset.activeAnimation), null, { timeout: 5000 });

    await page.keyboard.press("ArrowUp");
    await page.waitForFunction(() => document.querySelector("#three-world")?.dataset.activeAnimation === "jump", null, { timeout: 2500 });
    await page.waitForFunction(() => document.querySelector("#three-world")?.dataset.activeAnimation === "run", null, { timeout: 4000 });

    await page.keyboard.press("ArrowDown");
    await page.waitForFunction(() => document.querySelector("#three-world")?.dataset.activeAnimation === "slide", null, { timeout: 2500 });
    await page.waitForFunction(() => document.querySelector("#three-world")?.dataset.activeAnimation === "run", null, { timeout: 4000 });

    assert.deepEqual(pageErrors, [], "browser runtime should not throw page errors");
  } finally {
    await browser.close();
  }
});
