(() => {
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const $ = s => document.querySelector(s);

  const atlas = new Image();
  const props = new Image();
  const enemies = new Image();
  enemies.src = 'assets/crypt-enemies.webp';
  atlas.src = 'assets/lira-motion.webp';
  props.src = 'assets/moonlit-props.webp';

  const groundTiles = Array.from({ length: 30 }, (_, index) => {
    const tile = new Image();
    tile.src = `assets/ground/ground-${String(index + 1).padStart(2, '0')}.svg`;
    tile.addEventListener('load', renderIntro);
    return tile;
  });

  const terrainOverlays = ['crack', 'grass'].flatMap(kind =>
    Array.from({ length: 20 }, (_, i) => {
      const overlay = new Image();
      overlay.src = `assets/terrain-overlays/${kind}-${String(i + 1).padStart(2, '0')}.svg`;
      return overlay;
    })
  );

  const W = 960, H = 540, ground = 432;
  const VAULT_SECONDS = 0.5;
  let viewScale = 1, viewOffsetX = 0, viewOffsetY = 0;

  let wallGrip = null;
  let wallJumpLock = 0;
  let wallGrabGrace = 0;
  let doubleJumpReady = false;
  let dropTimer = 0;
  let stride = 0;
  let lastStepStride = 0;
  let landing = 0;
  let sliding = false;
  let jumpBuffer = 0;
  let coyote = 0;
  let launchCoyote = false;
  let parkourMomentum = 0;
  const JUMP_BUFFER_SECONDS = 0.17;
  const COYOTE_SECONDS = 0.12;
  let cameraLift = 0;
  let jumpHeld = false;
  let jumpCutApplied = false;
  let launchBoost = false;
  let wasSliding = false;
  let hitstop = 0;
  let toastTimer = 0;
  let frame = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let fireballs = [];
  let callouts = [];
  let trail = [];
  let trailTimer = 0;

  let running = false, paused = false, last = 0, time = 0, distance = 0, gems = 0, hearts = 3;
  let world = 0, spawn = 0, shake = 0, particles = [];
  let combo = 1, comboTimer = 0;
  let nextWardenAt = 1000, wardenTimer = 0, wardenWaveTimer = 0, bonusSigils = 0;
  let lastWardenSec = 0, nextWardenBoltY = ground - 43, wardenFade = 0;
  let lastBiomeId = 0, currentBiome = null;

  let player = { x: 238, y: ground, vy: 0, speed: 220, jump: false, pose: 0, invuln: 0, vault: 0 };
  let obstacles = [], loot = [], input = { x: 0, y: 0 }, pointer = null;

  const $score = $('#score'), $gems = $('#gems'), $hearts = $('#hearts'), $overlay = $('#overlay'), $stick = $('#stick');
  const $combo = $('#combo'), bestNode = $('#best'), objectiveHud = $('#objective');
  const draftPanel = $('#draft-panel'), pausePanel = $('#pause-panel'), shop = $('#permanent-upgrades');
  const muteBtn = $('#mute-btn'), pauseBtn = $('#pause-btn');

  function applyTransform() {
    ctx.setTransform(viewScale, 0, 0, viewScale, viewOffsetX, viewOffsetY);
  }

  function resize() {
    const c = canvas, r = c.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    c.width = Math.max(1, Math.round(r.width * dpr));
    c.height = Math.max(1, Math.round(r.height * dpr));
    viewScale = Math.min(c.width / W, c.height / H);
    viewOffsetX = (c.width - W * viewScale) / 2;
    viewOffsetY = (c.height - H * viewScale) / 2;
    applyTransform();
    if (!running) renderIntro();
  }
  addEventListener('resize', resize);
  resize();

  let best = 0;
  try { best = Number(localStorage.getItem('gravegain2dD-best') || 0); } catch {}
  bestNode.textContent = best;

  let run = GraveGainRun.createRun();
  let build = {};
  let nextDraft = 0;
  let drafts = 0;

  function renderHearts() {
    const maxHearts = 3 + (build.health || 0);
    $hearts.textContent = `${hearts}/${maxHearts}`;
  }

  function updateMuteIcon() {
    if (!window.GraveGainAudio) return;
    const muted = GraveGainAudio.isMuted();
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.setAttribute('aria-pressed', String(muted));
  }
  updateMuteIcon();

  muteBtn.addEventListener('click', () => {
    muteBtn.blur();
    if (!window.GraveGainAudio) return;
    GraveGainAudio.toggleMute();
    updateMuteIcon();
  });

  function setPaused(next) {
    if (!running) return;
    if (paused === Boolean(next)) return;
    paused = Boolean(next);
    cancelAnimationFrame(frame);
    pausePanel.hidden = !paused;
    if (paused) {
      clearInput();
      GraveGainAudio?.pauseMusic?.();
    } else {
      GraveGainAudio?.resumeMusic?.();
      last = performance.now();
      frame = requestAnimationFrame(loop);
    }
  }

  pauseBtn.addEventListener('click', () => {
    pauseBtn.blur();
    setPaused(!paused);
  });
  $('#resume-btn').addEventListener('click', () => setPaused(false));
  $('#restart-btn').addEventListener('click', () => {
    pausePanel.hidden = true;
    paused = false;
    start();
  });

  function addCallout(text, x, y, color = '#ffe7a1') {
    callouts.push({ text, x, y, color, life: 0.85 });
  }

  function boostCombo(amount = 0.25, label = null, x = player.x + 20, y = player.y - 68) {
    combo = Math.min(3.0, Number((combo + amount).toFixed(2)));
    comboTimer = 4.0;
    if (label) addCallout(`${label} ×${combo.toFixed(1)}`, x, y);
    $combo.textContent = `×${combo.toFixed(1)}`;
    $combo.hidden = combo <= 1.05;
  }

  function showDraft() {
    if (!running || !draftPanel.hidden) return;
    drafts++;
    draftPanel.hidden = false;
    GraveGainAudio?.sfx.draft();
    const choices = $('#draft-choices');
    choices.replaceChildren();
    const options = GraveGainProgression.draft(build);
    options.forEach((card, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'relic-card';
      if (card.isCapstone) button.classList.add('capstone');

      const head = document.createElement('span');
      head.className = 'relic-head';
      const keyBadge = document.createElement('span');
      keyBadge.className = 'relic-key';
      keyBadge.textContent = String(index + 1);
      const tierBadge = document.createElement('span');
      tierBadge.className = 'relic-tier';
      tierBadge.textContent = card.tier || 'Relic';
      head.append(keyBadge, tierBadge);

      const title = document.createElement('strong');
      title.className = 'relic-title';
      title.textContent = card.title || card.name;

      const detail = document.createElement('small');
      detail.className = 'relic-detail';
      detail.textContent = card.detail;

      button.append(head, title, detail);
      button.addEventListener('click', () => {
        if (draftPanel.hidden || !running) return;
        card.apply();
        renderHearts();
        updateObjectiveHud();
        draftPanel.hidden = true;
        last = performance.now();
      });
      choices.append(button);
    });
    choices.firstElementChild?.focus();
  }

  function record(event) {
    const complete = run.record(event);
    if (complete) {
      GraveGainAudio?.sfx.contract?.();
      boostCombo(0.35);
      if (hearts < 3 + (build.health || 0)) {
        hearts++;
        renderHearts();
        addCallout('CONTRACT +1 ♥', player.x + 20, player.y - 80, '#a6f4c5');
      } else {
        addCallout('CONTRACT COMPLETE!', player.x + 20, player.y - 80, '#ffe7a1');
      }
    }
    if (gems >= nextDraft) {
      nextDraft += 30 + 5 * Math.min(drafts, 6) - (build.experience || 0);
      showDraft();
    }
    updateObjectiveHud();
  }

  function updateObjectiveHud() {
    const wardenText = wardenTimer > 0 ? ` · WARDEN ${Math.ceil(wardenTimer)}s` : '';
    objectiveHud.textContent = `${run.objective} · Draft at ${nextDraft} shards · Wards ${build.armor || 0}${wardenText}`;
  }

  function updateShopSummary() {
    const status = GraveGainProgression.getShopStatus?.();
    const summary = $('#upgrade-shop summary');
    if (!status || !summary) return;
    const avail = status.affordableCount > 0 ? ` · ${status.affordableCount} affordable` : '';
    summary.textContent = `Permanent upgrades · ${status.sigils} sigils${avail}`;
  }

  GraveGainProgression.renderShop(shop, updateShopSummary);
  updateShopSummary();

  function start() {
    cancelAnimationFrame(frame);
    GraveGainAudio?.unlock();
    build = GraveGainProgression.createBuild();
    drafts = 0;
    nextDraft = 24 - (build.experience || 0);
    draftPanel.hidden = true;
    pausePanel.hidden = true;
    paused = false;
    wallGrip = null;
    wallJumpLock = 0;
    wallGrabGrace = 0;
    doubleJumpReady = false;
    dropTimer = 0;
    jumpBuffer = coyote = cameraLift = 0;
    launchCoyote = false;
    parkourMomentum = 0;
    jumpHeld = false;
    jumpCutApplied = false;
    launchBoost = false;
    sliding = false;
    wasSliding = false;
    hitstop = 0;
    fireballs = [];
    callouts = [];
    trail = [];
    trailTimer = 0;
    combo = 1;
    comboTimer = 0;
    $combo.hidden = true;
    nextWardenAt = 1000;
    wardenTimer = 0;
    wardenWaveTimer = 0;
    bonusSigils = 0;
    lastWardenSec = 0;
    nextWardenBoltY = ground - 43;
    wardenFade = 0;
    run = GraveGainRun.createRun();
    stride = landing = lastStepStride = 0;
    running = true;
    last = performance.now();
    time = distance = gems = world = spawn = shake = 0;
    lastBiomeId = 0;
    currentBiome = cloneBiome(getBiomeTarget(0));
    hearts = 3 + (build.health || 0);
    obstacles = [];
    loot = [];
    particles = [];
    player = { x: 238, y: ground, vy: 0, speed: 220, jump: false, pose: 0, invuln: 0, vault: 0 };
    $score.textContent = '0';
    $gems.textContent = '0';
    renderHearts();
    updateObjectiveHud();
    $('#title').innerHTML = 'MOONLIT<br>RUN';
    $('#start').textContent = 'BEGIN RUN';
    $overlay.classList.add('hidden');
    if (build.draft) showDraft();
    frame = requestAnimationFrame(loop);
  }
  $('#start').addEventListener('click', start);

  function joy(e) {
    const r = $('#stickZone').getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / (r.width * 0.35)));
    const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / (r.height * 0.35)));
    input = { x: Math.abs(dx) < 0.12 ? 0 : dx, y: Math.abs(dy) < 0.12 ? 0 : dy };
    $stick.style.transform = `translate(${input.x * 30}px,${input.y * 30}px)`;
  }

  const zone = $('#stickZone');
  zone.addEventListener('pointerdown', e => {
    if (!running || paused || !draftPanel.hidden || pointer !== null || e.button !== 0) return;
    e.preventDefault();
    pointer = e.pointerId;
    zone.setPointerCapture(pointer);
    joy(e);
  });
  zone.addEventListener('pointermove', e => {
    if (e.pointerId === pointer) joy(e);
  });
  function release(e) {
    if (e.pointerId === pointer) {
      pointer = null;
      applyKeyboard();
      $stick.style.transform = 'translate(0,0)';
    }
  }
  zone.addEventListener('pointerup', release);
  zone.addEventListener('pointercancel', release);
  zone.addEventListener('lostpointercapture', release);

  // Right-side tap/swipe gesture support for mobile
  let tapPointer = null, tapStartY = 0, tapDirection = 0;
  canvas.addEventListener('pointerdown', e => {
    if (!running || paused || !draftPanel.hidden || tapPointer !== null || e.button !== 0) return;
    if (e.clientX < window.innerWidth * 0.35) return;
    tapPointer = e.pointerId;
    tapStartY = e.clientY;
    tapDirection = -0.8;
    canvas.setPointerCapture(tapPointer);
    jumpBuffer = JUMP_BUFFER_SECONDS;
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerId !== tapPointer) return;
    if (e.clientY - tapStartY > 28 && tapDirection < 0) {
      tapDirection = 0.8;
      jumpBuffer = 0;
    }
  });
  function endTap(e) {
    if (e.pointerId !== tapPointer) return;
    tapPointer = null;
    tapDirection = 0;
    if (e.type === 'pointercancel') jumpBuffer = 0;
    if (pointer === null) applyKeyboard();
  }
  canvas.addEventListener('pointerup', endTap);
  canvas.addEventListener('pointercancel', endTap);
  canvas.addEventListener('lostpointercapture', endTap);

  const heldKeys = new Set();
  const controls = new Map([
    ['KeyA', 'left'], ['ArrowLeft', 'left'],
    ['KeyD', 'right'], ['ArrowRight', 'right'],
    ['KeyW', 'up'], ['ArrowUp', 'up'], ['Space', 'up'],
    ['KeyS', 'down'], ['ArrowDown', 'down']
  ]);

  function applyKeyboard() {
    const active = new Set([...heldKeys].map(code => controls.get(code)));
    input.x = Number(active.has('right')) - Number(active.has('left'));
    input.y = Number(active.has('down')) - Number(active.has('up'));
  }

  addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (!draftPanel.hidden) {
      const index = ['Digit1', 'Digit2', 'Digit3'].indexOf(event.code);
      if (index >= 0) {
        event.preventDefault();
        $('#draft-choices').children[index]?.click();
      }
      return;
    }
    if (running && (event.code === 'KeyP' || event.code === 'Escape') && !event.repeat) {
      event.preventDefault();
      setPaused(!paused);
      return;
    }
    if (paused) return;
    if (!running && event.target instanceof HTMLElement && event.target.closest('button, summary')) return;
    if (event.code === 'Enter' || event.code === 'Space') {
      if (!running && !event.repeat) {
        event.preventDefault();
        start();
        return;
      }
    }
    if (!controls.has(event.code)) return;
    event.preventDefault();
    const action = controls.get(event.code);
    if (action === 'up' && !event.repeat && running && !paused && draftPanel.hidden) {
      jumpBuffer = JUMP_BUFFER_SECONDS;
    }
    heldKeys.add(event.code);
    if (pointer === null && tapPointer === null) applyKeyboard();
  });

  addEventListener('keyup', event => {
    if (!heldKeys.delete(event.code)) return;
    if (pointer === null && tapPointer === null) applyKeyboard();
  });

  function pollGamepad() {
    if (pointer !== null || tapPointer !== null || heldKeys.size > 0) return;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads && Array.from(pads).find(Boolean);
    if (!pad) return;
    const axX = Math.abs(pad.axes[0] || 0) > 0.2 ? pad.axes[0] : 0;
    const axY = Math.abs(pad.axes[1] || 0) > 0.25 ? pad.axes[1] : 0;
    const dLeft = pad.buttons[14]?.pressed ? -1 : 0;
    const dRight = pad.buttons[15]?.pressed ? 1 : 0;
    const dUp = pad.buttons[12]?.pressed || pad.buttons[0]?.pressed ? -1 : 0;
    const dDown = pad.buttons[13]?.pressed || pad.buttons[1]?.pressed ? 1 : 0;
    input.x = Math.max(-1, Math.min(1, axX + dLeft + dRight));
    input.y = Math.max(-1, Math.min(1, axY + dUp + dDown));
  }

  function terrainHash(index) {
    const mixed = Math.imul(index ^ 0x49a7, 0x45d9f3b);
    return (mixed ^ (mixed >>> 16)) >>> 0;
  }

  function groundTileAt(index) {
    const region = Math.floor(index / 9);
    const local = index % 9;
    const boundary = 2 + terrainHash(region) % 5;
    const material = terrainHash(region + (local >= boundary ? 1 : 0)) % 6;
    const variant = terrainHash(index + 700) % 5;
    return groundTiles[material * 5 + variant];
  }

  function getBiomeTarget(dist = distance) {
    if (dist >= 2000) return { id: 3, name: 'BLOOD MOON', skyTop: '#240b16', skyMid: '#481a2b', skyBot: '#623a3f', moon: '#ffd1d1', halo: '#ff6d7a55', hills: ['#452530', '#381e28', '#2a161e'] };
    if (dist >= 1200) return { id: 2, name: 'VIOLET CRYPT', skyTop: '#100c26', skyMid: '#241f46', skyBot: '#463f5b', moon: '#e2dcff', halo: '#b8a8ff55', hills: ['#322d4a', '#29253e', '#201c30'] };
    if (dist >= 500) return { id: 1, name: 'EMERALD MIRE', skyTop: '#071713', skyMid: '#15322b', skyBot: '#315242', moon: '#c7f4d2', halo: '#7ff0a755', hills: ['#244439', '#1e3930', '#172d26'] };
    return { id: 0, name: 'MOONLIT ROAD', skyTop: '#090f23', skyMid: '#1b3041', skyBot: '#465952', moon: '#dce9c8', halo: '#d5f9cd61', hills: ['#304652', '#293e47', '#20353c'] };
  }

  function cloneBiome(b) {
    return { ...b, hills: [...b.hills] };
  }

  function parseColor(color) {
    if (color.startsWith('rgba(') || color.startsWith('rgb(')) {
      const parts = color.slice(color.indexOf('(') + 1, -1).split(',').map(Number);
      return [parts[0] || 0, parts[1] || 0, parts[2] || 0, parts[3] ?? 1];
    }
    const h = color.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16) || 0;
    const g = parseInt(h.slice(2, 4), 16) || 0;
    const b = parseInt(h.slice(4, 6), 16) || 0;
    const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return [r, g, b, a];
  }

  function lerpColor(from, to, t) {
    const [r1, g1, b1, a1] = parseColor(from);
    const [r2, g2, b2, a2] = parseColor(to);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    const a = a1 + (a2 - a1) * t;
    return `rgba(${r},${g},${b},${a.toFixed(3)})`;
  }

  function updateBiome(dt) {
    const target = getBiomeTarget();
    if (target.id > lastBiomeId) {
      lastBiomeId = target.id;
      addCallout(target.name, W / 2 - 58, 96, target.moon);
    }
    if (!currentBiome) currentBiome = cloneBiome(target);
    const blend = 1 - Math.exp(-dt * 2.4);
    currentBiome.skyTop = lerpColor(currentBiome.skyTop, target.skyTop, blend);
    currentBiome.skyMid = lerpColor(currentBiome.skyMid, target.skyMid, blend);
    currentBiome.skyBot = lerpColor(currentBiome.skyBot, target.skyBot, blend);
    currentBiome.moon = lerpColor(currentBiome.moon, target.moon, blend);
    currentBiome.halo = lerpColor(currentBiome.halo, target.halo, blend);
    currentBiome.hills = currentBiome.hills.map((hill, idx) => lerpColor(hill, target.hills[idx], blend));
  }
  currentBiome = cloneBiome(getBiomeTarget(0));

  function drawGravePlots() {
    const spacing = 295;
    const scroll = world * 0.39;
    const first = Math.floor(scroll / spacing);
    ctx.save();
    for (let i = -1; i <= Math.ceil(W / spacing); i++) {
      const plot = first + i;
      const seed = terrainHash(plot + 2200);
      const center = i * spacing - scroll % spacing + 112;
      const lean = seed % 52 - 26;
      const base = ground - 12 - seed % 15;
      const hillHeight = 19 + seed % 15;

      function project(u, depth) {
        const mound = Math.sin(Math.PI * u);
        return {
          x: center + lean * (1 - depth) + (u - 0.5) * (123 + 100 * depth),
          y: base - 80 * (1 - depth) - mound * hillHeight * (0.65 + depth * 0.35),
          height: 15 + depth * 15
        };
      }

      function fence(fromU, fromDepth, toU, toDepth, count) {
        const posts = Array.from({ length: count + 1 }, (_, j) => {
          const t = j / count;
          return project(fromU + (toU - fromU) * t, fromDepth + (toDepth - fromDepth) * t);
        });
        const near = (fromDepth + toDepth) / 2;
        ctx.lineWidth = 1 + near;
        ctx.strokeStyle = near > 0.6 ? '#233333' : '#324448';
        for (const rail of [0.23, 0.76]) {
          ctx.beginPath();
          posts.forEach(({ x, y, height }, j) => {
            if (j) ctx.lineTo(x, y - height * rail);
            else ctx.moveTo(x, y - height * rail);
          });
          ctx.stroke();
        }
        for (const [j, { x, y, height }] of posts.entries()) {
          ctx.fillStyle = j % 4 === 0 ? '#263637' : '#304044';
          const width = (j % 4 === 0 ? 3 : 1.4) + near;
          ctx.fillRect(x - width / 2, y - height, width, height);
          ctx.fillStyle = '#627579';
          ctx.fillRect(x - width / 2, y - height - 1, width, 2);
        }
      }

      const hill = ctx.createLinearGradient(0, base - 112, 0, ground);
      hill.addColorStop(0, '#435756');
      hill.addColorStop(1, '#293d37');
      ctx.fillStyle = hill;
      ctx.beginPath();
      ctx.moveTo(center - 147, ground);
      ctx.bezierCurveTo(center - 92, base - 45, center - 103 + lean, base - 106, center + lean, base - 111);
      ctx.bezierCurveTo(center + 103 + lean, base - 106, center + 91, base - 42, center + 146, ground);
      ctx.fill();

      fence(0, 0, 1, 0, 12);
      fence(0, 0, 0, 1, 8);
      fence(1, 0, 1, 1, 8);
      for (let row = 0; row < 3; row++) {
        const depth = 0.18 + row * 0.25;
        for (let stone = 0; stone < 4; stone++) {
          const variation = terrainHash(seed % 10000 + row * 13 + stone);
          if (variation % 5 === 0) continue;
          const u = 0.17 + stone * 0.21 + (variation % 9 - 4) * 0.01;
          const point = project(u, depth);
          const size = 17 + 21 * depth + variation % 6;
          ctx.globalAlpha = 0.52 + depth * 0.24;
          atlasDraw(variation % 2 ? 1 : 10, point.x - size / 2, point.y - size, size, size, props);
        }
      }
      ctx.globalAlpha = 1;
      fence(0, 1, 1, 1, 19);
    }
    ctx.restore();
  }

  function drawBg(lift = 0) {
    const biome = currentBiome || getBiomeTarget(0);
    const sky = ctx.createLinearGradient(0, -lift, 0, ground);
    sky.addColorStop(0, biome.skyTop);
    sky.addColorStop(0.52, biome.skyMid);
    sky.addColorStop(1, biome.skyBot);
    ctx.fillStyle = sky;
    ctx.fillRect(-100, -lift - 100, W + 200, H + lift + 200);

    for (let i = 0; i < 90; i++) {
      const seed = terrainHash(i + 901);
      const x = ((seed % W) - world * 0.025 % W + W) % W;
      const y = 15 + ((seed >>> 10) % 360) - lift;
      ctx.fillStyle = i % 9 ? '#b9d7da65' : '#e6f7e4b0';
      ctx.fillRect(Math.floor(x), y, i % 9 ? 1 : 2, i % 9 ? 1 : 2);
    }
    const moonY = 120 - lift * 0.92;
    const halo = ctx.createRadialGradient(745, moonY, 19, 745, moonY, 144);
    halo.addColorStop(0, biome.halo);
    halo.addColorStop(1, '#00000000');
    ctx.fillStyle = halo;
    ctx.fillRect(600, moonY - 144, 290, 288);
    ctx.fillStyle = biome.moon;
    ctx.beginPath();
    ctx.arc(745, moonY, 41, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#536c621f';
    for (const [dx, dy, radius] of [[-13, -14, 11], [18, -1, 9], [-4, 18, 12]]) {
      ctx.beginPath();
      ctx.arc(745 + dx, moonY + dy, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let layer = 0; layer < 3; layer++) {
      const width = 100 - layer * 19;
      const speed = 0.09 + layer * 0.12;
      const scroll = world * speed;
      const startIdx = Math.floor(scroll / width);
      ctx.fillStyle = biome.hills[layer];
      for (let i = -1; i <= Math.ceil(W / width); i++) {
        const seed = terrainHash(startIdx + i + 300 * layer);
        const x = i * width - scroll % width;
        const y = ground - (layer === 0 ? 168 : 100) - seed % 100;
        ctx.beginPath();
        ctx.moveTo(x - 25, ground);
        ctx.lineTo(x + width * 0.52, y);
        ctx.lineTo(x + width + 25, ground);
        ctx.fill();
        if (layer === 1 && seed % 3 === 0) {
          ctx.fillRect(x + 16, y + 25, 19, ground - y - 25);
          for (let tooth = 0; tooth < 3; tooth++) ctx.fillRect(x + 16 + tooth * 7, y + 20, 5, 5);
        }
      }
    }

    const mist = ctx.createLinearGradient(0, ground - 160, 0, ground);
    mist.addColorStop(0, '#a3d3be00');
    mist.addColorStop(0.62, '#a3d3be29');
    mist.addColorStop(1, '#a3d3be00');
    ctx.fillStyle = mist;
    ctx.fillRect(0, ground - 160, W, 160);
    if (!reducedMotion.matches) {
      ctx.save();
      for (let i = 0; i < 18; i++) {
        const seed = terrainHash(i + 1500);
        const fx = ((seed % W) - (world * 0.22 + time * (12 + (seed % 14))) % W + W) % W;
        const fy = ground - 26 - ((seed >>> 8) % 190) + Math.sin(time * (1.4 + (seed % 5) * 0.3) + i) * 10;
        const alpha = 0.16 + 0.22 * (0.5 + 0.5 * Math.sin(time * 2.5 + i * 1.7));
        ctx.fillStyle = i % 3 === 0 ? `rgba(241, 216, 139, ${alpha.toFixed(2)})` : `rgba(158, 247, 215, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(fx, fy, i % 4 === 0 ? 2 : 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    drawGravePlots();

    ctx.fillStyle = '#17201b';
    ctx.fillRect(-100, ground, W + 200, H - ground + 200);
    ctx.fillStyle = '#526448';
    ctx.fillRect(0, ground, W, 3);
    const tileSize = 48;
    const firstTile = Math.floor(world / tileSize);
    const offset = world % tileSize;
    for (let i = 0; i <= Math.ceil(W / tileSize); i++) {
      const tile = groundTileAt(firstTile + i);
      if (tile.complete && tile.naturalWidth) {
        const x = i * tileSize - Math.floor(offset);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tile, x, ground, tileSize, tileSize);
        const seed = terrainHash(firstTile + i + 440);
        const overlay = terrainOverlays[seed % terrainOverlays.length];
        if (seed % 5 !== 0 && overlay.complete && overlay.naturalWidth) {
          ctx.drawImage(overlay, x, ground, tileSize, tileSize);
        }
        ctx.drawImage(tile, 0, 3, 32, 29, x, ground + tileSize, tileSize, tileSize);
      }
    }
    const soilShade = ctx.createLinearGradient(0, ground + 8, 0, H);
    soilShade.addColorStop(0, '#0a111600');
    soilShade.addColorStop(1, '#0a1116c0');
    ctx.fillStyle = soilShade;
    ctx.fillRect(0, ground + 8, W, H - ground - 8);
    ctx.fillStyle = '#74805a';
    for (let i = 0; i < 45; i++) {
      const x = ((i * 37 - world) % 1000 + 1000) % 1000;
      ctx.fillRect(x, ground + 10 + (i * 17 % 70), 2, 2);
    }
  }

  function atlasDraw(cell, x, y, w, h, sheet = atlas, columns = 6) {
    if (!sheet.complete || !sheet.naturalWidth) {
      if (sheet === atlas) fallbackElf(x, y, w, h);
      return;
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet, (cell % columns) * 32, Math.floor(cell / columns) * 32, 32, 32, x, y, w, h);
  }

  function heroFrame() {
    if (player.vault > 0) return 12 + Math.min(5, Math.floor(6 * (1 - player.vault / VAULT_SECONDS)));
    if (player.jump) {
      if (player.vy < -350) return 6;
      if (player.vy < -90) return 7;
      if (player.vy < 110) return 8;
      return 9;
    }
    if (landing > 0) return landing > 0.045 ? 10 : 11;
    return Math.floor(stride) % 6;
  }

  function fallbackElf(x, y, w, h) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#a26045';
    ctx.fillRect(w * 0.34, h * 0.12, w * 0.32, h * 0.24);
    ctx.fillStyle = '#43624d';
    ctx.fillRect(w * 0.28, h * 0.34, w * 0.46, h * 0.38);
    ctx.fillStyle = '#ddb786';
    ctx.fillRect(w * 0.36, h * 0.19, w * 0.29, h * 0.16);
    ctx.fillStyle = '#563a31';
    ctx.fillRect(w * 0.27, h * 0.68, w * 0.18, h * 0.28);
    ctx.fillRect(w * 0.57, h * 0.68, w * 0.18, h * 0.28);
    ctx.fillStyle = '#b7d29a';
    ctx.beginPath();
    ctx.moveTo(w * 0.34, h * 0.26);
    ctx.lineTo(w * 0.14, h * 0.17);
    ctx.lineTo(w * 0.32, h * 0.32);
    ctx.fill();
    ctx.restore();
  }

  const enemyTypes = {
    skeleton: { width: 53, height: 65, motion: 0, reaction: 10, fps: 13, effect: 40, color: '#e1d7b4' },
    slime: { width: 54, height: 34, motion: 20, reaction: 30, fps: 10, effect: 42, color: '#a6e884' }
  };

  function drawEnemy(enemy) {
    const type = enemyTypes[enemy.type];
    const reacting = enemy.hitAt !== undefined;
    const frame = reacting
      ? type.reaction + Math.min(9, Math.floor((time - enemy.hitAt) * 18))
      : type.motion + Math.floor(time * type.fps) % 10;
    if (enemy.tell) {
      ctx.fillStyle = '#f6d48c';
      ctx.font = 'bold 19px system-ui';
      ctx.fillText('!', enemy.x + enemy.w / 2, ground - enemy.h - 8);
    }
    if (enemies.naturalWidth) {
      atlasDraw(frame, enemy.x, ground - enemy.h - (enemy.lift || 0), enemy.w, enemy.h, enemies, 10);
    } else {
      ctx.fillStyle = type.color;
      ctx.fillRect(enemy.x + 7, ground - enemy.h - (enemy.lift || 0) + 8, enemy.w - 14, enemy.h - 8);
    }
  }

  function updateTurret(turret) {
    const range = turret.x - player.x;
    if (turret.chargeAt === undefined && range < 510 && range > 350) turret.chargeAt = time;
    if (turret.fired || turret.chargeAt === undefined || time - turret.chargeAt < 0.48) return;
    turret.fired = true;
    fireballs.push({ x: turret.x, y: ground - 43, nearMissed: false });
  }

  function drawTurret(turret) {
    const x = turret.x + 12;
    const y = ground - 43;
    const charging = turret.chargeAt !== undefined && !turret.fired;
    if (charging) {
      ctx.save();
      const pulse = 0.28 + 0.22 * Math.sin(time * 24);
      ctx.strokeStyle = `rgba(255, 120, 188, ${pulse.toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 7]);
      ctx.beginPath();
      ctx.moveTo(x - 10, y);
      ctx.lineTo(Math.max(40, x - 360), y);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#37354b';
    ctx.fillRect(x - 9, y + 8, 18, 35);
    ctx.fillStyle = '#9383a9';
    ctx.fillRect(x - 11, y + 9, 22, 4);
    ctx.shadowColor = '#ff5eaa';
    ctx.shadowBlur = charging ? 25 : 9;
    ctx.fillStyle = charging ? '#fff5b1' : '#e681ba';
    ctx.beginPath();
    ctx.arc(x, y, charging ? 8 + Math.sin(time * 30) * 2 : 6, 0, Math.PI * 2);
    ctx.fill();
  }

  function updateFireballs(dt, velocity) {
    const heroX = player.x + 20;
    const head = player.y - (sliding ? 22 : 53);
    fireballs = fireballs.filter(ball => {
      ball.x -= (velocity + 240) * dt;
      if (ball.x < -16) return false;
      if (Math.abs(ball.x - heroX) < 21 && ball.y + 7 > head && ball.y - 7 < player.y) {
        emit(ball.x, ball.y, '#fa8fbc', 10);
        crash();
        return false;
      }
      if (!ball.nearMissed && ball.x < heroX - 18 && Math.abs(ball.y - head) < 28) {
        ball.nearMissed = true;
        boostCombo(0.15, 'NEAR MISS', player.x + 18, player.y - 68);
      }
      return true;
    });
  }

  function drawFireballs() {
    ctx.save();
    for (const { x, y } of fireballs) {
      ctx.shadowColor = '#ff5eaa';
      ctx.shadowBlur = 17;
      ctx.fillStyle = '#ef76b5';
      ctx.beginPath();
      ctx.ellipse(x + 8, y, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff1b4';
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function canSpawnAt(x, w) {
    return !obstacles.some(o => x < o.x + o.w + 95 && x + w + 95 > o.x);
  }

  function spawnHazard() {
    const x = W + 50;
    const r = Math.random();
    let o;
    if (r < 0.30) o = { type: 'stump', x, w: 54, h: 43 };
    else if (r < 0.56) o = { type: 'bramble', x, w: 61, h: 60 };
    else if (r < 0.72) o = r < 0.66
      ? { type: 'wall', x, w: 38, h: 72 }
      : { type: 'climbwall', x, w: 36, h: 130 };
    else if (r < 0.86) o = { type: 'arch', x, w: 74, h: 86, clearance: 34 };
    else o = { type: 'gap', x, w: 76, h: 0 };

    if (distance > 100 && Math.random() < 0.18) {
      o = { type: 'turret', x, w: 30, h: 51 };
    } else if (distance > 140 && Math.random() < 0.30) {
      const type = Math.random() < 0.5 ? 'skeleton' : 'slime';
      o = { type, x, w: enemyTypes[type].width, h: enemyTypes[type].height };
    }

    if ((o.type === 'arch' || o.type === 'climbwall') && run.hasLowPlatformAt?.(o.x, o.w, ground)) {
      o = distance > 140 && Math.random() < 0.5
        ? { type: 'slime', x, w: enemyTypes.slime.width, h: enemyTypes.slime.height }
        : { type: 'stump', x, w: 54, h: 43 };
    }

    if (!canSpawnAt(o.x, o.w)) return;
    obstacles.push(o);
    if (Math.random() < 0.78) {
      loot.push({ x: x + 34, y: ground - 92 - Math.random() * 35, r: 9, cell: Math.random() < 0.55 ? 3 : 4 });
    }
  }

  function drawObstacle(o) {
    if (o.type === 'arch') {
      const topY = ground - o.h;
      const bottomY = ground - o.clearance;
      ctx.fillStyle = '#26303d';
      ctx.fillRect(o.x, topY, o.w, bottomY - topY);
      ctx.fillStyle = '#3c4b5c';
      ctx.fillRect(o.x, topY, o.w, 4);
      ctx.fillStyle = '#8b997d';
      ctx.fillRect(o.x - 3, bottomY - 5, o.w + 6, 5);
      ctx.fillStyle = '#f6d48c';
      for (let sx = o.x + 4; sx < o.x + o.w - 6; sx += 14) {
        ctx.fillRect(sx, bottomY - 4, 7, 3);
      }
      ctx.save();
      ctx.font = 'bold 11px system-ui';
      const label = 'SLIDE ↓';
      const bw = ctx.measureText(label).width + 14;
      const bx = o.x + (o.w - bw) / 2;
      const by = topY - 26;
      ctx.fillStyle = '#0c1722eb';
      ctx.strokeStyle = '#f6d48c88';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, bw, 20, 6);
      else ctx.rect(bx, by, bw, 20);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f6d48c';
      ctx.fillText(label, bx + 7, by + 14);
      ctx.restore();
      return;
    }
    if (o.type === 'climbwall') {
      const y = ground - o.h;
      ctx.fillStyle = '#3e4555';
      ctx.fillRect(o.x, y, o.w, o.h);
      ctx.fillStyle = '#9da684';
      ctx.fillRect(o.x - 3, y, o.w + 6, 4);
      for (let offset = 14; offset < o.h; offset += 14) {
        ctx.fillStyle = '#272e37';
        ctx.fillRect(o.x, y + offset, o.w, 2);
        ctx.fillStyle = '#89977f';
        ctx.fillRect(o.x + 2, y + offset - 5, 6, 3);
      }
      if (wallGrip === o) {
        ctx.fillStyle = '#fff1a8';
        ctx.font = 'bold 14px system-ui';
        ctx.fillText('↑ WALL JUMP', o.x - 85, y - 10);
      }
      return;
    }
    if (o.type === 'turret') { drawTurret(o); return; }
    if (enemyTypes[o.type]) { drawEnemy(o); return; }
    if (o.type === 'gap') {
      const pit = ctx.createLinearGradient(0, ground, 0, H);
      pit.addColorStop(0, '#101922');
      pit.addColorStop(1, '#050910');
      ctx.fillStyle = pit;
      ctx.fillRect(o.x, ground, o.w, H - ground + 200);
      ctx.fillStyle = '#829071';
      ctx.fillRect(o.x, ground, 3, 12);
      ctx.fillRect(o.x + o.w - 3, ground, 3, 12);
      return;
    }
    const cell = { stump: 7, bramble: 6, wall: 8 }[o.type];
    atlasDraw(cell, o.x, ground - o.h, o.w, o.h, props);
    if (!props.complete || !props.naturalWidth) {
      ctx.fillStyle = o.type === 'bramble' ? '#59613c' : '#6d6554';
      ctx.fillRect(o.x, ground - o.h, o.w, o.h);
    }
    if (o.type === 'stump' && !o.vaulted && o.x - player.x < 260 && o.x > player.x - 10) {
      ctx.save();
      ctx.fillStyle = 'rgba(158, 247, 215, 0.55)';
      ctx.fillRect(o.x + 6, ground - o.h + 2, o.w - 12, 3);
      ctx.fillStyle = '#9ef7d7';
      ctx.font = 'bold 13px system-ui';
      const bob = reducedMotion.matches ? 0 : Math.sin(time * 8) * 3;
      ctx.fillText('↑', o.x + o.w / 2 - 4, ground - o.h - 9 + bob);
      ctx.restore();
    }
  }

  function emit(x, y, color, n = 8, sparkle = false) {
    for (let i = 0; i < n; i++) {
      particles.push({ x, y, vx: (Math.random() - 0.5) * 150, vy: -Math.random() * 120, life: 0.45, size: 2 + Math.random() * 3, color, sparkle: sparkle && i === 0 });
    }
  }

  function performVault(o) {
    o.vaulted = true;
    player.vy = -440 - (build.vault || 0);
    player.jump = true;
    player.vault = VAULT_SECONDS;
    launchBoost = true;
    jumpCutApplied = false;
    jumpBuffer = coyote = 0;
    parkourMomentum = Math.max(parkourMomentum, 72);
    player.speed = Math.min(player.speed + 48, 435 + (build.sprint || 0));
    if (build.capstones?.vault && fireballs.length > 0) {
      for (const ball of fireballs) emit(ball.x, ball.y, '#9ef7d7', 10, true);
      fireballs = [];
      if (!reducedMotion.matches) hitstop = 0.045;
      addCallout('SHATTERED!', player.x + 28, player.y - 84, '#9ef7d7');
    }
    record('vault');
    boostCombo(0.25, 'VAULT', player.x + 24, ground - 60);
    emit(player.x + 24, ground, '#d9c780', 9, true);
    GraveGainAudio?.sfx.vault();
    $('#toast').classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('#toast').classList.remove('on'), 420);
  }

  function crash() {
    if (!running || player.invuln > 0) return;
    if (build.armor > 0) {
      build.armor--;
      player.invuln = 0.65;
      if (!reducedMotion.matches) hitstop = 0.05;
      emit(player.x + 18, player.y - 30, '#8ff5ed', 14);
      addCallout('WARD SAVED!', player.x + 18, player.y - 68, '#8ff5ed');
      GraveGainAudio?.sfx.ward();
      record('ward');
      return;
    }
    combo = 1;
    comboTimer = 0;
    $combo.hidden = true;
    hearts--;
    player.invuln = 1.3 + (build.grace || 0);
    parkourMomentum = 0;
    player.speed *= 0.72;
    shake = 0.25;
    if (!reducedMotion.matches) hitstop = 0.065;
    emit(player.x + 18, player.y - 30, '#e6b47d', 14);
    GraveGainAudio?.sfx.hit();
    renderHearts();
    if (hearts <= 0) end();
  }

  function end() {
    running = false;
    paused = false;
    draftPanel.hidden = true;
    pausePanel.hidden = true;
    objectiveHud.textContent = '';
    GraveGainAudio?.pauseMusic?.();
    const dist = Math.floor(distance);
    const isNewBest = dist > best;
    const breakdown = GraveGainProgression.getBreakdown?.(distance, run.completed, build, bonusSigils, gems);
    const reward = GraveGainProgression.award(distance, run.completed, build, bonusSigils, gems);
    const status = GraveGainProgression.getShopStatus?.();
    GraveGainProgression.renderShop(shop, updateShopSummary);
    updateShopSummary();
    best = Math.max(best, dist);
    bestNode.textContent = best;
    try { localStorage.setItem('gravegain2dD-best', String(best)); } catch {}
    $('#title').innerHTML = 'THE ROAD<br>CLAIMS YOU';
    const bestNote = isNewBest && dist > 0 ? ' · NEW BEST!' : '';
    const shardPart = breakdown?.shardSigils ? ` · ${breakdown.shardSigils} from shards` : '';
    const contractPart = breakdown?.contractSigils ? ` · ${breakdown.contractSigils} contracts` : '';
    const bonusPart = bonusSigils > 0 ? ` · ${bonusSigils} warden` : '';
    $('#copy').innerHTML =
      `Ran <strong>${dist}m</strong>${bestNote} · Best <strong>${best}m</strong><br>` +
      `Moonshards <strong>${gems}</strong> · Contracts completed <strong>${run.completed}</strong><br>` +
      `Earned <strong>+${reward} sigils</strong>` +
      (breakdown ? ` (${breakdown.distSigils} distance${shardPart}${contractPart}${bonusPart})` : '') +
      (status ? ` · Bank: <strong>${status.sigils} sigils</strong>` : '');
    $('#start').textContent = 'RUN AGAIN';
    $overlay.classList.remove('hidden');
  }

  function renderIntro() {
    if (running) return;
    currentBiome = cloneBiome(getBiomeTarget(0));
    applyTransform();
    drawBg();
    atlasDraw(0, player.x - 18, ground - 77, 76, 77);
  }
  atlas.addEventListener('load', renderIntro);
  props.addEventListener('load', renderIntro);

  function clearInput() {
    heldKeys.clear();
    input = { x: 0, y: 0 };
    pointer = null;
    tapPointer = null;
    tapDirection = jumpBuffer = 0;
    jumpHeld = false;
    $stick.style.transform = 'translate(0,0)';
  }

  function pauseOnFocusLoss() {
    if (draftPanel.hidden) setPaused(true);
    else clearInput();
  }

  addEventListener('blur', pauseOnFocusLoss);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseOnFocusLoss();
  });

  function drawWarden() {
    if (wardenFade <= 0) return;
    ctx.save();
    ctx.globalAlpha = wardenFade;
    const wx = W - 66;
    const wy = ground - 118 + Math.sin(time * 2.6) * 8;

    const aura = ctx.createRadialGradient(wx, wy + 12, 8, wx, wy + 12, 76);
    aura.addColorStop(0, 'rgba(255, 86, 152, 0.36)');
    aura.addColorStop(1, 'rgba(255, 86, 152, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(wx - 76, wy - 64, 152, 152);

    // Tattered hooded silhouette
    ctx.fillStyle = '#181020';
    ctx.strokeStyle = '#6c3156';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(wx, wy - 36);
    ctx.quadraticCurveTo(wx + 24, wy - 12, wx + 22, wy + 44);
    for (let i = 3; i >= -3; i--) {
      const stripX = wx + i * 7;
      const wave = Math.sin(time * 6 + i * 1.4) * 5;
      ctx.lineTo(stripX, wy + 48 + (i % 2 === 0 ? 12 : 4) + wave);
    }
    ctx.lineTo(wx - 22, wy + 44);
    ctx.quadraticCurveTo(wx - 24, wy - 12, wx, wy - 36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing eyes
    ctx.shadowColor = '#ff5eaa';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffa2c4';
    ctx.beginPath();
    ctx.arc(wx - 7, wy - 13, 3, 0, Math.PI * 2);
    ctx.arc(wx + 4, wy - 13, 3, 0, Math.PI * 2);
    ctx.fill();

    // Lantern orb & incoming bolt telegraph
    const lanternX = wx - 26;
    const lanternY = nextWardenBoltY;
    const telegraphing = wardenTimer > 0 && wardenWaveTimer <= 0.65;
    if (telegraphing) {
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 118, 180, 0.38)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(lanternX, lanternY);
      ctx.lineTo(player.x + 80, lanternY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffb8d2';
      ctx.font = 'bold 11px system-ui';
      ctx.fillText(lanternY < ground - 30 ? 'SLIDE ↓' : 'JUMP ↑', lanternX - 58, lanternY - 10);
      ctx.restore();
    }

    ctx.fillStyle = telegraphing ? '#fff2b6' : '#ff79b0';
    ctx.beginPath();
    ctx.arc(lanternX, lanternY, telegraphing ? 7 + Math.sin(time * 28) * 2 : 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawWardenHud() {
    if (wardenTimer <= 0) return;
    ctx.save();
    const bw = 220;
    const bh = 24;
    const bx = W - bw - 14;
    const by = 62;
    ctx.fillStyle = '#180c19e0';
    ctx.strokeStyle = '#ff79b077';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 8);
    else ctx.rect(bx, by, bw, bh);
    ctx.fill();
    ctx.stroke();

    const pct = Math.max(0, Math.min(1, wardenTimer / 20));
    ctx.fillStyle = 'rgba(255, 102, 166, 0.34)';
    ctx.fillRect(bx + 3, by + 3, (bw - 6) * pct, bh - 6);
    ctx.fillStyle = '#ffd9e8';
    ctx.font = 'bold 11px system-ui';
    ctx.fillText(`CRYPT WARDEN · ${Math.ceil(wardenTimer)}s`, bx + 12, by + 16);
    ctx.restore();
  }

  function loop(now) {
    if (!running || paused) return;
    if (!draftPanel.hidden) {
      last = now;
      frame = requestAnimationFrame(loop);
      return;
    }

    const rawDt = Math.min((now - last) / 1000, 0.04);
    last = now;
    if (hitstop > 0 && !reducedMotion.matches) {
      hitstop = Math.max(0, hitstop - rawDt);
      frame = requestAnimationFrame(loop);
      return;
    }

    pollGamepad();
    applyTransform();
    ctx.clearRect(-200, -200, W + 400, H + 400);

    const dt = rawDt;
    time += dt;
    updateBiome(dt);

    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) {
        combo = 1;
        $combo.hidden = true;
      }
    }

    // Crypt Warden periodic chase event every 1000m
    if (distance >= nextWardenAt && wardenTimer <= 0) {
      nextWardenAt += 1000;
      wardenTimer = 20;
      wardenWaveTimer = 1.6;
      nextWardenBoltY = Math.random() < 0.5 ? ground - 43 : ground - 22;
      lastWardenSec = 20;
      GraveGainAudio?.sfx.warden();
      addCallout('CRYPT WARDEN PURSUIT!', W / 2 - 90, 120, '#ff9fb8');
      updateObjectiveHud();
    }
    if (wardenTimer > 0) {
      wardenTimer -= dt;
      wardenFade = Math.min(1, wardenFade + dt * 2.5);
      const sec = Math.max(0, Math.ceil(wardenTimer));
      if (sec !== lastWardenSec) {
        lastWardenSec = sec;
        updateObjectiveHud();
      }
      wardenWaveTimer -= dt;
      if (wardenWaveTimer <= 0) {
        wardenWaveTimer = 2.4;
        fireballs.push({ x: W - 92, y: nextWardenBoltY, nearMissed: false });
        nextWardenBoltY = Math.random() < 0.5 ? ground - 43 : ground - 22;
      }
      if (wardenTimer <= 0) {
        wardenTimer = 0;
        lastWardenSec = 0;
        bonusSigils += 3;
        for (let i = 0; i < 16; i++) {
          emit(W - 64, ground - 110 + (Math.random() - 0.5) * 60, '#ff9fb8', 2);
        }
        GraveGainAudio?.sfx.wardenEnd?.();
        boostCombo(0.5, 'WARDEN BANISHED +3 SIGILS', W / 2 - 115, 130);
        updateObjectiveHud();
      }
    } else if (wardenFade > 0) {
      wardenFade = Math.max(0, wardenFade - dt * 2.5);
    }

    parkourMomentum = Math.max(0, parkourMomentum - dt * (input.x < -0.2 ? 390 : 160));
    const cruiseSpeed = input.x > 0 ? 220 + (135 + (build.sprint || 0)) * input.x : 220 + 95 * input.x;
    const targetSpeed = cruiseSpeed + parkourMomentum;
    player.speed += (targetSpeed - player.speed) * (1 - Math.exp(-dt * (13 + (build.brake || 0))));
    if (wallGrip && !obstacles.includes(wallGrip)) wallGrip = null;
    const velocity = wallGrip ? 0 : player.speed;
    wallJumpLock = Math.max(0, wallJumpLock - dt);
    wallGrabGrace = Math.max(0, wallGrabGrace - dt);
    distance += dt * velocity * 0.38 * combo;
    stride += dt * (5 + velocity * 0.048);
    if (!player.jump && !wallGrip && Math.floor(stride / 3) !== lastStepStride) {
      lastStepStride = Math.floor(stride / 3);
      GraveGainAudio?.sfx.step();
    }
    landing = Math.max(0, landing - dt);
    if (!wallGrip) player.x += (238 + input.x * 35 - player.x) * (1 - Math.exp(-dt * 9));
    player.vault = Math.max(0, player.vault - dt);
    dropTimer = Math.max(0, dropTimer - dt);

    const vertical = tapPointer === null ? input.y : tapDirection;
    const wantsJump = vertical < -0.33;
    if (wantsJump && !jumpHeld) jumpBuffer = JUMP_BUFFER_SECONDS;
    jumpHeld = wantsJump;
    if (!player.jump && player.y <= ground) {
      coyote = COYOTE_SECONDS;
      launchCoyote = run.onLaunchLedge;
    }

    if (wallGrip && vertical > 0.45) {
      wallGrip.dropped = true;
      wallGrip = null;
      wallJumpLock = 0.35;
      player.vy = 180;
    }

    const vaultReach = 34 + velocity * 0.06;
    const vaultTarget = (!wallGrip && player.vault <= 0 && player.y >= ground - 28 && (jumpBuffer > 0 || vertical < -0.25))
      ? obstacles.find(o =>
          o.type === 'stump' && !o.vaulted &&
          o.x - (player.x + 36) <= vaultReach &&
          o.x + o.w - (player.x + 12) >= -6
        )
      : null;

    if (vaultTarget) {
      performVault(vaultTarget);
    } else if (wallGrip && jumpBuffer > 0) {
      wallGrip = null;
      wallJumpLock = 0.62;
      player.vy = -755 - (build.wall || 0);
      parkourMomentum = Math.max(parkourMomentum, 63);
      run.leavePlatform();
      player.jump = true;
      doubleJumpReady = Boolean(build.capstones?.wall);
      launchBoost = true;
      jumpCutApplied = false;
      jumpBuffer = coyote = 0;
      boostCombo(0.2, 'WALL JUMP', player.x + 20, player.y - 72);
      emit(player.x + 28, player.y - 24, '#9ef7d7', 9);
      GraveGainAudio?.sfx.wallJump();
    } else if (jumpBuffer > 0 && coyote > 0 && !wallGrip) {
      const isLaunch = launchCoyote;
      player.vy = -(isLaunch ? 830 : 575) - (build.jump || 0);
      run.leavePlatform();
      player.jump = true;
      launchBoost = isLaunch;
      if (sliding && isLaunch) parkourMomentum = Math.max(parkourMomentum, 55);
      jumpCutApplied = false;
      jumpBuffer = coyote = 0;
      if (isLaunch) {
        emit(player.x + 18, player.y, '#9ef7d7', 10, true);
        addCallout('LAUNCH!', player.x + 18, player.y - 68, '#9ef7d7');
        GraveGainAudio?.sfx.launch?.();
      } else {
        GraveGainAudio?.sfx.jump();
      }
    } else if (jumpBuffer > 0 && player.jump && doubleJumpReady && !wallGrip) {
      doubleJumpReady = false;
      player.vy = -540 - (build.jump || 0);
      jumpCutApplied = false;
      jumpBuffer = 0;
      emit(player.x + 18, player.y - 10, '#a7e8d4', 8);
      GraveGainAudio?.sfx.wallJump();
    }

    if (player.jump && !wantsJump && !jumpCutApplied && !launchBoost && player.vault <= 0 && player.vy < -420) {
      player.vy = -420;
      jumpCutApplied = true;
    }

    // Platform drop-through when pressing down on an upper platform
    if (!player.jump && player.y < ground && vertical > 0.45 && dropTimer <= 0) {
      run.leavePlatform();
      dropTimer = 0.16;
      coyote = 0;
      launchCoyote = false;
      player.y += 1;
      player.jump = true;
      player.vy = 180;
    }

    jumpBuffer = Math.max(0, jumpBuffer - dt);
    coyote = Math.max(0, coyote - dt);
    const previousY = player.y;
    if (vertical > 0.36 && player.jump && !wallGrip && player.vault === 0) {
      player.vy = Math.max(player.vy, 380);
    }
    player.vy += (player.vy < 0 ? 1130 : 1350) * dt;
    if (wallGrip) player.vy = Math.min(105, Math.max(0, player.vy));
    player.y += player.vy * dt;

    if (wallGrip) {
      if (player.y >= ground - 2) {
        if (wallGrabGrace > 0) {
          player.y = ground - 3;
          player.vy = 0;
        } else {
          wallGrip.dropped = true;
          wallGrip = null;
          wallJumpLock = 0.35;
        }
      } else if (player.y <= ground - wallGrip.h + 4) {
        player.y = ground - wallGrip.h;
        player.vy = 0;
        player.jump = false;
        wallGrip = null;
        wallJumpLock = 0.35;
      }
    }

    world += velocity * dt;
    run.advance(world, velocity * dt, W, ground, loot);
    const feetX = player.x + 20;
    const floor = run.surface(previousY, player.y, feetX, ground);
    const overPit = obstacles.some(o => o.type === 'gap' &&
      feetX > o.x - velocity * dt + 4 && feetX < o.x - velocity * dt + o.w - 4);
    if (overPit && floor.y === ground) floor.y = ground + 100;

    if (player.y > ground + 72) {
      crash();
      player.y = ground - 88;
      player.vy = -255;
      player.jump = true;
    }

    const wallTop = obstacles.find(o => {
      const left = o.x - velocity * dt;
      const top = ground - o.h;
      return o.type === 'climbwall' && feetX >= left && feetX <= left + o.w &&
        previousY <= top && player.y >= top;
    });
    if (wallTop && floor.y > ground - wallTop.h) floor.y = ground - wallTop.h;

    if (player.y >= floor.y && player.vy >= 0) {
      if (player.jump) {
        landing = 0.09;
        if (player.vy > 250) emit(feetX, floor.y - 2, '#d2c3ab', 5);
      }
      player.y = floor.y;
      player.vy = 0;
      player.jump = false;
      doubleJumpReady = false;
      jumpCutApplied = false;
      launchBoost = false;
      if (floor.visited) {
        record('platform');
        boostCombo(0.15);
      }
    } else {
      player.jump = true;
    }

    player.invuln = Math.max(0, player.invuln - dt);
    spawn -= dt;
    if (spawn <= 0) {
      spawnHazard();
      spawn = 1.15 + Math.random() * 1.05 - Math.min(distance / 18000, 0.3);
    }

    sliding = vertical > 0.36 && !player.jump;
    if (sliding && !wasSliding) {
      GraveGainAudio?.sfx.slide?.();
      parkourMomentum = Math.max(parkourMomentum, 38);
      player.speed = Math.min(player.speed + 22, 415 + (build.sprint || 0));
    }
    if (sliding && Math.random() < 0.4) {
      emit(player.x + 6, player.y - 2, '#9aa37c', 1);
    }
    wasSliding = sliding;

    for (const o of obstacles) {
      if (o.type === 'turret') updateTurret(o);
      const enemy = enemyTypes[o.type];
      if (!enemy) {
        o.x -= velocity * dt;
        continue;
      }
      const motion = GraveGainRun.enemyMotion(o, time, player.x);
      o.x -= (velocity + motion.speed) * dt;
      o.lift = motion.lift;
      o.tell = motion.tell;
      if (!o.passed && o.x + o.w <= player.x + 12) {
        o.passed = true;
        if (o.hitAt === undefined) record('enemy');
      }
    }
    obstacles = obstacles.filter(o => o.x + o.w > -20);

    const pickupRadiusX = 34 + (build.magnet || 0) + (build.capstones?.magnet ? 32 : 0);
    const pickupRadiusY = 46 + (build.magnet || 0) + (build.capstones?.magnet ? 48 : 0);
    for (const c of loot) c.x -= velocity * dt;
    for (let i = loot.length - 1; i >= 0; i--) {
      const c = loot[i];
      if (Math.abs(c.x - player.x) < pickupRadiusX && Math.abs(c.y - (player.y - 32)) < pickupRadiusY) {
        gems++;
        record('collect');
        $gems.textContent = gems;
        emit(c.x, c.y, '#efd87d', 9, true);
        GraveGainAudio?.sfx.shard(Math.round(combo * 2));
        loot.splice(i, 1);
      } else if (c.x < -20) {
        loot.splice(i, 1);
      }
    }

    if (!wallGrip && wallJumpLock === 0 && vertical <= 0.45) {
      wallGrip = obstacles.find(o => o.type === 'climbwall' && !o.dropped && player.y > ground - o.h + 3 &&
        player.x + 38 >= o.x && player.x + 12 < o.x + o.w) || null;
      if (wallGrip && player.y >= ground - 12) wallGrabGrace = 0.19;
    }
    if (wallGrip) {
      player.x = wallGrip.x - 37;
      player.jump = true;
      if (Math.random() < 0.45) emit(wallGrip.x, player.y - 22, '#9da684', 1);
    }

    updateFireballs(dt, velocity);

    const px = player.x + 12;
    const headY = player.y - (sliding ? 24 : 56);
    for (const o of obstacles) {
      if (o.type === 'arch' && !o.cleared && o.x + o.w <= px) {
        o.cleared = true;
        if (sliding && Math.abs(player.y - ground) < 4) {
          boostCombo(0.15, 'CLEAN SLIDE', player.x + 20, player.y - 44);
        }
      }
      if (o.type === 'turret' || o.type === 'climbwall' || o.vaulted || px + 26 <= o.x || px >= o.x + o.w) continue;
      if (o.type === 'arch') {
        if (headY < ground - o.clearance && player.y > ground - o.h) crash();
        continue;
      }
      const enemy = enemyTypes[o.type];
      if (enemy) {
        if (o.hitAt === undefined && player.y > ground - o.h - (o.lift || 0) + 12 && player.y - 48 < ground - (o.lift || 0)) {
          // Aerial stomp if falling onto the top of the enemy
          if (player.vy > 40 && previousY <= ground - o.h - (o.lift || 0) + 18) {
            o.hitAt = time;
            player.vy = -440;
            player.jump = true;
            launchBoost = true;
            parkourMomentum = Math.max(parkourMomentum, 56);
            if (!reducedMotion.matches) hitstop = 0.045;
            emit(o.x + o.w / 2, ground - o.h, enemy.color, 10);
            GraveGainAudio?.sfx.stomp();
            boostCombo(0.3, 'STOMP', o.x, ground - o.h - 20);
            record('enemy');
          } else {
            o.hitAt = time;
            for (let i = 0; i < 2; i++) {
              particles.push({ x: o.x + o.w / 2, y: ground - o.h / 2, vx: (i - 0.5) * 75, vy: -60, life: 0.45, size: 3, color: enemy.color, cell: enemy.effect + i });
            }
            crash();
          }
        }
        continue;
      }
      if (o.type === 'gap') continue;
      if (player.y > ground - o.h + 16) {
        if (o.type === 'stump' && (vertical < -0.15 || jumpBuffer > 0) && player.vault <= 0) {
          performVault(o);
        } else {
          crash();
        }
      }
    }

    const desiredLift = Math.max(0, 255 - player.y);
    cameraLift += (desiredLift - cameraLift) * (1 - Math.exp(-dt * 10));
    ctx.save();
    ctx.translate(0, cameraLift);
    drawBg(cameraLift);
    ctx.save();
    shake = Math.max(0, shake - dt);
    if (!reducedMotion.matches && shake > 0) ctx.translate(Math.sin(time * 96) * shake * 9, 0);
    run.draw(ctx, time);
    drawWarden();
    drawFireballs();
    for (const o of obstacles) {
      ctx.save();
      if (o.type !== 'gap') {
        ctx.shadowColor = '#f5b8688c';
        ctx.shadowBlur = 10;
      }
      drawObstacle(o);
      ctx.restore();
    }
    for (const c of loot) {
      ctx.shadowColor = '#ffe3a0';
      ctx.shadowBlur = 10;
      atlasDraw(c.cell, c.x - 12, c.y - 12 + Math.sin(time * 6 + c.x * 0.03) * 3, 24, 24, props);
      ctx.shadowBlur = 0;
    }

    // Shadow projected onto active floor surface (hidden over pits)
    if (!overPit || floor.y < ground) {
      const heightAbove = Math.max(0, floor.y - player.y);
      const shadowScale = Math.max(0.35, 1 - heightAbove / 280);
      ctx.fillStyle = `rgba(0,0,0,${(0.44 * shadowScale).toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(player.x + 18, floor.y + 2, 25 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const charCell = wallGrip ? 13 : heroFrame();
    if (!reducedMotion.matches && (player.vault > 0 || launchBoost || combo >= 1.8)) {
      trailTimer -= dt;
      if (trailTimer <= 0) {
        trailTimer = 0.035;
        trail.push({ x: player.x, y: player.y, cell: sliding ? 16 : charCell, sliding, life: 0.16 });
        if (trail.length > 5) trail.shift();
      }
    }
    for (let i = trail.length - 1; i >= 0; i--) {
      const t = trail[i];
      t.x -= velocity * dt * 0.25;
      t.life -= dt;
      if (t.life <= 0) {
        trail.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = (t.life / 0.16) * 0.34;
      ctx.shadowColor = player.vault > 0 ? '#ffe7a1' : '#8ff5ed';
      ctx.shadowBlur = 8;
      atlasDraw(t.cell, t.x - 18, t.y - (t.sliding ? 38 : 77), 76, t.sliding ? 38 : 77);
      ctx.restore();
    }

    ctx.save();
    ctx.shadowColor = '#a7e8d492';
    ctx.shadowBlur = 12;
    ctx.globalAlpha = player.invuln > 0 ? (Math.floor(time * 16) % 2 ? 0.45 : 0.95) : 1;
    atlasDraw(sliding ? 16 : charCell, player.x - 18, player.y - (sliding ? 38 : 77), 76, sliding ? 38 : 77);
    ctx.restore();

    if (build.armor > 0) {
      ctx.save();
      const cx = player.x + 20;
      const cy = player.y - (sliding ? 19 : 38);
      const rx = 28;
      const ry = sliding ? 18 : 34;
      ctx.strokeStyle = 'rgba(143, 245, 237, 0.38)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      const pips = Math.min(build.armor, 6);
      ctx.fillStyle = '#9ef7d7';
      ctx.shadowColor = '#8ff5ed';
      ctx.shadowBlur = 8;
      for (let i = 0; i < pips; i++) {
        const ang = time * 3.2 + (i * Math.PI * 2) / pips;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(ang) * rx, cy + Math.sin(ang) * ry, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      ctx.globalAlpha = Math.max(p.life * 2, 0);
      ctx.fillStyle = p.color;
      if (p.cell !== undefined) atlasDraw(p.cell, p.x - 8, p.y - 8, 16, 16, enemies, 10);
      else if (p.sparkle) atlasDraw(5, p.x - 12, p.y - 12, 24, 24, props);
      else ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.globalAlpha = 1;
      if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = callouts.length - 1; i >= 0; i--) {
      const c = callouts[i];
      c.y -= 28 * dt;
      c.life -= dt;
      ctx.globalAlpha = Math.max(0, Math.min(1, c.life * 1.5));
      ctx.fillStyle = c.color;
      ctx.font = 'bold 14px system-ui';
      ctx.fillText(c.text, c.x, c.y);
      ctx.globalAlpha = 1;
      if (c.life <= 0) callouts.splice(i, 1);
    }

    $score.textContent = Math.floor(distance);
    ctx.restore();
    ctx.restore();
    drawWardenHud();
    frame = requestAnimationFrame(loop);
  }

  renderIntro();
})();
