

function startGame() {
    pauseScreen.classList.add('hidden');
    clock.getDelta();
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameActive = true;
    clock.getDelta(); // reset clock
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
    // Clear old elements
    obstacles.forEach(o => scene.remove(o.mesh));
    coins.forEach(c => scene.remove(c));
    obstacles = [];
    coins = [];

    score = 0;
    revenue = 0;
    speedMultiplier = 1.0;
    blueCat.position.y = 0;
    isJumping = false;
    jumpVelocity = 0;

    scoreSpan.textContent = '0';
    revenueSpan.textContent = '$0';

    startGame();
}


function endGame() {
    gameActive = false;
    finalScoreSpan.textContent = Math.floor(score);
    finalRevSpan.textContent = '$' + revenue;
    gameOverScreen.classList.remove('hidden');
}
