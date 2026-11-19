function update() {
    nextDirection = snakeTurns.shift() || direction;
    direction = { ...nextDirection };
    
    // Move snake
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    
    // Wall collision
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        playSound(100, 0.3, 'sawtooth', 0.15);
        gameOver();
        return;
    }
    
    // Self collision
    const eating = head.x === food.x && head.y === food.y;
    // The tail vacates its tile on this turn unless the snake is growing.
    const body = eating ? snake : snake.slice(0, -1);
    if (body.some(segment => segment.x === head.x && segment.y === head.y)) {
        playSound(100, 0.3, 'sawtooth', 0.15);
        gameOver();
        return;
    }
    
    // Add new head
    snake.unshift(head);
    
    // Food collision
    if (head.x === food.x && head.y === food.y) {
        // Find food type and points
        const ft = foodTypes.find(f => f.type === foodType) || foodTypes[0];
        score += ft.points;
        
        // Effects
        const fx = food.x * gridSize + gridSize / 2;
        const fy = food.y * gridSize + gridSize / 2;
        createParticles(fx, fy, ft.color, 12);
        if (snake.length % 5 === 0) {
            score += 25;
            createParticles(fx, fy, '#00ffff', 18);
            playSound(880, 0.14, 'triangle', 0.12);
        } else {
            playSound(660 + ft.points * 5, 0.1, 'sine', 0.1);
        }
        
        // Speed up slightly
        if (foodType === 'speed') {
            gameSpeed = Math.max(50, gameSpeed - 15);
        } else if (foodType === 'slow') {
            gameSpeed = Math.min(200, gameSpeed + 20);
        } else {
            gameSpeed = Math.max(60, gameSpeed - 2);
        }
        
        spawnFood();
    } else {
        // Remove tail if no food eaten
        snake.pop();
    }
    
    // Update particles
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.size *= 0.95;
        return p.life > 0;
    });
    
    // Food pulse animation
    foodPulse += 0.15;
}

