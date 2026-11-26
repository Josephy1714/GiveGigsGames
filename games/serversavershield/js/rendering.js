var outerMatrixCanvas = null;
var outerMatrixCtx = null;
var _outerResizeHooked = false;

function initOuterMatrix() {
    // The old full-page Matrix animation repainted hundreds of glyphs while
    // the hidden game-only canvas was still being composited. Keep it static.
    outerMatrixCanvas = document.getElementById('TEMPLATE-4weird-starfield');
    outerMatrixCtx = outerMatrixCanvas?.getContext('2d') || null;
    if (!outerMatrixCanvas || !outerMatrixCtx) return;
    resizeOuterMatrix();
    if (!_outerResizeHooked) {
        window.addEventListener('resize', resizeOuterMatrix);
        _outerResizeHooked = true;
    }
}

function resizeOuterMatrix() {
    if (!outerMatrixCanvas) return;
    outerMatrixCanvas.width = window.innerWidth;
    outerMatrixCanvas.height = window.innerHeight;
    if (!outerMatrixCtx) return;
    const gradient = outerMatrixCtx.createLinearGradient(0, 0, 0, outerMatrixCanvas.height);
    gradient.addColorStop(0, '#030b08');
    gradient.addColorStop(1, '#020503');
    outerMatrixCtx.fillStyle = gradient;
    outerMatrixCtx.fillRect(0, 0, outerMatrixCanvas.width, outerMatrixCanvas.height);
    outerMatrixCtx.strokeStyle = 'rgba(16,185,129,0.045)';
    outerMatrixCtx.lineWidth = 1;
    outerMatrixCtx.beginPath();
    for (let x = 24; x < outerMatrixCanvas.width; x += 48) {
        outerMatrixCtx.moveTo(x, 0);
        outerMatrixCtx.lineTo(x, outerMatrixCanvas.height);
    }
    for (let y = 24; y < outerMatrixCanvas.height; y += 48) {
        outerMatrixCtx.moveTo(0, y);
        outerMatrixCtx.lineTo(outerMatrixCanvas.width, y);
    }
    outerMatrixCtx.stroke();
}

function updateAndDrawOuterMatrix() {
    // Static backdrop is painted once by initOuterMatrix/resizeOuterMatrix.
}

function initStars() {
    // No animated glyph state is needed for the cached backdrop.
}

function updateStars() {
    // No per-frame glyph simulation; the cached circuit grid carries the theme.
}

var _bgCanvas = null;
var _bgCanvasWidth = 0;
var _bgCanvasHeight = 0;
function drawBackground() {
    const ctx = getContext();
    if (!_bgCanvas || _bgCanvasWidth !== CANVAS_WIDTH || _bgCanvasHeight !== CANVAS_HEIGHT) {
        _bgCanvas = document.createElement('canvas');
        _bgCanvas.width = _bgCanvasWidth = CANVAS_WIDTH;
        _bgCanvas.height = _bgCanvasHeight = CANVAS_HEIGHT;
        const bg = _bgCanvas.getContext('2d');
        const gradient = bg.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, '#04110d');
        gradient.addColorStop(0.55, '#03100b');
        gradient.addColorStop(1, '#020805');
        bg.fillStyle = gradient;
        bg.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        bg.strokeStyle = 'rgba(16,185,129,0.09)';
        bg.lineWidth = 1;
        bg.beginPath();
        for (let x = 24; x < CANVAS_WIDTH; x += 48) {
            bg.moveTo(x, 0);
            bg.lineTo(x, CANVAS_HEIGHT);
        }
        for (let y = 24; y < CANVAS_HEIGHT; y += 48) {
            bg.moveTo(0, y);
            bg.lineTo(CANVAS_WIDTH, y);
        }
        bg.stroke();
        bg.fillStyle = 'rgba(52,211,153,0.4)';
        for (let x = 24; x < CANVAS_WIDTH; x += 96) {
            for (let y = 24; y < CANVAS_HEIGHT; y += 96) {
                bg.fillRect(x - 1, y - 1, 2, 2);
            }
        }
    }
    ctx.drawImage(_bgCanvas, 0, 0);
}

function drawStars() {
    // Backdrop details are baked into _bgCanvas once.
}

function drawPowerups() {
    const ctx = getContext();
    const pretty = (typeof isBeautiful === 'function') && isBeautiful();
    if (pretty) {
        // Beautiful: per-powerup glow (GPU blur pass each - the cost Fast avoids).
        powerups.forEach(p => {
            ctx.save();
            const pulse = Math.sin(p.pulse) * 3;
            ctx.shadowBlur = 15 + pulse;
            ctx.shadowColor = p.type === 'heal' ? '#ec4899' : p.type === 'shield' ? '#3b82f6' : p.type === 'nuke' ? '#f59e0b' : '#8b5cf6';
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#172554';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.emoji, p.x, p.y);
            ctx.restore();
        });
        return;
    }
    // Fast: no shadowBlur. Emoji is readable without the glow.
    ctx.save();
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < powerups.length; i++) {
        const p = powerups[i];
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#172554';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText(p.emoji, p.x, p.y);
    }
    ctx.restore();
}

function drawParticles() {
    const ctx = getContext();
    // Batch plain circle particles into one path (one fill call per color run
    // would be ideal; a single path + per-particle fillStyle change is still
    // far cheaper than save/arc/fill/restore per particle).
    ctx.save();
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.emoji) continue;
        ctx.globalAlpha = p.life <= 0 ? 0 : (p.life >= 1 ? 1 : p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const r = p.radius * (p.life >= 1 ? 1 : p.life);
        ctx.arc(p.x, p.y, r > 0.5 ? r : 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
    // Emoji particles are rare (kill bursts) - draw them without rotation math.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!p.emoji) continue;
        ctx.globalAlpha = p.life <= 0 ? 0 : (p.life >= 1 ? 1 : p.life);
        ctx.font = (p.radius * 4) + 'px Arial';
        ctx.fillText(p.emoji, p.x, p.y);
    }
    ctx.restore();
}

function drawEnemies() {
    const ctx = getContext();
    const pretty = (typeof isBeautiful === 'function') && isBeautiful();
    for (const e of enemies) {
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius + 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        if (pretty) {
            ctx.shadowBlur = 12;
            ctx.shadowColor = e.color;
        }
        ctx.font = (e.radius * 1.8) + 'px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.emoji, e.x, e.y);
        ctx.shadowBlur = 0;
        if (e.maxHp > 1) {
            const w = 30 * (e.currentHp > 0 ? e.currentHp / e.maxHp : 0);
            ctx.fillStyle = '#020503';
            ctx.fillRect(e.x - 15, e.y - e.radius - 12, 30, 5);
            ctx.fillStyle = e.color;
            if (w > 0) ctx.fillRect(e.x - 15, e.y - e.radius - 12, w, 5);
        }
        ctx.restore();
    }
}

function drawPlayer() {
    const ctx = getContext();
    const pretty = (typeof isBeautiful === 'function') && isBeautiful();
    ctx.save();
    const t = Date.now() * 0.005;
    if (pretty) {
        // Beautiful: full glow ring + glowing shield bubble.
        if (shieldTimer > 0) {
            ctx.strokeStyle = 'rgba(59,130,246,' + (0.8 + Math.sin(Date.now() * 0.01) * 0.2) + ')';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#3b82f6';
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 15, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(139,92,246,1)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(139,92,246,0.8)';
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 8 + Math.sin(t) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 10;
    } else {
        // Fast: one cheap shadow for the ring, flat shield circle.
        ctx.strokeStyle = 'rgba(139,92,246,1)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(139,92,246,0.8)';
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 8 + Math.sin(t) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        if (shieldTimer > 0) {
            ctx.strokeStyle = 'rgba(59,130,246,0.9)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 15, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#065f46';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = (player.radius * 2.5) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🛡️', player.x, player.y + 5);
    if (player.hasCompanion) {
        ctx.font = (player.radius * 2) + 'px Arial';
        ctx.fillText('👨‍💻', player.x - player.radius - 20, player.y + player.radius);
    }
    ctx.restore();
}

function drawBullets() {
    const ctx = getContext();
    // Batch bullets: group consecutive same-color bullets into one path.
    ctx.save();
    let lastColor = null;
    for (let i = 0; i < bullets.length; i++) {
        const b = bullets[i];
        const c = b.color || '#fbbf24';
        if (c !== lastColor) {
            if (lastColor !== null) ctx.fill();
            ctx.beginPath();
            ctx.fillStyle = c;
            lastColor = c;
        }
        // moveTo avoids connecting arcs with a line within the shared path
        ctx.moveTo(b.x + b.radius, b.y);
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    }
    if (lastColor !== null) ctx.fill();
    ctx.restore();
}

function drawCombo() {
    const ctx = getContext();
    if (comboCount > 1 && comboTimer > 0) {
        ctx.save();
        ctx.font = 'bold 20px Orbitron,sans-serif';
        ctx.fillStyle = '#f59e0b';
        ctx.textAlign = 'center';
        if ((typeof isBeautiful === 'function') && isBeautiful()) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#f59e0b';
        }
        ctx.fillText('COMBO x' + comboCount, player.x, player.y - player.radius - 25);
        ctx.restore();
    }
}

function drawFloatingTexts() {
    const ctx = getContext();
    if (floatingTexts.length === 0) return;
    // Fade via life/60 (life counts down from 60). Glow only on Beautiful.
    const pretty = (typeof isBeautiful === 'function') && isBeautiful();
    ctx.save();
    ctx.textAlign = 'center';
    for (let i = 0; i < floatingTexts.length; i++) {
        const t = floatingTexts[i];
        ctx.globalAlpha = t.life >= 60 ? 1 : t.life / 60;
        ctx.font = 'bold ' + t.size + 'px Orbitron,sans-serif';
        ctx.fillStyle = t.color;
        if (pretty) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = t.color;
        }
        ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
}

function drawHUD() {
    if (document.body.classList.contains('fw-defense-hud')) {
        if (comboCount > 1 && comboTimer > 0) drawComboEffect(getContext());
        return;
    }
    const ctx = getContext();
    ctx.save();
    ctx.font = '12px Orbitron,sans-serif';
    ctx.fillStyle = '#10b981';
    ctx.textAlign = 'left';
    ctx.fillText('💵 $' + Math.floor(gameState.balance), 10, 20);
    ctx.fillText('💸 +$' + gameState.incomePerSec + '/s', 10, 35);
    ctx.fillText('🧠 Trust: ' + Math.floor(gameState.customerTrust) + '%', 10, 50);
    ctx.fillText('💯 Rep: ' + Math.floor(gameState.reputation) + '%', 10, 65);
    const weapon = WEAPONS[currentWeapon] || WEAPONS.standard;
    ctx.fillStyle = weaponTimer > 0 ? '#10b981' : '#9ca3af';
    ctx.fillText(weapon.emoji + ' ' + weapon.name + (weaponTimer > 0 ? ' (' + Math.ceil(weaponTimer / 60) + 's)' : ''), 10, 80);
    ctx.fillStyle = '#10b981';
    ctx.fillText('🌊 Wave: ' + wave, CANVAS_WIDTH - 150, 20);
    ctx.fillText('💀 Kills: ' + kills, CANVAS_WIDTH - 150, 35);
    ctx.fillText('🏆 Score: ' + score, CANVAS_WIDTH - 150, 50);
    ctx.fillText('Firing: ' + (isShooting ? '✅ ON' : '❌ OFF'), CANVAS_WIDTH - 150, 65);
    
    // Draw combo multiplier if active
    if (comboCount > 1 && comboTimer > 0) {
        drawComboEffect(ctx);
    }
    
    ctx.restore();
}

// Screen flash effect for damage
var screenFlashIntensity = 0;

function triggerScreenFlash(intensity = 0.3) {
    screenFlashIntensity = Math.min(intensity, 0.5);
}

function updateScreenFlash() {
    if (screenFlashIntensity > 0) {
        screenFlashIntensity -= 0.02;
        if (screenFlashIntensity < 0) screenFlashIntensity = 0;
    }
}

function drawScreenFlash(ctx) {
    if (screenFlashIntensity > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${screenFlashIntensity})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
}

// Enhanced combo effect
function drawComboEffect(ctx) {
    const comboMult = Math.min(comboCount, 5);
    const pulse = Math.sin(Date.now() / 100) * 0.3 + 0.7;
    
    // Draw combo badge (glow only on Beautiful - it runs every frame while combo active)
    ctx.save();
    ctx.font = `bold ${20 + comboMult * 3}px Orbitron,sans-serif`;
    ctx.fillStyle = `rgba(245, 158, 11, ${pulse})`; // Orange with pulse
    ctx.textAlign = 'center';
    if ((typeof isBeautiful === 'function') && isBeautiful()) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#f59e0b';
    }
    
    const comboText = `COMBO x${comboCount}`;
    const x = CANVAS_WIDTH / 2;
    const y = 80;
    
    // Draw background glow
    ctx.fillStyle = `rgba(245, 158, 11, ${0.2 * pulse})`;
    ctx.fillRect(x - 80, y - 25, 160, 40);
    
    // Draw text
    ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
    ctx.fillText(comboText, x, y);
    
    // Draw multiplier bonus
    if (comboMult > 1) {
        ctx.font = '14px Orbitron,sans-serif';
        ctx.fillStyle = `rgba(16, 185, 129, ${pulse})`;
        ctx.fillText(`${comboMult}x SCORE MULTIPLIER`, x, y + 25);
    }
    
    ctx.restore();
}

// Hit feedback particles
var hitParticles = [];

function spawnHitParticles(x, y, color = '#ff0000', count = 5) {
    if (hitParticles.length > 200) return;
    for (let i = 0; i < count; i++) {
        hitParticles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1.0,
            color: color,
            size: Math.random() * 4 + 2
        });
    }
}

function updateHitParticles() {
    for (let i = hitParticles.length - 1; i >= 0; i--) {
        const p = hitParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        p.vx *= 0.95;
        p.vy *= 0.95;
        
        if (p.life <= 0) {
            hitParticles.splice(i, 1);
        }
    }
}

function drawHitParticles(ctx) {
    if (hitParticles.length === 0) return;
    ctx.save();
    for (let i = 0; i < hitParticles.length; i++) {
        const p = hitParticles[i];
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawServers() {
    const ctx = getContext();
    const shake = getScreenShake();
    
    servers.forEach(server => {
        if (server.status === 'offline') return; // Don't draw offline servers
        
        ctx.save();
        ctx.translate(shake.x, shake.y);
        
        // Draw server emoji
        ctx.font = '50px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Glow effect based on status (Beautiful only - Fast skips the blur pass)
        if ((typeof isBeautiful === 'function') && isBeautiful()) {
            if (server.status === 'degraded') {
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#f59e0b'; // Orange warning
            } else {
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#10b981'; // Green online
            }
        }
        
        ctx.fillText(server.emoji, server.x, server.y);
        
        // Draw HP bar above server
        const barWidth = 60;
        const barHeight = 8;
        const barX = server.x - barWidth / 2;
        const barY = server.y - 50;
        
        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // HP fill
        const hpPercent = server.hp / server.maxHp;
        let hpColor = '#10b981'; // Green
        if (server.status === 'degraded') hpColor = '#f59e0b'; // Orange
        
        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
        
        // HP border
        ctx.strokeStyle = hpColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        // Status indicator
        ctx.font = '10px Arial';
        ctx.fillStyle = hpColor;
        ctx.fillText(server.status.toUpperCase(), server.x, barY - 8);
        
        ctx.restore();
    });
}
