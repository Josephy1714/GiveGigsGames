

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
    pipes.forEach(p => scene.remove(p));
    pipes = [];
    outerNodes.forEach(o => {
        o.connected = false;
        o.mesh.material.color.setHex(0x3b82f6);
        o.mesh.material.emissive.setHex(0x1e3a8a);
    });
    connectedCount = 0;

    routesSpan.textContent = '0/4';
    syncSpan.textContent = '0%';

    startGame();
}


function endGame() {
    gameActive = false;
    gameOverScreen.classList.remove('hidden');
}
