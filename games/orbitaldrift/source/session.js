

// Game State Controls
function startGame() {
    sfx.init(); sfx.playStart(); sfx.startMusic();
    gameActive = true; isPaused = false; overFired = false;
    score = 0; multiplier = 1.0; comboChain = 0; comboTimer = 0; comboDrainAcc = 0;
    maxIntegrity = ship().maxIntegrity;
    integrity = maxIntegrity; orbitRadius = 100; targetRadius = 100; satelliteAngle = 0;
    thrustActive = false; lastThrust = false; tutorialCycles = 0; tutorialHidden = false;
    dashT = 0; dashCD = 0; tiltBeta0 = null; sliderHold = false;
    const _db = $('od-dash-btn'); if (_db) { _db.classList.remove('od-cooling'); _db.textContent = '⚡ DASH'; }
    spawnTimerDebris = 0; spawnTimerStardust = 0; spawnTimerPowerup = 250;
    timeElapsed = 0; elapsedSec = 0; phase = 1; surgeActive = false; surgeT = 0; surgeCooldown = 25;
    screenShake = 0; timeScale = 1; dying = false; dyingT = 0;
    stardustCount = 0; basePoints = 0; maxMultiplier = 1.0; nearMissCount = 0;
    hitsThisLap = 0; angleAccum = 0; trailAcc = 0; bleedAcc = 0;
    magnetActive = false; magnetDuration = 0;
    shieldActive = false; shieldDuration = 0;
    overdriveActive = false; overdriveDuration = 0;
    cloakActive = false; cloakDuration = 0;
    chronoActive = false; chronoDuration = 0;
    if (forcefield) forcefield.material.opacity = 0.0;
    if (satellite) satellite.visible = true;
    // ensure the 3D hull matches the hangar selection (no-op if unchanged)
    if (satellite && satellite.userData.shipId !== selectedShip) applyShipSelection(selectedShip, true);

    collectibles.forEach(c => scene.remove(c.mesh));
    debris.forEach(d => scene.remove(d.mesh));
    powerups.forEach(p => scene.remove(p.mesh));
    particles.forEach(p => { scene.remove(p.mesh); });
    shockwaves.forEach(s => { scene.remove(s.mesh); });
    collectibles = []; debris = []; powerups = [];
    particles = []; shockwaves = [];

    $('hud-score').textContent = '0';
    $('hud-multiplier').textContent = '1.0x';
    const cb = $('hud-combo-bar'); if (cb) cb.style.width = '0%';
    const ct = $('hud-combo-tier'); if (ct) ct.textContent = '';
    updateShieldUI();
    $('game-hud').classList.remove('hidden');
    $('TEMPLATE-4weird-start-screen').classList.add('hidden');
    $('TEMPLATE-4weird-pause-screen').classList.add('hidden');
    $('TEMPLATE-4weird-game-over-screen').classList.add('hidden');
    const inputCanvas = $('TEMPLATE-4weird-gameCanvas');
    if (inputCanvas) { inputCanvas.tabIndex = 0; inputCanvas.focus({ preventScroll: true }); }
    const bb = $('TEMPLATE-4weird-best-badge'); if (bb) bb.classList.add('hidden');

    // tutorial for first-timers / first run of session
    try {
        const seen = sessionStorage.getItem('orbitaldrift_tutorial_done');
        if (!seen) {
            const t = $('TEMPLATE-4weird-tutorial-hint');
            if (t) t.classList.remove('hidden');
        } else tutorialHidden = true;
    } catch { tutorialHidden = true; }
    showWaveBanner('WAVE 1', ship().name + ' - stable drift');
}


function togglePause() {
    if (!gameActive) return;
    isPaused = !isPaused;
    const pauseScreen = $('TEMPLATE-4weird-pause-screen');
    if (isPaused) {
        if (pauseScreen) pauseScreen.classList.remove('hidden');
        sfx.stopThrust();
    } else {
        if (pauseScreen) pauseScreen.classList.add('hidden');
        if (thrustActive) sfx.playThrust(true);
    }
}


function resumeGame() {
    if (!gameActive || !isPaused) return;
    isPaused = false;
    $('TEMPLATE-4weird-pause-screen').classList.add('hidden');
    $('TEMPLATE-4weird-gameCanvas')?.focus({ preventScroll: true });
    if (thrustActive) sfx.playThrust(true);
}


function restartGame() { startGame(); }


function gameOver() {
    if (overFired || !gameActive) return;
    overFired = true;
    gameActive = false;
    sfx.stopThrust(); sfx.stopMusic();
    $('game-hud').classList.add('hidden');
    $('TEMPLATE-4weird-game-over-screen').classList.remove('hidden');
    $('TEMPLATE-4weird-final-score-val').textContent = Math.floor(score);
    $('TEMPLATE-4weird-stat-dust').textContent = stardustCount;
    $('TEMPLATE-4weird-stat-base').textContent = Math.floor(basePoints);
    $('TEMPLATE-4weird-stat-bonus').textContent = '+' + Math.max(0, Math.floor(score - basePoints));
    $('TEMPLATE-4weird-stat-maxmult').textContent = maxMultiplier.toFixed(1) + 'x';
    $('TEMPLATE-4weird-stat-near').textContent = nearMissCount;
    $('TEMPLATE-4weird-stat-time').textContent = elapsedSec.toFixed(1) + 's';
    $('TEMPLATE-4weird-stat-ship').textContent = ship().name;
    lastFlight = { score, shipName: ship().name, shipId: selectedShip, time: elapsedSec };
    const shipBestKey = 'orbitaldrift_best_' + selectedShip;
    const prevShipBest = parseInt(store.get(shipBestKey, '0') || '0', 10) || 0;
    if (score > prevShipBest) store.set(shipBestKey, String(Math.floor(score)));
    let isBest = false;
    if (score > highScore) { highScore = Math.floor(score); store.set('orbitaldrift_high_score', String(highScore)); isBest = true; }
    if (maxMultiplier > bestCombo) { bestCombo = maxMultiplier; store.set('orbitaldrift_best_combo', String(bestCombo)); }
    if (elapsedSec > bestTime) { bestTime = elapsedSec; store.set('orbitaldrift_best_time', String(bestTime)); }
    const bb = $('TEMPLATE-4weird-best-badge');
    if (bb) bb.classList.toggle('hidden', !isBest);
    const hs = $('TEMPLATE-4weird-high-score');
    if (hs) hs.textContent = highScore;
    const v = $('vignette'); if (v) v.classList.remove('low-hp');
}


function startDeath() {
    if (dying) return;
    dying = true; dyingT = 0; timeScale = 0.16;
    sfx.playHit();
    spawnExplosion(satellite.position, 0xffffff, 30);
    spawnExplosion(satellite.position, 0x06b6d4, 30);
    spawnShockwave(satellite.position);
    satellite.visible = false;
    fireHitFlash();
    if (shakeEnabled) screenShake = 26;
}
