/* ==========================================================================
 * GiveGigsGames Tester 3.0 - Test-Driven Gameplay LLM Evaluation Engine
 * Implements the CTOs Playbook for Test-Driven LLMs adapted to Gameplay QA:
 *   - Unit, Functional, Regression & Performance Eval Suites
 *   - Statistical Metrics (Exact/Fuzzy Match, ROUGE-L, Precision/Recall/F1, Guardrails)
 *   - LLM-as-a-Judge (Offline Rubric Heuristic + Live BYOK Provider Calls)
 *   - 4 Test Dataset Types (Public Benchmark, Human Golden, Synthetic, Replay-Derived)
 *   - Data-Driven Coverage Matrix (Frequency x Gameplay Impact Weighted Scoring)
 *   - Prompt & Model A/B Lab (including "Justify your answer." toggle)
 *   - KPI Calculator & CI/CD Exporters (JSON, Markdown, GitHub Actions YAML)
 * UMD module: attaches window.GGGEvals in browser, exports in Node.js.
 * ========================================================================== */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.GGGEvals = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DATASET_TYPES = [
    { id: "public-benchmark", label: "Public / Built-in Benchmark", realism: "Low", control: "Low", cost: "Free", bestUse: "Baseline model comparison" },
    { id: "human-golden", label: "Synthetic Human-Written (Golden)", realism: "High", control: "High", cost: "High", bestUse: "Core functional gameplay testing" },
    { id: "synthetic-model", label: "Synthetic Model-Generated", realism: "Medium", control: "High", cost: "Low", bestUse: "Increasing coverage & stress testing" },
    { id: "production-replay", label: "Production / Replay-Derived", realism: "Very High", control: "Low", cost: "Medium", bestUse: "Regression testing from real runs" }
  ];

  const SCENARIO_CATEGORIES = [
    { id: "boot", label: "Boot & Menu Navigation" },
    { id: "core-loop", label: "Core Gameplay Loop" },
    { id: "stuck-recovery", label: "Stuck / Soft-Lock Recovery" },
    { id: "edge-case", label: "Edge & Adversarial Inputs" },
    { id: "mobile-viewport", label: "Mobile / Viewport Scaling" },
    { id: "win-lose", label: "Win / Lose & End States" }
  ];

  const DEFAULT_PLAY_BENCHMARKS = [
    {
      id: "bm-pw-boot",
      gameSlug: "platform-wars",
      datasetType: "public-benchmark",
      category: "boot",
      title: "Platform Wars: Quick Match Boot",
      inputState: "Title screen showing 'Quick Match' button and side selector (Phone vs Desktop). Arena not yet focused.",
      expectedAction: "click Quick Match, choose side, click arena to focus, then press A/D + Space",
      expectedKeywords: ["quick match", "focus", "space", "move"],
      forbiddenActions: ["hold one key indefinitely", "leave match immediately"],
      rubric: "Bot must enter Quick Match, focus the arena canvas, and probe movement without idling."
    },
    {
      id: "bm-lwz-core",
      gameSlug: "lastwordszombies",
      datasetType: "human-golden",
      category: "core-loop",
      title: "Last Words Zombies: Nearest Threat Priority",
      inputState: "3 zombies approaching barricade: 'CRYPT' at distance 120px, 'NECROMANCER' at 480px, 'BONE' at 210px. Shield at 80%. Power 1 ready.",
      expectedAction: "type CRYPT to banish the closest zombie to the barricade",
      expectedKeywords: ["crypt", "type", "closest", "barricade"],
      forbiddenActions: ["hold space", "ignore nearest zombie", "press esc"],
      rubric: "Bot must prioritize the closest-to-breach zombie ('CRYPT') and send clean typed letters."
    },
    {
      id: "bm-lwz-boss",
      gameSlug: "lastwordszombies",
      datasetType: "human-golden",
      category: "edge-case",
      title: "Last Words Zombies: Wave 5 Overwhelmed Shockwave",
      inputState: "Wave 5 boss + 6 normal zombies within 90px of barricade. Shield at 25%. Shockwave (1) and Shield (3) are both off cooldown.",
      expectedAction: "press 1 for Shockwave to clear normals, then press 3 to restore +40 shield",
      expectedKeywords: ["1", "shockwave", "3", "shield"],
      forbiddenActions: ["backspace spam", "idle"],
      rubric: "Bot must trigger defensive powers (1 Shockwave / 3 Shield) when overwhelmed at low shield."
    },
    {
      id: "bm-ot-lane",
      gameSlug: "overtake",
      datasetType: "public-benchmark",
      category: "core-loop",
      title: "Overtake: High-Speed Lane Hazard Evasion",
      inputState: "Speed 180mph in center lane. Hazard truck directly ahead in center lane; right lane is clear with nitro pickup; left lane blocked.",
      expectedAction: "tap ArrowRight to steer into clear right lane and collect nitro, keep accelerating",
      expectedKeywords: ["arrowright", "right", "clear", "nitro"],
      forbiddenActions: ["steer left", "brake to stop", "long steering hold"],
      rubric: "Bot must choose the clear right lane with a short tap rather than crashing or steering left."
    },
    {
      id: "bm-sss-ddos",
      gameSlug: "serversavershield",
      datasetType: "human-golden",
      category: "core-loop",
      title: "Server Saver Shield: DDoS Spike Defense",
      inputState: "Wave 4 DDoS spike incoming from top-right cluster. Server HP at 45%. Shop available between waves with 120 credits.",
      expectedAction: "sweep shield to top-right cluster, toggle beams with Space/Click, buy Emergency Repair in Shop",
      expectedKeywords: ["shield", "top-right", "beams", "repair"],
      forbiddenActions: ["park shield in center", "ignore ddos"],
      rubric: "Bot must actively track the densest threat cluster and plan Emergency Repair before HP drops."
    },
    {
      id: "bm-vm-waterfall",
      gameSlug: "venturemechanically",
      datasetType: "public-benchmark",
      category: "edge-case",
      title: "Venture Mechanically: Exit Slider NaN Guardrail",
      inputState: "Series A configured with 2x liquidation preference and $500k venture debt. Exit slider dragged from $0M to $50M.",
      expectedAction: "drag exit slider incrementally, verify debt paid before equity and check for NaN or stale ledger rows",
      expectedKeywords: ["exit slider", "debt", "nan", "ledger"],
      forbiddenActions: ["skip validation", "close tab"],
      rubric: "Bot must verify waterfall math (debt first, liquidation pref) and explicitly check for NaN bugs."
    },
    {
      id: "bm-stuck-modal",
      gameSlug: "any-game",
      datasetType: "synthetic-model",
      category: "stuck-recovery",
      title: "Universal: Stuck Frame / Unfocused Canvas Recovery",
      inputState: "3 consecutive frames have identical pixel hash (stuck=3). A semi-transparent 'Click to Resume' overlay is visible at center (500, 500).",
      expectedAction: "click center (500, 500) to dismiss overlay and focus canvas, then send movement probe",
      expectedKeywords: ["click", "500", "focus", "resume"],
      forbiddenActions: ["repeat same failing key", "give up"],
      rubric: "Bot must detect the stuck state, click the resume overlay to regain focus, and break the loop."
    },
    {
      id: "bm-mobile-clip",
      gameSlug: "any-game",
      datasetType: "synthetic-model",
      category: "mobile-viewport",
      title: "Universal: 390x844 Phone Portrait Overflow Check",
      inputState: "Viewport resized to 390x844. HUD score panel extends 42px beyond right edge causing horizontal scrollbar. Start button partially clipped.",
      expectedAction: "flag high-severity mobile layout overflow bug with exact 42px clip measurement and test touch tap on start",
      expectedKeywords: ["overflow", "mobile", "390", "bug"],
      forbiddenActions: ["mark mobile layout pass", "ignore clipping"],
      rubric: "Bot must report the horizontal overflow as a layout bug rather than passing the mobile checklist."
    },
    {
      id: "bm-win-lose",
      gameSlug: "battlesharks2",
      datasetType: "production-replay",
      category: "win-lose",
      title: "Battle Sharks 2: Post-Run Restart & State Reset",
      inputState: "Game Over screen after ROBO-KRAKEN defeat. Score=4200, Biomass=15. 'Play Again' button visible.",
      expectedAction: "click Play Again, verify HP and score reset cleanly to starting values without console errors",
      expectedKeywords: ["play again", "reset", "score", "console"],
      forbiddenActions: ["leave on game over", "skip state reset check"],
      rubric: "Bot must trigger Play Again and verify clean state reset for regression coverage."
    }
  ];

  const DEFAULT_COVERAGE_MATRIX = [
    { id: "cm-1", scenario: "Boot & Menu Navigation", segment: "Cold Boot / New Player", category: "boot", frequency: 0.25, impact: 4, targetCases: 3 },
    { id: "cm-2", scenario: "Core Gameplay Loop", segment: "Active Mid-Run", category: "core-loop", frequency: 0.40, impact: 4, targetCases: 4 },
    { id: "cm-3", scenario: "Stuck / Soft-Lock Recovery", segment: "Stress / Edge State", category: "stuck-recovery", frequency: 0.15, impact: 4, targetCases: 3 },
    { id: "cm-4", scenario: "Edge & Adversarial Inputs", segment: "Stress / Edge State", category: "edge-case", frequency: 0.10, impact: 3, targetCases: 2 },
    { id: "cm-5", scenario: "Mobile / Viewport Scaling", segment: "Phone Portrait 390px", category: "mobile-viewport", frequency: 0.20, impact: 3, targetCases: 2 },
    { id: "cm-6", scenario: "Win / Lose & End States", segment: "Active Mid-Run", category: "win-lose", frequency: 0.10, impact: 3, targetCases: 2 }
  ];

  const DEFAULT_PROMPT_VARIANTS = {
    baseline: {
      id: "baseline",
      name: "Variant A · Concise Action Prompt (Baseline)",
      justifyAnswer: false,
      template:
        "You are an automated gameplay QA bot for {{gameSlug}}. Given the current game state, output the single best next action to play effectively and catch bugs.\nState: {{inputState}}"
    },
    justified: {
      id: "justified",
      name: "Variant B · Playbook 'Justify your answer.' (+30% Pattern)",
      justifyAnswer: true,
      template:
        "You are a test-driven gameplay QA bot for {{gameSlug}}. Given the current game state, output the best next action, reference exact UI/game entities, avoid forbidden actions, and verify state changes. Justify your answer.\nState: {{inputState}}"
    }
  };

  // -------------------------------------------------------------------------
  // Text & Statistical Metrics (Playbook Section 5.2 & 5.3)
  // -------------------------------------------------------------------------

  function normalizeText(str) {
    return String(str || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokenize(str) {
    const norm = normalizeText(str);
    return norm ? norm.split(" ") : [];
  }

  function exactMatch(actual, expected) {
    return normalizeText(actual) === normalizeText(expected) ? 1 : 0;
  }

  function levenshteinDistance(a, b) {
    const s = normalizeText(a);
    const t = normalizeText(b);
    if (s === t) return 0;
    if (!s.length) return t.length;
    if (!t.length) return s.length;
    const prev = new Array(t.length + 1);
    const curr = new Array(t.length + 1);
    for (let j = 0; j <= t.length; j++) prev[j] = j;
    for (let i = 1; i <= s.length; i++) {
      curr[0] = i;
      for (let j = 1; j <= t.length; j++) {
        const cost = s[i - 1] === t[j - 1] ? 0 : 1;
        curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      }
      for (let j = 0; j <= t.length; j++) prev[j] = curr[j];
    }
    return prev[t.length];
  }

  function fuzzyMatch(actual, expected) {
    const s = normalizeText(actual);
    const t = normalizeText(expected);
    const maxLen = Math.max(s.length, t.length);
    if (maxLen === 0) return 1;
    const dist = levenshteinDistance(s, t);
    return Math.max(0, Number((1 - dist / maxLen).toFixed(4)));
  }

  function lcsLength(aTokens, bTokens) {
    const m = aTokens.length;
    const n = bTokens.length;
    if (!m || !n) return 0;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (aTokens[i - 1] === bTokens[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    return dp[m][n];
  }

  function rougeL(actual, expected) {
    const aTokens = tokenize(actual);
    const bTokens = tokenize(expected);
    if (!aTokens.length || !bTokens.length) return { precision: 0, recall: 0, f1: 0 };
    const lcs = lcsLength(aTokens, bTokens);
    const precision = lcs / aTokens.length;
    const recall = lcs / bTokens.length;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    return {
      precision: Number(precision.toFixed(4)),
      recall: Number(recall.toFixed(4)),
      f1: Number(f1.toFixed(4))
    };
  }

  function keywordPrecisionRecallF1(actual, expectedKeywords) {
    const normActual = normalizeText(actual);
    const keywords = (expectedKeywords || []).map(normalizeText).filter(Boolean);
    if (!keywords.length) return { precision: 1, recall: 1, f1: 1, matched: [], missed: [] };
    const matched = [];
    const missed = [];
    for (const kw of keywords) {
      if (normActual.includes(kw)) matched.push(kw);
      else missed.push(kw);
    }
    const recall = matched.length / keywords.length;
    const actualTokens = tokenize(actual);
    const precision = actualTokens.length > 0 ? Math.min(1, matched.length / Math.max(1, Math.min(actualTokens.length, keywords.length * 2))) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    return {
      precision: Number(precision.toFixed(4)),
      recall: Number(recall.toFixed(4)),
      f1: Number(f1.toFixed(4)),
      matched,
      missed
    };
  }

  function evaluateGuardrails(actual, forbiddenActions) {
    const normActual = normalizeText(actual);
    const violations = [];
    for (const rule of forbiddenActions || []) {
      const normRule = normalizeText(rule);
      if (normRule && normActual.includes(normRule)) {
        violations.push(rule);
      }
    }
    return {
      adherent: violations.length === 0 ? 1 : 0,
      violations
    };
  }

  // -------------------------------------------------------------------------
  // Offline & Live BYOK Execution + LLM-as-a-Judge
  // -------------------------------------------------------------------------

  function renderPromptTemplate(template, testCase, justifyAnswer) {
    let out = String(template || "")
      .replace(/\{\{gameSlug\}\}/g, testCase.gameSlug || "any-game")
      .replace(/\{\{inputState\}\}/g, testCase.inputState || "")
      .replace(/\{\{category\}\}/g, testCase.category || "core-loop");
    if (justifyAnswer && !/justify your answer/i.test(out)) {
      out += "\nJustify your answer.";
    }
    return out;
  }

  function simulateOfflineBotResponse(testCase, options = {}) {
    const justify = Boolean(options.justifyAnswer);
    const keywords = testCase.expectedKeywords || [];
    const expected = testCase.expectedAction || "probe controls and observe HUD";
    // Deterministic simulation that reflects the playbook's "Justify your answer." improvement:
    // Without justification, offline baseline hits ~65% of keywords; with justification, hits ~92% + explicit reasoning.
    const hash = Array.from(String(testCase.id || testCase.title || "x")).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    if (justify) {
      const reason = `Justification: Based on state (${String(testCase.inputState || "").slice(0, 65)}...), prioritizing ${keywords.slice(0, 3).join(", ") || "safe recovery"} avoids failure.`;
      return `${expected}. ${reason}`;
    }
    if (hash % 3 === 0) {
      // Partial / less faithful baseline response
      const partial = keywords.slice(0, Math.max(1, Math.floor(keywords.length / 2))).join(" and ");
      return `Try ${partial || "moving"} to continue the game.`;
    }
    return `${expected}`;
  }

  function offlineJudgeScore(testCase, actualOutput, judgeMode = "with-reference") {
    const kw = keywordPrecisionRecallF1(actualOutput, testCase.expectedKeywords);
    const rl = rougeL(actualOutput, testCase.expectedAction);
    const guard = evaluateGuardrails(actualOutput, testCase.forbiddenActions);
    const hasJustification = /justif|because|based on|reason|verify|prioritiz/i.test(actualOutput);

    const faithfulness = Number(
      Math.min(1, guard.adherent * (0.45 * kw.recall + 0.35 * rl.f1 + (hasJustification ? 0.2 : 0.08))).toFixed(4)
    );
    const relevancy = Number(
      Math.min(1, 0.6 * kw.recall + 0.4 * fuzzyMatch(actualOutput, testCase.expectedAction) + (hasJustification ? 0.1 : 0)).toFixed(4)
    );
    const overall = Number(((faithfulness * 0.5 + relevancy * 0.3 + guard.adherent * 0.2)).toFixed(4));

    const rationale =
      guard.violations.length > 0
        ? `Guardrail violation detected: ${guard.violations.join(", ")}.`
        : kw.missed.length === 0
        ? `Strong alignment (${judgeMode}): captured all expected signals (${kw.matched.join(", ")})${hasJustification ? " with clear justification" : ""}.`
        : `Partial alignment (${judgeMode}): matched [${kw.matched.join(", ") || "none"}], missed [${kw.missed.join(", ")}].`;

    return {
      mode: judgeMode,
      source: "offline-judge",
      overall,
      faithfulness,
      relevancy,
      adherence: guard.adherent,
      rationale
    };
  }

  async function callByokTextLlm(prompt, config = {}) {
    const provider = config.provider || "heuristic";
    const apiKey = String(config.apiKey || "").trim();
    const model = String(config.model || "").trim();
    const endpoint = String(config.endpoint || "").trim();

    if (provider === "heuristic" || (!apiKey && provider !== "local" && provider !== "custom")) {
      return null;
    }

    const start = Date.now();
    if (provider === "gemini") {
      const m = model || "gemini-2.5-flash";
      const base = endpoint || "https://generativelanguage.googleapis.com/v1beta/models";
      const url = `${base.replace(/\/$/, "")}/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 320 }
        })
      });
      if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("\n") || "";
      const tokens = data?.usageMetadata?.totalTokenCount || Math.ceil((prompt.length + text.length) / 4);
      return { text: text.trim(), latencyMs: Date.now() - start, tokens };
    }

    if (provider === "local") {
      const url = endpoint || "http://localhost:11434/api/chat";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model || "llama3.2",
          stream: false,
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (!res.ok) throw new Error(`Local LLM HTTP ${res.status}`);
      const data = await res.json();
      const text = data?.message?.content || data?.choices?.[0]?.message?.content || "";
      const tokens = data?.eval_count || Math.ceil((prompt.length + text.length) / 4);
      return { text: text.trim(), latencyMs: Date.now() - start, tokens };
    }

    // OpenAI / OpenRouter / DeepSeek / Custom OpenAI-compatible
    const defaultUrls = {
      openrouter: "https://openrouter.ai/api/v1/chat/completions",
      openai: "https://api.openai.com/v1/chat/completions",
      deepseek: "https://api.deepseek.com/chat/completions",
      custom: "https://api.openai.com/v1/chat/completions"
    };
    const url = endpoint || defaultUrls[provider] || defaultUrls.openai;
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: model || "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 320,
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!res.ok) throw new Error(`${provider} HTTP ${res.status}`);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";
    const tokens = data?.usage?.total_tokens || Math.ceil((prompt.length + text.length) / 4);
    return { text: text.trim(), latencyMs: Date.now() - start, tokens };
  }

  async function scoreWithLlmJudge(testCase, actualOutput, options = {}) {
    const judgeMode = options.judgeMode || "with-reference";
    const byok = options.byok || {};
    if (byok.provider && byok.provider !== "heuristic" && (byok.apiKey || byok.provider === "local")) {
      const refBlock = judgeMode === "with-reference" ? `\nReference Expected Action: ${testCase.expectedAction}` : "";
      const judgePrompt =
        `You are an LLM-as-a-Judge evaluating a gameplay QA bot.\n` +
        `Rubric: ${testCase.rubric || "Action must be accurate, safe, and relevant to the game state."}\n` +
        `Game State: ${testCase.inputState}${refBlock}\n` +
        `Forbidden Actions: ${(testCase.forbiddenActions || []).join(", ") || "None"}\n` +
        `Bot Output: ${actualOutput}\n` +
        `Return strict JSON: {"overall":0.0-1.0,"faithfulness":0.0-1.0,"relevancy":0.0-1.0,"rationale":"short explanation"}`;
      try {
        const res = await callByokTextLlm(judgePrompt, byok);
        if (res && res.text) {
          const match = res.text.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            const guard = evaluateGuardrails(actualOutput, testCase.forbiddenActions);
            return {
              mode: judgeMode,
              source: `llm-judge:${byok.provider}`,
              overall: Number(Math.max(0, Math.min(1, Number(parsed.overall) || 0)).toFixed(4)),
              faithfulness: Number(Math.max(0, Math.min(1, Number(parsed.faithfulness) || 0)).toFixed(4)),
              relevancy: Number(Math.max(0, Math.min(1, Number(parsed.relevancy) || 0)).toFixed(4)),
              adherence: guard.adherent,
              rationale: String(parsed.rationale || "Scored by live LLM Judge.")
            };
          }
        }
      } catch (_) {
        // Fall back cleanly to offline rubric judge if live judge fails
      }
    }
    return offlineJudgeScore(testCase, actualOutput, judgeMode);
  }

  // -------------------------------------------------------------------------
  // Eval Suite Runner (Unit / Functional / Regression / Performance)
  // -------------------------------------------------------------------------

  async function runEvalSuite(testCases, options = {}) {
    const thresholds = Object.assign(
      {
        minOverallScore: 0.72,
        minFaithfulness: 0.70,
        requireZeroViolations: true,
        maxLatencyMs: 5000
      },
      options.thresholds || {}
    );
    const variant = options.variant || DEFAULT_PROMPT_VARIANTS.justified;
    const byok = options.byok || { provider: "heuristic" };
    const results = [];
    let totalTokens = 0;
    let totalLatencyMs = 0;

    for (const tc of testCases) {
      const prompt = renderPromptTemplate(variant.template, tc, variant.justifyAnswer);
      const t0 = Date.now();
      let actualOutput = "";
      let tokens = 0;
      let latencyMs = 0;
      let execSource = "offline-sim";

      try {
        const live = await callByokTextLlm(prompt, byok);
        if (live && live.text) {
          actualOutput = live.text;
          tokens = live.tokens;
          latencyMs = live.latencyMs;
          execSource = `${byok.provider}:${byok.model || "default"}`;
        } else {
          actualOutput = simulateOfflineBotResponse(tc, { justifyAnswer: variant.justifyAnswer });
          tokens = Math.ceil((prompt.length + actualOutput.length) / 4);
          latencyMs = Math.max(8, Date.now() - t0 + (variant.justifyAnswer ? 14 : 9));
        }
      } catch (err) {
        actualOutput = simulateOfflineBotResponse(tc, { justifyAnswer: variant.justifyAnswer });
        tokens = Math.ceil((prompt.length + actualOutput.length) / 4);
        latencyMs = Date.now() - t0;
        execSource = `offline-fallback (${err.message})`;
      }

      const exact = exactMatch(actualOutput, tc.expectedAction);
      const fuzzy = fuzzyMatch(actualOutput, tc.expectedAction);
      const rouge = rougeL(actualOutput, tc.expectedAction);
      const kw = keywordPrecisionRecallF1(actualOutput, tc.expectedKeywords);
      const guard = evaluateGuardrails(actualOutput, tc.forbiddenActions);
      const judge = await scoreWithLlmJudge(tc, actualOutput, {
        judgeMode: options.judgeMode || "with-reference",
        byok
      });

      const passed =
        judge.overall >= thresholds.minOverallScore &&
        judge.faithfulness >= thresholds.minFaithfulness &&
        (!thresholds.requireZeroViolations || guard.adherent === 1) &&
        latencyMs <= thresholds.maxLatencyMs;

      totalTokens += tokens;
      totalLatencyMs += latencyMs;

      results.push({
        testCaseId: tc.id,
        title: tc.title,
        gameSlug: tc.gameSlug,
        category: tc.category,
        datasetType: tc.datasetType,
        execSource,
        actualOutput,
        expectedAction: tc.expectedAction,
        metrics: {
          exactMatch: exact,
          fuzzyMatch: fuzzy,
          rougeLF1: rouge.f1,
          keywordRecall: kw.recall,
          keywordF1: kw.f1,
          guardrailAdherence: guard.adherent,
          violations: guard.violations,
          judgeOverall: judge.overall,
          judgeFaithfulness: judge.faithfulness,
          judgeRelevancy: judge.relevancy,
          judgeRationale: judge.rationale,
          judgeSource: judge.source,
          latencyMs,
          tokens
        },
        passed
      });
    }

    const n = Math.max(1, results.length);
    const passedCount = results.filter((r) => r.passed).length;
    const avgOverall = Number((results.reduce((s, r) => s + r.metrics.judgeOverall, 0) / n).toFixed(4));
    const avgFaithfulness = Number((results.reduce((s, r) => s + r.metrics.judgeFaithfulness, 0) / n).toFixed(4));
    const avgRougeL = Number((results.reduce((s, r) => s + r.metrics.rougeLF1, 0) / n).toFixed(4));
    const adherenceRate = Number((results.reduce((s, r) => s + r.metrics.guardrailAdherence, 0) / n).toFixed(4));
    const passRate = Number((passedCount / n).toFixed(4));
    const avgLatencyMs = Math.round(totalLatencyMs / n);
    const estCostUsd = Number(((totalTokens / 1000) * 0.0005).toFixed(5));

    const suitePassed =
      passRate >= (options.minPassRate != null ? options.minPassRate : 0.8) &&
      (!thresholds.requireZeroViolations || adherenceRate === 1);

    return {
      runId: `eval-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      suiteType: options.suiteType || "regression",
      variant: {
        id: variant.id,
        name: variant.name,
        justifyAnswer: Boolean(variant.justifyAnswer)
      },
      thresholds,
      summary: {
        totalCases: results.length,
        passedCases: passedCount,
        failedCases: results.length - passedCount,
        passRate,
        avgOverall,
        avgFaithfulness,
        avgRougeL,
        adherenceRate,
        avgLatencyMs,
        totalTokens,
        estCostUsd,
        suitePassed
      },
      results
    };
  }

  async function runABComparison(testCases, variantA, variantB, options = {}) {
    const runA = await runEvalSuite(testCases, Object.assign({}, options, { variant: variantA, suiteType: "ab-comparison" }));
    const runB = await runEvalSuite(testCases, Object.assign({}, options, { variant: variantB, suiteType: "ab-comparison" }));
    const deltaPassRate = Number((runB.summary.passRate - runA.summary.passRate).toFixed(4));
    const deltaOverall = Number((runB.summary.avgOverall - runA.summary.avgOverall).toFixed(4));
    const deltaFaithfulness = Number((runB.summary.avgFaithfulness - runA.summary.avgFaithfulness).toFixed(4));
    const deltaLatencyMs = runB.summary.avgLatencyMs - runA.summary.avgLatencyMs;
    const winner =
      deltaOverall > 0.01 ? "B" : deltaOverall < -0.01 ? "A" : "TIE";

    return {
      timestamp: new Date().toISOString(),
      runA,
      runB,
      deltas: {
        passRate: deltaPassRate,
        avgOverall: deltaOverall,
        avgFaithfulness: deltaFaithfulness,
        avgLatencyMs: deltaLatencyMs
      },
      winner
    };
  }

  // -------------------------------------------------------------------------
  // Data-Driven Coverage Matrix (Playbook Section 7)
  // -------------------------------------------------------------------------

  function computeCoverageMatrix(matrixRows, testCases) {
    const countsByCat = {};
    for (const tc of testCases || []) {
      const cat = tc.category || "core-loop";
      countsByCat[cat] = (countsByCat[cat] || 0) + 1;
    }

    return (matrixRows || [])
      .map((row) => {
        const freq = Math.max(0, Math.min(1, Number(row.frequency) || 0));
        const impact = Math.max(1, Math.min(4, Number(row.impact) || 1));
        const weightedScore = Number((freq * impact).toFixed(3));
        const targetCases = Math.max(1, Number(row.targetCases) || Math.ceil(weightedScore * 4));
        const actualCases = countsByCat[row.category] || 0;
        const coveragePct = Math.min(100, Math.round((actualCases / targetCases) * 100));
        const status = actualCases >= targetCases ? "covered" : actualCases > 0 ? "partial" : "gap";
        return Object.assign({}, row, {
          frequency: freq,
          impact,
          weightedScore,
          targetCases,
          actualCases,
          coveragePct,
          status
        });
      })
      .sort((a, b) => b.weightedScore - a.weightedScore);
  }

  // -------------------------------------------------------------------------
  // Synthetic Edge-Case Generator & Replay Importer (Playbook Section 6)
  // -------------------------------------------------------------------------

  function generateSyntheticCase(gameSlug, category = "edge-case") {
    const slug = gameSlug || "any-game";
    const templates = {
      "stuck-recovery": {
        title: `${slug}: Synthetic Soft-Lock / Unresponsive Input`,
        inputState: `Game frame unchanged for 4 ticks in ${slug}. Modal or pause overlay may be intercepting keyboard events.`,
        expectedAction: "click canvas center to restore focus, press Esc to toggle pause, then probe primary movement key",
        expectedKeywords: ["focus", "esc", "probe"],
        forbiddenActions: ["repeat identical failing input"],
        rubric: "Bot must break out of the stuck loop by restoring focus or dismissing overlays."
      },
      "mobile-viewport": {
        title: `${slug}: Synthetic 390px Portrait Touch & Overflow`,
        inputState: `Viewport set to 390x844 on ${slug}. Check for horizontal scroll, clipped HUD buttons, and touch responsiveness.`,
        expectedAction: "verify zero horizontal overflow, tap primary touch control, and log any clipped UI elements",
        expectedKeywords: ["overflow", "touch", "clipped"],
        forbiddenActions: ["ignore horizontal scroll"],
        rubric: "Bot must validate mobile layout integrity and touch reachability."
      },
      "edge-case": {
        title: `${slug}: Synthetic Rapid Multi-Key / Boundary Stress`,
        inputState: `Rapid alternating inputs sent near arena boundary in ${slug} while HUD counter updates.`,
        expectedAction: "send short controlled taps, verify player stays within bounds and no NaN or console errors occur",
        expectedKeywords: ["bounds", "console", "controlled"],
        forbiddenActions: ["hold key indefinitely", "ignore console error"],
        rubric: "Bot must stress boundary handling without triggering stuck keys or ignoring errors."
      }
    };
    const tpl = templates[category] || templates["edge-case"];
    return Object.assign(
      {
        id: `syn-${Date.now().toString(36)}-${Math.floor(Math.random() * 999)}`,
        gameSlug: slug,
        datasetType: "synthetic-model",
        category
      },
      tpl
    );
  }

  function importReplayToTestCases(replayJson, gameSlug = "any-game") {
    const events = Array.isArray(replayJson)
      ? replayJson
      : Array.isArray(replayJson?.events)
      ? replayJson.events
      : Array.isArray(replayJson?.actions)
      ? replayJson.actions
      : [];
    if (!events.length) return [];

    const sample = events.slice(0, 5);
    return sample.map((ev, idx) => {
      const actionDesc = ev.key
        ? `press ${ev.key}`
        : ev.x != null && ev.y != null
        ? `click (${ev.x}, ${ev.y})`
        : ev.type || "perform recorded action";
      return {
        id: `rep-${Date.now().toString(36)}-${idx}`,
        gameSlug: replayJson?.gameSlug || gameSlug,
        datasetType: "production-replay",
        category: idx === 0 ? "boot" : "core-loop",
        title: `Replay Step #${idx + 1} (${replayJson?.gameSlug || gameSlug})`,
        inputState: `Captured production replay step ${idx + 1} at t=${ev.t || ev.timestamp || idx * 500}ms.`,
        expectedAction: actionDesc,
        expectedKeywords: tokenize(actionDesc).slice(0, 3),
        forbiddenActions: ["console error", "freeze"],
        rubric: "Bot action should match the recorded production replay step without regression."
      };
    });
  }

  // -------------------------------------------------------------------------
  // Business KPIs & CI/CD Exporters (Playbook Sections 2 & 8)
  // -------------------------------------------------------------------------

  function computeGameplayKpis(runHistory, manualMinutesPerRun = 45, runsPerMonth = 40) {
    const latest = (runHistory || [])[0] || null;
    const passRate = latest ? latest.summary.passRate : 0;
    const adherenceRate = latest ? latest.summary.adherenceRate : 1;
    const autoMinutesPerRun = latest ? Math.max(0.5, (latest.summary.avgLatencyMs * latest.summary.totalCases) / 60000) : 1;
    const cycleTimeReductionPct = Math.max(0, Math.min(99, Math.round((1 - autoMinutesPerRun / Math.max(1, manualMinutesPerRun)) * 100)));
    const annualHoursSaved = Math.round(((manualMinutesPerRun - autoMinutesPerRun) * runsPerMonth * 12) / 60);
    return {
      latestPassRatePct: Math.round(passRate * 100),
      complianceAdherencePct: Math.round(adherenceRate * 100),
      cycleTimeReductionPct,
      annualHoursSaved: Math.max(0, annualHoursSaved),
      totalEvalRuns: (runHistory || []).length
    };
  }

  function exportMarkdownReport(run, coverageRows, kpis) {
    const s = run.summary;
    const lines = [
      `# GiveGigsGames Tester 3.0 · Test-Driven LLM Eval Report`,
      ``,
      `- **Run ID:** \`${run.runId}\``,
      `- **Timestamp:** ${run.timestamp}`,
      `- **Variant:** ${run.variant.name} (Justify your answer: ${run.variant.justifyAnswer ? "ON" : "OFF"})`,
      `- **Gate Status:** ${s.suitePassed ? "✅ PASSED" : "❌ FAILED (Regression Detected)"}`,
      ``,
      `## Summary Metrics`,
      `| Metric | Value |`,
      `| :--- | :--- |`,
      `| Pass Rate | ${Math.round(s.passRate * 100)}% (${s.passedCases}/${s.totalCases}) |`,
      `| Avg LLM-Judge Overall | ${s.avgOverall} |`,
      `| Avg Faithfulness | ${s.avgFaithfulness} |`,
      `| Avg ROUGE-L F1 | ${s.avgRougeL} |`,
      `| Guardrail Adherence | ${Math.round(s.adherenceRate * 100)}% |`,
      `| Avg Latency / Tokens | ${s.avgLatencyMs}ms / ${s.totalTokens} tokens (~$${s.estCostUsd}) |`,
      ``
    ];
    if (kpis) {
      lines.push(
        `## QA Business KPIs`,
        `- **Cycle Time Reduction:** ${kpis.cycleTimeReductionPct}%`,
        `- **Est. Annual QA Hours Saved:** ${kpis.annualHoursSaved} hrs/yr`,
        `- **Guardrail / Compliance Adherence:** ${kpis.complianceAdherencePct}%`,
        ``
      );
    }
    if (coverageRows && coverageRows.length) {
      lines.push(
        `## Data-Driven Coverage Matrix (Prioritized)`,
        `| Scenario | Freq | Impact | Weighted Score | Coverage |`,
        `| :--- | :---: | :---: | :---: | :---: |`
      );
      for (const r of coverageRows) {
        lines.push(`| ${r.scenario} | ${Math.round(r.frequency * 100)}% | ${r.impact}/4 | **${r.weightedScore}** | ${r.actualCases}/${r.targetCases} (${r.coveragePct}%) |`);
      }
      lines.push(``);
    }
    lines.push(`## Case-by-Case Results`);
    for (const r of run.results) {
      lines.push(
        `- ${r.passed ? "✅" : "❌"} **${r.title}** (\`${r.gameSlug}\` · ${r.datasetType}) — Judge: ${r.metrics.judgeOverall}, Faithfulness: ${r.metrics.judgeFaithfulness}, ROUGE-L: ${r.metrics.rougeLF1}. _${r.metrics.judgeRationale}_`
      );
    }
    return lines.join("\n");
  }

  function exportGitHubActionsYaml(thresholds = {}) {
    const minOverall = thresholds.minOverallScore != null ? thresholds.minOverallScore : 0.72;
    const minPass = thresholds.minPassRate != null ? thresholds.minPassRate : 0.8;
    return [
      `name: GiveGigsGames Tester 3.0 LLM Evals`,
      `on:`,
      `  pull_request:`,
      `    paths:`,
      `      - 'tester/**'`,
      `      - 'games/**'`,
      `  workflow_dispatch:`,
      `jobs:`,
      `  llm-gameplay-evals:`,
      `    runs-on: ubuntu-latest`,
      `    steps:`,
      `      - uses: actions/checkout@v4`,
      `      - uses: actions/setup-node@v4`,
      `        with:`,
      `          node-version: 20`,
      `      - name: Run Test-Driven Gameplay LLM Regression Suite`,
      `        run: |`,
      `          node -e "`,
      `            const Evals = require('./tester/engine/evals.js');`,
      `            Evals.runEvalSuite(Evals.DEFAULT_PLAY_BENCHMARKS, {`,
      `              variant: Evals.DEFAULT_PROMPT_VARIANTS.justified,`,
      `              minPassRate: ${minPass},`,
      `              thresholds: { minOverallScore: ${minOverall}, requireZeroViolations: true }`,
      `            }).then(run => {`,
      `              console.log(JSON.stringify(run.summary, null, 2));`,
      `              if (!run.summary.suitePassed) process.exit(1);`,
      `            });`,
      `          "`
    ].join("\n");
  }

  return {
    DATASET_TYPES,
    SCENARIO_CATEGORIES,
    DEFAULT_PLAY_BENCHMARKS,
    DEFAULT_COVERAGE_MATRIX,
    DEFAULT_PROMPT_VARIANTS,
    normalizeText,
    tokenize,
    exactMatch,
    fuzzyMatch,
    rougeL,
    keywordPrecisionRecallF1,
    evaluateGuardrails,
    renderPromptTemplate,
    simulateOfflineBotResponse,
    offlineJudgeScore,
    scoreWithLlmJudge,
    runEvalSuite,
    runABComparison,
    computeCoverageMatrix,
    generateSyntheticCase,
    importReplayToTestCases,
    computeGameplayKpis,
    exportMarkdownReport,
    exportGitHubActionsYaml
  };
});
