function draw() {
    // Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }
    
    // Border glow
    ctx.strokeStyle = 'rgba(255, 0, 102, 0.3)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    
    // Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    
    // Food
    const ft = foodTypes.find(f => f.type === foodType) || foodTypes[0];
    const pulseScale = 1 + Math.sin(foodPulse) * 0.15;
    const foodSize = gridSize * 0.6 * pulseScale;
    const foodX = food.x * gridSize + gridSize / 2;
    const foodY = food.y * gridSize + gridSize / 2;
    
    ctx.fillStyle = ft.color;
    ctx.shadowColor = ft.color;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(foodX, foodY, foodSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(foodX - 2, foodY - 2, foodSize / 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Snake body
    for (let i = snake.length - 1; i >= 0; i--) {
        const segment = snake[i];
        const isHead = i === 0;
        
        // Color gradient along body
        const hue = 180 + (i / snake.length) * 60; // cyan to magenta
        const color = isHead ? '#00ffff' : `hsl(${hue}, 100%, 60%)`;
        
        const size = isHead ? gridSize * 0.85 : gridSize * 0.7;
        const offset = (gridSize - size) / 2;
        
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = isHead ? 15 : 8;
        
        // Rounded rectangle for segments
        const x = segment.x * gridSize + offset;
        const y = segment.y * gridSize + offset;
        const radius = isHead ? 6 : 4;
        
        ctx.beginPath();
        ctx.roundRect(x, y, size, size, radius);
        ctx.fill();
        
        // Eyes on head
        if (isHead) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#000';
            
            const eyeSize = 3;
            let eye1X, eye1Y, eye2X, eye2Y;
            
            if (direction.x === 1) { // right
                eye1X = x + size * 0.65; eye1Y = y + size * 0.3;
                eye2X = x + size * 0.65; eye2Y = y + size * 0.7;
            } else if (direction.x === -1) { // left
                eye1X = x + size * 0.25; eye1Y = y + size * 0.3;
                eye2X = x + size * 0.25; eye2Y = y + size * 0.7;
            } else if (direction.y === 1) { // down
                eye1X = x + size * 0.3; eye1Y = y + size * 0.65;
                eye2X = x + size * 0.7; eye2Y = y + size * 0.65;
            } else { // up
                eye1X = x + size * 0.3; eye1Y = y + size * 0.25;
                eye2X = x + size * 0.7; eye2Y = y + size * 0.25;
            }
            
            ctx.beginPath();
            ctx.arc(eye1X, eye1Y, eyeSize, 0, Math.PI * 2);
            ctx.arc(eye2X, eye2Y, eyeSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    ctx.shadowBlur = 0;
    
    // HUD
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 22px Orbitron, sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.fillText(`SCORE: ${score}`, 15, 35);
    
    ctx.fillStyle = '#ff00ff';
    ctx.shadowColor = '#ff00ff';
    ctx.font = 'bold 16px Orbitron, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`LENGTH: ${snake.length}`, canvas.width - 15, 35);
    
    ctx.shadowBlur = 0;
}

function gameLoop(timestamp = 0) {
    if (gameState !== 'playing') return;
    
    if (timestamp - lastMoveTime >= gameSpeed) {
        update();
        lastMoveTime = timestamp;
    }
    
    draw();
    
    animationId = requestAnimationFrame(gameLoop);
}

// Start screen animation
let startAnim = 0;
function drawStartScreen() {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    startAnim += 0.02;
    
    // Animated grid
    ctx.strokeStyle = `rgba(0, 255, 255, ${0.05 + Math.sin(startAnim) * 0.02})`;
    ctx.lineWidth = 1;
    for (let i = 0; i <= tileCount; i++) {
        const offset = (i * gridSize + startAnim * 20) % canvas.width;
        ctx.beginPath();
        ctx.moveTo(offset, 0);
        ctx.lineTo(offset, canvas.height);
        ctx.stroke();
    }
    
    // Demo snake (decorative)
    const demoSnake = [];
    const baseY = Math.floor(tileCount * 0.7);
    for (let i = 0; i < 8; i++) {
        demoSnake.push({
            x: (Math.floor(startAnim * 3) + i) % (tileCount + 4) - 2,
            y: baseY + Math.floor(Math.sin(startAnim + i * 0.5) * 2)
        });
    }
    
    demoSnake.forEach((seg, i) => {
        const hue = 180 + (i / demoSnake.length) * 60;
        const size = gridSize * 0.6;
        const x = seg.x * gridSize + (gridSize - size) / 2;
        const y = seg.y * gridSize + (gridSize - size) / 2;
        
        ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
        ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.roundRect(x, y, size, size, 4);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    
    if (gameState === 'start') {
        requestAnimationFrame(drawStartScreen);
    }
}

drawStartScreen();

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
