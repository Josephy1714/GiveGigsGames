function startGame() {
    neonClock.reset();
    if (animationId) cancelAnimationFrame(animationId);
    document.getElementById('TEMPLATE-4weird-pause-screen').classList.add('hidden');
    initAudio();
    gameState = 'playing';
    score = 0;
    wave = 1;
    lives = 3;
    
    document.getElementById('TEMPLATE-4weird-start-screen').classList.add('hidden');
    document.getElementById('TEMPLATE-4weird-game-over-screen').classList.add('hidden');
    
    resetPlayer();
    spawnWave();
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
        neonWriteRecord('neonInvadersHighScore', highScore);
        document.getElementById('TEMPLATE-4weird-high-score').textContent = highScore;
    }
    
    document.getElementById('TEMPLATE-4weird-final-score').textContent = score;
    document.getElementById('TEMPLATE-4weird-final-wave').textContent = wave;
    document.getElementById('TEMPLATE-4weird-game-over-screen').classList.remove('hidden');
    
    if (animationId) cancelAnimationFrame(animationId);
}

function restartGame() {
    startGame();
}

function resetPlayer() {
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - 60;
    player.hasShield = false;
    player.tripleShot = false;
    player.rapidFire = false;
}

function spawnWave() {
    enemies = [];
    const startX = 50;
    const startY = 50;
    const spacingX = 80;
    const spacingY = 50;
    
    const colors = ['#ff0066', '#ff00ff', '#00ff66', '#ffff00'];
    const types = ['basic', 'zigzag', 'tank', 'speedy'];
    
    for (let row = 0; row < enemyRows; row++) {
        for (let col = 0; col < enemyCols; col++) {
            const type = row === 0 ? 'tank' : (row === 1 ? 'zigzag' : 'basic');
            const hp = row === 0 ? 3 : (row === 1 ? 2 : 1);
            
            enemies.push({
                x: startX + col * spacingX,
                y: startY + row * spacingY,
                width: 40,
                height: 30,
                color: colors[row % colors.length],
                type: type,
                hp: hp,
                maxHp: hp,
                points: hp * 10,
                moveTimer: 0,
                shootTimer: Math.random() * 120 + 60
            });
        }
    }
    
    enemySpeed = 1 + wave * 0.2;
    enemyDirection = 1;
}

function spawnPowerUp(x, y) {
    if (Math.random() < 0.15) {
        const types = ['triple', 'shield', 'life', 'rapid'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        const colors = {
            triple: '#00ffff',
            shield: '#00ff00',
            life: '#ff0066',
            rapid: '#ffff00'
        };
        
        powerUps.push({
            x: x,
            y: y,
            width: 20,
            height: 20,
            type: type,
            color: colors[type],
            speed: 2
        });
    }
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
        const angle = (Math.PI * 2 / 15) * i;
        const speed = Math.random() * 4 + 2;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 3 + 2,
            color: color,
            life: 30
        });
    }
}

