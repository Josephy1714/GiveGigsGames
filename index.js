(() => {
  const grid = document.getElementById("game-grid");
  const count = document.getElementById("catalog-count");
  const error = document.getElementById("catalog-error");

  fetch("./games/catalog.json")
    .then((response) => {
      if (!response.ok) throw new Error("Catalog unavailable");
      return response.json();
    })
    .then((catalog) => {
      const games = Array.isArray(catalog.games) ? catalog.games : [];
      count.textContent = `${games.length} titles · includes previews and experiments`;
      for (const game of games) {
        const card = document.createElement("a");
        card.className = "game-card";
        card.href = `./tester/?game=${encodeURIComponent(game.slug)}`;
        card.setAttribute("aria-label", `Play ${game.title}`);

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
        const play = document.createElement("span");
        play.className = "play-label";
        play.textContent = game.runtimeType === "external" ? "Launch hosted build ↗" : "Play current build →";
        card.append(head, title, genre, description, play);
        grid.append(card);
      }
    })
    .catch(() => {
      count.textContent = "";
      error.hidden = false;
    });
})();
