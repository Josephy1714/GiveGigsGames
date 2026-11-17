// A compact overview keeps the route and remaining objectives visible while
// the main camera follows the cat through the maze.
let templeMapCanvas;
function drawTempleMap() {
    if (!gameActive) {
        if (templeMapCanvas) templeMapCanvas.hidden = true;
        return;
    }
    if (!templeMapCanvas) {
        templeMapCanvas = document.createElement('canvas');
        templeMapCanvas.width = 154;
        templeMapCanvas.height = 174;
        templeMapCanvas.setAttribute('role', 'img');
        templeMapCanvas.setAttribute('aria-label', 'Maze map: cyan is your position; gold marks remaining leads.');
        Object.assign(templeMapCanvas.style, {
            position: 'absolute', right: '12px', top: '72px', zIndex: '8',
            width: 'clamp(88px, 19vw, 154px)', height: 'auto', pointerEvents: 'none',
            border: '1px solid #977443', borderRadius: '8px', background: '#100e17e8'
        });
        renderer.domElement.parentElement.appendChild(templeMapCanvas);
    }
    templeMapCanvas.hidden = false;
    const map = templeMapCanvas.getContext('2d');
    map.clearRect(0, 0, 154, 174);
    map.fillStyle = '#100e17';
    map.fillRect(0, 0, 154, 174);
    const tile = 12;
    for (let r = 0; r < gridRows; r++) for (let c = 0; c < gridCols; c++) {
        map.fillStyle = mazeGrid[r][c] === 1 ? '#6c5140' : '#211b27';
        map.fillRect(11 + c * tile, 11 + r * tile, tile - 1, tile - 1);
    }
    map.fillStyle = '#ffc857';
    for (const item of items) map.fillRect(14 + item.gridC * tile, 14 + item.gridR * tile, 5, 5);
    map.fillStyle = '#67e8f9';
    map.fillRect(13 + playerGridPos.c * tile, 13 + playerGridPos.r * tile, 7, 7);
    map.font = '10px system-ui';
    map.textAlign = 'center';
    map.fillText('YOU', 43, 160);
    map.fillStyle = '#ffc857';
    map.fillText('LEADS', 106, 160);
}
