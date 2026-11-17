

function onKeyDown(e) {
    if (e.target && e.target.matches && e.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    if (e.repeat && ['Escape', 'KeyP'].includes(e.code)) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') rotateDir = 1; // Counterclockwise
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') rotateDir = -1; // Clockwise
    else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameActive) pauseGame();
        else resumeGame();
    }
}


function onKeyUp(e) {
    if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && rotateDir === 1) rotateDir = 0;
    if ((e.code === 'ArrowRight' || e.code === 'KeyD') && rotateDir === -1) rotateDir = 0;
}


function onWindowResize() {
    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
}
