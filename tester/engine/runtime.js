/* ==========================================================================
 * GiveGigsGames Automated Gameplay Tester - Browser Runtime, Bot Cursor,
 * Frame Capture, DOM/WebGL/Site Auditor, Action Dispatcher, Replays & State
 * Consolidated from 4weird (action_dispatcher, bot_cursor, dom_inspector,
 * input_mapper, website_debugger, replay_engine) & website-dev (verifyWebGL).
 * UMD module: attaches window.GGGRuntime in browser, exports in Node.js.
 * ========================================================================== */
(function (root, factory) {
  const api = factory(
    typeof module === "object" && module.exports
      ? require("./brain.js")
      : root && root.GGGBrain,
    typeof module === "object" && module.exports
      ? require("./controllers.js")
      : root && root.GGGControllers
  );
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.GGGRuntime = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (Brain, Controllers) {
  "use strict";

  // -------------------------------------------------------------------------
  // 1. Key Mapping & Virtual Bot Cursor
  // -------------------------------------------------------------------------

  const KEY_CODE_MAP = {
    arrowleft: "ArrowLeft",
    arrowright: "ArrowRight",
    arrowup: "ArrowUp",
    arrowdown: "ArrowDown",
    space: "Space",
    " ": "Space",
    enter: "Enter",
    escape: "Escape",
    esc: "Escape",
    tab: "Tab",
    backspace: "Backspace",
    shift: "ShiftLeft",
    control: "ControlLeft",
    ctrl: "ControlLeft",
    alt: "AltLeft",
    f5: "F5",
    f12: "F12"
  };

  function getKeyCode(key) {
    const raw = String(key || "");
    const low = raw.toLowerCase();
    if (KEY_CODE_MAP[low]) return KEY_CODE_MAP[low];
    if (raw.length === 1) {
      if (/[a-z]/i.test(raw)) return "Key" + raw.toUpperCase();
      if (/[0-9]/.test(raw)) return "Digit" + raw;
    }
    return raw;
  }

  function normalizeKeyValue(key) {
    const raw = String(key || "");
    const low = raw.toLowerCase();
    if (low === "space" || raw === " ") return " ";
    if (low === "esc") return "Escape";
    if (low === "arrowleft") return "ArrowLeft";
    if (low === "arrowright") return "ArrowRight";
    if (low === "arrowup") return "ArrowUp";
    if (low === "arrowdown") return "ArrowDown";
    if (low === "enter") return "Enter";
    if (low === "tab") return "Tab";
    if (low === "shift") return "Shift";
    if (low === "control" || low === "ctrl") return "Control";
    if (low === "alt") return "Alt";
    return raw;
  }

  const CURSOR_ID = "vibe-bot-cursor";
  const CLICK_GLIDE_MS = 140;

  function ensureCursorInDoc(doc, win) {
    if (!doc || !doc.body) return null;
    try {
      if (win && win.GraveGainBotCursor && typeof win.GraveGainBotCursor.ensure === "function") {
        win.GraveGainBotCursor.ensure();
      }
      let el = doc.getElementById(CURSOR_ID);
      if (el) return el;
      const css = doc.createElement("style");
      css.textContent =
        `#${CURSOR_ID}{position:fixed;left:0;top:0;z-index:999999;pointer-events:none;` +
        `transition:left 0.14s ease-out,top 0.14s ease-out,opacity 0.2s;opacity:0;}` +
        `#${CURSOR_ID}.on{opacity:1;}` +
        `#${CURSOR_ID} .vibe-bot-badge{position:absolute;left:-9px;top:-28px;font-size:20px;line-height:1;}` +
        `#${CURSOR_ID} .vibe-bot-pointer{position:absolute;left:0;top:0;font-size:18px;color:#79f2c0;}` +
        `#${CURSOR_ID} .vibe-bot-label{position:absolute;left:18px;top:-24px;white-space:nowrap;` +
        `font:600 11px/1.35 ui-monospace,monospace;color:#dffef2;background:rgba(7,17,29,0.88);` +
        `border:1px solid rgba(121,242,192,0.65);border-radius:6px;padding:2px 7px;}`;
      (doc.head || doc.documentElement).appendChild(css);
      el = doc.createElement("div");
      el.id = CURSOR_ID;
      el.setAttribute("aria-hidden", "true");
      el.innerHTML =
        '<div class="vibe-bot-badge">🤖</div>' +
        '<div class="vibe-bot-pointer">➤</div>' +
        '<div class="vibe-bot-label"></div>';
      doc.body.appendChild(el);
      return el;
    } catch (_) {
      return null;
    }
  }

  function moveCursorInDoc(doc, win, nx, ny, label) {
    try {
      if (win && win.GraveGainBotCursor) {
        win.GraveGainBotCursor.setBotControl?.(true);
        win.GraveGainBotCursor.move?.(nx, ny, label || "bot");
      }
      const el = ensureCursorInDoc(doc, win);
      if (!el) return;
      el.style.left = Math.round((nx / 1000) * (win.innerWidth || 1)) + "px";
      el.style.top = Math.round((ny / 1000) * (win.innerHeight || 1)) + "px";
      const lab = el.querySelector(".vibe-bot-label");
      if (lab) lab.textContent = String(label || "bot").slice(0, 42);
      el.classList.add("on");
    } catch (_) {}
  }

  function flashClickInDoc(doc, win, nx, ny) {
    try {
      if (win && win.GraveGainBotCursor && win.GraveGainBotCursor.flash) {
        win.GraveGainBotCursor.flash(nx, ny);
      }
      if (!doc || !doc.body) return;
      const ring = doc.createElement("div");
      ring.style.cssText =
        `position:fixed;z-index:999998;pointer-events:none;width:16px;height:16px;` +
        `margin:-8px 0 0 -8px;border-radius:50%;border:3px solid #79f2c0;` +
        `left:${Math.round((nx / 1000) * (win.innerWidth || 1))}px;` +
        `top:${Math.round((ny / 1000) * (win.innerHeight || 1))}px;`;
      doc.body.appendChild(ring);
      setTimeout(() => {
        try { ring.remove(); } catch (_) {}
      }, 360);
    } catch (_) {}
  }

  // Host overlay renderer (cursor + click heatmap + fovea rects)
  class HostBotOverlay {
    constructor(canvas) {
      this.canvas = canvas || null;
      this.cursor = { nx: 500, ny: 500, label: "", visible: false };
      this.heatmap = [];
      this.rings = [];
      this.foveaRects = [];
    }
    setCanvas(canvas) {
      this.canvas = canvas;
    }
    setCursor(nx, ny, label, isClick = false) {
      this.cursor = { nx, ny, label: String(label || "").slice(0, 36), visible: true };
      if (isClick) {
        this.heatmap.push({ nx, ny, at: Date.now() });
        if (this.heatmap.length > 60) this.heatmap.shift();
        this.rings.push({ nx, ny, at: Date.now() });
        if (this.rings.length > 10) this.rings.shift();
      }
      this.render();
    }
    setFoveaRects(rects) {
      this.foveaRects = Array.isArray(rects) ? rects : [];
      this.render();
    }
    clear() {
      this.heatmap = [];
      this.rings = [];
      this.foveaRects = [];
      this.cursor.visible = false;
      this.render();
    }
    render() {
      const c = this.canvas;
      if (!c) return;
      const rect = c.getBoundingClientRect ? c.getBoundingClientRect() : { width: c.width || 640, height: c.height || 360 };
      const w = Math.max(1, Math.round(rect.width || c.width || 640));
      const h = Math.max(1, Math.round(rect.height || c.height || 360));
      if (c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
      }
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      // Draw fovea detail crop rects
      for (let i = 0; i < this.foveaRects.length; i++) {
        const r = this.foveaRects[i];
        const rx = ((r.x || 0) / 1000) * w;
        const ry = ((r.y || 0) / 1000) * h;
        const rw = ((r.w || 200) / 1000) * w;
        const rh = ((r.h || 200) / 1000) * h;
        ctx.save();
        ctx.strokeStyle = "rgba(145, 215, 255, 0.72)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.fillStyle = "rgba(7, 17, 29, 0.75)";
        ctx.fillRect(rx, Math.max(0, ry - 16), 95, 16);
        ctx.fillStyle = "#91d7ff";
        ctx.font = "600 10px ui-monospace, monospace";
        ctx.fillText(`crop${i + 1}: ${r.label || "detail"}`, rx + 4, Math.max(11, ry - 4));
        ctx.restore();
      }

      // Draw click heatmap dots
      for (const dot of this.heatmap) {
        const dx = (dot.nx / 1000) * w;
        const dy = (dot.ny / 1000) * h;
        ctx.beginPath();
        ctx.arc(dx, dy, 6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(121, 242, 192, 0.28)";
        ctx.fill();
        ctx.strokeStyle = "rgba(121, 242, 192, 0.65)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw recent click pulse rings
      const now = Date.now();
      this.rings = this.rings.filter((r) => now - r.at < 900);
      for (const r of this.rings) {
        const dx = (r.nx / 1000) * w;
        const dy = (r.ny / 1000) * h;
        const age = (now - r.at) / 900;
        ctx.beginPath();
        ctx.arc(dx, dy, 7 + age * 14, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(121, 242, 192, ${(1 - age).toFixed(2)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw bot cursor marker
      if (this.cursor.visible) {
        const cx = (this.cursor.nx / 1000) * w;
        const cy = (this.cursor.ny / 1000) * h;
        ctx.save();
        ctx.font = "16px system-ui, sans-serif";
        ctx.fillText("🤖", Math.max(2, cx - 10), Math.max(16, cy - 8));
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#79f2c0";
        ctx.fill();
        if (this.cursor.label) {
          ctx.font = "600 11px ui-monospace, monospace";
          const tw = ctx.measureText(this.cursor.label).width;
          const bx = Math.min(w - tw - 16, cx + 10);
          const by = Math.max(18, cy - 18);
          ctx.fillStyle = "rgba(7, 17, 29, 0.88)";
          ctx.fillRect(bx, by - 12, tw + 10, 16);
          ctx.strokeStyle = "rgba(121, 242, 192, 0.65)";
          ctx.strokeRect(bx, by - 12, tw + 10, 16);
          ctx.fillStyle = "#dffef2";
          ctx.fillText(this.cursor.label, bx + 5, by);
        }
        ctx.restore();
      }
    }
  }

  // -------------------------------------------------------------------------
  // 2. Safe Same-Origin Iframe Helpers & DOM Inspector
  // -------------------------------------------------------------------------

  function getFrameContext(frame) {
    if (!frame) return { win: null, doc: null, accessible: false };
    try {
      const win = frame.contentWindow;
      const doc = frame.contentDocument || (win && win.document);
      if (!win || !doc) return { win: null, doc: null, accessible: false };
      void doc.location.href;
      return { win, doc, accessible: true };
    } catch (_) {
      return { win: null, doc: null, accessible: false };
    }
  }

  async function executeInIframe(frame, codeOrFn) {
    const ctx = getFrameContext(frame);
    if (!ctx.accessible) return null;
    try {
      if (typeof codeOrFn === "function") {
        return await codeOrFn(ctx.win, ctx.doc);
      }
      if (typeof codeOrFn === "string" && typeof ctx.win.eval === "function") {
        return await ctx.win.eval(codeOrFn);
      }
    } catch (_) {
      return null;
    }
    return null;
  }

  function inspectIframeDOM(frame) {
    const ctx = getFrameContext(frame);
    if (!ctx.accessible) return [];
    const { win, doc } = ctx;
    try {
      const out = [];
      const vw = win.innerWidth || 1;
      const vh = win.innerHeight || 1;
      const onScreen = (r) => r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
      const candidates = doc.querySelectorAll(
        'button, a, input, select, textarea, canvas, [role="button"], [onclick], [tabindex]:not([tabindex="-1"])'
      );
      for (let i = 0; i < candidates.length && out.length < 40; i++) {
        const el = candidates[i];
        if (el.disabled) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0 || !onScreen(rect)) continue;
        const style = win.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        out.push({
          tagName: el.tagName,
          id: el.id || "",
          className: typeof el.className === "string" ? el.className : "",
          innerText: (el.innerText || el.textContent || "").slice(0, 60).trim(),
          placeholder: el.placeholder || "",
          rect: {
            left: Math.round(rect.left),
            top: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          nx: Math.max(0, Math.min(1000, Math.round((cx / vw) * 1000))),
          ny: Math.max(0, Math.min(1000, Math.round((cy / vh) * 1000)))
        });
      }
      return out;
    } catch (_) {
      return [];
    }
  }

  function inspectIframePerformance(frame) {
    const ctx = getFrameContext(frame);
    if (!ctx.accessible) return { heapLimit: 0, heapUsed: 0, heapTotal: 0, canvasCount: 0, globals: {} };
    const { win, doc } = ctx;
    try {
      const mem = win.performance && win.performance.memory ? win.performance.memory : null;
      const globals = {};
      if (win.gameDebug) {
        globals.gameDebug = {
          score: win.gameDebug.getScore?.(),
          health: win.gameDebug.getHealth?.(),
          godMode: Boolean(win.gameDebug.godMode)
        };
      }
      if (win.GraveGainGame) {
        globals.GraveGainGame = {
          gold: win.GraveGainGame.gold,
          kills: win.GraveGainGame.kills,
          floorIndex: win.GraveGainGame.floorIndex,
          hp: win.GraveGainGame.player?.hp,
          maxHp: win.GraveGainGame.player?.maxHp
        };
      }
      if (win.gameState && typeof win.gameState.snapshot === "function") {
        try { globals.gameState = win.gameState.snapshot(); } catch (_) {}
      } else if (win.game && win.game.state) {
        globals.game = { state: win.game.state, score: win.game.score };
      }
      return {
        heapLimit: mem ? mem.jsHeapSizeLimit : 0,
        heapUsed: mem ? mem.usedJSHeapSize : 0,
        heapTotal: mem ? mem.totalJSHeapSize : 0,
        canvasCount: doc.querySelectorAll("canvas").length,
        globals
      };
    } catch (_) {
      return { heapLimit: 0, heapUsed: 0, heapTotal: 0, canvasCount: 0, globals: {} };
    }
  }

  // -------------------------------------------------------------------------
  // 3. Guest Error Hook & Full Game/Site Auditor
  // -------------------------------------------------------------------------

  function installGuestErrorHook(frame, onErrorLine) {
    const ctx = getFrameContext(frame);
    if (!ctx.accessible) return "cross-origin-unhooked";
    const { win } = ctx;
    try {
      if (win.__gggDebugHook && win.__gggDebugHook.active) return "already-hooked";
      const seen = new Set();
      const report = (kind, msg) => {
        try {
          if (seen.size >= 30) return;
          const line = `[${kind}] ${String(msg).slice(0, 300)}`;
          if (seen.has(line)) return;
          seen.add(line);
          if (typeof onErrorLine === "function") onErrorLine(line);
        } catch (_) {}
      };

      win.addEventListener(
        "error",
        (e) => {
          try {
            if (e.target && e.target !== win && (e.target.src || e.target.href)) {
              const tag = e.target.tagName || "resource";
              const url = e.target.src || e.target.href || "";
              report("ggg-resource-error", `Failed to load ${tag} ${String(url).slice(0, 220)}`);
            } else if (e.message) {
              report("ggg-guest-error", `${String(e.message).slice(0, 220)} @${e.filename || ""}:${e.lineno || 0}`);
            }
          } catch (_) {}
        },
        true
      );

      win.addEventListener("unhandledrejection", (e) => {
        try {
          const r = e.reason;
          const txt = r && r.stack ? String(r.stack).split("\n").slice(0, 2).join(" ") : String(r);
          report("ggg-guest-error", `Unhandled rejection: ${txt.slice(0, 240)}`);
        } catch (_) {}
      });

      if (typeof win.console?.error === "function" && !win.console.error.__gggWrapped) {
        const origErr = win.console.error.bind(win.console);
        const wrappedErr = function () {
          try {
            const msg = Array.from(arguments).map((a) => String(a)).join(" ");
            report("ggg-console-error", msg);
          } catch (_) {}
          return origErr.apply(null, arguments);
        };
        wrappedErr.__gggWrapped = true;
        win.console.error = wrappedErr;
      }

      if (typeof win.fetch === "function" && !win.fetch.__gggWrapped) {
        const rawFetch = win.fetch.bind(win);
        const wrappedFetch = function () {
          let url = "";
          try {
            const a = arguments[0];
            url = typeof a === "string" ? a : (a && a.url) || "";
          } catch (_) {}
          return rawFetch.apply(null, arguments).then(
            (res) => {
              try {
                if (res && res.status >= 400 && !String(url).includes("/_vercel/insights")) {
                  report("ggg-net-error", `fetch ${String(url).slice(0, 200)} -> HTTP ${res.status}`);
                }
              } catch (_) {}
              return res;
            },
            (err) => {
              report("ggg-net-error", `fetch ${String(url).slice(0, 200)} failed: ${String(err?.message || err).slice(0, 160)}`);
              throw err;
            }
          );
        };
        wrappedFetch.__gggWrapped = true;
        win.fetch = wrappedFetch;
      }

      win.__gggDebugHook = { active: true, at: Date.now() };
      return "debug-hook-installed";
    } catch (_) {
      return "debug-hook-failed";
    }
  }

  function auditDocumentDOM(doc, win) {
    if (!doc || !win) return { url: "", title: "", counts: {}, issues: [] };
    try {
      const issues = [];
      const cap = (arr) => arr.slice(0, 5);
      const title = (doc.title || "").trim();
      if (!title) issues.push({ code: "missing-title", severity: "cosmetic", detail: "Page has no <title>." });

      const imgs = Array.from(doc.images || []);
      const broken = imgs.filter((img) => {
        try { return !img.complete || img.naturalWidth === 0; } catch (_) { return false; }
      });
      if (broken.length) {
        issues.push({
          code: "broken-images",
          severity: "high",
          detail: `${broken.length} image(s) failed to render: ${cap(broken.map((i) => i.currentSrc || i.src || "(no src)")).join(" | ")}`
        });
      }

      const anchors = Array.from(doc.querySelectorAll("a"));
      const dead = anchors.filter((a) => {
        const h = a.getAttribute("href");
        return h === null || h.trim() === "" || h.trim() === "#" || /^javascript:\s*void/i.test(h.trim());
      });
      if (dead.length) {
        issues.push({
          code: "dead-links",
          severity: "warning",
          detail: `${dead.length} anchor(s) have empty or # hrefs.`
        });
      }

      const forms = Array.from(doc.forms || []);
      const unsubmittable = forms.filter(
        (f) => !f.querySelector('button[type="submit"], input[type="submit"], button:not([type]), input[type="image"]')
      );
      if (unsubmittable.length) {
        issues.push({
          code: "form-no-submit",
          severity: "warning",
          detail: `${unsubmittable.length} form(s) have no submit control.`
        });
      }

      const de = doc.documentElement;
      if (de && de.scrollWidth > win.innerWidth + 2) {
        issues.push({
          code: "horizontal-overflow",
          severity: "warning",
          detail: `Document overflows horizontally by ${de.scrollWidth - win.innerWidth}px (${de.scrollWidth} > ${win.innerWidth}).`
        });
      }

      // Canvas & WebGL verification
      const canvases = Array.from(doc.querySelectorAll("canvas"));
      let webglCount = 0;
      let nonBlankCount = 0;
      for (const c of canvases) {
        try {
          if (c.width > 0 && c.height > 0) {
            const gl = c.getContext("webgl2") || c.getContext("webgl");
            if (gl) {
              webglCount += 1;
              nonBlankCount += 1;
            } else {
              const ctx2d = c.getContext("2d");
              if (ctx2d) {
                const sample = ctx2d.getImageData(0, 0, Math.min(32, c.width), Math.min(32, c.height)).data;
                let hasColor = false;
                for (let i = 0; i < sample.length; i += 4) {
                  if (sample[i] > 0 || sample[i + 1] > 0 || sample[i + 2] > 0 || sample[i + 3] > 0) {
                    hasColor = true;
                    break;
                  }
                }
                if (hasColor) nonBlankCount += 1;
              }
            }
          }
        } catch (_) {}
      }

      if (canvases.length > 0 && nonBlankCount === 0) {
        issues.push({
          code: "blank-canvas",
          severity: "warning",
          detail: `${canvases.length} <canvas> element(s) found, but top-left sample appears blank (menu may still be covering canvas).`
        });
      }

      return {
        url: String(win.location.href).slice(0, 200),
        title: title.slice(0, 120),
        counts: {
          images: imgs.length,
          brokenImages: broken.length,
          links: anchors.length,
          deadLinks: dead.length,
          forms: forms.length,
          canvases: canvases.length,
          webglCanvases: webglCount,
          nonBlankCanvases: nonBlankCount
        },
        issues
      };
    } catch (err) {
      return { url: "", title: "", counts: {}, issues: [], error: String(err?.message || err) };
    }
  }

  async function runFullAudit({ frame, targetUrl = "" } = {}) {
    let loadProbe = { ok: false, ms: null, detail: "Skipped (no HTTP target URL)." };
    if (targetUrl && /^(\/|https?:\/\/)/i.test(targetUrl)) {
      const started = performance.now();
      try {
        const res = await fetch(targetUrl, { cache: "no-store" });
        const ms = Math.round(performance.now() - started);
        loadProbe = {
          ok: res.ok,
          ms,
          detail: res.ok ? `HTTP ${res.status} in ${ms}ms.` : `HTTP ${res.status} error in ${ms}ms.`
        };
      } catch (err) {
        const ms = Math.round(performance.now() - started);
        loadProbe = {
          ok: false,
          ms,
          detail: `Fetch blocked/failed after ${ms}ms (${err?.message || "CORS or network"}).`
        };
      }
    }

    const ctx = getFrameContext(frame);
    let domAudit = { url: targetUrl, title: "", counts: {}, issues: [] };
    if (ctx.accessible) {
      domAudit = auditDocumentDOM(ctx.doc, ctx.win);
    } else {
      domAudit.issues.push({
        code: "cross-origin-frame",
        severity: "cosmetic",
        detail: "Target iframe is cross-origin; DOM/canvas inspection unavailable without Screen Capture or Local Companion Bridge."
      });
    }

    return {
      loadProbe,
      accessible: ctx.accessible,
      ...domAudit
    };
  }

  // -------------------------------------------------------------------------
  // 4. Multi-Source Frame Capture Manager
  // -------------------------------------------------------------------------

  function notesToFrame(slug, notes) {
    if (typeof document === "undefined") return "";
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.fillStyle = "#08121f";
    ctx.fillRect(0, 0, 640, 360);
    ctx.fillStyle = "#79f2c0";
    ctx.font = "bold 24px system-ui, sans-serif";
    ctx.fillText("GiveGigsGames Automated Tester", 28, 48);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 18px ui-monospace, monospace";
    ctx.fillText(String(slug || "custom-target").slice(0, 44), 28, 84);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "15px system-ui, sans-serif";
    const words = String(notes || "No pixel capture available (cross-origin target or no active video stream).").split(/\s+/);
    const lines = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > 56) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
      if (lines.length >= 8) break;
    }
    if (line && lines.length < 9) lines.push(line);
    lines.forEach((l, i) => ctx.fillText(l.slice(0, 60), 28, 122 + i * 26));
    return canvas.toDataURL("image/jpeg", 0.72);
  }

  class FrameCaptureManager {
    constructor() {
      this.displayStream = null;
      this.displayVideo = null;
      this.workCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
      this.cropCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
    }

    hasDisplayStream() {
      return Boolean(
        this.displayStream &&
          this.displayStream.getVideoTracks().some((t) => t.readyState === "live")
      );
    }

    async startDisplayCapture() {
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== "function") {
        throw new Error("Screen/Window capture (getDisplayMedia) is not supported in this browser.");
      }
      this.stopDisplayCapture();
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15, max: 30 } },
        audio: false
      });
      this.displayStream = stream;
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();
      this.displayVideo = video;
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.addEventListener("ended", () => this.stopDisplayCapture(), { once: true });
      }
      return stream;
    }

    stopDisplayCapture() {
      if (this.displayStream) {
        for (const t of this.displayStream.getTracks()) {
          try { t.stop(); } catch (_) {}
        }
      }
      this.displayStream = null;
      if (this.displayVideo) {
        try { this.displayVideo.srcObject = null; } catch (_) {}
      }
      this.displayVideo = null;
    }

    extractFoveaCrops(sourceCanvas, rects = []) {
      if (!sourceCanvas || !this.cropCanvas || !Array.isArray(rects) || !rects.length) return [];
      const out = [];
      const sw = sourceCanvas.width || 640;
      const sh = sourceCanvas.height || 360;
      const cctx = this.cropCanvas.getContext("2d");
      if (!cctx) return [];
      for (const r of rects.slice(0, 3)) {
        const sx = Math.max(0, Math.round(((r.x || 0) / 1000) * sw));
        const sy = Math.max(0, Math.round(((r.y || 0) / 1000) * sh));
        const cw = Math.max(16, Math.min(sw - sx, Math.round(((r.w || 250) / 1000) * sw)));
        const ch = Math.max(16, Math.min(sh - sy, Math.round(((r.h || 250) / 1000) * sh)));
        this.cropCanvas.width = Math.min(256, cw);
        this.cropCanvas.height = Math.min(256, ch);
        try {
          cctx.clearRect(0, 0, this.cropCanvas.width, this.cropCanvas.height);
          cctx.drawImage(sourceCanvas, sx, sy, cw, ch, 0, 0, this.cropCanvas.width, this.cropCanvas.height);
          out.push({
            label: r.label || "detail",
            rect: r,
            base64: this.cropCanvas.toDataURL("image/jpeg", 0.72)
          });
        } catch (_) {}
      }
      return out;
    }

    captureFromIframe(frame, { width = 640, height = 360, quality = 0.65, focusRects = [] } = {}) {
      const ctxInfo = getFrameContext(frame);
      if (!ctxInfo.accessible || !this.workCanvas) return null;
      const { win, doc } = ctxInfo;
      const canvas = this.workCanvas;
      const vw = Math.max(1, win.innerWidth || 640);
      const vh = Math.max(1, win.innerHeight || 360);
      const plan = Brain ? Brain.downsamplePlan(vw, vh, width, height) : { width: 640, height: 360 };
      canvas.width = plan.width;
      canvas.height = plan.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.fillStyle = "#08121f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const sx = canvas.width / vw;
      const sy = canvas.height / vh;
      let drewMedia = false;

      // Draw visible canvases inside the iframe
      const canvases = Array.from(doc.querySelectorAll("canvas"));
      for (const c of canvases) {
        try {
          const r = c.getBoundingClientRect();
          const st = win.getComputedStyle(c);
          if (r.width <= 0 || r.height <= 0 || st.display === "none" || st.visibility === "hidden" || st.opacity === "0") continue;
          ctx.drawImage(c, r.left * sx, r.top * sy, r.width * sx, r.height * sy);
          drewMedia = true;
        } catch (_) {}
      }

      // Draw visible images/videos
      const media = Array.from(doc.querySelectorAll("img, video"));
      for (const m of media) {
        try {
          const r = m.getBoundingClientRect();
          const st = win.getComputedStyle(m);
          if (r.width <= 0 || r.height <= 0 || st.display === "none" || st.visibility === "hidden") continue;
          ctx.drawImage(m, r.left * sx, r.top * sy, r.width * sx, r.height * sy);
          drewMedia = true;
        } catch (_) {}
      }

      // Overlay key visible HUD / button / heading boxes so AI vision sees DOM overlays too
      const uiEls = doc.querySelectorAll("h1, h2, button, [role='button'], .overlay:not(.hidden), #hud, .hud, #objective, #score");
      let drawnUI = 0;
      for (const el of uiEls) {
        if (drawnUI >= 24) break;
        try {
          const r = el.getBoundingClientRect();
          const st = win.getComputedStyle(el);
          if (r.width <= 1 || r.height <= 1 || st.display === "none" || st.visibility === "hidden" || st.opacity === "0") continue;
          if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
          const x = r.left * sx;
          const y = r.top * sy;
          const w = r.width * sx;
          const h = r.height * sy;
          if (el.tagName === "BUTTON" || el.getAttribute("role") === "button") {
            ctx.fillStyle = "rgba(18, 42, 62, 0.72)";
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = "rgba(121, 242, 192, 0.85)";
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, w, h);
          }
          const txt = (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 42);
          if (txt) {
            ctx.fillStyle = "#f4f8fb";
            ctx.font = "600 11px system-ui, sans-serif";
            ctx.fillText(txt, x + 4, Math.min(canvas.height - 4, y + Math.max(12, h * 0.65)));
            drawnUI += 1;
          }
        } catch (_) {}
      }

      if (!drewMedia && drawnUI === 0) {
        ctx.fillStyle = "#94a3b8";
        ctx.font = "14px system-ui, sans-serif";
        ctx.fillText(doc.title || "Loaded HTML Frame", 20, 40);
      }

      try {
        const overview = canvas.toDataURL("image/jpeg", quality);
        const details = this.extractFoveaCrops(canvas, focusRects);
        return {
          overview,
          details,
          meta: { source: "iframe-compositor", details: details.map((d) => ({ label: d.label, rect: d.rect })) }
        };
      } catch (_) {
        return null;
      }
    }

    captureFromDisplay({ width = 640, height = 360, quality = 0.68, focusRects = [] } = {}) {
      if (!this.hasDisplayStream() || !this.displayVideo || !this.workCanvas) return null;
      const v = this.displayVideo;
      if (!v.videoWidth || !v.videoHeight) return null;
      const plan = Brain ? Brain.downsamplePlan(v.videoWidth, v.videoHeight, width, height) : { width: 640, height: 360 };
      const canvas = this.workCanvas;
      canvas.width = plan.width;
      canvas.height = plan.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(v, 0, 0, plan.width, plan.height);
      const overview = canvas.toDataURL("image/jpeg", quality);
      const details = this.extractFoveaCrops(canvas, focusRects);
      return {
        overview,
        details,
        meta: { source: "display-media", details: details.map((d) => ({ label: d.label, rect: d.rect })) }
      };
    }

    async captureFromBridge(bridgeUrl, windowTitle, { focusRects = [] } = {}) {
      const base = String(bridgeUrl || "http://127.0.0.1:42069").replace(/\/$/, "");
      const res = await fetch(`${base}/api/native/screenshot?window=${encodeURIComponent(windowTitle || "")}`);
      if (!res.ok) throw new Error(`Bridge screenshot HTTP ${res.status}`);
      const payload = await res.json();
      const overview = Brain ? Brain.toDataUrl(payload.screenshotBase64 || payload.image || "") : payload.screenshotBase64;
      return {
        overview,
        details: [],
        meta: { source: "local-bridge", details: focusRects.map((r, i) => ({ label: r.label || `crop${i + 1}`, rect: r })) }
      };
    }

    async downsampleFile(file, maxW = 640, maxH = 360) {
      const url = URL.createObjectURL(file);
      try {
        const img = await new Promise((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = () => reject(new Error("Could not decode image file."));
          i.src = url;
        });
        const plan = Brain ? Brain.downsamplePlan(img.naturalWidth, img.naturalHeight, maxW, maxH) : { width: 640, height: 360 };
        const c = this.workCanvas || document.createElement("canvas");
        c.width = plan.width;
        c.height = plan.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, plan.width, plan.height);
        return c.toDataURL("image/jpeg", 0.72);
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    async captureBest({ mode = "auto", frame, bridgeUrl = "", nativeWindow = "", fallbackSlug = "", fallbackNotes = "", focusRects = [] } = {}) {
      if (mode === "bridge" || (mode === "auto" && nativeWindow && bridgeUrl)) {
        try {
          return await this.captureFromBridge(bridgeUrl, nativeWindow, { focusRects });
        } catch (_) {}
      }
      if (this.hasDisplayStream() && (mode === "display" || mode === "auto")) {
        const disp = this.captureFromDisplay({ focusRects });
        if (disp) return disp;
      }
      if (frame && (mode === "iframe" || mode === "auto")) {
        const ifr = this.captureFromIframe(frame, { focusRects });
        if (ifr) return ifr;
      }
      const fallback = notesToFrame(fallbackSlug, fallbackNotes);
      return {
        overview: fallback,
        details: [],
        meta: { source: "synthetic-card", details: [] }
      };
    }
  }

  // -------------------------------------------------------------------------
  // 5. Action Dispatcher (Iframe + Host Overlay + Local Companion Bridge)
  // -------------------------------------------------------------------------

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function resolveClickCoords(action, doc, win) {
    const target = action && action.target;
    const params = (action && action.params) || {};
    if (Number.isFinite(Number(params.x)) && Number.isFinite(Number(params.y))) {
      return {
        nx: Math.max(0, Math.min(1000, Number(params.x))),
        ny: Math.max(0, Math.min(1000, Number(params.y))),
        el: null
      };
    }
    if (typeof target === "string" && /^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/.test(target)) {
      const [rx, ry] = target.split(",").map(Number);
      return {
        nx: Math.max(0, Math.min(1000, rx)),
        ny: Math.max(0, Math.min(1000, ry)),
        el: null
      };
    }
    if (doc && win && typeof target === "string" && target.trim()) {
      let el = null;
      try { el = doc.querySelector(target) || doc.getElementById(target.replace(/^#/, "")); } catch (_) {}
      if (!el) {
        const btns = doc.querySelectorAll("button, a, [role='button']");
        for (const b of btns) {
          if (!b.disabled && ((b.innerText && b.innerText.includes(target)) || b.id === target)) {
            el = b;
            break;
          }
        }
      }
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          const vw = win.innerWidth || 1;
          const vh = win.innerHeight || 1;
          return {
            nx: Math.max(0, Math.min(1000, Math.round(((r.left + r.width / 2) / vw) * 1000))),
            ny: Math.max(0, Math.min(1000, Math.round(((r.top + r.height / 2) / vh) * 1000))),
            el
          };
        }
      }
    }
    return { nx: 500, ny: 500, el: null };
  }

  function dispatchKeyEventInWin(win, doc, type, rawKey) {
    const key = normalizeKeyValue(rawKey);
    const code = getKeyCode(key);
    const evInit = { key, code, bubbles: true, cancelable: true };
    const ev = new win.KeyboardEvent(type, evInit);
    const active = doc.activeElement && doc.activeElement !== doc.body ? doc.activeElement : null;
    if (active) active.dispatchEvent(ev);
    doc.dispatchEvent(ev);
    win.dispatchEvent(ev);
  }

  function dispatchMouseClickInWin(win, doc, nx, ny, button = "left", explicitEl = null, gameAction = null) {
    const vw = win.innerWidth || 1;
    const vh = win.innerHeight || 1;
    const x = Math.round((nx / 1000) * vw);
    const y = Math.round((ny / 1000) * vh);

    if ((gameAction === "gravegain2d_attack" || gameAction === "gravegain2d_aim") && win.GraveGainGame?.input && win.GraveGainGame?.player) {
      const game = win.GraveGainGame;
      const gx = (nx / 1000) * (game.canvas?.width || 1000);
      const gy = (ny / 1000) * (game.canvas?.height || 600);
      game.input.mouse.x = gx;
      game.input.mouse.y = gy;
      if (gameAction === "gravegain2d_attack") game.input.mouse.click = true;
      return `GraveGain2D ${gameAction} queued`;
    }
    if (gameAction && win.GraveGainBotInput) {
      if (gameAction === "attack" || gameAction === "gravegain3d_attack") {
        return win.GraveGainBotInput.click(nx, ny, "attack");
      }
      if (gameAction === "aim" || gameAction === "gravegain3d_aim") {
        win.GraveGainBotInput.move?.(nx, ny, "aim");
        win.GraveGainBotInput.lookToward?.(nx, ny);
        return `Bot aimed at ${nx},${ny}`;
      }
    }

    const el = explicitEl || doc.elementFromPoint(x, y) || doc.querySelector("canvas") || doc.body;
    if (!el) return `No element at ${x},${y}`;
    try { el.focus?.({ preventScroll: true }); } catch (_) {}
    const btn = button === "right" ? 2 : button === "middle" ? 1 : 0;
    const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: btn, buttons: btn === 0 ? 1 : btn === 2 ? 2 : 4 };
    el.dispatchEvent(new win.MouseEvent("mousedown", opts));
    el.dispatchEvent(new win.MouseEvent("mouseup", opts));
    if (button === "right") {
      el.dispatchEvent(new win.MouseEvent("contextmenu", opts));
    } else {
      el.dispatchEvent(new win.MouseEvent("click", opts));
    }
    flashClickInDoc(doc, win, nx, ny);
    return `${button === "right" ? "Right-clicked" : "Clicked"} ${el.tagName}${el.id ? "#" + el.id : ""} at ${x},${y}`;
  }

  async function dispatchAction(action, { frame = null, overlay = null, bridgeUrl = "", nativeWindow = "", showCursor = true } = {}) {
    if (!action || !action.type) return "No action specified";
    const type = String(action.type).toLowerCase();
    const duration = Math.max(40, Math.min(3000, Number(action.duration_ms) || 160));

    // Native Bridge Mode
    if (nativeWindow && bridgeUrl) {
      const base = String(bridgeUrl).replace(/\/$/, "");
      const res = await fetch(`${base}/api/native/input`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ windowTitle: nativeWindow, action })
      });
      const data = await res.json().catch(() => ({}));
      if (overlay && showCursor && (action.params?.x !== undefined || String(action.target).includes(","))) {
        const coords = resolveClickCoords(action, null, null);
        overlay.setCursor(coords.nx, coords.ny, `native:${type}`, type.includes("click"));
      }
      return data.result || `Bridge executed ${type}`;
    }

    const ctx = getFrameContext(frame);
    if (!ctx.accessible) {
      if (overlay && showCursor) {
        const coords = resolveClickCoords(action, null, null);
        overlay.setCursor(coords.nx, coords.ny, `${type} (external)`, type.includes("click"));
      }
      return `Simulated overlay ${type} (cross-origin or external window)`;
    }

    const { win, doc } = ctx;

    switch (type) {
      case "combo": {
        const rawSteps = (action.params && action.params.steps) || action.steps || [];
        const steps = (Array.isArray(rawSteps) ? rawSteps : []).slice(0, 8);
        if (!steps.length) return "Combo had no steps";
        if (overlay && showCursor) overlay.setCursor(500, 500, `combo:${action.target || steps.length}`, false);
        const held = [];
        const t0 = Date.now();
        let longest = 0;
        for (const s of steps) {
          if (s.op === "hold_keys" && Array.isArray(s.keys)) {
            longest = Math.max(longest, s.duration_ms || 350);
            for (const k of s.keys) {
              dispatchKeyEventInWin(win, doc, "keydown", k);
              held.push(k);
            }
          } else if (s.op === "hold" && s.key) {
            longest = Math.max(longest, s.duration_ms || 350);
            dispatchKeyEventInWin(win, doc, "keydown", s.key);
            held.push(s.key);
          }
        }
        const logs = [];
        for (const s of steps) {
          if (s.op === "press" && s.key) {
            dispatchKeyEventInWin(win, doc, "keydown", s.key);
            await sleep(45);
            dispatchKeyEventInWin(win, doc, "keyup", s.key);
            logs.push(`press ${s.key}`);
          } else if (s.op === "click" || s.op === "right_click" || s.op === "double_click") {
            const nx = Number.isFinite(Number(s.x)) ? Number(s.x) : 500;
            const ny = Number.isFinite(Number(s.y)) ? Number(s.y) : 500;
            if (showCursor) {
              moveCursorInDoc(doc, win, nx, ny, s.op);
              if (overlay) overlay.setCursor(nx, ny, s.op, true);
            }
            const msg = dispatchMouseClickInWin(win, doc, nx, ny, s.op === "right_click" ? "right" : s.button || "left");
            if (s.op === "double_click") {
              await sleep(50);
              dispatchMouseClickInWin(win, doc, nx, ny, "left");
            }
            logs.push(msg);
          } else if (s.op === "look" || s.op === "drag_look") {
            const dx = Number(s.dx) || 0;
            const dy = Number(s.dy) || 0;
            win.GraveGainBotInput?.lookToward?.(500 + dx, 500 + dy);
            win.dispatchEvent(new win.MouseEvent("mousemove", { bubbles: true, clientX: (win.innerWidth || 800) / 2 + dx, clientY: (win.innerHeight || 600) / 2 + dy }));
            logs.push(`look ${dx},${dy}`);
          } else if (s.op === "wait") {
            await sleep(Math.max(40, Math.min(2000, Number(s.duration_ms) || 120)));
            logs.push("wait");
          }
          await sleep(25);
        }
        const remain = longest - (Date.now() - t0);
        if (remain > 0) await sleep(remain);
        for (const k of held.reverse()) dispatchKeyEventInWin(win, doc, "keyup", k);
        return `Combo(${steps.length}): ${logs.join("; ")}`;
      }

      case "click":
      case "right_click":
      case "double_click": {
        const { nx, ny, el } = resolveClickCoords(action, doc, win);
        if (showCursor) {
          moveCursorInDoc(doc, win, nx, ny, `${type} ${action.target || ""}`);
          if (overlay) overlay.setCursor(nx, ny, `${type}`, true);
          await sleep(CLICK_GLIDE_MS);
        }
        const button = type === "right_click" ? "right" : action.params?.button || "left";
        const msg = dispatchMouseClickInWin(win, doc, nx, ny, button, el, action.params?.gameAction);
        if (type === "double_click") {
          await sleep(50);
          dispatchMouseClickInWin(win, doc, nx, ny, "left", el, action.params?.gameAction);
        }
        return msg;
      }

      case "move_mouse": {
        const { nx, ny } = resolveClickCoords(action, doc, win);
        if (showCursor) {
          moveCursorInDoc(doc, win, nx, ny, "move");
          if (overlay) overlay.setCursor(nx, ny, "move", false);
        }
        const x = Math.round((nx / 1000) * (win.innerWidth || 1));
        const y = Math.round((ny / 1000) * (win.innerHeight || 1));
        win.dispatchEvent(new win.MouseEvent("mousemove", { bubbles: true, clientX: x, clientY: y }));
        return `Moved cursor to ${nx},${ny}`;
      }

      case "drag_look": {
        const dx = Number(action.params?.dx ?? String(action.target || "").split(",")[0]) || 120;
        const dy = Number(action.params?.dy ?? String(action.target || "").split(",")[1]) || 0;
        win.GraveGainBotInput?.lookToward?.(500 + dx, 500 + dy);
        win.dispatchEvent(new win.MouseEvent("mousemove", { bubbles: true, clientX: (win.innerWidth || 800) / 2 + dx, clientY: (win.innerHeight || 600) / 2 + dy }));
        if (overlay && showCursor) overlay.setCursor(Math.max(0, Math.min(1000, 500 + dx)), Math.max(0, Math.min(1000, 500 + dy)), `look ${dx},${dy}`, false);
        return `Dragged look ${dx},${dy}`;
      }

      case "press_key": {
        const key = action.params?.key || action.target || "Space";
        if (overlay && showCursor) overlay.setCursor(500, 500, `key:${key === " " ? "Space" : key}`, false);
        if (showCursor) moveCursorInDoc(doc, win, 500, 500, `key ${key}`);
        doc.querySelector("canvas")?.focus?.({ preventScroll: true });
        dispatchKeyEventInWin(win, doc, "keydown", key);
        dispatchKeyEventInWin(win, doc, "keypress", key);
        await sleep(50);
        dispatchKeyEventInWin(win, doc, "keyup", key);
        return `Pressed ${key === " " ? "Space" : key}`;
      }

      case "hold_key": {
        const key = action.params?.key || action.target || "w";
        if (overlay && showCursor) overlay.setCursor(500, 500, `hold:${key} ${duration}ms`, false);
        doc.querySelector("canvas")?.focus?.({ preventScroll: true });
        dispatchKeyEventInWin(win, doc, "keydown", key);
        await sleep(duration);
        dispatchKeyEventInWin(win, doc, "keyup", key);
        return `Held ${key} for ${duration}ms`;
      }

      case "hold_keys": {
        const keys = (action.params?.keys || String(action.target || "w").split(",")).map((k) => String(k).trim()).filter(Boolean).slice(0, 3);
        const list = keys.length ? keys : ["w"];
        if (overlay && showCursor) overlay.setCursor(500, 500, `hold:${list.join("+")}`, false);
        doc.querySelector("canvas")?.focus?.({ preventScroll: true });
        for (const k of list) dispatchKeyEventInWin(win, doc, "keydown", k);
        await sleep(duration);
        for (const k of list.slice().reverse()) dispatchKeyEventInWin(win, doc, "keyup", k);
        return `Held ${list.join("+")} for ${duration}ms`;
      }

      case "type_text": {
        const text = String(action.params?.text || action.target || "");
        let el = action.params?.selector ? doc.querySelector(action.params.selector) : doc.activeElement;
        if (!el || el === doc.body) {
          el = doc.querySelector('input:not([type="hidden"]), textarea');
        }
        if (el && "value" in el) {
          el.focus?.();
          el.value = text;
          el.dispatchEvent(new win.Event("input", { bubbles: true }));
          el.dispatchEvent(new win.Event("change", { bubbles: true }));
          return `Typed "${text.slice(0, 40)}"`;
        }
        // Typing games (e.g. Last Words Zombies) listen to keydown per character
        for (const ch of text.slice(0, 24)) {
          dispatchKeyEventInWin(win, doc, "keydown", ch);
          await sleep(25);
          dispatchKeyEventInWin(win, doc, "keyup", ch);
        }
        return `Sent keystrokes for "${text.slice(0, 24)}"`;
      }

      case "scroll": {
        const dir = action.params?.direction || action.target || "down";
        const amount = Number(action.params?.amount) || 350;
        win.scrollBy({ top: dir === "up" ? -amount : amount, left: 0, behavior: "smooth" });
        return `Scrolled ${dir} ${amount}px`;
      }

      case "wheel": {
        const delta = Number(action.params?.delta ?? -1);
        win.dispatchEvent(new win.WheelEvent("wheel", { bubbles: true, deltaY: delta > 0 ? -100 : 100 }));
        return `Wheeled ${delta}`;
      }

      case "refresh":
        win.location.reload();
        return "Reloaded game frame";

      case "wait":
      default:
        await sleep(duration);
        return `Waited ${duration}ms`;
    }
  }

  // -------------------------------------------------------------------------
  // 6. Replay Engine & State Checkpoints
  // -------------------------------------------------------------------------

  class ReplayManager {
    constructor() {
      this.isRecording = false;
      this.targetId = "";
      this.recordingStartTime = 0;
      this.recordedActions = [];
      this.sessions = [];
    }

    startRecording(targetId = "game") {
      this.isRecording = true;
      this.targetId = targetId;
      this.recordingStartTime = Date.now();
      this.recordedActions = [];
    }

    recordAction(action, status = "ok") {
      if (!this.isRecording || !action) return;
      this.recordedActions.push({
        offsetMs: Date.now() - this.recordingStartTime,
        action: JSON.parse(JSON.stringify(action)),
        status
      });
    }

    stopRecording(name) {
      if (!this.isRecording) return null;
      this.isRecording = false;
      const session = {
        format: "givegigsgames-replay",
        version: 1,
        id: `replay_${Date.now()}`,
        name: name || `Replay ${this.targetId} (${new Date().toLocaleTimeString()})`,
        gameId: this.targetId,
        durationMs: Date.now() - this.recordingStartTime,
        actionCount: this.recordedActions.length,
        actions: this.recordedActions.slice()
      };
      this.sessions.unshift(session);
      if (this.sessions.length > 20) this.sessions.pop();
      return session;
    }

    async playReplay(session, dispatchFn, onStep) {
      if (!session || !Array.isArray(session.actions)) throw new Error("Invalid replay session.");
      let prevOffset = 0;
      for (let i = 0; i < session.actions.length; i++) {
        const entry = session.actions[i];
        const waitMs = Math.max(0, Math.min(1500, (entry.offsetMs || 0) - prevOffset));
        prevOffset = entry.offsetMs || 0;
        if (waitMs > 0) await sleep(waitMs);
        const result = await dispatchFn(entry.action);
        if (typeof onStep === "function") onStep({ index: i, total: session.actions.length, entry, result });
      }
      return { replayed: session.actions.length };
    }
  }

  function captureStorageSnapshot(slug = "") {
    const entries = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || key.startsWith("arcade:") || key.startsWith("gggTester:")) continue;
        const value = localStorage.getItem(key);
        if (value !== null) entries.push({ key, value });
      }
    } catch (_) {}
    return {
      id: `ckpt_${Date.now()}`,
      slug,
      createdAt: new Date().toISOString(),
      entries
    };
  }

  function restoreStorageSnapshot(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.entries)) return 0;
    let count = 0;
    try {
      for (const entry of snapshot.entries) {
        if (entry && typeof entry.key === "string" && typeof entry.value === "string") {
          localStorage.setItem(entry.key, entry.value);
          count += 1;
        }
      }
    } catch (_) {}
    return count;
  }

  return {
    getKeyCode,
    normalizeKeyValue,
    CURSOR_ID,
    CLICK_GLIDE_MS,
    HostBotOverlay,
    getFrameContext,
    executeInIframe,
    inspectIframeDOM,
    inspectIframePerformance,
    installGuestErrorHook,
    auditDocumentDOM,
    runFullAudit,
    notesToFrame,
    FrameCaptureManager,
    dispatchAction,
    ReplayManager,
    captureStorageSnapshot,
    restoreStorageSnapshot
  };
});
