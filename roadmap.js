(() => {
  const catalog = window.GIVEGIGSGAMES_CATALOG?.games || [];
  const game = window.GGGGameRoute?.resolve("roadmap", catalog);
  const title = document.getElementById("roadmap-title");
  const description = document.getElementById("roadmap-description");
  const profile = document.getElementById("roadmap-profile");
  const items = document.getElementById("roadmap-items");

  if (!game) {
    title.textContent = "Roadmap unavailable";
    document.getElementById("roadmap-error").hidden = false;
    description.textContent = "Choose a game from the library to view its roadmap.";
    return;
  }

  document.title = `${game.title} roadmap · GiveGigsGames`;
  title.textContent = `${game.title} roadmap`;
  description.textContent = game.description || `${game.title} is a ${game.genre || "browser"} game. This page collects practical ideas for its next improvements.`;

  const profileValues = [game.genre, game.runtimeType === "external" ? "Hosted game" : "Local browser build", ...(game.inputs || []), ...(game.modes || []), ...(game.tags || [])];
  for (const value of [...new Set(profileValues.filter(Boolean))]) {
    const tag = document.createElement("span");
    tag.className = "profile-tag";
    tag.textContent = value;
    profile.append(tag);
  }

  const genre = String(game.genre || "").toLowerCase();
  const tags = (game.tags || []).map((tag) => String(tag).toLowerCase());
  const has = (part) => genre.includes(part) || tags.some((tag) => tag.includes(part));
  let core = { title: "Expand the core game loop", text: `Add a meaningful new choice or challenge that builds on ${game.title}’s current play pattern, then introduce it gradually so players can learn it.` };
  if (has("runner") || has("racing")) core = { title: "Add route and pacing variety", text: "Mix in alternate paths, obstacle combinations, and short pace changes so repeated runs reward timing and route-reading instead of only longer survival." };
  else if (has("rpg") || has("rogue")) core = { title: "Add more build and route choices", text: "Give players a few distinct upgrades or route decisions per run, with trade-offs that make different builds and return visits feel worthwhile." };
  else if (has("shooter") || has("action")) core = { title: "Broaden encounter choices", text: "Introduce a small set of enemy behaviors or tools that ask players to vary timing and positioning, with clear tells before high-impact attacks." };
  else if (has("puzzle")) core = { title: "Grow the puzzle vocabulary", text: "Add a short sequence of levels that teaches one new rule at a time, then combines rules in an optional challenge set." };
  else if (has("simulation")) core = { title: "Add more scenario variety", text: "Build a few goal-driven scenarios with different constraints, and show how each player choice changes the system over time." };
  else if (has("creative") || has("music")) core = { title: "Make creative work easier to revisit", text: "Add reusable presets, a clear undo path, and a simple export or share format so players can build on earlier sessions." };
  else if (has("adventure")) core = { title: "Open up exploration", text: "Add a new area or story branch with optional discoveries, and give players clear signposts for what they can explore next." };
  else if (has("strategy")) core = { title: "Add strategic scenario choices", text: "Introduce a few objectives or opponent patterns that reward different approaches, with clear feedback about why a plan worked." };

  const inputIdea = (game.inputs || []).includes("touch")
    ? { title: "Polish one-finger and touch play", text: "Check control reach, touch targets, and gesture cancellation on a real phone; offer a control-size or left-hand option where the game layout allows it." }
    : (game.inputs || []).includes("gamepad")
      ? { title: "Polish controller onboarding", text: "Show the active controller mapping, handle disconnect and reconnect cleanly, and keep keyboard controls available as a fallback." }
      : { title: "Improve first-session onboarding", text: "Add a short interactive introduction that teaches the main action in context and lets returning players skip it." };

  const graveGain3dcRoadmap = [
    { title: "Route squads across every arena", text: "Give companions routes around long walls, across jump-pad chains, and between decks. Test separated squads, contested cover, and crossfire on all three arenas." },
    { title: "Add individual squad orders and upgrade paths", text: "Let players order each companion to defend, flank, or focus a target. Add distinct armor, support, and firepower upgrades with clear scrap costs." },
    { title: "Support co-op squads", text: "Add a networked Player Control mode where each human commands two companions, with synchronized orders, combat, and scrap collection." },
    { title: "Expand combat animation and voice options", text: "Add articulated bot locomotion, stronger melee tells, recorded voice barks, optional captions, and separate voice volume controls." },
    { title: "Tune the combat loop on phones and desktops", text: "Test weapon framing, hit feedback, movement controls, voice playback, and scrap collection on each arena. Tune upgrade costs and mixed enemy encounters from playtest results." }
  ];

  const roadmap = game.slug.toLowerCase() === "gravegain3dc" ? graveGain3dcRoadmap : [
    core,
    { title: "Give progress a satisfying next step", text: "Add a clear short-term goal and a longer-term unlock or personal record, while keeping the next action visible after a run or session." },
    inputIdea,
    { title: "Make replay and recovery smoother", text: "Provide a quick restart or resume path, preserve useful local progress, and explain what is saved before players leave the game." },
    { title: "Round out accessibility and performance", text: "Review contrast, readable text, reduced-motion options, and frame rate on lower-powered phones; keep the build self-contained and below the 10 MB package limit." }
  ];

  document.getElementById("roadmap-count").textContent = `${roadmap.length} suggestions`;

  for (const [index, item] of roadmap.entries()) {
    const card = document.createElement("article");
    card.className = "roadmap-item";
    const number = document.createElement("span");
    number.className = "roadmap-number";
    number.textContent = String(index + 1).padStart(2, "0");
    const copy = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = item.title;
    const detail = document.createElement("p");
    detail.textContent = item.text;
    copy.append(heading, detail);
    const status = document.createElement("span");
    status.className = "roadmap-status";
    status.textContent = "Suggested";
    card.append(number, copy, status);
    items.append(card);
  }

  const links = {
    "roadmap-play": `/ggg/play/${encodeURIComponent(game.slug)}`,
    "roadmap-test": `/ggg/test/${encodeURIComponent(game.slug)}`,
    "roadmap-info": `/ggg/info/${encodeURIComponent(game.slug)}`,
    "roadmap-guide": `/ggg/guide/${encodeURIComponent(game.slug)}`
  };
  for (const [id, href] of Object.entries(links)) document.getElementById(id).href = href;
})();
