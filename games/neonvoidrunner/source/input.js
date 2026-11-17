const keys = {};

document.addEventListener('keydown', (e) => {
    if (e.target && e.target.matches && e.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    if (e.repeat && ['Space', 'KeyP', 'Escape', 'KeyM'].includes(e.code)) return;
    keys[e.code] = true;
    
    if (e.code === 'Space') {
        if (gameState === 'start') startGame();
        else if (gameState === 'gameOver') restartGame();
    }
    
    if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameState === 'playing') pauseGame();
        else if (gameState === 'paused') resumeGame();
    }

    if (e.code === 'KeyM') toggleMute();
    
    // Lane switching with arrow keys
    if (gameState === 'playing') {
        if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && player.x > laneWidth / 2) {
            player.x -= laneWidth;
            playSound(440, 0.05, 'sine', 0.05);
        }
        if ((e.code === 'ArrowRight' || e.code === 'KeyD') && player.x < canvas.width - laneWidth * 1.5) {
            player.x += laneWidth;
            playSound(440, 0.05, 'sine', 0.05);
        }
    }

    if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
});

document.addEventListener('keyup', (e) => keys[e.code] = false);

// Touch controls — tap halves to dodge + swipe for boost/brake (mobile unique)
let touchSX = 0, touchSY = 0;
function moveLane(dir) {
    if (dir < 0) player.x = Math.max(laneWidth / 2 - player.width / 2, player.x - laneWidth);
    else player.x = Math.min(canvas.width - laneWidth / 2 - player.width / 2, player.x + laneWidth);
    playSound(440, 0.05, 'sine', 0.05);
}
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    initAudio();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    touchSX = touch.clientX - rect.left;
    touchSY = touch.clientY - rect.top;

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
    const dx = x - touchSX, dy = y - touchSY;
    // Swipe boss: horizontal = lane dodge, vertical = boost(up)/brake(down)
    if (Math.abs(dx) > 24 || Math.abs(dy) > 24) {
        if (Math.abs(dx) > Math.abs(dy)) {
            moveLane(dx > 0 ? 1 : -1);
        } else if (dy < 0) {
            speed = Math.min(speed + 1.5, 12); // jump/boost half
            playSound(660, 0.1, 'sine', 0.07);
        } else {
            speed = Math.max(speed - 1.5, 2); // slide/brake half
            playSound(330, 0.1, 'sine', 0.07);
        }
        touchSX = x; touchSY = y;
    }
}, { passive: false });
canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (gameState !== 'playing') return;
    // Tap (no swipe): left half = dodge left, right half = dodge right
    const touch = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    if (Math.abs(x - touchSX) < 24 && Math.abs(y - touchSY) < 24) {
        moveLane(x < rect.width / 2 ? -1 : 1);
    }
}, { passive: false });
(function () {
    // On-screen ◀ ▶ dodge buttons for coarse pointers
    const frame = document.querySelector('.TEMPLATE-4weird-game-frame');
    if (!frame || document.querySelector('.neon-runner-btns')) return;
    frame.addEventListener('touchmove', (ev) => { if (gameState === 'playing') ev.preventDefault(); }, { passive: false });
    const wrap = document.createElement('div');
    wrap.className = 'neon-runner-btns';
    const left = document.createElement('button');
    left.textContent = '◀'; left.setAttribute('aria-label', 'Dodge left');
    const right = document.createElement('button');
    right.textContent = '▶'; right.setAttribute('aria-label', 'Dodge right');
    const bind = (btn, dir) => {
        btn.addEventListener('touchstart', (ev) => { ev.preventDefault(); ev.stopPropagation(); initAudio(); if (gameState === 'playing') moveLane(dir); else if (gameState === 'start') startGame(); else restartGame(); }, { passive: false });
        btn.addEventListener('mousedown', (ev) => { ev.stopPropagation(); if (gameState === 'playing') moveLane(dir); });
    };
    bind(left, -1); bind(right, 1);
    wrap.appendChild(left); wrap.appendChild(right);
    frame.appendChild(wrap);
})();

// Mouse controls
canvas.addEventListener('click', (e) => {
    if (gameState === 'playing') {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x < rect.width / 2) {
            player.x = Math.max(laneWidth / 2 - player.width / 2, player.x - laneWidth);
        } else {
            player.x = Math.min(canvas.width - laneWidth * 1.5 - player.width / 2, player.x + laneWidth);
        }
    }
});

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

