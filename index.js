(() => {
  const grid = document.getElementById("game-grid");
  const count = document.getElementById("catalog-count");
  const error = document.getElementById("catalog-error");
  const search = document.getElementById("catalog-search");
  const sort = document.getElementById("catalog-sort");
  const tagSearch = document.getElementById("tag-search");
  const tagOptions = document.getElementById("tag-options");
  const tagMatch = document.getElementById("tag-match");
  const selectedTagCount = document.getElementById("selected-tag-count");
  const saveFileList = document.getElementById("save-file-list");
  const saveManagerStatus = document.getElementById("save-manager-status");
  const saveFileInput = document.getElementById("save-file-input");
  const SAVE_FILE_FORMAT = "givegigsgames-save";
  const selectedTags = new Set();
  let games = [];

  const normalizedTags = (game) => [...new Set((game.tags || []).map((tag) => String(tag).trim()).filter(Boolean))];
  const compare = (a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });

  function safeFilename(value) {
    return String(value || "save").normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "save";
  }

  function gameForStorageKey(key) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    return games
      .filter((game) => normalizedKey.includes(game.slug.toLowerCase().replace(/[^a-z0-9]/g, "")))
      .sort((a, b) => b.slug.length - a.slug.length)[0] || null;
  }

  function downloadSave(key, value) {
    const game = gameForStorageKey(key);
    const timestamp = new Date().toISOString();
    const uniqueId = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const payload = {
      format: SAVE_FILE_FORMAT,
      version: 1,
      exportedAt: timestamp,
      game: game ? { slug: game.slug, title: game.title } : null,
      storage: { type: "localStorage", key, value }
    };
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `givegigsgames-${safeFilename(game?.slug || "browser")}-${safeFilename(key)}-${timestamp.replace(/[:.]/g, "-")}-${uniqueId}.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function renderSaveFiles() {
    saveFileList.replaceChildren();
    try {
      const entries = Array.from({ length: localStorage.length }, (_, index) => {
        const key = localStorage.key(index);
        return key === null ? null : { key, value: localStorage.getItem(key) };
      }).filter((entry) => entry && entry.value !== null).sort((a, b) => compare(a.key, b.key));

      saveManagerStatus.textContent = entries.length
        ? `${entries.length} browser storage ${entries.length === 1 ? "entry" : "entries"} found. Download each entry to back it up.`
        : "No browser save data found for this site yet.";

      for (const entry of entries) {
        const game = gameForStorageKey(entry.key);
        const row = document.createElement("div");
        row.className = "save-file-row";
        const description = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = game?.title || "Browser save data";
        const keyLabel = document.createElement("code");
        keyLabel.textContent = entry.key;
        description.append(title, keyLabel);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "save-download-button";
        button.textContent = "Download .txt";
        button.addEventListener("click", () => downloadSave(entry.key, entry.value));
        row.append(description, button);
        saveFileList.append(row);
      }
    } catch {
      saveManagerStatus.textContent = "This browser does not allow access to this site's local save data.";
    }
  }

  async function restoreSaveFiles(files) {
    const parsed = [];
    const errors = [];
    for (const file of files) {
      try {
        const payload = JSON.parse(await file.text());
        if (payload?.format !== SAVE_FILE_FORMAT || payload?.version !== 1 ||
            payload?.storage?.type !== "localStorage" || typeof payload.storage.key !== "string" ||
            !payload.storage.key.trim() || typeof payload.storage.value !== "string") {
          throw new Error("This is not a supported GiveGigsGames save file.");
        }
        parsed.push({ file, key: payload.storage.key, value: payload.storage.value });
      } catch (error) {
        errors.push(`${file.name}: ${error.message || "could not be read"}`);
      }
    }
    if (!parsed.length) {
      saveManagerStatus.textContent = errors.join(" ") || "No save files were selected.";
      return;
    }

    let overwrites;
    try {
      overwrites = parsed.filter(({ key }) => localStorage.getItem(key) !== null);
    } catch {
      saveManagerStatus.textContent = "This browser does not allow access to this site's local save data.";
      return;
    }
    if (overwrites.length && !window.confirm(`Restore ${parsed.length} save file${parsed.length === 1 ? "" : "s"}? This will replace existing data for ${overwrites.length} matching storage key${overwrites.length === 1 ? "" : "s"}.`)) {
      saveManagerStatus.textContent = "Restore cancelled. Existing saves were not changed.";
      return;
    }

    let restored = 0;
    for (const item of parsed) {
      try {
        localStorage.setItem(item.key, item.value);
        restored += 1;
      } catch (error) {
        errors.push(`${item.file.name}: could not restore (${error.message || "storage unavailable"})`);
      }
    }
    renderSaveFiles();
    const summary = `${restored} save file${restored === 1 ? "" : "s"} restored. Reload the game to apply its save.`;
    saveManagerStatus.textContent = errors.length ? `${summary} ${errors.join(" ")}` : summary;
  }

  function renderTagOptions() {
    const query = tagSearch.value.trim().toLowerCase();
    tagOptions.replaceChildren();
    const allTags = [...new Set(games.flatMap(normalizedTags))].sort(compare);
    for (const tag of allTags.filter((item) => item.toLowerCase().includes(query))) {
      const label = document.createElement("label");
      label.className = "tag-option";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = tag;
      checkbox.checked = selectedTags.has(tag);
      checkbox.addEventListener("change", () => {
        checkbox.checked ? selectedTags.add(tag) : selectedTags.delete(tag);
        updateSelectedTagCount();
        render();
      });
      const text = document.createElement("span");
      text.textContent = tag;
      label.append(checkbox, text);
      tagOptions.append(label);
    }
  }

  function updateSelectedTagCount() {
    selectedTagCount.textContent = selectedTags.size ? `${selectedTags.size} selected` : "All tags";
  }

  function sortGames(list) {
    const mode = sort.value;
    return list.sort((a, b) => {
      if (mode === "genre") return compare(a.genre || "", b.genre || "") || compare(a.title, b.title);
      if (mode === "tag") return compare(normalizedTags(a).sort(compare)[0] || "", normalizedTags(b).sort(compare)[0] || "") || compare(a.title, b.title);
      if (mode === "tags-desc") return normalizedTags(b).length - normalizedTags(a).length || compare(a.title, b.title);
      if (mode === "tags-asc") return normalizedTags(a).length - normalizedTags(b).length || compare(a.title, b.title);
      return compare(a.title, b.title);
    });
  }

  function render() {
    const query = search.value.trim().toLowerCase();
    const filtered = games.filter((game) => {
      const tags = normalizedTags(game);
      const haystack = `${game.title} ${game.genre} ${game.description} ${tags.join(" ")}`.toLowerCase();
      const tagMatches = [...selectedTags].map((tag) => tags.includes(tag));
      const matchesTags = !tagMatches.length || (tagMatch.value === "all" ? tagMatches.every(Boolean) : tagMatches.some(Boolean));
      return (!query || haystack.includes(query)) && matchesTags;
    });
    const sorted = sortGames(filtered);
    count.textContent = `${sorted.length} of ${games.length} games · tags can match any or all`;
    grid.replaceChildren();
    for (const game of sorted) {
      const card = document.createElement("article");
      card.className = "game-card";
      const head = document.createElement("div");
      head.className = "card-head";
      const emoji = document.createElement("span");
      emoji.className = "game-emoji";
      emoji.setAttribute("aria-hidden", "true");
      emoji.textContent = game.emoji || "🎮";
      head.append(emoji);
      if (game.featured) {
        const badge = document.createElement("span");
        badge.className = "featured";
        badge.textContent = "Featured";
        head.append(badge);
      }
      const body = document.createElement("div");
      body.className = "game-card-body";
      const title = document.createElement("h3");
      title.textContent = game.title;
      const genre = document.createElement("span");
      genre.className = "genre";
      genre.textContent = game.genre || "Uncategorized";
      const description = document.createElement("p");
      description.textContent = game.description || "";
      const tags = document.createElement("div");
      tags.className = "game-tags";
      for (const tag of normalizedTags(game)) {
        const chip = document.createElement("span");
        chip.className = "game-tag";
        chip.textContent = tag;
        tags.append(chip);
      }
      body.append(title, genre, description, tags);
      const actions = document.createElement("div");
      actions.className = "game-card-actions";
      const play = document.createElement("a");
      play.className = "play-label";
      play.href = game.runtimeType === "external" ? game.externalUrl : `./games/${game.entrypoint}`;
      play.textContent = game.runtimeType === "external" ? "Launch hosted build ↗ (online)" : "Open game →";
      if (game.runtimeType === "external") { play.target = "_blank"; play.rel = "noreferrer"; }
      const test = document.createElement("a");
      test.className = "test-link";
      test.href = `./tester/?game=${encodeURIComponent(game.slug)}`;
      test.textContent = "Open in tester";
      actions.append(play, test);
      card.append(head, body, actions);
      grid.append(card);
    }
  }

  try {
    const catalog = window.GIVEGIGSGAMES_CATALOG;
    if (!catalog || !Array.isArray(catalog.games)) throw new Error("Catalog data is missing.");
    games = catalog.games;
    renderTagOptions();
    render();
  } catch {
    count.textContent = "";
    error.hidden = false;
  }
  search.addEventListener("input", render);
  sort.addEventListener("change", render);
  tagSearch.addEventListener("input", renderTagOptions);
  tagMatch.addEventListener("change", render);
  document.getElementById("clear-tags").addEventListener("click", () => {
    selectedTags.clear();
    renderTagOptions();
    updateSelectedTagCount();
    render();
  });
  saveFileInput.addEventListener("change", async () => {
    const files = Array.from(saveFileInput.files || []);
    if (files.length) await restoreSaveFiles(files);
    saveFileInput.value = "";
  });
  renderSaveFiles();
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
})();
