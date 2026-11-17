(() => {
  const grid = document.getElementById("game-grid");
  const count = document.getElementById("catalog-count");
  const error = document.getElementById("catalog-error");
  const search = document.getElementById("catalog-search");
  const sort = document.getElementById("catalog-sort");
  const pagination = document.getElementById("catalog-pagination");
  const paginationStatus = document.getElementById("catalog-pagination-status");
  const showMore = document.getElementById("show-more-games");
  const showAll = document.getElementById("show-all-games");
  const tagSearch = document.getElementById("tag-search");
  const tagOptions = document.getElementById("tag-options");
  const tagMatch = document.getElementById("tag-match");
  const selectedTagCount = document.getElementById("selected-tag-count");
  const saveFileList = document.getElementById("save-file-list");
  const saveManagerStatus = document.getElementById("save-manager-status");
  const saveFileInput = document.getElementById("save-file-input");
  const SAVE_FILE_FORMAT = "givegigsgames-save";
  const selectedTags = new Set();
  const collection = document.getElementById("catalog-collection");
  const input = document.getElementById("catalog-input");
  const gameMode = document.getElementById("catalog-mode");
  let games = [];
  let favorites = new Set();
  let recent = [];
  let savedView;
  let visibleLimit = 10;
  try {
    favorites = new Set(JSON.parse(localStorage.getItem("arcade:favorites") || "[]"));
    recent = JSON.parse(localStorage.getItem("arcade:recent") || "[]");
    savedView = JSON.parse(sessionStorage.getItem("arcade:catalog") || "null");
  } catch {}

  function rememberLaunch(game, played = true) {
    if (played) recent = [game.slug, ...recent.filter((slug) => slug !== game.slug)].slice(0, 20);
    try {
      localStorage.setItem("arcade:recent", JSON.stringify(recent));
      sessionStorage.setItem("arcade:catalog", JSON.stringify({
        version: 2,
        search: search.value, sort: sort.value, tagMatch: tagMatch.value,
        tags: [...selectedTags], collection: collection.value, input: input.value, mode: gameMode.value,
        view: grid.classList.contains("grid-view") ? "grid" : "list",
        scroll: window.scrollY, slug: game.slug
      }));
    } catch {}
  }

  const normalizedTags = (game) => [...new Set((game.tags || []).map((tag) => String(tag).trim()).filter(Boolean))];
  const compare = (a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });

  function withinOneEdit(word, candidate) {
    if (Math.abs(word.length - candidate.length) > 1) return false;
    if (word.length > candidate.length) return withinOneEdit(candidate, word);
    let index = 0;
    while (index < word.length && word[index] === candidate[index]) index += 1;
    const suffix = word.slice(index + (word.length === candidate.length ? 1 : 0));
    if (suffix === candidate.slice(index + 1)) return true;
    return word.length === candidate.length &&
      word[index] === candidate[index + 1] && word[index + 1] === candidate[index] &&
      word.slice(index + 2) === candidate.slice(index + 2);
  }

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
    downloadFile(payload, `givegigsgames-${safeFilename(game?.slug || "browser")}-${safeFilename(key)}-${timestamp.replace(/[:.]/g, "-")}-${uniqueId}.txt`);
  }

  function downloadFile(payload, filename) {
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadAllSaves() {
    try {
      const saves = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key === null || key.startsWith("arcade:")) continue;
        const value = localStorage.getItem(key);
        if (value !== null) saves.push({ type: "localStorage", key, value });
      }
      if (!saves.length) {
        saveManagerStatus.textContent = "No saves to download.";
        return;
      }
      downloadFile({ format: "givegigsgames-backup", version: 1, saves }, "givegigsgames-backup.txt");
    } catch {
      saveManagerStatus.textContent = "Browser saves could not be exported.";
    }
  }

  function renderSaveFiles() {
    saveFileList.replaceChildren();
    try {
      const entries = Array.from({ length: localStorage.length }, (_, index) => {
        const key = localStorage.key(index);
        return key === null ? null : { key, value: localStorage.getItem(key) };
      }).filter((entry) => entry && entry.value !== null && !entry.key.startsWith("arcade:"))
        .sort((a, b) => compare(gameForStorageKey(a.key)?.title || "", gameForStorageKey(b.key)?.title || "") || compare(a.key, b.key));

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
        const saves = payload?.version === 1 && payload.format === "givegigsgames-backup"
          ? payload.saves
          : payload?.version === 1 && payload.format === SAVE_FILE_FORMAT ? [payload.storage] : null;
        if (!Array.isArray(saves) || !saves.length || saves.some((save) =>
          save?.type !== "localStorage" || typeof save.key !== "string" ||
          !save.key.trim() || save.key.startsWith("arcade:") || typeof save.value !== "string")) {
          throw new Error("This is not a supported GiveGigsGames save file.");
        }
        for (const { key, value } of saves) parsed.push({ file, key, value });
      } catch (error) {
        errors.push(`${file.name}: ${error.message || "could not be read"}`);
      }
    }
    if (!parsed.length) {
      saveManagerStatus.textContent = errors.join(" ") || "No save files were selected.";
      return;
    }

    const dialog = document.getElementById("restore-dialog");
    const options = document.getElementById("restore-options");
    const unique = [...new Map(parsed.map((item) => [item.key, item])).values()];
    options.replaceChildren();
    const choices = [];
    try {
      for (const item of unique) {
        const exists = localStorage.getItem(item.key) !== null;
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = !exists;
        const game = gameForStorageKey(item.key);
        label.append(checkbox, ` ${game?.title || "Browser save"} · ${item.key} · ${exists ? "Replaces existing save" : "New save"}`);
        options.append(label);
        choices.push({ item, checkbox });
      }
    } catch {
      saveManagerStatus.textContent = "This browser does not allow access to this site's local save data.";
      return;
    }
    dialog.returnValue = "cancel";
    dialog.showModal();
    await new Promise((resolve) => dialog.addEventListener("close", resolve, { once: true }));
    if (dialog.returnValue !== "restore") {
      saveManagerStatus.textContent = "Restore cancelled. Existing saves were not changed.";
      return;
    }

    let restored = 0;
    for (const { item, checkbox } of choices) {
      if (!checkbox.checked) continue;
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
      if (mode === "size-desc") return (Number(b.packageBytes) || 0) - (Number(a.packageBytes) || 0) || compare(a.title, b.title);
      if (mode === "genre") return compare(a.genre || "", b.genre || "") || compare(a.title, b.title);
      if (mode === "tag") return compare(normalizedTags(a).sort(compare)[0] || "", normalizedTags(b).sort(compare)[0] || "") || compare(a.title, b.title);
      if (mode === "tags-desc") return normalizedTags(b).length - normalizedTags(a).length || compare(a.title, b.title);
      if (mode === "tags-asc") return normalizedTags(a).length - normalizedTags(b).length || compare(a.title, b.title);
      return compare(a.title, b.title);
    });
  }

  function render(resetLimit = true) {
    if (resetLimit) visibleLimit = 10;
    const query = search.value.trim().toLowerCase();
    const rank = (game) => {
      const title = game.title.toLowerCase();
      if (title === query) return 0;
      if (title.startsWith(query)) return 1;
      if (title.includes(query)) return 2;
      const terms = [game.genre, game.description, ...normalizedTags(game)].join(" ").toLowerCase();
      const words = query.split(/\s+/);
      if (words.every((word) => (title + " " + terms).includes(word))) return 3;
      const titleWords = title.match(/[\p{L}\p{N}]+/gu) || [];
      if (words.every((word) => title.includes(word) ||
        (word.length >= 4 && titleWords.some((candidate) => withinOneEdit(word, candidate))))) return 4;
      return Infinity;
    };
    const filtered = games.filter((game) => {
      const tags = normalizedTags(game);
      if (collection.value === "favorites" && !favorites.has(game.slug)) return false;
      if (collection.value === "recent" && !recent.includes(game.slug)) return false;
      if (collection.value === "offline" && game.runtimeType !== "static") return false;
      if (input.value && !game.inputs?.includes(input.value)) return false;
      if (gameMode.value && !game.modes?.includes(gameMode.value)) return false;
      const tagMatches = [...selectedTags].map((tag) => tags.includes(tag));
      const matchesTags = !tagMatches.length || (tagMatch.value === "all" ? tagMatches.every(Boolean) : tagMatches.some(Boolean));
      return (!query || Number.isFinite(rank(game))) && matchesTags;
    });
    const sorted = sortGames(filtered);
    if (collection.value === "recent") sorted.sort((a, b) => recent.indexOf(a.slug) - recent.indexOf(b.slug));
    if (query) sorted.sort((a, b) => rank(a) - rank(b));
    const displayCount = Math.min(visibleLimit, sorted.length);
    count.textContent = `Showing ${displayCount} of ${sorted.length} matching games · ${games.length} total`;
    grid.replaceChildren();
    if (!sorted.length) {
      const empty = document.createElement("p");
      empty.textContent = "No games match. Try changing your search, collection, or selected tags.";
      grid.append(empty);
    }
    for (const game of sorted.slice(0, visibleLimit)) {
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
      const availability = document.createElement("span");
      availability.className = "genre";
      const status = game.status ? `${game.status[0].toUpperCase()}${game.status.slice(1)} · ` : "";
      const size = Number(game.packageBytes) > 0 ? ` · ${formatPackageSize(game.packageBytes)}` : "";
      availability.textContent = status + (game.runtimeType === "external" ? "Internet required" : "Browser build") + size;
      const tags = document.createElement("div");
      tags.className = "game-tags";
      for (const tag of normalizedTags(game)) {
        const chip = document.createElement("span");
        chip.className = "game-tag";
        chip.textContent = tag;
        tags.append(chip);
      }
      body.append(title, genre, availability, description, tags);
      const actions = document.createElement("div");
      actions.className = "game-card-actions";
      const play = document.createElement("a");
      play.id = `launch-${game.slug}`;
      play.className = "play-label";
      play.href = `/ggg/play/${encodeURIComponent(game.slug)}`;
      play.textContent = "Play";
      play.setAttribute("aria-label", `Play ${game.title}`);
      play.addEventListener("click", () => rememberLaunch(game));
      const test = document.createElement("a");
      test.className = "test-link";
      test.href = `/ggg/test/${encodeURIComponent(game.slug)}`;
      test.textContent = "Test";
      const details = document.createElement("a");
      details.className = "test-link";
      details.href = `/ggg/info/${encodeURIComponent(game.slug)}`;
      details.textContent = "Game details";
      details.addEventListener("click", () => rememberLaunch(game, false));
      const guide = document.createElement("a");
      guide.className = "test-link";
      guide.href = `/ggg/guide/${encodeURIComponent(game.slug)}`;
      guide.textContent = "Walkthrough";
      const favorite = document.createElement("button");
      favorite.type = "button";
      favorite.className = "save-download-button";
      favorite.textContent = "Favorite";
      favorite.setAttribute("aria-label", `Favorite ${game.title}`);
      favorite.setAttribute("aria-pressed", String(favorites.has(game.slug)));
      favorite.addEventListener("click", () => {
        favorites.has(game.slug) ? favorites.delete(game.slug) : favorites.add(game.slug);
        try { localStorage.setItem("arcade:favorites", JSON.stringify([...favorites])); } catch {}
        favorite.setAttribute("aria-pressed", String(favorites.has(game.slug)));
        if (collection.value === "favorites") {
          render();
          collection.focus();
        }
      });
      actions.append(play, test, details, guide, favorite);
      card.append(head, body, actions);
      grid.append(card);
    }
    const hasMore = sorted.length > visibleLimit;
    pagination.hidden = !hasMore;
    paginationStatus.textContent = hasMore ? `Showing ${displayCount} of ${sorted.length} matching games` : "";
    showMore.hidden = !hasMore;
    showAll.hidden = !hasMore;
  }

  function formatPackageSize(bytes) {
    const value = Number(bytes) || 0;
    return value >= 1_000_000 ? `${(value / 1_000_000).toFixed(2)} MB` : `${Math.max(1, Math.round(value / 1_000))} KB`;
  }

  try {
    const catalog = window.GIVEGIGSGAMES_CATALOG;
    if (!catalog || !Array.isArray(catalog.games)) throw new Error("Catalog data is missing.");
    games = catalog.games;
    if (savedView && location.hash === "#all-games") {
      search.value = savedView.search;
      if (savedView.version >= 2 && savedView.sort) sort.value = savedView.sort;
      tagMatch.value = savedView.tagMatch;
      collection.value = savedView.collection;
      input.value = savedView.input || "";
      gameMode.value = savedView.mode || "";
      for (const tag of savedView.tags) selectedTags.add(tag);
      updateSelectedTagCount();
      requestAnimationFrame(() => {
        document.querySelector(`[data-view="${savedView.view === "grid" ? "grid" : "list"}"]`).click();
        document.getElementById(`launch-${savedView.slug}`)?.focus({ preventScroll: true });
        window.scrollTo({ top: savedView.scroll, behavior: "instant" });
      });
    }
    renderTagOptions();
    render();
  } catch {
    count.textContent = "";
    error.hidden = false;
  }
  search.addEventListener("input", render);
  collection.addEventListener("change", render);
  input.addEventListener("change", render);
  gameMode.addEventListener("change", render);
  sort.addEventListener("change", render);
  showMore.addEventListener("click", () => {
    visibleLimit += 10;
    render(false);
  });
  showAll.addEventListener("click", () => {
    visibleLimit = Number.MAX_SAFE_INTEGER;
    render(false);
  });
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
  document.getElementById("download-all-saves").addEventListener("click", downloadAllSaves);
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
