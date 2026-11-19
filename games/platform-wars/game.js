(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const canvas = $('#arena');
  const ctx = canvas.getContext('2d');
  const W = 960, H = 540;
  const KO_TARGET = 7;

  const ARENAS = {
    sky: {
      name: 'Sky Decks',
      platforms: [
        { x: 110, y: 470, w: 740, h: 28, main: true },
        { x: 120, y: 365, w: 205, h: 16 },
        { x: 635, y: 365, w: 205, h: 16 },
        { x: 375, y: 265, w: 210, h: 16 },
        { x: 75, y: 175, w: 160, h: 16 },
        { x: 725, y: 175, w: 160, h: 16 }
      ]
    },
    pit: {
      name: 'Neon Pit',
      platforms: [
        { x: 60, y: 465, w: 300, h: 24, main: true },
        { x: 600, y: 465, w: 300, h: 24, main: true },
        { x: 380, y: 385, w: 200, h: 18 },
        { x: 140, y: 270, w: 185, h: 16 },
        { x: 635, y: 270, w: 185, h: 16 },
        { x: 390, y: 165, w: 180, h: 16 }
      ]
    },
    towers: {
      name: 'Twin Towers',
      platforms: [
        { x: 95, y: 470, w: 240, h: 26, main: true },
        { x: 625, y: 470, w: 240, h: 26, main: true },
        { x: 390, y: 340, w: 180, h: 18, moveAmp: 125, moveSpeed: 1.4, baseX: 390 },
        { x: 120, y: 230, w: 170, h: 16 },
        { x: 670, y: 230, w: 170, h: 16 }
      ]
    }
  };

  let run = false, localVersus = false, isMuted = false;
  let started = 0, activeMs = 0, lastFrame = 0, lastInput = 0, hitStop = 0, shakeTime = 0;
  let scores = { phone: 0, desktop: 0 };
  let keys = {}, p2Keys = {};
  let player, bot, activePlatforms = [];
  let particles = [], popups = [], ghosts = [], pickups = [], pings = [];
  let pickupTimer = 4.5, matchTime = 90, winStreak = 0;
  let rafId = 0;
  let currentModeLabel = 'practice';

  const type = matchMedia('(pointer:coarse)').matches ? 'PHONE' : 'DESKTOP';
  $('#device').textContent = `Joining as ${type}. ${type === 'PHONE' ? 'Twin-thumb pad + double-tap dash ready.' : 'Keyboard & 2P local split-keyboard ready.'}`;

  window.gameState = { title: 'platform-wars', get active() { return run; } };
  window.game = window.gameState;

  // --- WebAudio Synth ---
  let audioCtx = null;
  function initAudio() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    } catch (_) {}
  }
  function playSfx(kind) {
    if (isMuted) return;
    initAudio();
    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      if (kind === 'jump') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.09);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
      } else if (kind === 'dash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(190, now + 0.12);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        osc.start(now); osc.stop(now + 0.13);
      } else if (kind === 'hit') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.14);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
      } else if (kind === 'ko') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(48, now + 0.36);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.start(now); osc.stop(now + 0.38);
      } else if (kind === 'pickup') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587, now);
        osc.frequency.setValueAtTime(880, now + 0.06);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.start(now); osc.stop(now + 0.16);
      } else if (kind === 'win') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554, now + 0.09);
        osc.frequency.setValueAtTime(659, now + 0.18);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
        osc.start(now); osc.stop(now + 0.36);
      }
    } catch (_) {}
  }

  // --- Local Save Slots (No reload, offline-first) ---
  function slotKey(slot) { return 'platform-wars:slot' + slot; }
  function readSlot(slot) {
    try {
      const raw = localStorage.getItem(slotKey(slot));
      if (!raw) return { wins: 0, kos: 0, streak: 0 };
      const p = JSON.parse(raw);
      return { wins: p.wins || 0, kos: p.kos || 0, streak: p.streak || 0 };
    } catch (_) { return { wins: 0, kos: 0, streak: 0 }; }
  }
  function saveSlot(slot, data) {
    try { localStorage.setItem(slotKey(slot), JSON.stringify(data)); } catch (_) {}
  }
  function refreshSlotUI() {
    const d = readSlot(Number($('#slot').value) || 0);
    $('#slotStats').textContent = `Save ${$('#slot').value}: ${d.wins} Wins · ${d.kos} KOs · Best Streak ${d.streak}`;
  }
  refreshSlotUI();

  function fitArena() {
    try {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const bw = Math.round(W * dpr), bh = Math.round(H * dpr);
      if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } catch (_) {}
  }
  fitArena();
  window.addEventListener('resize', fitArena);
  document.addEventListener('fullscreenchange', fitArena);

  function makeFighter(team, x) {
    return {
      team, x, y: 110, vx: 0, vy: 0, w: 30, h: 40,
      ground: false, jumpsLeft: 2, dash: 0, dashCd: 0, stomping: false,
      face: team === 'phone' ? 1 : -1,
      damagePct: 0, shield: false, hyperTimer: 0, surgeTimer: 0,
      invuln: 0, squash: 1, jumpHeld: false, dashHeld: false
    };
  }

  function cloneArena(key) {
    const tpl = ARENAS[key] || ARENAS.sky;
    return tpl.platforms.map((p) => Object.assign({}, p));
  }

  function stopLoop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  function startMatch(mode) {
    initAudio();
    stopLoop();
    currentModeLabel = mode;
    localVersus = mode === '2p';
    const slot = Number($('#slot').value) || 0;
    const mapKey = $('#arenaMap').value || 'sky';
    activePlatforms = cloneArena(mapKey);
    particles = []; popups = []; ghosts = []; pickups = []; pings = [];
    pickupTimer = 4.2;
    matchTime = 90;
    hitStop = 0;
    shakeTime = 0;
    scores = { phone: 0, desktop: 0 };

    const p1Team = localVersus ? 'phone' : type.toLowerCase();
    const p2Team = p1Team === 'phone' ? 'desktop' : 'phone';
    player = makeFighter(p1Team, p1Team === 'phone' ? 220 : 710);
    bot = makeFighter(p2Team, p2Team === 'phone' ? 220 : 710);

    $('#cheatWatermark').hidden = true;
    $('#matchOver').hidden = true;
    $('#lobby').hidden = true;
    $('#game').hidden = false;
    fitArena();

    run = true;
    started = Date.now();
    activeMs = 0;
    lastFrame = performance.now();
    lastInput = Date.now();
    const diffName = ($('#aiDiff').value || 'pro').toUpperCase();
    $('#role').textContent = localVersus
      ? `2P VERSUS · ${ARENAS[mapKey].name.toUpperCase()}`
      : `YOU: ${type} · SAVE ${slot} · ${diffName}`;
    $('#banner').textContent = localVersus
      ? '2P LOCAL: P1 WASD+F vs P2 Arrows+Shift/Enter'
      : mode === 'quick'
        ? `QUICK MATCH · LOCAL ${diffName} RIVAL READY`
        : `PRACTICE ARENA · FIRST TO ${KO_TARGET} KOs`;
    rafId = requestAnimationFrame(loop);
  }

  async function quickMatch() {
    initAudio();
    const request = window.FourWeirdServer?.request;
    if (request && (location.protocol === 'http:' || location.protocol === 'https:')) {
      $('#quick').disabled = true;
      $('#quick').textContent = 'Searching…';
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 1100);
        const r = await Promise.race([
          request('/api/matches', { method: 'POST', body: { game_slug: 'platform-wars', platform: type.toLowerCase() } }),
          new Promise((res) => setTimeout(() => res(null), 1100))
        ]);
        clearTimeout(t);
        if (r?.status === 'matched') {
          $('#quick').disabled = false;
          $('#quick').textContent = '⚡ Quick Match';
          startMatch('quick');
          return;
        }
      } catch (_) {}
      $('#quick').disabled = false;
      $('#quick').textContent = '⚡ Quick Match';
    }
    startMatch('quick');
  }

  function finishMatch() {
    stopLoop();
    run = false;
    const p1Score = scores[player.team];
    const p2Score = scores[bot.team];
    const slot = Number($('#slot').value) || 0;
    const saved = readSlot(slot);
    saved.kos += p1Score;
    let headline = 'DRAW GAME!';
    if (p1Score > p2Score) {
      headline = localVersus ? 'PHONE TEAM WINS!' : `${type} TEAM WINS!`;
      if (!localVersus) {
        saved.wins += 1;
        winStreak += 1;
        if (winStreak > saved.streak) saved.streak = winStreak;
      }
      playSfx('win');
    } else if (p2Score > p1Score) {
      headline = localVersus ? 'DESKTOP TEAM WINS!' : `${bot.team.toUpperCase()} RIVAL WINS!`;
      if (!localVersus) winStreak = 0;
      playSfx('ko');
    }
    saveSlot(slot, saved);
    refreshSlotUI();

    $('#matchWinner').textContent = headline;
    $('#matchSummary').textContent = `Phone ${scores.phone} — ${scores.desktop} Desktop · Map: ${ARENAS[$('#arenaMap').value || 'sky'].name}`;
    $('#matchOver').hidden = false;
  }

  $('#quick').onclick = quickMatch;
  $('#practice').onclick = () => startMatch('practice');
  $('#local2p').onclick = () => startMatch('2p');
  $('#slot').onchange = refreshSlotUI;
  $('#leave').onclick = () => {
    stopLoop();
    run = false;
    $('#matchOver').hidden = true;
    $('#game').hidden = true;
    $('#lobby').hidden = false;
  };
  $('#rematch').onclick = () => startMatch(currentModeLabel);
  $('#backLobby').onclick = () => {
    $('#matchOver').hidden = true;
    $('#game').hidden = true;
    $('#lobby').hidden = false;
  };
  $('#muteBtn').onclick = () => {
    isMuted = !isMuted;
    $('#muteBtn').textContent = isMuted ? '🔇' : '🔊';
  };
  $('#createLobby').onclick = () => {
    $('#lobbyInfo').textContent = 'Online lobbies require the live server — launch 2P Local Versus or Quick Match right away!';
  };

  // Input listeners
  const p1Map = (e) => ({ ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump', s: 'down', S: 'down', ArrowDown: 'down', f: 'dash', F: 'dash' }[e.key]);
  addEventListener('keydown', (e) => {
    if (localVersus) {
      const k1 = ({ a: 'left', A: 'left', d: 'right', D: 'right', w: 'jump', W: 'jump', ' ': 'jump', s: 'down', S: 'down', f: 'dash', F: 'dash' })[e.key];
      const k2 = ({ ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'jump', ArrowDown: 'down', Shift: 'dash', Enter: 'dash' })[e.key];
      if (k1) { keys[k1] = true; lastInput = Date.now(); }
      if (k2) { p2Keys[k2] = true; lastInput = Date.now(); }
      return;
    }
    const k = p1Map(e);
    if (k) {
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
      keys[k] = true;
      lastInput = Date.now();
    }
  });
  addEventListener('keyup', (e) => {
    if (localVersus) {
      const k1 = ({ a: 'left', A: 'left', d: 'right', D: 'right', w: 'jump', W: 'jump', ' ': 'jump', s: 'down', S: 'down', f: 'dash', F: 'dash' })[e.key];
      const k2 = ({ ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'jump', ArrowDown: 'down', Shift: 'dash', Enter: 'dash' })[e.key];
      if (k1) keys[k1] = false;
      if (k2) p2Keys[k2] = false;
      return;
    }
    const k = p1Map(e);
    if (k) keys[k] = false;
  });

  // Twin-thumb pad
  let lastTapDir = 0, lastTapKey = '';
  document.querySelectorAll('[data-key]').forEach((b) => {
    ['pointerdown', 'pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => {
      b.addEventListener(ev, (e) => {
        e.preventDefault();
        initAudio();
        const k = b.dataset.key;
        if (ev === 'pointerdown') {
          lastInput = Date.now();
          keys[k] = true;
          b.classList.add('pressed');
          if (b.dataset.fire) keys.dash = true;
          if (k === 'left' || k === 'right') {
            const now = performance.now();
            if (lastTapKey === k && now - lastTapDir < 300 && player && player.dashCd <= 0) {
              triggerDash(player, k === 'left' ? -1 : 1);
            }
            lastTapDir = now;
            lastTapKey = k;
          }
        } else {
          keys[k] = false;
          b.classList.remove('pressed');
          if (b.dataset.fire) keys.dash = false;
        }
      }, { passive: false });
    });
  });

  function spawnParticles(x, y, color, count, spd) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const v = (0.3 + Math.random() * 0.7) * (spd || 6);
      particles.push({ x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, life: 1, color, r: 2 + Math.random() * 4 });
    }
  }
  function addPopup(x, y, text, color) {
    popups.push({ x, y, text, color, life: 1 });
  }

  function triggerDash(f, dir) {
    f.face = dir || f.face;
    f.vx = f.face * 13.5;
    f.vy = Math.min(f.vy, -1.5);
    f.dash = 14;
    f.dashCd = f.hyperTimer > 0 ? 18 : 38;
    f.squash = 0.72;
    playSfx('dash');
    spawnParticles(f.x + f.w / 2, f.y + f.h / 2, f.team === 'phone' ? '#ff4f9a' : '#58dcff', 10, 5);
  }

  function botControl(b, opp) {
    const diff = $('#aiDiff').value || 'pro';
    const act = { left: false, right: false, jump: false, down: false, dash: false };
    // Recover from edge
    if (b.x < 120) { act.right = true; if (b.y > 410 && b.jumpsLeft > 0) act.jump = true; return act; }
    if (b.x > W - 150) { act.left = true; if (b.y > 410 && b.jumpsLeft > 0) act.jump = true; return act; }
    if (b.y > 440 && !b.ground && b.jumpsLeft > 0) { act.jump = true; }

    let targetX = opp.x, targetY = opp.y;
    if (diff !== 'rookie' && pickups.length) {
      const pk = pickups[0];
      if (Math.hypot(pk.x - b.x, pk.y - b.y) < 260) { targetX = pk.x; targetY = pk.y; }
    }
    const dx = targetX - b.x;
    if (dx < -18) act.left = true;
    else if (dx > 18) act.right = true;

    const jumpRate = diff === 'apex' ? 0.06 : diff === 'pro' ? 0.035 : 0.018;
    if (targetY + 38 < b.y && (b.ground || (b.jumpsLeft > 0 && b.vy > 2 && Math.random() < jumpRate * 2))) {
      act.jump = true;
    } else if (Math.random() < jumpRate * 0.4 && b.ground) {
      act.jump = true;
    }

    const dashDist = diff === 'apex' ? 175 : diff === 'pro' ? 140 : 100;
    const dashChance = diff === 'apex' ? 0.16 : diff === 'pro' ? 0.08 : 0.03;
    if (Math.abs(opp.x - b.x) < dashDist && Math.abs(opp.y - b.y) < 50 && b.dashCd <= 0 && Math.random() < dashChance) {
      b.face = opp.x >= b.x ? 1 : -1;
      act.dash = true;
    }
    return act;
  }

  function stepFighter(f, opp, input, dt) {
    if (f.dash > 0) f.dash--;
    if (f.dashCd > 0) f.dashCd--;
    if (f.invuln > 0) f.invuln--;
    if (f.hyperTimer > 0) f.hyperTimer = Math.max(0, f.hyperTimer - dt);
    if (f.surgeTimer > 0) f.surgeTimer = Math.max(0, f.surgeTimer - dt);
    f.squash += (1 - f.squash) * 0.22;

    const moveDir = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    if (moveDir !== 0 && f.dash <= 0) f.face = moveDir;
    const targetVx = moveDir * (f.hyperTimer > 0 ? 6.4 : 5.2);
    if (f.dash <= 0) {
      f.vx += (targetVx - f.vx) * (f.ground ? 0.34 : 0.18);
    } else {
      ghosts.push({ x: f.x, y: f.y, w: f.w, h: f.h, team: f.team, life: 1 });
    }

    // Double jump
    if (input.jump && !f.jumpHeld && f.jumpsLeft > 0) {
      f.vy = f.jumpsLeft === 2 ? -12.6 : -11.4;
      f.ground = false;
      f.stomping = false;
      f.jumpsLeft--;
      f.squash = 1.28;
      playSfx('jump');
      spawnParticles(f.x + f.w / 2, f.y + f.h, '#e2e8f0', 6, 3.5);
    }
    f.jumpHeld = !!input.jump;

    // Ground stomp in mid-air
    if (input.down && !f.ground && !f.stomping && f.vy > -4) {
      f.vy = 14.5;
      f.stomping = true;
    }

    // Dash strike
    if (input.dash && !f.dashHeld && f.dashCd <= 0) {
      triggerDash(f, moveDir || f.face);
    }
    f.dashHeld = !!input.dash;

    const prevBottom = f.y + f.h;
    f.vy = Math.min(18, f.vy + 0.62);
    f.x += f.vx;
    f.y += f.vy;

    const wasGround = f.ground;
    f.ground = false;
    for (const p of activePlatforms) {
      const dropThrough = input.down && !p.main;
      if (!dropThrough && f.vy >= 0 && f.x + f.w > p.x + 2 && f.x < p.x + p.w - 2 && prevBottom <= p.y + 8 && f.y + f.h >= p.y) {
        f.y = p.y - f.h;
        if (p.dx) f.x += p.dx;
        if (f.stomping) {
          f.stomping = false;
          shakeTime = 0.14;
          spawnParticles(f.x + f.w / 2, f.y + f.h, '#fde047', 12, 5.5);
          if (Math.hypot((opp.x + opp.w / 2) - (f.x + f.w / 2), (opp.y + opp.h / 2) - (f.y + f.h)) < 115) {
            applyHit(f, opp, 16, f.x < opp.x ? 1 : -1, -7.5);
          }
        } else if (!wasGround) {
          f.squash = 0.78;
        }
        f.vy = 0;
        f.ground = true;
        f.jumpsLeft = 2;
        break;
      }
    }

    // Ring-out KO check
    if (f.x < -70 || f.x + f.w > W + 70 || f.y > H + 75 || f.y < -150) {
      scores[opp.team] += 1;
      playSfx('ko');
      shakeTime = 0.28;
      spawnParticles(Math.max(40, Math.min(W - 40, f.x)), Math.max(40, Math.min(H - 40, f.y)), opp.team === 'phone' ? '#ff4f9a' : '#58dcff', 28, 9.5);
      addPopup(opp.x + opp.w / 2, Math.max(60, opp.y - 16), '+1 KO!', '#fde047');
      respawnFighter(f);
    }
  }

  function respawnFighter(f) {
    f.x = f.team === 'phone' ? 230 : 700;
    f.y = 85;
    f.vx = 0;
    f.vy = 0;
    f.damagePct = 0;
    f.jumpsLeft = 2;
    f.dash = 0;
    f.stomping = false;
    f.invuln = 75;
  }

  function applyHit(attacker, defender, dmg, dir, liftY) {
    if (defender.invuln > 0) return;
    if (defender.shield) {
      defender.shield = false;
      defender.invuln = 25;
      spawnParticles(defender.x + defender.w / 2, defender.y + defender.h / 2, '#34d399', 14, 6);
      addPopup(defender.x + 15, defender.y - 10, 'BLOCKED!', '#34d399');
      playSfx('pickup');
      return;
    }
    const mult = attacker.surgeTimer > 0 ? 1.55 : 1.0;
    defender.damagePct = Math.min(250, Math.round(defender.damagePct + dmg * mult));
    const kb = (5.5 + defender.damagePct * 0.085) * mult;
    defender.vx = dir * kb;
    defender.vy = liftY - defender.damagePct * 0.035;
    defender.ground = false;
    defender.invuln = 22;
    hitStop = 3;
    shakeTime = 0.14;
    playSfx('hit');
    spawnParticles(defender.x + defender.w / 2, defender.y + defender.h / 2, '#fde047', 14, 6.5);
    addPopup(defender.x + 15, defender.y - 10, `+${Math.round(dmg * mult)}%`, '#fb7185');
  }

  function spawnPickup() {
    const plat = activePlatforms[Math.floor(Math.random() * activePlatforms.length)];
    if (!plat) return;
    const kinds = [
      { kind: 'hyper', icon: '⚡', color: '#38bdf8' },
      { kind: 'shield', icon: '🛡️', color: '#34d399' },
      { kind: 'surge', icon: '💥', color: '#facc15' }
    ];
    const k = kinds[Math.floor(Math.random() * kinds.length)];
    pickups.push({ x: plat.x + plat.w / 2, y: plat.y - 22, kind: k.kind, icon: k.icon, color: k.color, bob: Math.random() * 6 });
  }

  function drawBackground(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#090d24');
    g.addColorStop(1, '#182147');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Subtle skyline silhouette
    ctx.fillStyle = 'rgba(30, 41, 82, 0.5)';
    for (let i = 0; i < 16; i++) {
      const bx = i * 64 + ((t * 6) % 64) - 32;
      const bh = 80 + ((i * 37) % 130);
      ctx.fillRect(bx, H - bh, 48, bh);
    }

    // Subtle grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }

  function drawFighter(f) {
    if (f.invuln > 0 && Math.floor(f.invuln / 4) % 2 === 1) ctx.globalAlpha = 0.45;
    const col = f.team === 'phone' ? '#ff4f9a' : '#58dcff';
    const cx = f.x + f.w / 2;
    const bottom = f.y + f.h;
    const drawW = f.w / f.squash;
    const drawH = f.h * f.squash;
    const dx = cx - drawW / 2;
    const dy = bottom - drawH;

    if (f.shield) {
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, dy + drawH / 2, 28, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (f.surgeTimer > 0) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.strokeRect(dx - 3, dy - 3, drawW + 6, drawH + 6);
    }

    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = f.dash > 0 ? 24 : 14;
    ctx.fillRect(dx, dy, drawW, drawH);
    ctx.shadowBlur = 0;

    // Headband + eyes
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(dx, dy + 6, drawW, 5);
    const eyeShift = f.face * 3;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(dx + 6 + eyeShift, dy + 13, 5, 6);
    ctx.fillRect(dx + drawW - 11 + eyeShift, dy + 13, 5, 6);

    // Damage % badge above head
    ctx.font = '800 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = f.damagePct > 100 ? '#fb7185' : '#f8fafc';
    ctx.fillText(f.damagePct + '%', cx, dy - 8);
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    if (!run) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - lastFrame) / 1000));
    lastFrame = now;
    if (document.hasFocus() && Date.now() - lastInput < 5000) activeMs += dt * 1000;

    if (hitStop > 0) {
      hitStop--;
      rafId = requestAnimationFrame(loop);
      return;
    }

    const t = now * 0.001;
    // Update moving platforms
    for (const p of activePlatforms) {
      if (p.moveAmp) {
        const oldX = p.x;
        p.x = p.baseX + Math.sin(t * p.moveSpeed) * p.moveAmp;
        p.dx = p.x - oldX;
      }
    }

    // Spawn pickups
    pickupTimer -= dt;
    if (pickupTimer <= 0) {
      if (pickups.length < 2) spawnPickup();
      pickupTimer = 7.5;
    }

    const p2Input = localVersus ? p2Keys : botControl(bot, player);
    stepFighter(player, bot, keys, dt);
    stepFighter(bot, player, p2Input, dt);

    // Fighter collision & dash clash
    if (Math.abs(player.x - bot.x) < player.w && Math.abs(player.y - bot.y) < player.h) {
      const dir = player.x < bot.x ? 1 : -1;
      if (player.dash > 0 && bot.dash <= 0) {
        applyHit(player, bot, 22, dir, -6.5);
      } else if (bot.dash > 0 && player.dash <= 0) {
        applyHit(bot, player, 22, -dir, -6.5);
      } else {
        player.vx -= dir * 3.2;
        bot.vx += dir * 3.2;
      }
    }

    // Pickup collection
    for (let i = pickups.length - 1; i >= 0; i--) {
      const pk = pickups[i];
      pk.bob += dt * 4;
      let takenBy = null;
      for (const f of [player, bot]) {
        if (Math.hypot((f.x + f.w / 2) - pk.x, (f.y + f.h / 2) - pk.y) < 30) {
          takenBy = f;
          break;
        }
      }
      if (takenBy) {
        if (pk.kind === 'hyper') takenBy.hyperTimer = 8;
        else if (pk.kind === 'shield') takenBy.shield = true;
        else if (pk.kind === 'surge') takenBy.surgeTimer = 8;
        playSfx('pickup');
        spawnParticles(pk.x, pk.y, pk.color, 12, 5);
        addPopup(pk.x, pk.y - 12, pk.icon + ' BOOST!', pk.color);
        pickups.splice(i, 1);
      }
    }

    // Render scene
    ctx.save();
    if (shakeTime > 0) {
      shakeTime = Math.max(0, shakeTime - dt);
      ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
    }

    drawBackground(t);

    // Draw platforms
    for (const p of activePlatforms) {
      ctx.fillStyle = p.main ? '#3b4d8f' : '#4f64a8';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = p.main ? '#58dcff' : '#a78bfa';
      ctx.fillRect(p.x, p.y, p.w, 3);
    }

    // Draw pickups
    for (const pk of pickups) {
      const py = pk.y + Math.sin(pk.bob) * 4;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = pk.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pk.x, py, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.font = '16px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pk.icon, pk.x, py + 1);
    }

    // Ghost trails
    for (let i = ghosts.length - 1; i >= 0; i--) {
      const gh = ghosts[i];
      gh.life -= 0.12;
      if (gh.life <= 0) { ghosts.splice(i, 1); continue; }
      ctx.fillStyle = gh.team === 'phone' ? `rgba(255,79,154,${gh.life * 0.4})` : `rgba(88,220,255,${gh.life * 0.4})`;
      ctx.fillRect(gh.x, gh.y, gh.w, gh.h);
    }

    drawFighter(player);
    drawFighter(bot);

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.2;
      pt.life -= 0.04;
      if (pt.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = pt.life;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Floating popups
    for (let i = popups.length - 1; i >= 0; i--) {
      const pp = popups[i];
      pp.y -= 0.9;
      pp.life -= 0.025;
      if (pp.life <= 0) { popups.splice(i, 1); continue; }
      ctx.globalAlpha = pp.life;
      ctx.font = '900 15px system-ui';
      ctx.textAlign = 'center';
      ctx.fillStyle = pp.color;
      ctx.fillText(pp.text, pp.x, pp.y);
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    $('#phoneScore').textContent = String(scores.phone);
    $('#desktopScore').textContent = String(scores.desktop);
    matchTime = Math.max(0, 90 - Math.floor((Date.now() - started) / 1000));
    $('#timer').textContent = `${String(matchTime / 60 | 0).padStart(2, '0')}:${String(matchTime % 60).padStart(2, '0')}`;

    if (matchTime <= 0 || scores.phone >= KO_TARGET || scores.desktop >= KO_TARGET) {
      finishMatch();
      return;
    }
    rafId = requestAnimationFrame(loop);
  }
})();

(function fwFullscreen() {
  var section = document.getElementById('game');
  if (!section || document.getElementById('fw-fs-btn')) return;
  var hud = section.querySelector('.hud');
  var btn = document.createElement('button');
  btn.id = 'fw-fs-btn'; btn.className = 'fw-fs-btn'; btn.type = 'button';
  btn.title = 'Toggle fullscreen'; btn.setAttribute('aria-label', 'Toggle fullscreen');
  btn.textContent = '\u26F6';
  if (hud) hud.appendChild(btn); else section.insertBefore(btn, section.firstChild);
  function isFS() { return !!document.fullscreenElement; }
  function toggleFS() {
    if (!isFS()) {
      if (document.pointerLockElement && document.exitPointerLock) {
        try { document.exitPointerLock(); } catch (e) {}
        setTimeout(requestFS, 60);
      } else { requestFS(); }
    } else if (document.exitFullscreen) { document.exitFullscreen(); }
  }
  function requestFS() {
    try {
      var r = section.requestFullscreen ? section.requestFullscreen() : null;
      if (r && r.catch) r.catch(function (err) { console.warn('Fullscreen rejected:', err); });
    } catch (e) { console.warn('Fullscreen rejected:', e); }
  }
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    toggleFS();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  });
})();
