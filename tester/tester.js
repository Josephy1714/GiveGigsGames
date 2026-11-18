(() => {
  "use strict";

  const Playbooks = window.GGGPlaybooks;
  const BrainMod = window.GGGBrain;
  const Controllers = window.GGGControllers;
  const Runtime = window.GGGRuntime;

  const byId = (id) => document.getElementById(id);
  const library = byId("library-view");
  const player = byId("player-view");
  const grid = byId("game-grid");
  const search = byId("game-search");
  const genre = byId("genre-filter");
  const count = byId("game-count");
  const sort = byId("game-sort");
  const tagSearch = byId("tag-search");
  const tagOptions = byId("tag-options");
  const tagMatch = byId("tag-match");
  const selectedTagCount = byId("selected-tag-count");
  const frame = byId("game-frame");
  const frameWrap = byId("frame-wrap");
  const externalPanel = byId("external-runtime");
  const devConsole = byId("dev-console");
  const viewport = byId("viewport-preset");

  const captureStage = byId("capture-preview-stage");
  const captureStageImg = byId("capture-stage-img");
  const captureStageHint = byId("capture-stage-hint");
  const overlayCanvas = byId("bot-overlay-canvas");

  let games = [];
  let selected = null;
  const selectedTags = new Set();

  // Tester Studio Engines
  const brain = new BrainMod.AgentBrain();
  const captureMgr = new Runtime.FrameCaptureManager();
  const overlay = new Runtime.HostBotOverlay(overlayCanvas);
  const replayMgr = new Runtime.ReplayManager();
  const nativeDirector = new Controllers.NativeGameDirector();

  // Tester Session State
  const state = {
    targetMode: "iframe", // iframe | custom-url | display | bridge
    customUrl: "",
    nativeWindow: "",
    running: false,
    paused: false,
    loopTimer: null,
    stepInFlight: false,
    stepCount: 0,
    startedAt: 0,
    lastPreFrame: null,
    guestLogs: [],
    timeline: [],
    selectedFrameId: null,
    checkpoints: [],
    checklistVerdicts: {},
    lastAudit: null,
    botProgram: Controllers.BotScriptEngine.ROBOT_SCRIPT_EXAMPLE,
    botCursorIdx: 0
  };

  const CHECKLIST_ITEMS = [
    { id: "controls", label: "Controls", hint: "Keyboard / mouse / touch input responds on first try, no stuck keys." },
    { id: "audio", label: "Audio", hint: "Sound starts cleanly after user gesture without console AudioContext errors." },
    { id: "mobile", label: "Mobile layout", hint: "Playable at 390px phone portrait preset without clipping or horizontal scroll." },
    { id: "resolution", label: "Resolution scaling", hint: "Canvas fills frame cleanly at desktop and resized windows." }
  ];

  // -------------------------------------------------------------------------
  // Logging & Status Helpers
  // -------------------------------------------------------------------------

  function appendLog(line, level = "info") {
    const logEl = byId("live-log");
    if (!logEl) return;
    const stamp = new Date().toLocaleTimeString();
    const prefix = level === "error" ? "[ERR]" : level === "warn" ? "[WARN]" : "[INFO]";
    const existing = logEl.textContent ? logEl.textContent.split("\n") : [];
    existing.push(`${stamp} ${prefix} ${line}`);
    if (existing.length > 140) existing.splice(0, existing.length - 140);
    logEl.textContent = existing.join("\n");
    logEl.scrollTop = logEl.scrollHeight;
  }

  function updateStatusPills(sourceLabel) {
    const badge = byId("status-badge");
    if (badge) {
      badge.className = "pill " + (state.running ? (state.paused ? "pill-paused" : "pill-running") : "pill-idle");
      badge.textContent = state.running ? (state.paused ? "PAUSED" : "RUNNING") : "IDLE";
    }
    if (sourceLabel) byId("status-source").textContent = `source: ${sourceLabel}`;
    byId("status-steps").textContent = `steps: ${state.stepCount}`;
    byId("status-bugs").textContent = `bugs: ${brain.bugs.length}`;
    byId("status-stuck").textContent = `stuck: ${brain.sessionStats.stuckEvents}`;
    byId("status-tokens").textContent = `tokens: ${brain.tokenStats.totalTokens}`;

    byId("btn-tester-start").disabled = state.running && !state.paused;
    byId("btn-tester-pause").disabled = !state.running;
    byId("btn-tester-pause").textContent = state.paused ? "▶ Resume" : "⏸ Pause";
    byId("btn-tester-stop").disabled = !state.running;
  }

  // -------------------------------------------------------------------------
  // Existing Catalog Library & Viewport Controls
  // -------------------------------------------------------------------------

  viewport.addEventListener("change", () => {
    const [width, height] = viewport.value.split("x");
    frameWrap.style.overflow = width ? "auto" : "";
    frame.style.width = width ? `${width}px` : "";
    frame.style.height = height ? `${height}px` : "";
    frame.style.maxWidth = width ? "none" : "";
    overlay.render();
  });

  byId("draft-bug").addEventListener("click", () => {
    const draft = byId("bug-draft");
    const targetName = selected ? `${selected.title} (${selected.slug})` : state.customUrl || state.nativeWindow || "Custom Target";
    draft.value = [
      `Game: ${targetName}`,
      `Tester URL: ${location.href}`,
      `Build: ${(selected && selected.buildId) || "Not recorded"}`,
      `Frame size: ${frame.clientWidth || frameWrap.clientWidth} × ${frame.clientHeight || frameWrap.clientHeight}`,
      `Browser: ${navigator.userAgent}`,
      `Steps run: ${state.stepCount} | Bugs logged: ${brain.bugs.length}`,
      "",
      byId("bug-steps").value
    ].join("\n");
    draft.focus();
    draft.select();
  });

  const tagsFor = (game) => [...new Set((game.tags || []).map((tag) => String(tag).trim()).filter(Boolean))];
  const compare = (a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });

  function renderTagOptions() {
    const query = tagSearch.value.trim().toLowerCase();
    tagOptions.replaceChildren();
    [...new Set(games.flatMap(tagsFor))]
      .sort(compare)
      .filter((tag) => tag.toLowerCase().includes(query))
      .forEach((tag) => {
        const label = document.createElement("label");
        label.className = "tag-option";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = tag;
        checkbox.checked = selectedTags.has(tag);
        checkbox.addEventListener("change", () => {
          checkbox.checked ? selectedTags.add(tag) : selectedTags.delete(tag);
          updateTagCount();
          render();
        });
        const text = document.createElement("span");
        text.textContent = tag;
        label.append(checkbox, text);
        tagOptions.append(label);
      });
  }

  function updateTagCount() {
    selectedTagCount.textContent = selectedTags.size ? `${selectedTags.size} selected` : "All tags";
  }

  const safePath = (game) => {
    if (game.runtimeType === "external") return game.externalUrl;
    if (!/^[a-zA-Z0-9-]+(?:\/[a-zA-Z0-9._-]+)*$/.test(game.entrypoint || "")) return "";
    return `/games/${game.entrypoint.split("/").map(encodeURIComponent).join("/")}`;
  };

  function render() {
    const query = search.value.trim().toLowerCase();
    const selectedGenre = genre.value;
    const filtered = games.filter((game) => {
      const tags = tagsFor(game);
      const haystack = `${game.title} ${game.genre} ${game.description} ${tags.join(" ")}`.toLowerCase();
      const matches = [...selectedTags].map((tag) => tags.includes(tag));
      const matchesTags = !matches.length || (tagMatch.value === "all" ? matches.every(Boolean) : matches.some(Boolean));
      return (!query || haystack.includes(query)) && (!selectedGenre || game.genre === selectedGenre) && matchesTags;
    });
    const mode = sort.value;
    filtered.sort((a, b) => {
      if (mode === "genre") return compare(a.genre || "", b.genre || "") || compare(a.title, b.title);
      if (mode === "tag") return compare(tagsFor(a).sort(compare)[0] || "", tagsFor(b).sort(compare)[0] || "") || compare(a.title, b.title);
      if (mode === "tags-desc") return tagsFor(b).length - tagsFor(a).length || compare(a.title, b.title);
      if (mode === "tags-asc") return tagsFor(a).length - tagsFor(b).length || compare(a.title, b.title);
      return compare(a.title, b.title);
    });
    count.textContent = `${filtered.length} game${filtered.length === 1 ? "" : "s"}`;
    grid.replaceChildren();
    for (const game of filtered) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "game-card";
      card.setAttribute("aria-label", `Play ${game.title}`);
      const top = document.createElement("div");
      top.className = "game-card-top";
      const emoji = document.createElement("span");
      emoji.className = "game-emoji";
      emoji.setAttribute("aria-hidden", "true");
      emoji.textContent = game.emoji || "🎮";
      top.append(emoji);
      if (game.featured) {
        const badge = document.createElement("span");
        badge.className = "featured";
        badge.textContent = "Featured";
        top.append(badge);
      }
      const title = document.createElement("h2");
      title.textContent = game.title;
      const category = document.createElement("span");
      category.className = "game-genre";
      category.textContent = game.genre;
      const description = document.createElement("p");
      description.textContent = game.description;
      const tags = document.createElement("div");
      tags.className = "game-tags";
      for (const tag of tagsFor(game)) {
        const chip = document.createElement("span");
        chip.className = "game-tag";
        chip.textContent = tag;
        tags.append(chip);
      }
      const play = document.createElement("span");
      play.className = "play-link";
      play.textContent = "Launch & Auto-Test →";
      card.append(top, title, category, description, tags, play);
      card.addEventListener("click", () => openGame(game));
      grid.append(card);
    }
  }

  // -------------------------------------------------------------------------
  // Target Launching (Catalog Game, Custom URL, Screen Capture, Native Bridge)
  // -------------------------------------------------------------------------

  function selectStudioTab(targetTab = "runner") {
    document.querySelectorAll(".studio-tab").forEach((t) => {
      const active = t.dataset.tab === targetTab;
      t.classList.toggle("active", active);
      t.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll(".studio-panel").forEach((panel) => {
      panel.hidden = panel.id !== `panel-${targetTab}`;
    });
  }

  function resetSessionTelemetry() {
    stopAutoTest();
    selectStudioTab("runner");
    brain.reset();
    state.stepCount = 0;
    state.startedAt = 0;
    state.lastPreFrame = null;
    state.guestLogs = [];
    state.timeline = [];
    state.selectedFrameId = null;
    state.lastAudit = null;
    overlay.clear();
    byId("live-log").textContent = "";
    byId("live-reasoning-box").textContent = "Ready. Press Start Auto-Test or Step Once.";
    renderTimeline();
    renderBugList();
    updateStatusPills("ready");
  }

  function applyResolvedRules(slug, catalogGame) {
    let pageScrape = null;
    const ctx = Runtime.getFrameContext(frame);
    if (ctx.accessible) {
      pageScrape = Playbooks.scrapeDocumentRules(ctx.doc);
    }
    const resolved = Playbooks.resolveGameRules({
      slug,
      catalogGame,
      pageScrape,
      customRules: ""
    });
    byId("custom-game-rules").value = resolved.text;
    brain.updateConfig({
      gameRules: resolved.text,
      preferredKeys: resolved.playbook?.preferredKeys || []
    });
  }

  function setTargetModeUI(mode) {
    state.targetMode = mode;
    byId("studio-target-mode").value = mode;
    byId("custom-url-controls").hidden = mode !== "custom-url";
    byId("bridge-controls").hidden = mode !== "bridge";

    const showCaptureStage = mode === "display" || mode === "bridge";
    captureStage.hidden = !showCaptureStage;
    frame.hidden = showCaptureStage || (selected && selected.runtimeType === "external" && mode === "iframe");
    frameWrap.hidden = !showCaptureStage && Boolean(selected && selected.runtimeType === "external" && mode === "iframe");
    if (showCaptureStage) {
      externalPanel.hidden = true;
      frameWrap.hidden = false;
    }
  }

  function openGame(game) {
    const source = safePath(game);
    if (!source) return;
    resetSessionTelemetry();
    selected = game;
    state.customUrl = "";

    byId("player-name").textContent = game.title;
    byId("player-emoji").textContent = game.emoji || "🎮";
    byId("player-genre").textContent = game.genre;
    byId("player-description").textContent = game.description;
    byId("open-game").href = source;
    byId("view-info").href = `/ggg/info/${encodeURIComponent(game.slug)}`;
    byId("view-guide").href = `/ggg/guide/${encodeURIComponent(game.slug)}`;
    byId("view-roadmap").href = `/ggg/roadmap/${encodeURIComponent(game.slug)}`;
    byId("view-play").href = game.runtimeType === "external" ? source : `/ggg/play/${encodeURIComponent(game.slug)}`;
    byId("view-info").hidden = false;
    byId("view-guide").hidden = false;
    byId("view-roadmap").hidden = false;
    byId("view-play").hidden = false;

    frame.title = `${game.title} game`;
    const external = game.runtimeType === "external";
    setTargetModeUI(external ? "display" : "iframe");
    if (external) {
      frameWrap.hidden = true;
      externalPanel.hidden = false;
      byId("open-external").href = source;
      frame.src = "about:blank";
    } else {
      frameWrap.hidden = false;
      externalPanel.hidden = true;
      frame.src = `${source}${source.includes("?") ? "&" : "?"}ggTester=1`;
    }

    devConsole.hidden = game.slug.toLowerCase() !== "gravegain2da";
    applyResolvedRules(game.slug, game);
    library.hidden = true;
    player.hidden = false;
    appendLog(`Loaded catalog game "${game.title}" (${game.slug}).`);
    try { history.replaceState(null, "", `?game=${encodeURIComponent(game.slug)}`); } catch (_) {}
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openArbitraryTarget({ mode = "custom-url", url = "" } = {}) {
    resetSessionTelemetry();
    selected = null;
    state.customUrl = url;

    byId("view-info").hidden = true;
    byId("view-guide").hidden = true;
    byId("view-roadmap").hidden = true;
    byId("view-play").hidden = true;
    devConsole.hidden = true;
    externalPanel.hidden = true;

    if (mode === "custom-url") {
      const cleanUrl = String(url || "").trim();
      byId("player-name").textContent = cleanUrl ? `Web Target: ${cleanUrl}` : "Arbitrary Web Game Debugger";
      byId("player-emoji").textContent = "🌐";
      byId("player-genre").textContent = "EXTERNAL WEB GAME";
      byId("player-description").textContent =
        "Testing an arbitrary web game URL. Same-origin targets support full DOM/canvas inspection; cross-origin targets can also stream pixels via Screen Capture.";
      byId("studio-custom-url").value = cleanUrl;
      byId("open-game").href = cleanUrl || "#";
      frame.src = cleanUrl || "about:blank";
      setTargetModeUI("custom-url");
      applyResolvedRules("custom-web-game", {
        title: cleanUrl || "Custom Web Game",
        genre: "Web Game",
        description: "Arbitrary web game loaded in tester."
      });
      appendLog(`Opened Web Game URL target: ${cleanUrl || "(enter URL)"}`);
    } else if (mode === "display") {
      byId("player-name").textContent = "Arbitrary Game Program (Screen Capture)";
      byId("player-emoji").textContent = "🖥️";
      byId("player-genre").textContent = "LIVE WINDOW / TAB CAPTURE";
      byId("player-description").textContent =
        "Stream any desktop game window, browser tab, or external game program using getDisplayMedia and analyze every frame with your AI key or offline heuristics.";
      byId("open-game").href = "#";
      frame.src = "about:blank";
      setTargetModeUI("display");
      applyResolvedRules("custom-program", {
        title: "Desktop / External Game Program",
        genre: "Program",
        description: "Arbitrary game program captured via Screen/Window sharing."
      });
      appendLog("Opened Screen/Window Capture mode. Click 'Share Game Window/Tab' to start streaming.");
    } else if (mode === "bridge") {
      byId("player-name").textContent = "Local Desktop Game Bridge";
      byId("player-emoji").textContent = "🔌";
      byId("player-genre").textContent = "NATIVE WIN32 BRIDGE";
      byId("player-description").textContent =
        "Connect to the local GiveGigsGames Companion Bridge (npm run tester:bridge) to capture native desktop windows, send real OS mouse/keyboard combos via input_sim.py, and run static source audits.";
      byId("open-game").href = "#";
      frame.src = "about:blank";
      byId("driver-mode").value = "native";
      setTargetModeUI("bridge");
      applyResolvedRules("native-game", Playbooks.resolveGameProfile("generic-game"));
      appendLog("Opened Local Native Bridge mode. Refresh windows or click Test Local Bridge.");
      void refreshBridgeWindows();
    }

    library.hidden = true;
    player.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeGame() {
    stopAutoTest();
    captureMgr.stopDisplayCapture();
    frame.src = "about:blank";
    player.hidden = true;
    library.hidden = false;
    selected = null;
    const gameTestRoute = /^\/ggg\/test\/[^/]+\/?$/i.test(location.pathname);
    try { history.replaceState(null, "", gameTestRoute ? "/tester/" : location.pathname); } catch (_) {}
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  window.addEventListener("message", (event) => {
    if (event.source === frame.contentWindow && event.data?.type === "givegigsgames:back-to-select") {
      closeGame();
    }
  });

  // Re-hook iframe console/errors and refresh rules whenever the iframe finishes loading
  frame.addEventListener("load", () => {
    if (!frame.src || frame.src === "about:blank") return;
    const hookStatus = Runtime.installGuestErrorHook(frame, (line) => {
      state.guestLogs.push(line);
      if (state.guestLogs.length > 80) state.guestLogs.shift();
      appendLog(line, "warn");
    });
    appendLog(`Iframe loaded (${hookStatus}).`);
    if (selected) applyResolvedRules(selected.slug, selected);
  });

  // -------------------------------------------------------------------------
  // Self-Inputted API Key & Provider Settings (Browser-Local Only)
  // -------------------------------------------------------------------------

  const STORAGE_PREFS_KEY = "gggTester:prefs";
  const STORAGE_APIKEY_KEY = "gggTester:apiKey";

  function syncProviderUI() {
    const provider = byId("ai-provider").value;
    const spec = BrainMod.PROVIDERS[provider] || BrainMod.PROVIDERS.heuristic;
    const modelInput = byId("ai-model");
    const epInput = byId("ai-endpoint");
    if (!modelInput.dataset.userEdited) {
      modelInput.value = spec.defaultModel;
    }
    if (!epInput.dataset.userEdited) {
      epInput.value = spec.defaultEndpoint;
    }
    modelInput.placeholder = spec.defaultModel;
    epInput.placeholder = spec.defaultEndpoint || "(not required)";
    saveTesterPrefs();
  }

  function saveTesterPrefs() {
    try {
      const prefs = {
        provider: byId("ai-provider").value,
        modelName: byId("ai-model").value,
        endpointUrl: byId("ai-endpoint").value,
        bridgeUrl: byId("bridge-url").value,
        driverMode: byId("driver-mode").value,
        rememberKey: byId("remember-api-key").checked,
        fovea: byId("opt-fovea").checked,
        adaptive: byId("opt-adaptive").checked,
        cursor: byId("opt-cursor").checked,
        maxSteps: Number(byId("opt-max-steps").value) || 50,
        delayMs: Number(byId("opt-delay-ms").value) || 650
      };
      localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(prefs));
      const key = byId("ai-api-key").value;
      if (prefs.rememberKey && key) {
        localStorage.setItem(STORAGE_APIKEY_KEY, key);
      } else {
        localStorage.removeItem(STORAGE_APIKEY_KEY);
      }
      sessionStorage.setItem(STORAGE_APIKEY_KEY, key);
    } catch (_) {}
  }

  function loadTesterPrefs() {
    const defaultBridge =
      location.hostname === "127.0.0.1" || location.hostname === "localhost"
        ? location.origin
        : "http://127.0.0.1:42069";
    byId("bridge-url").value = defaultBridge;
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_PREFS_KEY) || "null");
      if (raw) {
        if (raw.provider) byId("ai-provider").value = raw.provider;
        if (raw.modelName) {
          byId("ai-model").value = raw.modelName;
          byId("ai-model").dataset.userEdited = "1";
        }
        if (raw.endpointUrl) {
          byId("ai-endpoint").value = raw.endpointUrl;
          byId("ai-endpoint").dataset.userEdited = "1";
        }
        if (raw.bridgeUrl) byId("bridge-url").value = raw.bridgeUrl;
        if (raw.driverMode) byId("driver-mode").value = raw.driverMode;
        byId("remember-api-key").checked = Boolean(raw.rememberKey);
        if (typeof raw.fovea === "boolean") byId("opt-fovea").checked = raw.fovea;
        if (typeof raw.adaptive === "boolean") byId("opt-adaptive").checked = raw.adaptive;
        if (typeof raw.cursor === "boolean") byId("opt-cursor").checked = raw.cursor;
        if (raw.maxSteps) byId("opt-max-steps").value = raw.maxSteps;
        if (raw.delayMs) byId("opt-delay-ms").value = raw.delayMs;
      }
      const savedKey = sessionStorage.getItem(STORAGE_APIKEY_KEY) || localStorage.getItem(STORAGE_APIKEY_KEY) || "";
      if (savedKey) byId("ai-api-key").value = savedKey;
    } catch (_) {}
    syncProviderUI();
  }

  function applyConfigToBrain() {
    brain.updateConfig({
      provider: byId("ai-provider").value,
      apiKey: byId("ai-api-key").value.trim(),
      modelName: byId("ai-model").value.trim(),
      endpointUrl: byId("ai-endpoint").value.trim(),
      gameRules: byId("custom-game-rules").value.trim(),
      foveatedVision: byId("opt-fovea").checked
    });
  }

  // -------------------------------------------------------------------------
  // Autonomous Gameplay Tester Step & Loop
  // -------------------------------------------------------------------------

  async function decideAction(frameData, domSnapshot) {
    applyConfigToBrain();
    const driverMode = byId("driver-mode").value;
    const slug = (selected && selected.slug) || (state.targetMode === "bridge" ? state.nativeWindow : "custom");
    const executeJS = (code) => Runtime.executeInIframe(frame, code);

    // 1. Native Desktop / Arbitrary Program Driver
    if (driverMode === "native" || (state.targetMode === "bridge" && driverMode === "auto")) {
      const title = state.nativeWindow || (selected && selected.title) || "Generic Game";
      const profile = Playbooks.resolveGameProfile(title);
      const provider = brain.config.provider;
      const spec = BrainMod.PROVIDERS[provider] || BrainMod.PROVIDERS.heuristic;
      const canLLM = provider !== "heuristic" && (!spec.requiresKey || Boolean(brain.config.apiKey));
      if (canLLM) {
        try {
          const prompt = Controllers.buildNativeGamePrompt({
            profile,
            recentActions: brain.replayActions.slice(-6).map((r) => r.action),
            stuck: brain.detectStuckState(frameData.overview),
            extraRules: byId("custom-game-rules").value
          });
          const raw = await brain.callLLM(prompt, frameData.overview, frameData.details);
          const parsed = Controllers.parseNativeDecision(raw);
          if (parsed) return { ...parsed, source: "ai" };
        } catch (err) {
          appendLog(`Native LLM fallback: ${err.message}`, "warn");
        }
      }
      nativeDirector.setTarget(title);
      return nativeDirector.choose(frameData.overview || "");
    }

    // 2. GiveGigs BotScript Deterministic Engine
    if (driverMode === "botscript") {
      const perf = Runtime.inspectIframePerformance(frame);
      const telemetry = perf.globals?.GraveGainGame || perf.globals?.gameState || {};
      const obs = Controllers.deriveBotObservation(telemetry, domSnapshot, state.stepCount);
      const picked = Controllers.chooseRobotRule(state.botProgram, obs, state.botCursorIdx);
      state.botCursorIdx = picked.nextCursor;
      const action = Controllers.mapRobotRuleToGameAction(picked.rule, state.stepCount);
      return {
        status: "playing",
        source: "botscript",
        reasoning: `BotScript (${state.botProgram.name}): matched "${picked.rule?.when || "none"}" -> ${picked.rule?.action || "wait"}.`,
        action,
        next_delay_ms: 360
      };
    }

    // 3. Game-specific reflex drivers (Overtake, FriendSlop, GraveGain)
    if (driverMode === "auto" || driverMode === "playbook") {
      if (state.targetMode === "iframe" && selected) {
        const lowSlug = selected.slug.toLowerCase();
        if (lowSlug === "overtake") {
          const snap = await executeJS("window.gameState && typeof window.gameState.snapshot === 'function' ? window.gameState.snapshot() : null");
          if (snap) {
            const dec = Controllers.decideOvertake(snap);
            if (dec) return dec;
          }
        }
        if (lowSlug === "friendslop") {
          const dec = await Controllers.runFriendSlopAutoplay(executeJS);
          if (dec) return dec;
        }
        if (lowSlug.startsWith("gravegain")) {
          const dec = await Controllers.runGraveGainAutoplay(executeJS, selected.slug);
          if (dec) return dec;
        }
      }

      if (driverMode === "playbook") {
        return Controllers.runPlaybookAutoplay({
          slug,
          catalogGame: selected,
          domSnapshot,
          stepIndex: state.stepCount,
          lastTarget: brain.lastActionTarget
        });
      }
    }

    // 4. BRAID Vision & DOM Agent (uses self-inputted API key if configured; falls back to Playbook/Heuristic)
    const provider = brain.config.provider;
    const spec = BrainMod.PROVIDERS[provider] || BrainMod.PROVIDERS.heuristic;
    const hasAI = provider !== "heuristic" && (!spec.requiresKey || Boolean(brain.config.apiKey));
    if (!hasAI && driverMode === "auto") {
      return Controllers.runPlaybookAutoplay({
        slug,
        catalogGame: selected,
        domSnapshot,
        stepIndex: state.stepCount,
        lastTarget: brain.lastActionTarget
      });
    }

    return await brain.chooseNextAction(frameData.overview, domSnapshot, driverMode === "playbook", state.guestLogs, {
      extraImages: frameData.details,
      visionMeta: frameData.meta
    });
  }

  async function runSingleStep() {
    if (state.stepInFlight) return;
    state.stepInFlight = true;
    const t0 = performance.now();
    try {
      if (state.startedAt === 0) state.startedAt = Date.now();
      const showCursor = byId("opt-cursor").checked;
      const foveaOn = byId("opt-fovea").checked;

      // Compute foveated vision crops for this frame
      const focusRects = foveaOn
        ? BrainMod.FoveatedVision.mergeFocusRequests({
            requested: brain._pendingFocus || [],
            context: { genre: selected?.genre || "", status: "playing" }
          })
        : [];

      if (showCursor) overlay.setFoveaRects(focusRects);
      else overlay.setFoveaRects([]);

      const captureMode =
        state.targetMode === "bridge"
          ? "bridge"
          : state.targetMode === "display"
            ? "display"
            : "auto";

      const frameData = await captureMgr.captureBest({
        mode: captureMode,
        frame,
        bridgeUrl: byId("bridge-url").value.trim(),
        nativeWindow: state.nativeWindow,
        fallbackSlug: (selected && selected.slug) || state.customUrl || "custom-game",
        fallbackNotes: `Target mode: ${state.targetMode}. Steps: ${state.stepCount}. Use Screen Capture or Local Bridge for live pixels on cross-origin targets.`,
        focusRects
      });

      if ((state.targetMode === "display" || state.targetMode === "bridge") && frameData.overview) {
        captureStageImg.src = frameData.overview;
        captureStageImg.hidden = false;
        captureStageHint.hidden = true;
      }

      const domSnapshot = state.targetMode === "iframe" || state.targetMode === "custom-url" ? Runtime.inspectIframeDOM(frame) : [];
      const decision = await decideAction(frameData, domSnapshot);

      const execStart = performance.now();
      const execMsg = await Runtime.dispatchAction(decision.action, {
        frame,
        overlay: showCursor ? overlay : null,
        bridgeUrl: byId("bridge-url").value.trim(),
        nativeWindow: state.nativeWindow,
        showCursor
      });
      const execMs = Math.round(performance.now() - execStart);

      if (replayMgr.isRecording) {
        replayMgr.recordAction(decision.action, execMsg);
        byId("replay-status").textContent = `Recording: ${replayMgr.recordedActions.length} actions captured.`;
      }

      state.stepCount += 1;
      brain.scanConsoleLogs(frameData.overview, state.guestLogs);

      const atSeconds = Math.round(((Date.now() - state.startedAt) / 1000) * 10) / 10;
      const frameHash = await BrainMod.hashFrameAsync(frameData.overview || "");
      const timelineEntry = {
        id: `frame-${state.stepCount}-${Date.now()}`,
        step: state.stepCount,
        atSeconds,
        overview: frameData.overview,
        details: frameData.details || [],
        frameHash,
        reasoning: decision.reasoning || "",
        action: decision.action,
        execMsg,
        source: decision.source || "heuristic",
        stuck: Boolean(decision.stuck),
        bugs: brain.bugs.slice(-3)
      };
      state.timeline.push(timelineEntry);
      if (state.timeline.length > 40) state.timeline.shift();
      state.selectedFrameId = timelineEntry.id;

      // Update UI
      byId("vision-overview-img").src = frameData.overview || "";
      renderFoveaCrops(frameData.details || []);
      renderTimeline();
      renderBugList();
      byId("live-reasoning-box").textContent = `[${decision.source || "agent"} · ${decision.status || "playing"}] ${decision.reasoning}\nAction: ${decision.action?.type} ${decision.action?.target || ""} -> ${execMsg}`;
      appendLog(`Step #${state.stepCount} [${decision.source || "agent"}]: ${decision.action?.type}(${decision.action?.target || ""}) -> ${execMsg}`);
      updateStatusPills(decision.source || "agent");

      // Compute adaptive next delay
      const preFrame = { hash: frameHash, bytes: (frameData.overview || "").length };
      const frameDelta = BrainMod.AdaptiveTick.frameDeltaLevel(state.lastPreFrame, preFrame);
      state.lastPreFrame = preFrame;
      const baseMs = Number(byId("opt-delay-ms").value) || 650;
      const nextDelay = byId("opt-adaptive").checked
        ? BrainMod.AdaptiveTick.computeNextDelay({
            action: decision.action,
            status: decision.status,
            reasoning: decision.reasoning,
            urgency: decision.urgency,
            llmDelay: decision.next_delay_ms || baseMs,
            execMs: Math.round(performance.now() - t0) + execMs,
            frameDelta,
            stuck: Boolean(decision.stuck)
          })
        : baseMs;

      return nextDelay;
    } catch (err) {
      appendLog(`Step error: ${err?.message || err}`, "error");
      return 1000;
    } finally {
      state.stepInFlight = false;
    }
  }

  function scheduleNextTick(delayMs) {
    clearTimeout(state.loopTimer);
    if (!state.running || state.paused) return;
    const maxSteps = Math.max(1, Number(byId("opt-max-steps").value) || 50);
    if (state.stepCount >= maxSteps) {
      appendLog(`Completed max steps (${maxSteps}). Auto-test finished.`);
      stopAutoTest();
      return;
    }
    state.loopTimer = setTimeout(async () => {
      if (!state.running || state.paused) return;
      const nextDelay = await runSingleStep();
      scheduleNextTick(nextDelay);
    }, delayMs);
  }

  function startAutoTest() {
    if (state.running && state.paused) {
      state.paused = false;
      updateStatusPills();
      scheduleNextTick(150);
      return;
    }
    if (state.running) return;
    state.running = true;
    state.paused = false;
    updateStatusPills("starting");
    appendLog("Started Automated Gameplay Tester loop.");
    scheduleNextTick(80);
  }

  function pauseAutoTest() {
    if (!state.running) return;
    state.paused = !state.paused;
    clearTimeout(state.loopTimer);
    updateStatusPills();
    if (!state.paused) scheduleNextTick(150);
  }

  function stopAutoTest() {
    state.running = false;
    state.paused = false;
    clearTimeout(state.loopTimer);
    updateStatusPills();
  }

  async function analyzeCurrentFrameOnce() {
    applyConfigToBrain();
    const captureMode =
      state.targetMode === "bridge"
        ? "bridge"
        : state.targetMode === "display"
          ? "display"
          : "auto";
    const frameData = await captureMgr.captureBest({
      mode: captureMode,
      frame,
      bridgeUrl: byId("bridge-url").value.trim(),
      nativeWindow: state.nativeWindow,
      fallbackSlug: (selected && selected.slug) || state.customUrl || "custom-game",
      fallbackNotes: byId("custom-game-rules").value
    });
    const slug = (selected && selected.slug) || "custom-game";
    const atSec = state.startedAt ? Math.round(((Date.now() - state.startedAt) / 1000) * 10) / 10 : 0;
    const analysis = await brain.analyzeFrameDebugPlay(frameData.overview, {
      gameSlug: slug,
      codeSnippet: byId("custom-game-rules").value,
      timestampSeconds: atSec
    });
    state.stepCount += 1;
    const entry = {
      id: `analyze-${Date.now()}`,
      step: state.stepCount,
      atSeconds: atSec,
      overview: frameData.overview,
      details: frameData.details || [],
      frameHash: analysis.frameHash,
      reasoning: `DebugPlay frame analysis (${analysis.source}): nextInput=${analysis.nextInput}, bugs=${analysis.bugs.length}`,
      action: { type: "press_key", target: analysis.nextInput },
      execMsg: "Analysis only",
      source: analysis.source,
      stuck: analysis.stuck,
      bugs: analysis.bugs
    };
    state.timeline.push(entry);
    state.selectedFrameId = entry.id;
    byId("vision-overview-img").src = frameData.overview || "";
    byId("live-reasoning-box").textContent = entry.reasoning;
    renderTimeline();
    renderBugList();
    updateStatusPills(analysis.source);
    appendLog(entry.reasoning);
  }

  // -------------------------------------------------------------------------
  // Rendering: Vision Crops, Timeline Scrubber, Bugs, Audits & Checkpoints
  // -------------------------------------------------------------------------

  function renderFoveaCrops(details) {
    const row = byId("vision-crops-row");
    row.replaceChildren();
    if (!details || !details.length) {
      const p = document.createElement("p");
      p.className = "muted-note";
      p.textContent = "No detail crops captured for this frame.";
      row.append(p);
      return;
    }
    for (const d of details) {
      const box = document.createElement("div");
      box.className = "crop-chip";
      const img = document.createElement("img");
      img.src = d.base64;
      img.alt = d.label || "detail crop";
      const span = document.createElement("span");
      span.textContent = `${d.label || "crop"} (${d.rect?.w || "?"}×${d.rect?.h || "?"})`;
      box.append(img, span);
      row.append(box);
    }
  }

  function renderTimeline() {
    const el = byId("tester-timeline");
    const detailEl = byId("selected-frame-details");
    el.replaceChildren();
    if (!state.timeline.length) {
      el.innerHTML = '<p class="muted-note">No frames analyzed yet.</p>';
      detailEl.textContent = "";
      return;
    }
    for (const item of state.timeline) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "timeline-thumb" + (item.id === state.selectedFrameId ? " active" : "");
      const img = document.createElement("img");
      img.src = item.overview;
      img.alt = `Step ${item.step}`;
      const dot = document.createElement("span");
      const hasCrit = item.bugs?.some((b) => b.severity === "critical" || b.severity === "high");
      const hasWarn = item.bugs?.some((b) => b.severity === "warning");
      dot.className = "timeline-dot" + (hasCrit ? " crit" : hasWarn ? " warn" : "");
      const meta = document.createElement("span");
      meta.className = "timeline-meta";
      meta.textContent = `#${item.step} · ${item.atSeconds}s${item.stuck ? " · STUCK" : ""}`;
      btn.append(img, dot, meta);
      btn.addEventListener("click", () => {
        state.selectedFrameId = item.id;
        renderTimeline();
      });
      el.append(btn);
    }
    const sel = state.timeline.find((t) => t.id === state.selectedFrameId) || state.timeline[state.timeline.length - 1];
    if (sel) {
      detailEl.textContent = `Step #${sel.step} (${sel.atSeconds}s) | Source: ${sel.source} | Action: ${sel.action?.type || "none"} ${sel.action?.target || ""} | Result: ${sel.execMsg} | Reasoning: ${sel.reasoning}`;
    }
  }

  function renderBugList() {
    const list = byId("bug-list");
    const filter = byId("bug-severity-filter").value;
    list.replaceChildren();
    const filtered = brain.bugs.filter((b) => filter === "all" || String(b.severity || "").toLowerCase() === filter);
    if (!filtered.length) {
      const p = document.createElement("p");
      p.className = "muted-note";
      p.textContent = "No bugs logged matching this filter.";
      list.append(p);
      return;
    }
    for (const bug of filtered) {
      const card = document.createElement("article");
      card.className = "bug-card";
      const head = document.createElement("div");
      head.className = "bug-card-head";
      const sev = document.createElement("span");
      sev.className = `sev-badge sev-${String(bug.severity || "warning").toLowerCase()}`;
      sev.textContent = bug.severity || "warning";
      const title = document.createElement("strong");
      title.textContent = bug.title || bug.type || "Bug";
      head.append(sev, title);
      const desc = document.createElement("p");
      desc.className = "muted-note";
      desc.style.color = "#d6e9f8";
      desc.textContent = bug.description || "";
      card.append(head, desc);
      if (bug.suggestedFixDiff) {
        const pre = document.createElement("pre");
        pre.textContent = bug.suggestedFixDiff;
        card.append(pre);
      }
      list.append(card);
    }
  }

  function renderChecklist() {
    const wrap = byId("qa-checklist");
    wrap.replaceChildren();
    for (const item of CHECKLIST_ITEMS) {
      const row = document.createElement("div");
      row.className = "qa-item";
      const copy = document.createElement("div");
      copy.className = "qa-item-copy";
      const strong = document.createElement("strong");
      strong.textContent = item.label;
      const small = document.createElement("small");
      small.textContent = item.hint;
      copy.append(strong, small);

      const verdicts = document.createElement("div");
      verdicts.className = "qa-verdicts";
      for (const v of ["pass", "fail", "na"]) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = v === "na" ? "N/A" : v;
        if (state.checklistVerdicts[item.id] === v) btn.className = `active-${v}`;
        btn.addEventListener("click", () => {
          state.checklistVerdicts[item.id] = v;
          renderChecklist();
        });
        verdicts.append(btn);
      }
      row.append(copy, verdicts);
      wrap.append(row);
    }
  }

  function renderCheckpoints() {
    const list = byId("checkpoint-list");
    list.replaceChildren();
    if (!state.checkpoints.length) {
      list.innerHTML = '<p class="muted-note">No saved checkpoints yet.</p>';
      return;
    }
    for (const ckpt of state.checkpoints) {
      const row = document.createElement("div");
      row.className = "checkpoint-row";
      const label = document.createElement("span");
      label.textContent = `${ckpt.slug || "browser"} · ${ckpt.entries.length} keys · ${new Date(ckpt.createdAt).toLocaleTimeString()}`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tool-button";
      btn.textContent = "Restore";
      btn.addEventListener("click", () => {
        const countRestored = Runtime.restoreStorageSnapshot(ckpt);
        appendLog(`Restored ${countRestored} localStorage entries from checkpoint ${ckpt.id}. Reload game to apply.`);
      });
      row.append(label, btn);
      list.append(row);
    }
  }

  // -------------------------------------------------------------------------
  // Audits, AI Fixer, Reports & Local Companion Bridge
  // -------------------------------------------------------------------------

  async function runAudit() {
    const targetUrl =
      state.targetMode === "custom-url"
        ? byId("studio-custom-url").value.trim()
        : selected && selected.runtimeType === "static"
          ? safePath(selected)
          : "";
    const audit = await Runtime.runFullAudit({ frame, targetUrl });
    state.lastAudit = audit;
    const c = audit.counts || {};
    byId("audit-summary").textContent =
      `Load probe: ${audit.loadProbe?.detail || "N/A"} | Accessible DOM: ${audit.accessible ? "Yes" : "Cross-origin"} | ` +
      `Canvases: ${c.canvases ?? "?"} (WebGL: ${c.webglCanvases ?? 0}, Non-blank: ${c.nonBlankCanvases ?? 0}) | ` +
      `Images: ${c.images ?? 0} (${c.brokenImages ?? 0} broken) | Dead links: ${c.deadLinks ?? 0} | Issues: ${(audit.issues || []).length}`;

    for (const issue of audit.issues || []) {
      const desc = `[Audit:${issue.code}] ${issue.detail}`;
      if (!brain.bugs.some((b) => b.description === desc)) {
        brain.bugs.push({
          id: `audit-${issue.code}-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: "Game & Site Audit",
          title: issue.code,
          description: desc,
          severity: issue.severity || "warning",
          consoleLogs: state.guestLogs.slice(-5)
        });
      }
    }
    renderBugList();
    updateStatusPills();
    appendLog(`Full audit completed (${(audit.issues || []).length} issue(s)).`);
  }

  async function refreshBridgeWindows() {
    const bridgeBase = byId("bridge-url").value.trim().replace(/\/$/, "");
    const select = byId("studio-native-window");
    try {
      const res = await fetch(`${bridgeBase}/api/native/windows`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      select.replaceChildren();
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "-- Select desktop game window --";
      select.append(empty);
      for (const winTitle of data.windows || []) {
        const opt = document.createElement("option");
        opt.value = winTitle;
        opt.textContent = winTitle;
        select.append(opt);
      }
      appendLog(`Local bridge connected: ${(data.windows || []).length} window(s) listed.`);
    } catch (err) {
      appendLog(`Local bridge not reachable at ${bridgeBase}. Start it with "npm run tester:bridge". (${err.message})`, "warn");
    }
  }

  async function runStaticBridgeAudit() {
    const bridgeBase = byId("bridge-url").value.trim().replace(/\/$/, "");
    const slug = selected?.slug || "";
    try {
      const res = await fetch(`${bridgeBase}/api/audit-static`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      for (const item of data.bugsFound || []) {
        const desc = `[Static:${item.type}] ${item.file}: ${item.description}`;
        if (!brain.bugs.some((b) => b.description === desc)) {
          brain.bugs.push({
            id: `static-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toISOString(),
            type: "Static Source Audit",
            title: `${item.type} (${item.file})`,
            description: desc,
            severity: "warning"
          });
        }
      }
      renderBugList();
      updateStatusPills();
      appendLog(`Static source audit scanned ${data.filesScanned || 0} file(s), found ${(data.bugsFound || []).length} potential issue(s).`);
    } catch (err) {
      appendLog(`Static source audit requires local bridge ("npm run tester:bridge"): ${err.message}`, "warn");
    }
  }

  function downloadText(filename, content, mime = "text/plain;charset=utf-8") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function buildFullMarkdownReport() {
    const gameInfo = selected || { slug: state.customUrl || state.nativeWindow || "custom", title: byId("player-name").textContent };
    const mega = BrainMod.generateMegaPrompt(brain, gameInfo, byId("custom-game-rules").value);
    const checklistLines = CHECKLIST_ITEMS.map((item) => `- ${item.label}: ${String(state.checklistVerdicts[item.id] || "untested").toUpperCase()}`).join("\n");
    return `${mega}\n\n## Guided QA Checklist\n${checklistLines}\n\n## Audit Summary\n${byId("audit-summary").textContent}\n`;
  }

  // -------------------------------------------------------------------------
  // Studio Tabs, Event Bindings & GraveGain2DA Legacy Console
  // -------------------------------------------------------------------------

  document.querySelectorAll(".studio-tab").forEach((tab) => {
    tab.addEventListener("click", () => selectStudioTab(tab.dataset.tab));
  });

  // Arbitrary launcher buttons on library view
  byId("launch-custom-url").addEventListener("click", () => {
    const val = byId("custom-url-input").value.trim();
    openArbitraryTarget({ mode: "custom-url", url: val });
  });
  byId("launch-screen-capture").addEventListener("click", async () => {
    openArbitraryTarget({ mode: "display" });
    try {
      await captureMgr.startDisplayCapture();
      appendLog("Screen/Window Capture active.");
    } catch (err) {
      appendLog(`Screen Capture cancelled or blocked: ${err.message}`, "warn");
    }
  });
  byId("launch-native-bridge").addEventListener("click", () => {
    openArbitraryTarget({ mode: "bridge" });
  });

  // Player-view studio target switches
  byId("studio-target-mode").addEventListener("change", (e) => {
    setTargetModeUI(e.target.value);
  });
  byId("btn-load-custom-url").addEventListener("click", () => {
    const val = byId("studio-custom-url").value.trim();
    if (!val) return;
    state.customUrl = val;
    frame.src = val;
    byId("player-name").textContent = `Web Target: ${val}`;
    byId("open-game").href = val;
    appendLog(`Loaded custom web URL: ${val}`);
  });
  byId("refresh-native-windows").addEventListener("click", refreshBridgeWindows);
  byId("studio-native-window").addEventListener("change", (e) => {
    state.nativeWindow = e.target.value;
    if (state.nativeWindow) {
      byId("player-name").textContent = `Program: ${state.nativeWindow}`;
      const profile = Playbooks.resolveGameProfile(state.nativeWindow);
      byId("custom-game-rules").value = `${profile.name}: ${profile.goal}\nControls: ${Playbooks.flattenControls(profile.controls)}`;
      appendLog(`Selected native window: ${state.nativeWindow} (profile: ${profile.id})`);
    }
  });

  // Provider / API key controls
  byId("ai-provider").addEventListener("change", () => {
    delete byId("ai-model").dataset.userEdited;
    delete byId("ai-endpoint").dataset.userEdited;
    syncProviderUI();
  });
  byId("ai-model").addEventListener("input", () => {
    byId("ai-model").dataset.userEdited = "1";
    saveTesterPrefs();
  });
  byId("ai-endpoint").addEventListener("input", () => {
    byId("ai-endpoint").dataset.userEdited = "1";
    saveTesterPrefs();
  });
  byId("ai-api-key").addEventListener("input", saveTesterPrefs);
  byId("remember-api-key").addEventListener("change", saveTesterPrefs);
  ["bridge-url", "driver-mode", "opt-fovea", "opt-adaptive", "opt-cursor", "opt-max-steps", "opt-delay-ms"].forEach((id) => {
    byId(id).addEventListener("change", saveTesterPrefs);
  });
  byId("toggle-key-vis").addEventListener("click", () => {
    const inp = byId("ai-api-key");
    inp.type = inp.type === "password" ? "text" : "password";
  });
  byId("clear-api-key").addEventListener("click", () => {
    byId("ai-api-key").value = "";
    try {
      localStorage.removeItem(STORAGE_APIKEY_KEY);
      sessionStorage.removeItem(STORAGE_APIKEY_KEY);
    } catch (_) {}
    appendLog("Cleared API key from browser storage.");
  });

  // Runner controls
  byId("btn-tester-start").addEventListener("click", startAutoTest);
  byId("btn-tester-pause").addEventListener("click", pauseAutoTest);
  byId("btn-tester-step").addEventListener("click", () => void runSingleStep());
  byId("btn-tester-stop").addEventListener("click", stopAutoTest);
  byId("btn-tester-analyze").addEventListener("click", () => void analyzeCurrentFrameOnce());
  byId("btn-share-display").addEventListener("click", async () => {
    try {
      await captureMgr.startDisplayCapture();
      setTargetModeUI("display");
      appendLog("Screen/Window Capture started. Preview will update on next frame capture or step.");
      const frameData = captureMgr.captureFromDisplay();
      if (frameData && frameData.overview) {
        captureStageImg.src = frameData.overview;
        captureStageImg.hidden = false;
        captureStageHint.hidden = true;
        byId("vision-overview-img").src = frameData.overview;
      }
    } catch (err) {
      appendLog(`Screen Capture failed: ${err.message}`, "warn");
    }
  });
  byId("btn-upload-frame").addEventListener("click", () => byId("upload-frame-input").click());
  byId("upload-frame-input").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await captureMgr.downsampleFile(file);
      byId("vision-overview-img").src = dataUrl;
      applyConfigToBrain();
      const analysis = await brain.analyzeFrameDebugPlay(dataUrl, {
        gameSlug: selected?.slug || "uploaded-frame",
        codeSnippet: byId("custom-game-rules").value,
        timestampSeconds: 0
      });
      state.stepCount += 1;
      state.timeline.push({
        id: `upload-${Date.now()}`,
        step: state.stepCount,
        atSeconds: 0,
        overview: dataUrl,
        details: [],
        frameHash: analysis.frameHash,
        reasoning: `Uploaded frame analysis (${analysis.source}): nextInput=${analysis.nextInput}`,
        action: { type: "press_key", target: analysis.nextInput },
        execMsg: "Upload analyzed",
        source: analysis.source,
        stuck: analysis.stuck,
        bugs: analysis.bugs
      });
      renderTimeline();
      renderBugList();
      updateStatusPills(analysis.source);
      appendLog(`Analyzed uploaded frame "${file.name}" -> ${analysis.bugs.length} bug(s).`);
    } catch (err) {
      appendLog(`Upload error: ${err.message}`, "error");
    }
    e.target.value = "";
  });
  byId("btn-bridge-check").addEventListener("click", async () => {
    const bridgeBase = byId("bridge-url").value.trim().replace(/\/$/, "");
    try {
      const res = await fetch(`${bridgeBase}/api/status`);
      const data = await res.json();
      appendLog(`Bridge online (${bridgeBase}): ${data.system || "GiveGigsGames Bridge"} | OS: ${data.platform || "unknown"}`);
    } catch (err) {
      appendLog(`Bridge offline at ${bridgeBase}. Run "npm run tester:bridge" locally. (${err.message})`, "warn");
    }
  });

  // Bugs, Audits & Fixer
  byId("btn-run-audit").addEventListener("click", () => void runAudit());
  byId("btn-static-audit").addEventListener("click", () => void runStaticBridgeAudit());
  byId("bug-severity-filter").addEventListener("change", renderBugList);
  byId("btn-suggest-fixes").addEventListener("click", async () => {
    applyConfigToBrain();
    if (!brain.bugs.length) {
      appendLog("No bugs logged yet to generate fixes for.");
      return;
    }
    const fixes = await brain.suggestCodeFixes(brain.bugs, byId("custom-game-rules").value, `${selected?.slug || "game"}/game.js`);
    for (const fix of fixes) {
      const match = brain.bugs.find((b) => (b.title || "").includes(fix.title) || !b.suggestedFixDiff);
      if (match) match.suggestedFixDiff = `${fix.explanation}\n\n${fix.suggestedFixDiff}`;
    }
    renderBugList();
    appendLog(`Generated ${fixes.length} code fix suggestion(s).`);
  });
  byId("btn-gen-megaprompt").addEventListener("click", () => {
    const report = buildFullMarkdownReport();
    byId("megaprompt-output").value = report;
    byId("bug-draft").value = report;
    appendLog("Generated AI Mega-Prompt & QA report.");
  });
  byId("btn-export-md").addEventListener("click", () => {
    const report = buildFullMarkdownReport();
    downloadText(`givegigsgames-qa-${selected?.slug || "custom"}.md`, report, "text/markdown;charset=utf-8");
  });
  byId("btn-export-json").addEventListener("click", () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      target: selected || { customUrl: state.customUrl, nativeWindow: state.nativeWindow },
      steps: state.stepCount,
      tokens: brain.tokenStats,
      audit: state.lastAudit,
      checklist: state.checklistVerdicts,
      bugs: brain.bugs,
      replayActions: brain.replayActions
    };
    downloadText(`givegigsgames-session-${selected?.slug || "custom"}.json`, JSON.stringify(payload, null, 2), "application/json");
  });

  // Replays & State Checkpoints
  byId("btn-replay-record").addEventListener("click", () => {
    replayMgr.startRecording(selected?.slug || state.customUrl || "custom");
    byId("btn-replay-record").disabled = true;
    byId("btn-replay-stop").disabled = false;
    byId("replay-status").textContent = "Recording actions...";
  });
  byId("btn-replay-stop").addEventListener("click", () => {
    const sess = replayMgr.stopRecording();
    byId("btn-replay-record").disabled = false;
    byId("btn-replay-stop").disabled = true;
    byId("btn-replay-play").disabled = !sess;
    byId("btn-replay-export").disabled = !sess;
    byId("replay-status").textContent = sess ? `Saved "${sess.name}" (${sess.actionCount} actions).` : "Recorder stopped.";
  });
  byId("btn-replay-play").addEventListener("click", async () => {
    const sess = replayMgr.sessions[0];
    if (!sess) return;
    byId("replay-status").textContent = `Replaying ${sess.actionCount} action(s)...`;
    await replayMgr.playReplay(
      sess,
      (action) => Runtime.dispatchAction(action, { frame, overlay, bridgeUrl: byId("bridge-url").value.trim(), nativeWindow: state.nativeWindow, showCursor: true }),
      ({ index, total, result }) => appendLog(`Replay [${index + 1}/${total}]: ${result}`)
    );
    byId("replay-status").textContent = `Replay complete (${sess.actionCount} actions).`;
  });
  byId("btn-replay-export").addEventListener("click", () => {
    const sess = replayMgr.sessions[0];
    if (sess) downloadText(`${sess.id}.json`, JSON.stringify(sess, null, 2), "application/json");
  });
  byId("btn-replay-import").addEventListener("click", () => byId("replay-import-input").click());
  byId("replay-import-input").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const sess = JSON.parse(await file.text());
      if (!Array.isArray(sess.actions)) throw new Error("Missing actions array.");
      replayMgr.sessions.unshift(sess);
      byId("btn-replay-play").disabled = false;
      byId("btn-replay-export").disabled = false;
      byId("replay-status").textContent = `Imported "${sess.name || file.name}" (${sess.actions.length} actions).`;
    } catch (err) {
      byId("replay-status").textContent = `Import failed: ${err.message}`;
    }
    e.target.value = "";
  });

  byId("btn-ckpt-save").addEventListener("click", () => {
    const ckpt = Runtime.captureStorageSnapshot(selected?.slug || "custom");
    state.checkpoints.unshift(ckpt);
    renderCheckpoints();
    appendLog(`Saved browser storage checkpoint (${ckpt.entries.length} keys).`);
  });

  // BotScript Editor
  function initBotScriptUI() {
    const presetSelect = byId("botscript-preset");
    const editor = byId("botscript-editor");
    for (const name of Object.keys(Controllers.BotScriptEngine.ROBOT_SCRIPT_PRESETS)) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      presetSelect.append(opt);
    }
    editor.value = JSON.stringify(state.botProgram, null, 2);
    presetSelect.addEventListener("change", () => {
      const prog = Controllers.BotScriptEngine.ROBOT_SCRIPT_PRESETS[presetSelect.value];
      if (prog) editor.value = JSON.stringify(prog, null, 2);
    });
    byId("btn-botscript-apply").addEventListener("click", () => {
      try {
        state.botProgram = Controllers.BotScriptEngine.parseRobotProgram(editor.value);
        state.botCursorIdx = 0;
        byId("botscript-status").textContent = `Applied BotScript "${state.botProgram.name}" (${state.botProgram.rules.length} rules).`;
      } catch (err) {
        byId("botscript-status").textContent = `Invalid BotScript: ${err.message}`;
      }
    });
  }

  // 25 AI QA Plays
  function initQAPlaysUI() {
    const select = byId("qa-play-select");
    for (const play of BrainMod.OPENROUTER_PLAYS) {
      const opt = document.createElement("option");
      opt.value = play.id;
      opt.textContent = `[${play.category}] ${play.title} — ${play.blurb}`;
      select.append(opt);
    }
    byId("btn-qa-play-autofill").addEventListener("click", () => {
      const latestBug = brain.bugs[brain.bugs.length - 1];
      byId("qa-play-input").value = latestBug
        ? `Game: ${selected?.title || state.customUrl || "Game"}. Bug: ${latestBug.description}`
        : `Game: ${selected?.title || state.customUrl || "Game"}. Steps: ${state.stepCount}. Summary: ${byId("live-reasoning-box").textContent}`;
    });
    byId("btn-qa-play-run").addEventListener("click", async () => {
      applyConfigToBrain();
      const playId = select.value;
      const input = byId("qa-play-input").value.trim() || `${selected?.title || "Game"} telemetry`;
      byId("qa-play-output").textContent = "Running play...";
      const res = await brain.runPlay(playId, input);
      byId("qa-play-output").textContent = `[${res.source}] ${res.text}`;
      if (byId("opt-qa-play-speak").checked && typeof window.speechSynthesis !== "undefined") {
        try {
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(new SpeechSynthesisUtterance(res.text));
        } catch (_) {}
      }
    });
  }

  // Library filtering & GraveGain2DA legacy console
  search.addEventListener("input", render);
  genre.addEventListener("change", render);
  sort.addEventListener("change", render);
  tagSearch.addEventListener("input", renderTagOptions);
  tagMatch.addEventListener("change", render);
  byId("clear-tags").addEventListener("click", () => {
    selectedTags.clear();
    renderTagOptions();
    updateTagCount();
    render();
  });
  document.querySelectorAll("[data-view]").forEach((button) =>
    button.addEventListener("click", () => {
      const listView = button.dataset.view === "list";
      grid.classList.toggle("list-view", listView);
      grid.classList.toggle("grid-view", !listView);
      document.querySelectorAll("[data-view]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
    })
  );
  byId("back-button").addEventListener("click", closeGame);
  byId("reload-game").addEventListener("click", () => {
    if (selected) frame.src = `${safePath(selected)}?ggTester=1`;
    else if (state.customUrl) frame.src = state.customUrl;
  });

  function runGameCommand(raw) {
    const output = byId("console-output");
    const tokens = raw.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return;
    if (tokens[0] === "help") {
      output.textContent = "Commands: god on/off, heal, gold [amount], win, lose, status. Cheats use GraveGain's existing gameDebug hooks.";
      return;
    }
    try {
      const debug = frame.contentWindow.gameDebug;
      if (!debug) throw new Error("Game is still loading. Try again in a moment.");
      const game = frame.contentWindow.GraveGainGame;
      switch (tokens[0]) {
        case "god":
          if (tokens[1] !== "on" && tokens[1] !== "off") throw new Error("Use: god on or god off");
          debug.godMode = tokens[1] === "on";
          output.textContent = `God mode ${debug.godMode ? "ON" : "OFF"}.`;
          break;
        case "heal":
          if (!game?.player) throw new Error("Start a run before healing.");
          debug.setHealth(game.player.maxHp);
          game.updateHUD?.();
          output.textContent = `HP restored to ${game.player.maxHp}.`;
          break;
        case "gold": {
          if (!game) throw new Error("Game is still loading.");
          const amount = Math.max(0, Math.min(1000000, Math.floor(Number(tokens[1] || 1000))));
          if (!Number.isFinite(amount)) throw new Error("Use: gold [amount], from 0 to 1000000.");
          debug.setScore(amount);
          game.updateHUD?.();
          output.textContent = `Gold set to ${amount}.`;
          break;
        }
        case "win":
          debug.win();
          output.textContent = "Win state triggered.";
          break;
        case "lose":
          debug.lose();
          output.textContent = "Lose state triggered.";
          break;
        case "status":
          output.textContent = game
            ? `Gold ${debug.getScore()} · HP ${debug.getHealth()} · God mode ${debug.godMode ? "ON" : "OFF"}`
            : "Game is still loading.";
          break;
        default:
          throw new Error(`Unknown command: ${tokens[0]}. Type help for commands.`);
      }
    } catch (error) {
      output.textContent = error.message || "Command could not run.";
    }
  }

  byId("console-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = byId("console-input");
    runGameCommand(input.value);
    input.select();
  });
  document.querySelectorAll("[data-command]").forEach((button) => {
    button.addEventListener("click", () => runGameCommand(button.dataset.command));
  });
  byId("fullscreen-game").addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await byId("frame-wrap").requestFullscreen();
      else await document.exitFullscreen();
    } catch (_) {
      byId("frame-wrap").classList.toggle("fullscreen-fallback");
    }
  });

  // Boot UI & Catalog
  loadTesterPrefs();
  renderChecklist();
  initBotScriptUI();
  initQAPlaysUI();

  try {
    const catalog = window.GIVEGIGSGAMES_CATALOG;
    if (!catalog || !Array.isArray(catalog.games)) throw new Error("The game catalog could not be loaded.");
    games = catalog.games.filter((game) => game.slug && game.title && safePath(game));
    for (const item of [...new Set(games.map((game) => game.genre).filter(Boolean))].sort()) {
      const option = document.createElement("option");
      option.value = item;
      option.textContent = item;
      genre.append(option);
    }
    renderTagOptions();
    render();

    const params = new URLSearchParams(location.search);
    const requested = window.GGGGameRoute?.resolve("test", games);
    if (requested) {
      openGame(requested);
    } else if (params.get("url")) {
      openArbitraryTarget({ mode: "custom-url", url: params.get("url") });
    } else if (params.get("mode") === "capture") {
      openArbitraryTarget({ mode: "display" });
    } else if (params.get("mode") === "bridge") {
      openArbitraryTarget({ mode: "bridge" });
    }
  } catch (error) {
    byId("load-error").hidden = false;
    byId("load-error").textContent = `${error.message} Check that games/catalog-data.js is present.`;
  }
})();
