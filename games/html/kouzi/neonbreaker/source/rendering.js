function draw() {
    // Clear
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Stars
    stars.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });
    
    // Bricks
    bricks.forEach(brick => {
        if (!brick.alive) return;
        
        const alpha = brick.hits / brick.maxHits;
        ctx.fillStyle = brick.color;
        ctx.globalAlpha = 0.5 + alpha * 0.5;
        ctx.shadowColor = brick.color;
        ctx.shadowBlur = 10;
        
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    });
    
    // Paddle
    ctx.fillStyle = paddle.color;
    ctx.shadowColor = paddle.color;
    ctx.shadowBlur = 15;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.shadowBlur = 0;
    
    // Balls
    balls.forEach(ball => {
        ctx.fillStyle = ball.color;
        ctx.shadowColor = ball.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    });
    
    // Power-ups
    powerUps.forEach(pu => {
        ctx.fillStyle = pu.color;
        ctx.shadowColor = pu.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(pu.x - pu.width / 2, pu.y, pu.width, pu.height);
        ctx.shadowBlur = 0;
        
        // Icon
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        const icons = { multiball: '3B', wide: 'W', laser: 'L', life: '+', slow: 'S' };
        ctx.fillText(icons[pu.type] || '?', pu.x, pu.y + 11);
    });
    
    // HUD
    ctx.fillStyle = '#00ffff';
    ctx.font = '16px Orbitron, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 15, 25);
    
    ctx.fillStyle = '#ff0066';
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL: ${level}`, canvas.width / 2, 25);
    
    ctx.fillStyle = '#00ff66';
    ctx.textAlign = 'right';
    ctx.fillText(`LIVES: ${lives}`, canvas.width - 15, 25);
}

function gameLoop(timestamp = performance.now()) {
    if (gameState !== 'playing') return;
    
    neonClock.advance(timestamp, update, () => gameState === 'playing');
    draw();
    
    if (gameState === 'playing') animationId = requestAnimationFrame(gameLoop);
}

// Draw start screen background
function drawStartScreen() {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    stars.forEach(star => {
        star.y += star.speed * 0.3;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    if (gameState === 'start') {
        requestAnimationFrame(drawStartScreen);
    }
}

drawStartScreen();

// ===== Mobile Touch Controls — paddle drag (mobile unique) =====
function setPaddleFromClientX(clientX) {
    usePointer = true;
    const rect = canvas.getBoundingClientRect();
    mouseX = (clientX - rect.left) * (canvas.width / rect.width);
    // Apply immediately so drag feels 1:1 even between frames
    paddle.x = Math.max(0, Math.min(canvas.width - paddle.width, mouseX - paddle.width / 2));
}
function launchStuckBall() {
    const stuck = balls.find(b => b.stuck);
    if (stuck) { stuck.stuck = false; stuck.dy = -5; }
}
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    initAudio();
    const touch = e.touches[0];
    setPaddleFromClientX(touch.clientX);

    // Tap to start / launch ball / restart
    if (gameState === 'start') {
        startGame();
    } else if (gameState === 'gameOver') {
        restartGame();
    } else if (gameState === 'playing') {
        launchStuckBall();
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    setPaddleFromClientX(touch.clientX);
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (gameState === 'playing') launchStuckBall();
}, { passive: false });
(function () {
    const frame = document.querySelector('.TEMPLATE-4weird-game-frame');
    if (frame) frame.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
})();

window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SET_GAME_SPEED') {
        const speed = parseFloat(event.data.speed);
        if (!isNaN(speed) && speed > 0) {
            window.speedMultiplier = speed;
        }
    }
    if (event.data && event.data.type === 'SET_MUTED') {
        setMuted(!!event.data.muted);
    }
});

// ===== In-game fullscreen overlay (shell also provides global FS) =====
