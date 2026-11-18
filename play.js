(() => {
  const byId = (id) => document.getElementById(id);
  const title = byId("game-title");
  const frame = byId("game-frame");
  const error = byId("player-error");
  const game = window.GGGGameRoute?.resolve("play", window.GIVEGIGSGAMES_CATALOG?.games);

  if (!game) {
    title.textContent = "Game unavailable";
    frame.hidden = true;
    error.hidden = false;
    error.textContent = "That game could not be opened. Return to game select and choose a title from the library.";
    return;
  }

  title.textContent = game.title;
  byId("game-icon").textContent = game.emoji || "🎮";
  document.title = `${game.title} · GiveGigsGames`;
  const slug = encodeURIComponent(game.slug);
  const info = byId("game-info");
  const infoButton = byId("open-game-info");
  const direct = byId("direct-link");
  byId("game-info-title").textContent = game.title;
  byId("info-genre").textContent = game.genre;
  byId("info-description").textContent = game.description;
  byId("info-controls").hidden = !game.controls;
  byId("controls-copy").textContent = game.controls || "";
  byId("play-guide").href = `/ggg/guide/${slug}`;
  byId("play-roadmap").href = `/ggg/roadmap/${slug}`;
  direct.hidden = true;
  if (typeof info.showModal === "function") {
    infoButton.hidden = false;
    infoButton.addEventListener("click", () => info.showModal());
  }

  if (game.runtimeType === "external") {
    frame.hidden = true;
    byId("hosted-title").textContent = game.title;
    byId("hosted-genre").textContent = game.genre;
    byId("hosted-description").textContent = game.description;
    byId("hosted-link").href = game.externalUrl;
    byId("hosted-game").hidden = false;
    return;
  }
  if (!game.entrypoint) {
    title.textContent = "Game unavailable";
    frame.hidden = true;
    error.hidden = false;
    error.textContent = "This game has no launch page yet. Return to game select and choose another title.";
    return;
  }
  frame.title = game.title;
  const url = `/games/${game.entrypoint.split("/").map(encodeURIComponent).join("/")}`;
  const loading = byId("player-loading");
  const status = byId("loading-status");
  const retry = byId("retry-game");
  const fullscreen = byId("fullscreen-game");
  const fullscreenStatus = byId("fullscreen-status");
  let timeout;

  if (document.fullscreenEnabled && typeof document.body.requestFullscreen === "function") {
    fullscreen.hidden = false;
    fullscreen.addEventListener("click", async () => {
      fullscreenStatus.hidden = true;
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.body.requestFullscreen();
      } catch {
        fullscreenStatus.textContent = "Fullscreen is unavailable. Try opening the game directly.";
        fullscreenStatus.hidden = false;
      }
    });
    document.addEventListener("fullscreenchange", () => {
      const label = document.fullscreenElement === document.body ? "Exit fullscreen" : "Enter fullscreen";
      fullscreen.setAttribute("aria-label", label);
      fullscreen.title = label;
    });
    fullscreen.title = "Enter fullscreen";
  }

  function launch() {
    loading.hidden = false;
    retry.hidden = true;
    status.textContent = "Loading game…";
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      status.textContent = "The game is taking longer than expected.";
      retry.hidden = false;
    }, 12000);
    frame.src = url;
  }

  direct.href = url;
  direct.hidden = false;
  frame.addEventListener("load", () => {
    clearTimeout(timeout);
    loading.hidden = true;
  });
  retry.addEventListener("click", launch);
  window.addEventListener("message", (event) => {
    if (event.source === frame.contentWindow && event.data?.type === "givegigsgames:back-to-select") {
      location.href = "/ggg/#all-games";
    }
  });
  try {
    const recent = JSON.parse(localStorage.getItem("arcade:recent") || "[]");
    localStorage.setItem("arcade:recent", JSON.stringify([game.slug, ...recent.filter((item) => item !== game.slug)].slice(0, 20)));
  } catch {}
  launch();
})();
