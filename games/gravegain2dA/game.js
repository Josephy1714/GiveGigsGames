(function () {
    'use strict';

    var PX_PER_M = 24.0;
    var M_PER_PX = 1.0 / PX_PER_M;

    var Race = {
        HUMAN: 'human',
        ELF: 'elf',
        DWARF: 'dwarf',
        ORC: 'orc'
    };

    var ClassType = {
        WARRIOR: 'warrior',
        TANK: 'tank',
        SUPPORT: 'support',
        MAGE: 'mage'
    };

    var RaceData = {
        human: {
            name: 'Human',
            emoji: '👩‍🚀',
            color: 'rgb(76, 127, 255)',
            maxHp: 100.0,
            hpRegen: 1.0,
            stamina: 100.0,
            speed: 250,
            desc: 'Shield Wall ability (bubble shield absorbs 20 dmg, regenerates after 5s) & Jetpack jump mechanics.'
        },
        elf: {
            name: 'Elf',
            emoji: '🧝‍♀️',
            color: 'rgb(76, 255, 127)',
            maxHp: 75.0,
            hpRegen: 3.0,
            stamina: 100.0,
            speed: 275,
            desc: 'Nature Burst AoE magic ability, Mana Pool (100 mana, +2/s regen), and Hover mechanics.'
        },
        dwarf: {
            name: 'Dwarf',
            emoji: '🧔🏻',
            color: 'rgb(255, 204, 76)',
            maxHp: 150.0,
            hpRegen: 2.0,
            stamina: 100.0,
            speed: 200,
            desc: 'Stone Form immunity, Double Jump mechanics, and Poison resistance.'
        },
        orc: {
            name: 'Orc',
            emoji: '🟢👹',
            color: 'rgb(76, 210, 92)',
            maxHp: 200.0,
            hpRegen: 3.0,
            stamina: 100.0,
            speed: 225,
            desc: 'Rage Burst AoE ability (scales with Rage built in combat), and Ground Stomp landing attack.'
        }
    };

    var ClassTitles = {
        warrior: { human: 'Soldier', elf: 'Assassin', dwarf: 'Slayer', orc: 'Berserker' },
        tank: { human: 'Warden', elf: 'Paladin', dwarf: 'Brute', orc: 'Guardian' },
        support: { human: 'Medic', elf: 'Brewer', dwarf: 'Shaman', orc: 'Druid' },
        mage: { human: 'Engineer', elf: 'Tinkerer', dwarf: 'Warlock', orc: 'Witch' }
    };

    var EnemyTypes = [
        { name: 'Goblin Skeleton', emoji: '💀', hp: 15, dmg: 3, speed: 120, type: 'standard', blood: 'red' },
        { name: 'Elven Skeleton', emoji: '💀', hp: 25, dmg: 5, speed: 100, type: 'standard', blood: 'green' },
        { name: 'Goblin Zed', emoji: '🧟', hp: 40, dmg: 8, speed: 90, type: 'standard', blood: 'red' },
        { name: 'Small Orc Zed', emoji: '🧟‍♂️', hp: 60, dmg: 12, speed: 80, type: 'standard', blood: 'red' },
        { name: 'Flying Elf Skull', emoji: '👻', hp: 10, dmg: 30, speed: 150, type: 'exploding', blood: 'purple' },
        { name: 'Medium Orc Zed', emoji: '👺', hp: 150, dmg: 20, speed: 70, type: 'elite', blood: 'red' },
        { name: 'Dwarven Zed', emoji: '🛡️', hp: 200, dmg: 15, speed: 60, type: 'elite', blood: 'red', armored: true },
        { name: 'Human Zed', emoji: '🤖', hp: 500, dmg: 25, speed: 80, type: 'boss', blood: 'red', ranged: true },
        { name: 'Huge Orc Zed', emoji: '🟢👹', hp: 800, dmg: 40, speed: 50, type: 'boss', blood: 'red' },
        { name: 'Elven Necromancer', emoji: '🧙', hp: 400, dmg: 15, speed: 60, type: 'boss', blood: 'purple', summoner: true }
    ];

    var QuartersUpgrades = [
        { level: 1, size: '400x300 px', capacity: 100, cost: 250 },
        { level: 2, size: '600x400 px', capacity: 150, cost: 500 },
        { level: 3, size: '800x500 px', capacity: 200, cost: 900 },
        { level: 4, size: '1000x600 px', capacity: 250, cost: 1400 },
        { level: 5, size: '1200x700 px', capacity: 300, cost: 2000 },
        { level: 6, size: '1400x800 px', capacity: 350, cost: 2500 }
    ];

    var BotanySeeds = [
        { id: 'cannabis', name: 'Cannabis Sativa', space: 15, time: 120, yield: 3, value: 50, emoji: '🌿' },
        { id: 'mushroom', name: 'Magic Mushroom', space: 8, time: 80, yield: 2, value: 75, emoji: '🍄' },
        { id: 'bloodrose', name: 'Blood Rose', space: 10, time: 60, yield: 1, value: 120, emoji: '🌹' }
    ];

    function toggleGraveGainFullscreen() {
        try {
            if (typeof window.__fourweirdToggleFullscreen === 'function') { window.__fourweirdToggleFullscreen(); return; }
            var el = document.getElementById('canvasContainer') || document.documentElement;
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                var p = el.requestFullscreen ? el.requestFullscreen() : (el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : null);
                if (p && p.catch) p.catch(function () {});
            } else if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        } catch (_) {}
    }

    function GameLoop(updateCallback, renderCallback) {
        this.update = updateCallback;
        this.render = renderCallback;
        this.lastTime = 0;
        this.isPaused = false;
        this.frameId = null;
        this.frameErrors = 0;
    }
    GameLoop.prototype.start = function () {
        if (this.frameId) cancelAnimationFrame(this.frameId);
        this.lastTime = performance.now();
        this.isPaused = false;
        var self = this;
        this.frameId = requestAnimationFrame(function (t) { self.loop(t); });
    };
    GameLoop.prototype.stop = function () {
        this.isPaused = true;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    };
    GameLoop.prototype.loop = function (timestamp) {
        if (this.isPaused) return;
        var delta = (timestamp - this.lastTime) / 1000.0;
        this.lastTime = timestamp;
        var dt = Math.min(Math.max(delta, 0.001), 0.1);
        try {
            this.update(dt);
            this.render();
        } catch (err) {
            this.frameErrors++;
            if (this.frameErrors < 5) console.error('[GraveGain2DA] frame error (loop survives):', err);
        }
        var self = this;
        this.frameId = requestAnimationFrame(function (t) { self.loop(t); });
    };

    function SaveSystem() {}
    SaveSystem.save = function (state) {
        try {
            localStorage.setItem('GraveGain2D_Save', JSON.stringify({
                gold: state.gold,
                uusd: state.uusd,
                quartersLevel: state.quartersLevel,
                prestige: state.prestige,
                botanyCrops: state.botanyCrops,
                dailyChallengeDate: state.dailyChallengeDate,
                dailyChallenges: state.dailyChallenges,
                settings: {
                    difficulty: state.difficultyMultiplierSetting,
                    volume: state.audio.masterVolume,
                    pickupRange: state.autoPickupRange,
                    cameraShake: document.getElementById('settingsCameraShake') ? document.getElementById('settingsCameraShake').checked : true,
                    cameraLead: document.getElementById('settingsCameraLead') ? document.getElementById('settingsCameraLead').checked : true,
                    cameraPunch: document.getElementById('settingsCameraPunch') ? document.getElementById('settingsCameraPunch').checked : true,
                    controlMode: state.controlMode,
                    gameSpeed: state.gameSpeed
                }
            }));
        } catch (_) {}
    };
    SaveSystem.load = function () {
        try {
            var raw = localStorage.getItem('GraveGain2D_Save');
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    };

    function AudioController() {
        this.ctx = null;
        this.masterVolume = 0.8;
        this._muted = false;
        Object.defineProperty(this, 'muted', {
            get: function () { return this._muted; },
            set: function (v) {
                this._muted = !!v;
                if (this._muted) {
                    try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (_) {}
                }
            },
            configurable: true
        });
    }
    AudioController.prototype.initCtx = function () {
        if (!this.ctx) {
            var Ctor = window.AudioContext || window.webkitAudioContext;
            if (Ctor) this.ctx = new Ctor();
        }
    };
    AudioController.prototype.play = function (soundName) {
        if (this.muted) return;
        try {
            this.initCtx();
            if (!this.ctx) return;
            var osc = this.ctx.createOscillator();
            var gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            var now = this.ctx.currentTime;
            gain.gain.setValueAtTime(Math.max(0.001, this.masterVolume * 0.1), now);
            if (soundName === 'hit') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(20, now + 0.15);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now); osc.stop(now + 0.15);
            } else if (soundName === 'block') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now); osc.stop(now + 0.1);
            } else if (soundName === 'ability') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now); osc.stop(now + 0.3);
            } else if (soundName === 'loot') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now); osc.stop(now + 0.15);
            } else {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now); osc.stop(now + 0.1);
            }
        } catch (_) {}
    };
    AudioController.prototype.speakFallback = function (text, speaker) {
        if (this.muted) return;
        try {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                var u = new SpeechSynthesisUtterance(text);
                u.volume = this.masterVolume;
                if (speaker) {
                    var h = 0;
                    for (var i = 0; i < speaker.length; i++) h = ((h << 5) - h + speaker.charCodeAt(i)) | 0;
                    h = Math.abs(h);
                    var wantFemale = (h % 2) === 1;
                    var voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
                    var enVoices = voices.filter(function (v) { return !v.lang || /^en/i.test(v.lang); });
                    var pool = enVoices.length ? enVoices : voices;
                    if (pool.length) {
                        var femRe = /female|woman|zira|samantha|victoria|karen|moira|tessa|fiona|susan|hazel|aria|jenny|sonia|libby|natasha|ava|emma|allison/i;
                        var maleRe = /\bmale\b|\bman\b|david|mark|alex|daniel|george|ryan|guy|christopher|eric|liam|thomas|fred|oliver|arthur/i;
                        var gendered = pool.filter(function (v) { return wantFemale ? femRe.test(v.name) : maleRe.test(v.name); });
                        var pick = gendered.length ? gendered : pool;
                        u.voice = pick[h % pick.length];
                    }
                    u.pitch = 0.7 + ((h % 7) * 0.12);
                    u.rate = 0.9 + (((h >> 3) % 5) * 0.07);
                }
                window.speechSynthesis.speak(u);
            }
        } catch (_) {}
    };

    function ParticleCompat(engine, game) {
        this.engine = engine;
        this.game = game;
        this.rings = [];
        this.sparks = [];
        this.floaters = [];
        this.bloodSplats = [];
        this.goreChunks = [];
    }
    ParticleCompat.prototype.spawnRing = function (x, y, color, r, life) {
        this.rings.push({ x: x, y: y, color: color, radius: r || 40, life: life || 0.3 });
    };
    ParticleCompat.prototype.spawnSparks = function (x, y, color, count) {
        var wr = this.engine && this.engine.getWorldRenderer && this.engine.getWorldRenderer();
        if (wr && this.engine.getState().player) {
            wr.spawnFlashLight({ x: x * M_PER_PX, y: this.engine.getState().player.y + 0.5, z: y * M_PER_PX }, 0xfacc15, 1.5, 6, 0.1);
        }
        this.sparks.push({ x: x, y: y, color: color, count: count || 8 });
    };
    ParticleCompat.prototype.spawnExplosionVFX = function (x, y) {
        var wr = this.engine && this.engine.getWorldRenderer && this.engine.getWorldRenderer();
        if (wr && this.engine.getState().player) {
            wr.spawnFlashLight({ x: x * M_PER_PX, y: this.engine.getState().player.y + 0.5, z: y * M_PER_PX }, 0xf97316, 4.0, 12, 0.25);
        }
        this.spawnRing(x, y, '#c084fc', 80, 0.4);
    };
    ParticleCompat.prototype.spawnFloater = function (x, y, text, color) {
        this.floaters.push({ x: x, y: y, text: String(text), color: color || '#facc15', life: 1.0 });
    };
    ParticleCompat.prototype.spawnBlood = function (x, y, color) {
        var t = this.engine && this.engine.getTerrain && this.engine.getTerrain();
        if (t) t.addDebris('scorch', x * M_PER_PX, t.getWorldHeightAt(x * M_PER_PX, y * M_PER_PX), y * M_PER_PX, 0.45, color === 'purple' ? 0x581c87 : 0x7f1d1d);
    };
    ParticleCompat.prototype.spawnGore = function (x, y) { this.spawnBlood(x, y, 'red'); };
    ParticleCompat.prototype.spawnShieldVFX = function (x, y) { this.spawnRing(x, y, 'deepskyblue', 46, 0.4); };
    ParticleCompat.prototype.spawnNatureBurstVFX = function (x, y) { this.spawnRing(x, y, '#4ade80', 90, 0.45); };
    ParticleCompat.prototype.spawnStoneFormVFX = function (x, y) { this.spawnRing(x, y, 'gold', 46, 0.4); };
    ParticleCompat.prototype.spawnRageBurstVFX = function (x, y) { this.spawnRing(x, y, '#ef4444', 100, 0.45); };
    ParticleCompat.prototype.spawnPerfectBlockVFX = function (x, y) { this.spawnRing(x, y, '#22d3ee', 55, 0.3); };
    ParticleCompat.prototype.update = function (dt) {
        this.rings = this.rings.filter(function (r) { r.life -= dt; return r.life > 0; });
        this.floaters = this.floaters.filter(function (f) { f.life -= dt; return f.life > 0; });
    };

    function CameraCompat(engine) {
        this.engine = engine;
        this.width = 1000;
        this.height = 600;
        this.x = 0;
        this.y = 0;
    }
    CameraCompat.prototype.applyShake = function (amt) {
        var rig = this.engine && this.engine.getCameraRig && this.engine.getCameraRig();
        if (rig) rig.applyShake(amt);
    };
    CameraCompat.prototype.applyPunch = function (vx, vy) {
        var rig = this.engine && this.engine.getCameraRig && this.engine.getCameraRig();
        if (rig) rig.applyPunch({ x: vx, z: vy }, 0.25);
    };
    CameraCompat.prototype.getOffsets = function () {
        var st = this.engine && this.engine.getState && this.engine.getState();
        var p = st && st.player;
        if (!p) return { x: 0, y: 0 };
        return { x: p.x * PX_PER_M - this.width / 2, y: p.z * PX_PER_M - this.height / 2 };
    };

    function wrapPlayer(enginePlayer, game) {
        var proxy = {
            _e: enginePlayer,
            radius: 16,
            get race() { return enginePlayer.race; },
            set race(v) { enginePlayer.race = v; },
            get classType() { return enginePlayer.classType; },
            set classType(v) { enginePlayer.classType = v; },
            get x() { return enginePlayer.x * PX_PER_M; },
            set x(v) { enginePlayer.x = v * M_PER_PX; },
            get y() { return enginePlayer.z * PX_PER_M; },
            set y(v) { enginePlayer.z = v * M_PER_PX; },
            get z() { return enginePlayer.y; },
            set z(v) { enginePlayer.y = v; },
            get vx() { return enginePlayer.vx * PX_PER_M; },
            set vx(v) { enginePlayer.vx = v * M_PER_PX; },
            get vy() { return enginePlayer.vz * PX_PER_M; },
            set vy(v) { enginePlayer.vz = v * M_PER_PX; },
            get angle() { return enginePlayer.angle; },
            set angle(v) { enginePlayer.angle = v; },
            get hp() { return enginePlayer.hp; },
            set hp(v) { enginePlayer.hp = v; },
            get maxHp() { return enginePlayer.maxHp; },
            set maxHp(v) { enginePlayer.maxHp = v; },
            get stamina() { return enginePlayer.stamina; },
            set stamina(v) { enginePlayer.stamina = v; },
            get maxStamina() { return enginePlayer.maxStamina; },
            set maxStamina(v) { enginePlayer.maxStamina = v; },
            get mana() { return enginePlayer.mana; },
            set mana(v) { enginePlayer.mana = v; },
            get maxMana() { return enginePlayer.maxMana; },
            set maxMana(v) { enginePlayer.maxMana = v; },
            get rage() { return enginePlayer.rage; },
            set rage(v) { enginePlayer.rage = v; },
            get shieldBubble() { return enginePlayer.shieldBubble; },
            set shieldBubble(v) { enginePlayer.shieldBubble = v; },
            get shieldCooldown() { return enginePlayer.shieldCooldown; },
            set shieldCooldown(v) { enginePlayer.shieldCooldown = v; },
            get stoneForm() { return enginePlayer.stoneForm; },
            set stoneForm(v) { enginePlayer.stoneForm = v; },
            get stoneDuration() { return enginePlayer.stoneDuration; },
            set stoneDuration(v) { enginePlayer.stoneDuration = v; },
            get gold() { return enginePlayer.gold; },
            set gold(v) { enginePlayer.gold = v; },
            get xp() { return enginePlayer.xp; },
            set xp(v) { enginePlayer.xp = v; },
            get level() { return enginePlayer.level; },
            set level(v) { enginePlayer.level = v; },
            get nextLevelXp() { return enginePlayer.nextLevelXp; },
            set nextLevelXp(v) { enginePlayer.nextLevelXp = v; },
            get isDead() { return enginePlayer.isDead; },
            set isDead(v) { enginePlayer.isDead = v; },
            get dodgeTime() { return enginePlayer.dodgeTime; },
            set dodgeTime(v) { enginePlayer.dodgeTime = v; },
            get perfectBlockWindow() { return enginePlayer.perfectBlockWindow; },
            set perfectBlockWindow(v) { enginePlayer.perfectBlockWindow = v; },
            get blockCooldown() { return enginePlayer.blockCooldown; },
            set blockCooldown(v) { enginePlayer.blockCooldown = v; },
            get bloodlust() { return enginePlayer.bloodlust; },
            gainXp: function (amt) {
                enginePlayer.xp += Math.max(0, Number(amt) || 0);
                var leveled = false;
                while (enginePlayer.xp >= enginePlayer.nextLevelXp) {
                    enginePlayer.level++;
                    enginePlayer.nextLevelXp += 50 + (enginePlayer.level - 1) * 25;
                    enginePlayer.maxHp += 10;
                    enginePlayer.hp = enginePlayer.maxHp;
                    enginePlayer.maxStamina += 5;
                    enginePlayer.stamina = enginePlayer.maxStamina;
                    enginePlayer.speed += 0.12;
                    enginePlayer.levelUpFlash = 1.5;
                    leveled = true;
                }
                if (leveled) {
                    game.audio.play('ability');
                    game.vfx.spawnNatureBurstVFX(proxy.x, proxy.y);
                }
                return leveled;
            },
            triggerAbility: function () {
                if (enginePlayer.race === 'human') {
                    enginePlayer.shieldBubble = 20.0;
                    enginePlayer.shieldCooldown = 8.0;
                    game.audio.play('ability');
                    game.vfx.spawnShieldVFX(proxy.x, proxy.y);
                    return true;
                }
                if (enginePlayer.race === 'elf' && enginePlayer.mana >= 40) {
                    enginePlayer.mana -= 40;
                    game.audio.play('ability');
                    game.vfx.spawnNatureBurstVFX(proxy.x, proxy.y);
                    game.dealAoEDamage(proxy.x, proxy.y, 120, 20);
                    return true;
                }
                if (enginePlayer.race === 'dwarf' && enginePlayer.stamina >= 50) {
                    enginePlayer.stamina -= 50;
                    enginePlayer.stoneForm = true;
                    enginePlayer.stoneDuration = 4.0;
                    game.audio.play('ability');
                    game.vfx.spawnStoneFormVFX(proxy.x, proxy.y);
                    return true;
                }
                if (enginePlayer.race === 'orc' && enginePlayer.rage >= 30) {
                    var power = enginePlayer.rage;
                    enginePlayer.rage = 0;
                    game.audio.play('ability');
                    game.vfx.spawnRageBurstVFX(proxy.x, proxy.y);
                    game.dealAoEDamage(proxy.x, proxy.y, 140, 10 + power * 0.4);
                    return true;
                }
                return false;
            }
        };
        return proxy;
    }

    function wrapEnemy(e) {
        return {
            _e: e,
            get id() { return e.id; },
            get name() { return e.name; },
            set name(v) { e.name = v; },
            get title() { return e.title || e.name; },
            set title(v) { e.title = v; },
            get emoji() { return e.emoji; },
            get type() { return e.type; },
            set type(v) { e.type = v; },
            get x() { return e.x * PX_PER_M; },
            set x(v) { e.x = v * M_PER_PX; },
            get y() { return e.z * PX_PER_M; },
            set y(v) { e.z = v * M_PER_PX; },
            get z() { return e.y; },
            get hp() { return e.hp; },
            set hp(v) { e.hp = v; if (v <= 0) e.isDead = true; },
            get maxHp() { return e.maxHp; },
            set maxHp(v) { e.maxHp = v; },
            get flash() { return e.flash; },
            set flash(v) { e.flash = v; },
            get bloodColor() { return e.bloodColor; }
        };
    }

    function wrapLoot(l) {
        return {
            _l: l,
            get id() { return l.id; },
            get type() { return l.type; },
            get value() { return l.value; },
            get picked() { return l.picked; },
            set picked(v) { l.picked = v; },
            get x() { return l.x * PX_PER_M; },
            set x(v) { l.x = v * M_PER_PX; },
            get y() { return l.z * PX_PER_M; },
            set y(v) { l.z = v * M_PER_PX; }
        };
    }

    function InputCompat(game) {
        this.game = game;
        this.keys = {};
        this.mouse = { x: 0, y: 0, click: false, rightClick: false, angle: 0 };
        this.joystick = { active: false, touchId: null, startX: 0, startY: 0, curX: 0, curY: 0, x: 0, y: 0 };
        this.tapMove = { active: false, x: 0, y: 0 };
        this.tapMoveEnabled = true;
        this.autoTarget = false;
        this.interactPressed = false;
        this.isCoarsePointer = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);
        try {
            this.autoTarget = localStorage.getItem('GraveGain2DA_autoTarget') === '1';
            this.tapMoveEnabled = localStorage.getItem('GraveGain2DA_tapMove') !== '0';
        } catch (_) {}
        this._tapDown = null;
        this.setupListeners();
    }
    InputCompat.prototype.setAutoTarget = function (on) {
        this.autoTarget = !!on;
        try { localStorage.setItem('GraveGain2DA_autoTarget', this.autoTarget ? '1' : '0'); } catch (_) {}
    };
    InputCompat.prototype.setTapMove = function (on) {
        this.tapMoveEnabled = !!on;
        if (!on) this.tapMove.active = false;
        try { localStorage.setItem('GraveGain2DA_tapMove', this.tapMoveEnabled ? '1' : '0'); } catch (_) {}
    };
    InputCompat.prototype.setupListeners = function () {
        var self = this;
        var engine = this.game.engine;

        window.addEventListener('keydown', function (e) {
            self.keys[e.code] = true;
            if (engine) engine.setInputState({ keys: self.keys });
            if (!e.repeat && (e.code === 'KeyP' || e.code === 'Escape')) {
                self.game.togglePause();
            }
            if (e.code === 'KeyF' && (!self.game.loop || self.game.loop.isPaused)) {
                toggleGraveGainFullscreen();
            }
            if (e.code === 'KeyM' && self.game.audio) {
                self.game.audio.muted = !self.game.audio.muted;
            }
            if (['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
                var mode = { Digit1: 'realtime', Digit2: 'chrono', Digit3: 'turnbased' }[e.code];
                self.game.setControlMode(mode);
            }
            if (e.code === 'Space' && self.game.player && !self.game.loop.isPaused) {
                var ep = engine.getState().player;
                if (ep && ep.dodgeTime <= 0 && ep.stamina >= 25) {
                    ep.dodgeTime = 0.35;
                    ep.stamina -= 25;
                }
            }
            // Arrow keys trigger directional dodge rolls
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && self.game.player && !self.game.loop.isPaused) {
                e.preventDefault();
                if (engine) engine.setInputState({ keys: self.keys });
            }
        });
        window.addEventListener('blur', function () {
            Object.keys(self.keys).forEach(function (key) { self.keys[key] = false; });
            if (engine) engine.setInputState({ keys: self.keys });
        });
        window.addEventListener('keyup', function (e) {
            self.keys[e.code] = false;
            if (engine) engine.setInputState({ keys: self.keys });
        });

        var container = document.getElementById('canvasContainer');
        if (!container) return;

        container.addEventListener('mousemove', function (e) {
            var rect = container.getBoundingClientRect();
            self.mouse.x = e.clientX - rect.left;
            self.mouse.y = e.clientY - rect.top;
            if (engine && engine.getState().player && !self.game.loop.isPaused) {
                var worldHit = engine.screenToGround(e.clientX, e.clientY);
                if (worldHit) {
                    var ep = engine.getState().player;
                    ep.angle = Math.atan2(worldHit.z - ep.z, worldHit.x - ep.x);
                    engine.setInputState({ aimX: worldHit.x, aimZ: worldHit.z });
                }
            }
        });

        container.addEventListener('mousedown', function (e) {
            if (e.target.closest('button,.thumb-tabs,.mobile-drawer,.screen-overlay')) return;
            if (e.button === 0) {
                self.mouse.click = true;
                if (engine) engine.setInputState({ mouseDown: true });
            }
            if (e.button === 2) {
                e.preventDefault();
                self.mouse.rightClick = true;
                if (self.tapMoveEnabled && engine && engine.getState().player) {
                    var hit = engine.screenToGround(e.clientX, e.clientY);
                    if (hit) {
                        engine.getState().player.moveTarget = { active: true, x: hit.x, z: hit.z };
                    }
                }
            }
        });

        container.addEventListener('mouseup', function (e) {
            if (e.button === 0) {
                self.mouse.click = false;
                if (engine) engine.setInputState({ mouseDown: false });
            }
            if (e.button === 2) self.mouse.rightClick = false;
        });
        container.addEventListener('contextmenu', function (e) { e.preventDefault(); });

        // Mobile floating crypt-stick & rune buttons
        var stickBase = document.getElementById('cryptStickBase');
        var stickKnob = document.getElementById('cryptStickKnob');
        var isOnButton = function (t) { return !!(t.target && t.target.closest && t.target.closest('.rune-cluster,.thumb-tabs,.mobile-drawer,button')); };

        container.addEventListener('touchstart', function (e) {
            if (self.game.isDialogueActive) return;
            Array.from(e.changedTouches).forEach(function (t) {
                if (isOnButton(t)) return;
                var rect = container.getBoundingClientRect();
                var cx = t.clientX - rect.left;
                var cy = t.clientY - rect.top;
                if (!self.joystick.active && cx < rect.width * 0.6) {
                    self.joystick.active = true;
                    self.joystick.touchId = t.identifier;
                    self.joystick.startX = t.clientX;
                    self.joystick.startY = t.clientY;
                    self.joystick.x = 0; self.joystick.y = 0;
                    if (stickBase) { stickBase.style.left = cx + 'px'; stickBase.style.top = cy + 'px'; stickBase.classList.add('on'); }
                    self._tapDown = { id: t.identifier, x: t.clientX, y: t.clientY, at: performance.now() };
                } else if (self.tapMoveEnabled && !self._tapDown) {
                    self._tapDown = { id: t.identifier, x: t.clientX, y: t.clientY, at: performance.now() };
                }
            });
        }, { passive: true });

        container.addEventListener('touchmove', function (e) {
            if (self.joystick.active) {
                var touch = Array.from(e.touches).find(function (t) { return t.identifier === self.joystick.touchId; });
                if (touch) {
                    var dx = touch.clientX - self.joystick.startX;
                    var dy = touch.clientY - self.joystick.startY;
                    var raw = Math.hypot(dx, dy);
                    if (raw > 8 && self._tapDown && self._tapDown.id === touch.identifier) self._tapDown.moved = true;
                    var maxR = 56;
                    var mag = Math.min(raw, maxR) / maxR;
                    var eased = mag < 0.18 ? 0 : Math.min(1, (mag - 0.18) / 0.82);
                    var ang = Math.atan2(dy, dx);
                    self.joystick.x = Math.cos(ang) * eased;
                    self.joystick.y = Math.sin(ang) * eased;
                    if (stickKnob) {
                        stickKnob.style.left = (50 + self.joystick.x * 32) + '%';
                        stickKnob.style.top = (50 + self.joystick.y * 32) + '%';
                    }
                    if (engine) engine.setInputState({ moveX: self.joystick.x, moveZ: self.joystick.y });
                }
            }
            if (e.cancelable && self.joystick.active) e.preventDefault();
        }, { passive: false });

        var endTouch = function (e) {
            Array.from(e.changedTouches).forEach(function (t) {
                if (t.identifier === self.joystick.touchId) {
                    self.joystick.active = false;
                    self.joystick.touchId = null;
                    self.joystick.x = 0; self.joystick.y = 0;
                    if (stickBase) stickBase.classList.remove('on');
                    if (engine) engine.setInputState({ moveX: 0, moveZ: 0 });
                } else if (self._tapDown && t.identifier === self._tapDown.id) {
                    var quick = performance.now() - self._tapDown.at < 280 && !self._tapDown.moved;
                    if (quick && self.tapMoveEnabled && !isOnButton(t) && engine && engine.getState().player) {
                        var hit = engine.screenToGround(t.clientX, t.clientY);
                        if (hit) engine.getState().player.moveTarget = { active: true, x: hit.x, z: hit.z };
                    }
                }
                if (self._tapDown && t.identifier === self._tapDown.id) self._tapDown = null;
            });
        };
        container.addEventListener('touchend', endTouch);
        container.addEventListener('touchcancel', endTouch);

        var bindHold = function (el, down, up) {
            if (!el) return;
            el.addEventListener('touchstart', function (e) { e.preventDefault(); e.stopPropagation(); down(); }, { passive: false });
            el.addEventListener('touchend', function (e) { e.preventDefault(); if (up) up(); }, { passive: false });
            el.addEventListener('mousedown', function (e) { e.preventDefault(); e.stopPropagation(); down(); });
            el.addEventListener('mouseup', function () { if (up) up(); });
        };
        bindHold(document.getElementById('runeBtnA'), function () {
            self.mouse.click = true;
            if (engine) engine.setInputState({ mouseDown: true });
        }, function () {
            self.mouse.click = false;
            if (engine) engine.setInputState({ mouseDown: false });
        });
        bindHold(document.getElementById('runeBtnB'), function () {
            self.interactPressed = true;
            if (engine) engine.setInputState({ interactPressed: true });
        });
        bindHold(document.getElementById('mobileAttackBtn'), function () {
            self.mouse.click = true;
            if (engine) engine.setInputState({ mouseDown: true });
        }, function () {
            self.mouse.click = false;
            if (engine) engine.setInputState({ mouseDown: false });
        });
        bindHold(document.getElementById('mobileBlockBtn'), function () { self.mouse.rightClick = true; }, function () { self.mouse.rightClick = false; });
        bindHold(document.getElementById('mobileAbilityBtn'), function () { self.keys['KeyF'] = true; }, function () { self.keys['KeyF'] = false; });
        var waitBtn = document.getElementById('mobileWaitBtn');
        if (waitBtn && !waitBtn.dataset.bound) {
            waitBtn.dataset.bound = '1';
            waitBtn.addEventListener('click', function () { self.game.executeTurnAction('wait'); });
        }
    };

    function GraveGainGame() {
        this.engine = window.GraveGainEngine;
        this.canvas = document.getElementById('gameCanvas');
        // CRITICAL: NEVER call getContext('2d') on #gameCanvas so WebGLRenderer owns it exclusively!
        this.ctx = null;
        this.lightCanvas = document.getElementById('lightingCanvas');
        this.lightCtx = null;

        this.engine.initRenderers();
        if (this.lightCanvas && this.engine.isWebGLActive()) {
            this.lightCanvas.style.display = 'none';
        }
        // Pre-build initial sector and render baseline frame so WebGL canvas is never black
        this.engine.buildSector({ floorIndex: 1 });
        this.engine.renderFrame();

        this.input = new InputCompat(this);
        this.camera = new CameraCompat(this.engine);
        this.vfx = new ParticleCompat(this.engine, this);
        this.audio = new AudioController();

        this.gold = 0;
        this.uusd = 200;
        this.quartersLevel = 1;
        this.prestige = 0;
        this.floorIndex = 1;
        this.difficultyMultiplierSetting = 'normal';
        this.controlMode = 'realtime';
        this.gameSpeed = 1;
        this.chronoScale = 0.04;
        this.turnCount = 1;
        this.lastTurnInputAt = 0;
        this.isDialogueActive = false;
        this.dailyChallengeDate = null;
        this.dailyChallenges = null;

        this.player = null;
        this.enemies = [];
        this.loot = [];
        this.dungeon = null;
        this.currentMission = null;
        this.selectedStoryMissionId = null;
        this.sessionStart = 0;
        this.autoPickupRange = 100;
        this.tapLootBoost = 0;
        this.runKills = 0;
        this.runGold = 0;
        this.runDeaths = 0;

        this.botanyCrops = [
            { seedId: null, startTime: 0, growthTime: 0, capacity: 0 },
            { seedId: null, startTime: 0, growthTime: 0, capacity: 0 },
            { seedId: null, startTime: 0, growthTime: 0, capacity: 0 },
            { seedId: null, startTime: 0, growthTime: 0, capacity: 0 }
        ];

        var self = this;
        this.loop = new GameLoop(
            function (dt) { self.update(dt); },
            function () { self.render(); }
        );

        this.bindEngineEvents();
        this.setupUIListeners();
        this.bindRuntimeBridgeEvents();
        this.initMobileControls();
        this.loadState();
        this.generateDailyChallenges();
        this.renderDailyChallenges();
        this.startAutoSaveTimer();
    }

    GraveGainGame.prototype.bindEngineEvents = function () {
        var self = this;
        this.engine.on('combat:kill', function (ev) {
            if (!ev || !ev.target || ev.target.id === 'player') return;
            var rewards = self.getScaledRewards(15, 10);
            self.gold += rewards.gold;
            self.runGold += rewards.gold;
            self.runKills++;
            if (self.player) self.player.gainXp(rewards.xp);
            if (self.currentMission) self.checkStoryObjectives(ev.target);
            self.updateChallengeProgress('slay', 1);
            self.updateChallengeProgress('gold', rewards.gold);
            self.audio.play('hit');
        });
        this.engine.on('loot:collected', function (l) {
            if (!l) return;
            var rewards = self.getScaledRewards(l.value || 15, l.type === 'item' ? 30 : 0);
            self.gold += rewards.gold;
            self.runGold += rewards.gold;
            self.updateChallengeProgress('gold', rewards.gold);
            if (l.type === 'item') {
                if (self.player) self.player.gainXp(rewards.xp);
                if (self.currentMission) self.checkStoryObjectives(null, 'ore');
            }
            self.audio.play('loot');
        });
        this.engine.on('ui:set-hud-hidden', function (hidden) {
            var hud = document.querySelector('.game-hud');
            var bar = document.getElementById('controlModesBar');
            var act = document.querySelector('.bottom-action-row');
            [hud, bar, act].forEach(function (el) {
                if (el) el.style.opacity = hidden ? '0' : '1';
            });
        });
    };

    GraveGainGame.prototype.bindRuntimeBridgeEvents = function () {
        var self = this;
        window.addEventListener('fourweird-mute', function (e) {
            var muted = e && e.detail ? !!e.detail.muted : !self.audio.muted;
            self.audio.muted = muted;
        });
        window.addEventListener('fourweird-pause', function () {
            if (self.player && !self.loop.isPaused) self.togglePause();
        });
        window.addEventListener('fourweird-resume', function () {
            if (self.player && self.loop.isPaused) self.togglePause();
        });
        window.addEventListener('fourweird-cloud-load', function () {
            self.loadState();
            self.renderDailyChallenges();
            self.updateHUD();
        });
    };

    GraveGainGame.prototype.syncCompatibilityViews = function () {
        var st = this.engine.getState();
        if (st.player) {
            if (!this.player || this.player._e !== st.player) {
                this.player = wrapPlayer(st.player, this);
            }
        }
        this.enemies = (st.enemies || []).map(wrapEnemy);
        this.loot = (st.loot || []).map(wrapLoot);
        this.chronoScale = st.chronoScale;
        this.turnCount = st.turnCount;
    };

    GraveGainGame.prototype.buildLegacyDungeonProxy = function () {
        var terrain = this.engine.getTerrain();
        var grid = new Array(terrain.width);
        var breakableWalls = [];
        for (var x = 0; x < terrain.width; x++) {
            grid[x] = new Array(terrain.height);
            for (var z = 0; z < terrain.height; z++) {
                var c = terrain.getCell(x, z);
                var code = 0;
                if (c.type === 'wall') code = 1;
                else if (c.type === 'breachable') { code = 6; breakableWalls.push({ x: x, y: z }); }
                else if (c.hazard === 'poison') code = 3;
                else if (c.hazard === 'fire') code = 4;
                else if (c.hazard === 'cryo') code = 5;
                else if (c.surface === 'mud' || c.surface === 'sludge') code = 2;
                grid[x][z] = code;
            }
        }
        this.dungeon = {
            gridSize: terrain.width,
            grid: grid,
            rooms: terrain.rooms,
            spawnRoom: terrain.spawnRoom,
            breakableWalls: breakableWalls
        };
    };

    GraveGainGame.prototype.initRun = function (race, classType) {
        var mission = this.selectedStoryMissionId && window.GraveGainStoryEngine
            ? window.GraveGainStoryEngine.getMission(this.selectedStoryMissionId) : null;
        this.currentMission = mission ? JSON.parse(JSON.stringify(mission)) : null;
        this.floorIndex = this.currentMission ? (this.currentMission.minFloor || 1) : 1;
        this.sessionStart = Date.now();
        this.runKills = 0;
        this.runGold = 0;
        this.runDeaths = 0;

        this.engine.startMission({
            race: race || 'human',
            classType: classType || 'warrior',
            floorIndex: this.floorIndex,
            dungeonTheme: this.currentMission ? this.currentMission.dungeonTheme : null,
            difficulty: this.difficultyMultiplierSetting,
            temporalMode: this.controlMode
        });

        this.syncCompatibilityViews();
        this.buildLegacyDungeonProxy();
        this.engine.resize();
        if (this.lightCanvas && this.engine.isWebGLActive()) {
            this.lightCanvas.style.display = 'none';
        }

        if (this.currentMission) {
            this.populateMissionTargets();
            this.updateMissionUI();
            var self = this;
            this.playDialogueSequence(this.currentMission.dialogueBefore, function () {
                if (self.currentMission && self.currentMission.objectives && self.currentMission.objectives[0]) {
                    self.audio.speakFallback('Mission Goal: ' + self.currentMission.objectives[0].desc);
                }
            });
        } else {
            this.updateMissionUI();
        }

        try {
            if (window.GigglesHelpDraft) {
                var self2 = this;
                setTimeout(function () {
                    window.GigglesHelpDraft.present('gravegain2dA', self2, function () { self2.updateHUD(); }, true);
                }, 0);
            }
        } catch (_) {}

        this.loop.start();
        this.updateHUD();
    };

    GraveGainGame.prototype.buildDungeonLayer = function () {
        this.engine.buildSector({
            floorIndex: this.floorIndex,
            dungeonTheme: this.currentMission ? this.currentMission.dungeonTheme : null
        });
        this.syncCompatibilityViews();
        this.buildLegacyDungeonProxy();
        if (this.currentMission) this.populateMissionTargets();
        this.updateChallengeProgress('depth', this.floorIndex);
        this.updateHUD();
    };

    GraveGainGame.prototype.populateMissionTargets = function () {
        if (!this.currentMission || !this.currentMission.objectives) return;
        var terrain = this.engine.getTerrain();
        var st = this.engine.getState();
        var hasBoss = st.enemies.some(function (e) { return e.type === 'boss'; });
        if (!hasBoss && this.currentMission.objectives.some(function (o) { return o.id === 'slay_boss'; })) {
            var room = terrain.safespaceRoom || terrain.rooms[terrain.rooms.length - 1];
            var pos = terrain.gridToWorld(room.cx, room.cz);
            var bossTpl = EnemyTypes.find(function (e) { return e.type === 'boss'; }) || EnemyTypes[7];
            st.enemies.push({
                id: 'boss_' + Date.now(),
                name: this.currentMission.bossType || bossTpl.name,
                emoji: bossTpl.emoji,
                type: 'boss',
                bloodColor: bossTpl.blood || 'red',
                x: pos.x,
                y: pos.y,
                z: pos.z,
                vx: 0,
                vy: 0,
                vz: 0,
                spawnX: pos.x,
                spawnZ: pos.z,
                radius: 1.05,
                angle: 0,
                maxHp: bossTpl.hp,
                hp: bossTpl.hp,
                dmg: bossTpl.dmg,
                speed: 2.2,
                state: 'idle',
                flash: 0,
                knockdownTimer: 0,
                staggerTimer: 0,
                isDead: false,
                attackCooldown: 0
            });
            this.syncCompatibilityViews();
        }
    };

    GraveGainGame.prototype.triggerMeleeSwing = function () {
        var hits = this.engine.triggerMeleeSwing();
        if (hits > 0) this.audio.play('hit');
        this.syncCompatibilityViews();
        return hits;
    };

    GraveGainGame.prototype.dealAoEDamage = function (pxX, pxY, radiusPx, dmg) {
        var st = this.engine.getState();
        var py = st.player ? st.player.y : 0;
        this.engine.dealAoEDamage3D(pxX * M_PER_PX, py, pxY * M_PER_PX, radiusPx * M_PER_PX, dmg, 'ability');
        this.syncCompatibilityViews();
    };

    GraveGainGame.prototype.nearestEnemy = function (maxDistPx) {
        if (!this.player) return null;
        var maxD = typeof maxDistPx === 'number' ? maxDistPx : Infinity;
        var best = null;
        for (var i = 0; i < this.enemies.length; i++) {
            var e = this.enemies[i];
            var d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
            if (d < maxD) { maxD = d; best = e; }
        }
        return best;
    };

    GraveGainGame.prototype.activateBlock = function () {
        var ep = this.engine.getState().player;
        if (!ep || ep.blockCooldown > 0) return false;
        ep.perfectBlockWindow = 0.22;
        ep.blockCooldown = 0.45;
        this.audio.play('block');
        if (this.player) this.vfx.spawnPerfectBlockVFX(this.player.x, this.player.y);
        return true;
    };

    GraveGainGame.prototype.tryInteract = function () {
        var res = this.engine.interactNearest();
        if (res) {
            this.audio.play('loot');
            return true;
        }
        return false;
    };

    GraveGainGame.prototype.executeTurnAction = function (action) {
        var res = this.engine.executeTurnAction(action);
        this.syncCompatibilityViews();
        var counter = document.getElementById('hudTurnCounter');
        if (counter) counter.textContent = 'Turn ' + this.engine.getState().turnCount;
        var phase = document.getElementById('hudTurnPhase');
        if (phase) phase.textContent = res === 'blocked' ? '🧱 Blocked - pick another way' : 'YOUR TURN';
        this.updateHUD();
        return res;
    };

    GraveGainGame.prototype.update = function (dt) {
        if (!this.player) return;
        if (this.isDialogueActive) return;

        var st = this.engine.getState();
        if (this.controlMode === 'turnbased') {
            var keys = this.input.keys;
            var action = keys['KeyW'] || keys['ArrowUp'] ? 'up' :
                keys['KeyS'] || keys['ArrowDown'] ? 'down' :
                keys['KeyA'] || keys['ArrowLeft'] ? 'left' :
                keys['KeyD'] || keys['ArrowRight'] ? 'right' :
                keys['Space'] ? 'wait' :
                this.input.mouse.click ? 'attack' :
                this.input.interactPressed ? 'interact' :
                keys['KeyF'] ? 'ability' : null;
            if (action) {
                ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyF'].forEach(function (k) { keys[k] = false; });
                this.input.mouse.click = false;
                this.input.interactPressed = false;
                this.executeTurnAction(action);
            }
            return;
        }

        if (this.input.keys['KeyF']) {
            this.input.keys['KeyF'] = false;
            this.player.triggerAbility();
        }
        if (this.input.mouse.rightClick) this.activateBlock();

        this.engine.step(dt);
        this.vfx.update(dt);
        this.syncCompatibilityViews();

        if (this.controlMode === 'chrono') {
            var badge = document.getElementById('chronoStatusBadge');
            if (badge) {
                badge.textContent = st.chronoScale > 0.25 ? ('TIME FLOWING ' + Math.round(st.chronoScale * 100) + '%') : 'TIME FROZEN';
            }
        }

        // Check safespace floor exit
        var terrain = this.engine.getTerrain();
        if (terrain && terrain.safespaceRoom && st.player) {
            var safeW = terrain.gridToWorld(terrain.safespaceRoom.cx, terrain.safespaceRoom.cz);
            if (Math.hypot(st.player.x - safeW.x, st.player.z - safeW.z) < 1.6 && !this.currentMission) {
                this.floorIndex++;
                this.buildDungeonLayer();
            }
        }

        if (st.player && st.player.isDead) {
            this.gameOver(false);
            return;
        }

        this.updateHUD();
    };

    GraveGainGame.prototype.render = function () {
        this.engine.renderFrame();
    };

    GraveGainGame.prototype.togglePause = function () {
        var gm = document.getElementById('gameMain');
        if (!this.player || (gm && gm.classList.contains('hidden'))) return;
        if (this.loop.isPaused) {
            document.getElementById('pauseScreen').classList.add('hidden');
            this.engine.setPaused(false, 'pause');
            this.loop.start();
        } else {
            this.loop.stop();
            this.engine.setPaused(true, 'pause');
            document.getElementById('pauseScreen').classList.remove('hidden');
        }
    };

    GraveGainGame.prototype.setControlMode = function (mode) {
        this.controlMode = ['realtime', 'chrono', 'turnbased'].indexOf(mode) >= 0 ? mode : 'realtime';
        this.engine.setTemporalMode(this.controlMode);
        this.chronoScale = this.controlMode === 'chrono' ? 0.04 : 1;
        var self = this;
        document.querySelectorAll('.btn-mode').forEach(function (btn) {
            var selected = btn.dataset.mode === self.controlMode;
            btn.classList.toggle('active', selected);
            btn.setAttribute('aria-pressed', String(selected));
        });
        document.querySelectorAll('.char-mode-card').forEach(function (btn) {
            var selected = btn.dataset.mode === self.controlMode;
            btn.classList.toggle('selected', selected);
            btn.setAttribute('aria-pressed', String(selected));
        });
        var sg = document.getElementById('speedSelectorGroup');
        var cg = document.getElementById('chronoDisplayGroup');
        var tg = document.getElementById('turnDisplayGroup');
        var mw = document.getElementById('mobileWaitBtn');
        if (sg) sg.classList.toggle('hidden', this.controlMode !== 'realtime');
        if (cg) cg.classList.toggle('hidden', this.controlMode !== 'chrono');
        if (tg) tg.classList.toggle('hidden', this.controlMode !== 'turnbased');
        if (mw) mw.classList.toggle('hidden', this.controlMode !== 'turnbased');
        this.turnCount = 1;
        var counter = document.getElementById('hudTurnCounter');
        if (counter) counter.textContent = 'Turn 1';
    };

    GraveGainGame.prototype.setGameSpeed = function (speed) {
        this.gameSpeed = this.engine.setGameSpeed(speed);
        var self = this;
        document.querySelectorAll('.btn-speed').forEach(function (btn) {
            var selected = Number(btn.dataset.speed) === self.gameSpeed;
            btn.classList.toggle('active', selected);
            btn.setAttribute('aria-pressed', String(selected));
        });
    };

    GraveGainGame.prototype.getDifficultyProfile = function () {
        return {
            easy: { hp: 0.6, damage: 0.5, xp: 0.75, loot: 1.5 },
            normal: { hp: 1, damage: 1, xp: 1, loot: 1 },
            nightmare: { hp: 2.5, damage: 2, xp: 2.5, loot: 0.6 }
        }[this.difficultyMultiplierSetting] || { hp: 1, damage: 1, xp: 1, loot: 1 };
    };

    GraveGainGame.prototype.getScaledRewards = function (gold, xp) {
        var d = this.getDifficultyProfile();
        return {
            gold: Math.max(1, Math.round((gold || 0) * d.loot)),
            xp: Math.max(0, Math.round((xp || 0) * d.xp))
        };
    };

    GraveGainGame.prototype.updateMissionUI = function () {
        var tracker = document.getElementById('missionTracker');
        var text = document.getElementById('missionObjectiveText');
        if (!tracker || !text) return;
        if (!this.currentMission) {
            tracker.classList.add('hidden');
            return;
        }
        var objectives = this.currentMission.objectives || [];
        text.textContent = objectives.map(function (obj) { return obj.desc + ': ' + obj.current + '/' + obj.count; }).join('  •  ');
        tracker.classList.remove('hidden');
    };

    GraveGainGame.prototype.updateHUD = function () {
        if (!this.player) return;
        var hpBar = document.getElementById('hudHpBar');
        var hpText = document.getElementById('hudHpText');
        var stBar = document.getElementById('hudStaminaBar');
        var stText = document.getElementById('hudStaminaText');
        if (hpBar) hpBar.style.width = Math.max(0, (this.player.hp / Math.max(1, this.player.maxHp)) * 100) + '%';
        if (hpText) hpText.textContent = Math.round(this.player.hp) + '/' + Math.round(this.player.maxHp);
        if (stBar) stBar.style.width = (this.player.stamina / Math.max(1, this.player.maxStamina)) * 100 + '%';
        if (stText) stText.textContent = Math.round(this.player.stamina) + '/' + Math.round(this.player.maxStamina);

        var resBar = document.getElementById('hudResourceBar');
        var resLabel = document.getElementById('hudResourceLabel');
        var resText = document.getElementById('hudResourceText');
        if (resBar && resLabel && resText) {
            if (this.player.race === Race.ELF) {
                resLabel.textContent = '🔮 Mana';
                resBar.style.width = (this.player.mana / this.player.maxMana) * 100 + '%';
                resText.textContent = Math.round(this.player.mana) + '/' + this.player.maxMana;
            } else if (this.player.race === Race.ORC) {
                resLabel.textContent = '🔥 Rage';
                resBar.style.width = this.player.rage + '%';
                resText.textContent = Math.round(this.player.rage) + '/100';
            } else if (this.player.race === Race.HUMAN) {
                resLabel.textContent = '🛡️ Shield';
                resBar.style.width = (this.player.shieldBubble / 20) * 100 + '%';
                resText.textContent = Math.round(this.player.shieldBubble) + '/20';
            } else {
                resLabel.textContent = '💎 Stone';
                resBar.style.width = this.player.stoneForm ? '100%' : '0%';
                resText.textContent = this.player.stoneForm ? 'IMMUNE' : 'READY';
            }
        }

        var gEl = document.getElementById('hudGoldText');
        var uEl = document.getElementById('hudUusdText');
        var fEl = document.getElementById('hudFloorText');
        var xEl = document.getElementById('hudXpText');
        if (gEl) gEl.textContent = this.gold;
        if (uEl) uEl.textContent = this.uusd;
        if (fEl) fEl.textContent = 'L' + this.floorIndex + ' · Lv' + this.player.level;
        if (xEl) xEl.textContent = Math.round(this.player.xp) + ' / ' + this.player.nextLevelXp + ' XP';
    };

    GraveGainGame.prototype.loadState = function () {
        var saved = SaveSystem.load();
        if (saved) {
            this.gold = Math.max(0, Number(saved.gold) || 0);
            this.uusd = Math.max(0, Number(saved.uusd) || 0);
            this.quartersLevel = Math.min(QuartersUpgrades.length, Math.max(1, Math.floor(Number(saved.quartersLevel) || 1)));
            this.prestige = Math.max(0, Number(saved.prestige) || 0);
            this.dailyChallengeDate = typeof saved.dailyChallengeDate === 'string' ? saved.dailyChallengeDate : null;
            this.dailyChallenges = Array.isArray(saved.dailyChallenges) ? saved.dailyChallenges : null;
            if (Array.isArray(saved.botanyCrops)) {
                this.botanyCrops = saved.botanyCrops.slice(0, this.getBotanySlotLimit()).map(function (crop) {
                    var seed = BotanySeeds.find(function (item) { return item.id === (crop && crop.seedId); });
                    return seed ? { seedId: seed.id, startTime: Math.max(0, Number(crop.startTime) || 0), growthTime: seed.time, capacity: seed.space } : { seedId: null, startTime: 0, growthTime: 0, capacity: 0 };
                });
            }
            if (saved.settings) {
                this.difficultyMultiplierSetting = saved.settings.difficulty || 'normal';
                this.audio.masterVolume = Number.isFinite(saved.settings.volume) ? saved.settings.volume : 0.8;
                this.autoPickupRange = saved.settings.pickupRange || 100;
                this.controlMode = saved.settings.controlMode || 'realtime';
                this.gameSpeed = saved.settings.gameSpeed || 1;
                var sd = document.getElementById('settingsDifficulty'); if (sd) sd.value = this.difficultyMultiplierSetting;
                var mv = document.getElementById('settingsMasterVol'); if (mv) mv.value = Math.round(this.audio.masterVolume * 100);
                var pr = document.getElementById('settingsPickupRange'); if (pr) pr.value = this.autoPickupRange;
            }
        }
        this.updateHubQuartersUI();
        this.setControlMode(this.controlMode);
    };

    GraveGainGame.prototype.saveState = function () { SaveSystem.save(this); };
    GraveGainGame.prototype.startAutoSaveTimer = function () {
        var self = this;
        setInterval(function () { self.saveState(); }, 60000);
    };

    GraveGainGame.prototype.generateDailyChallenges = function () {
        var dateStr = new Date().toDateString();
        if (this.dailyChallengeDate === dateStr && Array.isArray(this.dailyChallenges) && this.dailyChallenges.length === 3) return;
        var hash = 0;
        for (var i = 0; i < dateStr.length; i++) hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
        this.dailyChallenges = [
            { id: 1, desc: 'Slay ' + (Math.abs(hash % 20) + 15) + ' undead creatures.', target: Math.abs(hash % 20) + 15, current: 0, done: false, claimed: false, rewardGold: 75, rewardUusd: 25 },
            { id: 2, desc: 'Collect ' + (Math.abs((hash >> 2) % 300) + 200) + ' dungeon Gold.', target: Math.abs((hash >> 2) % 300) + 200, current: 0, done: false, claimed: false, rewardGold: 125, rewardUusd: 50 },
            { id: 3, desc: 'Reach Layer ' + (Math.abs((hash >> 4) % 3) + 3) + ' depth.', target: Math.abs((hash >> 4) % 3) + 3, current: 1, done: false, claimed: false, rewardGold: 150, rewardUusd: 75 }
        ];
        this.dailyChallengeDate = dateStr;
    };

    GraveGainGame.prototype.renderDailyChallenges = function () {
        var el = document.getElementById('dailyChallengesList');
        if (!el || !this.dailyChallenges) return;
        el.innerHTML = this.dailyChallenges.map(function (c) {
            return '<div class="daily-challenge-item"><span>' + c.desc + '<small class="daily-reward"> +' + c.rewardGold + 'g / +' + c.rewardUusd + '$</small></span>' +
                (c.done && !c.claimed ? '<button type="button" class="btn-game daily-claim-btn" onclick="window.GraveGainGame.claimDailyChallenge(' + c.id + ')">Claim</button>' :
                    '<strong style="color:' + (c.done ? 'var(--grave-purple-glow)' : 'var(--grave-text)') + '">' + (c.claimed ? '✓ Claimed' : (c.current + ' / ' + c.target)) + '</strong>') + '</div>';
        }).join('');
    };

    GraveGainGame.prototype.claimDailyChallenge = function (id) {
        var c = this.dailyChallenges && this.dailyChallenges.find(function (item) { return item.id === id; });
        if (!c || !c.done || c.claimed) return;
        c.claimed = true;
        this.gold += c.rewardGold;
        this.uusd += c.rewardUusd;
        this.audio.play('loot');
        this.renderDailyChallenges();
        this.saveState();
    };

    GraveGainGame.prototype.updateChallengeProgress = function (type, amt) {
        if (!this.dailyChallenges) return;
        var before = this.dailyChallenges.filter(function (c) { return c.done; }).length;
        if (type === 'slay') {
            this.dailyChallenges[0].current = Math.min(this.dailyChallenges[0].target, this.dailyChallenges[0].current + amt);
            if (this.dailyChallenges[0].current >= this.dailyChallenges[0].target) this.dailyChallenges[0].done = true;
        } else if (type === 'gold') {
            this.dailyChallenges[1].current = Math.min(this.dailyChallenges[1].target, this.dailyChallenges[1].current + amt);
            if (this.dailyChallenges[1].current >= this.dailyChallenges[1].target) this.dailyChallenges[1].done = true;
        } else if (type === 'depth') {
            this.dailyChallenges[2].current = Math.max(this.dailyChallenges[2].current, amt);
            if (this.dailyChallenges[2].current >= this.dailyChallenges[2].target) this.dailyChallenges[2].done = true;
        }
        this.renderDailyChallenges();
        if (this.dailyChallenges.filter(function (c) { return c.done; }).length > before) this.saveState();
    };

    GraveGainGame.prototype.setupUIListeners = function () {
        var self = this;
        var byId = function (id) { return document.getElementById(id); };

        if (byId('btnStoryMode')) byId('btnStoryMode').addEventListener('click', function () {
            byId('mainMenuScreen').classList.add('hidden');
            byId('storyMissionScreen').classList.remove('hidden');
            self.renderStoryMissionsList();
        });
        if (byId('btnStoryBack')) byId('btnStoryBack').addEventListener('click', function () {
            byId('storyMissionScreen').classList.add('hidden');
            byId('mainMenuScreen').classList.remove('hidden');
        });
        if (byId('btnStartStoryMission')) byId('btnStartStoryMission').addEventListener('click', function () {
            if (!self.selectedStoryMissionId) return;
            byId('storyMissionScreen').classList.add('hidden');
            byId('charSelectScreen').classList.remove('hidden');
            self.renderCharSelect();
        });
        if (byId('btnPlay')) byId('btnPlay').addEventListener('click', function () {
            self.selectedStoryMissionId = null;
            byId('mainMenuScreen').classList.add('hidden');
            byId('charSelectScreen').classList.remove('hidden');
            self.renderCharSelect();
        });
        if (byId('btnEnterHub')) byId('btnEnterHub').addEventListener('click', function () {
            byId('mainMenuScreen').classList.add('hidden');
            byId('hubScreen').classList.remove('hidden');
            self.renderBotany();
            self.generateRepairMiniGame();
        });
        if (byId('btnOpenSettings')) byId('btnOpenSettings').addEventListener('click', function () {
            byId('settingsScreen').classList.remove('hidden');
        });
        if (byId('btnSaveSettings')) byId('btnSaveSettings').addEventListener('click', function () {
            self.difficultyMultiplierSetting = byId('settingsDifficulty').value;
            self.audio.masterVolume = byId('settingsMasterVol').value / 100;
            self.autoPickupRange = parseInt(byId('settingsPickupRange').value, 10) || 100;
            var rig = self.engine.getCameraRig && self.engine.getCameraRig();
            if (rig) {
                rig.setOptions({
                    shakeEnabled: byId('settingsCameraShake') ? byId('settingsCameraShake').checked : true,
                    leadEnabled: byId('settingsCameraLead') ? byId('settingsCameraLead').checked : true,
                    punchEnabled: byId('settingsCameraPunch') ? byId('settingsCameraPunch').checked : true
                });
            }
            self.saveState();
            byId('settingsScreen').classList.add('hidden');
        });

        var showCharacterStep = function (step) {
            document.querySelectorAll('.character-step').forEach(function (panel) { panel.classList.toggle('hidden', panel.id !== step); });
            var labels = { raceStep: 'STEP 1 OF 3 · CHOOSE YOUR RACE', classStep: 'STEP 2 OF 3 · CHOOSE YOUR CLASS', modeStep: 'STEP 3 OF 3 · SET YOUR SIMULATION' };
            var pr = document.querySelector('.character-flow-progress');
            if (pr) pr.textContent = labels[step];
        };
        if (byId('btnRaceBack')) byId('btnRaceBack').addEventListener('click', function () {
            byId('charSelectScreen').classList.add('hidden');
            byId('mainMenuScreen').classList.remove('hidden');
        });
        if (byId('btnRaceNext')) byId('btnRaceNext').addEventListener('click', function () {
            var race = document.querySelector('.char-card.selected')?.dataset.race || Race.HUMAN;
            var raceData = RaceData[race];
            byId('selectedRaceSummary').textContent = raceData.emoji + ' ' + raceData.name + ' selected · Now choose your combat role.';
            showCharacterStep('classStep');
        });
        if (byId('btnClassBack')) byId('btnClassBack').addEventListener('click', function () { showCharacterStep('raceStep'); });
        if (byId('btnClassNext')) byId('btnClassNext').addEventListener('click', function () {
            var race = document.querySelector('.char-card.selected')?.dataset.race || Race.HUMAN;
            var classType = document.querySelector('.class-btn.selected')?.dataset.class || ClassType.WARRIOR;
            byId('selectedBuildSummary').textContent = RaceData[race].emoji + ' ' + RaceData[race].name + ' ' + classType.toUpperCase() + ' · Choose how time behaves in your run.';
            showCharacterStep('modeStep');
        });
        if (byId('btnModeBack')) byId('btnModeBack').addEventListener('click', function () { showCharacterStep('classStep'); });
        if (byId('btnCharSelectStart')) byId('btnCharSelectStart').addEventListener('click', function () {
            var selRace = document.querySelector('.char-card.selected')?.dataset.race || Race.HUMAN;
            var selClass = document.querySelector('.class-btn.selected')?.dataset.class || ClassType.WARRIOR;
            var selMode = document.querySelector('.char-mode-card.selected')?.dataset.mode || self.controlMode;
            self.setControlMode(selMode);
            byId('charSelectScreen').classList.add('hidden');
            byId('gameMain').classList.remove('hidden');
            self.initRun(selRace, selClass);
        });

        if (byId('btnLeaveHub')) byId('btnLeaveHub').addEventListener('click', function () {
            byId('hubScreen').classList.add('hidden');
            byId('mainMenuScreen').classList.remove('hidden');
            self.saveState();
        });

        var tabBtns = document.querySelectorAll('.hub-tab-btn');
        tabBtns.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                tabBtns.forEach(function (b) { b.classList.remove('active'); });
                e.target.classList.add('active');
                var targetTab = e.target.dataset.tab;
                document.querySelectorAll('.hub-pane').forEach(function (p) { p.classList.remove('active'); });
                byId('tab-' + targetTab)?.classList.add('active');
                if (targetTab === 'exchange') {
                    byId('exchangeGoldBalance').textContent = self.gold + ' Gold';
                    byId('exchangeUusdBalance').textContent = self.uusd + ' $UUSD';
                } else if (targetTab === 'lore') {
                    self.renderLoreList();
                }
            });
        });

        if (byId('btnBuyUusd')) byId('btnBuyUusd').addEventListener('click', function () {
            if (self.gold >= 10) {
                self.gold -= 10; self.uusd += 100; self.audio.play('loot');
                byId('exchangeGoldBalance').textContent = self.gold + ' Gold';
                byId('exchangeUusdBalance').textContent = self.uusd + ' $UUSD';
                self.saveState();
            }
        });
        if (byId('btnBuyGold')) byId('btnBuyGold').addEventListener('click', function () {
            if (self.uusd >= 100) {
                self.uusd -= 100; self.gold += 10; self.audio.play('loot');
                byId('exchangeGoldBalance').textContent = self.gold + ' Gold';
                byId('exchangeUusdBalance').textContent = self.uusd + ' $UUSD';
                self.saveState();
            }
        });
        if (byId('btnUpgradeQuarters')) byId('btnUpgradeQuarters').addEventListener('click', function () {
            if (self.quartersLevel < 6) {
                var cost = QuartersUpgrades[self.quartersLevel].cost;
                if (self.uusd >= cost) {
                    self.uusd -= cost; self.quartersLevel++; self.audio.play('ability');
                    self.updateHubQuartersUI(); self.renderBotany(); self.saveState();
                }
            }
        });

        if (byId('btnGenerateCircuit')) byId('btnGenerateCircuit').addEventListener('click', function () { self.generateRepairMiniGame(); });
        document.querySelectorAll('.btn-mode').forEach(function (btn) { btn.addEventListener('click', function () { self.setControlMode(btn.dataset.mode); }); });
        document.querySelectorAll('.btn-speed').forEach(function (btn) { btn.addEventListener('click', function () { self.setGameSpeed(btn.dataset.speed); }); });
        if (byId('btnWaitTurn')) byId('btnWaitTurn').addEventListener('click', function () { self.executeTurnAction('wait'); });
        document.querySelectorAll('.char-mode-card').forEach(function (btn) { btn.addEventListener('click', function () { self.setControlMode(btn.dataset.mode); }); });

        if (byId('btnGoToMenu')) byId('btnGoToMenu').addEventListener('click', function () {
            byId('gameOverScreen').classList.add('hidden');
            byId('mainMenuScreen').classList.remove('hidden');
        });
        if (byId('btnReturnToHub')) byId('btnReturnToHub').addEventListener('click', function () {
            self.loop.stop();
            byId('gameMain').classList.add('hidden');
            byId('mainMenuScreen').classList.remove('hidden');
            self.saveState();
        });
        if (byId('btnPause')) byId('btnPause').addEventListener('click', function () { self.togglePause(); });
        if (byId('btnResume')) byId('btnResume').addEventListener('click', function () { self.togglePause(); });
        if (byId('btnAbandon')) byId('btnAbandon').addEventListener('click', function () {
            self.loop.stop();
            byId('pauseScreen').classList.add('hidden');
            byId('gameMain').classList.add('hidden');
            byId('mainMenuScreen').classList.remove('hidden');
            self.saveState();
        });

        document.addEventListener('visibilitychange', function () {
            try {
                if (document.hidden && self.player && !self.loop.isPaused && !byId('gameMain').classList.contains('hidden')) {
                    self.togglePause();
                }
            } catch (_) {}
        });
    };

    GraveGainGame.prototype.renderCharSelect = function () {
        var self = this;
        document.querySelectorAll('.char-mode-card').forEach(function (btn) {
            var selected = btn.dataset.mode === self.controlMode;
            btn.classList.toggle('selected', selected);
            btn.setAttribute('aria-pressed', String(selected));
        });
        document.querySelectorAll('.character-step').forEach(function (p) { p.classList.toggle('hidden', p.id !== 'raceStep'); });
        var prog = document.querySelector('.character-flow-progress');
        if (prog) prog.textContent = 'STEP 1 OF 3 · CHOOSE YOUR RACE';

        var raceGrid = document.getElementById('raceGrid');
        if (raceGrid) {
            raceGrid.innerHTML = Object.keys(RaceData).map(function (key, i) {
                var r = RaceData[key];
                return '<button type="button" class="char-card ' + (i === 0 ? 'selected' : '') + '" data-race="' + key + '" aria-pressed="' + (i === 0) + '">' +
                    '<span class="char-emoji">' + r.emoji + '</span><div class="char-name">' + r.name + '</div><div class="char-desc">' + r.desc + '</div></button>';
            }).join('');
            var cards = raceGrid.querySelectorAll('.char-card');
            cards.forEach(function (card) {
                card.addEventListener('click', function () {
                    cards.forEach(function (c) { c.classList.remove('selected'); c.setAttribute('aria-pressed', 'false'); });
                    card.classList.add('selected'); card.setAttribute('aria-pressed', 'true');
                    updateClassTitles();
                });
            });
        }

        var classGrid = document.getElementById('classGrid');
        if (classGrid) {
            classGrid.innerHTML = Object.values(ClassType).map(function (key, i) {
                var title = ClassTitles[key][Race.HUMAN];
                return '<button type="button" class="class-btn ' + (i === 0 ? 'selected' : '') + '" data-class="' + key + '" aria-pressed="' + (i === 0) + '"><strong>' + title + '</strong><small>' + key.toUpperCase() + '</small></button>';
            }).join('');
            var cBtns = classGrid.querySelectorAll('.class-btn');
            cBtns.forEach(function (btn) {
                btn.addEventListener('click', function () {
                    cBtns.forEach(function (b) { b.classList.remove('selected'); b.setAttribute('aria-pressed', 'false'); });
                    btn.classList.add('selected'); btn.setAttribute('aria-pressed', 'true');
                });
            });
        }
        function updateClassTitles() {
            var race = document.querySelector('.char-card.selected')?.dataset.race || Race.HUMAN;
            if (classGrid) {
                classGrid.querySelectorAll('.class-btn').forEach(function (btn) {
                    btn.querySelector('strong').textContent = ClassTitles[btn.dataset.class][race];
                });
            }
        }
        updateClassTitles();
    };

    GraveGainGame.prototype.updateHubQuartersUI = function () {
        this.ensureBotanySlots();
        var ql = document.getElementById('hubQuartersLevel');
        var qs = document.getElementById('hubQuartersSize');
        var qc = document.getElementById('hubQuartersCapacity');
        var qcost = document.getElementById('hubQuartersCost');
        var ubtn = document.getElementById('btnUpgradeQuarters');
        var up = QuartersUpgrades[this.quartersLevel - 1];
        if (ql) ql.textContent = 'Level ' + this.quartersLevel;
        if (qs) qs.textContent = up.size;
        if (qc) qc.textContent = up.capacity + ' Space';
        if (qcost) qcost.textContent = this.quartersLevel < 6 ? (QuartersUpgrades[this.quartersLevel].cost + ' $UUSD') : 'MAX LEVEL REACHED';
        if (ubtn) {
            ubtn.disabled = this.quartersLevel >= QuartersUpgrades.length;
            ubtn.textContent = this.quartersLevel >= QuartersUpgrades.length ? '✓ Maximum Quarters Reached' : '🔧 Purchase Expansion Upgrade';
        }
    };

    GraveGainGame.prototype.getBotanySlotLimit = function () { return Math.min(4 + (this.quartersLevel - 1) * 2, 12); };
    GraveGainGame.prototype.ensureBotanySlots = function () {
        while (this.botanyCrops.length < this.getBotanySlotLimit()) {
            this.botanyCrops.push({ seedId: null, startTime: 0, growthTime: 0, capacity: 0 });
        }
    };
    GraveGainGame.prototype.getBotanySpaceUsed = function () {
        return this.botanyCrops.reduce(function (used, crop) {
            var seed = crop.seedId && BotanySeeds.find(function (s) { return s.id === crop.seedId; });
            return used + (seed ? seed.space : 0);
        }, 0);
    };
    GraveGainGame.prototype.renderBotany = function () {
        var grid = document.getElementById('botanyGrid');
        if (!grid) return;
        var now = Math.floor(Date.now() / 1000);
        this.ensureBotanySlots();
        var capacity = QuartersUpgrades[this.quartersLevel - 1].capacity;
        var capEl = document.getElementById('botanyCapacityText');
        if (capEl) capEl.textContent = 'Incubators: ' + this.botanyCrops.length + '/' + this.getBotanySlotLimit() + ' · Growing space: ' + this.getBotanySpaceUsed() + '/' + capacity;
        grid.innerHTML = this.botanyCrops.map(function (crop, index) {
            if (crop.seedId === null) {
                return '<div class="plant-slot"><strong>[Empty Incubator Space]</strong><div style="display:flex;flex-direction:column;gap:5px;margin-top:8px;">' +
                    BotanySeeds.map(function (s) { return '<button class="btn-game" style="font-size:0.75rem;padding:5px 10px;" onclick="window.GraveGainGame.plantSeed(' + index + ', \'' + s.id + '\')">Plant ' + s.name + ' (Cost: 20 $UUSD)</button>'; }).join('') +
                    '</div></div>';
            }
            var seed = BotanySeeds.find(function (s) { return s.id === crop.seedId; });
            var elapsed = now - crop.startTime;
            var pct = Math.min(100, Math.floor((elapsed / crop.growthTime) * 100));
            return '<div class="plant-slot"><div class="plant-info"><span>' + seed.emoji + ' ' + seed.name + '</span><span>' + pct + '%</span></div>' +
                '<div class="plant-progress-bg"><div class="plant-progress-fill" style="width:' + pct + '%;"></div></div>' +
                (pct >= 100 ? '<button class="btn-game btn-primary" style="font-size:0.8rem;padding:6px 12px;margin-top:5px;" onclick="window.GraveGainGame.harvestCrop(' + index + ')">🌾 Harvest (Gain ' + (seed.yield * seed.value) + ' $UUSD)</button>' :
                    '<span style="font-size:0.75rem;color:var(--grave-text-muted);">Growing... (' + Math.max(0, crop.growthTime - elapsed) + 's remaining)</span>') +
                '</div>';
        }).join('');
    };
    GraveGainGame.prototype.plantSeed = function (slotIndex, seedId) {
        var seed = BotanySeeds.find(function (s) { return s.id === seedId; });
        var cap = QuartersUpgrades[this.quartersLevel - 1].capacity;
        if (seed && this.uusd >= 20 && this.getBotanySpaceUsed() + seed.space <= cap) {
            this.uusd -= 20;
            this.botanyCrops[slotIndex] = { seedId: seed.id, startTime: Math.floor(Date.now() / 1000), growthTime: seed.time };
            this.audio.play('loot');
            this.renderBotany();
            this.saveState();
        }
    };
    GraveGainGame.prototype.harvestCrop = function (slotIndex) {
        var crop = this.botanyCrops[slotIndex];
        var seed = BotanySeeds.find(function (s) { return s.id === crop.seedId; });
        if (!seed) return;
        this.uusd += seed.yield * seed.value;
        this.botanyCrops[slotIndex] = { seedId: null, startTime: 0, growthTime: 0 };
        this.audio.play('loot');
        this.renderBotany();
        this.saveState();
    };

    GraveGainGame.prototype.generateRepairMiniGame = function () {
        var area = document.getElementById('repairCircuitArea');
        if (!area) return;
        area.innerHTML = '';
        this.circuitConnected = false;
        var stEl = document.getElementById('repairStatus');
        if (stEl) stEl.textContent = 'Status: Calibration offline';
        var termX = 220, termY = 100;
        var target = document.createElement('div');
        target.className = 'circuit-node terminal';
        target.style.left = termX + 'px'; target.style.top = termY + 'px'; target.textContent = '🎯';
        area.appendChild(target);
        var comp = document.createElement('div');
        comp.className = 'circuit-node component';
        comp.style.left = '40px'; comp.style.top = '100px'; comp.textContent = '💠';
        area.appendChild(comp);
        var isDragging = false;
        var self = this;
        var dragMove = function (e) {
            if (!isDragging) return;
            var rect = area.getBoundingClientRect();
            var cx = e.clientX || (e.touches && e.touches[0].clientX);
            var cy = e.clientY || (e.touches && e.touches[0].clientY);
            var px = Math.max(16, Math.min(rect.width - 16, cx - rect.left));
            var py = Math.max(16, Math.min(rect.height - 16, cy - rect.top));
            comp.style.left = px + 'px'; comp.style.top = py + 'px';
            if (Math.hypot(px - termX, py - termY) < 20) {
                isDragging = false;
                comp.style.left = termX + 'px'; comp.style.top = termY + 'px';
                self.circuitConnected = true;
                if (stEl) stEl.textContent = 'Status: Circuit Calibrated successfully!';
                self.audio.play('block');
            }
        };
        comp.addEventListener('mousedown', function () { isDragging = true; });
        window.addEventListener('mousemove', dragMove);
        window.addEventListener('mouseup', function () { isDragging = false; });
        comp.addEventListener('touchstart', function () { isDragging = true; }, { passive: true });
        window.addEventListener('touchmove', dragMove, { passive: true });
        window.addEventListener('touchend', function () { isDragging = false; });
    };

    GraveGainGame.prototype.initMobileControls = function () {
        var self = this;
        var drawer = document.getElementById('mobileDrawer');
        var bagBtn = document.getElementById('thumbBagBtn');
        var craftBtn = document.getElementById('thumbCraftBtn');
        var targetBtn = document.getElementById('thumbTargetBtn');
        var tapBtn = document.getElementById('thumbTapBtn');
        if (!drawer && !bagBtn && !targetBtn && !tapBtn) return;
        var syncToggles = function () {
            if (targetBtn) {
                targetBtn.setAttribute('aria-pressed', String(self.input.autoTarget));
                targetBtn.querySelector('span').textContent = self.input.autoTarget ? 'Target:ON' : 'Target:OFF';
                targetBtn.classList.toggle('active', self.input.autoTarget);
            }
            if (tapBtn) {
                tapBtn.setAttribute('aria-pressed', String(self.input.tapMoveEnabled));
                tapBtn.querySelector('span').textContent = self.input.tapMoveEnabled ? 'Tap:ON' : 'Tap:OFF';
                tapBtn.classList.toggle('active', self.input.tapMoveEnabled);
            }
        };
        var openDrawer = function (pane) {
            if (!drawer) return;
            drawer.classList.remove('hidden');
            drawer.querySelectorAll('.mobile-drawer-tabs .thumb-tab[data-drawer]').forEach(function (b) { b.classList.toggle('active', b.dataset.drawer === pane); });
            drawer.querySelectorAll('.mobile-drawer-pane').forEach(function (p) { p.classList.remove('active'); });
            var activeEl = document.getElementById(pane === 'craft' ? 'drawerCraft' : 'drawerBag');
            if (activeEl) activeEl.classList.add('active');
            self.renderMobileDrawer();
            if (bagBtn) bagBtn.classList.toggle('active', pane === 'bag' && !drawer.classList.contains('hidden'));
            if (craftBtn) craftBtn.classList.toggle('active', pane === 'craft' && !drawer.classList.contains('hidden'));
        };
        var toggleDrawer = function (pane) {
            if (!drawer) return;
            var isOpen = !drawer.classList.contains('hidden');
            var activePaneEl = drawer.querySelector('.mobile-drawer-pane.active');
            var isSame = activePaneEl && activePaneEl.id === (pane === 'craft' ? 'drawerCraft' : 'drawerBag');
            if (isOpen && isSame) {
                drawer.classList.add('hidden');
                if (bagBtn) bagBtn.classList.remove('active');
                if (craftBtn) craftBtn.classList.remove('active');
            } else {
                openDrawer(pane);
            }
        };
        if (bagBtn) bagBtn.addEventListener('click', function () { toggleDrawer('bag'); });
        if (craftBtn) craftBtn.addEventListener('click', function () { toggleDrawer('craft'); });
        if (drawer) {
            drawer.querySelectorAll('.thumb-tab[data-drawer]').forEach(function (b) {
                b.addEventListener('click', function () { openDrawer(b.dataset.drawer); });
            });
        }
        if (targetBtn) targetBtn.addEventListener('click', function () { self.input.setAutoTarget(!self.input.autoTarget); syncToggles(); });
        if (tapBtn) tapBtn.addEventListener('click', function () { self.input.setTapMove(!self.input.tapMoveEnabled); syncToggles(); });
        if (document.getElementById('mobileDrawerClose')) {
            document.getElementById('mobileDrawerClose').addEventListener('click', function () { drawer.classList.add('hidden'); });
        }
        syncToggles();
        this.renderMobileDrawer();
    };

    GraveGainGame.prototype.renderMobileDrawer = function () {
        var bag = document.getElementById('drawerBag');
        var craft = document.getElementById('drawerCraft');
        if (!bag || !craft) return;
        var p = this.player;
        bag.innerHTML = '<div class="drawer-row"><span>❤️ HP ' + (p ? Math.round(p.hp) + '/' + p.maxHp : '—') + '</span><span>⚔️ ' + this.runKills + ' kills</span></div>' +
            '<div class="drawer-row"><span>🪙 ' + this.gold + ' · 💵 ' + this.uusd + '</span><span>Layer ' + this.floorIndex + '</span></div>';
        var now = Math.floor(Date.now() / 1000);
        this.ensureBotanySlots();
        var self = this;
        craft.innerHTML = (this.botanyCrops || []).slice(0, 4).map(function (crop, i) {
            if (!crop || !crop.seedId) {
                var s = BotanySeeds[0];
                return '<div class="drawer-row"><span>🌱 Slot ' + (i + 1) + ': empty</span><button class="btn-game" data-mact="plant" data-slot="' + i + '">Plant ' + s.name + ' (20 $UUSD)</button></div>';
            }
            var seed = BotanySeeds.find(function (s) { return s.id === crop.seedId; });
            var pct = Math.min(100, Math.floor(((now - crop.startTime) / crop.growthTime) * 100));
            return pct >= 100
                ? '<div class="drawer-row"><span>' + seed.emoji + ' ' + seed.name + ' ready</span><button class="btn-game btn-primary" data-mact="harvest" data-slot="' + i + '">Harvest</button></div>'
                : '<div class="drawer-row"><span>' + seed.emoji + ' ' + seed.name + ' ' + pct + '%</span><span>' + Math.max(0, crop.growthTime - (now - crop.startTime)) + 's</span></div>';
        }).join('') || '<span>No grow slots.</span>';
        craft.querySelectorAll('button[data-mact]').forEach(function (b) {
            b.addEventListener('click', function () {
                var slot = Number(b.dataset.slot);
                if (b.dataset.mact === 'plant') self.plantSeed(slot, BotanySeeds[0].id);
                else self.harvestCrop(slot);
                self.renderMobileDrawer();
            });
        });
    };

    GraveGainGame.prototype.renderLoreList = function () {
        var listEl = document.getElementById('loreList');
        if (!listEl || !window.GraveGainLore) return;
        var allLore = window.GraveGainLore.getAll();
        listEl.innerHTML = Object.keys(allLore).map(function (key) {
            var item = allLore[key];
            return '<button class="class-btn" style="text-align:left;padding:8px;font-size:0.8rem;width:100%;" onclick="window.GraveGainGame.viewLoreEntry(\'' + item.id + '\')">' + item.title + '</button>';
        }).join('');
        var speakBtn = document.getElementById('btnSpeakLore');
        var self = this;
        if (speakBtn && !speakBtn.dataset.bound) {
            speakBtn.dataset.bound = 'true';
            speakBtn.addEventListener('click', function () {
                var cid = speakBtn.dataset.currentId;
                var item = cid && window.GraveGainLore.get(cid);
                if (item) self.audio.speakFallback(item.content);
            });
        }
    };

    GraveGainGame.prototype.viewLoreEntry = function (id) {
        var item = window.GraveGainLore && window.GraveGainLore.get(id);
        if (!item) return;
        document.getElementById('loreTitle').textContent = item.title;
        document.getElementById('loreCategory').textContent = 'Category: ' + item.category.replace('_', ' ');
        document.getElementById('loreContent').textContent = item.content;
        var speakBtn = document.getElementById('btnSpeakLore');
        if (speakBtn) { speakBtn.style.display = 'block'; speakBtn.dataset.currentId = id; }
    };

    GraveGainGame.prototype.renderStoryMissionsList = function () {
        var grid = document.getElementById('storyMissionsGrid');
        var btnLaunch = document.getElementById('btnStartStoryMission');
        if (!grid || !window.GraveGainStoryMissions) return;
        var self = this;
        grid.innerHTML = window.GraveGainStoryMissions.map(function (m) {
            var unlocked = window.GraveGainStoryEngine.isUnlocked(m.id);
            var progress = window.GraveGainStoryEngine.getProgress();
            var stars = progress.stars[m.id] || 0;
            var isSelected = self.selectedStoryMissionId === m.id;
            var starStr = unlocked ? ('⭐'.repeat(stars) + '☆'.repeat(3 - stars)) : '🔒 Locked';
            return '<button type="button" class="glass-panel story-card ' + (unlocked ? '' : 'disabled') + ' ' + (isSelected ? 'selected' : '') + '" ' +
                'style="padding:12px;width:100%;text-align:left;font-family:var(--grave-font);color:var(--grave-text);border:1px solid ' + (isSelected ? 'var(--grave-gold)' : 'var(--grave-border)') + ';border-radius:8px;cursor:' + (unlocked ? 'pointer' : 'not-allowed') + ';opacity:' + (unlocked ? 1 : 0.6) + ';background:' + (isSelected ? 'rgba(168,85,247,0.2)' : 'rgba(0,0,0,0.4)') + ';" ' +
                (unlocked ? ('onclick="window.GraveGainGame.selectStoryMission(' + m.id + ')"') : 'disabled') + '>' +
                '<div style="font-size:0.75rem;text-transform:uppercase;color:var(--grave-gold);">' + m.location + '</div>' +
                '<h4 style="margin:4px 0;font-family:\'Orbitron\';font-size:0.95rem;color:white;">' + m.title + '</h4>' +
                '<p style="font-size:0.78rem;color:var(--grave-text-muted);margin:4px 0 8px 0;">' + m.subtitle + '</p>' +
                '<div style="display:flex;justify-content:space-between;align-items:center;font-size:0.8rem;"><span>' + starStr + '</span><span class="highlight-gold">+' + m.rewardGold + 'g | +' + m.rewardUusd + '$</span></div></button>';
        }).join('');
        if (btnLaunch) btnLaunch.disabled = !this.selectedStoryMissionId;
    };

    GraveGainGame.prototype.selectStoryMission = function (missionId) {
        if (!window.GraveGainStoryEngine.isUnlocked(missionId)) return;
        this.selectedStoryMissionId = missionId;
        this.renderStoryMissionsList();
    };

    GraveGainGame.prototype.playDialogueSequence = function (dialogueList, onComplete) {
        if (!dialogueList || !dialogueList.length) {
            if (onComplete) onComplete();
            return;
        }
        var screen = document.getElementById('storyDialogueScreen');
        var portrait = document.getElementById('dialoguePortrait');
        var speaker = document.getElementById('dialogueSpeaker');
        var text = document.getElementById('dialogueText');
        var nextBtn = document.getElementById('btnNextDialogue');
        var skipAllBtn = document.getElementById('btnSkipAllDialogue');
        if (!screen) { if (onComplete) onComplete(); return; }

        this.isDialogueActive = true;
        screen.classList.remove('hidden');
        var idx = 0;
        var self = this;
        function showLine() {
            var item = dialogueList[idx];
            portrait.textContent = item.portrait || '🤖';
            speaker.textContent = item.speaker;
            text.textContent = item.text;
            self.audio.speakFallback(item.text, item.speaker);
        }
        function finishDialogue() {
            nextBtn.onclick = null;
            if (skipAllBtn) skipAllBtn.onclick = null;
            screen.classList.add('hidden');
            self.isDialogueActive = false;
            if (onComplete) onComplete();
        }
        nextBtn.onclick = function () {
            idx++;
            if (idx < dialogueList.length) showLine();
            else finishDialogue();
        };
        if (skipAllBtn) skipAllBtn.onclick = finishDialogue;
        showLine();
    };

    GraveGainGame.prototype.checkStoryObjectives = function (enemyKilled, collectedItem) {
        if (!this.currentMission || !this.currentMission.objectives) return;
        var allComplete = true;
        this.currentMission.objectives.forEach(function (obj) {
            if (obj.current < obj.count) {
                if (obj.id === 'collect_ore' && collectedItem === 'ore') obj.current++;
                else if (obj.id === 'slay_boss' && enemyKilled && enemyKilled.type === 'boss') obj.current++;
                else if (enemyKilled && (obj.id === 'slay_all' || obj.id === 'survive_waves' || obj.id === 'slay_minions')) obj.current++;
                else if (obj.id === 'slay_skulls' && enemyKilled && enemyKilled.type === 'exploding') obj.current++;
                else if (obj.id === 'slay_elites' && enemyKilled && enemyKilled.type === 'elite') obj.current++;
            }
            if (obj.current < obj.count) allComplete = false;
        });
        this.updateMissionUI();
        if (allComplete && !this.currentMission.completed) {
            this.currentMission.completed = true;
            this.gold += this.currentMission.rewardGold;
            this.uusd += this.currentMission.rewardUusd;
            window.GraveGainStoryEngine.completeMission(this.currentMission.id, 3);
            this.saveState();
            var self = this;
            this.playDialogueSequence(this.currentMission.dialogueAfter, function () { self.gameOver(true); });
        }
    };

    GraveGainGame.prototype.openGigglesHelpCase = function () {
        var self = this;
        if (this.player && window.GigglesHelpDraft) {
            window.GigglesHelpDraft.present('gravegain2dA', this, function () { self.updateHUD(); });
        }
    };

    GraveGainGame.prototype.gameOver = function (victory) {
        victory = !!victory;
        this.loop.stop();
        document.getElementById('gameMain').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.remove('hidden');

        var missionComplete = victory && this.currentMission && this.currentMission.completed;
        document.getElementById('gameOverTitle').textContent = missionComplete ? 'MISSION COMPLETE' : (victory ? 'RUN COMPLETED' : 'RUN TERMINATED');
        document.getElementById('gameOverSub').textContent = missionComplete
            ? (this.currentMission.title + ' secured - campaign rewards transmitted.')
            : (victory ? 'Safespace terminal extracted' : 'Vitals flatlined');
        if (this.player) {
            document.getElementById('goRaceClass').textContent = this.player.race.toUpperCase() + ' ' + this.player.classType.toUpperCase();
            document.getElementById('goXp').textContent = Math.round(this.player.xp || 0);
        }
        document.getElementById('goFloor').textContent = 'Layer ' + this.floorIndex;
        document.getElementById('goKills').textContent = this.runKills;
        document.getElementById('goGold').textContent = this.runGold + (missionComplete ? this.currentMission.rewardGold : 0);

        if (victory && window.mattyjacksGameStats && typeof window.mattyjacksGameStats.victory === 'function') {
            try { window.mattyjacksGameStats.victory(); } catch (_) {}
        }
        this.audio.speakFallback(missionComplete ? 'Mission complete. Rewards secured.' : (victory ? 'Run completed. Safespace reached.' : 'Game over. Run terminated.'));
        this.saveState();
    };

    window.addEventListener('DOMContentLoaded', function () {
        window.GraveGainGame = new GraveGainGame();
    });
})();

window.gameDebug = {
    name: 'Grave Gain 2D',
    getScore: function () { return window.GraveGainGame ? window.GraveGainGame.gold : 0; },
    setScore: function (g) {
        if (!window.GraveGainGame) return;
        window.GraveGainGame.gold = Math.max(0, Number(g) || 0);
        if (window.GraveGainGame.player) window.GraveGainGame.player.gold = window.GraveGainGame.gold;
    },
    getHealth: function () { return window.GraveGainGame && window.GraveGainGame.player ? window.GraveGainGame.player.hp : 0; },
    setHealth: function (h) {
        if (!window.GraveGainGame || !window.GraveGainGame.player) return;
        window.GraveGainGame.player.hp = Math.max(0, Math.min(window.GraveGainGame.player.maxHp, Number(h) || 0));
    },
    win: function () { if (window.GraveGainGame) window.GraveGainGame.gameOver(true); },
    lose: function () { if (window.GraveGainGame) window.GraveGainGame.gameOver(false); },
    godMode: false,
    toggleGodMode: function () { this.godMode = !this.godMode; return this.godMode; }
};
