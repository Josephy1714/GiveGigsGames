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
    
    // Lane switching
    if (gameState === 'playing') {
        if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && player.lane > 0) {
            player.lane--;
            player.targetX = laneWidth * player.lane + laneWidth / 2 - player.width / 2;
            playSound(440, 0.05, 'sine', 0.05);
        }
        if ((e.code === 'ArrowRight' || e.code === 'KeyD') && player.lane < laneCount - 1) {
            player.lane++;
            player.targetX = laneWidth * player.lane + laneWidth / 2 - player.width / 2;
            playSound(440, 0.05, 'sine', 0.05);
        }
        if (e.code === 'ArrowUp' || e.code === 'KeyW') {
            speed = Math.min(speed + 0.5, 8);
        }
        if (e.code === 'ArrowDown' || e.code === 'KeyS') {
            speed = Math.max(speed - 0.5, 2);
        }
    }

    if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
});

document.addEventListener('keyup', (e) => keys[e.code] = false);

// Touch controls — tilt-or-touch steering + gas buttons (mobile unique)
let raceTouchSX = 0;
let steeringTouch = null, steeringDragged = false;
let tiltEnabled = false;
let gasHeld = false, brakeHeld = false;
function steerLane(dir) {
    if (dir < 0 && player.lane > 0) { player.lane--; }
    else if (dir > 0 && player.lane < laneCount - 1) { player.lane++; }
    else return;
    player.targetX = laneWidth * player.lane + laneWidth / 2 - player.width / 2;
    playSound(440, 0.05, 'sine', 0.05);
}
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (steeringTouch !== null) return;
    initAudio();
    const touch = e.changedTouches[0];
    steeringTouch = touch.identifier;
    steeringDragged = gameState !== 'playing';
    const rect = canvas.getBoundingClientRect();
    raceTouchSX = touch.clientX - rect.left;

    if (gameState === 'start') startGame();
    else if (gameState === 'gameOver') restartGame();
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (gameState !== 'playing') return;
    const touch = Array.from(e.changedTouches).find(contact => contact.identifier === steeringTouch);
    if (!touch) return;
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const dx = x - raceTouchSX;
    // Drag-steer: cross a lane threshold to change lanes (scaled to canvas)
    const laneCss = rect.width / laneCount;
    if (Math.abs(dx) > laneCss * 0.35) {
        steeringDragged = true;
        steerLane(dx > 0 ? 1 : -1);
        raceTouchSX = x;
    }
}, { passive: false });
canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const touch = Array.from(e.changedTouches).find(contact => contact.identifier === steeringTouch);
    if (!touch) return;
    steeringTouch = null;
    if (gameState !== 'playing' || steeringDragged) return;
    // Tap (no drag): left/right half steers
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    if (Math.abs(x - raceTouchSX) < 12) steerLane(x < rect.width / 2 ? -1 : 1);
}, { passive: false });
canvas.addEventListener('touchcancel', (e) => {
    if (Array.from(e.changedTouches).some(contact => contact.identifier === steeringTouch)) steeringTouch = null;
});
window.addEventListener('blur', () => { steeringTouch = null; });
(function () {
    const frame = document.querySelector('.TEMPLATE-4weird-game-frame');
    if (!frame) return;
    frame.addEventListener('touchmove', (ev) => { if (gameState === 'playing') ev.preventDefault(); }, { passive: false });
    if (document.querySelector('.neon-racer-btns')) return;
    // Steering + gas/brake buttons
    const wrap = document.createElement('div');
    wrap.className = 'neon-racer-btns';
    const steer = document.createElement('div');
    steer.className = 'steer';
    const bl = document.createElement('button'); bl.textContent = '◀'; bl.setAttribute('aria-label', 'Steer left');
    const br = document.createElement('button'); br.textContent = '▶'; br.setAttribute('aria-label', 'Steer right');
    const gas = document.createElement('button'); gas.textContent = '▲ GAS'; gas.className = 'gas';
    const brake = document.createElement('button'); brake.textContent = '▼'; brake.className = 'brake'; brake.setAttribute('aria-label', 'Brake');
    const tapSteer = (btn, dir) => {
        btn.addEventListener('touchstart', (ev) => { ev.preventDefault(); ev.stopPropagation(); initAudio(); if (gameState === 'playing') steerLane(dir); else if (gameState === 'start') startGame(); else restartGame(); }, { passive: false });
        btn.addEventListener('mousedown', (ev) => { ev.stopPropagation(); if (gameState === 'playing') steerLane(dir); });
    };
    tapSteer(bl, -1); tapSteer(br, 1);
    const hold = (btn, set) => {
        btn.addEventListener('touchstart', (ev) => { ev.preventDefault(); ev.stopPropagation(); initAudio(); set(true); }, { passive: false });
        const off = (ev) => { ev.preventDefault(); set(false); };
        btn.addEventListener('touchend', off, { passive: false });
        btn.addEventListener('touchcancel', off, { passive: false });
        btn.addEventListener('mousedown', () => set(true));
        btn.addEventListener('mouseup', () => set(false));
        btn.addEventListener('mouseleave', () => set(false));
    };
    hold(gas, (v) => { gasHeld = v; });
    hold(brake, (v) => { brakeHeld = v; });
    steer.appendChild(bl); steer.appendChild(br);
    wrap.appendChild(steer); wrap.appendChild(brake); wrap.appendChild(gas);
    frame.appendChild(wrap);
    // Tilt toggle (deviceorientation) — optional steering alternative
    const tiltBtn = document.createElement('button');
    tiltBtn.id = 'neon-racer-tilt';
    tiltBtn.textContent = 'TILT: OFF';
    const setTilt = (v) => { tiltEnabled = v; tiltBtn.textContent = v ? 'TILT: ON' : 'TILT: OFF'; tiltBtn.classList.toggle('on', v); };
    tiltBtn.addEventListener('touchstart', (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        const enable = async () => {
            try {
                if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                    const res = await DeviceOrientationEvent.requestPermission();
                    if (res !== 'granted') return;
                }
            } catch (err) { /* fall through, still toggle */ }
            setTilt(!tiltEnabled);
        };
        enable();
    }, { passive: false });
    tiltBtn.addEventListener('click', (ev) => { ev.stopPropagation(); setTilt(!tiltEnabled); });
    frame.appendChild(tiltBtn);
    let lastTiltLane = 0;
    window.addEventListener('deviceorientation', (ev) => {
        if (!tiltEnabled || gameState !== 'playing' || ev.gamma == null) return;
        if (ev.gamma > 18 && lastTiltLane <= 0) { steerLane(1); lastTiltLane = 1; }
        else if (ev.gamma < -18 && lastTiltLane >= 0) { steerLane(-1); lastTiltLane = -1; }
        else if (Math.abs(ev.gamma) < 8) { lastTiltLane = 0; }
    });
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

