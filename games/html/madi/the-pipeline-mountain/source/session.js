

function startGame() {
    pauseScreen.classList.add('hidden');
    clock.getDelta();
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameActive = true;
}


function pauseGame() {
    if (!gameActive) return;
    gameActive = false;
    pauseScreen.classList.remove('hidden');
}


function resumeGame() {
    if (pauseScreen.classList.contains('hidden')) return;
    clock.getDelta();
    pauseScreen.classList.add('hidden');
    gameActive = true;
}


function resetGame() {
    // Clear old assets
    platforms.forEach(p => scene.remove(p.mesh));
    items.forEach(it => scene.remove(it));
    platforms = [];
    items = [];

    playerX = 0;
    playerY = 0;
    velocityY = jumpForce;
    moveDirection = 0;
    player.position.set(0, 0, 0);
    camera.position.y = 2;
    altitude = 0;
    medals = 0;

    altSpan.textContent = '0m';
    medalsSpan.textContent = '0';

    generatePlatforms(0, 30);
    startGame();
}


function endGame() {
    gameActive = false;
    finalAltSpan.textContent = Math.floor(altitude) + 'm';
    gameOverScreen.classList.remove('hidden');
}
