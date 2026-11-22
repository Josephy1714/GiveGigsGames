(function () {
    'use strict';

    const SUBCLASSES = {
        human: { warrior: 'Soldier', tank: 'Warden', support: 'Medic', mage: 'Engineer' },
        elf:   { warrior: 'Assassin', tank: 'Guardian', support: 'Druid', mage: 'Witch' },
        dwarf: { warrior: 'Slayer', tank: 'Paladin', support: 'Brewer', mage: 'Tinkerer' },
        orc:   { warrior: 'Berserker', tank: 'Brute', support: 'Shaman', mage: 'Warlock' }
    };

    const RACE_LIGHT_COLORS = {
        human: 0xe2e8f0,
        elf:   0x4ade80,
        dwarf: 0xfbbf24,
        orc:   0xf97316
    };

    const SUPPLY_ITEMS = [
        { id: 'frag',      name: 'Frag Grenade',    cost: 20, desc: 'AoE blast + stagger' },
        { id: 'flash',     name: 'FlashBang',       cost: 10, desc: 'Stuns nearby foes 4s' },
        { id: 'prism',     name: 'Prism Grenade',   cost: 30, desc: 'Confuses enemies 6s' },
        { id: 'bandages',  name: 'Bandages',        cost: 10, desc: '+50 Temp HP' },
        { id: 'adrenaline',name: 'Adrenaline Shot', cost: 50, desc: '+50% Dmg & +35% Spd 15s' },
        { id: 'drones',    name: 'Mini-Drone Swarm',cost: 10, desc: '3 homing blasts' },
        { id: 'shield',    name: 'Shield Bubble',   cost: 35, desc: '+60 Shield' }
    ];

    function loadProg() {
        try {
            const raw = localStorage.getItem('gg3da_devdoc_prog');
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        return {
            playerLevel: 1, playerXp: 0,
            raceLevels: { human: 1, elf: 1, dwarf: 1, orc: 1 },
            classLevels: { warrior: 1, tank: 1, support: 1, mage: 1 },
            screenFx: true
        };
    }

    const DevDocMechanics = {
        elapsedSeconds: 0,
        killCredits: 25,
        lightOn: false,
        raceLight: null,
        hudEl: null,
        fxEl: null,
        buyModalEl: null,
        buyOpen: false,
        rainbowHue: 0,
        prog: loadProg(),

        saveProg() {
            try { localStorage.setItem('gg3da_devdoc_prog', JSON.stringify(this.prog)); } catch (_) {}
        },

        getSubclassTitle(race, classType) {
            const r = (SUBCLASSES[race] || SUBCLASSES.human);
            return r[classType] || 'Adventurer';
        },

        getDamageMult(classType) {
            const lvl = (this.prog.classLevels && this.prog.classLevels[classType]) || 1;
            return 1.0 + Math.min(68, lvl - 1) * 0.0147; // up to 2.0x at Class Lv 69
        },

        getHpMult(race) {
            const lvl = (this.prog.raceLevels && this.prog.raceLevels[race]) || 1;
            return 1.0 + Math.min(419, lvl - 1) * 0.00238; // up to 2.0x at Race Lv 420
        },

        init(camera) {
            this.elapsedSeconds = 0;
            this.ensureHud();
            this.ensureFxOverlay();

            if (camera && !this.raceLight) {
                const light = new THREE.PointLight(0xe2e8f0, 0, 260, 1.4);
                light.position.set(0, 0, 0);
                camera.add(light);
                this.raceLight = light;
            }

            if (!this._boundKeys) {
                this._boundKeys = true;
                window.addEventListener('keydown', (e) => {
                    const game = window.GraveGainGame;
                    if (e.code === 'KeyC') this.toggleRaceLight(game);
                    else if (e.code === 'KeyQ') this.tagNearestEnemy(game);
                    else if (e.code === 'KeyE' && (!game || !game.weaponLoot || !game.weaponLoot.nearbyDrop)) {
                        this.toggleBuyMenu();
                    }
                });
            }
            this.renderHud(window.GraveGainGame);
        },

        ensureHud() {
            if (this.hudEl) return;
            const el = document.createElement('div');
            el.id = 'gg-devdoc-hud';
            el.style.cssText = [
                'position:fixed', 'right:16px', 'top:88px', 'background:rgba(14,12,18,0.88)',
                'border:1px solid #4a3f31', 'padding:7px 11px', 'font-family:Georgia,serif',
                'font-size:11px', 'color:#e5dfd3', 'z-index:15', 'min-width:190px',
                'box-shadow:0 4px 14px rgba(0,0,0,0.65)'
            ].join(';');
            document.body.appendChild(el);
            this.hudEl = el;
        },

        ensureFxOverlay() {
            if (this.fxEl) return;
            const fx = document.createElement('div');
            fx.id = 'gg-screen-fx';
            fx.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:12;transition:box-shadow 0.25s,backdrop-filter 0.25s;';
            document.body.appendChild(fx);
            this.fxEl = fx;
        },

        toggleRaceLight(game) {
            this.lightOn = !this.lightOn;
            if (this.raceLight) {
                const race = game && game.player ? game.player.race : 'human';
                this.raceLight.color.setHex(RACE_LIGHT_COLORS[race] || 0xe2e8f0);
                this.raceLight.intensity = this.lightOn ? 1.9 : 0;
            }
            this.renderHud(game);
        },

        tagNearestEnemy(game) {
            if (!game || !game.player || !game.enemies || !game.enemies.length) return;
            let best = null;
            let bestD = 380;
            for (const e of game.enemies) {
                if (!e || e.hp <= 0) continue;
                const d = Math.hypot(e.x - game.player.x, e.y - game.player.y);
                const weight = (e.isBoss || e.elite) ? d * 0.6 : d;
                if (weight < bestD) { bestD = weight; best = e; }
            }
            if (best) {
                best.tagged = true;
                game.audio?.playSfx('pickup', 1.3);
                game.combatText?.spawnText(best.x, 30, best.y, '🎯 TAGGED (+15% DMG)', 'crit');
            }
        },

        toggleBuyMenu(force) {
            this.buyOpen = typeof force === 'boolean' ? force : !this.buyOpen;
            if (!this.buyModalEl) {
                const m = document.createElement('div');
                m.id = 'gg-buy-modal';
                m.style.cssText = 'position:fixed;inset:0;z-index:210;background:rgba(6,5,10,0.78);display:none;align-items:center;justify-content:center;';
                m.addEventListener('click', (e) => { if (e.target === m) this.toggleBuyMenu(false); });
                document.body.appendChild(m);
                this.buyModalEl = m;
            }
            if (!this.buyOpen) {
                this.buyModalEl.style.display = 'none';
                return;
            }
            this.buyModalEl.style.display = 'flex';
            const rows = SUPPLY_ITEMS.map(it => `
                <button type="button" data-buy="${it.id}" style="display:flex;justify-content:space-between;align-items:center;width:100%;padding:7px 10px;background:#1a1622;border:1px solid #4a3f31;color:#e5dfd3;cursor:pointer;font-family:Georgia,serif;font-size:12px;">
                    <span><b>${it.name}</b> <small style="color:#a89882;">— ${it.desc}</small></span>
                    <span style="color:#38bdf8;font-weight:bold;">${it.cost} KC</span>
                </button>
            `).join('');
            this.buyModalEl.innerHTML = `
                <div style="width:min(420px,92vw);background:#100d16;border:1px solid #a67c37;padding:16px;color:#e5dfd3;font-family:Georgia,serif;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
                        <b style="color:#fbbf24;">💳 SUPPLY TELEPORT (${this.killCredits} KC)</b>
                        <button type="button" id="gg-buy-close" style="background:none;border:1px solid #4a3f31;color:#e5dfd3;padding:2px 8px;cursor:pointer;">✕</button>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:6px;">${rows}</div>
                </div>
            `;
            this.buyModalEl.querySelector('#gg-buy-close').onclick = () => this.toggleBuyMenu(false);
            this.buyModalEl.querySelectorAll('[data-buy]').forEach(btn => {
                btn.onclick = () => this.buyItem(btn.dataset.buy);
            });
        },

        buyItem(id) {
            const game = window.GraveGainGame;
            const item = SUPPLY_ITEMS.find(x => x.id === id);
            if (!item || !game || !game.player) return;
            if (this.killCredits < item.cost) {
                game.combatText?.spawnText(game.player.x, 24, game.player.y, 'NOT ENOUGH KC', 'damage');
                return;
            }
            this.killCredits -= item.cost;
            const p = game.player;
            if (id === 'frag') {
                game.dealAoEDamage(p.x, p.y, 180, 65, 'fire');
                game.enemies.forEach(e => { if (Math.hypot(e.x - p.x, e.y - p.y) < 180) e.applyStatus?.('staggered', 1.5); });
            } else if (id === 'flash') {
                game.enemies.forEach(e => { if (Math.hypot(e.x - p.x, e.y - p.y) < 200) e.applyStatus?.('stunned', 4.0); });
            } else if (id === 'prism') {
                game.enemies.forEach(e => { if (Math.hypot(e.x - p.x, e.y - p.y) < 200) e.applyStatus?.('confused', 6.0); });
            } else if (id === 'bandages') {
                p.addTempHp?.(50);
            } else if (id === 'adrenaline') {
                p.adrenalineTimer = 15;
            } else if (id === 'drones') {
                game.enemies.slice(0, 3).forEach(e => { e.hp -= 45; game.vfx?.spawnSparks(e.x, e.y, 0x38bdf8, 15); });
            } else if (id === 'shield') {
                p.shieldBubble = (p.shieldBubble || 0) + 60;
            }
            game.audio?.playSfx('spell', 1.2);
            game.combatText?.spawnText(p.x, 26, p.y, `TELEPORTED: ${item.name}`, 'heal');
            this.toggleBuyMenu(false);
            this.renderHud(game);
        },

        onEnemyKilled(enemy, game) {
            const mult = this.prog.screenFx ? 1.0 : 0.9; // Accessibility -10% XP when Screen FX off
            const isElite = enemy && (enemy.elite || enemy.isBoss);
            this.killCredits += isElite ? 10 : 1;

            this.prog.playerXp += Math.round((isElite ? 25 : 6) * mult);
            if (this.prog.playerXp >= this.prog.playerLevel * 40) {
                this.prog.playerXp = 0;
                this.prog.playerLevel++;
            }
            if (game && game.player) {
                const r = game.player.race;
                const c = game.player.classType;
                if (this.prog.raceLevels[r] && Math.random() < 0.25) this.prog.raceLevels[r]++;
                if (this.prog.classLevels[c] && Math.random() < 0.20) this.prog.classLevels[c]++;
            }
            this.saveProg();
            this.renderHud(game);
        },

        getDifficultyScale() {
            const mins = this.elapsedSeconds / 60;
            return 1.0 + Math.min(1.0, mins / 20);
        },

        applyRainbowSafeSpace(portal, dt) {
            if (!portal || !portal.material || !portal.material.color) return;
            this.rainbowHue = (this.rainbowHue + dt * 0.35) % 1.0;
            portal.material.color.setHSL(this.rainbowHue, 0.85, 0.6);
        },

        update(dt, game) {
            this.elapsedSeconds += dt;
            if (game && game.inventory && typeof game.inventory.updateDigestion === 'function') {
                game.inventory.updateDigestion(dt, game.player);
            }
            this.updateScreenFx(game);
            if (Math.floor(this.elapsedSeconds) !== Math.floor(this.elapsedSeconds - dt)) {
                this.renderHud(game);
            }
        },

        updateScreenFx(game) {
            if (!this.fxEl) return;
            if (!this.prog.screenFx || !game || !game.player) {
                this.fxEl.style.boxShadow = 'none';
                this.fxEl.style.backdropFilter = 'none';
                return;
            }
            const p = game.player;
            if (p.wounded) {
                this.fxEl.style.boxShadow = 'inset 0 0 90px rgba(185, 28, 28, 0.65)';
            } else if (p.rage > 50 || p.rageActiveTimer > 0) {
                this.fxEl.style.boxShadow = 'inset 0 0 70px rgba(239, 68, 68, 0.45)';
            } else {
                this.fxEl.style.boxShadow = 'none';
            }
            this.fxEl.style.backdropFilter = p.adrenalineTimer > 0 ? 'contrast(1.18) saturate(1.2)' : 'none';
        },

        renderHud(game) {
            if (!this.hudEl) return;
            const p = game && game.player;
            const mins = Math.floor(this.elapsedSeconds / 60);
            const secs = Math.floor(this.elapsedSeconds % 60).toString().padStart(2, '0');
            const scale = this.getDifficultyScale().toFixed(2);
            const sub = p ? `${p.race.toUpperCase()} ${this.getSubclassTitle(p.race, p.classType).toUpperCase()}` : 'MOONROCK';
            const temp = p ? Math.round(p.tempHp || 0) : 0;
            const shd = p ? Math.round(p.shieldBubble || 0) : 0;
            const wnd = p && p.wounded ? '<span style="color:#ef4444;font-weight:bold;"> [WOUNDED]</span>' : '';

            this.hudEl.innerHTML = `
                <div style="color:#fbbf24;font-weight:bold;margin-bottom:2px;">${sub}${wnd}</div>
                <div>⏱️ ${mins}:${secs} <span style="color:#f59e0b;">(${scale}x)</span> · Lv.${this.prog.playerLevel}</div>
                <div>🛡️ Shd: <b>${shd}</b> · 💚 Temp: <b>${temp}</b></div>
                <div>💳 KillCredits: <b style="color:#38bdf8;">${this.killCredits}</b></div>
                <div style="display:flex;gap:4px;margin-top:4px;font-size:10px;">
                    <button id="gg-btn-supply" style="flex:1;background:#1e293b;color:#38bdf8;border:1px solid #475569;padding:2px;cursor:pointer;">[E] Supply</button>
                    <button id="gg-btn-fx" style="flex:1;background:#1e293b;color:#e2e8f0;border:1px solid #475569;padding:2px;cursor:pointer;">FX: ${this.prog.screenFx ? 'ON' : 'OFF'}</button>
                </div>
                <div style="font-size:9px;color:#a89882;margin-top:2px;">[C] Light: ${this.lightOn ? 'ON' : 'OFF'} · [Q] Tag</div>
            `;
            const supBtn = document.getElementById('gg-btn-supply');
            if (supBtn) supBtn.onclick = () => this.toggleBuyMenu();
            const fxBtn = document.getElementById('gg-btn-fx');
            if (fxBtn) fxBtn.onclick = () => {
                this.prog.screenFx = !this.prog.screenFx;
                this.saveProg();
                this.renderHud(game);
            };
        }
    };

    window.DevDocMechanics = DevDocMechanics;
})();
