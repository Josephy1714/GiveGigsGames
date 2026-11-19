function update() {
    // Paddle movement — keyboard
    if (keys['ArrowLeft'] || keys['KeyA']) { paddle.x -= paddle.speed; usePointer = false; }
    if (keys['ArrowRight'] || keys['KeyD']) { paddle.x += paddle.speed; usePointer = false; }

    // Pointer (mouse/touch drag) control — only when pointer was used last
    if (usePointer) paddle.x = mouseX - paddle.width / 2;
    
    // Clamp paddle
    paddle.x = Math.max(0, Math.min(canvas.width - paddle.width, paddle.x));
    
    // Update balls
    for (let i = balls.length - 1; i >= 0; i--) {
        const ball = balls[i];
        
        if (ball.stuck) {
            ball.x = paddle.x + paddle.width / 2;
            ball.y = paddle.y - ball.radius;
            continue;
        }
        
        ball.x += ball.dx;
        ball.y += ball.dy;
        
        // Wall collision
        if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= canvas.width) {
            ball.dx = -ball.dx;
            playSound(440, 0.05, 'square', 0.05);
        }
        if (ball.y - ball.radius <= 0) {
            ball.dy = -ball.dy;
            playSound(440, 0.05, 'square', 0.05);
        }
        
        // Paddle collision
        if (ball.y + ball.radius >= paddle.y && 
            ball.y - ball.radius <= paddle.y + paddle.height &&
            ball.x >= paddle.x && ball.x <= paddle.x + paddle.width) {
            
            ball.dy = -Math.abs(ball.dy);
            
            // Angle based on hit position
            const hitPos = (ball.x - paddle.x) / paddle.width;
            ball.dx = (hitPos - 0.5) * 8;
            
            // Speed cap
            const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
            if (speed > 8) {
                ball.dx = (ball.dx / speed) * 8;
                ball.dy = (ball.dy / speed) * 8;
            }
            
            playSound(523, 0.08, 'square', 0.06);
        }
        
        // Ball lost
        if (ball.y - ball.radius > canvas.height) {
            balls.splice(i, 1);
            if (balls.length === 0) {
                lives--;
                if (lives <= 0) {
                    gameOver();
                    return;
                }
                // Respawn ball
                balls.push({
                    x: paddle.x + paddle.width / 2,
                    y: paddle.y - 10,
                    radius: 8,
                    dx: 3,
                    dy: -5,
                    color: '#ff0066',
                    stuck: true
                });
            }
        }
    }
    
    // Brick collision
    balls.forEach(ball => {
        if (ball.stuck) return;
        
        bricks.forEach(brick => {
            if (!brick.alive) return;
            
            if (ball.x + ball.radius > brick.x && 
                ball.x - ball.radius < brick.x + brick.width &&
                ball.y + ball.radius > brick.y && 
                ball.y - ball.radius < brick.y + brick.height) {
                
                // Determine collision side
                const overlapLeft = ball.x + ball.radius - brick.x;
                const overlapRight = brick.x + brick.width - (ball.x - ball.radius);
                const overlapTop = ball.y + ball.radius - brick.y;
                const overlapBottom = brick.y + brick.height - (ball.y - ball.radius);
                
                const minOverlapX = Math.min(overlapLeft, overlapRight);
                const minOverlapY = Math.min(overlapTop, overlapBottom);
                
                if (minOverlapX < minOverlapY) {
                    ball.dx = -ball.dx;
                } else {
                    ball.dy = -ball.dy;
                }
                
                brick.hits--;
                if (brick.hits <= 0) {
                    brick.alive = false;
                    combo++;
                    const mult = Math.min(5, 1 + Math.floor(combo / 3));
                    score += brick.points * mult;
                    if (combo >= 3) {
                        shakeTime = 5;
                        shakeIntensity = Math.min(4, 1 + Math.floor(combo / 4));
                    }
                    spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2);
                    createParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color, 12);
                    playSound(880 + Math.min(combo * 35, 420), 0.1, 'square', 0.08);
                } else {
                    playSound(660, 0.08, 'square', 0.06);
                }
            }
        });
    });
    
    // Update power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const pu = powerUps[i];
        pu.y += pu.dy;
        
        // Paddle collision
        if (pu.y + pu.height >= paddle.y && 
            pu.x + pu.width >= paddle.x && 
            pu.x <= paddle.x + paddle.width) {
            
            applyPowerUp(pu.type);
            powerUps.splice(i, 1);
            playSound(784, 0.15, 'sine', 0.1);
        } else if (pu.y > canvas.height) {
            powerUps.splice(i, 1);
        }
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
    
    // Check level complete
    const aliveBricks = bricks.filter(b => b.alive).length;
    if (aliveBricks === 0) {
        level++;
        createBricks();
        // Reset ball
        balls = [{
            x: paddle.x + paddle.width / 2,
            y: paddle.y - 10,
            radius: 8,
            dx: 3 + level * 0.3,
            dy: -5 - level * 0.3,
            color: '#ff0066',
            stuck: true
        }];
    }
}

function applyPowerUp(type) {
    switch (type) {
        case 'multiball':
            if (balls.length > 0 && !balls[0].stuck) {
                balls.push({ ...balls[0], dx: balls[0].dx + 2, dy: -Math.abs(balls[0].dy) });
                balls.push({ ...balls[0], dx: balls[0].dx - 2, dy: -Math.abs(balls[0].dy) });
            }
            break;
        case 'wide':
            paddle.width = Math.min(paddle.width + 30, 180);
            break;
        case 'laser':
            // Laser power-up - instant score bonus for simplicity
            score += 100;
            break;
        case 'life':
            lives = Math.min(lives + 1, 5);
            break;
        case 'slow':
            balls.forEach(b => {
                b.dx *= 0.7;
                b.dy *= 0.7;
            });
            break;
    }
}

