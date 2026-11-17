function update() {
    // Smooth player movement
    player.x += (player.targetX - player.x) * 0.2;
    // Touch gas/brake holds (mobile buttons)
    if (gasHeld) speed = Math.min(speed + 0.08, 10);
    if (brakeHeld) speed = Math.max(speed - 0.08, 2);
    
    // Road lines
    roadLines.forEach(line => {
        line.y += speed * 2;
        if (line.y > canvas.height) {
            line.y = -40;
        }
    });
    
    // Distance
    distance += speed * 0.1;
    
    // Speed increase over time
    speed += 0.001;
    
    // Spawn enemies
    enemySpawnTimer++;
    const spawnRate = Math.max(40, 100 - distance * 0.05);
    if (enemySpawnTimer >= spawnRate) {
        spawnEnemy();
        enemySpawnTimer = 0;
    }
    
    // Spawn coins
    coinSpawnTimer++;
    if (coinSpawnTimer >= 80) {
        spawnCoin();
        coinSpawnTimer = 0;
    }
    
    // Spawn power-ups occasionally
    if (Math.random() < 0.003) {
        spawnPowerUp();
    }
    
    // Update enemies
    enemies = enemies.filter(enemy => {
        enemy.y += speed * 2;
        return enemy.y < canvas.height + 100;
    });
    
    // Update coins
    coinItems = coinItems.filter(coin => {
        coin.y += speed * 2;
        coin.rotation += 0.1;
        return coin.y < canvas.height + 50;
    });
    
    // Update power-ups
    powerUps = powerUps.filter(pu => {
        pu.y += speed * 2;
        return pu.y < canvas.height + 50;
    });
    
    // Update particles
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.size *= 0.95;
        return p.life > 0;
    });
    
    // Collision - enemies
    for (const enemy of enemies) {
        if (checkCollision(player, enemy)) {
            playSound(150, 0.3, 'sawtooth', 0.1);
            createParticles(player.x + player.width / 2, player.y + player.height / 2, '#ff0066', 20);
            gameOver();
            return;
        }
    }
    
    // Collision - coins
    coinItems = coinItems.filter(coin => {
        const dx = (player.x + player.width / 2) - coin.x;
        const dy = (player.y + player.height / 2) - coin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 30) {
            coins++;
            playSound(880, 0.08, 'sine', 0.08);
            createParticles(coin.x, coin.y, '#ffff00', 6);
            return false;
        }
        return true;
    });
    
    // Collision - power-ups
    powerUps = powerUps.filter(pu => {
        if (checkCollision(player, pu)) {
            applyPowerUp(pu.type);
            playSound(660, 0.15, 'sine', 0.1);
            createParticles(pu.x + pu.width / 2, pu.y + pu.height / 2, pu.color, 10);
            return false;
        }
        return true;
    });
}

function applyPowerUp(type) {
    switch (type) {
        case 'speed':
            speed = Math.min(speed + 2, 10);
            break;
        case 'slow':
            speed = Math.max(speed - 1.5, 2);
            break;
        case 'shield':
            // Shield - give bonus points
            distance += 100;
            break;
        case 'magnet':
            // Magnet - give bonus coins
            coins += 5;
            break;
    }
}

function drawCar(x, y, width, height, color, isPlayer = false) {
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = isPlayer ? 20 : 10;
    
    // Car body
    ctx.fillRect(x, y, width, height);
    
    // Windshield
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 0;
    ctx.fillRect(x + 5, y + 10, width - 10, 20);
    
    // Headlights
    if (isPlayer) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(x + 8, y + 5, 4, 0, Math.PI * 2);
        ctx.arc(x + width - 8, y + 5, 4, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x + 8, y + height - 5, 4, 0, Math.PI * 2);
        ctx.arc(x + width - 8, y + height - 5, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.shadowBlur = 0;
}

