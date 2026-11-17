function draw() {
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0a0020');
    gradient.addColorStop(0.5, '#1a0a30');
    gradient.addColorStop(1, '#0a0020');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid lines (perspective effect)
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.15)';
    ctx.lineWidth = 1;
    
    // Horizontal grid
    for (let i = 0; i < 10; i++) {
        const y = (i * 100 + gridOffset) % canvas.height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Lane dividers
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 20]);
    ctx.lineDashOffset = -gridOffset * 0.5;
    
    for (let i = 1; i < laneCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * laneWidth, 0);
        ctx.lineTo(i * laneWidth, canvas.height);
        ctx.stroke();
    }
    ctx.setLineDash([]);
    
    // Side glow
    const leftGlow = ctx.createLinearGradient(0, 0, 60, 0);
    leftGlow.addColorStop(0, 'rgba(255, 0, 102, 0.3)');
    leftGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = leftGlow;
    ctx.fillRect(0, 0, 60, canvas.height);
    
    const rightGlow = ctx.createLinearGradient(canvas.width, 0, canvas.width - 60, 0);
    rightGlow.addColorStop(0, 'rgba(0, 255, 255, 0.3)');
    rightGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = rightGlow;
    ctx.fillRect(canvas.width - 60, 0, 60, canvas.height);
    
    // Particles (underneath)
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 35;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    
    // Obstacles
    obstacles.forEach(obs => {
        ctx.fillStyle = obs.color;
        ctx.shadowColor = obs.color;
        ctx.shadowBlur = 20;
        
        if (obs.type === 'block') {
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            // Inner detail
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(obs.x + 5, obs.y + 5, obs.width - 10, 5);
        } else if (obs.type === 'spike') {
            ctx.beginPath();
            ctx.moveTo(obs.x + obs.width / 2, obs.y);
            ctx.lineTo(obs.x, obs.y + obs.height);
            ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
            ctx.closePath();
            ctx.fill();
        } else {
            // barrier
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height * 0.4);
            ctx.fillRect(obs.x, obs.y + obs.height * 0.6, obs.width, obs.height * 0.4);
        }
    });
    ctx.shadowBlur = 0;
    
    // Collectibles
    collectibles.forEach(col => {
        ctx.save();
        ctx.translate(col.x + col.width / 2, col.y + col.height / 2);
        ctx.rotate(col.rotation);
        
        ctx.fillStyle = col.color;
        ctx.shadowColor = col.color;
        ctx.shadowBlur = 15;
        
        if (col.type === 'coin') {
            ctx.beginPath();
            ctx.arc(0, 0, col.width / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('★', 0, 0);
        } else if (col.type === 'shield') {
            ctx.beginPath();
            ctx.moveTo(0, -col.height / 2);
            ctx.lineTo(col.width / 2, -col.height / 4);
            ctx.lineTo(col.width / 2, col.height / 4);
            ctx.lineTo(0, col.height / 2);
            ctx.lineTo(-col.width / 2, col.height / 4);
            ctx.lineTo(-col.width / 2, -col.height / 4);
            ctx.closePath();
            ctx.fill();
        } else {
            // slowmo - hourglass shape
            ctx.beginPath();
            ctx.moveTo(-col.width / 3, -col.height / 2);
            ctx.lineTo(col.width / 3, -col.height / 2);
            ctx.lineTo(-col.width / 3, col.height / 2);
            ctx.lineTo(col.width / 3, col.height / 2);
            ctx.closePath();
            ctx.fill();
        }
        
        ctx.restore();
    });
    ctx.shadowBlur = 0;
    
    // Player ship
    ctx.fillStyle = player.color;
    ctx.shadowColor = player.color;
    ctx.shadowBlur = 25;
    
    // Ship body
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x, player.y + player.height * 0.7);
    ctx.lineTo(player.x + player.width * 0.3, player.y + player.height);
    ctx.lineTo(player.x + player.width * 0.7, player.y + player.height);
    ctx.lineTo(player.x + player.width, player.y + player.height * 0.7);
    ctx.closePath();
    ctx.fill();
    
    // Cockpit
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(player.x + player.width / 2, player.y + player.height * 0.4, 8, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Shield effect
    if (player.shield) {
        ctx.strokeStyle = '#00ff66';
        ctx.shadowColor = '#00ff66';
        ctx.shadowBlur = 20;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 35 + Math.sin(Date.now() * 0.01) * 3, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    ctx.shadowBlur = 0;
    
    // HUD
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 20px Orbitron, sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.fillText(`${Math.floor(distance)}m`, 15, 35);
    
    ctx.fillStyle = '#ff0066';
    ctx.shadowColor = '#ff0066';
    ctx.font = 'bold 14px Orbitron, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${speed.toFixed(1)}x`, canvas.width - 15, 35);
    
    ctx.shadowBlur = 0;
}

function gameLoop(timestamp = performance.now()) {
    if (gameState !== 'playing') return;
    
    neonClock.advance(timestamp, update, () => gameState === 'playing');
    draw();
    
    if (gameState === 'playing') animationId = requestAnimationFrame(gameLoop);
}

// Start screen animation
function drawStartScreen() {
    ctx.fillStyle = '#0a0020';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Animated grid
    gridOffset += 1;
    if (gridOffset > 100) gridOffset = 0;
    
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
        const y = (i * 100 + gridOffset) % canvas.height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
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
