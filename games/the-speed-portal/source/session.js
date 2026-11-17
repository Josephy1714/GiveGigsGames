

function startGame() {
    pauseScreen.classList.add('hidden');
    clock.getDelta();
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameActive = true;
    clock.getDelta();
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
    obstacles.forEach(o => scene.remove(o.mesh));
    items.forEach(it => scene.remove(it.mesh));
    obstacles = [];
    items = [];
    playerAngle = 0;
    distance = 0;
    boosts = 0;
    speed = 25.0;

    distSpan.textContent = '0m';
    boostsSpan.textContent = '0';
    updatePlayerPosition();
    startGame();
}


function endGame() {
    gameActive = false;
    finalDistSpan.textContent = Math.floor(distance) + 'm';
    gameOverScreen.classList.remove('hidden');
}
