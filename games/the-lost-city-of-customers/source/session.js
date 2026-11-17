

function startGame() {
    pauseScreen.classList.add('hidden');
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
    pauseScreen.classList.add('hidden');
    gameActive = true;
}


function resetGame() {
    targets.forEach(t => scene.remove(t.mesh));
    targets = [];
    if (scanWave) {
        scene.remove(scanWave);
        scanWave = null;
    }
    foundCount = 0;
    totalScans = 0;

    foundSpan.textContent = '0/5';
    scanSpan.textContent = '0';

    placeHiddenTargets();
    startGame();
}


function endGame() {
    gameActive = false;
    gameOverScreen.classList.remove('hidden');
}
