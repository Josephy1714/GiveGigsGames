import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.ARCADE_PLAYWRIGHT_PATH || "playwright");
const channel = process.env.ARCADE_CHROMIUM_CHANNEL;
const root = new URL("../", import.meta.url);
const origin = "http://graphics.test";
const browser = await chromium.launch(channel ? { channel } : {});

try {
  const context = await browser.newContext({ viewport: { width: 480, height: 360 } });
  await context.route(origin + "/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/") {
      await route.fulfill({
        contentType: "text/html",
        body: '<div style="width:320px;height:240px;background:black"><canvas style="width:100%;height:100%;display:block"></canvas></div>'
      });
    } else {
      await route.fulfill({
        contentType: "text/javascript",
        body: await readFile(new URL("." + path, root))
      });
    }
  });

  for (const slug of ["gravegain3dA", "gravegain3dB", "html/gravegain3d"]) {
    const page = await context.newPage();
    await page.goto(origin);
    const canvas = page.locator("canvas");
    const empty = await canvas.screenshot();
    await page.addScriptTag({ url: origin + "/games/" + slug + "/engine/graphics-bridge.js" });
    await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      window.bridge = new window.GraveGainGraphicsBridge(canvas, canvas.parentElement);
    });
    assert.equal(await page.evaluate(() => window.bridge.worker), null, "worker starts only when enabled");
    await page.evaluate(() => window.bridge.setActive(true));
    await page.waitForFunction(() => window.bridge.enabled);
    await page.evaluate(() => window.bridge.burst(160, 120, "#ffffff", 2));
    await page.waitForFunction(() => !window.bridge.queue.length && !window.bridge.inFlight);
    assert.notDeepEqual(await canvas.screenshot(), empty, slug + " presented a worker-drawn burst");
    await page.evaluate(() => window.bridge.setActive(false));
    await page.waitForFunction(() => !window.bridge.inFlight);
    await canvas.screenshot().then(after => assert.deepEqual(after, empty, slug + " cleared its disabled layer"));
    await page.evaluate(() => window.bridge.destroy());
    await page.close();
    console.log("PASS graphics worker " + slug);
  }

  const skyPage = await context.newPage();
  await skyPage.goto(origin);
  const sky = await skyPage.evaluate(async () => {
    const { paintCosmicSky } = await import("/games/spaceships/cosmic-sky.js");
    const reference = document.createElement("canvas");
    paintCosmicSky(reference);
    const worker = new Worker("/games/spaceships/cosmic-sky.worker.js", { type: "module" });
    try {
      const bitmap = await new Promise((resolve, reject) => {
        worker.onmessage = event => resolve(event.data);
        worker.onerror = event => reject(new Error(event.message));
      });
      const { width, height } = bitmap;
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      const sample = Array.from(ctx.getImageData(512, 400, 16, 16).data);
      const expected = Array.from(reference.getContext("2d").getImageData(512, 400, 16, 16).data);
      return { width, height, maxChannelDelta: Math.max(...sample.map((value, i) => Math.abs(value - expected[i]))) };
    } finally {
      worker.terminate();
    }
  });
  assert.equal(sky.width, 2048);
  assert.equal(sky.height, 1024);
  assert.ok(sky.maxChannelDelta <= 2, "worker sky matches the seeded local raster");
  await skyPage.close();
  console.log("PASS Starship Simulator worker raster matches the local renderer");

  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", { value: 2 });
    const BrowserWorker = window.Worker;
    window.createdWorkers = 0;
    window.Worker = class extends BrowserWorker {
      constructor(url) {
        super(url);
        this.shouldHang = ++window.createdWorkers === 1;
      }
      postMessage(...args) {
        if (!this.shouldHang) super.postMessage(...args);
      }
    };
  });
  await page.goto(origin);
  await page.addScriptTag({ url: origin + "/games/html/fourweird-workers.js" });
  const outcome = await page.evaluate(async () => {
    const pool = window.FourWeirdWorkers;
    const probe = await pool.probe();
    const workersAfterProbe = window.createdWorkers;
    const work = [
      pool.run("timing-aggregate", { samples: [20, 24] }, { timeout: 100 }),
      pool.run("timing-aggregate", { samples: [10, 14] })
    ];
    const results = await Promise.all(work);
    return { probe, workersAfterProbe, results, workers: window.createdWorkers };
  });
  assert.equal(outcome.probe.agg.n, 11);
  assert.equal(outcome.workersAfterProbe, 0);
  assert.deepEqual(outcome.results, [
    { avg: 22, n: 2, preset: "balanced" },
    { avg: 12, n: 2, preset: "ultra" }
  ]);
  assert.equal(outcome.workers, 2);
  console.log("PASS worker pool recovers capacity after a job times out");
} finally {
  await browser.close();
}
