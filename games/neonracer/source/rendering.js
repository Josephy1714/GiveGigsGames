function draw() {
    // Background - road
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Road edges
    ctx.fillStyle = '#ff0066';
    ctx.fillRect(0, 0, 4, canvas.height);
    ctx.fillRect(canvas.width - 4, 0, 4, canvas.height);
    
    // Lane lines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    roadLines.forEach(line => {
        for (let i = 1; i < laneCount; i++) {
            ctx.fillRect(i * laneWidth - 2, line.y, 4, 40);
        }
    });
    
    // City skyline silhouette (background)
    ctx.fillStyle = 'rgba(100, 50, 150, 0.2)';
    for (let i = 0; i < 10; i++) {
        const bx = i * 45;
        const bh = 50 + Math.sin(i * 1.5) * 30;
        ctx.fillRect(bx, canvas.height - bh - 100, 35, bh);
    }
    
    // Coins
    coinItems.forEach(coin => {
        ctx.save();
        ctx.translate(coin.x, coin.y);
        ctx.scale(Math.cos(coin.rotation) * 0.5 + 0.6, 1);
        
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffaa00';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);
        
        ctx.restore();
        ctx.shadowBlur = 0;
    });
    
    // Power-ups
    powerUps.forEach(pu => {
        ctx.fillStyle = pu.color;
        ctx.shadowColor = pu.color;
        ctx.shadowBlur = 15;
        ctx.fillRect(pu.x, pu.y, pu.width, pu.height);
        
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const icons = { speed: '⚡', slow: '🐢', shield: '🛡️', magnet: '🧲' };
        ctx.fillText(icons[pu.type] || '?', pu.x + pu.width / 2, pu.y + pu.height / 2);
    });
    
    // Enemies
    enemies.forEach(enemy => {
        drawCar(enemy.x, enemy.y, enemy.width, enemy.height, enemy.color, false);
    });
    
    // Player car
    drawCar(player.x, player.y, player.width, player.height, player.color, true);
    
    // Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 25;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });
    
    // HUD
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 16px Orbitron, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.floor(distance)}m`, 10, 25);
    
    ctx.fillStyle = '#ffff00';
    ctx.textAlign = 'right';
    ctx.fillText(`💰 ${coins}`, canvas.width - 10, 25);
    
    ctx.fillStyle = '#ff0066';
    ctx.font = '12px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${speed.toFixed(1)}x`, canvas.width / 2, 25);
}

function gameLoop(timestamp = performance.now()) {
    if (gameState !== 'playing') return;
    
    neonClock.advance(timestamp, update, () => gameState === 'playing');
    draw();
    
    if (gameState === 'playing') animationId = requestAnimationFrame(gameLoop);
}

// Start screen animation
function drawStartScreen() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Road lines animation
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    roadLines.forEach(line => {
        line.y += 1;
        if (line.y > canvas.height) line.y = -40;
        for (let i = 1; i < laneCount; i++) {
            ctx.fillRect(i * laneWidth - 2, line.y, 4, 40);
        }
    });
    
    if (gameState === 'start') {
        requestAnimationFrame(drawStartScreen);
    }
}

drawStartScreen();

window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SET_GAME_SPEED') {
        const s = parseFloat(event.data.speed);
        if (!isNaN(s) && s > 0) {
            window.speedMultiplier = s;
        }
    }
    if (event.data && event.data.type === 'SET_MUTED') {
        setMuted(!!event.data.muted);
    }
});

// ===== In-game fullscreen overlay (shell also provides global FS) =====
