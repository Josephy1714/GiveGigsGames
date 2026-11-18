/* ==========================================================================
 * GiveGigsGames Automated Gameplay Tester - Playbooks, Rules & Profiles
 * Consolidated from 4weird (game-playbooks, game_rules, native_game_profiles).
 * UMD module: attaches window.GGGPlaybooks in browser, exports in Node.js.
 * ========================================================================== */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.GGGPlaybooks = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const FALLBACK_RULES =
    "Explore the game: find buttons, dismiss menus, play actively, maximize score/progress, and report visual or console bugs.";

  const BASE_PLAYBOOKS = {
    "platform-wars": {
      slug: "platform-wars",
      controls:
        "Desktop: A/D or arrows move · W/Space jump · F dash · Phone: on-screen pad · Leave exits match",
      goal: "Out-score the rival platform team in quick-match arena rounds.",
      boot: [
        "Pick Quick Match and choose a side (phone agility vs desktop precision).",
        "Click the arena to focus keyboard before the round starts.",
        "Move immediately; rounds start fast."
      ],
      autoplay: [
        "Focus the arena frame, then probe A/D + Space to confirm movement.",
        "Alternate dashes (F) with jumps; never hold one key indefinitely.",
        "Track score events per round and file movement/aim bugs with the round number."
      ],
      tips: [
        "Desktop wins on precision jumps; phone wins on tight turns.",
        "Dash through opponents rather than away from them."
      ],
      preferredKeys: ["a", "d", "w", " ", "f"]
    },
    lastwordszombies: {
      slug: "lastwordszombies",
      controls:
        "Type A-Z to lock & banish zombies · 1 Shockwave / 2 Cryo 5s / 3 Shield +40 · Shift/Space x3 speed · Backspace drop lock · Enter start · Esc pause",
      goal: "Banish shambling zombies by typing their cursed words before they breach the barricade.",
      boot: [
        "Click the game frame once so keystrokes go to the game, then press Enter on START GAME.",
        "Type the FIRST letter of the nearest zombie to lock on.",
        "Finish the locked word to banish it; Backspace drops a bad lock."
      ],
      autoplay: [
        "Send type_text one letter/word per tick; avoid blind held-key repeats.",
        "Prioritize the closest-to-breach zombie each second.",
        "Fire 1/2/3 powers when overwhelmed (1 wipes normals, 2 freezes 5s, 3 restores +40 shield)."
      ],
      tips: [
        "Short words first when the horde floods.",
        "Save Shockwave (1) for every 5th-wave boss."
      ],
      preferredKeys: ["Enter", "a", "e", "s", "t", "1", "2", "3"]
    },
    venturemechanically: {
      slug: "venturemechanically",
      controls: "Click / tap tabs, sliders, and fields · Exit slider runs the waterfall",
      goal: "Configure rounds, debt, and preferences, then drag the exit slider to analyze founder vs investor payouts.",
      boot: [
        "Start in Sandbox mode or choose one of the 6 startup simulators.",
        "Adjust one funding round or term at a time and observe the waterfall.",
        "Drag the exit slider end-to-end to check payout math."
      ],
      autoplay: [
        "Drive UI with clicks on simulator tabs, buttons, and sliders.",
        "Change one variable per observation and verify numbers update immediately.",
        "Record each configuration and verify no NaN or stale ledger rows."
      ],
      tips: [
        "Liquidation preferences eat common holders first.",
        "Debt is paid before equity sees a cent."
      ],
      preferredKeys: ["Tab", "Enter", "ArrowRight"]
    },
    financialfreedom: {
      slug: "financialfreedom",
      controls: "Click tabs, sliders, and Next Month · Every choice is a button or slider",
      goal: "Grow net worth to Financial Independence without tanking family happiness.",
      boot: [
        "Pick a starting family scenario.",
        "Adjust budget/investment sliders.",
        "Click Next Month and read the event card."
      ],
      autoplay: [
        "Advance one month per iteration and monitor net worth + happiness.",
        "Test tabs and event choices sequentially.",
        "Flag layout overflow or unresponsive Next Month triggers."
      ],
      tips: [
        "High-interest debt payoff beats speculative bets early.",
        "Watch family happiness alongside net worth."
      ],
      preferredKeys: ["Tab", "Enter"]
    },
    serversavershield: {
      slug: "serversavershield",
      controls:
        "Mouse/touch moves shield · Click/Space toggles beams · WASD/arrows reposition · P/Esc pause · Shop buys Emergency Repair",
      goal: "Defend data centers from malware bots, DDoS waves, and viruses; spend earnings in the Shop.",
      boot: [
        "Advance through Briefing -> Difficulty -> Graphics -> Controls setup.",
        "Click to focus and sweep the shield across incoming threats.",
        "Click or press Space to toggle beams; hire techs or buy repairs between waves."
      ],
      autoplay: [
        "Move/click toward the densest threat cluster each tick.",
        "Monitor wave counter (capped at 10) and server health bar.",
        "Verify Pause/Resume and win/lose screens at wave completion."
      ],
      tips: [
        "Keep the shield moving; parked shields get flanked.",
        "Buy Emergency Repair (+50 HP) before DDoS spikes."
      ],
      preferredKeys: [" ", "w", "a", "s", "d", "p"]
    },
    overtake: {
      slug: "overtake",
      controls:
        "Arrows / WASD steer, accelerate, brake · Space / Shift / N nitro · R restart route · P / Esc pause",
      goal: "Finish fast to earn coins, unlock better cars, and open new routes.",
      boot: [
        "Pick a route and car, then launch the race.",
        "Hold accelerate (ArrowUp/W) and steer with short lane corrections.",
        "Use nitro (N/Space) on clear straights."
      ],
      autoplay: [
        "Consume window.gameState.snapshot() for bitwise lane hazard/pickup reflex steering.",
        "Steer toward open lanes or powerups; fire nitro only when target lane is clear.",
        "Verify speed, nitro, and countdown/complete transitions."
      ],
      tips: [
        "Short steering taps beat long holds at high speed.",
        "Nitro on clear straights gains seconds."
      ],
      preferredKeys: ["ArrowUp", "ArrowLeft", "ArrowRight", "n", "r"]
    },
    assassinanimals: {
      slug: "assassinanimals",
      controls:
        "WASD sneak · Left-click/Space strike · Right-click/Q toss coin · E takedown/interact · G drag body · Shift/F ability · 1-5 gadgets · P/Esc pause",
      goal: "Infiltrate procedural floors, collect DNA splices, and eliminate targets unseen.",
      boot: [
        "Pick one of the 9 animal operatives and start floor 1.",
        "Move with WASD bursts; toss a coin (Q) or use E for silent takedown."
      ],
      autoplay: [
        "Move in short WASD bursts; prefer E silent takedown near guards.",
        "Use gadgets (1-5) and drag bodies (G) out of patrol lanes.",
        "Verify 3x3 operative grid fits cleanly and overlays remain bounded."
      ],
      tips: [
        "Coins distract guards before takedowns.",
        "Signature abilities reset fights."
      ],
      preferredKeys: ["w", "a", "s", "d", "e", "q", " "]
    },
    battlesharks2: {
      slug: "battlesharks2",
      controls:
        "WASD / arrows / mouse swim · Left-click / Ctrl fire · Space jet dash · E / Tab R&D Lab · Esc / P pause",
      goal: "Devour fish to heal and gather biomass, harvest cyber-debris, mutate, and defeat the ROBO-KRAKEN.",
      boot: [
        "Click LAUNCH SHARK on the start screen.",
        "Eat small fish first to heal and gather biomass.",
        "Open R&D Lab (E) between fights to install upgrades."
      ],
      autoplay: [
        "Swim toward nearby fish/debris and fire left-click when hunters appear.",
        "Use Space dash to evade mines and depth charges.",
        "Test R&D Lab pagination and upgrade purchases."
      ],
      tips: [
        "Eating small fish heals.",
        "Laser Cannon (20 debris) and Jet Engine (30 debris) accelerate early survival."
      ],
      preferredKeys: ["w", "a", "s", "d", " ", "e"]
    },
    gravegain1dA: {
      slug: "gravegain1dA",
      controls: "A/D or Left/Right march/retreat · Space attack/wait · F ability · Q potion · Esc/P pause",
      goal: "Walk the 1D ley-line east, defeat foes in turn-based or real-time mode, and survive.",
      boot: [
        "Step through Race -> Class -> Pace -> Guide setup screens.",
        "Deploy onto the 1D ley-line and march east (D/ArrowRight) or attack."
      ],
      autoplay: [
        "Click through staged setup cards and click Deploy.",
        "Advance east, attack foes, and trigger Wait/Step buttons to confirm HUD updates."
      ],
      tips: ["Watch stamina and enemy telegraphs before advancing."],
      preferredKeys: ["d", "a", " ", "f", "q"]
    },
    gravegain2dA: {
      slug: "gravegain2dA",
      controls:
        "WASD / arrows move · Left-click melee · Right-click timed block · F race ability · Shift sprint · 1/2/3 temporal mode · Esc/P pause",
      goal: "Clear procedural dungeon floors, gather gold, and survive.",
      boot: [
        "Pick Endless or Campaign, step through Race -> Class -> Temporal mode, and Deploy.",
        "Move with WASD and click or use action buttons to strike."
      ],
      autoplay: [
        "Advance through setup cards to Deploy, then move and melee toward enemies/loot.",
        "Exercise Wait / Attack / Block / Inventory / Pause controls."
      ],
      tips: ["Chrono-Lock is easier to learn than Realtime."],
      preferredKeys: ["w", "a", "s", "d", "f", " "]
    },
    gravegain2dB: {
      slug: "gravegain2dB",
      controls:
        "A/D run · W/Space jump · S drop/slide · J/Left-click blaster · K/Right-click breach pulse · E interact · Esc/P pause",
      goal: "Breach sealed MoonRock tunnels, rescue builds, and reach extraction.",
      boot: [
        "Step through Race -> Class -> Breach rules and click Deploy.",
        "Run right (D), jump debris (Space), fire blaster (J), and breach doors (K)."
      ],
      autoplay: [
        "Complete staged build setup, then advance right while jumping and firing blaster/breach pulse.",
        "Check wave/ammo counters and extraction door behavior."
      ],
      tips: ["Breach pulse first, blaster second on shielded doors."],
      preferredKeys: ["d", "a", " ", "j", "k", "e"]
    },
    gravegain2dC: {
      slug: "gravegain2dC",
      controls:
        "WASD/arrows move · Left-click / J attack · Right-click / K block/skill · Space dash · F ability · 1/2/3 tempo · Esc/P pause",
      goal: "Clear the 2.5D campaign or endless floors, loot caches, and upgrade at LuckyStarShip.",
      boot: [
        "Select Mission/Endless, build, and Deploy.",
        "Move with WASD, strike enemies, and open treasure caches."
      ],
      autoplay: [
        "Navigate setup UI, deploy, move toward enemies/objectives, and attack.",
        "Verify HUD stats, tempo switching, and pause/resume."
      ],
      tips: ["Watch weapon arsenal upgrades and persistent career goals."],
      preferredKeys: ["w", "a", "s", "d", " ", "f"]
    },
    gravegain2dD: {
      slug: "gravegain2dD",
      controls:
        "D / Right sprint · A / Left brake · W / Up jump or vault · S / Down slide or drop · P pause · Touch joystick",
      goal: "Guide Lira through the endless moonlit graveyard parkour course and maximize distance/gems.",
      boot: [
        "Click BEGIN RUN (#start) on the overlay.",
        "Hold D to sprint right, press W to jump/vault hazards and reach upper balconies, press S to slide under low arches."
      ],
      autoplay: [
        "Click #start if overlay is visible; choose draft upgrades when #draft-panel opens.",
        "Alternate sprint (D) with timed jumps (W) and slides (S) while reading #score, #gems, and #hearts."
      ],
      tips: [
        "Push up again when Lira grabs a wall to vault.",
        "Duck/slide (S) under turret fire and low arches."
      ],
      preferredKeys: ["d", "w", "s", "a", "p"]
    },
    gravegain3dA: {
      slug: "gravegain3dA",
      controls:
        "WASD move · Mouse/arrows look · Left-click melee · Right-click block/cast · F/Shift ability · Space jump · Q potion · E interact · Esc/P pause",
      goal: "Descend 3D dungeon floors, defeat monsters, loot gold, and survive.",
      boot: [
        "Click Endless Dungeon Run (#btnPlay), select race/class/mode, and click Deploy (#btnCharSelectStart).",
        "Click canvas to aim/attack, drink potion (Q) below 45% HP."
      ],
      autoplay: [
        "Project enemies via GraveGainBotInput.projectEnemy() when available.",
        "Sweep dungeon corridors deterministically, drink Q potion when HP < 45%, and pick perk cards on level-up."
      ],
      tips: ["Q potion at half health, not empty.", "Bank loot at LuckyStarShip between floors."],
      preferredKeys: ["w", "a", "s", "d", " ", "q", "f"]
    },
    gravegain4dA: {
      slug: "gravegain4dA",
      controls:
        "Aim & putt with mouse/touch · W-axis ana/kata shift · Rewind chrono-sand · Controls/Pause modal",
      goal: "Putt lost souls across 4D ana/kata hyperdungeons into the goal while managing strokes and branes.",
      boot: [
        "Step through Race -> Class setup pages and click Deploy.",
        "Aim and release a shot across the hyperdungeon board."
      ],
      autoplay: [
        "Complete race/class wizard, aim/drag on the 4D canvas, and test ana/kata toggles + Controls dialog."
      ],
      tips: ["Use chrono-sand rewind on botched putts."],
      preferredKeys: [" ", "a", "d", "w", "s"]
    },
    gravegain5dA: {
      slug: "gravegain5dA",
      controls:
        "WASD / arrows move · Click/Space strike · Universe/dimension shift · Wait/Action controls · Esc/P pause",
      goal: "Transcend six parallel Arroyos across five dimensions before the collapse timer expires.",
      boot: [
        "Step through Universe -> Class -> Guide setup and click Deploy.",
        "Engage foes and watch HP, level, potion, and collapse timer."
      ],
      autoplay: [
        "Traverse staged universe/class cards, deploy, attack nearby enemies, and test retry/Change Build on defeat."
      ],
      tips: ["Transcend early before collapse timers expire."],
      preferredKeys: ["w", "a", "s", "d", " "]
    },
    demolichdom: {
      slug: "demolichdom",
      controls: "WASD / arrows move necromancer · Click skull spell · S summon skeleton (-25 mana) · P / Esc pause",
      goal: "Demolish every building with your skeleton army before the city outlasts you.",
      boot: [
        "Dismiss intro/manual overlays and deploy.",
        "Click buildings to cast skull spells and press S to summon skeletons."
      ],
      autoplay: [
        "Alternate clicking standing buildings with pressing S when mana >= 25.",
        "Kite city guards while skeletons tank."
      ],
      tips: ["Skeletons tank, you cast; summon early."],
      preferredKeys: ["w", "a", "s", "d", " "]
    },
    fridgesimulator: {
      slug: "fridgesimulator",
      controls: "Click buy / manage fridges · Next Day button or Space/N · P or Esc pause",
      goal: "Keep every country's family fed by balancing nutrition, stock, and budget day after day.",
      boot: [
        "Buy staple foods for the fridge.",
        "Click Next Day (or press N/Space) and monitor nutrition and budget."
      ],
      autoplay: [
        "Purchase balanced staples and advance Next Day per iteration.",
        "Check meal generation, calorie/nutrition deltas, and starvation warnings."
      ],
      tips: ["Staples first, variety second."],
      preferredKeys: ["n", " ", "p"]
    },
    discoveramerica: {
      slug: "discoveramerica",
      controls: "Click a fragment then its category bin · Tap the glowing port to sail",
      goal: "Gather data fragments at each port, sort them into the right categories, and chart the voyage.",
      boot: [
        "Start voyage on the map and tap the glowing port.",
        "Click a fragment, then click its matching category bin."
      ],
      autoplay: [
        "Click fragment buttons and category hold bins as paired actions.",
        "Verify Reset, Confirm, and Map controls remain visible and responsive."
      ],
      tips: ["Glowing ports advance the voyage."],
      preferredKeys: ["Enter", "Tab"]
    },
    orbitaldrift: {
      slug: "orbitaldrift",
      controls: "Hold Space / click / touch for thrust · Release to drift back · 1/2/3 ships · M mute · P/Esc pause",
      goal: "Control your satellite orbit, dodge debris, and collect yellow stardust for combo multipliers.",
      boot: [
        "Start run and pulse Space/click to expand orbit.",
        "Release to let gravity pull the satellite inward."
      ],
      autoplay: [
        "Pulse thrust in short holds (250-400ms) rather than holding permanently.",
        "Verify multiplier progression and ship switching (1/2/3)."
      ],
      tips: ["Small pulses beat long burns."],
      preferredKeys: [" ", "1", "2", "3", "p"]
    },
    aiwhackamole: {
      slug: "aiwhackamole",
      controls: "Click / tap rogue AIs · Spare helpful ones · Combos to x5 · P or Esc pause",
      goal: "Whack dangerous rogue AIs while sparing helpful ones to build combos and survive.",
      boot: [
        "Click Start and watch active mole holes.",
        "Click only confirmed rogue targets."
      ],
      autoplay: [
        "Inspect DOM/canvas mole coordinates and click confirmed rogue targets.",
        "Track combo multiplier and health changes."
      ],
      tips: ["Read the AI bubble before whacking."],
      preferredKeys: [" ", "p"]
    },
    soundpainter: {
      slug: "soundpainter",
      controls: "Click tiles to paint sound+color · Space plays all · R resets · P or Esc pause",
      goal: "Paint musical color tiles and play back melodies.",
      boot: ["Click tiles on the grid, then press Space to play."],
      autoplay: [
        "Click varied grid coordinates to paint notes and press Space to trigger audio playback.",
        "Verify AudioContext unlocks cleanly without uncaught errors."
      ],
      tips: ["Columns are notes, rows are timbres."],
      preferredKeys: [" ", "r", "p"]
    },
    soundpainter2: {
      slug: "soundpainter2",
      controls: "Click cells to toggle steps · Space play/stop · C clear track · R reset all",
      goal: "Sequence melody, bass, chords, and drums in the step sequencer and shape synth parameters.",
      boot: ["Toggle sequencer grid cells and press Space to play/stop."],
      autoplay: [
        "Click cells across tracks, adjust tempo/cutoff sliders, and toggle playback with Space."
      ],
      tips: ["Four-on-the-floor drums glue every experiment."],
      preferredKeys: [" ", "c", "r"]
    },
    friendslop: {
      slug: "friendslop",
      controls: "Arrows / WASD move · Space / click throw slop · P or Esc pause",
      goal: "Catch falling slop, feed your friends for combos, and dodge cringe hazards.",
      boot: ["Click Single Player Start (#friendslop-4weird-start-btn) to launch."],
      autoplay: [
        "Track lowest falling slop via window.game.slop and align within 15px, then throw with Space."
      ],
      tips: ["Aligned throws build combos; center stage catches most drops."],
      preferredKeys: ["ArrowLeft", "ArrowRight", " ", "a", "d"]
    },
    "semester-survival": {
      slug: "semester-survival",
      controls: "A/D or Left/Right switch lanes · W/Up jump · S/Down slide · P/Esc pause",
      goal: "Survive 8 chaotic semesters of deadlines, crashes, and empty wallets to graduate.",
      boot: ["Choose destination on the 2x2 menu grid and launch run."],
      autoplay: [
        "Jump low obstacles (W/Up), slide high obstacles (S/Down), and switch lanes (A/D) for coffee.",
        "Monitor GPA/energy HUD and pause overlay."
      ],
      tips: ["Coffee is survival; center lane gives the most options."],
      preferredKeys: ["a", "d", "w", "s", "p"]
    },
    "starship-simulator": {
      slug: "starship-simulator",
      controls:
        "WASD / Arrows pitch & yaw · Shift/Space thrust · F fire missiles · Tab/Buttons academy tutorials · C cockpit camera",
      goal: "Pilot the Three.js starship, complete flight academy tutorials, land on planets, and explore via rover.",
      boot: [
        "Click Launch on the starship intro card to dismiss .launch-screen.",
        "Throttle up and test flight academy tutorials, autopilot, and missile salvos."
      ],
      autoplay: [
        "Dismiss launch screen, verify Three.js WebGL #starfield canvas renders non-blank frames.",
        "Test steering (WASD), thrust (Space), and tutorial buttons."
      ],
      tips: ["Enable autopilot or flight academy lessons for guided maneuvers."],
      preferredKeys: ["w", "a", "s", "d", " ", "f", "c"]
    },
    "ecosystemic-evolver": {
      slug: "ecosystemic-evolver",
      controls: "WASD / Mouse interact across 5 biomes · Click tutorials and economy panels",
      goal: "Play as animals or human roles in five living biomes with 10 interactive tutorials.",
      boot: ["Launch the external game or open via Screen Capture / same-origin host."],
      autoplay: ["Use screen capture or external link launcher when hosted cross-origin."],
      tips: ["Start with the interactive tutorials to understand food webs."],
      preferredKeys: ["w", "a", "s", "d", " "]
    },
    neonbreaker: {
      slug: "neonbreaker",
      controls: "Left/Right or A/D move paddle · Space launch ball · P/Esc pause",
      goal: "Smash every glowing brick, catch power-ups, and clear all neon levels.",
      boot: ["Press Space to start/launch ball, then glide paddle with ArrowLeft/ArrowRight."],
      autoplay: ["Press Space to launch, alternate A/D / ArrowLeft/ArrowRight to sweep paddle across canvas."],
      tips: ["Edge hits angle the ball; catch power-ups first."],
      preferredKeys: [" ", "ArrowLeft", "ArrowRight", "a", "d"]
    },
    neoninvaders: {
      slug: "neoninvaders",
      controls: "Left/Right or A/D move ship · Space shoot · P/Esc pause",
      goal: "Hold the line: shoot down glowing alien waves and dodge return fire.",
      boot: ["Press Space to start/fire, strafe with ArrowLeft/ArrowRight."],
      autoplay: ["Strafe across width while tapping Space to fire upward."],
      tips: ["Shoot the lowest invader first."],
      preferredKeys: ["ArrowLeft", "ArrowRight", " ", "a", "d"]
    },
    neonracer: {
      slug: "neonracer",
      controls: "Left/Right or A/D switch lanes · Space start/restart · P/Esc pause",
      goal: "Weave through neon traffic and survive at increasing speeds.",
      boot: ["Press Space to start and make single lane shifts with A/D."],
      autoplay: ["Make deliberate single lane changes and restart with Space on crash."],
      tips: ["Center lane offers the best reaction options."],
      preferredKeys: [" ", "ArrowLeft", "ArrowRight", "a", "d"]
    },
    neonsnake: {
      slug: "neonsnake",
      controls: "Arrows / WASD steer · Space start/restart · P/Esc pause",
      goal: "Eat glowing orbs, grow longer, and avoid walls and your own tail.",
      boot: ["Press Space to start, steer in clockwise/counter-clockwise loops with Arrow keys."],
      autoplay: ["Avoid 180-degree instant reversals; sweep wide loops in the center."],
      tips: ["Plan two turns ahead past length 10."],
      preferredKeys: [" ", "ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"]
    },
    neonvoidrunner: {
      slug: "neonvoidrunner",
      controls: "Arrows / WASD dodge · Space start/restart · P/Esc pause",
      goal: "Dodge obstacles in the digital void as speed ramps up.",
      boot: ["Press Space to start and dodge with short Arrow/WASD taps."],
      autoplay: ["Dodge with short taps; avoid over-steering at high speed."],
      tips: ["Small corrections survive longer."],
      preferredKeys: [" ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]
    },
    "temple-of-lost-revenue": {
      slug: "temple-of-lost-revenue",
      controls: "WASD / arrows guide cat · Shift decipher map · P/Esc pause",
      goal: "Recover lost deals, CRM data, and leads from the maze and decipher the exit.",
      boot: ["Move down the first corridor with WASD and hold Shift near doors to decipher."],
      autoplay: ["Sweep corridors room-by-room and pulse Shift at doors."],
      tips: ["Decipher at doors to reveal hidden paths."],
      preferredKeys: ["w", "a", "s", "d", "Shift"]
    },
    "the-ai-expedition": {
      slug: "the-ai-expedition",
      controls: "Click node A then node B to draw a pipeline · Tap nodes on touch",
      goal: "Route datasets between agents, data lakes, and automations until traffic clears.",
      boot: ["Click a starting node, then click a neighbor node to connect a pipeline."],
      autoplay: ["Click node pairs across the canvas to establish end-to-end data routes."],
      tips: ["Short links fund longer hauls."],
      preferredKeys: [" "]
    },
    "the-cave-of-bottlenecks": {
      slug: "the-cave-of-bottlenecks",
      controls: "A/D or Left/Right steer light · Hold beam on red bottlenecks · P/Esc pause",
      goal: "Dissolve hiring delays and CRM stalactites with the Green Cat's light.",
      boot: ["Start game and sweep beam left-to-right across red targets."],
      autoplay: ["Sweep A/D smoothly and hold on targets until dissolved."],
      tips: ["Target red stalactites; green targets are friendly."],
      preferredKeys: ["a", "d", "ArrowLeft", "ArrowRight"]
    },
    "the-lost-city-of-customers": {
      slug: "the-lost-city-of-customers",
      controls: "Move scan crosshair · Click / tap to scan · Find 5 hidden databases",
      goal: "Trace 5 buried client databases with your valley scanner.",
      boot: ["Click across the valley grid to calibrate and locate green ripple zones."],
      autoplay: ["Scan deterministically across a 4x3 grid on the canvas."],
      tips: ["Re-scan green ripple zones at tighter spacing."],
      preferredKeys: [" "]
    },
    "the-madi-ai-universe": {
      slug: "the-madi-ai-universe",
      controls: "Hover regions to inspect · Click a glowing sector to play · Tap on touch",
      goal: "Explore the MADI AI hub worlds and launch into playable sectors.",
      boot: ["Hover sectors and click a glowing zone to inspect or launch."],
      autoplay: ["Move cursor across hub sectors and click highlighted portals."],
      tips: ["Glowing sectors launch into full mini-games."],
      preferredKeys: [" "]
    },
    "the-pipeline-mountain": {
      slug: "the-pipeline-mountain",
      controls: "A/D or Left/Right steer · Space jump platforms · P/Esc pause",
      goal: "Climb from manual spreadsheets to the revenue summit without falling.",
      boot: ["Steer onto platforms and jump from platform centers with Space."],
      autoplay: ["Alternate short A/D steers with Space jumps."],
      tips: ["Center jumps land reliably; edge jumps risk falls."],
      preferredKeys: ["a", "d", " ", "ArrowLeft", "ArrowRight"]
    },
    "the-revenue-dragon": {
      slug: "the-revenue-dragon",
      controls: "A/D or Left/Right move · Space fire action beams · P/Esc pause",
      goal: "Defeat the Dragon of Delay while dodging orange data-silo fireballs.",
      boot: ["Strafe under the dragon with A/D while tapping Space to fire."],
      autoplay: ["Strafe across bottom lane and fire Space beams continuously."],
      tips: ["Keep moving; parked cats eat fireballs."],
      preferredKeys: ["a", "d", " ", "ArrowLeft", "ArrowRight"]
    },
    "the-revenue-jungle": {
      slug: "the-revenue-jungle",
      controls: "Space / Up jump vines, quicksand, and fog · P/Esc pause",
      goal: "Leap over jungle hazards and gather revenue coins as far as possible.",
      boot: ["Press Space/ArrowUp to start and time jumps over vines and quicksand."],
      autoplay: ["Time Space/ArrowUp jumps across incoming hazards."],
      tips: ["Late jumps clear vines cleanly."],
      preferredKeys: [" ", "ArrowUp"]
    },
    "the-speed-portal": {
      slug: "the-speed-portal",
      controls: "A/D or Left/Right rotate inside tunnel · P/Esc pause",
      goal: "Race through the portal, dodge obstacles, and thread speed rings.",
      boot: ["Rotate with gentle A/D taps toward open gaps and speed rings."],
      autoplay: ["Use brief A/D / ArrowLeft/ArrowRight rotations to align with tunnel gaps."],
      tips: ["Gentle rotations keep control at high speed."],
      preferredKeys: ["a", "d", "ArrowLeft", "ArrowRight"]
    },
    "treasure-hunters": {
      slug: "treasure-hunters",
      controls: "Space / click drops the claw · P/Esc pause",
      goal: "Time the swinging claw to grapple pipeline value, meetings, revenue, and customers.",
      boot: ["Watch the claw swing across center and press Space/click to drop."],
      autoplay: ["Drop claw at ~1.5s intervals when aligned over targets."],
      tips: ["Patience grabs gold; spam grabs sand."],
      preferredKeys: [" ", "p"]
    }
  };

  // Aliases so older/variant slugs resolve seamlessly
  const SLUG_ALIASES = {
    gravegain2d: "gravegain2dA",
    gravegain3d: "gravegain3dA",
    gravegain1d: "gravegain1dA",
    gravegain4d: "gravegain4dA",
    gravegain5d: "gravegain5dA",
    spaceships: "starship-simulator"
  };

  function getGamePlaybook(slug, catalogGame) {
    const rawSlug = String(slug || "").trim();
    const lower = rawSlug.toLowerCase();
    const resolvedKey =
      BASE_PLAYBOOKS[rawSlug]
        ? rawSlug
        : BASE_PLAYBOOKS[lower]
          ? lower
          : Object.keys(BASE_PLAYBOOKS).find((k) => k.toLowerCase() === lower) ||
            SLUG_ALIASES[lower] ||
            null;

    const base = resolvedKey ? BASE_PLAYBOOKS[resolvedKey] : null;
    if (!base && !catalogGame) {
      return {
        slug: rawSlug || "custom-game",
        controls: "Inspect on-page controls; probe mouse clicks, WASD/Arrows, Space, Enter, Escape.",
        goal: FALLBACK_RULES,
        boot: ["Focus the game canvas/window, click any visible Start/Play button, then probe core controls."],
        autoplay: ["Observe visible state, test one reversible interaction per tick, and report crashes or soft-locks."],
        tips: ["Use Playbook + AI Vision for unfamiliar games."],
        preferredKeys: [" ", "Enter", "w", "a", "s", "d", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"]
      };
    }

    return {
      slug: (base && base.slug) || rawSlug,
      controls: (base && base.controls) || (catalogGame && catalogGame.controls) || "WASD / Arrows / Mouse / Touch",
      goal: (base && base.goal) || (catalogGame && catalogGame.description) || FALLBACK_RULES,
      boot: (base && base.boot) || ["Click visible Start/Play controls and focus the canvas."],
      autoplay: (base && base.autoplay) || ["Probe interactive elements and core movement/action keys."],
      tips: (base && base.tips) || [],
      preferredKeys: (base && base.preferredKeys) || [" ", "Enter", "w", "a", "s", "d"],
      genre: (catalogGame && catalogGame.genre) || "",
      title: (catalogGame && catalogGame.title) || rawSlug,
      inputs: (catalogGame && catalogGame.inputs) || [],
      modes: (catalogGame && catalogGame.modes) || []
    };
  }

  function flattenControls(controls) {
    if (!controls) return "";
    if (typeof controls === "string") return controls;
    if (Array.isArray(controls)) return controls.filter(Boolean).join("; ");
    if (typeof controls === "object") {
      const parts = [];
      for (const [group, value] of Object.entries(controls)) {
        if (value === true) {
          parts.push(group);
          continue;
        }
        if (!value) continue;
        if (typeof value === "object") {
          for (const [k, v] of Object.entries(value)) parts.push(`${k}: ${v}`);
        } else {
          parts.push(`${group}: ${value}`);
        }
      }
      return parts.join("; ");
    }
    return String(controls);
  }

  function pushUnique(lines, seen, label, value) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    lines.push(label ? `${label}: ${text}` : text);
  }

  const PAGE_RULES_SCRIPT = `(() => {
    try {
      const out = { meta: '', link: '', sections: [] };
      const clean = (s, n) => String(s || '').replace(/\\s+/g, ' ').trim().slice(0, n || 800);
      const metaTag = document.querySelector('meta[name="game-rules"]');
      if (metaTag && metaTag.content) out.meta = clean(metaTag.content, 600);
      const linkEl = document.querySelector('#game-rules-link, a[data-game-rules]');
      if (linkEl) out.link = clean((linkEl.textContent || '') + ' -> ' + (linkEl.href || ''), 300);
      const picked = new Set();
      const grab = (el) => {
        if (!el || picked.has(el)) return;
        picked.add(el);
        const t = clean(el.innerText || el.textContent);
        if (t && t.length > 12) out.sections.push(t);
      };
      document.querySelectorAll('[id*="how-to-play" i], [id*="howto" i], [class*="how-to-play" i], [data-game-rules]').forEach(grab);
      const heads = document.querySelectorAll('h1, h2, h3, h4');
      for (const h of heads) {
        if (/how to play|game rules|^rules$|instructions|controls/i.test(h.textContent || '')) {
          let sib = h.nextElementSibling;
          let hops = 0;
          while (sib && hops < 3) { grab(sib); sib = sib.nextElementSibling; hops++; }
        }
        if (out.sections.length >= 4) break;
      }
      return out;
    } catch (e) {
      return { meta: '', link: '', sections: [], error: String((e && e.message) || e) };
    }
  })()`;

  function scrapeDocumentRules(doc) {
    if (!doc) return { meta: "", link: "", sections: [] };
    try {
      const out = { meta: "", link: "", sections: [] };
      const clean = (s, n) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n || 800);
      const metaTag = doc.querySelector('meta[name="game-rules"]');
      if (metaTag && metaTag.content) out.meta = clean(metaTag.content, 600);
      const linkEl = doc.querySelector("#game-rules-link, a[data-game-rules]");
      if (linkEl) out.link = clean((linkEl.textContent || "") + " -> " + (linkEl.href || ""), 300);
      const picked = new Set();
      const grab = (el) => {
        if (!el || picked.has(el)) return;
        picked.add(el);
        const t = clean(el.innerText || el.textContent);
        if (t && t.length > 12) out.sections.push(t);
      };
      doc
        .querySelectorAll('[id*="how-to-play" i], [id*="howto" i], [class*="how-to-play" i], [data-game-rules]')
        .forEach(grab);
      const heads = doc.querySelectorAll("h1, h2, h3, h4");
      for (const h of heads) {
        if (/how to play|game rules|^rules$|instructions|controls/i.test(h.textContent || "")) {
          let sib = h.nextElementSibling;
          let hops = 0;
          while (sib && hops < 3) {
            grab(sib);
            sib = sib.nextElementSibling;
            hops++;
          }
        }
        if (out.sections.length >= 4) break;
      }
      return out;
    } catch (e) {
      return { meta: "", link: "", sections: [], error: String((e && e.message) || e) };
    }
  }

  function formatPageRules(scrape, seen) {
    const lines = [];
    const sources = [];
    if (!scrape || typeof scrape !== "object") return { text: "", sources };
    const known = seen || new Set();
    const before = known.size;
    if (scrape.meta) {
      pushUnique(lines, known, "Page rules", scrape.meta);
      if (known.size > before) sources.push('on-page <meta name="game-rules">');
    }
    if (scrape.link) {
      pushUnique(lines, known, "Rules link", scrape.link);
      if (lines.length) sources.push("on-page rules link");
    }
    (scrape.sections || []).forEach((section, i) => {
      const n = lines.length;
      pushUnique(lines, known, i === 0 ? "How to play (on-page)" : "", section);
      if (lines.length > n && !sources.includes("on-page How to Play")) sources.push("on-page How to Play");
    });
    return { text: lines.join("\n"), sources };
  }

  function mergeRules(base, extra) {
    const seen = new Set(
      String(base || "")
        .split("\n")
        .map((l) => l.replace(/\s+/g, " ").trim().toLowerCase())
        .filter(Boolean)
    );
    const fresh = String(extra || "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !seen.has(l.replace(/\s+/g, " ").trim().toLowerCase()));
    return [String(base || "").trim(), ...fresh].filter(Boolean).join("\n") || FALLBACK_RULES;
  }

  function resolveGameRules({ slug, catalogGame, pageScrape, customRules } = {}) {
    const lines = [];
    const seen = new Set();
    const sources = [];
    const pb = getGamePlaybook(slug, catalogGame);
    if (pb) {
      pushUnique(lines, seen, "Game", pb.title || slug);
      if (pb.genre) pushUnique(lines, seen, "Genre", pb.genre);
      pushUnique(lines, seen, "Goal", pb.goal);
      pushUnique(lines, seen, "Controls", flattenControls(pb.controls));
      if (pb.boot && pb.boot.length) pushUnique(lines, seen, "Boot", pb.boot.join(" -> "));
      if (pb.autoplay && pb.autoplay.length) pushUnique(lines, seen, "Autoplay strategy", pb.autoplay.join(" "));
      sources.push("playbook");
    }
    if (pageScrape) {
      const formatted = formatPageRules(pageScrape, seen);
      if (formatted.text) {
        lines.push(formatted.text);
        sources.push(...formatted.sources);
      }
    }
    let text = lines.join("\n");
    if (customRules) text = mergeRules(text, customRules);
    if (!text) text = FALLBACK_RULES;
    return { text, sources, playbook: pb };
  }

  // Universal Native Game Profiles (from 4weird/v2/desktop/code/src/runtime/native_game_profiles.js)
  const NATIVE_PROFILES = [
    {
      id: "godot",
      name: "Godot Game",
      genre: "engine-runtime",
      processNames: ["godot", "godot.exe", "godot_v4"],
      windowTitlePatterns: [/godot/i],
      description: "A Godot 4 project running locally or in a native desktop window.",
      goal: "Play the selected Godot project: dismiss the start screen, observe after every small input, and capture reproducible bugs.",
      controls: {
        forward: "w or up",
        back: "s or down",
        left: "a or left",
        right: "d or right",
        jump: "space",
        crouch: "n/a",
        sprint: "n/a",
        use: "enter",
        reload: "r",
        fireHint: "project-specific",
        altFireHint: "project-specific",
        extra: { escape: "pause/back", arrows: "2D movement/menu selection" }
      },
      startup: [
        "Press Enter once to dismiss a focused Godot start screen.",
        "Use brief key taps first; Godot projects have intentionally different input maps."
      ],
      visionHints: "Observe UI prompts before deciding controls; use arrow keys or WASD and Space only when the scene supports them."
    },
    {
      id: "peggle-deluxe",
      name: "Peggle Deluxe",
      genre: "pachinko-puzzle",
      processNames: ["peggle", "peggle_deluxe", "peggle.exe"],
      windowTitlePatterns: [/peggle\s*deluxe/i, /peggle/i],
      description: "PopCap pachinko puzzle game: aim a ball launcher and clear orange pegs with a limited ball supply.",
      goal: "Start a new level, aim deliberate shots that hit clusters and orange pegs, and complete levels.",
      controls: {
        forward: "mouse aim",
        back: "n/a",
        left: "mouse aim",
        right: "mouse aim",
        jump: "n/a",
        crouch: "n/a",
        sprint: "n/a",
        use: "left click",
        reload: "n/a",
        fireHint: "left click: launch the ball",
        altFireHint: "n/a",
        extra: { enter: "confirm menus", escape: "pause", mouse: "aim launcher" }
      },
      startup: [
        "Click the game window to focus, then press Enter or click Play/Adventure to begin.",
        "Wait for the ball to settle between shots."
      ],
      visionHints: "Orange pegs are the objective, blue pegs score points, green pegs grant power-ups. Aim at dense peg clusters; do not use WASD."
    },
    {
      id: "hl2-ep2",
      name: "Half-Life 2: Episode Two",
      genre: "fps",
      processNames: ["hl2", "hl2.exe"],
      windowTitlePatterns: [/half[- ]?life\s*2.*episode\s*two/i, /half[- ]?life\s*2/i, /episode\s*two/i, /^hl2/i],
      description: "Valve Source-engine story FPS.",
      goal: "Advance through the level, fight enemies with crowbar/guns/gravity gun, pick up ammo/health, and follow objectives.",
      controls: {
        forward: "w",
        back: "s",
        left: "a",
        right: "d",
        jump: "space",
        crouch: "c",
        sprint: "shift",
        use: "e",
        reload: "r",
        fireHint: "left mouse click",
        altFireHint: "right mouse click",
        extra: { "1-6": "weapon slot", escape: "pause menu", enter: "confirm menu" }
      },
      startup: [
        "If menu is visible, press Enter then click New Game.",
        "If paused, press Escape to resume."
      ],
      visionHints: "Source HUD: health/suit bottom-left, ammo bottom-right, crosshair center. Prefer center-screen threats first."
    },
    {
      id: "xonotic",
      name: "Xonotic",
      genre: "arena-fps",
      processNames: ["xonotic-linux64-sdl", "xonotic-linux64-glx", "xonotic.exe", "xonotic"],
      windowTitlePatterns: [/xonotic/i],
      description: "Fast GPL arena shooter.",
      goal: "Start or join a bot arena, move continuously, acquire weapons, and engage visible bots.",
      controls: {
        forward: "w",
        back: "s",
        left: "a",
        right: "d",
        jump: "space",
        crouch: "c",
        sprint: "shift",
        use: "e",
        reload: "r",
        fireHint: "left mouse click",
        altFireHint: "right mouse click",
        extra: { "1-9": "weapon selection", tab: "scoreboard", enter: "confirm", escape: "menu" }
      },
      startup: [
        "If Welcome dialog with Name field appears, double-click Name box, type GiveGigsTester, press Enter, click Save settings.",
        "Use short W/A/D/Space bursts and controlled mouse-look."
      ],
      visionHints: "Health/armor bottom-left, ammo bottom-right, crosshair center. Look for bot silhouettes, weapon pickups, and damage flashes."
    },
    {
      id: "hl2-generic",
      name: "Half-Life 2 / Source FPS (generic)",
      genre: "fps",
      processNames: ["hl2", "hl2.exe", "portal", "portal2", "left4dead", "left4dead2", "tf_win32", "csgo", "css"],
      windowTitlePatterns: [/half[- ]?life/i, /portal/i, /source/i, /left\s*4\s*dead/i, /team\s*fortress/i, /counter[- ]?strike/i],
      description: "Fallback for any Source-engine shooter.",
      goal: "Advance, clear enemies, manage ammo/health, solve puzzles.",
      controls: {
        forward: "w",
        back: "s",
        left: "a",
        right: "d",
        jump: "space",
        crouch: "c",
        sprint: "shift",
        use: "e",
        reload: "r",
        fireHint: "left mouse click",
        altFireHint: "right mouse click",
        extra: { escape: "pause", enter: "confirm" }
      },
      startup: ["Press Enter on menus, Escape resumes pause, click to respawn."],
      visionHints: "Standard FPS HUD. Move toward exits, markers, and lit paths."
    },
    {
      id: "generic-fps",
      name: "Generic FPS (any shooter)",
      genre: "fps",
      processNames: [],
      windowTitlePatterns: [/fps/i, /shooter/i, /doom/i, /quake/i, /unreal/i, /call of duty/i, /battlefield/i, /overwatch/i, /valorant/i],
      description: "Catch-all for 3D shooters without a dedicated profile.",
      goal: "Move forward through the level, aim at center-screen enemies, fire, reload when empty, interact with E.",
      controls: {
        forward: "w",
        back: "s",
        left: "a",
        right: "d",
        jump: "space",
        crouch: "c",
        sprint: "shift",
        use: "e",
        reload: "r",
        fireHint: "left mouse click",
        altFireHint: "right mouse click",
        extra: { escape: "pause", enter: "confirm", tab: "scoreboard" }
      },
      startup: ["Click to focus, Enter past menus, WASD to move."],
      visionHints: "Aim center-screen first; muzzle flash and hitmarkers confirm hits."
    },
    {
      id: "generic-game",
      name: "Generic Game (any title)",
      genre: "generic",
      processNames: [],
      windowTitlePatterns: [],
      description: "Universal profile for arbitrary games: platformers, RPGs, web games, puzzle games, desktop programs.",
      goal: "Explore: confirm menus with Enter/click, probe WASD/arrows/space, interact with E/Space, never stall on one screen.",
      controls: {
        forward: "w",
        back: "s",
        left: "a",
        right: "d",
        jump: "space",
        crouch: "c",
        sprint: "shift",
        use: "e",
        reload: "r",
        fireHint: "left mouse click",
        altFireHint: "right mouse click",
        extra: { escape: "back/pause", enter: "confirm", tab: "menu" }
      },
      startup: ["Click center to focus, Enter past menus."],
      visionHints: "Buttons, highlighted menu rows, HUD bars, and interactive targets are the priorities."
    }
  ];

  function getProfile(id) {
    return NATIVE_PROFILES.find((p) => p.id === id) || NATIVE_PROFILES[NATIVE_PROFILES.length - 1];
  }

  function resolveGameProfile(windowTitleOrExe) {
    const query = String(windowTitleOrExe || "");
    if (!query) return getProfile("generic-game");
    const byId = NATIVE_PROFILES.find((p) => p.id.toLowerCase() === query.toLowerCase());
    if (byId) return byId;
    const lower = query.toLowerCase();
    const exeHit = NATIVE_PROFILES.find((p) =>
      (p.processNames || []).some((n) => {
        const needle = String(n).toLowerCase();
        return lower === needle || lower === `${needle}.exe` || lower.includes(needle);
      })
    );
    if (exeHit && exeHit.id === "hl2-generic" && /ep(isode)?\s*(2|two)/i.test(query)) return getProfile("hl2-ep2");
    if (exeHit && /half[- ]?life\s*2/i.test(query)) {
      return /episode\s*(one|1)|lost\s*coast|deathmatch/i.test(query) ? exeHit : getProfile("hl2-ep2");
    }
    if (exeHit) return exeHit;
    for (const profile of NATIVE_PROFILES) {
      if ((profile.windowTitlePatterns || []).some((re) => re.test(query))) return profile;
    }
    if (/half[- ]?life|portal|source|doom|quake|unreal|fps|shooter|combine|antlion|alyx/i.test(query)) {
      return getProfile("generic-fps");
    }
    return getProfile("generic-game");
  }

  function listProfiles() {
    return NATIVE_PROFILES.map((p) => ({ id: p.id, name: p.name, genre: p.genre }));
  }

  function registerGameProfile(profile) {
    if (!profile || !profile.id || !profile.name) {
      throw new Error("registerGameProfile requires at least { id, name }.");
    }
    const idx = NATIVE_PROFILES.findIndex((p) => p.id === profile.id);
    const full = {
      genre: "generic",
      processNames: [],
      windowTitlePatterns: [],
      description: "",
      goal: "Explore and advance.",
      controls: {
        forward: "w",
        back: "s",
        left: "a",
        right: "d",
        jump: "space",
        sprint: "shift",
        use: "e",
        reload: "r",
        fireHint: "left mouse click",
        altFireHint: "right mouse click",
        extra: {}
      },
      startup: [],
      visionHints: "",
      ...profile
    };
    if (idx >= 0) NATIVE_PROFILES[idx] = full;
    else NATIVE_PROFILES.unshift(full);
    return full;
  }

  return {
    FALLBACK_RULES,
    PLAYBOOKS: BASE_PLAYBOOKS,
    SLUG_ALIASES,
    getGamePlaybook,
    flattenControls,
    PAGE_RULES_SCRIPT,
    scrapeDocumentRules,
    formatPageRules,
    mergeRules,
    resolveGameRules,
    NATIVE_PROFILES,
    getProfile,
    resolveGameProfile,
    listProfiles,
    registerGameProfile
  };
});
