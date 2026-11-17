

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
    // Re-create items if some were collected
    items.forEach(it => scene.remove(it.mesh));
    items = [];
    collectedCount = 0;
    revenue = 0;
    playerGridPos = { r: 1, c: 1 };
    updatePlayerWorldPosition();

    const itemGeo = new THREE.OctahedronGeometry(0.5);
    const itemMat = new THREE.MeshPhongMaterial({ color: 0xf59e0b, emissive: 0x553300, shininess: 100 });
    const startX = -(gridCols * cellSize) / 2 + cellSize / 2;
    const startZ = -(gridRows * cellSize) / 2 + cellSize / 2;

    for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
            if (mazeGrid[r][c] === 2) {
                const item = new THREE.Mesh(itemGeo, itemMat);
                item.position.set(startX + c * cellSize, 1.0, startZ + r * cellSize);
                scene.add(item);
                items.push({ mesh: item, gridR: r, gridC: c });
            }
        }
    }

    leadsSpan.textContent = '0/5';
    revSpan.textContent = '$0';
    startGame();
}


function winGame() {
    gameActive = false;
    endTitle.textContent = "Temple Cleared!";
    endDesc.textContent = "All lost revenue and missing CRM deals have been recovered.";
    finalRevSpan.textContent = '$' + revenue;
    gameOverScreen.classList.remove('hidden');
}
