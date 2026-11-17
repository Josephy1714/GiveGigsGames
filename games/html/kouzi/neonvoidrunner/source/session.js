function startGame() {
    neonClock.reset();
    if (animationId) cancelAnimationFrame(animationId);
    document.getElementById('TEMPLATE-4weird-pause-screen').classList.add('hidden');
    initAudio();
    gameState = 'playing';
    distance = 0;
    speed = 4;
    
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - 120;
    player.shield = false;
    
    obstacles = [];
    collectibles = [];
    particles = [];
    obstacleTimer = 0;
    collectibleTimer = 0;
    
    document.getElementById('TEMPLATE-4weird-start-screen').classList.add('hidden');
    document.getElementById('TEMPLATE-4weird-game-over-screen').classList.add('hidden');
    
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
    
    if (distance > highScore) {
        highScore = Math.floor(distance);
        neonWriteRecord('neonVoidRunnerHighScore', highScore);
        document.getElementById('TEMPLATE-4weird-high-score').textContent = highScore + 'm';
    }
    
    document.getElementById('TEMPLATE-4weird-final-score').textContent = Math.floor(distance);
    document.getElementById('TEMPLATE-4weird-high-score-final').textContent = highScore;
    document.getElementById('TEMPLATE-4weird-game-over-screen').classList.remove('hidden');
    
    if (animationId) cancelAnimationFrame(animationId);
}

function restartGame() {
    startGame();
}

function spawnObstacle() {
    const lane = Math.floor(Math.random() * laneCount);
    const types = ['block', 'spike', 'barrier'];
    const type = types[Math.floor(Math.random() * types.length)];
    const colors = ['#ff0066', '#ff00ff', '#ff6600'];
    
    obstacles.push({
        x: lane * laneWidth + laneWidth / 2 - 25,
        y: -60,
        width: 50,
        height: 50,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: type
    });
}

function spawnCollectible() {
    const lane = Math.floor(Math.random() * laneCount);
    const types = ['coin', 'shield', 'slowmo'];
    const type = types[Math.floor(Math.random() * types.length)];
    const colors = { coin: '#ffff00', shield: '#00ff66', slowmo: '#00ffff' };
    
    collectibles.push({
        x: lane * laneWidth + laneWidth / 2 - 15,
        y: -30,
        width: 30,
        height: 30,
        type: type,
        color: colors[type],
        rotation: 0
    });
}

function createParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
        const vel = Math.random() * 4 + 2;
        particles.push({
            x: x, y: y,
            vx: Math.cos(angle) * vel,
            vy: Math.sin(angle) * vel,
            size: Math.random() * 4 + 2,
            color: color,
            life: 25 + Math.random() * 10
        });
    }
}

function checkCollision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

