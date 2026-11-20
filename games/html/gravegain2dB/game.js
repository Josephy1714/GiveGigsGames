/* GraveGain2DB shell boot — mounts sim/mmo/missions/net/fx modules, menu first.
 * Mobile playable: floating crypt-stick (left 60%) + A/B runes + tap-to-loot,
 * thumb tabs + run-status drawer, viewport/touch CSS in game.css.
 * Vanilla JS, no imports/exports. Poll-guarded lookups: every module call is
 * typeof-guarded so the shell still boots when a lane file is missing.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  var VW = 960, VH = 540; // internal viewport; CSS scales it
  var BTN = { JUMP: 1, FIRE: 2, ALT: 4, DASH: 8, INTERACT: 16, SWAP: 32, RACE: 64, CLASS: 128 };

  function $(id) { return document.getElementById(id); }

  var S = {
    running: false, paused: false, raf: 0, last: 0, acc: 0,
    world: null, pid: 'p1', race: 'human', emoji: '🧑‍🚀',
    keys: {}, mouse: { x: VW / 2, y: VH / 2, down: false },
    stick: { active: false, id: null, sx: 0, sy: 0, x: 0, y: 0 },
    tap: { active: false, x: 0, y: 0 },
    tapEnabled: true, autoTarget: true, lootBoost: 0, interactHold: 0,
    gigglesSaveAt: 0,
    cam: { x: 1024, y: 576 }, _tapDown: null, tick: 0
  };
  try {
    S.autoTarget = localStorage.getItem('GraveGain2DB_autoTarget') !== '0';
    S.tapEnabled = localStorage.getItem('GraveGain2DB_tapMove') !== '0';
  } catch (e) { /* blocked storage: keep defaults */ }

  function engine() { return window.GraveGain2DB_Engine || null; }
  function buttons() {
    try {
      if (window.GraveGain2DB_Net && window.GraveGain2DB_Net.BUTTONS) return window.GraveGain2DB_Net.BUTTONS;
    } catch (e) { /* fallback below */ }
    return BTN;
  }

  function status() {
    var names = ['GraveGain2DB_Movement', 'GraveGain2DB_Player', 'GraveGain2DB_Engine',
      'GraveGain2DB_Mission1', 'GraveGain2DB_Net', 'GraveGain2DB_HUD'];
    var have = names.filter(function (n) { try { return !!window[n]; } catch (e) { return false; } });
    var el = $('simStatus');
    if (el) el.textContent = 'sim modules: ' + have.length + '/' + names.length + ' (' + have.join(', ') + ')';
  }

  function newWorld() {
    var E = engine();
    if (!E) return null;
    var w = E.createWorld((Date.now() ^ 0x2DB) >>> 0, { endlessDepth: 0 });
    E.addPlayer(w, S.pid, { x: E.WORLD_W / 2, y: E.WORLD_H / 2 });
    // Mission 1 flavour: seed extraction closed, checkpoint at spawn.
    w.checkpoints.push({ id: 'lz', x: E.WORLD_W / 2, y: E.WORLD_H / 2, claimedBy: [] });
    return w;
  }

  function player() { return (S.world && S.world.players) ? S.world.players[S.pid] : null; }

  function nearestEnemy(maxD) {
    if (!S.world) return null;
    var p = player();
    if (!p) return null;
    var best = null, bd = maxD || Infinity;
    for (var i = 0; i < S.world.enemies.length; i++) {
      var e = S.world.enemies[i];
      var d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function nearestPickup(maxD) {
    if (!S.world) return null;
    var p = player();
    if (!p) return null;
    var best = null, bd = maxD || Infinity;
    for (var i = 0; i < S.world.pickups.length; i++) {
      var k = S.world.pickups[i];
      if (k.taken) continue;
      var d = Math.hypot(k.x - p.x, k.y - p.y);
      if (d < bd) { bd = d; best = k; }
    }
    return best;
  }

  // B rune / tap-to-loot: yank the nearest pickup toward the player shell-side
  // (the sim auto-collects within 30u) and open a short loot window.
  function lootBurst(dist) {
    var pk = nearestPickup(dist || 260);
    var p = player();
    if (pk && p) {
      var dx = p.x - pk.x, dy = p.y - pk.y, d = Math.hypot(dx, dy) || 1;
      var yank = Math.min(140, d);
      pk.x += (dx / d) * yank; pk.y += (dy / d) * yank;
    }
    S.lootBoost = 60; // ~1s at 60Hz: steer-to-loot + interact assist
    S.interactHold = Math.max(S.interactHold, 12);
  }

  function buildInput() {
    var B = buttons();
    var p = player();
    var mx = 0, my = 0;
    if (S.keys.KeyA || S.keys.ArrowLeft) mx -= 1;
    if (S.keys.KeyD || S.keys.ArrowRight) mx += 1;
    if (S.keys.KeyW || S.keys.ArrowUp) my -= 1;
    if (S.keys.KeyS || S.keys.ArrowDown) my += 1;
    if (S.stick.active && (Math.abs(S.stick.x) > 0.02 || Math.abs(S.stick.y) > 0.02)) {
      mx = S.stick.x; my = S.stick.y;
    } else if (S.tap.active && S.tapEnabled && p) {
      var tx = S.tap.x - p.x, ty = S.tap.y - p.y, td = Math.hypot(tx, ty);
      var stop = S.lootBoost > 0 ? 30 : 24;
      if (td < stop) { S.tap.active = false; }
      else { mx = tx / td; my = ty / td; }
    }
    var m = Math.hypot(mx, my);
    if (m > 1) { mx /= m; my /= m; }

    // Aim: mouse on desktop; auto-aim nearest foe on touch when enabled.
    var aim = p ? p.aim : 0;
    var coarse = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);
    if (coarse && S.autoTarget && p) {
      var foe = nearestEnemy(420);
      if (foe) aim = Math.atan2(foe.y - p.y, foe.x - p.x);
      else if (m > 0.1) aim = Math.atan2(my, mx);
    } else if (p) {
      var rect = canvasRect();
      var scale = VW / Math.max(1, rect.w);
      var wx = S.cam.x + (S.mouse.x - VW / 2) * scale;
      var wy = S.cam.y + (S.mouse.y - VH / 2) * scale;
      aim = Math.atan2(wy - p.y, wx - p.x);
    }

    var b = 0;
    if (S.mouse.down || S.keys.Space) b |= B.FIRE;
    if (S.keys.ShiftLeft || S.keys.ShiftRight) b |= B.DASH;
    if (S.keys.KeyE) b |= B.INTERACT;
    if (S.keys.KeyF) b |= B.RACE;
    if (S.keys.KeyR || S.keys.KeyQ) b |= B.CLASS;
    if (S.runeFire) b |= B.FIRE;
    if (S.runeDash) b |= B.DASH;
    if (S.interactHold > 0) { b |= B.INTERACT; S.interactHold -= 1; }
    return { moveX: mx, moveY: my, aimAngle: aim, buttons: b };
  }

  function canvasRect() {
    var c = $('gameCanvas');
    if (!c) return { w: VW, h: VH, left: 0, top: 0 };
    var r = c.getBoundingClientRect();
    return { w: r.width || VW, h: r.height || VH, left: r.left, top: r.top };
  }

  function toWorld(clientX, clientY) {
    var r = canvasRect();
    var scale = VW / Math.max(1, r.w);
    var sx = (clientX - r.left - r.w / 2) * scale;
    var sy = (clientY - r.top - r.h / 2) * scale;
    return { x: S.cam.x + sx, y: S.cam.y + sy };
  }

  function step() {
    var E = engine();
    if (!E || !S.world) return;
    if (S.lootBoost > 0) {
      S.lootBoost -= 1;
      // Loot magnet: drift the nearest pickup toward the player while boosted.
      var pk = nearestPickup(300), p = player();
      if (pk && p) {
        var dx = p.x - pk.x, dy = p.y - pk.y, d = Math.hypot(dx, dy) || 1;
        pk.x += (dx / d) * 4; pk.y += (dy / d) * 4;
      }
      if (S.tap.active && p) {
        var gp = nearestPickup(200);
        if (gp) { S.tap.x = gp.x; S.tap.y = gp.y; }
      }
    }
    var inp = {};
    inp[S.pid] = buildInput();
    E.step(S.world, inp);
    S.tick = S.world.tick;
    var pl = player();
    if (pl && pl.gigglesSaved && !S.gigglesSaveNotified) {
      S.gigglesSaveNotified = true;
      S.gigglesSaveAt = S.tick;
    }
    if (pl) {
      var k = 1 - Math.exp(-5 / 60);
      S.cam.x += (pl.x - S.cam.x) * k;
      S.cam.y += (pl.y - S.cam.y) * k;
    }
  }

  var GLYPH = { husk: '🧟', spitter: '👻', brute: '👹', medkit: '➕', ammo: '🔫', shield: '🛡️' };

  function render() {
    var c = $('gameCanvas');
    if (!c) return;
    var g = c.getContext('2d');
    var floorLight = g.createRadialGradient(VW * 0.5, VH * 0.5, 40, VW * 0.5, VH * 0.5, VW * 0.63);
    floorLight.addColorStop(0, '#242b43');
    floorLight.addColorStop(0.65, '#11172c');
    floorLight.addColorStop(1, '#070814');
    g.fillStyle = floorLight;
    g.fillRect(0, 0, VW, VH);
    // Grid floor
    g.strokeStyle = 'rgba(120,80,180,0.18)';
    g.lineWidth = 1;
    var stepPx = 64;
    var ox = (VW / 2 - S.cam.x) % stepPx, oy = (VH / 2 - S.cam.y) % stepPx;
    g.beginPath();
    for (var gx = ox; gx < VW; gx += stepPx) { g.moveTo(gx, 0); g.lineTo(gx, VH); }
    for (var gy = oy; gy < VH; gy += stepPx) { g.moveTo(0, gy); g.lineTo(VW, gy); }
    g.stroke();

    function sx(x) { return x - S.cam.x + VW / 2; }
    function sy(y) { return y - S.cam.y + VH / 2; }
    g.textAlign = 'center'; g.textBaseline = 'middle';

    if (S.world) {
      var i, e;
      // Checkpoints / extraction
      for (i = 0; i < S.world.checkpoints.length; i++) {
        var cp = S.world.checkpoints[i];
        g.font = '22px "Segoe UI Emoji",system-ui,sans-serif';
        g.fillText('🚩', sx(cp.x), sy(cp.y));
      }
      if (S.world.objectives && S.world.objectives.extraction && S.world.objectives.extraction.open) {
        g.font = '26px "Segoe UI Emoji",system-ui,sans-serif';
        g.fillText('🚁', sx(S.world.objectives.extraction.x), sy(S.world.objectives.extraction.y));
      }
      // Tap destination marker
      if (S.tap.active) {
        g.font = '20px "Segoe UI Emoji",system-ui,sans-serif';
        g.fillText(S.lootBoost > 0 ? '✋' : '👆', sx(S.tap.x), sy(S.tap.y) - 14);
      }
      // Pickups
      for (i = 0; i < S.world.pickups.length; i++) {
        var pk = S.world.pickups[i];
        if (pk.taken) continue;
        g.font = '20px "Segoe UI Emoji",system-ui,sans-serif';
        g.fillText(GLYPH[pk.kind] || '❗', sx(pk.x), sy(pk.y));
      }
      // Enemies
      for (i = 0; i < S.world.enemies.length; i++) {
        e = S.world.enemies[i];
        g.font = '22px "Segoe UI Emoji",system-ui,sans-serif';
        g.fillText(GLYPH[e.kind] || '🧟', sx(e.x), sy(e.y));
        g.fillStyle = '#222'; g.fillRect(sx(e.x) - 16, sy(e.y) - 22, 32, 5);
        g.fillStyle = '#e53935';
        var frac = Math.max(0, e.hp / 60);
        g.fillRect(sx(e.x) - 16, sy(e.y) - 22, 32 * Math.min(1, frac), 5);
      }
      // Projectiles
      g.fillStyle = '#ffd54a';
      for (i = 0; i < S.world.projectiles.length; i++) {
        var pr = S.world.projectiles[i];
        g.fillRect(sx(pr.x) - 2, sy(pr.y) - 2, 4, 4);
      }
      // Player
      var p = player();
      if (p) {
        g.font = '26px "Segoe UI Emoji",system-ui,sans-serif';
        g.fillText(p.alive ? S.emoji : '💀', sx(p.x), sy(p.y));
        // Aim tick
        g.strokeStyle = 'rgba(255,255,255,0.5)';
        g.beginPath();
        g.moveTo(sx(p.x), sy(p.y));
        g.lineTo(sx(p.x) + Math.cos(p.aim) * 26, sy(p.y) + Math.sin(p.aim) * 26);
        g.stroke();
      }
    } else {
      g.fillStyle = '#fff'; g.font = '16px Outfit,system-ui,sans-serif';
      g.fillText('Press Deploy to breach.', VW / 2, VH / 2);
    }
    updateHud();
  }

  var hudTick = 0;
  function updateHud() {
    var p = player();
    var hp = p ? Math.max(0, Math.round(p.hp)) : 100;
    var bar = $('hudHpBar'), txt = $('hudHpText');
    if (bar) bar.style.width = Math.max(0, Math.min(100, hp)) + '%';
    if (txt) txt.textContent = hp + '/100';
    if ((hudTick++ % 10) !== 0) return;
    var kills = 0, rev = 0;
    if (S.world) {
      for (var id in S.world.players) {
        if (!Object.prototype.hasOwnProperty.call(S.world.players, id)) continue;
        kills += S.world.players[id].kills || 0;
        rev += S.world.players[id].revives || 0;
      }
      if ($('hudKillsText')) $('hudKillsText').textContent = String(kills);
      if ($('hudRevivesText')) $('hudRevivesText').textContent = String(rev);
      if ($('hudTickText')) $('hudTickText').textContent = 'tick ' + S.world.tick + ' · 👾' + S.world.enemies.length + ' · 📦' + S.world.pickups.length;
      var obj = 'Breach the MoonRock';
      try {
        if (window.GraveGain2DB_Mission1 && window.GraveGain2DB_Mission1.ZONES) obj = 'Mission 1: LZ Crash Site';
      } catch (e) { /* keep default */ }
      if (S.gigglesSaveAt && S.tick - S.gigglesSaveAt < 180) obj = '▰ GG · Giggles caught you: 1 HP + a brief shield';
      if ($('hudObjectiveText')) $('hudObjectiveText').textContent = obj;
    }
    renderDrawer();
  }

  function renderDrawer() {
    var bag = $('drawerBag');
    if (!bag || $('mobileDrawer').classList.contains('hidden')) return;
    var p = player();
    var kills = 0;
    if (S.world) {
      for (var id in S.world.players) {
        if (Object.prototype.hasOwnProperty.call(S.world.players, id)) kills += S.world.players[id].kills || 0;
      }
    }
    bag.innerHTML =
      '<div class="drawer-row"><span>' + S.emoji + ' ' + S.race + '</span><span>❤️ ' + (p ? Math.max(0, Math.round(p.hp)) : '—') + '</span></div>' +
      '<div class="drawer-row"><span>☠️ ' + kills + ' kills</span><span>tick ' + S.tick + '</span></div>' +
      '<div class="drawer-row"><span>🎯 Auto-target ' + (S.autoTarget ? 'ON' : 'OFF') + ' · 👆 Tap-move ' + (S.tapEnabled ? 'ON' : 'OFF') + '</span><button class="btn-game" id="drawerTargetBtn">🎯 Toggle</button></div>';
    var t = $('drawerTargetBtn');
    if (t) t.addEventListener('click', function () { setAutoTarget(!S.autoTarget); renderDrawer(); });
  }

  function loop(t) {
    if (!S.running || S.paused) return;
    var dt = Math.min(0.1, (t - S.last) / 1000 || 0.016);
    S.last = t;
    S.acc += dt;
    var n = 0;
    while (S.acc >= 1 / 60 && n < 4) { step(); S.acc -= 1 / 60; n += 1; }
    render();
    S.raf = requestAnimationFrame(loop);
  }

  function deploy() {
    var E = engine();
    if (!E) { status(); return; }
    S.world = newWorld();
    S.gigglesSaveAt = 0; S.gigglesSaveNotified = false;
    S.cam.x = E.WORLD_W / 2; S.cam.y = E.WORLD_H / 2;
    S.tap.active = false; S.lootBoost = 0; S.interactHold = 0;
    S.running = true; S.paused = false;
    try { if (window.GigglesHelpDraft) window.GigglesHelpDraft.present('gravegain2dB_legacy', S, render, true); } catch (e) { /* optional companion */ }
    S.last = performance.now(); S.acc = 0;
    cancelAnimationFrame(S.raf);
    S.raf = requestAnimationFrame(loop);
    var mp = $('menuPanel');
    if (mp) mp.classList.add('hidden');
  }

  function pauseForHelpDraft() {
    if (S.running) S.paused = true;
  }
  function resumeAfterHelpDraft() {
    if (!S.running || !S.paused) return;
    S.paused = false;
    S.last = performance.now();
    S.raf = requestAnimationFrame(loop);
  }
  S.pause = pauseForHelpDraft;
  S.resume = resumeAfterHelpDraft;

  function setAutoTarget(on) {
    S.autoTarget = !!on;
    try { localStorage.setItem('GraveGain2DB_autoTarget', S.autoTarget ? '1' : '0'); } catch (e) {}
    syncToggles();
  }
  function setTapMove(on) {
    S.tapEnabled = !!on;
    if (!on) S.tap.active = false;
    try { localStorage.setItem('GraveGain2DB_tapMove', S.tapEnabled ? '1' : '0'); } catch (e) {}
    syncToggles();
  }
  function syncToggles() {
    var t = $('thumbTargetBtn'), m = $('thumbTapBtn');
    if (t) {
      t.setAttribute('aria-pressed', String(S.autoTarget));
      var ts = t.querySelector('span'); if (ts) ts.textContent = S.autoTarget ? 'Target:ON' : 'Target:OFF';
    }
    if (m) {
      m.setAttribute('aria-pressed', String(S.tapEnabled));
      var ms = m.querySelector('span'); if (ms) ms.textContent = S.tapEnabled ? 'Tap:ON' : 'Tap:OFF';
    }
  }

  function bindInput() {
    window.addEventListener('keydown', function (e) {
      S.keys[e.code] = true;
      S.tap.active = false; // stick/key input cancels a pending tap destination
      if (e.code === 'KeyE') S.interactHold = Math.max(S.interactHold, 6);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) >= 0) e.preventDefault();
    });
    window.addEventListener('blur', function () {
      S.keys = {};
      S.mouse.down = false;
    });
    window.addEventListener('keyup', function (e) { S.keys[e.code] = false; });

    var container = $('canvasContainer');
    var canvas = $('gameCanvas');
    function mousePoint(ev) {
      var r = canvasRect();
      return {
        x: (ev.clientX - r.left) * (VW / Math.max(1, r.w)),
        y: (ev.clientY - r.top) * (VH / Math.max(1, r.h))
      };
    }
    container.addEventListener('mousemove', function (e) {
      var pt = mousePoint(e);
      S.mouse.x = pt.x; S.mouse.y = pt.y;
    });
    container.addEventListener('mousedown', function (e) { if (e.button === 0) S.mouse.down = true; });
    window.addEventListener('mouseup', function () { S.mouse.down = false; });
    container.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    // ---- Floating crypt-stick + tap-to-move / tap-to-loot ----
    var stickBase = $('cryptStickBase'), stickKnob = $('cryptStickKnob'), tapMarker = $('cryptTapMarker');
    function isOnButton(t) {
      return !!(t.target && t.target.closest && t.target.closest('.rune-cluster,.thumb-tabs,.mobile-drawer,button'));
    }
    function flashTap(cx, cy) {
      if (!tapMarker) return;
      tapMarker.style.left = cx + 'px'; tapMarker.style.top = cy + 'px';
      tapMarker.classList.remove('on');
      void tapMarker.offsetWidth;
      tapMarker.classList.add('on');
      clearTimeout(S._tapFlashT);
      S._tapFlashT = setTimeout(function () { tapMarker.classList.remove('on'); }, 600);
    }
    container.addEventListener('touchstart', function (e) {
      if (!S.running || S.paused) return;
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (isOnButton(t)) continue;
        var r = canvasRect();
        var cx = t.clientX - r.left, cy = t.clientY - r.top;
        if (!S.stick.active && cx < r.width * 0.6) {
          S.stick.active = true; S.stick.id = t.identifier;
          S.stick.sx = t.clientX; S.stick.sy = t.clientY;
          S.stick.x = 0; S.stick.y = 0;
          S.tap.active = false;
          if (stickBase) {
            stickBase.style.left = cx + 'px'; stickBase.style.top = cy + 'px';
            stickBase.classList.add('on');
          }
          S._tapDown = { id: t.identifier, x: t.clientX, y: t.clientY, at: performance.now() };
        } else if (S.tapEnabled && !S._tapDown) {
          S._tapDown = { id: t.identifier, x: t.clientX, y: t.clientY, at: performance.now() };
        }
      }
    }, { passive: true });

    container.addEventListener('touchmove', function (e) {
      if (S.stick.active) {
        for (var i = 0; i < e.touches.length; i++) {
          var t = e.touches[i];
          if (t.identifier !== S.stick.id) continue;
          var dx = t.clientX - S.stick.sx, dy = t.clientY - S.stick.sy;
          var raw = Math.hypot(dx, dy);
          if (raw > 8 && S._tapDown && S._tapDown.id === t.identifier) S._tapDown.moved = true;
          var maxR = 56, dist = Math.min(raw, maxR);
          var ang = Math.atan2(dy, dx), mag = dist / maxR;
          var eased = mag < 0.18 ? 0 : Math.min(1, (mag - 0.18) / 0.82);
          S.stick.x = Math.cos(ang) * eased; S.stick.y = Math.sin(ang) * eased;
          if (stickKnob) {
            stickKnob.style.left = (50 + S.stick.x * 32) + '%';
            stickKnob.style.top = (50 + S.stick.y * 32) + '%';
          }
          if (raw > 4) S.tap.active = false;
        }
      }
      if (S._tapDown && !S.stick.active) {
        for (var j = 0; j < e.touches.length; j++) {
          var u = e.touches[j];
          if (u.identifier === S._tapDown.id &&
            Math.hypot(u.clientX - S._tapDown.x, u.clientY - S._tapDown.y) > 14) S._tapDown.moved = true;
        }
      }
      if (e.cancelable && S.stick.active) e.preventDefault();
    }, { passive: false });

    function endTouch(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier === S.stick.id) {
          if (S._tapDown && !S._tapDown.moved && performance.now() - S._tapDown.at < 260 && S.tapEnabled) {
            var r = canvasRect(), w = toWorld(t.clientX, t.clientY);
            S.tap.active = true; S.tap.x = w.x; S.tap.y = w.y;
            flashTap(t.clientX - r.left, t.clientY - r.top);
          }
          S.stick.active = false; S.stick.id = null;
          S.stick.x = 0; S.stick.y = 0;
          if (stickBase) stickBase.classList.remove('on');
        } else if (S._tapDown && t.identifier === S._tapDown.id) {
          var quick = performance.now() - S._tapDown.at < 280 && !S._tapDown.moved;
          if (quick && S.tapEnabled && !isOnButton(t)) {
            var r2 = canvasRect(), w2 = toWorld(t.clientX, t.clientY);
            S.tap.active = true; S.tap.x = w2.x; S.tap.y = w2.y;
            flashTap(t.clientX - r2.left, t.clientY - r2.top);
            lootBurst(320); // tap-to-loot: steer to the tap + magnet the nearest drop
          }
        }
        if (S._tapDown && t.identifier === S._tapDown.id) S._tapDown = null;
      }
    }
    container.addEventListener('touchend', endTouch);
    container.addEventListener('touchcancel', endTouch);

    // ---- A/B runes ----
    function bindHold(el, down, up) {
      if (!el) return;
      el.addEventListener('touchstart', function (e) { e.preventDefault(); e.stopPropagation(); down(); }, { passive: false });
      el.addEventListener('touchend', function (e) { e.preventDefault(); if (up) up(); }, { passive: false });
      el.addEventListener('touchcancel', function () { if (up) up(); });
      el.addEventListener('mousedown', function (e) { e.preventDefault(); down(); });
      el.addEventListener('mouseup', function () { if (up) up(); });
    }
    bindHold($('runeBtnA'), function () { S.runeFire = true; }, function () { S.runeFire = false; });
    bindHold($('runeBtnB'), function () { S.tap.active = false; lootBurst(260); });
    bindHold($('mobileDashBtn'), function () { S.runeDash = true; }, function () { S.runeDash = false; });
    bindHold($('mobileAbilityBtn'), function () { S.keys.KeyF = true; }, function () { S.keys.KeyF = false; });

    // ---- Thumb tabs + drawer ----
    var drawer = $('mobileDrawer');
    function openDrawer() {
      if (!drawer) return;
      drawer.classList.remove('hidden');
      $('thumbBagBtn').classList.add('active');
      renderDrawer();
    }
    $('thumbBagBtn').addEventListener('click', function () {
      if (!drawer) return;
      if (drawer.classList.contains('hidden')) openDrawer();
      else { drawer.classList.add('hidden'); $('thumbBagBtn').classList.remove('active'); }
    });
    $('mobileDrawerClose').addEventListener('click', function () {
      drawer.classList.add('hidden'); $('thumbBagBtn').classList.remove('active');
    });
    $('thumbTargetBtn').addEventListener('click', function () { setAutoTarget(!S.autoTarget); });
    $('thumbTapBtn').addEventListener('click', function () { setTapMove(!S.tapEnabled); });
    syncToggles();
  }

  function bindChrome() {
    $('btnDeploy').addEventListener('click', deploy);
    $('btnRestart').addEventListener('click', function () {
      var mp = $('menuPanel');
      if (mp) mp.classList.remove('hidden');
      deploy();
    });
    $('btnPause').addEventListener('click', function () {
      if (!S.running) return;
      S.paused = !S.paused;
      $('btnPause').textContent = S.paused ? '▶️ Resume' : '⏸️ Pause';
      if (!S.paused) { S.last = performance.now(); S.raf = requestAnimationFrame(loop); }
    });
    var row = $('raceRow');
    if (row) row.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-race]') : null;
      if (!b) return;
      S.race = b.dataset.race;
      S.emoji = { human: '🧑‍🚀', elf: '🧝', dwarf: '🧔', orc: '👹' }[S.race] || '🧑‍🚀';
      row.querySelectorAll('[data-race]').forEach(function (x) {
        var on = x === b;
        x.classList.toggle('selected', on);
        x.setAttribute('aria-pressed', String(on));
      });
    });
    var fs = $('gg2db-fullscreen-btn'), box = $('canvasContainer');
    if (fs && box) fs.addEventListener('click', function () {
      try {
        if (!document.fullscreenElement) {
          var p = box.requestFullscreen ? box.requestFullscreen() : null;
          if (p && p.catch) p.catch(function () {});
        } else document.exitFullscreen();
      } catch (e) { /* ignore */ }
    });
  }

  window.addEventListener('DOMContentLoaded', function () {
    status();
    bindInput();
    bindChrome();
    render();
  });
  window.GraveGain2DBLegacy = { getState: function () { return S; }, deploy: deploy, render: render, pause: pauseForHelpDraft, resume: resumeAfterHelpDraft };
})();
