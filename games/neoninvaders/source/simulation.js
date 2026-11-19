function update() {
    // Player movement
    if (keys['ArrowLeft'] || keys['KeyA']) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
        player.x += player.speed;
    }
    if (keys['ArrowUp'] || keys['KeyW']) {
        player.y -= player.speed;
    }
    if (keys['ArrowDown'] || keys['KeyS']) {
        player.y += player.speed;
    }
    
    // Clamp player
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(canvas.height / 2, Math.min(canvas.height - player.height - 10, player.y));
    
    // Shooting (keyboard + touch FIRE hold + touch AUTO while dragging)
    const cooldown = player.rapidFire ? 5 : baseBulletCooldown;
    if ((keys['Space'] || fireHeld || (autoFire && isTouching)) && bulletCooldown <= 0) {
        if (player.tripleShot) {
            bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, vy: -8, vx: -2, color: '#00ffff' });
            bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, vy: -8, vx: 0, color: '#00ffff' });
            bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, vy: -8, vx: 2, color: '#00ffff' });
        } else {
            bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, vy: -8, vx: 0, color: '#00ffff' });
        }
        bulletCooldown = cooldown;
        playShootSound();
    }
    bulletCooldown--;
    
    // Update bullets
    bullets = bullets.filter(bullet => {
        bullet.y += bullet.vy;
        bullet.x += bullet.vx || 0;
        return bullet.y > -10 && bullet.y < canvas.height + 10 && bullet.x > -10 && bullet.x < canvas.width + 10;
    });
    
    // Update power-ups
    powerUps = powerUps.filter(powerUp => {
        powerUp.y += powerUp.speed;
        
        // Check collision with player
        if (checkCollision(player, powerUp)) {
            applyPowerUp(powerUp.type);
            playPowerUpSound();
            return false;
        }
        
        return powerUp.y < canvas.height + 20;
    });
    
    // Update enemies
    let moveDown = false;
    let leftMost = canvas.width;
    let rightMost = 0;
    
    enemies.forEach(enemy => {
        if (enemy.x < leftMost) leftMost = enemy.x;
        if (enemy.x + enemy.width > rightMost) rightMost = enemy.x + enemy.width;
    });
    
    if (rightMost >= canvas.width - 20 && enemyDirection > 0) {
        moveDown = true;
        enemyDirection = -1;
    }
    if (leftMost <= 20 && enemyDirection < 0) {
        moveDown = true;
        enemyDirection = 1;
    }
    
    enemies.forEach(enemy => {
        enemy.x += enemySpeed * enemyDirection;
        if (moveDown) {
            enemy.y += 20;
        }
        
        // Zigzag movement for zigzag type
        if (enemy.type === 'zigzag') {
            enemy.moveTimer++;
            enemy.x += Math.sin(enemy.moveTimer * 0.05) * 1.5;
        }
        
        // Enemy shooting
        enemy.shootTimer--;
        if (enemy.shootTimer <= 0 && Math.random() < 0.3) {
            bullets.push({
                x: enemy.x + enemy.width / 2 - 2,
                y: enemy.y + enemy.height,
                vy: 4 + wave * 0.3,
                vx: 0,
                color: enemy.color,
                isEnemy: true
            });
            enemy.shootTimer = Math.random() * 180 + 120;
        }
        
        // Check if enemy reached bottom
        if (enemy.y + enemy.height >= canvas.height - 20) {
            gameOver();
            return;
        }
    });
    
    // Bullet-enemy collisions
    bullets = bullets.filter(bullet => {
        if (bullet.isEnemy) return true;
        
        for (let i = enemies.length - 1; i >= 0; i--) {
            if (checkCollision(
                { x: bullet.x - 2, y: bullet.y, width: 4, height: 8 },
                enemies[i]
            )) {
                enemies[i].hp--;
                playExplosionSound();
                createExplosion(bullet.x, bullet.y, enemies[i].color);
                
                if (enemies[i].hp <= 0) {
                    score += enemies[i].points;
                    spawnPowerUp(enemies[i].x + enemies[i].width / 2, enemies[i].y + enemies[i].height / 2);
                    enemies.splice(i, 1);
                }
                return false;
            }
        }
        return true;
    });
    
    // Enemy bullets - player collision
    bullets = bullets.filter(bullet => {
        if (!bullet.isEnemy) return true;
        
        if (checkCollision(
            { x: bullet.x - 2, y: bullet.y, width: 4, height: 8 },
            player
        )) {
            if (player.hasShield) {
                player.hasShield = false;
                playExplosionSound();
                createExplosion(bullet.x, bullet.y, '#00ff00');
            } else {
                lives--;
                shakeTime = 14;
                playExplosionSound();
                createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#ff0066');
                
                if (lives <= 0) {
                    gameOver();
                }
            }
            return false;
        }
        return true;
    });
    
    // Player - enemy collision
    enemies.forEach(enemy => {
        if (checkCollision(player, enemy)) {
            if (player.hasShield) {
                player.hasShield = false;
            } else {
                lives--;
                shakeTime = 14;
            }
            playExplosionSound();
            createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color);
            
            // Remove enemy on collision
            const idx = enemies.indexOf(enemy);
            if (idx > -1) enemies.splice(idx, 1);
            
            if (lives <= 0) {
                gameOver();
            }
        }
    });
    
    // Check wave complete
    if (enemies.length === 0 && gameState === 'playing') {
        wave++;
        spawnWave();
    }
    
    // Update particles
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.size *= 0.95;
        return p.life > 0;
    });
    
    // Update stars
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
    
    // Update power-up timers
    if (player.tripleShot) {
        player.tripleShotTimer--;
        if (player.tripleShotTimer <= 0) player.tripleShot = false;
    }
    if (player.hasShield) {
        player.shieldTimer--;
        if (player.shieldTimer <= 0) player.hasShield = false;
    }
    if (player.rapidFire) {
        player.rapidFireTimer--;
        if (player.rapidFireTimer <= 0) player.rapidFire = false;
    }
}

function checkCollision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

function applyPowerUp(type) {
    switch (type) {
        case 'triple':
            player.tripleShot = true;
            player.tripleShotTimer = 600;
            break;
        case 'shield':
            player.hasShield = true;
            player.shieldTimer = 600;
            break;
        case 'life':
            lives = Math.min(lives + 1, 5);
            break;
        case 'rapid':
            player.rapidFire = true;
            player.rapidFireTimer = 480;
            break;
    }
}

