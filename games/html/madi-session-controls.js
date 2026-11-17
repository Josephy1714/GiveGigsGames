// A visible pause action and a short control reminder make every MADI run
// usable without memorizing the launch screen or reaching for a keyboard.
(function installMadiSessionControls() {
    if (typeof gameActive === 'undefined' || !pauseScreen || !renderer) return;
    const instructions = {
        'temple-of-lost-revenue': 'Move: WASD / arrows or direction buttons. Collect all five gold leads. Map: cyan = you; gold = remaining leads.',
        'the-ai-expedition': 'Click or tap each blue outer node to connect it to the center. Connect all four to synchronize the network.',
        'the-cave-of-bottlenecks': 'Hold A / D, arrows, or the direction buttons to aim. Keep the beam on a red target until it clears.',
        'the-lost-city-of-customers': 'Click or tap terrain to scan. A nearby scan reveals gold targets; scan directly beneath one to capture it.',
        'the-pipeline-mountain': 'Hold A / D, arrows, or direction buttons to steer. Jumps happen automatically when you land on a platform.',
        'the-revenue-dragon': 'A / D or arrows move. Hold Space or the fire button to shoot. Dodge fireballs and drain the dragon’s health.',
        'the-revenue-jungle': 'Space, Up, or a tap on the arena leaps over obstacles. Time each jump as the obstacle approaches.',
        'the-speed-portal': 'A / D, arrows, or direction buttons rotate around the tunnel. Avoid obstacles and collect speed rings.',
        'treasure-hunters': 'Space or a click/tap on the arena extends the claw. Time the swing to retrieve valuable items.'
    };
    const title = window.gameState && window.gameState.title;
    const reminder = document.createElement('p');
    reminder.textContent = instructions[title] || 'Resume your run or restart for a fresh attempt.';
    Object.assign(reminder.style, {
        font: '13px/1.45 system-ui', color: '#cbd5e1', maxWidth: '360px',
        padding: '0 12px', margin: '12px auto 0', textAlign: 'center'
    });
    pauseScreen.appendChild(reminder);

    const pause = document.createElement('button');
    pause.type = 'button';
    pause.textContent = 'Ⅱ Pause';
    pause.setAttribute('aria-label', 'Pause game and review controls');
    Object.assign(pause.style, {
        position: 'absolute', right: '12px', bottom: '12px', zIndex: '20',
        minHeight: '40px', padding: '7px 12px', border: '1px solid #64748b',
        borderRadius: '8px', color: '#f8fafc', background: '#0f172ae8',
        font: '600 13px system-ui', cursor: 'pointer'
    });
    pause.addEventListener('keydown', event => event.stopPropagation());
    pause.addEventListener('click', event => {
        event.stopPropagation();
        if (!gameActive) return;
        pauseGame();
        resumeBtn.focus({ preventScroll: true });
    });
    function refresh() { pause.hidden = !gameActive; pause.style.display = gameActive ? 'block' : 'none'; }
    const observer = new MutationObserver(refresh);
    for (const screen of [startScreen, pauseScreen, gameOverScreen]) {
        observer.observe(screen, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
    }
    refresh();
    renderer.domElement.parentElement.appendChild(pause);
})();
