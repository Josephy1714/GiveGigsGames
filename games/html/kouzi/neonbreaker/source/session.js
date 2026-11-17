function startGame() {
    neonClock.reset();
    if (animationId) cancelAnimationFrame(animationId);
    document.getElementById('TEMPLATE-4weird-pause-screen').classList.add('hidden');
    initAudio();
    gameState = 'playing';
    score = 0;
    level = 1;
    lives = 3;
    
    document.getElementById('TEMPLATE-4weird-start-screen').classList.add('hidden');
    document.getElementById('TEMPLATE-4weird-game-over-screen').classList.add('hidden');
    
    resetGame();
    gameLoop();
}

function pauseGame() {
    if (gameState !== 'playing') return;
    gameState = 'paused';
    document.getElementById('TEMPLATE-4weird-pause-screen').classList.remove('hidden');
    if (animationId) cancelAnimationFrame(animationId);
}

function resumeGame() {
    if (gameState !== 'paused') return;
    neonClock.reset();
    gameState = 'playing';
    document.getElementById('TEMPLATE-4weird-pause-screen').classList.add('hidden');
    gameLoop();
}

function gameOver() {
    gameState = 'gameOver';
    
    if (score > highScore) {
        highScore = score;
        neonWriteRecord('neonBreakerHighScore', highScore);
        document.getElementById('TEMPLATE-4weird-high-score').textContent = highScore;
    }
    
    document.getElementById('TEMPLATE-4weird-final-score').textContent = score;
    document.getElementById('TEMPLATE-4weird-final-level').textContent = level;
    document.getElementById('TEMPLATE-4weird-game-over-screen').classList.remove('hidden');
    
    if (animationId) cancelAnimationFrame(animationId);
}

function restartGame() {
    startGame();
}

function resetGame() {
    paddle.x = canvas.width / 2 - paddle.width / 2;
    paddle.width = 100;
    balls = [{
        x: paddle.x + paddle.width / 2,
        y: paddle.y - 10,
        radius: 8,
        dx: 3,
        dy: -5,
        color: '#ff0066',
        stuck: true
    }];
    powerUps = [];
    particles = [];
    createBricks();
}

function createBricks() {
    bricks = [];
    const colors = ['#ff0066', '#ff00ff', '#00ffff', '#00ff66', '#ffff00'];
    const points = [50, 40, 30, 20, 10];
    
    for (let row = 0; row < brickRowCount; row++) {
        for (let col = 0; col < brickColCount; col++) {
            const hits = row < 2 ? 2 : 1;
            bricks.push({
                x: col * (brickWidth + brickPadding) + brickOffsetLeft,
                y: row * (brickHeight + brickPadding) + brickOffsetTop,
                width: brickWidth,
                height: brickHeight,
                color: colors[row % colors.length],
                hits: hits,
                maxHits: hits,
                points: points[row % points.length],
                alive: true
            });
        }
    }
}

function spawnPowerUp(x, y) {
    if (Math.random() < 0.2) {
        const types = ['multiball', 'wide', 'laser', 'life', 'slow'];
        const type = types[Math.floor(Math.random() * types.length)];
        const colors = { multiball: '#00ffff', wide: '#00ff66', laser: '#ff0066', life: '#ff6600', slow: '#ffff00' };
        
        powerUps.push({
            x: x, y: y, width: 20, height: 15,
            type: type, color: colors[type],
            dy: 2
        });
    }
}

function createParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            size: Math.random() * 4 + 2,
            color: color,
            life: 30
        });
    }
}

