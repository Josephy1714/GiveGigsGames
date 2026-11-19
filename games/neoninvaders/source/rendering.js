function draw() {
    ctx.save();
    if (shakeTime > 0) {
        ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
        shakeTime--;
    }
    // Clear canvas
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(-10, -10, canvas.width + 20, canvas.height + 20);
    
    // Draw stars
    stars.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });
    
    // Draw player
    ctx.fillStyle = player.color;
    ctx.shadowColor = player.color;
    ctx.shadowBlur = 15;
    
    // Draw triangle ship
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.closePath();
    ctx.fill();
    
    // Draw engine glow
    ctx.fillStyle = '#ff6600';
    ctx.shadowColor = '#ff6600';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height + 3, 5 + Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw shield
    if (player.hasShield) {
        ctx.strokeStyle = '#00ff00';
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 20;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 30, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    ctx.shadowBlur = 0;
    
    // Draw enemies
    enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        ctx.shadowColor = enemy.color;
        ctx.shadowBlur = 10;
        
        // Draw enemy shape
        ctx.beginPath();
        ctx.moveTo(enemy.x + enemy.width / 2, enemy.y + enemy.height);
        ctx.lineTo(enemy.x, enemy.y + enemy.height / 2);
        ctx.lineTo(enemy.x + enemy.width / 4, enemy.y);
        ctx.lineTo(enemy.x + enemy.width * 3/4, enemy.y);
        ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height / 2);
        ctx.closePath();
        ctx.fill();
        
        // Draw eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(enemy.x + enemy.width * 0.35, enemy.y + enemy.height * 0.4, 3, 0, Math.PI * 2);
        ctx.arc(enemy.x + enemy.width * 0.65, enemy.y + enemy.height * 0.4, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    
    ctx.shadowBlur = 0;
    
    // Draw bullets
    bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.shadowColor = bullet.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(bullet.x - 2, bullet.y, 4, bullet.isEnemy ? 12 : 8);
    });
    
    ctx.shadowBlur = 0;
    
    // Draw power-ups
    powerUps.forEach(powerUp => {
        ctx.fillStyle = powerUp.color;
        ctx.shadowColor = powerUp.color;
        ctx.shadowBlur = 15;
        
        ctx.beginPath();
        ctx.arc(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2, powerUp.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw icon
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        const icons = { triple: '3', shield: 'S', life: '+', rapid: 'R' };
        ctx.fillText(icons[powerUp.type] || '?', powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2 + 4);
    });
    
    ctx.shadowBlur = 0;
    
    // Draw HUD
    ctx.fillStyle = '#00ffff';
    ctx.font = '18px Orbitron, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 30);
    
    ctx.fillStyle = '#ff0066';
    ctx.fillText(`WAVE: ${wave}`, canvas.width / 2 - 40, 30);
    
    ctx.fillStyle = '#00ff00';
    ctx.fillText(`LIVES: ${lives}`, canvas.width - 110, 30);
    ctx.restore();
}

function gameLoop(timestamp = performance.now()) {
    if (gameState !== 'playing') return;
    
    neonClock.advance(timestamp, update, () => gameState === 'playing');
    draw();
    
    if (gameState === 'playing') animationId = requestAnimationFrame(gameLoop);
}

// Draw start screen background
function drawStartScreen() {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    stars.forEach(star => {
        star.y += star.speed * 0.3;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
        
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    if (gameState === 'start') {
        requestAnimationFrame(drawStartScreen);
    }
}

// Initialize
drawStartScreen();

// ===== Mobile Touch Controls — drag-move + auto-fire button =====
let touchStartX = 0;
let touchStartY = 0;
let playerStartX = 0;
let playerStartY = 0;
let isTouching = false;
let fireHeld = false;
let autoFire = true; // mobile default ON so drag alone can play

function shootBullet() {
    if (player.tripleShot) {
        bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, vy: -8, vx: -2, color: '#00ffff' });
        bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, vy: -8, vx: 0, color: '#00ffff' });
        bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, vy: -8, vx: 2, color: '#00ffff' });
    } else {
        bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, vy: -8, vx: 0, color: '#00ffff' });
    }
    bulletCooldown = player.rapidFire ? 5 : baseBulletCooldown;
    playShootSound();
}

function setupTouchControls() {
    if (!canvas) return;
    const frame = document.querySelector('.TEMPLATE-4weird-game-frame');

    // Drag anywhere on canvas: absolute 1:1 move (scaled to canvas coords)
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        initAudio();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        playerStartX = player.x;
        playerStartY = player.y;
        isTouching = true;

        if (gameState === 'start') { startGame(); return; }
        if (gameState === 'gameOver') { restartGame(); return; }
        if (gameState === 'playing' && bulletCooldown <= 0 && (fireHeld || autoFire)) shootBullet();
        // Store scale for move handler
        canvas._touchScaleX = canvas.width / rect.width;
        canvas._touchScaleY = canvas.height / rect.height;
    }, { passive: false });

    // Touch move - drag player, auto-fire while dragging
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (gameState !== 'playing' || !isTouching) return;

        const touch = e.touches[0];
        const sx = canvas._touchScaleX || 1;
        const sy = canvas._touchScaleY || 1;
        player.x = playerStartX + (touch.clientX - touchStartX) * sx;
        player.y = playerStartY + (touch.clientY - touchStartY) * sy;
        player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
        player.y = Math.max(canvas.height / 2, Math.min(canvas.height - player.height - 10, player.y));

        if (bulletCooldown <= 0 && (fireHeld || autoFire)) shootBullet();
    }, { passive: false });

    // Touch end
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        isTouching = false;
    }, { passive: false });

    if (frame) frame.addEventListener('touchmove', (e) => { if (gameState === 'playing') e.preventDefault(); }, { passive: false });

    // FIRE hold-button + AUTO toggle (touch affordance on top of drag+autofire)
    if (frame && !document.getElementById('neon-invaders-fire')) {
        const fireBtn = document.createElement('button');
        fireBtn.id = 'neon-invaders-fire';
        fireBtn.textContent = 'FIRE';
        const startFire = (e) => { e.preventDefault(); e.stopPropagation(); initAudio(); fireHeld = true; fireBtn.classList.add('firing'); if (gameState === 'playing' && bulletCooldown <= 0) shootBullet(); };
        const stopFire = (e) => { e.preventDefault(); fireHeld = false; fireBtn.classList.remove('firing'); };
        fireBtn.addEventListener('touchstart', startFire, { passive: false });
        fireBtn.addEventListener('touchend', stopFire, { passive: false });
        fireBtn.addEventListener('touchcancel', stopFire, { passive: false });
        fireBtn.addEventListener('mousedown', startFire);
        fireBtn.addEventListener('mouseup', stopFire);
        frame.appendChild(fireBtn);

        const autoBtn = document.createElement('button');
        autoBtn.id = 'neon-invaders-autofire';
        autoBtn.textContent = 'AUTO: ON';
        autoBtn.classList.add('on');
        autoBtn.addEventListener('touchstart', (e) => {
            e.preventDefault(); e.stopPropagation();
            autoFire = !autoFire;
            autoBtn.textContent = autoFire ? 'AUTO: ON' : 'AUTO: OFF';
            autoBtn.classList.toggle('on', autoFire);
        }, { passive: false });
        autoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            autoFire = !autoFire;
            autoBtn.textContent = autoFire ? 'AUTO: ON' : 'AUTO: OFF';
            autoBtn.classList.toggle('on', autoFire);
        });
        frame.appendChild(autoBtn);
    }
}

// Initialize touch controls when game loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupTouchControls);
} else {
    setupTouchControls();
}

window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SET_GAME_SPEED') {
        const speed = parseFloat(event.data.speed);
        if (!isNaN(speed) && speed > 0) {
            window.speedMultiplier = speed;
        }
    }
    if (event.data && event.data.type === 'SET_MUTED') {
        setMuted(!!event.data.muted);
    }
});

// ===== In-game fullscreen overlay (shell also provides global FS) =====
