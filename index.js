(() => {
  const grid = document.getElementById("game-grid");
  const count = document.getElementById("catalog-count");
  const error = document.getElementById("catalog-error");

  try {
      const catalog = window.GIVEGIGSGAMES_CATALOG;
      if (!catalog || !Array.isArray(catalog.games)) throw new Error("Catalog data is missing.");
      const games = catalog.games;
      count.textContent = `${games.length} titles · includes previews and experiments`;
      for (const game of games) {
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

        const title = document.createElement("h3");
        title.textContent = game.title;
        const genre = document.createElement("span");
        genre.className = "genre";
        genre.textContent = game.genre;
        const description = document.createElement("p");
        description.textContent = game.description;
        const play = document.createElement("a");
        play.className = "play-label";
        play.href = game.runtimeType === "external" ? game.externalUrl : `./games/${game.entrypoint}`;
        play.textContent = game.runtimeType === "external" ? "Launch hosted build ↗ (online)" : "Open game →";
        if (game.runtimeType === "external") {
          play.target = "_blank";
          play.rel = "noreferrer";
        }
        const test = document.createElement("a");
        test.className = "test-link";
        test.href = `./tester/?game=${encodeURIComponent(game.slug)}`;
        test.textContent = "Open in tester";
        card.append(head, title, genre, description, play, test);
        grid.append(card);
      }
  } catch {
    count.textContent = "";
    error.hidden = false;
  }
})();
