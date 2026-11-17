/* GraveGain3D AAA - 60 tutorial.
   First-run coach marks: a short bottom-center toast chain teaching move,
   look, aim, fire, reload, grenade, weapon swap, and the portal goal. Shows once ever
   (localStorage), fast-forwards to the goal tip on first blood. */
(function () {
    'use strict';

    const AAA = window.GraveGainAAA;
    if (!AAA) return;

    const FLAG = 'GraveGain3D_AAA_Tutorial';

    AAA.ready(() => {
        let seen = false;
        try { seen = localStorage.getItem(FLAG) === 'done'; } catch (_) { seen = true; }
        if (seen) return;

        const touch = document.body.classList.contains('touch-enabled');
        const steps = touch
            ? [
                'Start with the M4, pistol, and shotgun · <b>LEFT STICK</b> moves through the crypt',
                'Hold ↶/↷ to lean · push the stick rim to sprint · hold ⇩ to crouch · tap while sprinting to slide',
                'Drag the <b>RIGHT SIDE</b> to aim · tap ⚔️ to fire or hold for automatic fire · tap AUTO/SEMI in the weapon readout to change M4 fire mode',
                'Hold 🎯 to aim (slower walk); the Wraith sniper zooms in · tap 🥊 to bash · tap 💥 to fire the M4 launcher · ↻ reloads rifle and launcher ammo · tap ⤵ to drop your gun · 💣 loot restores grenades',
                'Bosses and elites drop 🔫 caches · unlock the Wraith sniper, refill ammo, or reclaim dropped guns after stepping away',
                'Tap 🗡️ for a class attack · 🛡️ block · ⚡ ability',
                'Hold 🦘 to glide as Human · tap again midair to double-jump as Dwarf · tap 🧪 to heal · find the ⬇ <b>portal</b> to descend'
            ]
            : [
                '<b>START LOADOUT</b> M4, service pistol, and shotgun · <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> to move',
                '<b>MOUSE</b> to look (right-drag if pointer lock is unavailable) · <b>RIGHT-CLICK</b> to aim (sniper zooms) · <b>Z/X</b> to lean · <b>LEFT-CLICK</b> to fire · <b>T</b> toggles M4 AUTO/SEMI',
                'Aim slows your walk; sprinting lowers the sight · crouch for steadier shots · target health appears below the reticle',
                '<b>1–4 / WHEEL</b> swap weapons · <b>N / MMB</b> bash with your weapon · <b>G</b> grenade · <b>Y</b> M4 underbarrel launcher · <b>R</b> reloads both ammo types · <b>H</b> drop weapon · 💣 find grenade loot',
                '<b>BOSSES / ELITES</b> drop 🔫 caches · unlock the Wraith sniper, refill ammo, or reclaim dropped guns after stepping away',
                '<b>V</b> class attack · <b>SHIFT</b> sprint · tap <b>C</b> to slide · hold <b>C</b> to crouch · <b>B</b> block',
                '<b>F</b> ability · <b>SPACE</b> jump (hold as Human to glide; tap again midair as Dwarf) · <b>Q</b> heal · find the ⬇ <b>portal</b> to descend',
            ];

        const toast = AAA.mk('aaaToast', 'aaa-toast');
        let started = false;
        let done = false;
        let timer = 0;
        let idx = 0;

        function finish() {
            if (done) return;
            done = true;
            clearTimeout(timer);
            toast.classList.remove('on');
            try { localStorage.setItem(FLAG, 'done'); } catch (_) { /* private mode */ }
        }

        function show(i) {
            if (done) return;
            if (i >= steps.length) { finish(); return; }
            idx = i;
            toast.innerHTML = steps[i];
            toast.classList.add('on');
            clearTimeout(timer);
            timer = setTimeout(() => {
                toast.classList.remove('on');
                timer = setTimeout(() => show(i + 1), 350);
            }, 3200);
        }

        AAA.on('runStart', () => {
            if (started || done) return;
            started = true;
            setTimeout(() => show(0), 3200); // let the title card land first
        });

        // First blood means the basics clicked - jump to the goal tip.
        AAA.on('kill', () => {
            if (!started || done || idx >= steps.length - 1) return;
            clearTimeout(timer);
            toast.classList.remove('on');
            timer = setTimeout(() => show(steps.length - 1), 400);
        });

        AAA.on('runEnd', () => { if (!done) finish(); });
    });
})();
