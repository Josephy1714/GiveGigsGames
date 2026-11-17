function startGame() {
    neonClock.reset();
    if (animationId) cancelAnimationFrame(animationId);
    document.getElementById('TEMPLATE-4weird-pause-screen').classList.add('hidden');
    initAudio();
    gameState = 'playing';
    distance = 0;
    coins = 0;
    speed = 3;
    
    player.lane = 1;
    player.x = laneWidth * 1 + laneWidth / 2 - player.width / 2;
    player.targetX = player.x;
    
    enemies = [];
    coinItems = [];
    powerUps = [];
    particles = [];
    
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
        neonWriteRecord('neonRacerHighScore', highScore);
        document.getElementById('TEMPLATE-4weird-high-score').textContent = highScore + 'm';
    }
    
    document.getElementById('TEMPLATE-4weird-final-score').textContent = Math.floor(distance);
    document.getElementById('TEMPLATE-4weird-final-coins').textContent = coins;
    document.getElementById('TEMPLATE-4weird-game-over-screen').classList.remove('hidden');
    
    if (animationId) cancelAnimationFrame(animationId);
}

function restartGame() {
    startGame();
}

function spawnEnemy() {
    const lane = Math.floor(Math.random() * laneCount);
    const colors = ['#ff0066', '#ff00ff', '#ffff00', '#ff6600'];
    
    enemies.push({
        lane: lane,
        x: laneWidth * lane + laneWidth / 2 - 20,
        y: -80,
        width: 40,
        height: 70,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: speed * (0.7 + Math.random() * 0.4)
    });
}

function spawnCoin() {
    const lane = Math.floor(Math.random() * laneCount);
    coinItems.push({
        lane: lane,
        x: laneWidth * lane + laneWidth / 2,
        y: -20,
        radius: 12,
        rotation: 0
    });
}

function spawnPowerUp() {
    const lane = Math.floor(Math.random() * laneCount);
    const types = ['speed', 'slow', 'shield', 'magnet'];
    const type = types[Math.floor(Math.random() * types.length)];
    const colors = { speed: '#00ff66', slow: '#00ffff', shield: '#ffff00', magnet: '#ff00ff' };
    
    powerUps.push({
        lane: lane,
        x: laneWidth * lane + laneWidth / 2 - 15,
        y: -30,
        width: 30,
        height: 30,
        type: type,
        color: colors[type]
    });
}

function createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            size: Math.random() * 4 + 2,
            color: color,
            life: 25
        });
    }
}

function checkCollision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

