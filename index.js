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
  const selectedTags = new Set();
  let games = [];

  const normalizedTags = (game) => [...new Set((game.tags || []).map((tag) => String(tag).trim()).filter(Boolean))];
  const compare = (a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });

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
