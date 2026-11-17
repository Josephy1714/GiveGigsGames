(() => {
  const byId = (id) => document.getElementById(id);
  const library = byId("library-view");
  const player = byId("player-view");
  const grid = byId("game-grid");
  const search = byId("game-search");
  const genre = byId("genre-filter");
  const count = byId("game-count");
  const frame = byId("game-frame");
  const frameWrap = byId("frame-wrap");
  const externalPanel = byId("external-runtime");
  let games = [];
  let selected = null;

  const safePath = (game) => {
    if (game.runtimeType === "external") return game.externalUrl;
    if (!/^[a-z0-9-]+(?:\/[a-zA-Z0-9._-]+)*$/.test(game.entrypoint || "")) return "";
    return `../games/${game.entrypoint.split("/").map(encodeURIComponent).join("/")}`;
  };

  function render() {
    const query = search.value.trim().toLowerCase();
    const selectedGenre = genre.value;
    const filtered = games.filter((game) => {
      const haystack = `${game.title} ${game.genre} ${game.description} ${(game.tags || []).join(" ")}`.toLowerCase();
      return (!query || haystack.includes(query)) && (!selectedGenre || game.genre === selectedGenre);
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
      const play = document.createElement("span");
      play.className = "play-link";
      play.textContent = "Launch game →";
      card.append(top, title, category, description, play);
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
    frame.title = `${game.title} game`;
    const external = game.runtimeType === "external";
    frameWrap.hidden = external;
    externalPanel.hidden = !external;
    byId("open-external").href = external ? source : "#";
    frame.src = external ? "about:blank" : source;
    library.hidden = true;
    player.hidden = false;
    history.replaceState(null, "", `?game=${encodeURIComponent(game.slug)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeGame() {
    frame.src = "about:blank";
    player.hidden = true;
    library.hidden = false;
    selected = null;
    history.replaceState(null, "", location.pathname);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  search.addEventListener("input", render);
  genre.addEventListener("change", render);
  byId("back-button").addEventListener("click", closeGame);
  byId("reload-game").addEventListener("click", () => {
    if (selected) frame.src = safePath(selected);
  });
  byId("fullscreen-game").addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await byId("frame-wrap").requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      byId("frame-wrap").classList.toggle("fullscreen-fallback");
    }
  });

  fetch("../games/catalog.json")
    .then((response) => {
      if (!response.ok) throw new Error("The game catalog could not be loaded.");
      return response.json();
    })
    .then((catalog) => {
      games = Array.isArray(catalog.games) ? catalog.games.filter((game) => game.slug && game.title && safePath(game)) : [];
      for (const item of [...new Set(games.map((game) => game.genre).filter(Boolean))].sort()) {
        const option = document.createElement("option");
        option.value = item;
        option.textContent = item;
        genre.append(option);
      }
      render();
      const slug = new URLSearchParams(location.search).get("game");
      const requested = games.find((game) => game.slug.toLowerCase() === (slug || "").toLowerCase());
      if (requested) openGame(requested);
    })
    .catch((error) => {
      byId("load-error").hidden = false;
      byId("load-error").textContent = `${error.message} Start a local server at the GiveGigsGames repository root, then open /tester/.`;
    });
})();
