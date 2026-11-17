

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
    treasures.forEach(t => scene.remove(t.mesh));
    treasures = [];
    if (activeGrabTarget) scene.remove(activeGrabTarget.mesh);

    grabberState = 'swinging';
    cableLength = 0.5;
    cable.scale.y = cableLength;
    swingAngle = 0;
    swingTime = 0;
    cable.rotation.z = 0;
    claw.rotation.z = 0;
    claw.position.set(0, 3.7, 0);
    activeGrabTarget = null;
    value = 0;
    timeLeft = 30;

    valSpan.textContent = '$0';
    timeSpan.textContent = '30s';

    spawnTreasures();
    startGame();
}


function endGame() {
    gameActive = false;
    finalScoreSpan.textContent = '$' + value;
    gameOverScreen.classList.remove('hidden');
}
