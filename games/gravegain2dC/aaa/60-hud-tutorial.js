/* GraveGain2D AAA - 60 tutorial.
   2D adaptation: first-run coach marks as bottom-center toasts teaching the
   2D control scheme (movement / fire / block / race ability / interact /
   loot + safespace goal). Shows once ever (localStorage),
   fast-forwards to the goal tip on first blood. Dismissable by click. */
(function () {
    'use strict';

    const AAA = window.GraveGainAAA;
    if (!AAA) return;

    const FLAG = 'GraveGain2DC_AAA_Tutorial';

    AAA.ready(() => {
        let seen = false;
        try { seen = localStorage.getItem(FLAG) === 'done'; } catch (_) { seen = true; }
        if (seen) return;

        const touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const steps = touch
            ? [
                'Drag the <b>LEFT STICK</b> to move (one tile per gesture in Turn-Based); tap or drag the right side to aim',
                'Tap ⚔️ attack · 💨 dodge (Realtime / Chrono) · 🛡️ block · ✦ ability · <b>B</b> interact',
                'Grab 🪙 gold & gear · violet seams hide vaults - approach and break the wall · find the <b>safespace terminal</b> to descend'
            ]
            : [
                '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move · <kbd>SHIFT</kbd> sprint (Realtime / Chrono) · <b>LEFT-CLICK</b> fire · arrows dodge (Turn-Based: move)',
                '<b>RIGHT-CLICK</b> block · <kbd>G</kbd> explosive / <kbd>K</kbd> shove (Realtime / Chrono) · <kbd>F</kbd> ability · <kbd>Q</kbd> weapon · <kbd>E</kbd> interact',
                'Loot 🪙 gold · violet seams hide vaults - approach and break the wall with melee or fire · reach the <b>safespace terminal</b> to descend · <kbd>M</kbd> mute audio'
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

        // Click dismisses the current tip and advances.
        toast.addEventListener('click', () => {
            if (done) return;
            clearTimeout(timer);
            toast.classList.remove('on');
            timer = setTimeout(() => show(idx + 1), 250);
        });

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
