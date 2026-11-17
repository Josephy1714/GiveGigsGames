function startGame() {
    if (animationId) cancelAnimationFrame(animationId);
    document.getElementById('TEMPLATE-4weird-pause-screen').classList.add('hidden');
    initAudio();
    gameState = 'playing';
    score = 0;
    snakeTurns.length = 0;
    gameSpeed = 120;
    
    // Reset snake
    snake = [
        { x: 10, y: 15 },
        { x: 9, y: 15 },
        { x: 8, y: 15 }
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    
    particles = [];
    
    spawnFood();
    
    document.getElementById('TEMPLATE-4weird-start-screen').classList.add('hidden');
    document.getElementById('TEMPLATE-4weird-game-over-screen').classList.add('hidden');
    
    lastMoveTime = performance.now();
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
    gameState = 'playing';
    document.getElementById('TEMPLATE-4weird-pause-screen').classList.add('hidden');
    lastMoveTime = performance.now();
    gameLoop();
}

function gameOver() {
    gameState = 'gameOver';
    
    if (score > highScore) {
        highScore = score;
        neonWriteRecord('neonSnakeHighScore', highScore);
        document.getElementById('TEMPLATE-4weird-high-score').textContent = highScore;
    }
    
    document.getElementById('TEMPLATE-4weird-final-score').textContent = score;
    document.getElementById('TEMPLATE-4weird-high-score-final').textContent = highScore;
    document.getElementById('TEMPLATE-4weird-game-over-screen').classList.remove('hidden');
    
    if (animationId) cancelAnimationFrame(animationId);
    
    // Game over particles
    for (let i = 0; i < 30; i++) {
        createParticles(
            snake[0].x * gridSize + gridSize / 2,
            snake[0].y * gridSize + gridSize / 2,
            '#ff0066'
        );
    }
}

function restartGame() {
    startGame();
}

function spawnFood() {
    // Enumerating free tiles avoids spawning food inside a nearly full snake.
    const occupied = new Set(snake.map(segment => `${segment.x},${segment.y}`));
    const free = [];
    for (let y = 0; y < tileCount; y++) {
        for (let x = 0; x < tileCount; x++) {
            if (!occupied.has(`${x},${y}`)) free.push({ x, y });
        }
    }
    if (!free.length) { gameOver(); return; }
    food = free[Math.floor(Math.random() * free.length)];
    
    // Determine food type
    const rand = Math.random();
    let cumulative = 0;
    for (const ft of foodTypes) {
        cumulative += ft.chance;
        if (rand < cumulative) {
            foodType = ft.type;
            break;
        }
    }
}

function isOnSnake(x, y) {
    return snake.some(segment => segment.x === x && segment.y === y);
}

function createParticles(x, y, color, count = 5) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            size: Math.random() * 4 + 2,
            color: color,
            life: 20 + Math.random() * 10
        });
    }
}

