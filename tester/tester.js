(() => {
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
  let games = [];
  let selected = null;
  const selectedTags = new Set();
  const viewport = byId("viewport-preset");

  viewport.addEventListener("change", () => {
    const [width, height] = viewport.value.split("x");
    frameWrap.style.overflow = width ? "auto" : "";
    frame.style.width = width ? `${width}px` : "";
    frame.style.height = height ? `${height}px` : "";
    frame.style.maxWidth = width ? "none" : "";
  });

  byId("draft-bug").addEventListener("click", () => {
    if (!selected) return;
    const draft = byId("bug-draft");
    draft.value = [
      `Game: ${selected.title} (${selected.slug})`,
      `Tester URL: ${location.href}`,
      `Build: ${selected.buildId || "Not recorded"}`,
      `Frame size: ${frame.clientWidth} × ${frame.clientHeight}`,
      `Browser: ${navigator.userAgent}`,
      "Input method:",
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
    [...new Set(games.flatMap(tagsFor))].sort(compare).filter((tag) => tag.toLowerCase().includes(query)).forEach((tag) => {
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
    if (!/^[a-z0-9-]+(?:\/[a-zA-Z0-9._-]+)*$/.test(game.entrypoint || "")) return "";
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
      play.textContent = "Launch game →";
      card.append(top, title, category, description, tags, play);
      card.addEventListener("click", () => openGame(game));
      grid.append(card);
    }
  }

  function openGame(game) {
    const source = safePath(game);
    if (!source) return;
    selected = game;
    byId("player-name").textContent = game.title;
    byId("player-emoji").textContent = game.emoji || "🎮";
    byId("player-genre").textContent = game.genre;
    byId("player-description").textContent = game.description;
    byId("open-game").href = source;
    byId("view-info").href = `/ggg/info/${encodeURIComponent(game.slug)}`;
    byId("view-guide").href = `/ggg/guide/${encodeURIComponent(game.slug)}`;
    byId("view-play").href = game.runtimeType === "external" ? source : `/ggg/play/${encodeURIComponent(game.slug)}`;
    frame.title = `${game.title} game`;
    const external = game.runtimeType === "external";
    frameWrap.hidden = external;
    externalPanel.hidden = !external;
    byId("open-external").href = external ? source : "#";
    frame.src = external ? "about:blank" : `${source}${source.includes("?") ? "&" : "?"}ggTester=1`;
    devConsole.hidden = game.slug.toLowerCase() !== "gravegain2da";
    library.hidden = true;
    player.hidden = false;
    try { history.replaceState(null, "", `?game=${encodeURIComponent(game.slug)}`); } catch {}
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeGame() {
    frame.src = "about:blank";
    player.hidden = true;
    library.hidden = false;
    selected = null;
    try { history.replaceState(null, "", location.pathname); } catch {}
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  window.addEventListener("message", (event) => {
    if (event.source === frame.contentWindow && event.data?.type === "givegigsgames:back-to-select") {
      closeGame();
    }
  });

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
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
    const listView = button.dataset.view === "list";
    grid.classList.toggle("list-view", listView);
    grid.classList.toggle("grid-view", !listView);
    document.querySelectorAll("[data-view]").forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
  }));
  byId("back-button").addEventListener("click", closeGame);
  byId("reload-game").addEventListener("click", () => {
    if (selected) frame.src = `${safePath(selected)}?ggTester=1`;
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
        case "god": {
          if (tokens[1] !== "on" && tokens[1] !== "off") throw new Error("Use: god on or god off");
          debug.godMode = tokens[1] === "on";
          output.textContent = `God mode ${debug.godMode ? "ON" : "OFF"}.`;
          break;
        }
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
        case "win": debug.win(); output.textContent = "Win state triggered."; break;
        case "lose": debug.lose(); output.textContent = "Lose state triggered."; break;
        case "status":
          output.textContent = game ? `Gold ${debug.getScore()} · HP ${debug.getHealth()} · God mode ${debug.godMode ? "ON" : "OFF"}` : "Game is still loading.";
          break;
        default: throw new Error(`Unknown command: ${tokens[0]}. Type help for commands.`);
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
    } catch {
      byId("frame-wrap").classList.toggle("fullscreen-fallback");
    }
  });

  try {
      const catalog = window.GIVEGIGSGAMES_CATALOG;
      if (!catalog || !Array.isArray(catalog.games)) throw new Error("The game catalog could not be loaded.");
      games = Array.isArray(catalog.games) ? catalog.games.filter((game) => game.slug && game.title && safePath(game)) : [];
      for (const item of [...new Set(games.map((game) => game.genre).filter(Boolean))].sort()) {
        const option = document.createElement("option");
        option.value = item;
        option.textContent = item;
        genre.append(option);
      }
      renderTagOptions();
      render();
      const slug = new URLSearchParams(location.search).get("game");
      const requested = games.find((game) => game.slug.toLowerCase() === (slug || "").toLowerCase());
      if (requested) openGame(requested);
  } catch (error) {
    byId("load-error").hidden = false;
    byId("load-error").textContent = `${error.message} Check that games/catalog-data.js is present.`;
  }
})();
