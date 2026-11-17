
function updateShieldUI() {
    const bar = $('hud-integrity-bar');
    const num = $('hud-integrity-num');
    const pct = Math.max(0, Math.min(100, (integrity / maxIntegrity) * 100));
    if (bar) {
        bar.style.width = pct + '%';
        bar.classList.toggle('warn', integrity <= maxIntegrity * 0.6 && integrity > maxIntegrity * 0.3);
        bar.classList.toggle('crit', integrity <= maxIntegrity * 0.3);
    }
    if (num) num.textContent = Math.round(integrity) + '/' + maxIntegrity;
    const v = $('vignette');
    if (v) v.classList.toggle('low-hp', gameActive && integrity <= maxIntegrity * 0.3);
    const hs = $('hud-score');
    if (hs) hs.classList.toggle('low-shield', gameActive && integrity <= maxIntegrity * 0.3);
}

function updatePowerupHUD() {
    const pairs = [
        ['TEMPLATE-4weird-powerup-magnet', 'TEMPLATE-4weird-magnet-bar', 'TEMPLATE-4weird-magnet-secs', magnetActive, magnetDuration, 7],
        ['TEMPLATE-4weird-powerup-shield', 'TEMPLATE-4weird-shield-bar', 'TEMPLATE-4weird-shield-secs', shieldActive, shieldDuration, 8]
    ];
    pairs.forEach(([chip, bar, secs, active, dur, max]) => {
        const c = $(chip); if (!c) return;
        c.classList.toggle('hidden', !active);
        if (active) {
            const b = $(bar); if (b) b.style.width = Math.max(0, (dur / max) * 100) + '%';
            const s = $(secs); if (s) s.textContent = dur.toFixed(1) + 's';
        }
    });
    let fxActive = false, fxLabel = '', fxFrac = 0;
    if (overdriveActive) { fxActive = true; fxLabel = '🔥 OVERDRIVE ' + overdriveDuration.toFixed(1) + 's'; fxFrac = overdriveDuration / 10; }
    else if (cloakActive) { fxActive = true; fxLabel = '👻 CLOAK ' + cloakDuration.toFixed(1) + 's'; fxFrac = cloakDuration / 3; }
    else if (chronoActive) { fxActive = true; fxLabel = '⏳ CHRONO ' + chronoDuration.toFixed(1) + 's'; fxFrac = chronoDuration / 5; }
    const fx = $('TEMPLATE-4weird-powerup-fx');
    if (fx) {
        fx.classList.toggle('hidden', !fxActive);
        if (fxActive) {
            $('TEMPLATE-4weird-fx-label').textContent = fxLabel;
            $('TEMPLATE-4weird-fx-bar').style.width = Math.max(0, fxFrac * 100) + '%';
        }
    }
}


function updateHangarSummary() {
    updateShipBests();
    const el = $('hangar-last-flight');
    if (!el) return;
    if (lastFlight) {
        el.textContent = 'Last flight - ' + Math.floor(lastFlight.score) + ' pts · ' +
            lastFlight.shipName + ' · ' + lastFlight.time.toFixed(1) + 's · Best ' + highScore;
    } else if (highScore > 0) {
        el.textContent = 'Welcome back, pilot - best ' + highScore + '. Choose your hull.';
    } else {
        el.textContent = 'Choose your hull, pilot.';
    }
}


function updateShipBests() {
    document.querySelectorAll('[data-best]').forEach((el) => {
        const id = el.getAttribute('data-best');
        const best = parseInt(store.get('orbitaldrift_best_' + id, '0') || '0', 10) || 0;
        el.textContent = best > 0 ? 'BEST ' + best : 'BEST -';
    });
}


function updateMultiplierUI() {
    multiplier = comboMult();
    maxMultiplier = Math.max(maxMultiplier, multiplier);
    $('hud-multiplier').textContent = multiplier.toFixed(1) + 'x';
    const tiers = multiplier >= 5 ? 'SUPERNOVA' : multiplier >= 3 ? 'BLAZING' : multiplier >= 1.5 ? 'HOT' : '';
    const ct = $('hud-combo-tier');
    if (ct) ct.textContent = tiers;
    if (multiplier >= 3) hudPop('hud-multiplier');
}
