/* ==========================================================================
 * GiveGigsGames Automated Gameplay Tester - Deterministic, Reflex, Playbook,
 * BotScript & Native Game Controllers
 * Consolidated from 4weird (overtake_reflex, friend_slop_autoplay,
 * gravegain3d_autoplay, native_game_director, native_game_player) and
 * GiveGigs (robot-script.ts).
 * UMD module: attaches window.GGGControllers in browser, exports in Node.js.
 * ========================================================================== */
(function (root, factory) {
  const api = factory(
    typeof module === "object" && module.exports
      ? require("./playbooks.js")
      : root && root.GGGPlaybooks
  );
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.GGGControllers = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (Playbooks) {
  "use strict";

  // -------------------------------------------------------------------------
  // 1. Overtake Bitwise Reflex Controller
  // -------------------------------------------------------------------------

  const LANE_LEFT = 1;
  const LANE_CENTER = 2;
  const LANE_RIGHT = 4;
  const ALL_LANES = LANE_LEFT | LANE_CENTER | LANE_RIGHT;

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function laneMask(x) {
    return x < -0.34 ? LANE_LEFT : x > 0.34 ? LANE_RIGHT : LANE_CENTER;
  }

  function laneCenter(mask) {
    if (mask === LANE_LEFT) return -0.67;
    if (mask === LANE_RIGHT) return 0.67;
    return 0;
  }

  function laneKey(mask) {
    return mask === LANE_LEFT ? "arrowleft" : mask === LANE_RIGHT ? "arrowright" : "arrowup";
  }

  function analyzeOvertake(snapshot = {}) {
    const playerX = Number(snapshot.playerX) || 0;
    let hazards = 0;
    let pickups = 0;
    for (const item of snapshot.traffic || []) {
      const delta = Number(item.distanceAhead);
      if (!Number.isFinite(delta) || delta < -20 || delta > 280) continue;
      const bit = laneMask(Number(item.x) || 0);
      if (item.kind === "powerup") pickups |= bit;
      else hazards |= bit;
    }
    return {
      playerLane: laneMask(playerX),
      hazards: hazards & ALL_LANES,
      pickups: pickups & ALL_LANES
    };
  }

  function chooseOpenLane(playerLane, hazards, pickups) {
    const safe = ~hazards & ALL_LANES;
    const reward = safe & pickups;
    if (reward & LANE_CENTER) return LANE_CENTER;
    if (reward & LANE_LEFT) return LANE_LEFT;
    if (reward & LANE_RIGHT) return LANE_RIGHT;
    if (safe & playerLane) return playerLane;
    if (safe & LANE_CENTER) return LANE_CENTER;
    if (safe & LANE_LEFT) return LANE_LEFT;
    if (safe & LANE_RIGHT) return LANE_RIGHT;
    return playerLane;
  }

  function decideOvertake(snapshot = {}) {
    const mode = String(snapshot.mode || "").toLowerCase();
    if (mode === "menu" || mode === "paused" || mode === "complete") {
      return {
        status: mode || "menu",
        urgency: "low",
        source: "reflex",
        reasoning: "Overtake reflex: menu/recovery state; start or restart the route.",
        reasoning_path: ["S", "Yes", "R_RESTART"],
        action: { type: "press_key", target: mode === "paused" ? "p" : "r", duration_ms: 45 },
        next_delay_ms: 150
      };
    }
    if (mode === "countdown") {
      return {
        status: "playing",
        urgency: "high",
        source: "reflex",
        reasoning: "Overtake reflex: countdown; hold acceleration.",
        reasoning_path: ["S", "No", "R_PLAY"],
        action: { type: "hold_keys", target: "arrowup", duration_ms: 180, params: { keys: ["arrowup"] } },
        next_delay_ms: 90
      };
    }
    if (mode !== "race") return null;

    const state = analyzeOvertake(snapshot);
    const targetLane = chooseOpenLane(state.playerLane, state.hazards, state.pickups);
    const targetX = laneCenter(targetLane);
    const x = Number(snapshot.playerX) || 0;
    const steer = targetX - x;
    const keys = ["arrowup"];
    if (steer < -0.12) keys.push("arrowleft");
    if (steer > 0.12) keys.push("arrowright");
    const nitro = Number(snapshot.nitro) || 0;
    if ((state.hazards & targetLane) === 0 && nitro >= 0.28) keys.push("n");
    const duration = clamp(state.hazards ? 105 : 165, 80, 180);
    return {
      status: "playing",
      urgency: "high",
      source: "reflex",
      reasoning: `Overtake reflex: lanes hazards=${state.hazards.toString(2).padStart(3, "0")}, target=${laneKey(targetLane)}.`,
      reasoning_path: ["S", "No", "No", "R_PLAY", "OVERTAKE_REFLEX"],
      action: { type: "hold_keys", target: keys.join(","), duration_ms: duration, params: { keys } },
      next_delay_ms: 80
    };
  }

  // -------------------------------------------------------------------------
  // 2. FriendSlop Autoplay Controller
  // -------------------------------------------------------------------------

  async function runFriendSlopAutoplay(executeJS) {
    if (typeof executeJS !== "function") return null;
    try {
      const gameState = await executeJS(`(() => {
        if (typeof game === 'undefined') return null;
        return {
          state: game.state,
          playerX: game.players && game.players.length > 0 ? (game.players[0].x + game.players[0].width / 2) : 400,
          slops: game.slop ? game.slop.map(s => ({ x: s.x + s.width / 2, y: s.y + s.height / 2, speed: s.speed })) : [],
          hazards: game.hazards ? game.hazards.map(h => ({ x: h.x + h.width / 2, y: h.y + h.height / 2 })) : [],
          friends: game.friends ? game.friends.map(f => ({ x: f.x + f.width / 2, y: f.y + f.height / 2 })) : []
        };
      })()`);

      if (!gameState) return null;
      let type = "wait";
      let target = "";
      let reasoning = "FriendSlop autoplay: waiting...";

      if (gameState.state === "start") {
        type = "click";
        target = "#friendslop-4weird-start-btn";
        reasoning = "FriendSlop autoplay: Clicking Single Player start button.";
      } else if (gameState.state === "game_over") {
        type = "click";
        target = "#friendslop-4weird-play-again-btn";
        reasoning = "FriendSlop autoplay: Clicking Play Again button.";
      } else if (gameState.state === "paused") {
        type = "click";
        target = "#friendslop-4weird-resume-btn";
        reasoning = "FriendSlop autoplay: Clicking Resume button.";
      } else if (gameState.state === "playing") {
        const validSlops = (gameState.slops || []).filter((s) => s.y < 500);
        if (validSlops.length > 0) {
          validSlops.sort((a, b) => b.y - a.y);
          const targetSlop = validSlops[0];
          const dx = targetSlop.x - gameState.playerX;
          if (Math.abs(dx) > 15) {
            type = "press_key";
            target = dx < 0 ? "ArrowLeft" : "ArrowRight";
            reasoning = `FriendSlop autoplay: Moving toward falling slop at X=${Math.round(targetSlop.x)}.`;
          } else {
            type = "press_key";
            target = " ";
            reasoning = "FriendSlop autoplay: Aligned with slop — throwing to feed friends.";
          }
        } else {
          const dx = 400 - gameState.playerX;
          if (Math.abs(dx) > 20) {
            type = "press_key";
            target = dx < 0 ? "ArrowLeft" : "ArrowRight";
            reasoning = "FriendSlop autoplay: Returning toward center stage.";
          } else {
            type = "press_key";
            target = " ";
            reasoning = "FriendSlop autoplay: Probing throw.";
          }
        }
      }

      return {
        status: gameState.state || "playing",
        source: "reflex",
        reasoning,
        action: { type, target, duration_ms: 100 },
        next_delay_ms: 160
      };
    } catch (_) {
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // 3. GraveGain Series Autoplay Controller (3DA / 2DA / 2DD / 1DA-5DA)
  // -------------------------------------------------------------------------

  async function runGraveGainAutoplay(executeJS, slug = "") {
    if (typeof executeJS !== "function") return null;
    try {
      const state = await executeJS(`(() => {
        try {
          const actionableCenter = (selector) => {
            const el = document.querySelector(selector);
            if (!el || el.disabled || el.hidden || el.classList.contains('hidden')) return null;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return null;
            const r = el.getBoundingClientRect();
            if (r.width < 2 || r.height < 2) return null;
            return {
              x: Math.max(0, Math.min(1000, Math.round(((r.left + r.width / 2) / Math.max(1, window.innerWidth)) * 1000))),
              y: Math.max(0, Math.min(1000, Math.round(((r.top + r.height / 2) / Math.max(1, window.innerHeight)) * 1000))),
              text: (el.innerText || el.textContent || '').trim().slice(0, 40)
            };
          };

          // GraveGain2dD detection (Moonlit Run)
          const start2dD = actionableCenter('#overlay #start');
          const draftChoice = actionableCenter('#draft-panel:not([hidden]) #draft-choices button');
          const resume2dD = actionableCenter('#pause-panel:not([hidden]) #resume-btn');
          const score2dD = document.getElementById('score')?.textContent;
          if (start2dD || draftChoice || resume2dD || score2dD !== undefined) {
            return {
              variant: 'gravegain2dD',
              start2dD,
              draftChoice,
              resume2dD,
              hearts: document.getElementById('hearts')?.textContent || '',
              score: score2dD || '0'
            };
          }

          // GraveGain 3D / 2D shared engine detection
          const gg = window.GraveGainGame;
          const mainMenu = document.getElementById('mainMenuScreen');
          const charSelect = document.getElementById('charSelectScreen');
          const levelUp = document.getElementById('levelUpScreen');
          const gameOver = document.getElementById('gameOverScreen');
          const gameMain = document.getElementById('gameMain');
          const isMainMenuVisible = mainMenu && !mainMenu.classList.contains('hidden');
          const isCharSelectVisible = charSelect && !charSelect.classList.contains('hidden');
          const isLevelUpVisible = levelUp && !levelUp.classList.contains('hidden');
          const isGameOverVisible = gameOver && !gameOver.classList.contains('hidden');
          const isInDungeon = gameMain && !gameMain.classList.contains('hidden') && gg && gg.player && !gg.player.isDead;

          let player = null;
          let nearestEnemy = null;
          let enemyScreen = null;

          if (gg && gg.player) {
            player = {
              x: gg.player.x,
              y: gg.player.y,
              hp: gg.player.hp,
              maxHp: gg.player.maxHp,
              potions: gg.player.potions || 0,
              gold: gg.gold || 0,
              floorIndex: gg.floorIndex ?? null,
              controlMode: gg.controlMode || 'realtime'
            };
            if (Array.isArray(gg.enemies) && gg.enemies.length > 0) {
              const alive = gg.enemies
                .filter((e) => e.hp > 0)
                .map((e) => ({
                  name: e.name || 'Enemy',
                  x: e.x,
                  y: e.y,
                  dist: Math.hypot((e.x || 0) - (gg.player.x || 0), (e.y || 0) - (gg.player.y || 0))
                }))
                .sort((a, b) => a.dist - b.dist);
              if (alive.length > 0) nearestEnemy = alive[0];
            }
            if (nearestEnemy && window.GraveGainBotInput && window.GraveGainBotInput.projectEnemy) {
              try { enemyScreen = window.GraveGainBotInput.projectEnemy(); } catch (_) {}
            }
          }

          // Generic staged setup buttons across GraveGain 1DA/2DA/2DB/2DC/4DA/5DA
          const setupNext = actionableCenter('#btnPlay, #btnCharSelectStart, #btnDeploy, #deployBtn, .btn-deploy, .btn-next, [data-ui-next], button.primary');

          window.__ggSweepIdx = ((window.__ggSweepIdx || 0) + 1) % 8;

          return {
            variant: 'gravegain',
            isMainMenuVisible,
            isCharSelectVisible,
            isLevelUpVisible,
            isGameOverVisible,
            isInDungeon,
            player,
            nearestEnemy,
            enemyScreen,
            sweepIdx: window.__ggSweepIdx,
            menuAction: actionableCenter('#btnPlay'),
            deployAction: actionableCenter('#btnCharSelectStart'),
            realtimeAction: actionableCenter('#btnModeRealtime, .btn-mode[data-mode="realtime"], .char-mode-card[data-mode="realtime"]'),
            setupNext
          };
        } catch (e) {
          return { error: e.message };
        }
      })()`);

      if (!state || state.error) return null;

      if (state.variant === "gravegain2dD") {
        if (state.start2dD) {
          return {
            status: "menu",
            source: "reflex",
            reasoning: "GraveGain2dD autoplay: Clicking BEGIN RUN.",
            action: { type: "click", target: `${state.start2dD.x},${state.start2dD.y}`, params: state.start2dD },
            next_delay_ms: 400
          };
        }
        if (state.draftChoice) {
          return {
            status: "menu",
            source: "reflex",
            reasoning: "GraveGain2dD autoplay: Selecting run upgrade card.",
            action: { type: "click", target: `${state.draftChoice.x},${state.draftChoice.y}`, params: state.draftChoice },
            next_delay_ms: 350
          };
        }
        if (state.resume2dD) {
          return {
            status: "paused",
            source: "reflex",
            reasoning: "GraveGain2dD autoplay: Resuming paused run.",
            action: { type: "click", target: `${state.resume2dD.x},${state.resume2dD.y}`, params: state.resume2dD },
            next_delay_ms: 300
          };
        }
        const cycle = Math.floor(Date.now() / 500) % 4;
        if (cycle === 1) {
          return {
            status: "playing",
            source: "reflex",
            reasoning: `GraveGain2dD autoplay: Sprint + Jump/Vault (score ${state.score}m, hearts ${state.hearts}).`,
            action: {
              type: "combo",
              target: "sprint+jump",
              duration_ms: 450,
              params: {
                steps: [
                  { op: "hold_keys", keys: ["d"], duration_ms: 400 },
                  { op: "press", key: "w" }
                ]
              }
            },
            next_delay_ms: 260
          };
        }
        if (cycle === 3) {
          return {
            status: "playing",
            source: "reflex",
            reasoning: `GraveGain2dD autoplay: Sprint + Slide under hazards (score ${state.score}m).`,
            action: {
              type: "combo",
              target: "sprint+slide",
              duration_ms: 420,
              params: {
                steps: [
                  { op: "hold_keys", keys: ["d"], duration_ms: 380 },
                  { op: "press", key: "s" }
                ]
              }
            },
            next_delay_ms: 260
          };
        }
        return {
          status: "playing",
          source: "reflex",
          reasoning: `GraveGain2dD autoplay: Sprinting east (score ${state.score}m).`,
          action: { type: "hold_key", target: "d", duration_ms: 380 },
          next_delay_ms: 220
        };
      }

      if (state.isLevelUpVisible) {
        return {
          status: "level_up",
          source: "reflex",
          reasoning: "GraveGain autoplay: Selecting perk card on level up.",
          action: { type: "click", target: "#perkCardsGrid .perk-card button, #perkCardsGrid .perk-card, .perk-card" },
          next_delay_ms: 400
        };
      }
      if (state.isGameOverVisible) {
        return {
          status: "game_over",
          source: "reflex",
          reasoning: "GraveGain autoplay: Returning to menu after defeat.",
          action: { type: "click", target: "#btnGoToMenu" },
          next_delay_ms: 500
        };
      }
      if (state.isMainMenuVisible && state.menuAction) {
        return {
          status: "menu",
          source: "reflex",
          reasoning: "GraveGain autoplay: Clicking Endless Dungeon Run from Main Menu.",
          action: { type: "click", target: `${state.menuAction.x},${state.menuAction.y}`, params: state.menuAction },
          next_delay_ms: 450
        };
      }
      if (state.isCharSelectVisible && state.deployAction) {
        return {
          status: "menu",
          source: "reflex",
          reasoning: "GraveGain autoplay: Deploying build to dungeon.",
          action: { type: "click", target: `${state.deployAction.x},${state.deployAction.y}`, params: state.deployAction },
          next_delay_ms: 500
        };
      }
      if (state.isInDungeon && state.player) {
        const p = state.player;
        if (p.controlMode && p.controlMode !== "realtime" && state.realtimeAction) {
          return {
            status: "mode_sync",
            source: "reflex",
            reasoning: "GraveGain autoplay: Switching to Realtime mode.",
            action: { type: "click", target: `${state.realtimeAction.x},${state.realtimeAction.y}`, params: state.realtimeAction },
            next_delay_ms: 350
          };
        }
        if (p.hp < p.maxHp * 0.45 && p.potions > 0) {
          return {
            status: "playing",
            source: "reflex",
            reasoning: `GraveGain autoplay: Low HP (${Math.round(p.hp)}/${p.maxHp}), drinking potion (Q).`,
            action: { type: "press_key", target: "q", duration_ms: 100 },
            next_delay_ms: 300
          };
        }
        const enemy = state.nearestEnemy;
        if (enemy) {
          const scr = state.enemyScreen;
          const is3d = /3d/i.test(slug);
          if (enemy.dist <= 75 && scr && scr.onScreen) {
            return {
              status: "playing",
              source: "reflex",
              reasoning: `GraveGain autoplay: Attacking ${enemy.name} (${Math.round(enemy.dist)}px).`,
              action: {
                type: "click",
                target: `${scr.x},${scr.y}`,
                params: { x: scr.x, y: scr.y, gameAction: is3d ? "gravegain3d_attack" : "gravegain2d_attack" }
              },
              next_delay_ms: 260
            };
          }
          const dx = (enemy.x || 0) - (p.x || 0);
          const dy = (enemy.y || 0) - (p.y || 0);
          const moveKey = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? "a" : "d") : dy < 0 ? "w" : "s";
          return {
            status: "playing",
            source: "reflex",
            reasoning: `GraveGain autoplay: Closing on ${enemy.name} (${Math.round(enemy.dist)}px) with ${moveKey.toUpperCase()}.`,
            action: { type: "hold_key", target: moveKey, duration_ms: 220 },
            next_delay_ms: 240
          };
        }
        const sweepKeys = ["w", "w", "a", "w", "w", "d", "w", "s"];
        const chosenKey = sweepKeys[state.sweepIdx || 0] || "w";
        return {
          status: "playing",
          source: "reflex",
          reasoning: `GraveGain autoplay: Sweeping dungeon corridor [${(state.sweepIdx || 0) + 1}/8] (${chosenKey.toUpperCase()}).`,
          action: { type: "hold_key", target: chosenKey, duration_ms: 280 },
          next_delay_ms: 280
        };
      }
      if (state.setupNext) {
        return {
          status: "menu",
          source: "reflex",
          reasoning: `GraveGain autoplay: Advancing setup via "${state.setupNext.text || "button"}".`,
          action: { type: "click", target: `${state.setupNext.x},${state.setupNext.y}`, params: state.setupNext },
          next_delay_ms: 450
        };
      }
    } catch (_) {
      return null;
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // 4. General Catalog Playbook & Heuristic Controller
  // -------------------------------------------------------------------------

  function runPlaybookAutoplay({ slug, catalogGame, domSnapshot = [], stepIndex = 0, lastTarget = null } = {}) {
    const playbook = Playbooks ? Playbooks.getGamePlaybook(slug, catalogGame) : null;
    const preferredKeys = (playbook && playbook.preferredKeys) || [" ", "Enter", "w", "a", "s", "d"];

    // 1. Check for high-priority start/play/launch/deploy/continue/next buttons in DOM
    const startBtn = (domSnapshot || []).find((el) => {
      const txt = `${el.innerText || ""} ${el.id || ""} ${el.className || ""}`.toLowerCase();
      return (
        ["BUTTON", "A", "DIV", "SPAN"].includes(el.tagName) &&
        /\b(start|play|begin|launch|deploy|continue|next|resume|retry|try again|go)\b/.test(txt) &&
        !/back to|github|contribute|roadmap|guide|info/i.test(txt)
      );
    });

    if (startBtn && stepIndex < 4) {
      const target = Number.isFinite(startBtn.nx) && Number.isFinite(startBtn.ny)
        ? `${startBtn.nx},${startBtn.ny}`
        : startBtn.id
          ? `#${startBtn.id}`
          : "500,500";
      if (target !== lastTarget) {
        return {
          status: "menu",
          source: "playbook",
          reasoning: `Playbook (${slug || "game"}): Clicking "${(startBtn.innerText || startBtn.id || "Start").slice(0, 40)}" to boot gameplay.`,
          reasoning_path: ["S", "Yes", "R_MENU"],
          action: { type: "click", target, duration_ms: 150 },
          next_delay_ms: 550
        };
      }
    }

    // 2. If canvas exists and we've moved past menu or on every 4th step, interact with canvas/keys
    const canvas = (domSnapshot || []).find((el) => el.tagName === "CANVAS");
    if (canvas && stepIndex % 4 === 0) {
      const cx = Number.isFinite(canvas.nx) ? canvas.nx : 500;
      const cy = Number.isFinite(canvas.ny) ? canvas.ny : 500;
      // Offset slightly across ticks so clicking games (Treasure Hunters, AI-whack-a-mole, Sound Painter) hit varied targets
      const ox = ((stepIndex * 137) % 320) - 160;
      const oy = ((stepIndex * 89) % 200) - 100;
      const tx = clamp(cx + ox, 80, 920);
      const ty = clamp(cy + oy, 80, 920);
      return {
        status: "playing",
        source: "playbook",
        reasoning: `Playbook (${slug || "game"}): Clicking active game canvas at ${tx},${ty}.`,
        reasoning_path: ["S", "No", "No", "No", "R_PLAY"],
        action: { type: "click", target: `${tx},${ty}`, duration_ms: 140, params: { x: tx, y: ty } },
        next_delay_ms: 420
      };
    }

    // 3. Cycle through playbook's preferred keys (hold movement keys slightly longer than instant action keys)
    const key = preferredKeys[stepIndex % preferredKeys.length] || " ";
    const isMoveKey = ["w", "a", "s", "d", "arrowleft", "arrowright", "arrowup", "arrowdown"].includes(
      String(key).toLowerCase()
    );
    return {
      status: "playing",
      source: "playbook",
      reasoning: `Playbook (${slug || "game"}): Exercising control "${key === " " ? "Space" : key}" (${playbook ? playbook.controls.slice(0, 60) : "generic"}).`,
      reasoning_path: ["S", "No", "No", "No", "R_PLAY"],
      action: isMoveKey
        ? { type: "hold_key", target: key, duration_ms: 260 }
        : { type: "press_key", target: key, duration_ms: 100 },
      next_delay_ms: 380
    };
  }

  // -------------------------------------------------------------------------
  // 5. GiveGigs BotScript Engine (from GiveGigs/v7/src/lib/games/robot-script.ts)
  // -------------------------------------------------------------------------

  const ROBOT_SCRIPT_MAX_BYTES = 8_192;
  const ROBOT_SCRIPT_MAX_RULES = 24;
  const ROBOT_ACTIONS_PER_MINUTE = 48;

  const ROBOT_CONDITIONS = [
    "always",
    "enemy.nearby",
    "resource.nearby",
    "unknown.nearby",
    "health.low",
    "fuel.low"
  ];
  const ROBOT_ACTIONS = [
    "defend",
    "projectile",
    "hitscan",
    "melee",
    "self_destruct",
    "harvest",
    "collect",
    "build",
    "terraform",
    "upgrade",
    "explore",
    "return_to_base",
    "report"
  ];
  const ROBOT_MATERIALS = ["grass", "stone", "wood", "glass", "coral"];

  const ROBOT_SCRIPT_EXAMPLE = {
    version: 1,
    name: "Reef Scout",
    rules: [
      { when: "enemy.nearby", action: "projectile" },
      { when: "fuel.low", action: "return_to_base" },
      { when: "resource.nearby", action: "collect" },
      { when: "always", action: "explore", radius: 18 },
      { when: "always", action: "report" }
    ]
  };

  const ROBOT_SCRIPT_PRESETS = {
    "GG VoidMind · deterministic": {
      version: 1,
      name: "GG VoidMind",
      rules: [
        { when: "fuel.low", action: "return_to_base" },
        { when: "enemy.nearby", action: "defend" },
        { when: "resource.nearby", action: "collect" },
        { when: "unknown.nearby", action: "explore", radius: 12 },
        { when: "always", action: "report" }
      ]
    },
    "Reef Scout": ROBOT_SCRIPT_EXAMPLE,
    "Fuel-Conscious Scout": {
      version: 1,
      name: "Fuel Scout",
      rules: [
        { when: "fuel.low", action: "return_to_base" },
        { when: "enemy.nearby", action: "defend" },
        { when: "resource.nearby", action: "collect" },
        { when: "always", action: "explore", radius: 12 },
        { when: "always", action: "report" }
      ]
    },
    Harvester: {
      version: 1,
      name: "Harvester",
      rules: [
        { when: "resource.nearby", action: "harvest" },
        { when: "always", action: "explore", radius: 12 },
        { when: "always", action: "report" }
      ]
    },
    "Reef Guardian": {
      version: 1,
      name: "Reef Guardian",
      rules: [
        { when: "enemy.nearby", action: "hitscan" },
        { when: "health.low", action: "build", material: "stone" },
        { when: "always", action: "report" }
      ]
    },
    "Cavern Striker": {
      version: 1,
      name: "Cavern Striker",
      rules: [
        { when: "enemy.nearby", action: "melee" },
        { when: "resource.nearby", action: "collect" },
        { when: "always", action: "explore", radius: 12 }
      ]
    },
    "Demolition Diver": {
      version: 1,
      name: "Demolition Diver",
      rules: [
        { when: "enemy.nearby", action: "self_destruct" },
        { when: "resource.nearby", action: "harvest" },
        { when: "always", action: "report" }
      ]
    },
    "Four-Style Fighter": {
      version: 1,
      name: "Four-Style Fighter",
      rules: [
        { when: "enemy.nearby", action: "projectile" },
        { when: "enemy.nearby", action: "hitscan" },
        { when: "enemy.nearby", action: "melee" },
        { when: "enemy.nearby", action: "self_destruct" }
      ]
    },
    "Field Builder": {
      version: 1,
      name: "Field Builder",
      rules: [
        { when: "resource.nearby", action: "collect" },
        { when: "unknown.nearby", action: "explore", radius: 20 },
        { when: "always", action: "build", material: "wood" },
        { when: "always", action: "upgrade" }
      ]
    }
  };

  function parseRobotProgram(source) {
    if (typeof source !== "string" || new TextEncoder().encode(source).byteLength > ROBOT_SCRIPT_MAX_BYTES) {
      throw new Error(`BotScript is limited to ${ROBOT_SCRIPT_MAX_BYTES.toLocaleString()} bytes.`);
    }
    let value;
    try {
      value = JSON.parse(source);
    } catch (_) {
      throw new Error("BotScript must be valid JSON.");
    }
    if (!value || typeof value !== "object") throw new Error("BotScript must be a JSON object.");
    if (value.version !== 1 || typeof value.name !== "string" || !Array.isArray(value.rules)) {
      throw new Error("Use BotScript version 1 with a name and rules list.");
    }
    const name = value.name.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 32);
    if (!name || value.rules.length < 1 || value.rules.length > ROBOT_SCRIPT_MAX_RULES) {
      throw new Error(`Give the bot a name and add 1-${ROBOT_SCRIPT_MAX_RULES} rules.`);
    }
    const rules = value.rules.map((item, index) => {
      if (!item || typeof item !== "object") throw new Error(`Rule ${index + 1} must be an object.`);
      if (!ROBOT_CONDITIONS.includes(item.when) || !ROBOT_ACTIONS.includes(item.action)) {
        throw new Error(`Rule ${index + 1} has an unknown condition or action.`);
      }
      if (item.material !== undefined && !ROBOT_MATERIALS.includes(item.material)) {
        throw new Error(`Rule ${index + 1} has an unsupported material.`);
      }
      if (
        item.radius !== undefined &&
        (typeof item.radius !== "number" || !Number.isFinite(item.radius) || item.radius < 1 || item.radius > 64)
      ) {
        throw new Error(`Rule ${index + 1} radius must be from 1 to 64.`);
      }
      return {
        when: item.when,
        action: item.action,
        ...(item.material ? { material: item.material } : {}),
        ...(item.radius ? { radius: item.radius } : {})
      };
    });
    return { version: 1, name, rules };
  }

  function chooseRobotRule(program, observation = {}, _cursor = 0) {
    const returnRule = observation.fuelLow
      ? program.rules.findIndex((rule) => rule.when === "fuel.low" && rule.action === "return_to_base")
      : -1;
    if (returnRule >= 0) {
      return { rule: program.rules[returnRule], nextCursor: (returnRule + 1) % program.rules.length };
    }
    const matched = (condition) =>
      condition === "always" ||
      (condition === "enemy.nearby" && Boolean(observation.enemyNearby)) ||
      (condition === "resource.nearby" && Boolean(observation.resourceNearby)) ||
      (condition === "unknown.nearby" && Boolean(observation.unknownNearby)) ||
      (condition === "health.low" && Boolean(observation.healthLow)) ||
      (condition === "fuel.low" && Boolean(observation.fuelLow));

    const len = program.rules.length;
    const start = Number.isFinite(_cursor) ? ((_cursor % len) + len) % len : 0;
    for (let offset = 0; offset < len; offset += 1) {
      const idx = (start + offset) % len;
      const rule = program.rules[idx];
      if (matched(rule.when)) return { rule, nextCursor: (idx + 1) % len };
    }
    return { rule: null, nextCursor: 0 };
  }

  function deriveBotObservation(telemetry = {}, domSnapshot = [], stepIndex = 0) {
    const hp = Number(telemetry.hp ?? telemetry.health ?? 100);
    const maxHp = Number(telemetry.maxHp ?? 100);
    const fuel = Number(telemetry.fuel ?? telemetry.energy ?? telemetry.stamina ?? 100);
    const hasEnemy = Boolean(telemetry.enemiesCount > 0 || telemetry.nearestEnemy || stepIndex % 3 === 1);
    const hasResource = Boolean(telemetry.lootCount > 0 || telemetry.nearestLoot || stepIndex % 2 === 0);
    return {
      enemyNearby: hasEnemy,
      resourceNearby: hasResource,
      unknownNearby: domSnapshot.length > 0 || stepIndex % 4 === 0,
      healthLow: maxHp > 0 && hp / maxHp < 0.4,
      fuelLow: fuel < 25
    };
  }

  function mapRobotRuleToGameAction(rule, stepIndex = 0) {
    if (!rule) return { type: "wait", target: "", duration_ms: 250 };
    const exploreKeys = ["w", "d", "s", "a"];
    switch (rule.action) {
      case "projectile":
      case "hitscan":
      case "melee":
      case "defend":
        return {
          type: "combo",
          target: `botscript:${rule.action}`,
          duration_ms: 320,
          params: {
            steps: [
              { op: "click", x: 500, y: 500, button: rule.action === "defend" ? "right" : "left" },
              { op: "press", key: "space" }
            ]
          }
        };
      case "harvest":
      case "collect":
        return { type: "press_key", target: "e", duration_ms: 120 };
      case "build":
      case "upgrade":
      case "terraform":
        return { type: "click", target: "500,520", duration_ms: 140, params: { x: 500, y: 520 } };
      case "self_destruct":
        return { type: "press_key", target: "f", duration_ms: 120 };
      case "return_to_base":
        return { type: "press_key", target: "q", duration_ms: 120 };
      case "explore":
        return { type: "hold_key", target: exploreKeys[stepIndex % exploreKeys.length], duration_ms: 260 };
      case "report":
      default:
        return { type: "wait", target: "", duration_ms: 200 };
    }
  }

  const BotScriptEngine = {
    ROBOT_SCRIPT_MAX_BYTES,
    ROBOT_SCRIPT_MAX_RULES,
    ROBOT_ACTIONS_PER_MINUTE,
    ROBOT_CONDITIONS,
    ROBOT_ACTIONS,
    ROBOT_MATERIALS,
    ROBOT_SCRIPT_EXAMPLE,
    ROBOT_SCRIPT_PRESETS,
    parseRobotProgram,
    chooseRobotRule,
    deriveBotObservation,
    mapRobotRuleToGameAction
  };

  // -------------------------------------------------------------------------
  // 6. Universal Native Game Director & Player
  // -------------------------------------------------------------------------

  const NATIVE_ACTION_TYPES = [
    "combo",
    "hold_keys",
    "hold_key",
    "press_key",
    "click",
    "right_click",
    "double_click",
    "move_mouse",
    "drag_look",
    "wheel",
    "type_text",
    "wait"
  ];

  const PLAYER_NAME_CANDIDATES = [
    "GiveGigsTester",
    "GGG_Player",
    "VibeCodeWorker",
    "VCW_Player",
    "VibeCoder",
    "Player_GGG"
  ];

  function sanitizePlayerName(name, maxLen = 16) {
    const clean = String(name || "").replace(/[^A-Za-z0-9_]/g, "").slice(0, maxLen);
    return clean || "GGG_Player";
  }

  function getPlayerNameCandidate(attempt = 0) {
    const i = Math.max(0, Math.floor(Number(attempt) || 0));
    if (i < PLAYER_NAME_CANDIDATES.length) return sanitizePlayerName(PLAYER_NAME_CANDIDATES[i]);
    const n = i - PLAYER_NAME_CANDIDATES.length + 2;
    return sanitizePlayerName(`GGG_Player${n}`);
  }

  function normalizeComboStep(raw) {
    if (!raw || typeof raw !== "object") return null;
    const op = String(raw.op || raw.type || "").toLowerCase();
    const clampCoord = (n) => Math.max(0, Math.min(1000, Math.round(Number(n))));
    const cleanKeys = (v) =>
      String(v || "")
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 3);
    const ms = Math.max(80, Math.min(3000, parseInt(raw.duration_ms, 10) || 400));

    switch (op) {
      case "hold_keys": {
        const keys =
          Array.isArray(raw.keys) && raw.keys.length
            ? raw.keys.map((k) => String(k).toLowerCase()).slice(0, 3)
            : cleanKeys(raw.target);
        return { op, keys: keys.length ? keys : ["w"], duration_ms: ms };
      }
      case "hold":
        return { op, key: String(raw.key || raw.target || "w").toLowerCase(), duration_ms: ms };
      case "press":
      case "press_key":
        return { op: "press", key: String(raw.key || raw.target || "space").toLowerCase() };
      case "click": {
        const x = Number.isFinite(raw.x) ? clampCoord(raw.x) : 500;
        const y = Number.isFinite(raw.y) ? clampCoord(raw.y) : 500;
        const button = ["left", "right", "middle"].includes(String(raw.button || "left").toLowerCase())
          ? String(raw.button).toLowerCase()
          : "left";
        return { op: "click", x, y, button };
      }
      case "right_click":
      case "double_click":
      case "move":
      case "move_mouse": {
        const x = Number.isFinite(raw.x) ? clampCoord(raw.x) : 500;
        const y = Number.isFinite(raw.y) ? clampCoord(raw.y) : 500;
        return { op: op === "move_mouse" ? "move" : op, x, y };
      }
      case "look":
      case "drag_look": {
        const dx = Number.isFinite(raw.dx) ? Math.max(-500, Math.min(500, Math.round(raw.dx))) : 120;
        const dy = Number.isFinite(raw.dy) ? Math.max(-500, Math.min(500, Math.round(raw.dy))) : 0;
        return { op: "look", dx, dy };
      }
      case "wheel": {
        const delta = Number.isFinite(raw.delta)
          ? Math.max(-5, Math.min(5, Math.round(raw.delta)))
          : Number.isFinite(raw.clicks)
            ? Math.max(-5, Math.min(5, Math.round(raw.clicks)))
            : -1;
        return { op: "wheel", delta };
      }
      case "drag": {
        const x1 = Number.isFinite(raw.x1) ? clampCoord(raw.x1) : 400;
        const y1 = Number.isFinite(raw.y1) ? clampCoord(raw.y1) : 500;
        const x2 = Number.isFinite(raw.x2) ? clampCoord(raw.x2) : 600;
        const y2 = Number.isFinite(raw.y2) ? clampCoord(raw.y2) : 500;
        return { op: "drag", x1, y1, x2, y2, duration_ms: ms };
      }
      case "wait":
        return { op: "wait", duration_ms: Math.max(0, Math.min(3000, parseInt(raw.duration_ms, 10) || 150)) };
      case "type":
      case "type_text": {
        const text = String(raw.text || raw.target || "").slice(0, 120);
        return text ? { op: "type", text } : null;
      }
      default:
        return null;
    }
  }

  function normalizeNativeAction(raw) {
    if (!raw || typeof raw !== "object") {
      return {
        type: "hold_keys",
        target: "w,shift",
        duration_ms: 500,
        params: { keys: ["w", "shift"] },
        status: "native-fallback"
      };
    }
    let { type, target = "", duration_ms = 400, params = {} } = raw;
    if (!NATIVE_ACTION_TYPES.includes(type)) type = "hold_keys";
    const clampMs = Math.max(80, Math.min(3000, parseInt(duration_ms, 10) || 400));
    const clampCoord = (n) => Math.max(0, Math.min(1000, Math.round(Number(n))));
    const cleanKeys = (v) =>
      String(v || "")
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 3);

    if (type === "hold_keys") {
      const keys =
        Array.isArray(params.keys) && params.keys.length
          ? params.keys.map((k) => String(k).toLowerCase())
          : cleanKeys(target);
      const finalKeys = keys.length ? keys : ["w"];
      return { type, target: finalKeys.join(","), duration_ms: clampMs, params: { keys: finalKeys } };
    }
    if (type === "combo") {
      const rawSteps = Array.isArray(params.steps) ? params.steps : Array.isArray(raw.steps) ? raw.steps : [];
      const steps = rawSteps.map(normalizeComboStep).filter(Boolean).slice(0, 8);
      if (!steps.length) {
        return { type: "hold_keys", target: "w", duration_ms: 400, params: { keys: ["w"] } };
      }
      const longestHold = steps.reduce((m, s) => (s.duration_ms ? Math.max(m, s.duration_ms) : m), 0);
      const label = String(target || steps.map((s) => s.op).join("+")).slice(0, 60);
      return {
        type,
        target: label,
        duration_ms: Math.max(150, Math.min(1500, parseInt(duration_ms, 10) || longestHold || 500)),
        params: { steps }
      };
    }
    if (type === "hold_key" || type === "press_key") {
      const key = String(params.key || target || "w").toLowerCase();
      return { type, target: key, duration_ms: type === "press_key" ? 0 : clampMs, params: { key } };
    }
    if (type === "click" || type === "move_mouse" || type === "right_click" || type === "double_click") {
      let x = params.x;
      let y = params.y;
      if ((!Number.isFinite(x) || !Number.isFinite(y)) && typeof target === "string" && target.includes(",")) {
        const parts = target.split(",");
        x = parseInt(parts[0], 10);
        y = parseInt(parts[1], 10);
      }
      x = Number.isFinite(x) ? clampCoord(x) : 500;
      y = Number.isFinite(y) ? clampCoord(y) : 500;
      if (type === "click") {
        const button = ["left", "right", "middle"].includes(String(params.button || "").toLowerCase())
          ? String(params.button).toLowerCase()
          : "left";
        return { type, target: `${x},${y}`, duration_ms: 0, params: { x, y, button } };
      }
      return { type, target: `${x},${y}`, duration_ms: 0, params: { x, y } };
    }
    if (type === "drag_look") {
      let dx = params.dx;
      let dy = params.dy;
      if ((!Number.isFinite(dx) || !Number.isFinite(dy)) && typeof target === "string" && target.includes(",")) {
        const parts = target.split(",");
        dx = parseInt(parts[0], 10);
        dy = parseInt(parts[1], 10);
      }
      dx = Number.isFinite(dx) ? Math.max(-500, Math.min(500, Math.round(dx))) : 120;
      dy = Number.isFinite(dy) ? Math.max(-500, Math.min(500, Math.round(dy))) : 0;
      return { type, target: `${dx},${dy}`, duration_ms: 0, params: { dx, dy } };
    }
    if (type === "wheel") {
      const delta = Number.isFinite(params.delta) ? Math.max(-5, Math.min(5, Math.round(params.delta))) : -1;
      return { type, target: String(delta), duration_ms: 0, params: { delta } };
    }
    if (type === "type_text") {
      const text = String(params.text || target || "").slice(0, 120);
      return { type, target: text, duration_ms: 0, params: { text } };
    }
    return { type: "wait", target: "", duration_ms: clampMs || 400, params: {} };
  }

  function toInputSimArgs(action) {
    if (!action || !action.type) return null;
    const dur = action.duration_ms || 400;
    switch (action.type) {
      case "combo": {
        const steps = Array.isArray(action.params?.steps) ? action.params.steps : [];
        return steps.length ? ["combo", JSON.stringify({ steps })] : null;
      }
      case "click": {
        const x = action.params?.x ?? 500;
        const y = action.params?.y ?? 500;
        const button = String(action.params?.button || "left").toLowerCase();
        if (button === "right") return ["right_click", String(x), String(y)];
        if (button === "middle") return ["middle_click", String(x), String(y)];
        return ["click", String(x), String(y)];
      }
      case "right_click":
        return ["right_click", String(action.params?.x ?? 500), String(action.params?.y ?? 500)];
      case "double_click":
        return ["double_click", String(action.params?.x ?? 500), String(action.params?.y ?? 500)];
      case "press_key":
        return ["press", String(action.params?.key || action.target || "space")];
      case "hold_key":
        return ["hold", String(action.params?.key || action.target || "w"), String(dur)];
      case "hold_keys": {
        const keys = action.params?.keys || String(action.target || "w").split(",");
        return ["hold_keys", keys.join(","), String(dur)];
      }
      case "move_mouse":
        return ["move", String(action.params?.x ?? 500), String(action.params?.y ?? 500)];
      case "drag_look":
        return ["look", String(action.params?.dx ?? 120), String(action.params?.dy ?? 0)];
      case "wheel":
        return ["wheel", String(action.params?.delta ?? -1)];
      case "type_text":
        return ["type", String(action.params?.text || action.target || "")];
      case "wait":
      default:
        return null;
    }
  }

  function buildNativeGamePrompt({ profile, recentActions = [], stuck = false, extraRules = "" } = {}) {
    const p = profile || (Playbooks ? Playbooks.resolveGameProfile("") : { id: "generic", name: "Game", genre: "generic", controls: {}, startup: [] });
    const c = p.controls || {};
    const history =
      (recentActions || [])
        .slice(-6)
        .map((a, i) => {
          const desc = typeof a === "string" ? a : `${a.type || "?"} ${a.target || JSON.stringify(a.params || {})}`;
          return `  -${(recentActions || []).slice(-6).length - i}: ${desc}`;
        })
        .join("\n") || "  (none yet)";
    const startup = (p.startup || []).map((s) => `- ${s}`).join("\n");

    return `## ROLE - UNIVERSAL GAME PROGRAM TESTER
You are playing and debugging "${p.name}" (${p.genre}) from live screenshots.

## GAME BRIEF
${p.description || ""}
GOAL: ${p.goal || "Play actively, progress, and detect visual or soft-lock bugs."}
${extraRules ? `OPERATOR RULES: ${extraRules}\n` : ""}
## CONTROLS
forward=${c.forward || "w"} back=${c.back || "s"} left=${c.left || "a"} right=${c.right || "d"} jump=${c.jump || "space"} use=${c.use || "e"} fire=${c.fireHint || "left click"}

## STARTUP / RECOVERY
${startup || "- Click to focus, Enter past menus, Escape resumes pause."}
${stuck ? "\n## STUCK WARNING\nFrame has not changed. Try turning, jumping, clicking center, or pressing Escape.\n" : ""}

## RECENT ACTIONS
${history}

## TASK - respond ONLY with JSON:
{
  "status": "menu | playing | combat | puzzle | loading | dead | stuck | unknown",
  "reasoning": "short sentence describing visible frame and chosen action",
  "urgency": "low | normal | high",
  "action": {
    "type": "combo | hold_keys | press_key | click | right_click | double_click | move_mouse | drag_look | wheel | type_text | wait",
    "target": "'x,y' (0-1000) or key/keys",
    "duration_ms": 350,
    "params": {}
  },
  "bug_report": { "has_bug": false, "severity": "cosmetic | warning | critical", "title": "", "description": "" }
}`;
  }

  function parseNativeDecision(raw) {
    try {
      let data = raw;
      if (typeof raw === "string") {
        const m = raw.match(/\{[\s\S]*\}/);
        data = m ? JSON.parse(m[0]) : null;
      }
      if (!data || typeof data !== "object") return null;
      return {
        status: data.status || "playing",
        reasoning: data.reasoning || data.analysis || "Native vision step.",
        urgency: ["low", "normal", "high"].includes(String(data.urgency || "").toLowerCase())
          ? String(data.urgency).toLowerCase()
          : undefined,
        action: normalizeNativeAction(data.action || data),
        bug_report: data.bug_report || { has_bug: false }
      };
    } catch (_) {
      return null;
    }
  }

  function fingerprintFrame(frame = "") {
    let h = 2166136261;
    const stride = Math.max(1, Math.floor(frame.length / 160));
    for (let i = 0; i < frame.length; i += stride) {
      h ^= frame.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function nativeAction(type, target, duration_ms, reasoning, params = {}) {
    return { action: { type, target, duration_ms, params }, reasoning, status: "native-policy", source: "native-director" };
  }

  class NativeGameDirector {
    constructor() {
      this.reset();
    }
    reset() {
      this.title = "";
      this.tick = 0;
      this.startupTick = 0;
      this.previous = 0;
      this.last = null;
      this.lastFrame = 0;
      this.still = 0;
      this.fpsCycle = 0;
      this.arms = new Map();
      this.nameAttempt = 0;
      this.nameStep = 0;
    }
    setTarget(title) {
      if (title !== this.title) {
        this.reset();
        this.title = title || "";
      }
    }
    chooseNameEntry(profileId = "") {
      const candidate = getPlayerNameCandidate(this.nameAttempt);
      const geo =
        profileId === "xonotic"
          ? { field: { x: 380, y: 460 }, save: { x: 500, y: 895 } }
          : { field: { x: 500, y: 400 }, save: { x: 500, y: 850 } };
      const phase = this.nameStep % 4;
      this.nameStep += 1;
      if (phase === 3) this.nameAttempt += 1;
      if (phase === 0) {
        return nativeAction("double_click", `${geo.field.x},${geo.field.y}`, 0, `Name entry: focus field for "${candidate}".`, geo.field);
      }
      if (phase === 1) {
        return nativeAction("type_text", candidate, 0, `Name entry: type "${candidate}".`, { text: candidate });
      }
      if (phase === 2) {
        return nativeAction("press_key", "enter", 0, `Name entry: confirm "${candidate}".`, { key: "enter" });
      }
      return nativeAction("click", `${geo.save.x},${geo.save.y}`, 0, `Name entry: click Save/Confirm for "${candidate}".`, geo.save);
    }
    choose(frame) {
      const current = fingerprintFrame(frame);
      this.still = current === this.previous ? this.still + 1 : 0;
      if (this.last && this.arms.has(this.last)) {
        const arm = this.arms.get(this.last);
        arm.n += 1;
        arm.reward += current !== this.lastFrame ? 1 : -0.25;
      }
      this.previous = current;
      this.lastFrame = current;
      this.tick += 1;
      if (this.still >= 3) {
        this.still = 0;
        this.last = "recovery";
        return nativeAction("press_key", "escape", 0, "Recovery: clear pause/menu state.", { key: "escape" });
      }
      const fps = /half[- ]?life|portal|source|doom|quake|unreal|fps|shooter|xonotic|arena/i.test(this.title);
      const peggle = /peggle/i.test(this.title);
      const options = peggle
        ? [
            ["start", () => nativeAction("press_key", "enter", 0, "Peggle: confirm menu.", { key: "enter" })],
            ["aim-left", () => nativeAction("click", "370,300", 0, "Peggle: aim left cluster.", { x: 370, y: 300 })],
            ["aim-center", () => nativeAction("click", "500,280", 0, "Peggle: aim center cluster.", { x: 500, y: 280 })],
            ["aim-right", () => nativeAction("click", "630,300", 0, "Peggle: aim right cluster.", { x: 630, y: 300 })],
            ["wait-ball", () => nativeAction("wait", "", 900, "Peggle: wait for ball resolution.")]
          ]
        : fps
          ? [
              [
                "advance",
                () =>
                  nativeAction("combo", "sprint+scan", 650, "FPS: sprint forward while scanning.", {
                    steps: [
                      { op: "hold_keys", keys: ["w", "shift"], duration_ms: 600 },
                      { op: "look", dx: this.tick % 2 ? -120 : 120, dy: 0 }
                    ]
                  })
              ],
              ["interact", () => nativeAction("press_key", "e", 0, "FPS: interact.", { key: "e" })],
              [
                "jump",
                () =>
                  nativeAction("combo", "advance+jump", 450, "FPS: advance and jump.", {
                    steps: [
                      { op: "hold_keys", keys: ["w"], duration_ms: 400 },
                      { op: "press", key: "space" }
                    ]
                  })
              ],
              [
                "strafe",
                () =>
                  nativeAction("hold_keys", this.tick % 2 ? "w,a" : "w,d", 450, "FPS: diagonal strafe.", {
                    keys: this.tick % 2 ? ["w", "a"] : ["w", "d"]
                  })
              ],
              [
                "fire",
                () =>
                  nativeAction("combo", "track+fire", 500, "FPS: track center and fire.", {
                    steps: [
                      { op: "look", dx: 60, dy: 0 },
                      { op: "click", x: 500, y: 500, button: "left" }
                    ]
                  })
              ],
              ["reload", () => nativeAction("press_key", "r", 0, "FPS: reload weapon.", { key: "r" })]
            ]
          : [
              ["confirm", () => nativeAction("press_key", "enter", 0, "Generic: confirm focused state.", { key: "enter" })],
              ["move", () => nativeAction("hold_keys", this.tick % 2 ? "a" : "d", 350, "Generic: lateral movement.", { keys: [this.tick % 2 ? "a" : "d"] })],
              ["action", () => nativeAction("press_key", "space", 0, "Generic: trigger primary action.", { key: "space" })],
              ["click", () => nativeAction("click", "500,500", 0, "Generic: click center target.", { x: 500, y: 500 })]
            ];

      let selected = options[0];
      if (fps) {
        const route = ["advance", "strafe", "interact", "advance", "jump", "fire", "advance", "reload"];
        const next = route[this.fpsCycle % route.length];
        this.fpsCycle += 1;
        selected = options.find(([name]) => name === next) || options[0];
      } else {
        selected =
          Math.random() < 0.25
            ? options[Math.floor(Math.random() * options.length)]
            : options.reduce((best, item) => (this.score(item[0]) > this.score(best[0]) ? item : best));
      }
      if (!this.arms.has(selected[0])) this.arms.set(selected[0], { n: 0, reward: 0 });
      this.last = selected[0];
      return selected[1]();
    }
    score(name) {
      const a = this.arms.get(name);
      return a ? a.reward / Math.max(1, a.n) : 0;
    }
    summary() {
      return Object.fromEntries([...this.arms].map(([name, a]) => [name, { attempts: a.n, reward: Number(a.reward.toFixed(2)) }]));
    }
  }

  return {
    LANE_LEFT,
    LANE_CENTER,
    LANE_RIGHT,
    ALL_LANES,
    analyzeOvertake,
    chooseOpenLane,
    decideOvertake,
    runFriendSlopAutoplay,
    runGraveGainAutoplay,
    runPlaybookAutoplay,
    BotScriptEngine,
    NATIVE_ACTION_TYPES,
    PLAYER_NAME_CANDIDATES,
    sanitizePlayerName,
    getPlayerNameCandidate,
    normalizeComboStep,
    normalizeNativeAction,
    toInputSimArgs,
    buildNativeGamePrompt,
    parseNativeDecision,
    NativeGameDirector
  };
});
