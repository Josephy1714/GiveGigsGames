(() => {
  const game = window.GGGGameRoute?.resolve("info", window.GIVEGIGSGAMES_CATALOG?.games);
  const description = document.getElementById("description");
  if (!game) {
    description.textContent = "Game unavailable. Choose a title from the library.";
    return;
  }
  const hosted = game.runtimeType === "external";
  document.title = `${game.title} · GiveGigsGames`;
  document.getElementById("title").textContent = game.title;
  description.textContent = game.description;
  document.getElementById("requirements").textContent = hosted
    ? `${game.genre} · Internet connection required`
    : `${game.genre} · Browser game`;
  document.getElementById("controls").textContent = game.controls || "Controls are listed in the game when available.";
  const slug = game.slug;
  document.getElementById("play").href = hosted ? game.externalUrl : `/ggg/play/${encodeURIComponent(slug)}`;
  document.getElementById("tester").href = `/ggg/test/${encodeURIComponent(slug)}`;
  document.getElementById("guide").href = `/ggg/guide/${encodeURIComponent(slug)}`;
  document.getElementById("nav-play").href = `/ggg/play/${encodeURIComponent(slug)}`;
  document.getElementById("nav-test").href = `/ggg/test/${encodeURIComponent(slug)}`;
  document.getElementById("nav-info").href = `/ggg/info/${encodeURIComponent(slug)}`;
  document.getElementById("nav-guide").href = `/ggg/guide/${encodeURIComponent(slug)}`;
  document.getElementById("roadmap").href = `/ggg/roadmap/${encodeURIComponent(slug)}`;
  document.getElementById("nav-roadmap").href = `/ggg/roadmap/${encodeURIComponent(slug)}`;
  document.getElementById("actions").hidden = false;
})();
