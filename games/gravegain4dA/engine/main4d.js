(function () {
    'use strict';
    if (window.GG4D_Main) return;

    // GraveGain4D bootstrap + rAF loop.
    // Wires every GG4D_* / GraveGain4D* global the other modules publish:
    //   engine   GG4D_Putt (+ optional GG4D_Engine w/ update(dt, input))
    //   graphics GraveGain4DGraphics (+ renderer/camera when provided)
    //   entities GG4D_Entities (optional registry w/ update(dt))
    //   world    GraveGain4DWorlds (optional w/ update(dt))
    //   campaign GraveGain4DMissions (mission list for the HUD tracker)
    //   ui       GG4D_HUD, GG4D_Touch, GG4D_Sound / GG4D_SoundBus
    // Pauses on hidden tab; resize + fullscreenchange refit camera aspect
    // and renderer size ONLY (never requests fullscreen). No fullscreen /
    // dblclick code anywhere in this module. Never throws.

    function pick() {
        var out = {};
        try {
            var w = window;
            out.putt = w.GG4D_Putt || null;
            out.input = w.GG4D_Input4D || null;
            out.sliceRenderer = w.GraveGain4DSliceRenderer || null;
            out.dungeonGenerator = w.GraveGain4D && w.GraveGain4D.HyperDungeonGenerator || null;
            out.engine = w.GG4D_Engine || null;
            out.graphics = w.GraveGain4DGraphics || w.GG4D_Graphics || null;
            out.entities = w.GG4D_Entities || null;
            out.world = w.GraveGain4DWorlds || w.GG4D_World || null;
            out.campaign = w.GraveGain4DMissions || w.GG4D_Campaign || null;
            out.HUD = w.GG4D_HUD || null;
            out.Touch = w.GG4D_Touch || null;
            out.Sound = w.GG4D_Sound || null;
            out.soundBus = w.GG4D_SoundBus || null;
        } catch (e) { /* ignore */ }
        return out;
    }

    function Main4D(opts) {
        opts = opts || {};
        this.opts = opts;
        this.mods = pick();
        this.hud = null; this.touch = null; this.sound = null; this.input = null;
        this.putt = null;
        this.graphicsHandle = null;
        this.worldMap = null;
        this.running = false; this.paused = false;
        this._raf = 0; this._last = 0;
        this.elapsed = 0;
        this.state = {
            hp: 100, maxHp: 100, stamina: 100, maxStamina: 100,
            gold: 0, killCredits: 0, w: 0, wMin: 0, wMax: 3,
            strokes: 0, par: 3, chronoSand: 1, brane: 'prime', boss: null
        };
        this._onVis = null; this._onResize = null; this._onFsChange = null;
    }

    Main4D.prototype._refit = function () {
        // Camera aspect + renderer size only. Never requests fullscreen.
        try {
            var g = this.mods.graphics;
            var box = null;
            try { box = document.getElementById('canvasContainer'); } catch (e) { /* ignore */ }
            var w = (box && box.clientWidth) || window.innerWidth || 800;
            var h = (box && box.clientHeight) || window.innerHeight || 600;
            var cam = this.camera || null;
            try { if (!cam && g) cam = g.camera || (typeof g.getCamera === 'function' ? g.getCamera() : null); } catch (e) { /* ignore */ }
            if (cam) {
                if (isFinite(w / h)) { cam.aspect = w / h; }
                if (typeof cam.updateProjectionMatrix === 'function') cam.updateProjectionMatrix();
            }
            var ren = this.renderer || (g && (g.renderer || (typeof g.getRenderer === 'function' ? g.getRenderer() : null)));
            if (ren) {
                // Perf cap (mobile): never exceed 1.5x DPR on touch devices.
                try {
                    var isTouch = (document.body && document.body.classList.contains('gg4d-mobile')) ||
                        (window.GG4D_MOBILE_PERF && window.GG4D_MOBILE_PERF.pixelRatioCap);
                    if (isTouch && typeof ren.setPixelRatio === 'function') {
                        ren.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
                    }
                } catch (e) { /* ignore */ }
                if (this.mods.sliceRenderer && this.graphicsHandle && typeof this.mods.sliceRenderer.resizeSliceRenderer === 'function') {
                    this.mods.sliceRenderer.resizeSliceRenderer(this.graphicsHandle, w, h, cam);
                } else if (typeof ren.setSize === 'function') ren.setSize(w, h, false);
                else if (ren.domElement) { ren.domElement.width = w; ren.domElement.height = h; }
            }
        } catch (e) { /* ignore */ }
    };

    Main4D.prototype.init = function (opts) {
        try {
            opts = opts || this.opts || {};
            this.mods = pick();
            var M = this.mods;
            // Engine: putt instance (fresh per boot unless caller passes one).
            try {
                if (opts.putt) this.putt = opts.putt;
                else if (M.putt && typeof M.putt === 'function') this.putt = new M.putt(opts.puttOpts || {});
                else this.putt = M.putt || null;
            } catch (e) { this.putt = null; }
            if (this.putt && this.putt.par !== undefined) this.state.par = this.putt.par;
            this.state.mission = opts.mission || 1;
            this.state.race = opts.race || 'human';
            this.state.cls = opts.cls || 'warrior';
            this.state.mode = opts.mode || 'campaign';
            try {
                this.timefold = new window.GG4D_Timefold();
                this.branes = new window.GG4D_Branes();
                this.branes.addPortal(0, 0, 0, 0);
                this.branes.addPortal(24, 0, 24, 1);
            } catch (e) { this.timefold = null; this.branes = null; }
            // Build the playable projected slice and connect the desktop input
            // module to the same putt instance used by the simulation.
            try {
                var canvas = document.getElementById('gameCanvas');
                var box = document.getElementById('canvasContainer');
                var SR = M.sliceRenderer;
                if (SR && typeof SR.createSliceRenderer === 'function' && canvas) {
                    this.graphicsHandle = SR.createSliceRenderer({
                        canvas: canvas,
                        width: (box && box.clientWidth) || 1000,
                        height: (box && box.clientHeight) || 600
                    });
                    this.renderer = this.graphicsHandle && this.graphicsHandle.renderer;
                    this.scene = this.graphicsHandle && this.graphicsHandle.scene;
                    this.camera = this.graphicsHandle && this.graphicsHandle.camera;
                    var HD = M.dungeonGenerator;
                    if (HD) {
                        var generator = new HD();
                        this.worldMap = generator.generate({ seed: opts.seed || Date.now(), floorNum: 1 });
                        if (this.worldMap && this.worldMap.rooms) {
                            this.worldMap.rooms = this.worldMap.rooms.map(function (room) {
                                return Object.assign({}, room, {
                                    x: room.cx || 0,
                                    z: room.cy || 0,
                                    hx: 0.48,
                                    hz: 0.48,
                                    h: 18,
                                    w: room.gw
                                });
                            });
                        }
                        var spawn = this.worldMap && this.worldMap.spawnRoom;
                        if (spawn && this.putt && typeof this.putt.placeBall === 'function') {
                            this.putt.placeBall(spawn.cx, 1, spawn.cy, spawn.gw);
                        }
                    }
                }
            } catch (e) { this.graphicsHandle = null; }
            try {
                if (M.input && typeof M.input === 'function') {
                    this.input = new M.input({
                        container: document.getElementById('canvasContainer'),
                        putt: this.putt,
                        timefold: this.timefold,
                        branes: this.branes,
                        playerPos: function () { return this.putt && this.putt.ball || { x: 0, y: 0, z: 0, w: 0 }; }.bind(this)
                    });
                }
            } catch (e) { this.input = null; }
            // Renderer/camera passthrough (owned by the host page or graphics module).
            this.renderer = opts.renderer || this.renderer || null;
            this.camera = opts.camera || this.camera || null;
            // UI: HUD.
            try {
                if (M.HUD && typeof M.HUD === 'function') {
                    this.hud = new M.HUD({ container: opts.hudContainer || null });
                    this.hud.mount(opts.hudContainer || null);
                    this._seedMission();
                }
            } catch (e) { this.hud = null; }
            // UI: touch (mobile scheme: swipe-to-rotate 4D + phase thumb keys).
            // Coarse pointers auto-mount; settingsTouchMode always/never
            // overrides. Swipe -> yaw/pitch + XW/ZW planes, tap -> attack.
            try {
                if (M.Touch && typeof M.Touch === 'function') {
                    var self = this;
                    this.rot4d = { xw: 0, zw: 0 };
                    this.touch = new M.Touch({
                        onButton: function (name, down) { try { self._onTouchButton(name, down); } catch (e) { /* ignore */ } },
                        onMove: function (mv) { try { self._touchMove = mv; } catch (e) { /* ignore */ } },
                        onRotate: function (r) { try { self._onTouchRotate(r); } catch (e) { /* ignore */ } },
                        onTap: function (pt) { try { self._onTouchTap(pt); } catch (e) { /* ignore */ } }
                    });
                    // Perf cap (mobile): clamp devicePixelRatio before first
                    // render so phones never pay desktop 2x fill-rate.
                    try {
                        var coarse = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
                            (navigator && navigator.maxTouchPoints > 0);
                        if (coarse && window.GG4D_MOBILE_PERF === undefined) {
                            window.GG4D_MOBILE_PERF = { pixelRatioCap: 1.5, fxCap: 12, scheme: 'swipe-rotate-4d+phase-thumbs' };
                        }
                        if (coarse && this.graphicsHandle && this.graphicsHandle.renderer &&
                            typeof this.graphicsHandle.renderer.setPixelRatio === 'function') {
                            this.graphicsHandle.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
                        }
                    } catch (e) { /* ignore */ }
                    this.touch.mount(opts.touchContainer || document.getElementById('canvasContainer') || null);
                    if (!this.touch.root) this.touch = this.touch; // keep for snapshot() even when unmounted
                }
            } catch (e) { this.touch = null; }
            // UI: audio (lazy context; resumes on first gesture).
            try {
                if (opts.sound) this.sound = opts.sound;
                else if (M.soundBus) this.sound = M.soundBus;
                else if (M.Sound && typeof M.Sound === 'function') this.sound = new M.Sound();
                if (this.sound && typeof this.sound.bindFirstGesture === 'function') this.sound.bindFirstGesture();
            } catch (e) { this.sound = null; }
            // Lifecycle: pause on hidden tab; refit on resize/fullscreenchange.
            var self2 = this;
            this._onVis = function () {
                try { document.hidden ? self2.pause() : self2.resume(); } catch (e) { /* ignore */ }
            };
            this._onResize = function () { try { self2._refit(); } catch (e) { /* ignore */ } };
            this._onFsChange = function () { try { self2._refit(); } catch (e) { /* ignore */ } };
            try { document.addEventListener('visibilitychange', this._onVis); } catch (e) { /* ignore */ }
            try { window.addEventListener('resize', this._onResize); } catch (e) { /* ignore */ }
            try { document.addEventListener('fullscreenchange', this._onFsChange); } catch (e) { /* ignore */ }
            try { this._refit(); } catch (e) { /* ignore */ }
            return true;
        } catch (e) { return false; }
    };

    Main4D.prototype._seedMission = function () {
        try {
            if (!this.hud || typeof this.hud.setMission !== 'function') return;
            var C = this.mods.campaign;
            var list = C && (C.MISSIONS || C.missions || (typeof C.list === 'function' ? C.list() : null));
            var m = (list && list[0]) || null;
            if (m) this.hud.setMission(m.title || 'Mission 1', m.objectives || []);
        } catch (e) { /* ignore */ }
    };

    Main4D.prototype._onTouchButton = function (name, down) {
        try {
            if (name === 'ana' || name === 'kata') {
                // Phase thumb keys: press-and-hold steps w continuously in
                // _tick; the tap here gives instant feedback + sfx.
                if (this.putt && this.putt.ball) {
                    var dir = name === 'ana' ? -1 : 1;
                    this.putt.ball.w = Math.max(this.putt.wMin !== undefined ? this.putt.wMin : 0,
                        Math.min(this.putt.wMax !== undefined ? this.putt.wMax : 3,
                            (this.putt.ball.w || 0) + (down ? dir * 0.25 : 0)));
                    this.state.w = this.putt.ball.w;
                }
                if (down) {
                    if (this.sound) this.sound.playSfx('wshift');
                    if (this.hud) this.hud.popup(name === 'ana' ? 'ana ⇠' : '⇢ kata', 'wshift');
                }
                return;
            }
            if (!down) return;
            if (name === 'putt') this.doPutt();
            else if (name === 'atk') this._touchAttack(null);
            else if (name === 'jump' && this.input) this.input.jumpPressed = true;
            else if (name === 'rewind') {
                if (this.sound) this.sound.playSfx('rewind');
                if (this.hud) this.hud.popup('rewind', 'info');
            }
        } catch (e) { /* ignore */ }
    };

    // Swipe-to-rotate 4D: 1-finger deltas steer yaw/pitch (+ putt aim),
    // 2-finger deltas accumulate XW/ZW plane angles for the slice view.
    Main4D.prototype._onTouchRotate = function (r) {
        try {
            if (!r) return;
            if (!this.rot4d) this.rot4d = { xw: 0, zw: 0 };
            if (r.dXW) this.rot4d.xw += r.dXW;
            if (r.dZW) this.rot4d.zw += r.dZW;
            if ((r.dYaw || r.dPitch) && this.input) {
                this.input.yaw = (this.input.yaw || 0) - (r.dYaw || 0);
                var lim = Math.PI / 2.3;
                this.input.pitch = Math.max(-lim, Math.min(lim, (this.input.pitch || 0) - (r.dPitch || 0)));
                this.input.lastLookDelta = (this.input.lastLookDelta || 0) + Math.abs(r.dYaw || 0) * 200 + Math.abs(r.dPitch || 0) * 200;
                if (this.putt && typeof this.putt.setAim === 'function') {
                    var cp = Math.cos(this.input.pitch);
                    this.putt.setAim(Math.sin(this.input.yaw) * cp, Math.sin(this.input.pitch), Math.cos(this.input.yaw) * cp, this.putt.aim ? (this.putt.aim.w || 0) : 0);
                }
                var p = window.GG4D_Game && window.GG4D_Game.player;
                if (p) { p.yaw = this.input.yaw; p.pitch = this.input.pitch; }
            }
            try { window.GG4D_Rot4D = { xw: this.rot4d.xw, zw: this.rot4d.zw }; } catch (e) { /* ignore */ }
        } catch (e) { /* ignore */ }
    };

    // Tap-to-attack tesseract foes: try melee first (nearest in-slice foe
    // in the facing cone, or the tapped screen foe), fall back to putt.
    Main4D.prototype._onTouchTap = function (pt) {
        try {
            var res = this._touchAttack(pt);
            if (!res || !res.didAttack) this.doPutt();
        } catch (e) { /* ignore */ }
    };

    Main4D.prototype._touchAttack = function (pt) {
        try {
            var Melee = window.GG4D_Melee;
            if (!Melee || typeof Melee.tryAttack !== 'function') return null;
            var ball = (this.putt && this.putt.ball) || { x: 0, y: 0, z: 0, w: 0 };
            var yaw = (this.input && this.input.yaw) || 0;
            var player = (window.GG4D_Game && window.GG4D_Game.player) || {
                x: ball.x, y: ball.y, z: ball.z, w: ball.w,
                yaw: yaw, classType: (this.state && this.state.cls) || 'warrior'
            };
            player.x = ball.x; player.z = ball.z; player.w = ball.w;
            player.yaw = yaw;
            var foes = [];
            try {
                if (window.GG4D_Game && window.GG4D_Game.enemies && window.GG4D_Game.enemies.length) foes = window.GG4D_Game.enemies;
                else if (this.worldMap && this.worldMap.entities) foes = this.worldMap.entities;
                else if (this.worldMap && this.worldMap.monsters) foes = this.worldMap.monsters;
            } catch (e) { foes = []; }
            // Tapped-screen priority: if a tap point hit a billboard, aim
            // at the nearest in-slice foe to the tap ray first.
            var aimDir = { x: Math.sin(yaw), y: 0, z: Math.cos(yaw) };
            if (pt && foes.length && this.camera && this.graphicsHandle) {
                try {
                    var box = document.getElementById('canvasContainer');
                    var r = box ? box.getBoundingClientRect() : { left: 0, top: 0, width: 1, height: 1 };
                    var nx = ((pt.x - r.left) / Math.max(1, r.width)) * 2 - 1;
                    var best = null, bestD = 1e9;
                    for (var i = 0; i < foes.length; i++) {
                        var f = foes[i];
                        if (!f || f.hp <= 0) continue;
                        if (Math.abs((f.w || 0) - (ball.w || 0)) > 2.5) continue; // off-slice tesseract
                        var v = { x: (f.x || 0) - (ball.x || 0), z: (f.z || 0) - (ball.z || 0) };
                        var screenX = (v.x * Math.cos(yaw) - v.z * Math.sin(yaw)) / (Math.hypot(v.x, v.z) || 1);
                        var d = Math.abs(screenX - nx * 0.8);
                        if (d < bestD) { bestD = d; best = f; }
                    }
                    if (best && bestD < 0.6) {
                        var bx = (best.x || 0) - (ball.x || 0), bz = (best.z || 0) - (ball.z || 0);
                        var bl = Math.hypot(bx, bz) || 1;
                        aimDir = { x: bx / bl, y: 0, z: bz / bl };
                    }
                } catch (e) { /* aim fallback */ }
            }
            var out = Melee.tryAttack(player, foes, aimDir, { game: window.GG4D_Game || this });
            try {
                if (out && out.didAttack) {
                    if (this.sound) this.sound.playSfx('swing');
                    if (this.hud && out.hits && !out.hits.length) this.hud.popup('whiff — off-slice?', 'info');
                }
            } catch (e) { /* ignore */ }
            return out;
        } catch (e) { return null; }
    };

    Main4D.prototype.doPutt = function (power) {
        try {
            if (this.putt && typeof this.putt.startCharge === 'function' && typeof this.putt.releasePutt === 'function') {
                if (this.putt.isMoving && this.putt.isMoving()) return null;
                if (!this.putt.startCharge()) return null;
                if (typeof power === 'number' && isFinite(power)) {
                    this.putt.holdCharge(Math.max(0, Math.min(1, power / Math.max(1, this.putt.maxPower || 22))));
                } else {
                    this.putt.holdCharge(0.45);
                }
                var result = this.putt.releasePutt();
                this.state.strokes = this.putt.strokes | 0;
                if (this.sound) this.sound.playSfx('putt');
                return result;
            }
            return null;
        } catch (e) { return null; }
    };

    Main4D.prototype._tick = function (dt) {
        try {
            var M = this.mods;
            var touchSnap = null;
            try { touchSnap = this.touch ? this.touch.snapshot() : null; } catch (e) { touchSnap = null; }
            var input = touchSnap;
            // Engine / world / entities updates (all optional, all guarded).
            try {
                if (this.input && typeof this.input.moveAxes === 'function') {
                    var kb = this.input.moveAxes();
                    // Merge joystick move when keys are idle (mobile playable).
                    var mv = (touchSnap && touchSnap.move) || this._touchMove || null;
                    if (mv && !kb.forward && !kb.strafe) {
                        kb.forward = -(mv.y || 0);
                        kb.strafe = (mv.x || 0);
                    }
                    // Phase thumb-key hold: continuous ana/kata w-step.
                    if (touchSnap && touchSnap.buttons && (touchSnap.buttons.ana || touchSnap.buttons.kata) && this.putt && this.putt.ball) {
                        var pdir = touchSnap.buttons.kata ? 1 : -1;
                        this.putt.ball.w = Math.max(this.putt.wMin !== undefined ? this.putt.wMin : 0,
                            Math.min(this.putt.wMax !== undefined ? this.putt.wMax : 3,
                                (this.putt.ball.w || 0) + pdir * dt * 1.5));
                        this.state.w = this.putt.ball.w;
                        kb.w = pdir;
                    }
                    if (touchSnap && touchSnap.buttons && touchSnap.buttons.jump) this.input.jumpPressed = true;
                    input = kb;
                    var aim = this.putt && this.putt.aim;
                    if (aim && (kb.forward || kb.strafe)) {
                        this.input.yaw = Math.atan2(kb.strafe, kb.forward);
                        this.putt.setAim(kb.strafe, 0, kb.forward, 0);
                        this.input.lastLookDelta = 0;
                    }
                    if (aim && this.input.lastLookDelta) {
                        aim.x = Math.sin(this.input.yaw || 0);
                        aim.y = 0;
                        aim.z = Math.cos(this.input.yaw || 0);
                        this.input.lastLookDelta = 0;
                    }
                }
            } catch (e) { /* ignore */ }
            try {
                if (this.putt && typeof this.putt.update === 'function') this.putt.update(dt, input);
                else if (this.putt && typeof this.putt.step === 'function') this.putt.step(dt);
            } catch (e) { /* ignore */ }
            try { if (M.engine && typeof M.engine.update === 'function') M.engine.update(dt, input); } catch (e) { /* ignore */ }
            try { if (M.world && typeof M.world.update === 'function') M.world.update(dt); } catch (e) { /* ignore */ }
            try { if (M.entities && typeof M.entities.update === 'function') M.entities.update(dt); } catch (e) { /* ignore */ }
            try {
                if (M.graphics && typeof M.graphics.render === 'function') M.graphics.render(dt);
                else if (this.graphicsHandle && this.renderer && this.scene && this.camera) {
                    var SR = M.sliceRenderer;
                    var w = this.putt && this.putt.ball ? this.putt.ball.w : 0;
                    if (SR && typeof SR.renderWSlice === 'function') {
                        SR.renderWSlice(this.graphicsHandle, this.worldMap, w);
                    }
                    if (this.camera.position && this.camera.position.set) {
                        this.camera.position.set((this.putt.ball.x || 0) + 60, 65, (this.putt.ball.z || 0) + 100);
                        if (this.camera.lookAt) this.camera.lookAt(this.putt.ball.x || 0, 0, this.putt.ball.z || 0);
                    }
                    var ball = this.graphicsHandle.ballMesh;
                    if (!ball && window.THREE) {
                        ball = new window.THREE.Mesh(
                            new window.THREE.SphereGeometry(2.2, 16, 12),
                            new window.THREE.MeshStandardMaterial({ color: 0xffe8a3, emissive: 0x664400 })
                        );
                        ball.name = 'gravegain4d-putt-ball';
                        this.scene.add(ball);
                        this.graphicsHandle.ballMesh = ball;
                    }
                    if (ball) ball.position.set(this.putt.ball.x || 0, 2, this.putt.ball.z || 0);
                    this.renderer.render(this.scene, this.camera);
                }
                else if (this.renderer && typeof this.renderer.render === 'function' && this.scene && this.camera) {
                    this.renderer.render(this.scene, this.camera);
                }
            } catch (e) { /* ignore */ }
            // HUD state pull: putt ball w + strokes.
            try {
                if (this.putt) {
                    if (this.putt.ball && this.putt.ball.w !== undefined) this.state.w = this.putt.ball.w;
                    if (this.putt.wMin !== undefined) this.state.wMin = this.putt.wMin;
                    if (this.putt.wMax !== undefined) this.state.wMax = this.putt.wMax;
                    this.state.strokes = this.putt.strokes | 0;
                    if (this.putt.par !== undefined) this.state.par = this.putt.par;
                    if (this.timefold) {
                        this.timefold.record(0.016, { ball: this.putt.ball, strokes: this.putt.strokes });
                        this.state.chronoSand = this.timefold.sand;
                        this.state.maxChronoSand = this.timefold.maxSand;
                    }
                    if (this.branes && this.putt.ball) this.state.brane = this.branes.get(this.putt.ball.w);
                }
                if (this.hud) this.hud.update(this.state);
            } catch (e) { /* ignore */ }
        } catch (e) { /* ignore */ }
    };

    Main4D.prototype._frame = function (t) {
        try {
            if (!this.running || this.paused) return;
            var dt = 0.016;
            try {
                if (this._last) dt = Math.min(0.1, Math.max(0.0001, (t - this._last) / 1000));
            } catch (e) { /* ignore */ }
            this._last = t;
            this.elapsed += dt;
            this._tick(dt);
            var self = this;
            this._raf = requestAnimationFrame(function (tt) { self._frame(tt); });
        } catch (e) { /* ignore */ }
    };

    Main4D.prototype.start = function () {
        try {
            if (this.running) return true;
            this.running = true; this.paused = false; this._last = 0;
            var self = this;
            this._raf = requestAnimationFrame(function (t) { self._frame(t); });
            return true;
        } catch (e) { return false; }
    };

    Main4D.prototype.pause = function () {
        try {
            this.paused = true;
            if (this._raf) cancelAnimationFrame(this._raf);
            this._raf = 0;
        } catch (e) { /* ignore */ }
    };

    Main4D.prototype.resume = function () {
        try {
            if (!this.running || !this.paused) return;
            if (document.hidden) return; // stay paused while tab hidden
            this.paused = false; this._last = 0;
            var self = this;
            this._raf = requestAnimationFrame(function (t) { self._frame(t); });
        } catch (e) { /* ignore */ }
    };

    Main4D.prototype.stop = function () {
        try {
            this.running = false; this.paused = false;
            if (this._raf) cancelAnimationFrame(this._raf);
            this._raf = 0;
            // Audio stop path (abandon/menu/hub): silence + release nodes.
            try { if (this.sound && typeof this.sound.stop === 'function') this.sound.stop(); } catch (e) { /* ignore */ }
        } catch (e) { /* ignore */ }
    };

    Main4D.prototype.destroy = function () {
        try {
            this.stop();
            try { if (this._onVis) document.removeEventListener('visibilitychange', this._onVis); } catch (e) { /* ignore */ }
            try { if (this._onResize) window.removeEventListener('resize', this._onResize); } catch (e) { /* ignore */ }
            try { if (this._onFsChange) document.removeEventListener('fullscreenchange', this._onFsChange); } catch (e) { /* ignore */ }
            try { if (this.hud) this.hud.destroy(); } catch (e) { /* ignore */ }
            try { if (this.touch) this.touch.destroy(); } catch (e) { /* ignore */ }
            try { if (this.input && typeof this.input.destroy === 'function') this.input.destroy(); } catch (e) { /* ignore */ }
            try {
                if (this.mods.sliceRenderer && typeof this.mods.sliceRenderer.disposeSliceRenderer === 'function') {
                    this.mods.sliceRenderer.disposeSliceRenderer(this.graphicsHandle);
                } else if (this.renderer && typeof this.renderer.dispose === 'function') this.renderer.dispose();
            } catch (e) { /* ignore */ }
        } catch (e) { /* ignore */ }
    };

    // One-shot boot: new GG4D_Main(opts).init() + start().
    Main4D.boot = function (opts) {
        try {
            var m = new Main4D(opts);
            m.init(opts);
            m.start();
            try { window.GG4D_Game = m; } catch (e) { /* ignore */ }
            return m;
        } catch (e) { return null; }
    };

    try { window.GG4D_Main = Main4D; } catch (e) { /* ignore */ }
})();
