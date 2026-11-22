/* GraveGain4D screen flow + HUD wiring (integrator-owned).
 * Menu -> char-select (race/class) -> run (campaign/endless) <-> pause,
 * hub (heal/harvest/exchange/lore), settings, level-up perks, game-over.
 * Every DOM lookup is guarded: the game stays playable if a module or
 * element is absent. No fullscreen/dblclick code (button-only, in index).
 */
(function () {
    'use strict';
    try {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        if (window.GG4D_Flow) return;

        function $(id) { try { return document.getElementById(id); } catch (e) { return null; } }
        function on(el, ev, fn) { try { if (el && el.addEventListener) el.addEventListener(ev, fn); } catch (e) {} }

        var SCREENS = ['mainMenuScreen', 'charSelectScreen', 'hubScreen', 'settingsScreen', 'pauseScreen', 'gameOverScreen', 'levelUpScreen'];
        function show(id) {
            try {
                SCREENS.forEach(function (s) { var el = $(s); if (el) el.classList.add('hidden'); });
                var g = $('gameMain');
                if (id === 'game') { if (g) g.classList.remove('hidden'); return; }
                if (g) g.classList.add('hidden');
                var el = $(id);
                if (el) el.classList.remove('hidden');
            } catch (e) {}
        }

        var state = { race: 'human', cls: 'warrior', mode: 'campaign', mission: 1, started: false };

        function raceList() {
            try {
                var R = window.GG4D_Races;
                if (R && R.RaceData) return Object.keys(R.RaceData).map(function (k) { return Object.assign({ key: k }, R.RaceData[k]); });
            } catch (e) {}
            return [{ key: 'human', name: 'Human', emoji: '👩‍🚀', desc: 'Balanced infiltrator.' }];
        }
        function classList() {
            try {
                var C = window.GG4D_Classes;
                if (C && C.ClassData) return Object.keys(C.ClassData).map(function (k) { return Object.assign({ key: k }, C.ClassData[k]); });
            } catch (e) {}
            return [{ key: 'warrior', title: 'Warrior', weaponName: 'Moonsteel Long-Putter', desc: 'Master of swordplay.' }];
        }

        function openCampaign(missionId) {
            state.mode = 'campaign';
            if (window.GG4D_Campaign && window.GG4D_Campaign.get(missionId)) {
                state.mission = Number(missionId);
            }
            buildCharSelect();
            show('charSelectScreen');
        }

        function buildMissionPicker() {
            var picker = $('campaignMissionPicker');
            var select = $('campaignMissionSelect');
            var campaign = window.GG4D_Campaign;
            if (!picker || !select) return;
            picker.hidden = state.mode !== 'campaign' || !campaign;
            if (picker.hidden) return;

            select.textContent = '';
            campaign.all().forEach(function (mission) {
                var option = document.createElement('option');
                option.value = mission.id;
                option.textContent = mission.id + '. ' + mission.title;
                select.appendChild(option);
            });
            select.value = state.mission;
            select.onchange = function () { state.mission = Number(select.value); };
        }

        function buildCharSelect() {
            buildMissionPicker();
            try {
                var rg = $('raceGrid');
                if (rg && !rg.children.length) {
                    raceList().forEach(function (r) {
                        var b = document.createElement('button');
                        b.type = 'button'; b.className = 'char-card'; b.textContent = (r.emoji || '') + ' ' + (r.name || r.key);
                        b.title = r.desc || '';
                        if (r.desc) { var desc = document.createElement('small'); desc.textContent = r.desc; b.appendChild(desc); }
                        if (r.perk4d) { var perk = document.createElement('small'); perk.textContent = r.perk4d.name + ': ' + r.perk4d.desc; b.appendChild(perk); }
                        b.setAttribute('data-race', r.key); b.setAttribute('aria-pressed', String(r.key === state.race));
                        if (r.key === state.race) b.classList.add('selected');
                        on(b, 'click', function () {
                            state.race = r.key;
                            try { rg.querySelectorAll('.char-card').forEach(function (x) { x.classList.remove('selected'); }); } catch (e) {}
                            b.classList.add('selected');
                            try { rg.querySelectorAll('.char-card').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); } catch (e) {}
                        });
                        rg.appendChild(b);
                    });
                }
                var cg = $('classGrid');
                if (cg && !cg.children.length) {
                    classList().forEach(function (c) {
                        var b = document.createElement('button');
                        b.type = 'button'; b.className = 'char-card'; b.textContent = (c.title || c.key) + ' — ' + (c.weaponName || '');
                        b.title = c.desc || '';
                        if (c.desc) { var detail = document.createElement('small'); detail.textContent = c.desc; b.appendChild(detail); }
                        b.setAttribute('data-class', c.key);
                        if (c.key === state.cls) b.classList.add('selected');
                        b.setAttribute('aria-pressed', String(c.key === state.cls));
                        on(b, 'click', function () {
                            state.cls = c.key;
                            try { cg.querySelectorAll('.char-card').forEach(function (x) { x.classList.remove('selected'); }); } catch (e) {}
                            b.classList.add('selected');
                            try { cg.querySelectorAll('.char-card').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); } catch (e) {}
                        });
                        cg.appendChild(b);
                    });
                }
            } catch (e) {}
        }

        function startRun() {
            try {
                gigglesOffers = 0;
                state.started = true;
                show('game');
                var M = window.GG4D_Main;
                if (M && M.boot) {
                    try {
                        var game = M.boot({ race: state.race, cls: state.cls, mode: state.mode, mission: state.mission });
                        if (game) game.gigglesHelpUses = 3;
                        if (game && window.GigglesHelpDraft) window.GigglesHelpDraft.present('gravegain4dA', game, null, true);
                    } catch (e) {}
                }
                var C = window.GG4D_Campaign;
                if (state.mode === 'campaign' && C) {
                    try {
                        var cur = C.get(state.mission);
                        if (cur && window.GG4D_Contract) window.GG4D_Contract.setMission(cur.title, cur.objectives);
                    } catch (e) {}
                }
                try {
                    if (window.GG4D_ModeUI) { window.GG4D_ModeUI.mount(document.body); }
                    if (window.GG4D_Contract) window.GG4D_Contract.mount();
                    if (window.GG4D_Radar) window.GG4D_Radar.mount();
                    if (window.GG4D_Stone) window.GG4D_Stone.mount();
                } catch (e) {}
            } catch (e) {}
        }

        var gigglesOffers = 0;
        function openGigglesCase() {
            try {
                var g = window.GG4D_Game;
                if (!g || !state.started || !window.GigglesHelpDraft) return;
                if (!Number.isFinite(g.gigglesHelpUses)) g.gigglesHelpUses = 3;
                if (g.gigglesHelpUses <= 0) return;
                window.GigglesHelpDraft.present('gravegain4dA', g);
            } catch (e) {}
        }

        function returnToHub() {
            try {
                var H = window.GG4D_Hub;
                if (H && H.returnToStarship) { try { H.returnToStarship(); } catch (e) {} }
                show('hubScreen');
                try { if (H && H.render) H.render(); } catch (e) {}
            } catch (e) {}
        }

        function buildLoreList() {
            try {
                var list = $('loreList');
                if (!list || list.children.length) return;
                var db = (window.GraveGainLore && window.GraveGainLore.database) || window.LoreDatabase || {};
                Object.keys(db).slice(0, 60).forEach(function (k) {
                    var e = db[k] || {};
                    var b = document.createElement('button');
                    b.type = 'button'; b.className = 'btn-game'; b.textContent = e.title || k;
                    b.setAttribute('data-lore', k);
                    on(b, 'click', function () { openLore(k); });
                    list.appendChild(b);
                });
            } catch (e) {}
        }
        function openLore(k) {
            try {
                var db = (window.GraveGainLore && window.GraveGainLore.database) || window.LoreDatabase || {};
                var e = db[k]; if (!e) return;
                var t = $('loreTitle'); if (t) t.textContent = e.title || k;
                var c = $('loreCategory'); if (c) c.textContent = e.category || '';
                var b = $('loreContent'); if (b) b.textContent = e.content || '';
                try { listSpeakText = (e.title || '') + '. ' + (e.content || ''); } catch (x) {}
            } catch (e) {}
        }
        var listSpeakText = '';
        function speakLore() {
            try {
                if (!('speechSynthesis' in window)) return;
                window.speechSynthesis.cancel();
                if (!listSpeakText) return;
                var u = new SpeechSynthesisUtterance(listSpeakText.slice(0, 600));
                u.rate = 1.0;
                window.speechSynthesis.speak(u);
            } catch (e) {}
        }

        function tick() {
            try {
                var g = window.GG4D_Game || {};
                var sim = g.state || {};
                var ball = g.putt && g.putt.ball || {};
                var p = g.player || {
                    hp: sim.hp, maxHp: sim.maxHp, gold: sim.gold,
                    uusd: sim.uusd, sand: sim.chronoSand, maxSand: sim.maxChronoSand,
                    w: ball.w !== undefined ? ball.w : sim.w,
                    brane: sim.brane, dead: sim.hp <= 0
                };
                function set(id, v) { try { var el = $(id); if (el) el.textContent = v; } catch (e) {} }
                function bar(id, frac) { try { var el = $(id); if (el) el.style.width = Math.max(0, Math.min(100, frac * 100)) + '%'; } catch (e) {} }
                if (p.maxHp) { bar('hudHpBar', p.hp / p.maxHp); set('hudHpText', Math.ceil(p.hp) + '/' + p.maxHp); }
                if (p.maxSand !== undefined) { bar('hudSandBar', (p.sand || 0) / (p.maxSand || 100)); set('hudSandText', Math.floor(p.sand || 0) + '/' + (p.maxSand || 100)); }
                if (p.gold !== undefined) set('hudGoldText', String(Math.floor(p.gold)));
                if (p.uusd !== undefined) set('hudUusdText', String(Math.floor(p.uusd)));
                if (p.w !== undefined) set('hudRiftText', 'W' + (p.w >= 0 ? '+' : '') + Math.round(p.w));
                if (p.brane) set('hudBraneText', p.brane);
                try { if (window.GG4D_Radar) window.GG4D_Radar.update({ player: p, enemies: g.enemies || [], portals: g.portals || [], cup: g.cup || null }); } catch (e) {}
                try { if (window.GG4D_Stone) window.GG4D_Stone.update(0.5); } catch (e) {}
                if (state.started && gigglesOffers < 1 && p.maxHp && p.hp / p.maxHp <= 0.5 && !document.getElementById('gigglesHelpDraft')) {
                    gigglesOffers += 1;
                    openGigglesCase();
                } else if (state.started && gigglesOffers < 1 && p.maxSand > 0 && p.sand / p.maxSand <= 0.15 && !document.getElementById('gigglesHelpDraft')) {
                    gigglesOffers += 1;
                    openGigglesCase();
                }
                if (p.dead) {
                    var t = $('gameOverTitle'); if (t) t.textContent = 'RUN COMPLETED';
                    show('gameOverScreen');
                }
            } catch (e) {}
        }

        function wire() {
            buildCharSelect();
            buildLoreList();
            on($('btnStoryMode'), 'click', function () { openCampaign(); });
            on($('btnPlay'), 'click', function () { state.mode = 'endless'; buildCharSelect(); show('charSelectScreen'); });
            on($('btnEnterHub'), 'click', function () { returnToHub(); });
            on($('btnOpenSettings'), 'click', function () { show('settingsScreen'); });
            on($('btnCharSelectBack'), 'click', function () { show('mainMenuScreen'); });
            on($('btnCharSelectStart'), 'click', function () { startRun(); });
            on($('btnPause'), 'click', function () { var g = window.GG4D_Game; if (g) g.pause(); show('pauseScreen'); });
            on($('btnGigglesHelp'), 'click', openGigglesCase);
            document.addEventListener('keydown', function (e) { if (e.key === 'g' || e.key === 'G') openGigglesCase(); });
            var ggCase = document.createElement('button'); ggCase.type = 'button'; ggCase.textContent = '▰ GG · HELP'; ggCase.style.cssText = 'position:fixed;right:12px;top:12px;z-index:9000;padding:8px 12px;border:2px solid #cba55c;border-radius:9px;background:#241d14;color:#f3d487;font-weight:bold;cursor:pointer'; ggCase.addEventListener('click', openGigglesCase); document.body.appendChild(ggCase);
            on($('btnResume'), 'click', function () { var g = window.GG4D_Game; if (g) g.resume(); show('game'); });
            on($('btnAbandon'), 'click', function () { state.started = false; var g = window.GG4D_Game; if (g) g.stop(); show('mainMenuScreen'); });
            on($('btnReturnToHub'), 'click', function () { returnToHub(); });
            on($('btnLeaveHub'), 'click', function () { show(state.started ? 'game' : 'mainMenuScreen'); });
            on($('btnSaveSettings'), 'click', function () { show(state.started ? 'game' : 'mainMenuScreen'); });
            on($('btnGoToMenu'), 'click', function () { state.started = false; var g = window.GG4D_Game; if (g) g.stop(); show('mainMenuScreen'); });
            on($('btnSpeakLore'), 'click', function () { speakLore(); });
            on($('btnBuyUusd'), 'click', function () { try { var H = window.GG4D_Hub; if (H && H.bankGoldToUusd) H.bankGoldToUusd(); } catch (e) {} });
            on($('btnBuyGold'), 'click', function () { try { var H = window.GG4D_Hub; if (H && H.bankUusdToGold) H.bankUusdToGold(); else if (H && H.bankKillCreditsToUusd) H.bankKillCreditsToUusd(); } catch (e) {} });
            on($('btnUpgradeQuarters'), 'click', function () { try { var H = window.GG4D_Hub; if (H && H.upgradeQuarters) H.upgradeQuarters(); } catch (e) {} });
            try { setInterval(tick, 500); } catch (e) {}
        }

        if (document.readyState === 'loading') {
            try { document.addEventListener('DOMContentLoaded', wire); } catch (e) {}
        } else { wire(); }

        window.GG4D_Flow = { show: show, openCampaign: openCampaign, state: state, startRun: startRun, returnToHub: returnToHub, openLore: openLore, speakLore: speakLore };
    } catch (e) {}
})();
