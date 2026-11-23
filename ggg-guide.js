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
    "play-action": game.runtimeType === "external" ? game.externalUrl : `/ggg/play/${encodeURIComponent(game.slug)}`,
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

  if (game.slug.toLowerCase() === "ecosystemic-evolver") {
    document.getElementById("orient").textContent =
      "Ecosystemic Evolver is an externally hosted 3D WebGL simulation (https://mattyjacks.com/games/ecosystemic-evolver). Launch it from the Play button (requires an active internet connection). Move across the terrain with WASD and interact with creatures, biome prompts, tutorials, and economy panels using your mouse or touch screen.";
    document.getElementById("systems").textContent =
      "Choose between playing as wild animals or human roles across five living biomes. Each biome models interacting food webs—producers, prey, predators—alongside human resource and economic decisions. Ten built-in interactive tutorials walk step-by-step through movement, foraging/hunting, population balance, and economic loops.";
    document.getElementById("strategy").textContent =
      "Work through the 10 interactive tutorials first so you see how each species or human role depends on the biome's food web. Avoid collapsing prey populations early; watch energy/resource bars and balance short-term harvest against long-term ecosystem stability across biomes.";
    document.getElementById("practice").textContent =
      "Try a biome first as an animal role to learn predator-prey spacing and resource hotspots, then revisit the same biome in a human role to see how economic choices reshape the food web.";
    document.getElementById("troubleshooting").textContent =
      "Because Ecosystemic Evolver runs on mattyjacks.com rather than inside the local static arcade package, it requires an active internet connection and WebGL enabled in your browser. If embedded previews are restricted in the Tester Studio, open it directly via Play or use Screen/Window Capture mode.";
    document.getElementById("starter-guide").hidden = false;
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
