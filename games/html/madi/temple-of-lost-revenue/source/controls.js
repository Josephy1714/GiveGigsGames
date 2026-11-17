

function movePlayer(dr, dc) {
    if (!gameActive) return;
    const targetR = playerGridPos.r + dr;
    const targetC = playerGridPos.c + dc;

    // Check boundary & walls
    if (targetR >= 0 && targetR < gridRows && targetC >= 0 && targetC < gridCols) {
        if (mazeGrid[targetR][targetC] !== 1) {
            playerGridPos.r = targetR;
            playerGridPos.c = targetC;

            // Adjust player rotation to face movement direction
            if (dr === 0 && dc > 0) player.rotation.y = 0;
            else if (dr === 0 && dc < 0) player.rotation.y = Math.PI;
            else if (dr > 0 && dc === 0) player.rotation.y = -Math.PI / 2;
            else if (dr < 0 && dc === 0) player.rotation.y = Math.PI / 2;

            updatePlayerWorldPosition();
            checkItemCollection();
        }
    }
}


function onKeyDown(e) {
    if (e.target && e.target.matches && e.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    if (e.repeat && ['Escape', 'KeyP'].includes(e.code)) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.code === 'ArrowUp' || e.code === 'KeyW') movePlayer(-1, 0);
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') movePlayer(1, 0);
    else if (e.code === 'ArrowLeft' || e.code === 'KeyA') movePlayer(0, -1);
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') movePlayer(0, 1);
    else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameActive) pauseGame();
        else resumeGame();
    }
}


function onWindowResize() {
    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
}
