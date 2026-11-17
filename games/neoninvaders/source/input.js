const keys = {};
let canShoot = true;

// Input handlers
document.addEventListener('keydown', (e) => {
    if (e.target && e.target.matches && e.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    if (e.repeat && ['Space', 'KeyP', 'Escape', 'KeyM'].includes(e.code)) return;
    keys[e.code] = true;
    
    // Start game with space on start screen
    if (e.code === 'Space' && gameState === 'start') {
        startGame();
    }
    
    // Pause toggle
    if ((e.code === 'KeyP' || e.code === 'Escape') && gameState === 'playing') {
        pauseGame();
    } else if ((e.code === 'KeyP' || e.code === 'Escape') && gameState === 'paused') {
        resumeGame();
    }

    if (e.code === 'KeyM') toggleMute();
    
    // Restart on game over
    if (e.code === 'Space' && gameState === 'gameOver') {
        restartGame();
    }

    if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Template UI button bindings
document.getElementById('TEMPLATE-4weird-start-btn').addEventListener('click', startGame);
document.getElementById('TEMPLATE-4weird-resume-btn').addEventListener('click', resumeGame);
document.getElementById('TEMPLATE-4weird-restart-btn').addEventListener('click', restartGame);
document.getElementById('TEMPLATE-4weird-play-again-btn').addEventListener('click', restartGame);

