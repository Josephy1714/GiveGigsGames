(function () {
    const fullscreen = document.getElementById('friendslop-4weird-fullscreen-btn');
    if (fullscreen) Object.assign(fullscreen.style, { top: 'auto', bottom: '10px', left: '10px', right: 'auto' });
    window.addEventListener('load', () => {
        const frame = canvas.parentElement;
        const pause = document.createElement('button');
        pause.type = 'button';
        pause.textContent = 'Ⅱ Pause';
        pause.setAttribute('aria-label', 'Pause FriendSlop');
        Object.assign(pause.style, { position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: '12', padding: '6px 10px', minHeight: '34px', border: '1px solid #64748b', borderRadius: '8px', color: '#fff', background: '#101827e8', font: '600 12px system-ui' });
        pause.addEventListener('click', () => { if (game?.state === GAME_STATE.PLAYING) game.togglePause(); });
        pause.addEventListener('keydown', event => event.stopPropagation());
        function sync() { pause.style.display = game?.state === GAME_STATE.PLAYING ? 'block' : 'none'; }
        const observer = new MutationObserver(sync);
        for (const suffix of ['start-screen', 'pause-screen', 'game-over-screen']) {
            observer.observe(document.getElementById('friendslop-4weird-' + suffix), { attributes: true, attributeFilter: ['class'] });
        }
        frame.appendChild(pause);
        sync();
    });
})();
