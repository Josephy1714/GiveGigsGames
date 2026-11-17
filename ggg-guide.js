(() => {
  const game = window.GGGGameRoute?.resolve("guide", window.GIVEGIGSGAMES_CATALOG?.games);
  const title = document.getElementById("guide-title");
  if (!game) {
    title.textContent = "Game guide unavailable";
    document.getElementById("guide-description").textContent = "Choose a game from the library to find its walkthrough.";
    return;
  }
  document.title = `${game.title} walkthrough · GiveGigsGames`;
  title.textContent = `${game.title} walkthrough`;
  document.getElementById("guide-description").textContent = game.description;
  const tags = document.getElementById("guide-tags");
  for (const value of [game.genre, ...(game.tags || [])]) {
    const tag = document.createElement("span");
    tag.className = "game-tag";
    tag.textContent = value;
    tags.append(tag);
  }
  const links = {
    "info-link": `/ggg/info/${encodeURIComponent(game.slug)}`,
    "play-link": `/ggg/play/${encodeURIComponent(game.slug)}`,
    "test-link": `/ggg/test/${encodeURIComponent(game.slug)}`,
    "play-action": `/ggg/play/${encodeURIComponent(game.slug)}`,
    "test-action": `/ggg/test/${encodeURIComponent(game.slug)}`,
    "roadmap-link": `/ggg/roadmap/${encodeURIComponent(game.slug)}`
  };
  for (const [id, href] of Object.entries(links)) document.getElementById(id).href = href;

  const authored = game.guideEntrypoint;
  if (authored) {
    const frame = document.createElement("iframe");
    frame.className = "guide-frame";
    frame.title = `${game.title} detailed walkthrough`;
    frame.src = `/games/${authored.split("/").map(encodeURIComponent).join("/")}`;
    document.getElementById("authored-guide").append(frame);
    document.getElementById("authored-guide").hidden = false;
    return;
  }

  const hasControls = Boolean(game.controls);
  document.getElementById("orient").textContent = hasControls
    ? game.controls
    : `Start with the game's opening screen and read each prompt before confirming. This ${game.genre || "game"} build may have its own controls and tutorial. Follow the on-screen instructions first.`;
  document.getElementById("systems").textContent = `Use the opening session to identify the main actions, objectives, and feedback the game provides. The catalog identifies this game with ${[game.genre, ...(game.tags || [])].filter(Boolean).join(", ") || "its listed game type"}. Test one system at a time so you can see what changes.`;
  document.getElementById("strategy").textContent = "After the first attempt, choose one change to your approach and compare the result. Watch for resource limits, timing, progress indicators, and any available pause or restart controls. The game itself is the authority for its specific rules.";
  document.getElementById("practice").textContent = "Treat each run as a short experiment. Note the starting conditions, the choice you changed, and the result. Use the in-game tutorial or help screen whenever it appears, and return here to launch another attempt or open the tester.";
  document.getElementById("troubleshooting").textContent = "If input does not respond, click or tap inside the game, check whether it expects keyboard or touch, and use the tester's viewport presets to inspect layout. Reloading starts the game again. Saved progress depends on the game and stays in this browser.";
  document.getElementById("starter-guide").hidden = false;
})();
