import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium, firefox, webkit } = require(process.env.ARCADE_PLAYWRIGHT_PATH || "playwright");
const root = fileURLToPath(new URL("../", import.meta.url));
const { games } = JSON.parse(await readFile(path.join(root, "games/catalog.json"), "utf8"));
const engines = { chromium, firefox, webkit };
const engine = process.env.ARCADE_BROWSER || "chromium";
const desktop = process.env.ARCADE_SMOKE_INPUT === "desktop";
const landscape = process.env.ARCADE_SMOKE_ORIENTATION === "landscape";
const origin = "http://arcade.test";
const focus = process.env.ARCADE_SMOKE_GAMES?.split(",");
const catalog = focus ? games.filter(game => focus.includes(game.slug)) : games;
assert.ok(engines[engine], "ARCADE_BROWSER must be chromium, firefox, or webkit");
assert.ok(catalog.length, "No matching games");

const contentTypes = {
  ".css": "text/css", ".html": "text/html", ".js": "text/javascript",
  ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp"
};
const launchButtons = {
  aiwhackamole: "#TEMPLATE-4weird-start-btn",
  battlesharks2: "#btnStart",
  demolichdom: "#dl-main-start",
  discoveramerica: "#btnStart",
  fridgesimulator: "#btnStart",
  friendslop: "#friendslop-4weird-start-btn",
  lastwordszombies: "#TEMPLATE-4weird-start-btn",
  orbitaldrift: "#TEMPLATE-4weird-start-btn",
  serversavershield: "#btnStart"
};
for (const slug of [
  "temple-of-lost-revenue", "the-ai-expedition", "the-cave-of-bottlenecks", "the-lost-city-of-customers",
  "the-madi-ai-universe", "the-pipeline-mountain", "the-revenue-dragon", "the-revenue-jungle",
  "the-speed-portal", "treasure-hunters"
]) {
  launchButtons[slug] = "#TEMPLATE-4weird-start-btn";
}

async function serveFiles(route) {
  const { pathname } = new URL(route.request().url());
  const page = pathname.startsWith("/ggg/play/") ? "/play.html" : decodeURIComponent(pathname);
  const file = path.resolve(root, `.${page}`);
  if (path.relative(root, file).startsWith("..")) return route.fulfill({ status: 404 });
  if (pathname === "/_vercel/insights/script.js") return route.fulfill({ contentType: "text/javascript", body: "" });
  try {
    const body = await readFile(file);
    await route.fulfill({ contentType: contentTypes[path.extname(file)] || "application/octet-stream", body });
  } catch (error) {
    if (error.code !== "ENOENT" && error.code !== "EISDIR") throw error;
    await route.fulfill({ status: 404, body: "" });
  }
}

const activate = (target, options) => desktop ? target.click(options) : target.tap(options);

async function exerciseNeon(frame, page, slug) {
  await activate(frame.locator("#TEMPLATE-4weird-start-btn"));
  if (desktop) {
    if (slug === "neonracer" || slug === "neonvoidrunner") {
      await frame.evaluate(() => {
        canvas.tabIndex = 0;
        canvas.focus();
      });
      const before = await frame.evaluate(game => game === "neonracer" ? player.lane : player.x, slug);
      await page.keyboard.press("ArrowRight");
      await frame.waitForFunction(({ game, before }) => (game === "neonracer" ? player.lane : player.x) > before,
        { game: slug, before }, { timeout: 3000 });
    }
    assert.equal(await frame.evaluate(() => gameState), "playing");
    return;
  }
  if (slug === "neonbreaker" || slug === "neonsnake") {
    assert.equal(await frame.evaluate(() => gameState), "playing");
    return;
  }
  await frame.evaluate(game => {
    const bounds = canvas.getBoundingClientRect();
    const contact = (identifier, fraction) => ({
      identifier, clientX: bounds.left + bounds.width * fraction,
      clientY: bounds.top + bounds.height * 0.65
    });
    const send = (type, changedTouches, touches = changedTouches) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperties(event, { changedTouches: { value: changedTouches }, touches: { value: touches } });
      canvas.dispatchEvent(event);
    };
    const primary = contact(1, 0.32);
    const secondary = contact(2, 0.82);
    if (gameState !== "playing") throw new Error("Tap did not start the game");
    if (game === "neoninvaders") {
      const before = player.x;
      send("touchstart", [primary]);
      send("touchstart", [secondary], [secondary, primary]);
      send("touchend", [secondary], [primary]);
      send("touchmove", [contact(1, 0.47)]);
      if (player.x <= before) throw new Error("Main steering finger stopped tracking");
      send("touchcancel", [primary], []);
      if (isTouching) throw new Error("Canceled Invaders drag stayed active");
    } else {
      const position = () => game === "neonracer" ? player.lane : player.x;
      const step = game === "neonracer" ? 1 : laneWidth;
      if (game === "neonracer") player.lane = 0;
      else player.x = laneWidth / 2 - player.width / 2;
      const before = position();
      send("touchstart", [primary]);
      const swipe = contact(1, 0.56);
      send("touchmove", [swipe]);
      const moved = position();
      send("touchend", [swipe], []);
      if (Math.abs(moved - before - step) > 0.01 || position() !== moved) {
        throw new Error("A single swipe must move exactly one lane");
      }
      send("touchstart", [primary]);
      send("touchcancel", [primary], []);
      if (steeringTouch !== null || position() !== moved) throw new Error("Canceled steering changed lanes");
    }
  }, slug);
}

async function verifyControllerKeys(frame) {
  const events = await frame.evaluate(async () => {
    const keys = [];
    const pad = {
      axes: [1, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
      connected: true
    };
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [pad] });
    for (const type of ["keydown", "keyup"]) {
      window.addEventListener(type, event => {
        if (event.code === "ArrowRight") keys.push(event.type);
      });
    }
    const focusTarget = document.querySelector("canvas");
    focusTarget.tabIndex = 0;
    focusTarget.focus();
    window.dispatchEvent(new Event("gamepadconnected"));
    await new Promise(resolve => requestAnimationFrame(resolve));
    pad.connected = false;
    window.dispatchEvent(new Event("gamepaddisconnected"));
    await new Promise(resolve => requestAnimationFrame(resolve));
    return keys;
  });
  assert.deepEqual(events, ["keydown", "keyup"]);
}

async function verifyHyperdungeonGestures(frame) {
  await frame.evaluate(() => {
    const host = document.createElement("div");
    const view = document.createElement("canvas");
    view.id = "gameCanvas";
    host.append(view);
    document.body.append(host);
    let taps = 0;
    const touch = new window.GG4D_Touch({ force: true, onTap: () => { taps++; } });
    const overlay = touch.mount(host);
    const emit = (target, type, pointerId) => target.dispatchEvent(new PointerEvent(type, {
      pointerId, clientX: 30, clientY: 30, button: 0, bubbles: true, cancelable: true
    }));
    try {
      const shift = overlay.querySelector('[data-gg4d-btn="ana"]');
      emit(shift, "pointerdown", 1);
      emit(shift, "pointerdown", 2);
      emit(shift, "pointercancel", 1);
      if (!touch.snapshot().buttons.ana) throw new Error("Second finger lost its held phase shift");
      window.dispatchEvent(new Event("blur"));
      if (touch.snapshot().buttons.ana) throw new Error("Phase shift stayed held after blur");
      if (touch.scheme?.() === "swipe-rotate-4d+phase-thumbs") {
        emit(view, "pointerdown", 3);
        emit(view, "pointercancel", 3);
        emit(view, "pointerdown", 4);
        emit(view, "pointerdown", 5);
        emit(view, "pointerup", 4);
        emit(view, "pointerup", 5);
        if (taps) throw new Error("Canceled or two-finger gesture triggered an attack");
        emit(view, "pointerdown", 6);
        emit(view, "pointerup", 6);
        if (taps !== 1) throw new Error("A single tap must attack once");
      }
    } finally {
      touch.destroy();
      host.remove();
    }
  });
}

const browser = await engines[engine].launch(
  engine === "chromium" && process.env.ARCADE_CHROMIUM_CHANNEL ? { channel: process.env.ARCADE_CHROMIUM_CHANNEL } : {}
);
try {
  const context = await browser.newContext({
    viewport: desktop ? { width: 1280, height: 720 } :
      landscape ? { width: 568, height: 320 } : { width: 360, height: 640 },
    hasTouch: !desktop,
    ...(engine === "firefox" ? {} : { isMobile: !desktop }),
    ignoreHTTPSErrors: true
  });
  await context.route(`${origin}/**`, serveFiles);
  // Launch and controls must work while optional presentation assets are pending.
  await context.route("https://fonts.googleapis.com/**", () => {});
  await context.route("https://overtake-assets.vercel.app/**", () => {});
  await context.route("https://cdn.babylonjs.com/**", route => route.abort());
  for (const game of catalog) {
    const page = await context.newPage();
    const errors = new Set();
    page.on("pageerror", error => errors.add(error.message));
    try {
      await page.goto(`${origin}/ggg/play/${game.slug}`, { waitUntil: "domcontentloaded", timeout: 15000 });
      assert.equal(await page.locator("#game-title").textContent(), game.title);
      if (game.runtimeType === "external") {
        assert.equal(await page.locator("#hosted-link").getAttribute("href"), game.externalUrl);
      } else {
        await page.locator("#player-loading").waitFor({ state: "hidden", timeout: 12000 });
        const frame = page.frames().find(item => item.url().endsWith(`/games/${game.entrypoint}`));
        assert.ok(frame, "Game did not load in the launcher");
        if (["gravegain3d", "gravegain3dB", "gravegain4d"].includes(game.slug)) {
          await activate(frame.locator("#btnPlay"), { timeout: 5000 });
          await frame.locator("#charSelectScreen").waitFor({ state: "visible", timeout: 5000 });
          if (game.slug === "gravegain3dB") {
            await activate(frame.locator("#btnCharSelectStart"));
            await frame.locator("#gameMain").waitFor({ state: "visible", timeout: 5000 });
          }
        } else {
          assert.ok(await frame.locator("body").isVisible(), "Game body is hidden");
        }
        const layout = await frame.evaluate(() => {
          const overflow = document.documentElement.scrollWidth - innerWidth;
          if (overflow <= 1) return { overflow };
          const elements = Array.from(document.querySelectorAll("body *"))
            .filter(element => element.getBoundingClientRect().right > innerWidth + 1)
            .slice(0, 6)
            .map(element => element.id || element.tagName);
          return { overflow, elements };
        });
        assert.ok(layout.overflow <= 1, `Game overflows the viewport by ${layout.overflow}px (${layout.elements})`);
        if (game.slug === "template-demo") await verifyControllerKeys(frame);
        if (game.slug === "platform-wars") {
          await activate(frame.locator("#practice"));
          await frame.locator("#arena").waitFor({ state: "visible" });
          if (!desktop) {
            await frame.locator('#touchPad [data-key="jump"]').waitFor({ state: "visible" });
            await frame.evaluate(() => {
              const move = document.querySelector('#touchPad [data-key="right"]');
              const emit = (type, pointerId) => move.dispatchEvent(new PointerEvent(type, {
                pointerId, button: 0, bubbles: true, cancelable: true
              }));
              emit("pointerdown", 1);
              emit("pointerdown", 2);
              emit("pointercancel", 1);
              if (!move.classList.contains("pressed")) throw new Error("Canceling one finger released both");
              window.dispatchEvent(new Event("blur"));
              if (move.classList.contains("pressed")) throw new Error("Movement stayed held after blur");
            });
          }
          await activate(frame.locator("#leave"));
          await frame.locator("#lobby").waitFor({ state: "visible" });
          await frame.evaluate(() => {
            document.querySelector("#quick").click();
            if (document.querySelector("#game").hidden) throw new Error("Quick Match should launch immediately");
          });
          assert.match(await frame.locator("#banner").textContent(), /LOCAL .* RIVAL READY/);
        }
        if (game.slug === "gravegain4d" || game.slug === "gravegain4dA") await verifyHyperdungeonGestures(frame);
        if (game.slug === "global-fashion-model-life") {
          await activate(frame.locator('[data-action="home"][data-value="nyc"]'));
          await frame.locator('[data-action="nav"]').first().waitFor({ state: "visible" });
          if (landscape && !desktop) {
            const preview = await frame.locator(".stage").boundingBox();
            const editor = await frame.locator("#panel").boundingBox();
            assert.ok(preview && editor && preview.x + preview.width <= editor.x,
              "Landscape editor and preview must sit side by side");
          }
          await activate(frame.getByRole("button", { name: "Jade halo", exact: true }));
          await activate(frame.getByRole("button", { name: "Clean casting", exact: true }));
          assert.equal(await frame.locator('[data-avatar="shadowShape"]').inputValue(), "wash");
          await activate(frame.getByRole("button", { name: "Bookings", exact: true }));
          assert.equal(await frame.locator('#panel [data-action="job"]').count(), 11);
          await frame.locator("#booking-kind").selectOption("Casting");
          await frame.locator("#booking-available").check();
          const newBooking = frame.locator('[data-action="job"][data-value="5"]');
          assert.equal(await frame.locator('#panel [data-action="job"]').count(), 2);
          await activate(newBooking);
          await frame.getByRole("heading", { name: "Brooklyn denim test" }).waitFor();
          for (const [pose, framing] of [["front", "beauty"], ["angle", "mid"], ["front", "full"]]) {
            await activate(frame.locator(`[data-action="pose"][data-value="${pose}"]`));
            await activate(frame.locator(`[data-action="frame"][data-value="${framing}"]`));
            await activate(frame.getByRole("button", { name: "Release shutter" }));
          }
          await frame.getByText("Final Score:", { exact: false }).getByText("85%", { exact: true }).waitFor();
          await activate(frame.getByRole("button", { name: "Back to Call Sheet" }));
          assert.equal(await newBooking.count(), 0, "A completed booking should leave the available list");
          await activate(frame.getByRole("button", { name: "Lifestyle", exact: true }));
          const reception = frame.locator('[data-action="social"][data-value="market:nyc"]');
          await activate(reception);
          await activate(frame.getByRole("button", { name: "Compare notes with other new models" }));
          assert.ok(await reception.isDisabled(), "The local event should be limited to once per day");
        }
        if (game.slug === "gravegain2dD") {
          await activate(frame.locator("#start"));
          await frame.locator("#overlay").waitFor({ state: "hidden", timeout: 5000 });
          await frame.waitForFunction(() => Number(document.querySelector("#score").textContent) > 0);
          await activate(frame.locator("#pause-btn"));
          await activate(frame.locator("#resume-btn"));
          await frame.locator("#pause-panel").waitFor({ state: "hidden" });
          await frame.evaluate(() => {
            Object.defineProperty(document, "hidden", { configurable: true, value: true });
            try {
              document.dispatchEvent(new Event("visibilitychange"));
            } finally {
              delete document.hidden;
            }
          });
          await frame.locator("#pause-panel").waitFor({ state: "visible" });
        }
        if (game.slug === "gravegain3dC") {
          await activate(frame.locator('[data-mode="player"]'));
          if (!desktop) await frame.locator("#touch-move").waitFor({ state: "visible", timeout: 5000 });
          else await frame.evaluate(() => document.exitPointerLock?.());
          const weapon = await frame.locator("#weapon-val").textContent();
          await activate(frame.locator("#weapon-switch"));
          await frame.waitForFunction(previous => document.querySelector("#weapon-val").textContent !== previous, weapon);
          await activate(frame.locator("#menu-btn"));
          await activate(frame.locator('[data-mode="rts"]'));
          const field = await frame.locator("#renderCanvas").boundingBox();
          await activate(frame.locator("#renderCanvas"), { position: { x: field.width / 2, y: field.height * 0.55 } });
          await frame.getByText("Squad rally point set", { exact: true }).waitFor({ timeout: 5000 });
          await activate(frame.locator("#menu-btn"));
          await activate(frame.locator('[data-mode="autobattler"]'));
          await frame.locator("#overlay").waitFor({ state: "hidden" });
        }
        if (game.slug === "semester-survival-runner") {
          await activate(frame.locator("#play"));
          await frame.locator("#world").waitFor({ state: "visible" });
          await frame.waitForFunction(() => parseInt(document.querySelector("#distance").textContent, 10) > 0);
        }
        if (game.slug === "starship-simulator") {
          await activate(frame.locator("#btn-launch-flight"));
          await frame.locator("#launch-screen").waitFor({ state: "hidden" });
          if (!desktop) {
            await frame.locator("#sj-btn-fire").waitFor({ state: "visible" });
            const controls = await frame.locator("#sj-ordnance").boundingBox();
            const stick = await frame.locator("#sj-stick-zone").boundingBox();
            assert.ok(stick && controls && stick.x + stick.width <= controls.x, "Flight controls overlap");
          }
        }
        if (game.slug === "overtake") {
          await frame.locator("#loadingScreen").waitFor({ state: "hidden", timeout: 6000 });
          await activate(frame.getByRole("button", { name: /Start.*Choose a race level/i }));
          await activate(frame.getByRole("button", { name: "Forward", exact: true }));
          await frame.locator(desktop ? '#app[data-mode="race"]' : '#app[data-mode="race"] #touchControls').waitFor();
          await frame.waitForFunction(() => Number(document.querySelector("#hudSpeed").textContent) >= 40,
            undefined, { timeout: 12000 });
          await activate(frame.locator("#pauseButton"));
          await frame.locator('#app[data-mode="paused"]').waitFor();
          const speed = await frame.locator("#hudSpeed").textContent();
          await frame.evaluate(() => {
            window.addEventListener("resize", () => document.body.dataset.smokeResized = "true", { once: true });
          });
          await page.setViewportSize(desktop ? { width: 1024, height: 600 } :
            landscape ? { width: 360, height: 640 } : { width: 568, height: 320 });
          await frame.locator('body[data-smoke-resized="true"]').waitFor();
          assert.equal(await frame.locator("#hudSpeed").textContent(), speed, "Rotation reset the paused race");
          await activate(frame.getByRole("button", { name: /Resume.*Continue race/i }));
          await frame.locator(desktop ? '#app[data-mode="race"]' : '#app[data-mode="race"] #touchControls').waitFor();
        }
        if (["neonracer", "neonvoidrunner", "neoninvaders", "neonbreaker", "neonsnake"].includes(game.slug)) {
          await exerciseNeon(frame, page, game.slug);
        }
        if (launchButtons[game.slug]) {
          if (game.slug === "orbitaldrift") {
            const rendererError = await frame.locator(".fatal-overlay").allTextContents();
            assert.deepEqual(rendererError, []);
            await activate(frame.getByRole("button", { name: "Flight briefing →" }));
          }
          if (game.slug === "serversavershield") {
            await activate(frame.getByRole("button", { name: "4. Controls", exact: true }));
          }
          const launch = frame.locator(launchButtons[game.slug]);
          await activate(launch, { timeout: 5000 });
          await launch.waitFor({ state: "hidden", timeout: 5000 });
        }
        if (game.slug === "lastwordszombies" && !desktop) {
          await activate(frame.locator('#lwz-qwerty [data-key="a"]'));
          assert.notEqual(await frame.evaluate(() => document.activeElement.id), "mobile-game-input");
          const keyboard = frame.locator("#mobile-keyboard-btn");
          await activate(keyboard);
          assert.equal(await frame.evaluate(() => document.activeElement.id), "mobile-game-input");
          await activate(keyboard);
          assert.equal(await keyboard.getAttribute("aria-pressed"), "false");
          assert.notEqual(await frame.evaluate(() => document.activeElement.id), "mobile-game-input");
        }
        if (game.slug === "lastwordszombies" && desktop) {
          await page.keyboard.down("Escape");
          try {
            const pause = frame.locator("#TEMPLATE-4weird-pause-screen");
            await pause.waitFor({ state: "visible" });
            await page.keyboard.down("Escape");
            assert.ok(await pause.isVisible(), "Holding Escape should keep the game paused");
          } finally {
            await page.keyboard.up("Escape");
          }
        }
      }
      assert.deepEqual([...errors], []);
      console.log(`PASS ${engine} ${game.slug}`);
    } catch (error) {
      console.error(`FAIL ${engine} ${game.slug}: ${error.message}`, [...errors]);
      process.exitCode = 1;
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
