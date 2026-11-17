/* GraveGain2D AAA - 30 announcer.
   2D adaptation: killstreak callouts (DOUBLE KILL … GODLIKE), a combo meter
   that rewards aggression, and a hitmarker X at screen center - gold when a
   kill lands. Combos follow the engine's shared damage events, streaks poll the runKills scoreboard
   truth (covers melee, AoE abilities, and hazard kills alike).
   Exposes AAA.announce(main, sub) for other modules (boss slays). */
(function () {
    'use strict';

    const AAA = window.GraveGainAAA;
    if (!AAA) return;

    const STREAKS = [
        { n: 8, main: 'GODLIKE', sub: 'the dark fears you' },
        { n: 6, main: 'MASSACRE', sub: 'no witnesses' },
        { n: 5, main: 'RAMPAGE', sub: 'unstoppable' },
        { n: 4, main: 'QUAD KILL', sub: 'four fall as one' },
        { n: 3, main: 'TRIPLE KILL', sub: 'hat trick of ruin' },
        { n: 2, main: 'DOUBLE KILL', sub: 'two for one' }
    ];

    const COMBO_WINDOW = 3.0; // seconds between hits to keep the combo alive
    const STREAK_WINDOW = 4.0; // seconds between kills to keep the streak alive

    AAA.ready((game) => {
        const c = AAA.container();
        if (!c) return;

        const announcer = AAA.mk('aaaAnnouncer', 'aaa-announcer', c);
        announcer.innerHTML = '<div class="aaa-announce-main"></div><div class="aaa-announce-sub"></div>';
        const announceMain = announcer.querySelector('.aaa-announce-main');
        const announceSub = announcer.querySelector('.aaa-announce-sub');

        const comboEl = AAA.mk('aaaCombo', 'aaa-combo', c);
        comboEl.innerHTML = '<div class="aaa-combo-n"></div><div class="aaa-combo-bar"><div class="aaa-combo-fill"></div></div>';
        const comboN = comboEl.querySelector('.aaa-combo-n');
        const comboFill = comboEl.querySelector('.aaa-combo-fill');

        const streakScoreEl = AAA.mk('aaaStreakScore', 'aaa-streak-score', c);
        streakScoreEl.textContent = '0 SCORE';

        const marker = AAA.mk('aaaHitmarker', 'aaa-hitmarker', c);
        marker.innerHTML = '<span></span><span></span><span></span><span></span>';

        // Shared callout API for sibling modules (boss kills, mission clears).
        AAA.announce = function (main, sub) {
            announceMain.textContent = main || '';
            announceSub.textContent = sub || '';
            announcer.classList.remove('on');
            void announcer.offsetWidth;
            announcer.classList.add('on');
        };

        function popMarker(kill) {
            marker.classList.remove('on');
            marker.classList.toggle('crit', !!kill);
            void marker.offsetWidth;
            marker.classList.add('on');
        }

        let combo = 0;
        let comboTimer = 0;
        let streak = 0;
        let streakTimer = 0;
        let scoreTimer = 0;
        let lastKills = 0;
        let runArmed = false;

        function resetRun() {
            combo = 0;
            comboTimer = 0;
            streak = 0;
            streakTimer = 0;
            scoreTimer = 0;
            lastKills = game.runKills || 0;
            runArmed = true;
            comboEl.classList.remove('on');
            streakScoreEl.classList.remove('on');
        }

        AAA.on('runStart', resetRun);
        AAA.wrap(game, 'initRun', (orig, ...args) => {
            const out = orig(...args);
            resetRun();
            return out;
        });

        if (game.engine && typeof game.engine.on === 'function') {
            game.engine.on('combat:damage', (event) => {
                if (event && event.attacker === game.engine.getState().player && event.target !== game.engine.getState().player && Number(event.finalDamage) > 0) {
                    popMarker(false);
                }
            });
            game.engine.on('combat:combo', (event) => {
                if (!event) return;
                combo = Math.max(0, Number(event.count) || 0);
                comboTimer = Math.max(0, Number(event.timer) || 0);
                if (combo > AAA.state.maxCombo) AAA.state.maxCombo = combo;
                if (combo >= 3) {
                    const bonus = Math.max(0, Math.round(((Number(event.multiplier) || 1) - 1) * 100));
                    comboN.innerHTML = `${combo} <small>HITS · +${bonus}% DMG</small>`;
                    comboEl.classList.add('on');
                } else {
                    comboEl.classList.remove('on');
                }
                AAA.emit('hit', { combo, multiplier: Number(event.multiplier) || 1, killed: false });
            });
            game.engine.on('combat:streak', (event) => {
                if (!event) return;
                scoreTimer = Math.max(0, Number(event.timer) || 0);
                if (Number(event.count) > 0) {
                    const multiplier = Math.max(1, Number(event.multiplier) || 1);
                    streakScoreEl.textContent = `${Math.max(0, Number(event.totalScore) || 0).toLocaleString()} SCORE · ×${multiplier} STREAK`;
                    streakScoreEl.classList.add('on');
                } else {
                    streakScoreEl.classList.remove('on');
                }
            });
        }

        AAA.onTick((dt, game) => {
            if (!runArmed || !game.player || game.player.isDead) return;

            if (comboTimer > 0) {
                comboTimer -= dt;
                comboFill.style.width = `${Math.max(0, (comboTimer / COMBO_WINDOW) * 100)}%`;
                if (comboTimer <= 0) {
                    combo = 0;
                    comboEl.classList.remove('on');
                }
            }
            if (streakTimer > 0) {
                streakTimer -= dt;
                if (streakTimer <= 0) streak = 0;
            }
            if (scoreTimer > 0) {
                scoreTimer -= dt;
                if (scoreTimer <= 0) streakScoreEl.classList.remove('on');
            }

            // Kills are the scoreboard truth: poll the counter.
            const kills = game.runKills || 0;
            if (kills > lastKills) {
                const gained = kills - lastKills;
                lastKills = kills;
                for (let i = 0; i < gained; i++) {
                    streak = streakTimer > 0 ? streak + 1 : 1;
                    streakTimer = STREAK_WINDOW;
                    AAA.state.streak = streak;
                    popMarker(true);
                    AAA.emit('kill', { streak });
                    const tier = STREAKS.find((s) => streak >= s.n && streak - 1 < s.n) ||
                        (streak > 8 ? STREAKS[0] : null);
                    if (tier && streak === tier.n) {
                        AAA.announce(tier.main, `${tier.sub} · ×${Math.min(5, streak)} SCORE`);
                        AAA.emit('streak', { n: streak, main: tier.main });
                    } else {
                        AAA.emit('streak', { n: streak, main: null });
                    }
                }
            }
        });
    });
})();
