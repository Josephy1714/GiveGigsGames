function update() {
    // Update distance and speed
    distance += speed * 0.1;
    speed = 4 + distance * 0.002; // Gradually increase speed
    
    // Background scrolling
    bgOffset += speed * 0.5;
    gridOffset += speed * 2;
    if (gridOffset > 100) gridOffset = 0;
    
    // Player input (smooth movement with keyboard hold)
    if (keys['ArrowLeft'] || keys['KeyA']) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
        player.x += player.speed;
    }
    if (keys['ArrowUp'] || keys['KeyW']) {
        speed = Math.min(speed + 0.1, 12);
    }
    if (keys['ArrowDown'] || keys['KeyS']) {
        speed = Math.max(speed - 0.2, 2);
    }
    
    // Clamp player position
    player.x = Math.max(10, Math.min(canvas.width - player.width - 10, player.x));
    
    // Shield timer
    if (player.shield) {
        player.shieldTimer--;
        if (player.shieldTimer <= 0) player.shield = false;
    }
    
    // Spawn obstacles
    obstacleTimer++;
    const spawnRate = Math.max(30, 80 - distance * 0.05);
    if (obstacleTimer >= spawnRate) {
        spawnObstacle();
        obstacleTimer = 0;
    }
    
    // Spawn collectibles
    collectibleTimer++;
    if (collectibleTimer >= 120) {
        spawnCollectible();
        collectibleTimer = 0;
    }
    
    // Update obstacles
    obstacles = obstacles.filter(obs => {
        obs.y += speed * 2;
        return obs.y < canvas.height + 100;
    });
    
    // Update collectibles
    collectibles = collectibles.filter(col => {
        col.y += speed * 2;
        col.rotation += 0.05;
        return col.y < canvas.height + 50;
    });
    
    // Update particles
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // gravity
        p.life--;
        p.size *= 0.96;
        return p.life > 0;
    });
    
    // Check obstacle collisions
    for (const obs of obstacles) {
        if (checkCollision(player, obs)) {
            if (player.shield) {
                player.shield = false;
                createParticles(obs.x + obs.width / 2, obs.y + obs.height / 2, '#00ff66', 15);
                const idx = obstacles.indexOf(obs);
                if (idx > -1) obstacles.splice(idx, 1);
                playSound(220, 0.2, 'sawtooth', 0.1);
            } else {
                createParticles(player.x + player.width / 2, player.y + player.height / 2, '#ff0066', 25);
                playSound(100, 0.5, 'sawtooth', 0.15);
                gameOver();
                return;
            }
        }
    }
    
    // Check collectible collisions
    collectibles = collectibles.filter(col => {
        if (checkCollision(player, col)) {
            createParticles(col.x + col.width / 2, col.y + col.height / 2, col.color, 8);
            
            switch (col.type) {
                case 'coin':
                    distance += 50; // Bonus distance
                    playSound(880, 0.1, 'sine', 0.08);
                    break;
                case 'shield':
                    player.shield = true;
                    player.shieldTimer = 300; // 5 seconds
                    playSound(660, 0.15, 'sine', 0.1);
                    break;
                case 'slowmo':
                    speed = Math.max(speed * 0.5, 2);
                    playSound(440, 0.2, 'sine', 0.08);
                    break;
            }
            return false;
        }
        return true;
    });
    
    // Engine trail particles
    if (Math.random() < 0.4) {
        particles.push({
            x: player.x + player.width / 2 + (Math.random() - 0.5) * 10,
            y: player.y + player.height,
            vx: (Math.random() - 0.5) * 1,
            vy: Math.random() * 3 + 2,
            size: Math.random() * 3 + 2,
            color: '#ff6600',
            life: 15 + Math.random() * 10
        });
    }
}

