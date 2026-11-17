(() => {
  const title = document.getElementById("game-title");
  const frame = document.getElementById("game-frame");
  const error = document.getElementById("player-error");
  const slug = new URLSearchParams(location.search).get("game");
  const game = window.GIVEGIGSGAMES_CATALOG?.games?.find((item) => item.slug === slug);

  if (!game) {
    title.textContent = "Game unavailable";
    frame.hidden = true;
    error.hidden = false;
    error.textContent = "That game could not be opened. Return to game select and choose a title from the library.";
    return;
  }

  title.textContent = game.title;
  document.title = `${game.title} · GiveGigsGames`;
  if (game.runtimeType === "external") {
    frame.hidden = true;
    const direct = document.getElementById("direct-link");
    direct.href = game.externalUrl;
    direct.target = "_blank";
    direct.rel = "noreferrer";
    direct.textContent = "Launch hosted game ↗";
    direct.hidden = false;
    document.getElementById("loading-status").textContent = "This game is hosted on another site. Open it in a new tab to play.";
    document.getElementById("player-loading").hidden = false;
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
  const direct = document.getElementById("direct-link");
  const loading = document.getElementById("player-loading");
  const status = document.getElementById("loading-status");
  const retry = document.getElementById("retry-game");
  let timeout;

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
    localStorage.setItem("arcade:recent", JSON.stringify([slug, ...recent.filter((item) => item !== slug)].slice(0, 20)));
  } catch {}
  launch();
})();
