/* ==========================================================================
 * GiveGigsGames Automated Gameplay Tester - AI Brain & Visual QA Engine
 * Consolidated from 4weird (vcw-debug-play, openrouter-plays, lib/brain/*,
 * adaptive_tick) and CryptArtistStudio (aiGameTester).
 * UMD module: attaches window.GGGBrain in browser, exports in Node.js.
 * ========================================================================== */
(function (root, factory) {
  const api = factory(
    typeof module === "object" && module.exports
      ? require("./playbooks.js")
      : root && root.GGGPlaybooks
  );
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.GGGBrain = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (Playbooks) {
  "use strict";

  const DEBUG_PLAY_DOWNSAMPLE = { width: 640, height: 360 };
  const DEBUG_PLAY_MAX_FRAME_CHARS = 8_000_000;
  const DEBUG_PLAY_LOOP_WINDOW = 5;

  const PROVIDERS = {
    heuristic: {
      id: "heuristic",
      label: "Offline Heuristic / Playbook (No Key)",
      requiresKey: false,
      defaultModel: "heuristic-local",
      defaultEndpoint: ""
    },
    openrouter: {
      id: "openrouter",
      label: "OpenRouter",
      requiresKey: true,
      defaultModel: "openai/gpt-4o-mini",
      defaultEndpoint: "https://openrouter.ai/api/v1/chat/completions"
    },
    openai: {
      id: "openai",
      label: "OpenAI",
      requiresKey: true,
      defaultModel: "gpt-4o-mini",
      defaultEndpoint: "https://api.openai.com/v1/chat/completions"
    },
    gemini: {
      id: "gemini",
      label: "Google Gemini",
      requiresKey: true,
      defaultModel: "gemini-2.5-flash",
      defaultEndpoint: "https://generativelanguage.googleapis.com/v1beta/models"
    },
    deepseek: {
      id: "deepseek",
      label: "DeepSeek",
      requiresKey: true,
      defaultModel: "deepseek-chat",
      defaultEndpoint: "https://api.deepseek.com/chat/completions"
    },
    custom: {
      id: "custom",
      label: "Custom OpenAI-Compatible Endpoint",
      requiresKey: false,
      defaultModel: "gpt-4o-mini",
      defaultEndpoint: "https://api.openai.com/v1/chat/completions"
    },
    local: {
      id: "local",
      label: "Local Ollama / LM Studio",
      requiresKey: false,
      defaultModel: "llava",
      defaultEndpoint: "http://localhost:11434/api/chat"
    }
  };

  function makeId(prefix = "dp") {
    try {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
      }
    } catch (_) {}
    return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
  }

  function scrubSecret(text, secret) {
    let out = String(text || "");
    if (secret && secret.length > 4) {
      out = out.split(secret).join("[REDACTED_KEY]");
    }
    return out;
  }

  // -------------------------------------------------------------------------
  // 1. Frame Downsampling & Hashing
  // -------------------------------------------------------------------------

  function downsamplePlan(
    srcWidth,
    srcHeight,
    maxWidth = DEBUG_PLAY_DOWNSAMPLE.width,
    maxHeight = DEBUG_PLAY_DOWNSAMPLE.height
  ) {
    const w = Math.max(1, Math.floor(srcWidth) || 1);
    const h = Math.max(1, Math.floor(srcHeight) || 1);
    const scale = Math.min(1, maxWidth / w, maxHeight / h);
    return {
      width: Math.max(1, Math.floor(w * scale)),
      height: Math.max(1, Math.floor(h * scale)),
      scale
    };
  }

  function stripDataUrlPrefix(frame) {
    const s = String(frame || "");
    const at = s.indexOf("base64,");
    return at >= 0 ? s.slice(at + "base64,".length) : s;
  }

  function toDataUrl(frame, mime = "image/jpeg") {
    const s = String(frame || "");
    if (!s) return "";
    if (s.startsWith("data:image/")) return s;
    return `data:${mime};base64,${s}`;
  }

  function simpleHash(str) {
    let hash = 0;
    if (!str || str.length === 0) return hash;
    const step = Math.max(1, Math.floor(str.length / 500));
    for (let i = 0; i < str.length; i += step) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  function djb2Hash(dataUrl) {
    const s = String(dataUrl || "");
    let h = 5381;
    const step = s.length > 80_000 ? Math.floor(s.length / 20_000) : 1;
    for (let i = 0; i < s.length; i += step) {
      h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    }
    return `djb2-${(h >>> 0).toString(16).padStart(8, "0")}`;
  }

  let _sharedHashWorker = null;
  let _hashWorkerFailed = false;

  function _getHashWorker() {
    if (_hashWorkerFailed) return null;
    if (_sharedHashWorker) return _sharedHashWorker;
    try {
      if (typeof Worker !== "function" || typeof Blob !== "function" || typeof URL === "undefined") return null;
      const src =
        'onmessage=(e)=>{const s=String(e.data??"");let h=5381;const step=s.length>80000?Math.floor(s.length/20000):1;for(let i=0;i<s.length;i+=step){h=(((h<<5)+h+s.charCodeAt(i))|0)}postMessage("djb2-"+(h>>>0).toString(16).padStart(8,"0"))};';
      _sharedHashWorker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
      return _sharedHashWorker;
    } catch (_) {
      _hashWorkerFailed = true;
      return null;
    }
  }

  function hashFrameAsync(dataUrl) {
    const worker = _getHashWorker();
    if (!worker) return Promise.resolve(djb2Hash(dataUrl));
    return new Promise((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (!done) {
          done = true;
          resolve(djb2Hash(dataUrl));
        }
      }, 1500);
      const onMsg = (e) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        worker.removeEventListener("message", onMsg);
        resolve(typeof e.data === "string" ? e.data : djb2Hash(dataUrl));
      };
      const onErr = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        _hashWorkerFailed = true;
        resolve(djb2Hash(dataUrl));
      };
      worker.addEventListener("message", onMsg, { once: true });
      worker.addEventListener("error", onErr, { once: true });
      try {
        worker.postMessage(dataUrl);
      } catch (_) {
        onErr();
      }
    });
  }

  // -------------------------------------------------------------------------
  // 2. Loop Guard & Stuck Detector
  // -------------------------------------------------------------------------

  function createLoopGuard() {
    return { decisions: [], frameHash: null, repeats: 0 };
  }

  function checkLoopGuard(prev, decision, frameHash) {
    const base = prev || createLoopGuard();
    const norm = String(decision ?? "idle").trim() || "idle";
    const decisions = [...base.decisions, norm].slice(-DEBUG_PLAY_LOOP_WINDOW);
    const lastHash = base.frameHash;
    const sameDecision =
      decisions.length === DEBUG_PLAY_LOOP_WINDOW && decisions.every((d) => d === norm);
    const hashUnchanged =
      frameHash !== null && frameHash !== undefined && lastHash !== null && frameHash === lastHash;
    const repeats =
      base.decisions.length > 0 && base.decisions[base.decisions.length - 1] === norm
        ? base.repeats + 1
        : 1;
    const stuck = sameDecision && hashUnchanged;
    return {
      stuck,
      repeats,
      state: { decisions, frameHash: frameHash ?? lastHash, repeats }
    };
  }

  function quantizeActionSignature(action) {
    if (!action || !action.type) return "none:";
    const target = action.target || "";
    if (typeof target === "string" && target.includes(",")) {
      const parts = target.split(",");
      const x = parseInt(parts[0], 10);
      const y = parseInt(parts[1], 10);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        const qx = Math.round(x / 50) * 50;
        const qy = Math.round(y / 50) * 50;
        return `${action.type}:${qx},${qy}`;
      }
    }
    return `${action.type}:${String(target).slice(0, 40)}`;
  }

  function detectStuckState(brain, screenshotBase64) {
    if (!brain || !Array.isArray(brain.episodes) || brain.episodes.length < 3) return false;
    const recentStatuses = brain.episodes.slice(-3).map((ep) => ep.status);
    if (recentStatuses.some((s) => s === "menu" || s === "game_over" || s === "paused")) {
      return (brain.sameActionStreak || 0) >= 4;
    }
    const currentHash = simpleHash(stripDataUrlPrefix(screenshotBase64));
    const recentHashes = brain.episodes.slice(-3).map((ep) => ep.screenshotHash);
    const visuallyStuck = Boolean(screenshotBase64) && recentHashes.every((h) => h === currentHash);
    const actionLooping = (brain.sameActionStreak || 0) >= 4;
    return visuallyStuck || actionLooping;
  }

  function getStuckRecoveryAction(brain) {
    brain.stuckRecoveryStage = Math.min((brain.stuckRecoveryStage || 0) + 1, 3);
    if (brain._sessionMem) brain._sessionMem.recoveries = (brain._sessionMem.recoveries || 0) + 1;
    switch (brain.stuckRecoveryStage) {
      case 1:
        return { type: "click", target: "500,500", duration_ms: 100 };
      case 2:
        return { type: "press_key", target: "Escape", duration_ms: 100 };
      case 3:
      default:
        brain.stuckRecoveryStage = 0;
        return { type: "refresh", target: "", duration_ms: 100 };
    }
  }

  // -------------------------------------------------------------------------
  // 3. Foveated Vision
  // -------------------------------------------------------------------------

  const FOVEA_MAX_DETAILS = 3;
  const FOVEA_MIN_SIZE = 80;
  const FOVEA_MAX_SIZE = 1000;
  const FOVEA_HIGH_HINTS =
    /fps|shooter|3d|combat|enemy|enemies|boss|firing|fire at|muzzle|damage|hit points|low hp|health low|chase|attack|crosshair|xono|grave|hl2/i;
  const FOVEA_LOW_HINTS =
    /menu|loading|load screen|game over|paused|pause|dialog|inventory|settings|title screen|cutscene|cinematic/i;

  function clampFoveaSize(n) {
    const v = Math.round(Number(n));
    if (!Number.isFinite(v)) return 400;
    return Math.max(FOVEA_MIN_SIZE, Math.min(FOVEA_MAX_SIZE, v));
  }

  function clampFoveaCoord(n) {
    const v = Math.round(Number(n));
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1000, v));
  }

  function finalizeRect(raw) {
    const label = String((raw && raw.label) || "detail").slice(0, 40) || "detail";
    const w = clampFoveaSize(raw && raw.w != null ? raw.w : raw && raw.width);
    const h = clampFoveaSize(raw && raw.h != null ? raw.h : raw && raw.height);
    let x = Number(raw && raw.x);
    let y = Number(raw && raw.y);
    if (!Number.isFinite(x)) x = 500 - w / 2;
    if (!Number.isFinite(y)) y = 500 - h / 2;
    x = Math.max(0, Math.min(1000 - w, Math.round(x)));
    y = Math.max(0, Math.min(1000 - h, Math.round(y)));
    return { x, y, w, h, label };
  }

  function centerRect(size, cx = 500, cy = 500, label = "center") {
    const s = clampFoveaSize(size);
    const half = s / 2;
    return finalizeRect({ x: cx - half, y: cy - half, w: s, h: s, label });
  }

  function rectKey(r) {
    const q = (n) => Math.round(n / 50) * 50;
    return `${q(r.x)},${q(r.y)},${q(r.w)},${q(r.h)}`;
  }

  function defaultFocusRegions({ status = "", reasoning = "", urgency = "", genre = "" } = {}) {
    const text = `${status} ${reasoning} ${genre}`;
    if (FOVEA_LOW_HINTS.test(text) && String(urgency || "").toLowerCase() !== "high") return [];
    if (String(urgency || "").toLowerCase() === "high" || FOVEA_HIGH_HINTS.test(text)) {
      return [
        { ...centerRect(400), label: "center-context" },
        { ...centerRect(220), label: "crosshair-fovea" }
      ];
    }
    return [{ ...centerRect(450), label: "center" }];
  }

  function sanitizeFocusRequests(input, max = FOVEA_MAX_DETAILS) {
    const cap = Math.max(0, Math.min(FOVEA_MAX_DETAILS, Math.round(Number(max) || 0)));
    if (cap === 0) return [];
    const raw = Array.isArray(input)
      ? input
      : Array.isArray(input && input.focus)
        ? input.focus
        : Array.isArray(input && input.detail_requests)
          ? input.detail_requests
          : Array.isArray(input && input.fovea)
            ? input.fovea
            : Array.isArray(input && input.zoom)
              ? input.zoom
              : null;
    if (!raw) return [];
    const seen = new Set();
    const out = [];
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const r = finalizeRect(item);
      if (r.w < FOVEA_MIN_SIZE || r.h < FOVEA_MIN_SIZE) continue;
      const key = rectKey(r);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
      if (out.length >= cap) break;
    }
    return out;
  }

  function parseModelFocus(decision) {
    if (!decision || typeof decision !== "object") return [];
    return sanitizeFocusRequests(
      decision.focus || decision.detail_requests || decision.fovea || decision.zoom || [],
      FOVEA_MAX_DETAILS
    );
  }

  function mergeFocusRequests({ requested = [], context = {}, max = FOVEA_MAX_DETAILS } = {}) {
    const cap = Math.max(0, Math.min(FOVEA_MAX_DETAILS, Math.round(Number(max) || 0)));
    if (cap === 0) return [];
    const clean = sanitizeFocusRequests(requested, cap);
    const merged = [...clean];
    const seen = new Set(merged.map(rectKey));
    for (const d of defaultFocusRegions(context)) {
      if (merged.length >= cap) break;
      const key = rectKey(d);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(d);
    }
    return merged.slice(0, cap);
  }

  function buildFoveaPromptSnippet(detailCount = 0) {
    const n = Math.max(0, Math.min(FOVEA_MAX_DETAILS, Math.round(Number(detailCount) || 0)));
    const extra = n > 0
      ? ` This tick you also get ${n} detail crop(s) after the overview (labeled: ${Array.from({ length: n }, (_, i) => `crop${i + 1}`).join(", ")}; high-res zooms).`
      : "";
    return (
      `FOVEATED VISION: image 1 is a compact full-screen overview. ` +
      `You may request up to ${FOVEA_MAX_DETAILS} detail crops for the NEXT tick via ` +
      `"focus": [{"x":300,"y":300,"w":400,"h":400,"label":"center"}] (0-1000 normalized, min 80x80). ` +
      `Omit "focus" on static menus.${extra}`
    );
  }

  function describeFrameForPrompt(details = []) {
    if (!Array.isArray(details) || !details.length) return "";
    return details
      .map((d, i) => {
        const r = d && d.rect ? d.rect : d;
        const label = String((d && d.label) || (r && r.label) || `crop${i + 1}`).slice(0, 40);
        const x = clampFoveaCoord(r && r.x);
        const y = clampFoveaCoord(r && r.y);
        const w = clampFoveaSize(r && (r.w || r.width));
        const h = clampFoveaSize(r && (r.h || r.height));
        return `crop${i + 1} "${label}" = overview rect [x=${x},y=${y},w=${w},h=${h}] (0-1000)`;
      })
      .join("; ");
  }

  function estimateFrameBudget({ overview = "", details = [] } = {}) {
    const over = typeof overview === "string" ? overview.length : 0;
    const list = Array.isArray(details) ? details : [];
    const detBytes = list.reduce((a, d) => {
      const b = typeof d === "string" ? d.length : d && d.base64 ? d.base64.length : 0;
      return a + (Number.isFinite(b) ? b : 0);
    }, 0);
    return {
      overviewBytes: over,
      detailBytes: detBytes,
      totalBytes: over + detBytes,
      detailCount: list.length,
      estTokens: Math.round((over + detBytes) / 12)
    };
  }

  const FoveatedVision = {
    MAX_DETAILS: FOVEA_MAX_DETAILS,
    MIN_SIZE: FOVEA_MIN_SIZE,
    centerRect,
    finalizeRect,
    defaultFocusRegions,
    sanitizeFocusRequests,
    parseModelFocus,
    mergeFocusRequests,
    buildFoveaPromptSnippet,
    describeFrameForPrompt,
    estimateFrameBudget
  };

  // -------------------------------------------------------------------------
  // 4. Adaptive Tick Planner
  // -------------------------------------------------------------------------

  const TICK_MIN_DELAY_MS = 120;
  const TICK_MAX_DELAY_MS = 2500;
  const TICK_HIGH_HINTS =
    /combat|enemy|enemies|boss|firing|fire at|muzzle|damage|hit points|low hp|health low|chase|attack/i;
  const TICK_LOW_HINTS =
    /menu|loading|load screen|game over|paused|pause|dialog|inventory|settings|title screen|cutscene|cinematic/i;

  function clampDelay(ms) {
    if (!Number.isFinite(ms)) return 650;
    return Math.max(TICK_MIN_DELAY_MS, Math.min(TICK_MAX_DELAY_MS, Math.round(ms)));
  }

  function classifyUrgency({ status = "", reasoning = "", urgency = "" } = {}) {
    const explicit = String(urgency || "").toLowerCase();
    if (explicit === "high" || explicit === "low" || explicit === "normal") return explicit;
    const text = `${status} ${reasoning}`;
    if (TICK_HIGH_HINTS.test(text)) return "high";
    if (TICK_LOW_HINTS.test(text)) return "low";
    const s = String(status || "").toLowerCase();
    if (s === "combat") return "high";
    if (s === "menu" || s === "loading" || s === "game_over" || s === "dead" || s === "stuck") return "low";
    return "normal";
  }

  function frameDeltaLevel(prev, curr) {
    if (!prev || !curr) return 1;
    if (prev.hash !== undefined || curr.hash !== undefined) {
      if (prev.hash === curr.hash) {
        const lenA = prev.bytes || 0;
        const lenB = curr.bytes || 0;
        if (lenA && lenB && Math.abs(lenA - lenB) / Math.max(lenA, lenB) > 0.05) return 1;
        return 0;
      }
      const lenA = prev.bytes || 0;
      const lenB = curr.bytes || 0;
      if (lenA && lenB && Math.abs(lenA - lenB) / Math.max(lenA, lenB) > 0.15) return 2;
      return 1;
    }
    if (prev === curr) return 0;
    const lenA = String(prev).length;
    const lenB = String(curr).length;
    if (lenA && lenB && Math.abs(lenA - lenB) / Math.max(lenA, lenB) > 0.15) return 2;
    return 1;
  }

  function baseDelayForAction(action = {}) {
    const dur = Math.max(0, Number(action.duration_ms) || 0);
    switch (action.type) {
      case "combo":
        return (dur || 600) + 120;
      case "hold_keys":
      case "hold_key":
        return (dur || 400) + 150;
      case "wait":
        return dur || 300;
      case "refresh":
        return 1500;
      case "click":
      case "right_click":
      case "double_click":
      case "press_key":
        return 220;
      case "move_mouse":
      case "drag_look":
      case "wheel":
      case "scroll":
        return 180;
      case "type_text":
        return 600;
      case "bot_control":
        return 250;
      default:
        return 650;
    }
  }

  function computeNextDelay({
    action = {},
    status = "",
    reasoning = "",
    urgency = "",
    llmDelay = NaN,
    execMs = 0,
    frameDelta = 1,
    stuck = false
  } = {}) {
    const level = classifyUrgency({ status, reasoning, urgency });
    let delay = baseDelayForAction(action);
    if (level === "high") delay = Math.max(220, delay * 0.55);
    else if (level === "low") delay = Math.min(TICK_MAX_DELAY_MS, delay * 1.8);
    if (frameDelta >= 2 && level === "high") delay -= 100;
    if (frameDelta === 0 && level === "low") delay += 400;
    if (frameDelta === 0 && level === "normal") delay += 150;

    let llm = Number(llmDelay);
    if (Number.isFinite(llm) && llm > 0) {
      if (level === "high") llm = Math.min(llm, 600);
      else if (level === "low") llm = Math.max(llm, 900);
      delay = delay * 0.7 + clampDelay(llm) * 0.3;
    }
    if (stuck) delay = Math.min(delay, 500);
    delay -= Math.max(0, Number(execMs) || 0);
    return clampDelay(delay);
  }

  function midProbePlan(action = {}) {
    const dur = Number(action.duration_ms) || 0;
    const longType =
      action.type === "combo" ||
      action.type === "hold_keys" ||
      action.type === "hold_key" ||
      action.type === "wait";
    if (!longType || dur < 600) return { probe: false, probeDelayMs: 0 };
    return { probe: true, probeDelayMs: Math.min(400, Math.round(dur / 2)) };
  }

  function shouldProbeMidAction(action = {}) {
    return midProbePlan(action).probe;
  }

  function screenshotBudget(urgency = "normal") {
    if (urgency === "low") return { width: 320, quality: 35 };
    return { width: 448, quality: 45 };
  }

  const AdaptiveTick = {
    MIN_DELAY_MS: TICK_MIN_DELAY_MS,
    MAX_DELAY_MS: TICK_MAX_DELAY_MS,
    classifyUrgency,
    frameDeltaLevel,
    baseDelayForAction,
    computeNextDelay,
    midProbePlan,
    shouldProbeMidAction,
    screenshotBudget
  };

  // -------------------------------------------------------------------------
  // 5. Bug Scanner
  // -------------------------------------------------------------------------

  const MAX_BUGS = 100;
  const BUG_REFIRE_COOLDOWN_MS = 5 * 60 * 1000;
  const BENIGN_PATTERNS = [
    "Electron Security Warning",
    "Content Security Policy",
    "compute-pressure",
    "Permissions policy violation",
    "Blocked a frame with origin",
    "Failed to read a named property 'href' from 'Location'",
    "Protocols, domains, and ports must match",
    "ResizeObserver loop",
    "third-party cookie",
    "Third-party cookie",
    "favicon.ico",
    "net::ERR_BLOCKED_BY_CLIENT",
    "net::ERR_ABORTED",
    "chrome-extension://",
    "Unrecognized feature:",
    "websocket was closed",
    "WebSocket connection",
    "/_vercel/insights/",
    "/api/game-analytics"
  ];
  const SELF_ALARM_MARKER = "CRASH / EXCEPTION BUG IDENTIFIED";

  function isBenignNoise(msg) {
    if (!msg) return false;
    return BENIGN_PATTERNS.some((p) => String(msg).includes(p));
  }

  function normalizeSignature(msg) {
    return String(msg || "")
      .replace(/^\[\d{1,2}:\d{2}(:\d{2})?\]\s*/, "")
      .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?\b/g, "<ts>")
      .replace(/\b\d+,\d+\b/g, "<xy>")
      .replace(/\b\d+(\.\d+)?(px|ms|s)?\b/g, "<n>")
      .slice(0, 150);
  }

  function scanForBugs(brain, screenshotBase64, consoleLogs) {
    const beforeCount = brain.bugs.length;
    const now = Date.now();
    if (!brain._bugSigTimes) brain._bugSigTimes = {};
    const errorLogs = (consoleLogs || []).filter((log) => {
      const msg = typeof log === "string" ? log : log.message || log.text || "";
      if (isBenignNoise(msg)) return false;
      if (msg.includes(SELF_ALARM_MARKER)) return false;
      if (typeof log === "string") {
        const lower = log.toLowerCase();
        return (
          lower.includes("error") ||
          lower.includes("exception") ||
          lower.includes("failed to load") ||
          lower.includes("[4weird-site-audit]") ||
          lower.includes("[ggg-audit]")
        );
      }
      return (
        log.level === 3 ||
        log.level === "error" ||
        (msg &&
          (msg.includes("Error") ||
            msg.includes("exception") ||
            msg.includes("TypeError") ||
            msg.includes("ReferenceError")))
      );
    });

    if (errorLogs.length > 0) {
      const lastErr = errorLogs[errorLogs.length - 1];
      const msg = typeof lastErr === "string" ? lastErr : lastErr.message || lastErr.text || "";
      const signature = normalizeSignature(msg);
      const lastFiled = brain._bugSigTimes[signature] || 0;
      if (now - lastFiled < BUG_REFIRE_COOLDOWN_MS) return false;
      brain._bugSigTimes[signature] = now;

      const shotDataUrl = screenshotBase64 ? toDataUrl(screenshotBase64) : "";
      const bugEntry = {
        id: makeId("bug"),
        timestamp: new Date().toISOString(),
        type: "Console Error",
        title: signature.slice(0, 100),
        description: signature,
        severity: "high",
        consoleLogs: errorLogs
          .slice(-5)
          .map((l) => (typeof l === "string" ? l : l.message || l.text || "").slice(0, 300)),
        screenshot: shotDataUrl,
        screenshotBytes: typeof screenshotBase64 === "string" ? screenshotBase64.length : 0,
        actionTakenBeforeBug: (brain.replayActions || []).slice(-3)
      };

      const isDuplicate = brain.bugs.some((b) => b.description === bugEntry.description);
      if (!isDuplicate) {
        brain.bugs.push(bugEntry);
        while (brain.bugs.length > MAX_BUGS) brain.bugs.shift();
        if (brain.sessionStats) brain.sessionStats.bugsFound++;
      }
    }
    return brain.bugs.length > beforeCount;
  }

  const BugScanner = {
    BENIGN_PATTERNS,
    isBenignNoise,
    normalizeSignature,
    scanForBugs
  };

  // -------------------------------------------------------------------------
  // 6. BRAID Prompt Builder, Mega-Prompt & Code Fixer
  // -------------------------------------------------------------------------

  function buildPrompt(brain, consoleLogs, domSnapshot, isStuck, audioContext = null, visionContext = null) {
    const includeMemory = (brain.config && brain.config.alwaysSendMemory) || isStuck;
    const sessionSummary = typeof brain.getSessionSummary === "function" ? brain.getSessionSummary() : "";

    const compactDom = (domSnapshot || []).slice(0, 40).map((el) => {
      const parts = [el.tagName];
      if (el.id) parts.push(`#${el.id}`);
      if (el.className) {
        const firstClass = String(el.className).split(" ")[0];
        if (firstClass) parts.push(`.${firstClass}`);
      }
      const text = el.innerText || el.placeholder;
      if (text) parts.push(`("${String(text).replace(/"/g, "'")}")`);
      if (Number.isFinite(el.nx) && Number.isFinite(el.ny)) {
        parts.push(`@${el.nx},${el.ny}`);
      } else if (el.rect) {
        parts.push(`[${el.rect.left},${el.rect.top},${el.rect.width},${el.rect.height}]`);
      }
      return parts.join("");
    });

    const compactLogs = (consoleLogs || []).slice(-10).map((log) => {
      if (typeof log === "string") return log.slice(0, 120);
      const level = log.level || "info";
      const msg = log.message || log.text || "";
      return `[${level}] ${String(msg).slice(0, 120)}`;
    });

    let memoryBlock = "";
    if (includeMemory && brain.episodes && brain.episodes.length > 0) {
      const recentEps = brain.episodes.slice(-5);
      const epLines = recentEps
        .map(
          (ep, i) =>
            `  Step -${recentEps.length - i}: [${ep.status}] ${ep.action.type} -> ${ep.action.target || "N/A"} | path: ${JSON.stringify(ep.reasoning_path || ep.reasoning || "")}`
        )
        .join("\n");
      memoryBlock = `\n## MEMORY - Recent Episode History (last ${recentEps.length} steps)\n${epLines}${sessionSummary ? `\nSession stats: ${sessionSummary}` : ""}\n`;
    } else if (sessionSummary && isStuck) {
      memoryBlock = `\n## SESSION STATS\n${sessionSummary}\n`;
    }

    const stuckBlock = isStuck
      ? `\n## STUCK WARNING\nThe game state has not changed. Recovery stage: ${brain.stuckRecoveryStage || 0}/3.\nTake a RECOVERY action: click center/start button, Escape, or refresh.\n`
      : "";

    const audioBlock = audioContext ? `\n${typeof audioContext === "string" ? audioContext : JSON.stringify(audioContext)}\n` : "";

    const foveaOn = !brain.config || brain.config.foveatedVision !== false;
    const visionMeta = visionContext || (brain && brain._lastVisionMeta) || null;
    const detailCount = visionMeta && Array.isArray(visionMeta.details) ? visionMeta.details.length : 0;
    let foveaBlock = "";
    if (foveaOn) {
      const mapping =
        detailCount > 0
          ? `\nFRAME MAP: overview is full screen (0-1000). ${describeFrameForPrompt(visionMeta.details)}`
          : "";
      foveaBlock = `\n## ${buildFoveaPromptSnippet(detailCount)}${mapping}\n`;
    }

    const role =
      !brain.config || brain.config.generalizedIntelligence !== false
        ? "You are a general-purpose interactive-systems and gameplay QA investigator. This may be a GiveGigs Game, an arbitrary web game, or a native desktop game program. Observe visible evidence, run one reversible interaction or combo, and report bugs."
        : "You are an expert AI game QA testing agent.";

    const gameRules =
      (brain.config && brain.config.gameRules) ||
      (Playbooks && Playbooks.FALLBACK_RULES) ||
      "Explore the game: find buttons, play, maximize score, look for bugs/errors.";

    return `## ROLE & DECISION ENGINE (BRAID)
${role} Traverse the Bounded Reasoning Graph (BRAID):

Graph:
(S) Start -> Check if Game Over / Menu?
  ├─ [Yes] ──> (R_RESTART) Click Start/Play/Restart button or press Enter/Space
  └─ [No] ───> Check if Stuck/Looping?
        ├─ [Yes] ──> (R_RECOVER) Execute recovery action (Escape, click center, refresh)
        └─ [No] ────> Check Console Logs or Visuals for high-severity bugs?
              ├─ [Yes] ──> (R_BUG) Flag bug_report and test recovery
              └─ [No] ────> Check if interactive DOM has active controls?
                    ├─ [Yes] ──> (R_MENU) Click relevant menu/HUD control
                    └─ [No] ────> (R_PLAY) Play actively via keyboard/mouse/combo

## OBSERVATION
Console Logs (last 10):
${compactLogs.length ? compactLogs.join("\n") : "(none)"}

Interactive DOM (up to 40, @nx,ny is 0-1000 normalized):
${compactDom.length ? compactDom.join("\n") : "(canvas-only or external target)"}
${stuckBlock}${memoryBlock}${audioBlock}${foveaBlock}
## GOAL - Game Objective & Rules
${gameRules}

## TASK
Respond ONLY with a valid JSON object matching this exact schema:
{
  "status": "menu | playing | game_over | stuck | unknown",
  "reasoning": "concise 1-sentence summary of what you see and why you picked this input",
  "reasoning_path": ["S", "No", "No", "No", "R_PLAY"],
  "focus": [{"x": 300, "y": 300, "w": 400, "h": 400, "label": "center"}],
  "urgency": "low | normal | high",
  "action": {
    "type": "combo | click | right_click | double_click | press_key | hold_key | hold_keys | move_mouse | drag_look | wheel | type_text | scroll | wait | refresh",
    "target": "'x,y' on 0-1000 scale or CSS selector for click; key name for press_key/hold_key; comma keys like 'w,shift' for hold_keys; 'dx,dy' for drag_look; text for type_text; 'up'/'down' for scroll",
    "duration_ms": 200,
    "params": {}
  },
  "next_delay_ms": 1200,
  "bug_report": {
    "has_bug": false,
    "severity": "cosmetic | warning | critical",
    "title": "",
    "description": "",
    "suggestedFixDiff": ""
  }
}`;
  }

  function generateMegaPrompt(brain, gameInfo = {}, sourceSnippet = "") {
    const bugs = (brain && brain.bugs) || [];
    const replays = (brain && brain.replayActions) || [];
    const bugReportsMarkdown = bugs.length
      ? bugs
          .map((b, idx) => {
            const logsStr = Array.isArray(b.consoleLogs) && b.consoleLogs.length
              ? b.consoleLogs.map((l) => (typeof l === "string" ? l : l.message || l.text || "")).join("\n")
              : "None";
            return `#### Bug #${idx + 1} [${String(b.severity || "high").toUpperCase()}] ${b.title || b.type || ""}
- **Timestamp**: ${b.timestamp || ""}
- **Description**: ${b.description}
- **Actions Leading Up**: ${JSON.stringify(b.actionTakenBeforeBug || [])}
- **Errors/Console**:
\`\`\`
${logsStr}
\`\`\``;
          })
          .join("\n\n")
      : "No bugs explicitly flagged during the session.";

    return `# Game Bug Resolution & QA Task

You are an expert game developer debugging "${gameInfo.title || gameInfo.slug || "Target Game"}".

## Game Context
- **Slug / Target**: ${gameInfo.slug || gameInfo.url || "custom"}
- **Runtime / Mode**: ${gameInfo.runtimeType || "web"}
- **Recent Playtest Actions (last 20)**:
\`\`\`json
${JSON.stringify(replays.slice(-20), null, 2)}
\`\`\`

## Logged Bugs & Glitches (${bugs.length})
${bugReportsMarkdown}

## Source / Notes Context
${sourceSnippet ? `\`\`\`\n${String(sourceSnippet).slice(0, 8000)}\n\`\`\`` : "_No source snippet provided._"}

## Instructions
1. Review the logged bugs, replay actions, and console traces above.
2. Locate logic errors, layout clipping, missing event boundaries, or WebGL/audio failures.
3. Propose minimal, targeted fixes and verify gameplay runs cleanly without regressions.
`;
  }

  // -------------------------------------------------------------------------
  // 7. 25 OpenRouter QA Plays (from 4weird/v2/vcw4w/lib/openrouter-plays.ts)
  // -------------------------------------------------------------------------

  const cleanPlayInput = (v, max = 800) =>
    String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max) || "(no input provided)";

  const OPENROUTER_PLAYS = [
    {
      id: "autoplay-coach",
      title: "Autoplay Coach",
      category: "game",
      blurb: "Telemetry snapshot -> next playtest action JSON.",
      voiceBackend: "none",
      system:
        'You coach automated gameplay testing. Output JSON only: {"action":"click|move|wait|report","detail":"...","why":"..."}. One action, safe, reversible.',
      userPrompt: (i) => `Telemetry: ${cleanPlayInput(i)}.`,
      maxTokens: 160
    },
    {
      id: "bug-bard",
      title: "Bug Bard",
      category: "chaos",
      blurb: "Bug report -> 4-line poem + 1-line practical debugging hint.",
      voiceBackend: "browser-speech",
      system:
        "You are the bug bard. Output a 4-line rhyming poem about the bug, then HINT: (one practical debugging next step). Kind, no blame.",
      userPrompt: (i) => `Bug: ${cleanPlayInput(i)}.`,
      maxTokens: 200
    },
    {
      id: "tutorial-ghost",
      title: "Tutorial Ghost",
      category: "game",
      blurb: "One gentle next-step tip that never spoils the puzzle.",
      voiceBackend: "browser-speech",
      system:
        "You are the tutorial ghost. One gentle next-step tip in 2 sentences max. Hint, never the full solution. Encourage.",
      userPrompt: (i) => `Player is stuck at: ${cleanPlayInput(i, 600)}.`,
      maxTokens: 140
    },
    {
      id: "accessibility-describer",
      title: "Accessibility Describer",
      category: "game",
      blurb: "Screen text -> clear 2-sentence audio-description script.",
      voiceBackend: "browser-speech",
      system:
        "You write audio-description scripts. 2 clear sentences describing layout then action. Plain words, no jargon, no guessing beyond the input.",
      userPrompt: (i) => `Screen text: ${cleanPlayInput(i)}.`,
      maxTokens: 160
    },
    {
      id: "voice-command-parser",
      title: "Voice Command Parser",
      category: "voice",
      blurb: "Turns a spoken transcript into safe game-action JSON.",
      voiceBackend: "none",
      system:
        'You parse voice commands into JSON only: {"action":"move|jump|attack|pause|none","target":"...","confidence":0-1}. No prose. If unclear, action="none".',
      userPrompt: (i) => `Transcript: "${cleanPlayInput(i, 400)}"`,
      maxTokens: 120
    },
    {
      id: "npc-barks",
      title: "NPC Bark Generator",
      category: "voice",
      blurb: "3 short in-game voice lines (idle / alert / KO) for any NPC.",
      voiceBackend: "browser-speech",
      system:
        "You write game NPC voice lines. Output exactly 3 numbered lines under 14 words each for IDLE, ALERT, KNOCKED-OUT.",
      userPrompt: (i) => `NPC + scene: ${cleanPlayInput(i)}.`,
      maxTokens: 160
    },
    {
      id: "hype-caster",
      title: "Hype Caster",
      category: "voice",
      blurb: "30-second streamer play-by-play for a score event.",
      voiceBackend: "browser-speech",
      system:
        "You are an arena hype caster. 3-4 shouted sentences, hype but clean, end with one fair tip.",
      userPrompt: (i) => `Call this moment: ${cleanPlayInput(i, 600)}.`,
      maxTokens: 200
    },
    {
      id: "cozy-narrator",
      title: "Cozy Narrator",
      category: "voice",
      blurb: "Calm lore read for cozy story scenes.",
      voiceBackend: "browser-speech",
      system: "You narrate game lore like a calm bedtime story. 4-6 slow sentences, gentle, warm.",
      userPrompt: (i) => `Tell the cozy lore of: ${cleanPlayInput(i, 600)}.`,
      maxTokens: 220
    },
    {
      id: "villain-monologue",
      title: "Villain Monologue",
      category: "voice",
      blurb: "Boss taunt + one fair counter-tactic.",
      voiceBackend: "browser-speech",
      system:
        "You are a clearly fictional game boss taunting over the radio in 3 sentences, then give ONE fair counter-tactic.",
      userPrompt: (i) => `Boss + arena: ${cleanPlayInput(i, 600)}.`,
      maxTokens: 200
    },
    {
      id: "multilingual-dub",
      title: "Multilingual Dub",
      category: "voice",
      blurb: "One line dubbed into ES / FR / DE / JA for localization testing.",
      voiceBackend: "none",
      system:
        "You are a dub script writer. Output 4 lines labelled ES:, FR:, DE:, JA: - each a natural localized game translation under 20 words.",
      userPrompt: (i) => `Dub this line: ${cleanPlayInput(i, 300)}.`,
      maxTokens: 200
    },
    {
      id: "robot-sidekick",
      title: "Robot Sidekick Script",
      category: "voice",
      blurb: "Bleepy companion lines with [pause] pacing marks.",
      voiceBackend: "browser-speech",
      system: "You write a cute robot sidekick. 3 lines, each with one [pause] or [beep] mark, under 16 words.",
      userPrompt: (i) => `Robot reacts to: ${cleanPlayInput(i, 600)}.`,
      maxTokens: 160
    },
    {
      id: "sfx-smith",
      title: "SFX Prompt Smith",
      category: "voice",
      blurb: "Writes text-to-SFX prompts (<sound> + <material> + <space> + <duration>).",
      voiceBackend: "none",
      system: "Output 3 SFX prompts, each: <sound> + <material> + <space> + <duration>. Under 25 words each.",
      userPrompt: (i) => `Need SFX for: ${cleanPlayInput(i, 600)}.`,
      maxTokens: 180
    },
    {
      id: "dungeon-master",
      title: "AI Dungeon Master",
      category: "game",
      blurb: "One DM turn: scene + 2 choices, never spoils the exit.",
      voiceBackend: "browser-speech",
      system: "You are a dungeon master. 3 sentences of scene + exactly 2 numbered choices.",
      userPrompt: (i) => `Party state: ${cleanPlayInput(i)}.`,
      maxTokens: 220
    },
    {
      id: "quest-crafter",
      title: "Quest Crafter",
      category: "game",
      blurb: "GOAL + 3 numbered OBJECTIVES + REWARD from one theme.",
      voiceBackend: "none",
      system: "Output: GOAL (1 line), 3 numbered OBJECTIVES, REWARD (1 line).",
      userPrompt: (i) => `Quest theme: ${cleanPlayInput(i, 300)}.`,
      maxTokens: 220
    },
    {
      id: "loadout-dj",
      title: "Loadout DJ",
      category: "game",
      blurb: "Build suggestion + walk-up announcer script.",
      voiceBackend: "browser-speech",
      system: "Output BUILD: (3 items), then ANNOUNCE: (2 hype sentences).",
      userPrompt: (i) => `Game + playstyle: ${cleanPlayInput(i, 500)}.`,
      maxTokens: 220
    },
    {
      id: "rival-mind-reader",
      title: "Rival Mind Reader",
      category: "game",
      blurb: "Predicts rival's next move from history + one counter.",
      voiceBackend: "none",
      system: "Output PREDICTION: (1 line with % confidence), COUNTER: (1 fair tactic).",
      userPrompt: (i) => `Rival history: ${cleanPlayInput(i)}.`,
      maxTokens: 160
    },
    {
      id: "postmatch-roast",
      title: "Post-Match Roast + Pep",
      category: "game",
      blurb: "2-line friendly roast + genuine encouragement from a score.",
      voiceBackend: "browser-speech",
      system: "Line 1: playful roast of the score. Line 2: genuine pep talk + one tip. 2 lines total.",
      userPrompt: (i) => `Match result: ${cleanPlayInput(i, 500)}.`,
      maxTokens: 160
    },
    {
      id: "crossover-mashup",
      title: "Crossover Mashup",
      category: "game",
      blurb: "Fuse two arcade games into one new mode pitch.",
      voiceBackend: "none",
      system: "Output TITLE: (1 line), HOOK: (1 line), RULES: (3 bullets).",
      userPrompt: (i) => `Fuse: ${cleanPlayInput(i, 400)}.`,
      maxTokens: 220
    },
    {
      id: "trash-talk-royale",
      title: "Trash-Talk Royale Announcer",
      category: "chaos",
      blurb: "Friendly battle-royale arena callouts.",
      voiceBackend: "browser-speech",
      system: "3 hype callouts, silly not mean, end with crowd cheer line.",
      userPrompt: (i) => `Lobby moment: ${cleanPlayInput(i, 600)}.`,
      maxTokens: 200
    },
    {
      id: "meme-oracle",
      title: "Meme Oracle (for fun)",
      category: "chaos",
      blurb: "Silly lobby fortune (entertainment only).",
      voiceBackend: "browser-speech",
      system: "2 silly sentences + LUCKY ITEM: (1 funny item). Entertainment only.",
      userPrompt: (i) => `Question: ${cleanPlayInput(i, 400)}.`,
      maxTokens: 140
    },
    {
      id: "dream-glitch",
      title: "Dream Glitch Sequencer",
      category: "chaos",
      blurb: "3 surreal level modifiers that keep the level beatable.",
      voiceBackend: "none",
      system: "3 numbered modifiers, surreal yet beatable and reversible.",
      userPrompt: (i) => `Level theme: ${cleanPlayInput(i, 500)}.`,
      maxTokens: 200
    },
    {
      id: "cheat-poet",
      title: "Cheat-Code Poet",
      category: "chaos",
      blurb: "Turns debug/cheat flags into lore-safe riddle hints.",
      voiceBackend: "none",
      system: "2-line riddle hinting at the mechanic without raw exploit instructions.",
      userPrompt: (i) => `Cheat/level: ${cleanPlayInput(i, 500)}.`,
      maxTokens: 140
    },
    {
      id: "clan-herald",
      title: "Clan Herald",
      category: "chaos",
      blurb: "Clan message -> epic 3-sentence proclamation.",
      voiceBackend: "browser-speech",
      system: "Rewrite as an epic 3-sentence proclamation.",
      userPrompt: (i) => `Clan news: ${cleanPlayInput(i, 600)}.`,
      maxTokens: 180
    },
    {
      id: "shopkeeper-haggle",
      title: "Shopkeeper Haggle",
      category: "chaos",
      blurb: "In-character price haggle landing on a fair deal.",
      voiceBackend: "browser-speech",
      system: "3 lines of cheeky haggling in-character, then DEAL: (fair price).",
      userPrompt: (i) => `Item + offer: ${cleanPlayInput(i, 500)}.`,
      maxTokens: 180
    },
    {
      id: "lorekeeper",
      title: "Lorekeeper",
      category: "chaos",
      blurb: "3 keywords -> 5-sentence game-bible entry.",
      voiceBackend: "none",
      system: "5 sentences max: origin, quirk, rivalry, motto, open mystery.",
      userPrompt: (i) => `Keywords: ${cleanPlayInput(i, 300)}.`,
      maxTokens: 220
    }
  ];

  function getPlay(id) {
    const key = String(id ?? "").trim().toLowerCase();
    return OPENROUTER_PLAYS.find((p) => p.id === key);
  }

  function isPlayId(value) {
    return getPlay(value) !== undefined;
  }

  function fallbackOpenRouterPlay(play, input) {
    const snippet = cleanPlayInput(input, 140);
    switch (play.id) {
      case "voice-command-parser":
        return `{"action":"none","target":"","confidence":0.0}`;
      case "autoplay-coach":
        return `{"action":"wait","detail":"observe one more frame","why":"offline fallback; no live API key configured"}`;
      case "multilingual-dub":
        return `ES: ${snippet}\nFR: ${snippet}\nDE: ${snippet}\nJA: ${snippet}`;
      case "sfx-smith":
        return `1. soft UI click, plastic, small room, 0.5s\n2. deep dungeon thud, stone, large cave, 1.2s\n3. bright coin shimmer, metal, close-up, 0.8s`;
      case "bug-bard":
        return `A sprite took flight beyond the wall,\nThe console wept a stacktrace call,\nWe caught the state upon the floor,\nNow guard the bounds forevermore.\nHINT: Check the latest console error and replay timeline around "${snippet}".`;
      default:
        return `[offline ${play.id}] No API key configured — local offline take on "${snippet}". Add a self-inputted API key in Auto-Tester settings for live AI generation.`;
    }
  }

  // -------------------------------------------------------------------------
  // 8. Multi-Provider LLM Caller + Fail-Open Heuristics
  // -------------------------------------------------------------------------

  function toNormalizedTarget(el) {
    if (Number.isFinite(el.nx) && Number.isFinite(el.ny)) {
      return `${Math.round(el.nx)},${Math.round(el.ny)}`;
    }
    if (el.id) return `#${el.id}`;
    if (el.innerText) return String(el.innerText).slice(0, 30);
    return el.tagName || "";
  }

  let _fallbackCalls = 0;

  function runHeuristicFallback(consoleLogs, domSnapshot, brain = null) {
    _fallbackCalls += 1;
    const callCount = _fallbackCalls;

    if (callCount % 9 === 0) {
      const keys = ["Tab", "Enter", "ArrowDown", "Space"];
      const key = keys[Math.floor(callCount / 9) % keys.length];
      return {
        status: "exploring",
        reasoning: "Offline heuristic (no API key): keyboard probe to exercise game controls.",
        reasoning_path: ["S", "No", "No", "No", "R_PLAY"],
        action: { type: "press_key", target: key, duration_ms: 150 },
        next_delay_ms: 850,
        bug_report: { has_bug: false }
      };
    }

    if (callCount % 5 === 0) {
      return {
        status: "exploring",
        reasoning: "Offline heuristic: probing primary action / scroll.",
        reasoning_path: ["S", "No", "No", "No", "R_PLAY"],
        action: { type: "press_key", target: " ", duration_ms: 150 },
        next_delay_ms: 850,
        bug_report: { has_bug: false }
      };
    }

    if (domSnapshot && domSnapshot.length > 0) {
      const clickables = domSnapshot.filter((el) =>
        ["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA", "CANVAS"].includes(el.tagName)
      );
      const pool = clickables.length > 0 ? clickables : domSnapshot;
      // Prefer obvious start/play/deploy/begin/continue buttons on first sight
      const startPriority = pool.find((el) => {
        const text = `${el.innerText || ""} ${el.id || ""}`.toLowerCase();
        return /\b(start|play|begin|launch|deploy|continue|resume|retry|try again)\b/.test(text);
      });
      const lastTarget = brain ? brain._lastHeuristicTarget : null;
      let pick = null;
      if (startPriority && toNormalizedTarget(startPriority) !== lastTarget) {
        pick = startPriority;
      } else {
        const cursor = brain && Number.isFinite(brain._heuristicCursor) ? brain._heuristicCursor : 0;
        for (let i = 0; i < pool.length; i++) {
          const candidate = pool[(cursor + i) % pool.length];
          const target = toNormalizedTarget(candidate);
          if (target && target !== lastTarget) {
            pick = candidate;
            if (brain) {
              brain._heuristicCursor = (cursor + i + 1) % pool.length;
              brain._lastHeuristicTarget = target;
            }
            break;
          }
        }
        if (!pick) pick = pool[cursor % pool.length];
      }
      const target = toNormalizedTarget(pick);
      if (brain) brain._lastHeuristicTarget = target;
      const label = pick.innerText || pick.id || pick.tagName;
      return {
        status: pick.tagName === "CANVAS" ? "playing" : "exploring",
        reasoning: `Offline heuristic: interacting with ${pick.tagName} "${String(label).slice(0, 40)}" (${pool.indexOf(pick) + 1}/${pool.length}).`,
        reasoning_path: ["S", "No", "No", "Yes", "R_MENU"],
        action: { type: "click", target, duration_ms: 180 },
        next_delay_ms: 800,
        bug_report: { has_bug: false }
      };
    }

    const keys =
      (brain && brain.config && Array.isArray(brain.config.preferredKeys) && brain.config.preferredKeys.length
        ? brain.config.preferredKeys
        : [" ", "ArrowRight", "ArrowUp", "w", "d", "a", "s"]);
    const key = keys[callCount % keys.length];
    return {
      status: "exploring",
      reasoning: `Offline heuristic: probing key "${key}" (no DOM controls detected).`,
      reasoning_path: ["S", "No", "No", "No", "R_PLAY"],
      action: { type: "press_key", target: key, duration_ms: 180 },
      next_delay_ms: 800,
      bug_report: { has_bug: false }
    };
  }

  function heuristicAnalysis(frameBase64, gameSlug, timestampSeconds, stuck, stuckDecision) {
    const bytes = stripDataUrlPrefix(frameBase64).length;
    const bugs = [];
    if (bytes > 0 && bytes < 800) {
      bugs.push({
        id: makeId("bug"),
        timestampSeconds,
        severity: "warning",
        title: "Blank or minimal frame",
        description: `Captured frame for "${gameSlug}" is unusually small (${bytes} base64 chars); the canvas may not have rendered yet.`,
        screenshotBase64: String(frameBase64 || "").slice(0, 512)
      });
    }
    if (stuck) {
      bugs.push({
        id: makeId("bug"),
        timestampSeconds,
        severity: "warning",
        title: "Possible soft-lock: repeated input, static frame",
        description: `Repeated "${stuckDecision}" ${DEBUG_PLAY_LOOP_WINDOW} times consecutively with an unchanged frame hash.`,
        screenshotBase64: String(frameBase64 || "").slice(0, 512)
      });
    }
    return {
      bugs,
      nextInput: stuck ? "Escape" : "space",
      source: "heuristic",
      stuck: Boolean(stuck)
    };
  }

  function extractJsonFromText(text) {
    const raw = String(text || "").trim();
    if (!raw) throw new Error("Empty LLM response.");
    try {
      return JSON.parse(raw);
    } catch (_) {}
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced && fenced[1]) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch (_) {}
    }
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (objMatch) {
      return JSON.parse(objMatch[0]);
    }
    const arrMatch = raw.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      return JSON.parse(arrMatch[0]);
    }
    throw new Error(`LLM returned non-JSON response: ${raw.slice(0, 160)}`);
  }

  async function callProviderLLM(config, prompt, { base64Image = null, extraImages = [], expectJson = true } = {}) {
    const provider = String((config && config.provider) || "heuristic").toLowerCase();
    if (provider === "heuristic") {
      throw new Error("Heuristic mode selected (no network call).");
    }
    const apiKey = String((config && config.apiKey) || "").trim();
    const spec = PROVIDERS[provider] || PROVIDERS.custom;
    if (spec.requiresKey && !apiKey) {
      throw new Error(`No API key supplied for ${spec.label}.`);
    }

    const modelName = String((config && config.modelName) || spec.defaultModel).trim();
    const endpointUrl = String((config && config.endpointUrl) || spec.defaultEndpoint).trim();
    const fetchImpl = (config && config.fetchImpl) || (typeof fetch === "function" ? fetch : null);
    if (!fetchImpl) throw new Error("fetch() is unavailable in this environment.");

    const mainImg = stripDataUrlPrefix(base64Image);
    const detailImgs = (Array.isArray(extraImages) ? extraImages : [])
      .map((item) => stripDataUrlPrefix(typeof item === "string" ? item : item && (item.base64 || item.data)))
      .filter((s) => s.length > 100)
      .slice(0, 3);

    let url = endpointUrl;
    const headers = { "Content-Type": "application/json" };
    let body = {};

    if (provider === "gemini") {
      const base = endpointUrl.replace(/\/$/, "");
      url = `${base}/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const parts = [{ text: prompt }];
      if (mainImg) parts.push({ inlineData: { mimeType: "image/jpeg", data: mainImg } });
      for (const crop of detailImgs) {
        parts.push({ inlineData: { mimeType: "image/jpeg", data: crop } });
      }
      body = {
        contents: [{ parts }],
        generationConfig: expectJson ? { responseMimeType: "application/json" } : {}
      };
    } else if (provider === "local" && url.includes("/api/chat")) {
      const imgs = [];
      if (mainImg) imgs.push(mainImg);
      for (const crop of detailImgs) imgs.push(crop);
      body = {
        model: modelName,
        stream: false,
        ...(expectJson ? { format: "json" } : {}),
        messages: [{ role: "user", content: prompt, ...(imgs.length ? { images: imgs } : {}) }]
      };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    } else {
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      if (provider === "openrouter") {
        headers["HTTP-Referer"] = "https://games.givegigs.com";
        headers["X-Title"] = "GiveGigsGames Automated Gameplay Tester";
      }
      const content = [{ type: "text", text: prompt }];
      if (mainImg) {
        content.push({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${mainImg}`, ...(provider === "deepseek" ? { detail: "low" } : {}) }
        });
      }
      for (const crop of detailImgs) {
        content.push({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${crop}` }
        });
      }
      body = {
        model: modelName,
        messages: [{ role: "user", content }],
        ...(expectJson && (provider === "openai" || provider === "openrouter")
          ? { response_format: { type: "json_object" } }
          : {})
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Number(config && config.timeoutMs) || 35_000);
    let response;
    try {
      response = await fetchImpl(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(scrubSecret(`LLM HTTP ${response.status}: ${errText.slice(0, 240)}`, apiKey));
    }

    const data = await response.json();
    let contentText = "";
    let promptTokens = 0;
    let completionTokens = 0;

    if (provider === "gemini") {
      contentText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      promptTokens = data?.usageMetadata?.promptTokenCount || 0;
      completionTokens = data?.usageMetadata?.candidatesTokenCount || 0;
    } else {
      const rawContent = data?.choices?.[0]?.message?.content ?? data?.message?.content ?? "";
      contentText = Array.isArray(rawContent)
        ? rawContent.map((p) => (typeof p === "string" ? p : p?.text || "")).join("\n")
        : String(rawContent);
      promptTokens = data?.usage?.prompt_tokens || data?.prompt_eval_count || 0;
      completionTokens = data?.usage?.completion_tokens || data?.eval_count || 0;
    }

    if (!promptTokens && !completionTokens) {
      promptTokens = Math.round(prompt.length / 4) + (mainImg ? 260 : 0) + detailImgs.length * 90;
      completionTokens = Math.round(contentText.length / 4);
    }

    return {
      text: contentText,
      parsed: expectJson ? extractJsonFromText(contentText) : null,
      model: modelName,
      promptTokens,
      completionTokens
    };
  }

  // -------------------------------------------------------------------------
  // 9. AgentBrain Class
  // -------------------------------------------------------------------------

  class AgentBrain {
    constructor(config = {}) {
      this.reset();
      this.updateConfig(config);
    }

    reset() {
      this.episodes = [];
      this.bugs = [];
      this.replayActions = [];
      this.activeRunId = makeId("run");
      this.stuckRecoveryStage = 0;
      this.lastActionType = null;
      this.lastActionTarget = null;
      this.sameActionStreak = 0;
      this._heuristicCursor = 0;
      this._lastHeuristicTarget = null;
      this._pendingFocus = [];
      this._lastVisionMeta = null;
      this._bugSigTimes = {};
      this.loopGuard = createLoopGuard();
      this.tokenStats = {
        calls: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        byModel: {}
      };
      this.sessionStats = {
        steps: 0,
        bugsFound: 0,
        stuckEvents: 0,
        recoveries: 0,
        actionMix: {}
      };
      this._sessionMem = {
        runId: this.activeRunId,
        startTime: new Date().toISOString(),
        totalSteps: 0,
        bugsFound: 0,
        stuckEvents: 0,
        recoveries: 0,
        actionTypeCounts: { click: 0, press_key: 0, hold_key: 0, hold_keys: 0, combo: 0, wait: 0, refresh: 0 }
      };
    }

    updateConfig(newConfig = {}) {
      this.config = {
        provider: "heuristic",
        apiKey: "",
        endpointUrl: "",
        modelName: "",
        gameRules: "",
        preferredKeys: [],
        generalizedIntelligence: true,
        alwaysSendMemory: false,
        foveatedVision: true,
        maxFoveaDetails: 3,
        ...(this.config || {}),
        ...newConfig
      };
    }

    recordTokenUsage(model, prompt, completion) {
      const p = Number(prompt) || 0;
      const c = Number(completion) || 0;
      const tot = p + c;
      this.tokenStats.calls += 1;
      this.tokenStats.promptTokens += p;
      this.tokenStats.completionTokens += c;
      this.tokenStats.totalTokens += tot;
      const m = String(model || "unknown");
      if (!this.tokenStats.byModel[m]) {
        this.tokenStats.byModel[m] = { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 };
      }
      this.tokenStats.byModel[m].calls += 1;
      this.tokenStats.byModel[m].promptTokens += p;
      this.tokenStats.byModel[m].completionTokens += c;
      this.tokenStats.byModel[m].totalTokens += tot;
    }

    getSessionSummary() {
      const total = this.sessionStats.steps;
      if (!total) return "";
      const mix = Object.entries(this.sessionStats.actionMix)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      return `Steps: ${total} | ${mix} | Bugs: ${this.bugs.length} | Stuck: ${this.sessionStats.stuckEvents}`;
    }

    detectStuckState(screenshotBase64) {
      return detectStuckState(this, screenshotBase64);
    }

    getStuckRecoveryAction() {
      return getStuckRecoveryAction(this);
    }

    scanConsoleLogs(screenshotBase64, consoleLogs) {
      return scanForBugs(this, screenshotBase64, consoleLogs);
    }

    async callLLM(prompt, base64Image = null, extraImages = []) {
      const res = await callProviderLLM(this.config, prompt, {
        base64Image,
        extraImages,
        expectJson: true
      });
      this.recordTokenUsage(res.model, res.promptTokens, res.completionTokens);
      return res.parsed;
    }

    async chooseNextAction(screenshotBase64, domSnapshot = [], forceHeuristic = false, consoleLogs = [], opts = {}) {
      const extraImages = Array.isArray(opts.extraImages) ? opts.extraImages.slice(0, 3) : [];
      if (opts.visionMeta) this._lastVisionMeta = opts.visionMeta;

      this.scanConsoleLogs(screenshotBase64, consoleLogs);
      const isStuck = this.detectStuckState(screenshotBase64);
      const prompt = buildPrompt(this, consoleLogs, domSnapshot, isStuck, opts.audio || null, opts.visionMeta || this._lastVisionMeta);

      let result = null;
      let source = "heuristic";
      const provider = String(this.config.provider || "heuristic").toLowerCase();
      const spec = PROVIDERS[provider] || PROVIDERS.custom;
      const canCallLLM = !forceHeuristic && provider !== "heuristic" && (!spec.requiresKey || Boolean(this.config.apiKey));

      if (canCallLLM) {
        try {
          result = await this.callLLM(prompt, screenshotBase64, extraImages);
          source = "ai";
        } catch (err) {
          const msg = scrubSecret(err && err.message ? err.message : String(err), this.config.apiKey);
          result = runHeuristicFallback(consoleLogs, domSnapshot, this);
          result.reasoning = `[AI fallback: ${msg.slice(0, 90)}] ${result.reasoning}`;
          source = "heuristic";
        }
      } else {
        result = runHeuristicFallback(consoleLogs, domSnapshot, this);
        source = "heuristic";
      }

      let action;
      if (isStuck) {
        this.sessionStats.stuckEvents += 1;
        this.sessionStats.recoveries += 1;
        action = this.getStuckRecoveryAction();
        result = {
          ...(result || {}),
          status: "stuck",
          action,
          reasoning: `[Stuck Recovery ${this.stuckRecoveryStage}/3] ${(result && result.reasoning) || "Recovering from static frame."}`,
          reasoning_path: [...((result && result.reasoning_path) || ["S", "No", "Yes"]), `R_RECOVER_${this.stuckRecoveryStage}`]
        };
      } else {
        action = (result && result.action) || this.getStuckRecoveryAction() || { type: "wait", target: "", duration_ms: 500 };
      }

      const actionSig = quantizeActionSignature(action);
      if (actionSig === quantizeActionSignature({ type: this.lastActionType, target: this.lastActionTarget })) {
        this.sameActionStreak += 1;
      } else {
        this.sameActionStreak = 0;
        if (!isStuck) this.stuckRecoveryStage = 0;
      }
      this.lastActionType = action.type;
      this.lastActionTarget = action.target;

      this.sessionStats.steps += 1;
      this.sessionStats.actionMix[action.type] = (this.sessionStats.actionMix[action.type] || 0) + 1;
      this.replayActions.push({ timestamp: Date.now(), action, status: (result && result.status) || "unknown" });
      if (this.replayActions.length > 500) this.replayActions.splice(0, this.replayActions.length - 500);

      const episode = {
        timestamp: Date.now(),
        screenshotHash: simpleHash(stripDataUrlPrefix(screenshotBase64)),
        action,
        status: (result && result.status) || "unknown",
        reasoning_path: (result && result.reasoning_path) || [],
        reasoning: (result && result.reasoning) || ""
      };
      this.episodes.push(episode);
      if (this.episodes.length > 10) this.episodes.shift();

      if (result && result.bug_report && result.bug_report.has_bug) {
        const desc = String(result.bug_report.description || "").trim();
        const title = String(result.bug_report.title || result.bug_report.type || "Visual / Gameplay Bug").trim();
        if (desc && !this.bugs.some((b) => b.description === desc)) {
          this.bugs.push({
            id: makeId("bug"),
            timestamp: new Date().toISOString(),
            type: result.bug_report.type || "AI Visual Bug",
            title: title.slice(0, 140),
            description: desc.slice(0, 1500),
            severity: result.bug_report.severity || "warning",
            suggestedFixDiff: result.bug_report.suggestedFixDiff || "",
            consoleLogs: (consoleLogs || []).slice(-5),
            screenshot: screenshotBase64 ? toDataUrl(screenshotBase64) : "",
            actionTakenBeforeBug: this.replayActions.slice(-3)
          });
          this.sessionStats.bugsFound += 1;
        }
      }

      if (this.config.foveatedVision !== false) {
        this._pendingFocus = parseModelFocus(result);
      } else {
        this._pendingFocus = [];
      }

      return {
        status: (result && result.status) || "unknown",
        reasoning: (result && result.reasoning) || "",
        reasoning_path: (result && result.reasoning_path) || [],
        urgency: result && result.urgency,
        next_delay_ms: result && result.next_delay_ms,
        focus: this._pendingFocus,
        action,
        source,
        stuck: isStuck
      };
    }

    async analyzeFrameDebugPlay(frameDataUrl, { gameSlug = "custom-game", codeSnippet = "", timestampSeconds = 0 } = {}) {
      const slug = String(gameSlug || "custom-game").trim() || "custom-game";
      const frameHash = djb2Hash(frameDataUrl);
      const provider = String(this.config.provider || "heuristic").toLowerCase();
      const spec = PROVIDERS[provider] || PROVIDERS.custom;
      const canCallLLM = provider !== "heuristic" && (!spec.requiresKey || Boolean(this.config.apiKey));

      if (!canCallLLM) {
        const guard = checkLoopGuard(this.loopGuard, "space", frameHash);
        this.loopGuard = guard.state;
        return {
          ...heuristicAnalysis(frameDataUrl, slug, timestampSeconds, guard.stuck, "space"),
          frameHash
        };
      }

      try {
        const systemPrompt =
          `You are DebugPlay, an AI automated game QA engineer inspecting gameplay frames for "${slug}". ` +
          `Analyze the screenshot, detect visual/UI/gameplay bugs (black screen, missing textures, clipping, overlapping HUD, broken UI), ` +
          `and output JSON ONLY: {"bugs":[{"id":"...","severity":"critical|warning|cosmetic","title":"...","description":"...","suggestedFixDiff":"..."}],"nextInput":"..."}. ` +
          `Source/notes context: ${String(codeSnippet || "N/A").slice(0, 2000)}`;
        const res = await callProviderLLM(this.config, systemPrompt, {
          base64Image: frameDataUrl,
          expectJson: true
        });
        this.recordTokenUsage(res.model, res.promptTokens, res.completionTokens);
        const parsed = res.parsed || {};
        const nextInput =
          typeof parsed.nextInput === "string" && parsed.nextInput.trim()
            ? parsed.nextInput.trim().slice(0, 64)
            : "space";
        const guard = checkLoopGuard(this.loopGuard, nextInput, frameHash);
        this.loopGuard = guard.state;

        const bugs = Array.isArray(parsed.bugs)
          ? parsed.bugs.map((b) => ({
              id: String(b.id || makeId("bug")),
              timestampSeconds,
              severity: ["critical", "warning", "cosmetic"].includes(b.severity) ? b.severity : "cosmetic",
              title: String(b.title || "Observation").slice(0, 200),
              description: String(b.description || "").slice(0, 2000),
              ...(typeof b.suggestedFixDiff === "string" && b.suggestedFixDiff
                ? { suggestedFixDiff: b.suggestedFixDiff.slice(0, 8000) }
                : {}),
              screenshotBase64: String(frameDataUrl).slice(0, 512)
            }))
          : [];

        if (guard.stuck) {
          bugs.push({
            id: makeId("bug"),
            timestampSeconds,
            severity: "warning",
            title: "Possible soft-lock: repeated input, static frame",
            description: `Loop guard detected "${nextInput}" ${DEBUG_PLAY_LOOP_WINDOW} times consecutively with unchanged frame hash.`,
            screenshotBase64: String(frameDataUrl).slice(0, 512)
          });
        }

        for (const bug of bugs) {
          if (!this.bugs.some((existing) => existing.description === bug.description)) {
            this.bugs.push({
              ...bug,
              timestamp: new Date().toISOString(),
              type: "DebugPlay Visual Bug",
              screenshot: toDataUrl(frameDataUrl)
            });
          }
        }

        return { bugs, nextInput, source: "ai", stuck: guard.stuck, frameHash };
      } catch (err) {
        const guard = checkLoopGuard(this.loopGuard, "space", frameHash);
        this.loopGuard = guard.state;
        const fallback = heuristicAnalysis(frameDataUrl, slug, timestampSeconds, guard.stuck, "space");
        fallback.warning = scrubSecret(err && err.message ? err.message : String(err), this.config.apiKey);
        return { ...fallback, frameHash };
      }
    }

    async suggestCodeFixes(bugs, codeSnippet, filePath = "game.js") {
      const list = Array.isArray(bugs) && bugs.length ? bugs : this.bugs;
      if (!list.length) return [];
      const provider = String(this.config.provider || "heuristic").toLowerCase();
      const spec = PROVIDERS[provider] || PROVIDERS.custom;
      if (provider === "heuristic" || (spec.requiresKey && !this.config.apiKey)) {
        return list.slice(0, 5).map((b) => ({
          filePath,
          title: b.title || b.type || "Bug",
          explanation: `Offline analysis for: ${b.description}. Add an API key to generate AI patches.`,
          suggestedFixDiff: `// TODO (${filePath}): investigate ${b.description}`
        }));
      }
      const prompt =
        `You are a senior game developer. Analyze these bugs detected during automated gameplay testing and suggest targeted fixes.\n\n` +
        `Bugs:\n${list.slice(0, 8).map((b, i) => `${i + 1}. [${b.severity}] ${b.title || b.type}: ${b.description}`).join("\n")}\n\n` +
        `Code context (${filePath}):\n\`\`\`\n${String(codeSnippet || "// No snippet provided").slice(0, 6000)}\n\`\`\`\n\n` +
        `Respond ONLY with JSON: {"fixes":[{"filePath":"${filePath}","title":"...","explanation":"...","suggestedFixDiff":"unified diff or code snippet"}]}`;
      const res = await callProviderLLM(this.config, prompt, { expectJson: true });
      this.recordTokenUsage(res.model, res.promptTokens, res.completionTokens);
      const fixes = res.parsed && Array.isArray(res.parsed.fixes) ? res.parsed.fixes : [];
      return fixes;
    }

    async runPlay(playId, input) {
      const play = getPlay(playId);
      if (!play) throw new Error(`Unknown play id: ${playId}`);
      const provider = String(this.config.provider || "heuristic").toLowerCase();
      const spec = PROVIDERS[provider] || PROVIDERS.custom;
      if (provider === "heuristic" || (spec.requiresKey && !this.config.apiKey)) {
        return { text: fallbackOpenRouterPlay(play, input), source: "offline", play };
      }
      try {
        const prompt = `${play.system}\n\n${play.userPrompt(input)}`;
        const res = await callProviderLLM(this.config, prompt, { expectJson: false });
        this.recordTokenUsage(res.model, res.promptTokens, res.completionTokens);
        return { text: String(res.text || "").trim() || fallbackOpenRouterPlay(play, input), source: "ai", play };
      } catch (err) {
        return {
          text: fallbackOpenRouterPlay(play, input),
          source: "offline",
          error: scrubSecret(err && err.message ? err.message : String(err), this.config.apiKey),
          play
        };
      }
    }
  }

  return {
    DEBUG_PLAY_DOWNSAMPLE,
    DEBUG_PLAY_MAX_FRAME_CHARS,
    DEBUG_PLAY_LOOP_WINDOW,
    PROVIDERS,
    downsamplePlan,
    stripDataUrlPrefix,
    toDataUrl,
    simpleHash,
    djb2Hash,
    hashFrameAsync,
    createLoopGuard,
    checkLoopGuard,
    quantizeActionSignature,
    detectStuckState,
    getStuckRecoveryAction,
    FoveatedVision,
    AdaptiveTick,
    BugScanner,
    buildPrompt,
    generateMegaPrompt,
    OPENROUTER_PLAYS,
    getPlay,
    isPlayId,
    fallbackOpenRouterPlay,
    runHeuristicFallback,
    heuristicAnalysis,
    callProviderLLM,
    extractJsonFromText,
    AgentBrain
  };
});
