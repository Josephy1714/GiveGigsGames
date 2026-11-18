#!/usr/bin/env node
/**
 * GiveGigsGames Automated Gameplay Tester CLI & Local Companion Bridge
 *
 * Modes:
 *   --serve / --bridge   Serve GiveGigsGames + Local Native/Audit REST Bridge (default port 42069)
 *   --game <slug>        Run automated Playwright gameplay test on a catalog game
 *   --url <http-url>     Run automated Playwright gameplay test on any web game URL
 *   --native <window>    Run automated gameplay test against a local desktop game window
 *   --audit <slug|dir>   Run static source-code debugger audit on a local game folder
 *   --self-test          Verify all tester engines (playbooks, brain, controllers, static audit)
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const Playbooks = require(path.join(repoRoot, "tester", "engine", "playbooks.js"));
const BrainMod = require(path.join(repoRoot, "tester", "engine", "brain.js"));
const Controllers = require(path.join(repoRoot, "tester", "engine", "controllers.js"));
const Runtime = require(path.join(repoRoot, "tester", "engine", "runtime.js"));

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8"
};

function loadCatalog() {
  const raw = fs.readFileSync(path.join(repoRoot, "games", "catalog.json"), "utf8");
  return JSON.parse(raw).games || [];
}

function parseCli(argv) {
  const args = argv.slice(2);
  const opts = {
    serve: false,
    port: 42069,
    game: "",
    url: "",
    native: "",
    audit: "",
    selfTest: false,
    steps: 8,
    headless: !args.includes("--headful"),
    provider: "",
    apiKey: "",
    model: ""
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--serve" || a === "--bridge") opts.serve = true;
    else if (a === "--port") opts.port = Number(args[++i]) || 42069;
    else if (a === "--game") opts.game = args[++i] || "";
    else if (a === "--url") opts.url = args[++i] || "";
    else if (a === "--native") opts.native = args[++i] || "";
    else if (a === "--audit") opts.audit = args[++i] || "";
    else if (a === "--self-test") opts.selfTest = true;
    else if (a === "--steps") opts.steps = Math.max(1, Number(args[++i]) || 8);
    else if (a === "--provider") opts.provider = args[++i] || "";
    else if (a === "--api-key") opts.apiKey = args[++i] || "";
    else if (a === "--model") opts.model = args[++i] || "";
    else if (a === "--help" || a === "-h") opts.help = true;
  }
  return opts;
}

// Ported from 4weird/v2/desktop/code/automation/local_game_debugger.js
function auditStaticDirectory(targetDir) {
  const bugsFound = [];
  let filesScanned = 0;
  if (!targetDir || !fs.existsSync(targetDir)) {
    return { filesScanned: 0, bugsFound: [{ type: "MISSING_DIR", file: ".", description: `Directory not found: ${targetDir}` }] };
  }
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (["node_modules", ".git"].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|mjs|html)$/i.test(entry.name)) {
        filesScanned += 1;
        const content = fs.readFileSync(full, "utf8");
        const rel = path.relative(targetDir, full);
        if (content.includes("requestAnimationFrame") && !content.includes("cancelAnimationFrame") && content.includes("location.reload()")) {
          bugsFound.push({ type: "MEMORY_LEAK_HAZARD", file: rel, description: `Uncancelled requestAnimationFrame loop before reload in ${rel}` });
        }
        if (content.includes("new AudioContext()") && !content.includes("resume()") && !content.includes("AudioContext.state")) {
          bugsFound.push({ type: "AUDIO_AUTOPLAY_BLOCK", file: rel, description: `AudioContext created without user-gesture resume() handling in ${rel}` });
        }
        if (/file:\/\/\/[A-Za-z]:\//i.test(content)) {
          bugsFound.push({ type: "HARDCODED_FILE_URI", file: rel, description: `Contains hardcoded absolute file:// URI in ${rel}` });
        }
        if (content.includes("window.addEventListener('resize'") && content.includes("canvas.width =") && !content.includes("ctx")) {
          bugsFound.push({ type: "CANVAS_RESIZE_RESET", file: rel, description: `Canvas dimensions reset on resize without context re-initialization in ${rel}` });
        }
      }
    }
  };
  walk(targetDir);
  return { filesScanned, bugsFound };
}

function runPythonInputSim(simArgs) {
  return new Promise((resolve, reject) => {
    const pyScript = path.join(__dirname, "input_sim.py");
    const cmd = process.platform === "win32" ? "python" : "python3";
    const child = spawn(cmd, [pyScript, ...simArgs], { cwd: repoRoot });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += String(d)));
    child.stderr.on("data", (d) => (stderr += String(d)));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(stderr.trim() || `input_sim exited ${code}`));
      else resolve(stdout.trim());
    });
  });
}

function resolveStaticRoute(urlPathname) {
  let clean = decodeURIComponent(urlPathname.split("?")[0]);
  if (clean === "/" || clean === "/ggg" || clean === "/ggg/") clean = "/index.html";
  else if (/^\/ggg\/test\/[^/]+\/?$/i.test(clean)) clean = "/tester/index.html";
  else if (/^\/ggg\/play\/[^/]+\/?$/i.test(clean)) clean = "/play.html";
  else if (/^\/ggg\/info\/[^/]+\/?$/i.test(clean)) clean = "/game.html";
  else if (/^\/ggg\/guide\/[^/]+\/?$/i.test(clean)) clean = "/ggg-guide.html";
  else if (/^\/ggg\/roadmap\/[^/]+\/?$/i.test(clean)) clean = "/roadmap.html";
  else if (clean.endsWith("/")) clean += "index.html";

  const fullPath = path.resolve(repoRoot, clean.replace(/^\/+/, ""));
  if (!fullPath.startsWith(repoRoot + path.sep) && fullPath !== repoRoot) return null;
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    const idx = path.join(fullPath, "index.html");
    return fs.existsSync(idx) ? idx : null;
  }
  return fs.existsSync(fullPath) ? fullPath : null;
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += String(chunk);
      if (raw.length > 2_000_000) reject(new Error("Body too large"));
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

function createServer() {
  return http.createServer(async (req, res) => {
    const reqUrl = new URL(req.url || "/", "http://127.0.0.1");
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      });
      res.end();
      return;
    }

    if (reqUrl.pathname === "/api/status") {
      sendJson(res, 200, {
        ok: true,
        system: "GiveGigsGames Automated Gameplay Tester Bridge",
        platform: process.platform,
        node: process.version
      });
      return;
    }

    if (reqUrl.pathname === "/api/games") {
      const games = loadCatalog();
      sendJson(res, 200, { count: games.length, games });
      return;
    }

    if (reqUrl.pathname === "/api/native/windows") {
      try {
        const out = await runPythonInputSim(["list_windows"]);
        sendJson(res, 200, JSON.parse(out));
      } catch (err) {
        sendJson(res, 500, { windows: [], error: err.message });
      }
      return;
    }

    if (reqUrl.pathname === "/api/native/screenshot") {
      const winTitle = reqUrl.searchParams.get("window") || "";
      try {
        const args = winTitle ? ["screenshot", "-", winTitle] : ["screenshot", "-"];
        const out = await runPythonInputSim(args);
        sendJson(res, 200, JSON.parse(out));
      } catch (err) {
        sendJson(res, 500, { error: err.message });
      }
      return;
    }

    if (reqUrl.pathname === "/api/native/input" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const normalized = Controllers.normalizeNativeAction(body.action);
        const simArgs = Controllers.toInputSimArgs(normalized);
        if (!simArgs) {
          sendJson(res, 200, { result: `Waited ${normalized.duration_ms || 300}ms` });
          return;
        }
        if (body.windowTitle) simArgs.push(String(body.windowTitle));
        const result = await runPythonInputSim(simArgs);
        sendJson(res, 200, { result, normalized });
      } catch (err) {
        sendJson(res, 500, { error: err.message });
      }
      return;
    }

    if (reqUrl.pathname === "/api/audit-static" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const games = loadCatalog();
        const game = games.find((g) => g.slug === body.slug);
        let dir = "";
        if (game && game.entrypoint) {
          dir = path.dirname(path.join(repoRoot, "games", ...game.entrypoint.split("/")));
        } else if (body.slug) {
          const candidate = path.resolve(repoRoot, "games", String(body.slug));
          if (candidate.startsWith(path.join(repoRoot, "games") + path.sep)) dir = candidate;
        } else {
          dir = path.join(repoRoot, "games");
        }
        const audit = auditStaticDirectory(dir);
        sendJson(res, 200, { slug: body.slug || "all", dir: path.relative(repoRoot, dir), ...audit });
      } catch (err) {
        sendJson(res, 500, { error: err.message });
      }
      return;
    }

    const filePath = resolveStaticRoute(reqUrl.pathname);
    if (!filePath) {
      if (reqUrl.pathname === "/favicon.ico") {
        res.writeHead(204);
        res.end();
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
}

function resolveCliProvider(opts) {
  if (opts.provider && opts.apiKey) {
    return { provider: opts.provider, apiKey: opts.apiKey, modelName: opts.model };
  }
  if (opts.apiKey) {
    if (process.env.OPENROUTER_API_KEY === opts.apiKey || opts.apiKey.startsWith("sk-or-")) {
      return { provider: opts.provider || "openrouter", apiKey: opts.apiKey, modelName: opts.model };
    }
    if (opts.apiKey.startsWith("AIza")) {
      return { provider: opts.provider || "gemini", apiKey: opts.apiKey, modelName: opts.model };
    }
    return { provider: opts.provider || "openai", apiKey: opts.apiKey, modelName: opts.model };
  }
  if (process.env.OPENROUTER_API_KEY) return { provider: "openrouter", apiKey: process.env.OPENROUTER_API_KEY, modelName: opts.model };
  if (process.env.OPENAI_API_KEY) return { provider: "openai", apiKey: process.env.OPENAI_API_KEY, modelName: opts.model };
  if (process.env.GEMINI_API_KEY) return { provider: "gemini", apiKey: process.env.GEMINI_API_KEY, modelName: opts.model };
  if (process.env.DEEPSEEK_API_KEY) return { provider: "deepseek", apiKey: process.env.DEEPSEEK_API_KEY, modelName: opts.model };
  return { provider: "heuristic", apiKey: "", modelName: "" };
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch (_) {}
  try {
    return require("playwright");
  } catch (_) {}
  const sibling = path.resolve(repoRoot, "..", "GiveGigs", "v7", "node_modules", "playwright");
  if (fs.existsSync(sibling)) {
    return require(sibling);
  }
  throw new Error("Playwright is not installed. Run `npm install --no-save playwright` or use `--serve` to test in your browser.");
}

async function launchBrowser(chromium, headless) {
  try {
    return await chromium.launch({ headless });
  } catch (err) {
    const candidates = [];
    const localApp = process.env.LOCALAPPDATA || "";
    const msPw = localApp ? path.join(localApp, "ms-playwright") : "";
    if (msPw && fs.existsSync(msPw)) {
      for (const entry of fs.readdirSync(msPw)) {
        if (entry.startsWith("chromium-") || entry.startsWith("chromium_headless_shell-")) {
          const p1 = path.join(msPw, entry, "chrome-win64", "chrome.exe");
          const p2 = path.join(msPw, entry, "chrome-win", "chrome.exe");
          const p3 = path.join(msPw, entry, "chrome-win", "headless_shell.exe");
          for (const p of [p1, p2, p3]) {
            if (fs.existsSync(p)) candidates.push(p);
          }
        }
      }
    }
    candidates.push(
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    );
    for (const exe of candidates) {
      if (fs.existsSync(exe)) {
        return await chromium.launch({ headless, executablePath: exe });
      }
    }
    throw err;
  }
}

async function runPlaywrightTest(opts) {
  const { chromium } = await loadPlaywright();

  const catalog = loadCatalog();
  const game = opts.game ? catalog.find((g) => g.slug.toLowerCase() === opts.game.toLowerCase()) : null;
  if (opts.game && !game) throw new Error(`Catalog game not found: ${opts.game}`);

  let server = null;
  let targetUrl = opts.url;
  if (!targetUrl) {
    server = createServer();
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address();
    targetUrl = `http://127.0.0.1:${addr.port}/games/${game.entrypoint}`;
  }

  const brainCfg = resolveCliProvider(opts);
  const resolvedRules = Playbooks.resolveGameRules({ slug: game?.slug || "custom", catalogGame: game });
  const brain = new BrainMod.AgentBrain({
    ...brainCfg,
    gameRules: resolvedRules.text,
    preferredKeys: resolvedRules.playbook?.preferredKeys || []
  });

  const browser = await launchBrowser(chromium, opts.headless);
  const consoleLogs = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on("pageerror", (err) => consoleLogs.push(`[pageerror] ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleLogs.push(`[console.error] ${msg.text()}`);
    });

    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(700);

    for (let step = 1; step <= opts.steps; step++) {
      const screenshotBuf = await page.screenshot({ type: "jpeg", quality: 65 });
      const screenshotBase64 = `data:image/jpeg;base64,${screenshotBuf.toString("base64")}`;
      const domSnapshot = await page.evaluate(() => {
        const out = [];
        const vw = window.innerWidth || 1;
        const vh = window.innerHeight || 1;
        for (const el of document.querySelectorAll("button, a, input, select, canvas, [role='button']")) {
          if (out.length >= 40) break;
          const r = el.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) continue;
          out.push({
            tagName: el.tagName,
            id: el.id || "",
            className: typeof el.className === "string" ? el.className : "",
            innerText: (el.innerText || "").slice(0, 50).trim(),
            nx: Math.round(((r.left + r.width / 2) / vw) * 1000),
            ny: Math.round(((r.top + r.height / 2) / vh) * 1000)
          });
        }
        return out;
      });

      let decision = null;
      const executeJS = (code) => page.evaluate((src) => eval(src), code);
      if (game && game.slug.toLowerCase() === "overtake") {
        const snap = await page.evaluate(() => window.gameState?.snapshot?.() || null);
        if (snap) decision = Controllers.decideOvertake(snap);
      } else if (game && game.slug.toLowerCase() === "friendslop") {
        decision = await Controllers.runFriendSlopAutoplay(executeJS);
      } else if (game && game.slug.toLowerCase().startsWith("gravegain")) {
        decision = await Controllers.runGraveGainAutoplay(executeJS, game.slug);
      }
      if (!decision) {
        if (brainCfg.provider === "heuristic") {
          decision = Controllers.runPlaybookAutoplay({
            slug: game?.slug || "custom",
            catalogGame: game,
            domSnapshot,
            stepIndex: step - 1,
            lastTarget: brain.lastActionTarget
          });
          brain.lastActionTarget = decision.action?.target;
        } else {
          decision = await brain.chooseNextAction(screenshotBase64, domSnapshot, false, consoleLogs);
        }
      }

      const act = decision.action || { type: "wait", duration_ms: 200 };
      if (act.type === "click" && typeof act.target === "string" && act.target.includes(",")) {
        const [nx, ny] = act.target.split(",").map(Number);
        const vp = page.viewportSize() || { width: 1280, height: 720 };
        await page.mouse.click(Math.round((nx / 1000) * vp.width), Math.round((ny / 1000) * vp.height));
      } else if (act.type === "press_key" && act.target) {
        await page.keyboard.press(act.target === " " ? "Space" : act.target);
      } else if (act.type === "hold_key" && act.target) {
        const key = act.target === " " ? "Space" : act.target;
        await page.keyboard.down(key);
        await page.waitForTimeout(Math.min(800, act.duration_ms || 240));
        await page.keyboard.up(key);
      } else if (act.type === "hold_keys") {
        const keys = act.params?.keys || String(act.target || "w").split(",");
        for (const k of keys) await page.keyboard.down(k);
        await page.waitForTimeout(Math.min(800, act.duration_ms || 240));
        for (const k of keys.slice().reverse()) await page.keyboard.up(k);
      } else if (act.type === "combo" && Array.isArray(act.params?.steps)) {
        for (const s of act.params.steps) {
          if (s.op === "press" && s.key) await page.keyboard.press(s.key === " " ? "Space" : s.key);
          else if (s.op === "click") await page.mouse.click(640, 360);
        }
      }
      brain.scanConsoleLogs(screenshotBase64, consoleLogs);
      console.log(`[Step ${step}/${opts.steps}] (${decision.source || brainCfg.provider}) ${act.type} ${act.target || ""} — ${decision.reasoning}`);
      await page.waitForTimeout(220);
    }

    const auditCounts = await page.evaluate(() => ({
      canvases: document.querySelectorAll("canvas").length,
      title: document.title,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 2
    }));

    const summary = {
      target: targetUrl,
      slug: game?.slug || "custom-url",
      provider: brainCfg.provider,
      steps: opts.steps,
      auditCounts,
      consoleErrors: consoleLogs.length,
      bugs: brain.bugs
    };
    console.log("\n=== QA REPORT ===");
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await browser.close();
    if (server) server.close();
  }
}

async function runNativeLoop(opts) {
  const director = new Controllers.NativeGameDirector();
  const profile = Playbooks.resolveGameProfile(opts.native);
  const brainCfg = resolveCliProvider(opts);
  const brain = new BrainMod.AgentBrain({ ...brainCfg, gameRules: profile.goal });
  director.setTarget(opts.native);

  console.log(`Starting native loop for window "${opts.native}" (profile: ${profile.id}, provider: ${brainCfg.provider})`);
  for (let step = 1; step <= opts.steps; step++) {
    const raw = await runPythonInputSim(["screenshot", "-", opts.native]);
    const shot = JSON.parse(raw);
    const dataUrl = `data:image/jpeg;base64,${shot.screenshotBase64}`;
    let decision = null;
    if (brainCfg.provider !== "heuristic" && brainCfg.apiKey) {
      const prompt = Controllers.buildNativeGamePrompt({ profile, recentActions: brain.replayActions.slice(-6).map((r) => r.action) });
      const parsed = Controllers.parseNativeDecision(await brain.callLLM(prompt, dataUrl));
      if (parsed) decision = parsed;
    }
    if (!decision) decision = director.choose(dataUrl);
    const simArgs = Controllers.toInputSimArgs(Controllers.normalizeNativeAction(decision.action));
    if (simArgs) {
      simArgs.push(opts.native);
      await runPythonInputSim(simArgs);
    }
    console.log(`[Native ${step}/${opts.steps}] ${decision.action.type} ${decision.action.target || ""} — ${decision.reasoning}`);
    await new Promise((r) => setTimeout(r, 350));
  }
}

async function runSelfTest() {
  console.log("Running GiveGigsGames Automated Gameplay Tester self-test...");

  // 1. Playbooks & Catalog coverage
  const catalog = loadCatalog();
  assert.ok(catalog.length >= 40, "Catalog has expected games");
  for (const g of catalog) {
    const pb = Playbooks.getGamePlaybook(g.slug, g);
    assert.ok(pb && pb.goal && pb.controls, `Playbook resolved for ${g.slug}`);
  }
  const rules = Playbooks.resolveGameRules({
    slug: "gravegain2dD",
    catalogGame: catalog.find((g) => g.slug === "gravegain2dD"),
    pageScrape: { meta: "One finger parkour runner", link: "", sections: ["Press W to vault"] }
  });
  assert.match(rules.text, /Moonlit|parkour|vault/i);
  assert.equal(Playbooks.resolveGameProfile("Half-Life 2: Episode Two").id, "hl2-ep2");
  assert.equal(Playbooks.resolveGameProfile("Godot Engine").id, "godot");

  // 2. Brain: FoveatedVision, LoopGuard, StuckDetector, AdaptiveTick, BugScanner, OpenRouter 25 Plays
  const crops = BrainMod.FoveatedVision.mergeFocusRequests({
    requested: [{ x: 350, y: 350, w: 200, h: 200, label: "target" }],
    context: { urgency: "high" }
  });
  assert.ok(crops.length >= 2 && crops.length <= 3, "Foveated vision crops clamped <= 3");

  let guard = BrainMod.createLoopGuard();
  for (let i = 0; i < 4; i++) {
    const res = BrainMod.checkLoopGuard(guard, "arrow_right", "djb2-same");
    assert.equal(res.stuck, false);
    guard = res.state;
  }
  const tripped = BrainMod.checkLoopGuard(guard, "arrow_right", "djb2-same");
  assert.equal(tripped.stuck, true, "Loop guard trips on 5th identical decision + unchanged hash");

  const delayCombat = BrainMod.AdaptiveTick.computeNextDelay({
    action: { type: "combo", duration_ms: 600 },
    urgency: "high",
    frameDelta: 2
  });
  const delayMenu = BrainMod.AdaptiveTick.computeNextDelay({
    action: { type: "wait", duration_ms: 400 },
    urgency: "low",
    frameDelta: 0
  });
  assert.ok(delayCombat < delayMenu, "AdaptiveTick schedules combat faster than static menus");

  assert.equal(BrainMod.OPENROUTER_PLAYS.length, 25, "All 25 OpenRouter QA plays ported");
  const coachFallback = BrainMod.fallbackOpenRouterPlay(BrainMod.getPlay("autoplay-coach"), "hp=40");
  assert.equal(JSON.parse(coachFallback).action, "wait");

  const brain = new BrainMod.AgentBrain({ provider: "heuristic", gameRules: rules.text });
  const prompt = BrainMod.buildPrompt(brain, ["[error] sample"], [{ tagName: "BUTTON", id: "start", innerText: "BEGIN RUN", nx: 500, ny: 500 }], false);
  assert.match(prompt, /BRAID/);
  assert.match(prompt, /BEGIN RUN/);
  const decision = await brain.chooseNextAction("data:image/jpeg;base64,AAAA", [{ tagName: "BUTTON", id: "start", innerText: "BEGIN RUN", nx: 500, ny: 500 }], true, ["TypeError: demo error"]);
  assert.equal(decision.action.type, "click");
  assert.ok(brain.bugs.length >= 1, "BugScanner logs console/TypeError bugs");
  const mega = BrainMod.generateMegaPrompt(brain, { slug: "gravegain2dD", title: "GraveGain2dD" }, "ctx.fillRect(0,0,10,10)");
  assert.match(mega, /Game Bug Resolution/);

  // 3. Controllers: Overtake, BotScript, Playbook, NativeGameDirector
  const ov = Controllers.decideOvertake({
    mode: "race",
    playerX: 0,
    nitro: 0.5,
    traffic: [{ x: 0, distanceAhead: 60, kind: "car" }]
  });
  assert.equal(ov.action.type, "hold_keys");
  assert.ok(ov.action.params.keys.includes("arrowleft"), "Overtake steers out of blocked center lane");

  for (const [name, prog] of Object.entries(Controllers.BotScriptEngine.ROBOT_SCRIPT_PRESETS)) {
    const parsed = Controllers.BotScriptEngine.parseRobotProgram(JSON.stringify(prog));
    assert.ok(parsed.rules.length >= 1, `BotScript preset ${name} valid`);
  }
  const chosenRule = Controllers.BotScriptEngine.chooseRobotRule(
    Controllers.BotScriptEngine.ROBOT_SCRIPT_EXAMPLE,
    { enemyNearby: true, resourceNearby: false, unknownNearby: false, healthLow: false, fuelLow: false },
    0
  );
  assert.equal(chosenRule.rule.action, "projectile");

  const pbAct = Controllers.runPlaybookAutoplay({
    slug: "gravegain2dD",
    catalogGame: catalog.find((g) => g.slug === "gravegain2dD"),
    domSnapshot: [{ tagName: "BUTTON", id: "start", innerText: "BEGIN RUN", nx: 500, ny: 550 }],
    stepIndex: 0
  });
  assert.equal(pbAct.action.type, "click");

  const dir = new Controllers.NativeGameDirector();
  dir.setTarget("Half-Life 2: Episode Two");
  const natDec = dir.choose("frameA");
  const simArgs = Controllers.toInputSimArgs(Controllers.normalizeNativeAction(natDec.action));
  assert.ok(Array.isArray(simArgs) && simArgs.length >= 2, "NativeGameDirector emits valid input_sim args");

  // 4. Static Source Auditor + Runtime exports
  const auditRes = auditStaticDirectory(path.join(repoRoot, "games", "gravegain2dD"));
  assert.ok(auditRes.filesScanned >= 1, "Static audit scans game files");
  assert.equal(Runtime.getKeyCode(" "), "Space");

  console.log(`Self-test PASSED (${catalog.length} catalog playbooks, 25 QA plays, 9 BotScript presets, BRAID/Fovea/AdaptiveTick/Reflex/StaticAudit).`);
}

async function main() {
  const opts = parseCli(process.argv);
  if (opts.help) {
    console.log(
      "Usage:\n" +
      "  node scripts/gameplay-tester.mjs --self-test\n" +
      "  node scripts/gameplay-tester.mjs --serve [--port 42069]\n" +
      "  node scripts/gameplay-tester.mjs --game <slug> [--steps 8] [--provider openrouter --api-key ...]\n" +
      "  node scripts/gameplay-tester.mjs --url <https://...> [--steps 8]\n" +
      "  node scripts/gameplay-tester.mjs --native <window-title> [--steps 8]\n" +
      "  node scripts/gameplay-tester.mjs --audit <slug-or-path>"
    );
    return;
  }
  if (opts.selfTest) {
    await runSelfTest();
    return;
  }
  if (opts.audit) {
    const target = fs.existsSync(opts.audit) ? path.resolve(opts.audit) : path.join(repoRoot, "games", opts.audit);
    console.log(JSON.stringify(auditStaticDirectory(target), null, 2));
    return;
  }
  if (opts.serve) {
    const server = createServer();
    server.listen(opts.port, "127.0.0.1", () => {
      console.log(`GiveGigsGames Tester + Bridge running at http://127.0.0.1:${opts.port}/tester/`);
    });
    return;
  }
  if (opts.native) {
    await runNativeLoop(opts);
    return;
  }
  if (opts.game || opts.url) {
    await runPlaywrightTest(opts);
    return;
  }
  await runSelfTest();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
