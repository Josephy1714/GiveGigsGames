(() => {
  "use strict";

  const Evals = window.GGGEvals;
  if (!Evals) return;

  const byId = (id) => document.getElementById(id);
  const STORAGE_KEY = "ggg_tester_v3_state_v1";

  const state = {
    dataset: Evals.DEFAULT_PLAY_BENCHMARKS.map((c) => Object.assign({}, c)),
    matrix: Evals.DEFAULT_COVERAGE_MATRIX.map((m) => Object.assign({}, m)),
    runHistory: [],
    lastRun: null
  };

  function loadPersisted() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.dataset) && parsed.dataset.length) state.dataset = parsed.dataset;
      if (Array.isArray(parsed.matrix) && parsed.matrix.length) state.matrix = parsed.matrix;
      if (Array.isArray(parsed.runHistory)) {
        state.runHistory = parsed.runHistory.slice(0, 20);
        state.lastRun = state.runHistory[0] || null;
      }
    } catch (_) {}
  }

  function savePersisted() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          dataset: state.dataset,
          matrix: state.matrix,
          runHistory: state.runHistory.slice(0, 20)
        })
      );
    } catch (_) {}
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getByokConfig() {
    return {
      provider: byId("v3-provider").value,
      model: byId("v3-model").value.trim(),
      apiKey: byId("v3-api-key").value.trim()
    };
  }

  function updatePills() {
    const gate = byId("v3-pill-gate");
    const cases = byId("v3-pill-cases");
    const pass = byId("v3-pill-pass");
    const judge = byId("v3-pill-judge");
    const mode = byId("v3-pill-mode");

    cases.textContent = `cases: ${state.dataset.length}`;
    const byok = getByokConfig();
    mode.textContent = `mode: ${byok.provider === "heuristic" ? "offline" : byok.provider}`;

    if (state.lastRun) {
      const s = state.lastRun.summary;
      gate.className = "pill " + (s.suitePassed ? "pill-running" : "pill-error");
      gate.textContent = s.suitePassed ? "GATE: PASS" : "GATE: FAIL";
      pass.textContent = `pass: ${Math.round(s.passRate * 100)}%`;
      judge.textContent = `judge: ${s.avgOverall}`;
    } else {
      gate.className = "pill pill-idle";
      gate.textContent = "GATE: READY";
      pass.textContent = "pass: —";
      judge.textContent = "judge: —";
    }
  }

  function populateGameFilter() {
    const sel = byId("v3-filter-game");
    const current = sel.value || "all";
    const slugs = [...new Set(state.dataset.map((c) => c.gameSlug).filter(Boolean))].sort();
    sel.innerHTML = `<option value="all">All Games (${state.dataset.length})</option>` +
      slugs.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
    if (slugs.includes(current)) sel.value = current;
  }

  // -------------------------------------------------------------------------
  // Renderers
  // -------------------------------------------------------------------------

  function renderDataset() {
    byId("v3-dataset-count").textContent = String(state.dataset.length);
    populateGameFilter();

    const counts = {};
    for (const dt of Evals.DATASET_TYPES) counts[dt.id] = 0;
    for (const tc of state.dataset) counts[tc.datasetType] = (counts[tc.datasetType] || 0) + 1;

    byId("v3-dataset-breakdown").innerHTML = Evals.DATASET_TYPES.map(
      (dt) => `<span class="pill">${escapeHtml(dt.label)}: ${counts[dt.id] || 0}</span>`
    ).join(" ");

    const listEl = byId("v3-dataset-list");
    if (!state.dataset.length) {
      listEl.innerHTML = `<p class="muted-note">No test cases in dataset.</p>`;
      return;
    }

    listEl.innerHTML = `
      <table class="v3-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Game</th>
            <th>Type</th>
            <th>Category</th>
            <th>Expected Action</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${state.dataset
            .map(
              (tc, idx) => `
            <tr>
              <td><strong>${escapeHtml(tc.title)}</strong><div class="v3-sub">${escapeHtml(tc.inputState)}</div></td>
              <td><code>${escapeHtml(tc.gameSlug)}</code></td>
              <td><span class="pill">${escapeHtml(tc.datasetType)}</span></td>
              <td><code>${escapeHtml(tc.category)}</code></td>
              <td>${escapeHtml(tc.expectedAction)}</td>
              <td><button type="button" class="tool-button v3-del-case" data-idx="${idx}" aria-label="Delete case">✕</button></td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>`;

    listEl.querySelectorAll(".v3-del-case").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.idx);
        state.dataset.splice(idx, 1);
        savePersisted();
        renderAll();
      });
    });
  }

  function renderMatrix() {
    const rows = Evals.computeCoverageMatrix(state.matrix, state.dataset);
    const el = byId("v3-matrix-table");
    el.innerHTML = `
      <table class="v3-table">
        <thead>
          <tr>
            <th>Scenario</th>
            <th>Segment</th>
            <th>Frequency (0–1)</th>
            <th>Impact (1–4)</th>
            <th>Weighted Score</th>
            <th>Coverage</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) => `
            <tr>
              <td><strong>${escapeHtml(r.scenario)}</strong></td>
              <td>${escapeHtml(r.segment)}</td>
              <td><input type="number" class="v3-mat-freq" data-id="${escapeHtml(r.id)}" min="0" max="1" step="0.05" value="${r.frequency}"></td>
              <td><input type="number" class="v3-mat-imp" data-id="${escapeHtml(r.id)}" min="1" max="4" step="1" value="${r.impact}"></td>
              <td><strong>${r.weightedScore}</strong></td>
              <td>${r.actualCases} / ${r.targetCases} (${r.coveragePct}%)</td>
              <td><span class="pill ${r.status === "covered" ? "pill-running" : r.status === "partial" ? "pill-paused" : "pill-error"}">${r.status.toUpperCase()}</span></td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>`;

    el.querySelectorAll(".v3-mat-freq").forEach((inp) => {
      inp.addEventListener("change", () => {
        const row = state.matrix.find((m) => m.id === inp.dataset.id);
        if (row) {
          row.frequency = Math.max(0, Math.min(1, Number(inp.value) || 0));
          savePersisted();
          renderMatrix();
        }
      });
    });
    el.querySelectorAll(".v3-mat-imp").forEach((inp) => {
      inp.addEventListener("change", () => {
        const row = state.matrix.find((m) => m.id === inp.dataset.id);
        if (row) {
          row.impact = Math.max(1, Math.min(4, Math.round(Number(inp.value) || 1)));
          savePersisted();
          renderMatrix();
        }
      });
    });
  }

  function renderRunResults(run) {
    if (!run) return;
    const s = run.summary;
    byId("v3-run-summary").innerHTML = `
      <strong>${s.suitePassed ? "✅ QUALITY GATE PASSED" : "❌ QUALITY GATE FAILED (REGRESSION)"}</strong>
      · Pass Rate: <strong>${Math.round(s.passRate * 100)}%</strong> (${s.passedCases}/${s.totalCases})
      · Judge Overall: <strong>${s.avgOverall}</strong>
      · Faithfulness: <strong>${s.avgFaithfulness}</strong>
      · ROUGE-L: <strong>${s.avgRougeL}</strong>
      · Guardrails: <strong>${Math.round(s.adherenceRate * 100)}%</strong>
      · Avg Latency: <strong>${s.avgLatencyMs}ms</strong>
      · Tokens: <strong>${s.totalTokens}</strong> (~$${s.estCostUsd})
    `;

    byId("v3-results-list").innerHTML = `
      <table class="v3-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Test Case</th>
            <th>Judge</th>
            <th>Faithful</th>
            <th>ROUGE-L</th>
            <th>Guardrail</th>
            <th>Rationale &amp; Output</th>
          </tr>
        </thead>
        <tbody>
          ${run.results
            .map(
              (r) => `
            <tr>
              <td><span class="pill ${r.passed ? "pill-running" : "pill-error"}">${r.passed ? "PASS" : "FAIL"}</span></td>
              <td><strong>${escapeHtml(r.title)}</strong><div class="v3-sub"><code>${escapeHtml(r.gameSlug)}</code> · ${escapeHtml(r.execSource)}</div></td>
              <td><strong>${r.metrics.judgeOverall}</strong></td>
              <td>${r.metrics.judgeFaithfulness}</td>
              <td>${r.metrics.rougeLF1}</td>
              <td>${r.metrics.guardrailAdherence ? "✅ 100%" : "❌ VIOLATION"}</td>
              <td>
                <div>${escapeHtml(r.metrics.judgeRationale)}</div>
                <div class="v3-sub">Output: ${escapeHtml(r.actualOutput)}</div>
              </td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>`;
  }

  function renderKpis() {
    const manualMin = Number(byId("v3-kpi-manual").value) || 45;
    const runsPerMo = Number(byId("v3-kpi-runs").value) || 40;
    const kpis = Evals.computeGameplayKpis(state.runHistory, manualMin, runsPerMo);
    byId("v3-kpi-cards").innerHTML = `
      <div class="v3-kpi-card"><span>Latest Pass Rate</span><strong>${kpis.latestPassRatePct}%</strong></div>
      <div class="v3-kpi-card"><span>Guardrail Adherence</span><strong>${kpis.complianceAdherencePct}%</strong></div>
      <div class="v3-kpi-card"><span>Cycle Time Reduction</span><strong>${kpis.cycleTimeReductionPct}%</strong></div>
      <div class="v3-kpi-card"><span>Est. Annual Hours Saved</span><strong>${kpis.annualHoursSaved} hrs</strong></div>
    `;
  }

  function renderAll() {
    updatePills();
    renderDataset();
    renderMatrix();
    renderKpis();
    if (state.lastRun) renderRunResults(state.lastRun);
  }

  function downloadFile(filename, content, mime = "text/plain") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // -------------------------------------------------------------------------
  // Event Wiring
  // -------------------------------------------------------------------------

  document.querySelectorAll("[data-v3-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.v3Tab;
      document.querySelectorAll("[data-v3-tab]").forEach((b) => {
        const active = b.dataset.v3Tab === target;
        b.classList.toggle("active", active);
        b.setAttribute("aria-selected", String(active));
      });
      ["runner", "datasets", "matrix", "ablab", "cicd"].forEach((id) => {
        const panel = byId(`v3-panel-${id}`);
        if (panel) panel.hidden = id !== target;
      });
    });
  });

  byId("v3-provider").addEventListener("change", updatePills);

  byId("v3-run-eval").addEventListener("click", async () => {
    const btn = byId("v3-run-eval");
    btn.disabled = true;
    btn.textContent = "⏳ Running Eval Suite...";
    try {
      const gameFilter = byId("v3-filter-game").value;
      const cases = gameFilter === "all" ? state.dataset : state.dataset.filter((c) => c.gameSlug === gameFilter);
      const run = await Evals.runEvalSuite(cases, {
        suiteType: byId("v3-suite-type").value,
        judgeMode: byId("v3-judge-mode").value,
        minPassRate: Number(byId("v3-min-pass").value) || 0.8,
        thresholds: {
          minOverallScore: Number(byId("v3-min-overall").value) || 0.72,
          requireZeroViolations: byId("v3-zero-violations").checked
        },
        variant: {
          id: "active",
          name: "Active Studio Prompt",
          justifyAnswer: byId("v3-justify-toggle").checked,
          template: byId("v3-prompt-template").value
        },
        byok: getByokConfig()
      });
      state.lastRun = run;
      state.runHistory.unshift(run);
      savePersisted();
      renderAll();
    } finally {
      btn.disabled = false;
      btn.textContent = "▶ Run Eval Suite";
    }
  });

  byId("v3-reset-defaults").addEventListener("click", () => {
    state.dataset = Evals.DEFAULT_PLAY_BENCHMARKS.map((c) => Object.assign({}, c));
    state.matrix = Evals.DEFAULT_COVERAGE_MATRIX.map((m) => Object.assign({}, m));
    savePersisted();
    renderAll();
  });

  byId("v3-add-case").addEventListener("click", () => {
    const title = byId("v3-tc-title").value.trim();
    const inputState = byId("v3-tc-input").value.trim();
    const expectedAction = byId("v3-tc-expected").value.trim();
    if (!title || !inputState || !expectedAction) return;
    state.dataset.unshift({
      id: `gold-${Date.now().toString(36)}`,
      gameSlug: byId("v3-tc-game").value.trim() || "any-game",
      datasetType: byId("v3-tc-type").value,
      category: byId("v3-tc-cat").value,
      title,
      inputState,
      expectedAction,
      expectedKeywords: byId("v3-tc-keywords").value.split(",").map((s) => s.trim()).filter(Boolean),
      forbiddenActions: byId("v3-tc-forbidden").value.split(",").map((s) => s.trim()).filter(Boolean),
      rubric: "Bot must execute the golden expected action without triggering forbidden guardrails."
    });
    byId("v3-tc-title").value = "";
    byId("v3-tc-input").value = "";
    byId("v3-tc-expected").value = "";
    savePersisted();
    renderAll();
  });

  byId("v3-gen-synthetic").addEventListener("click", () => {
    const syn = Evals.generateSyntheticCase(byId("v3-syn-game").value.trim(), byId("v3-syn-cat").value);
    state.dataset.unshift(syn);
    savePersisted();
    renderAll();
  });

  byId("v3-import-replay-btn").addEventListener("click", () => byId("v3-import-replay-input").click());
  byId("v3-import-replay-input").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const imported = Evals.importReplayToTestCases(parsed, byId("v3-syn-game").value.trim() || "any-game");
      if (imported.length) {
        state.dataset = imported.concat(state.dataset);
        savePersisted();
        renderAll();
      }
    } catch (_) {}
    e.target.value = "";
  });

  byId("v3-export-dataset").addEventListener("click", () => {
    downloadFile("ggg-tester3-dataset.json", JSON.stringify(state.dataset, null, 2), "application/json");
  });

  byId("v3-run-ab").addEventListener("click", async () => {
    const btn = byId("v3-run-ab");
    btn.disabled = true;
    btn.textContent = "⏳ Running A/B Comparison...";
    try {
      const varA = {
        id: "variant-a",
        name: byId("v3-ab-name-a").value.trim() || "Variant A",
        justifyAnswer: byId("v3-ab-justify-a").checked,
        template: byId("v3-ab-tpl-a").value
      };
      const varB = {
        id: "variant-b",
        name: byId("v3-ab-name-b").value.trim() || "Variant B",
        justifyAnswer: byId("v3-ab-justify-b").checked,
        template: byId("v3-ab-tpl-b").value
      };
      const ab = await Evals.runABComparison(state.dataset, varA, varB, { byok: getByokConfig() });
      const fmtDelta = (v) => (v >= 0 ? `+${v}` : `${v}`);
      byId("v3-ab-results").innerHTML = `
        <strong>Winner: Variant ${ab.winner}</strong> ·
        Variant A Pass: <strong>${Math.round(ab.runA.summary.passRate * 100)}%</strong> (Judge ${ab.runA.summary.avgOverall}) vs
        Variant B Pass: <strong>${Math.round(ab.runB.summary.passRate * 100)}%</strong> (Judge ${ab.runB.summary.avgOverall}) ·
        Delta Overall: <strong>${fmtDelta(ab.deltas.avgOverall)}</strong> ·
        Delta Faithfulness: <strong>${fmtDelta(ab.deltas.avgFaithfulness)}</strong> ·
        Delta Latency: <strong>${fmtDelta(ab.deltas.avgLatencyMs)}ms</strong>
      `;
    } finally {
      btn.disabled = false;
      btn.textContent = "⚖️ Run A/B Comparison on Active Dataset";
    }
  });

  byId("v3-kpi-manual").addEventListener("change", renderKpis);
  byId("v3-kpi-runs").addEventListener("change", renderKpis);

  byId("v3-btn-export-md").addEventListener("click", () => {
    if (!state.lastRun) return;
    const rows = Evals.computeCoverageMatrix(state.matrix, state.dataset);
    const kpis = Evals.computeGameplayKpis(state.runHistory, Number(byId("v3-kpi-manual").value) || 45, Number(byId("v3-kpi-runs").value) || 40);
    const md = Evals.exportMarkdownReport(state.lastRun, rows, kpis);
    byId("v3-cicd-preview").value = md;
    downloadFile(`ggg-tester3-report-${state.lastRun.runId}.md`, md, "text/markdown");
  });

  byId("v3-btn-export-json").addEventListener("click", () => {
    if (!state.lastRun) return;
    const json = JSON.stringify(state.lastRun, null, 2);
    byId("v3-cicd-preview").value = json;
    downloadFile(`ggg-tester3-run-${state.lastRun.runId}.json`, json, "application/json");
  });

  byId("v3-btn-gen-yaml").addEventListener("click", () => {
    const yaml = Evals.exportGitHubActionsYaml({
      minOverallScore: Number(byId("v3-min-overall").value) || 0.72,
      minPassRate: Number(byId("v3-min-pass").value) || 0.8
    });
    byId("v3-cicd-preview").value = yaml;
  });

  // Live Game Preview Capture
  byId("v3-load-game").addEventListener("click", () => {
    const slug = byId("v3-game-select").value;
    byId("v3-game-frame").src = `/games/${encodeURIComponent(slug)}/`;
  });

  byId("v3-capture-case").addEventListener("click", () => {
    const slug = byId("v3-game-select").value;
    const frameEl = byId("v3-game-frame");
    const size = `${frameEl.clientWidth || 1280}x${frameEl.clientHeight || 720}`;
    state.dataset.unshift({
      id: `cap-${Date.now().toString(36)}`,
      gameSlug: slug,
      datasetType: "human-golden",
      category: "core-loop",
      title: `Live Capture: ${slug} (${size})`,
      inputState: `Captured live preview state of ${slug} at viewport ${size}. Verify controls respond and HUD updates cleanly.`,
      expectedAction: "focus game canvas, send primary movement/action input, and verify zero console errors",
      expectedKeywords: ["focus", "input", "console"],
      forbiddenActions: ["console error", "freeze"],
      rubric: "Bot must interact cleanly with the captured live game state without regressions."
    });
    savePersisted();
    renderAll();
  });

  // Initialize defaults
  loadPersisted();
  byId("v3-prompt-template").value = Evals.DEFAULT_PROMPT_VARIANTS.justified.template;
  byId("v3-ab-name-a").value = Evals.DEFAULT_PROMPT_VARIANTS.baseline.name;
  byId("v3-ab-justify-a").checked = Evals.DEFAULT_PROMPT_VARIANTS.baseline.justifyAnswer;
  byId("v3-ab-tpl-a").value = Evals.DEFAULT_PROMPT_VARIANTS.baseline.template;
  byId("v3-ab-name-b").value = Evals.DEFAULT_PROMPT_VARIANTS.justified.name;
  byId("v3-ab-justify-b").checked = Evals.DEFAULT_PROMPT_VARIANTS.justified.justifyAnswer;
  byId("v3-ab-tpl-b").value = Evals.DEFAULT_PROMPT_VARIANTS.justified.template;
  renderAll();
})();
