

function startGame() {
    fireHeld = false;
    pauseScreen.classList.add('hidden');
    clock.getDelta();
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameActive = true;
    clock.getDelta();
}


function pauseGame() {
    fireHeld = false;
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
    beams.forEach(b => scene.remove(b));
    fireballs.forEach(f => scene.remove(f));
    beams = [];
    fireballs = [];

    playerX = 0;
    score = 0;
    dragonHP = 100;
    battleTime = 0;
    spawnTimer = 0;
    fireCooldown = 0;
    moveDir = 0;
    syncDragonHealth();

    scoreSpan.textContent = '0';
    player.position.set(0, -4, 0);
    dragon.position.set(0, 3, 0);

    startGame();
}


function endBattle(won) {
    gameActive = false;
    if (won) {
        endTitle.textContent = "Dragon Defeated!";
        endDesc.textContent = "Manual processes cleared. Growth speed unlocked!";
    } else {
        endTitle.textContent = "Defeated";
        endDesc.textContent = "You got caught in the data silos fire.";
    }
    finalScoreSpan.textContent = score;
    gameOverScreen.classList.remove('hidden');
}
