

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
    stalactites.forEach(s => scene.remove(s.mesh));
    stalactites = [];

    beamAngle = 0;
    emitter.rotation.z = 0;

    setupStalactites();
    leftSpan.textContent = '3';
    progressSpan.textContent = '0%';

    startGame();
}


function endGame() {
    gameActive = false;
    gameOverScreen.classList.remove('hidden');
}
