document.addEventListener('keydown', (e) => {
    if (e.target && e.target.matches && e.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    if (e.repeat && ['Space', 'KeyP', 'Escape', 'KeyM'].includes(e.code)) return;
    if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'start') startGame();
        else if (gameState === 'gameOver') restartGame();
        return;
    }
    
    if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameState === 'playing') pauseGame();
        else if (gameState === 'paused') resumeGame();
        return;
    }

    if (e.code === 'KeyM') { toggleMute(); return; }
    
    if (gameState !== 'playing') return;
    
    // Direction control
    switch(e.code) {
        case 'ArrowUp':
        case 'KeyW':
            requestSnakeTurn(0, -1);
            break;
        case 'ArrowDown':
        case 'KeyS':
            requestSnakeTurn(0, 1);
            break;
        case 'ArrowLeft':
        case 'KeyA':
            requestSnakeTurn(-1, 0);
            break;
        case 'ArrowRight':
        case 'KeyD':
            requestSnakeTurn(1, 0);
            break;
    }
    
    e.preventDefault();
});

// Touch controls — swipe steer (mobile unique)
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    initAudio();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    touchStartX = touch.clientX - rect.left;
    touchStartY = touch.clientY - rect.top;

    if (gameState === 'start') startGame();
    else if (gameState === 'gameOver') restartGame();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (gameState !== 'playing') return;

    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const dx = x - touchStartX;
    const dy = y - touchStartY;

    // Lower threshold (~24 CSS px) for responsive swipe steering
    if (Math.abs(dx) > 24 || Math.abs(dy) > 24) {
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal
            requestSnakeTurn(dx > 0 ? 1 : -1, 0);
        } else {
            // Vertical
            requestSnakeTurn(0, dy > 0 ? 1 : -1);
        }
        touchStartX = x;
        touchStartY = y;
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => { e.preventDefault(); }, { passive: false });
// Prevent pull-to-refresh / scroll chaining on the frame for touch play
(function () {
    const frame = document.querySelector('.TEMPLATE-4weird-game-frame');
    if (frame) frame.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
})();

// Template UI bindings
document.getElementById('TEMPLATE-4weird-start-btn').addEventListener('click', startGame);
document.getElementById('TEMPLATE-4weird-resume-btn').addEventListener('click', resumeGame);
document.getElementById('TEMPLATE-4weird-restart-btn').addEventListener('click', restartGame);
document.getElementById('TEMPLATE-4weird-play-again-btn').addEventListener('click', restartGame);

// Fullscreen (frame button; ⛶ overlay + F/dblclick added below)
document.getElementById('TEMPLATE-4weird-fullscreen-btn').addEventListener('click', () => {
    const frame = document.querySelector('.TEMPLATE-4weird-game-frame');
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (frame.requestFullscreen) frame.requestFullscreen().catch(() => {});
        else if (frame.webkitRequestFullscreen) frame.webkitRequestFullscreen();
    } else if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    }
});

