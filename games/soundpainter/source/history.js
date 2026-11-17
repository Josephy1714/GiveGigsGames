const painterUndo = [];
const painterRedo = [];
const painterCursor = { row:0, col:0, visible:false };

function readPainterBest() {
    try { const value = Number(localStorage.getItem('soundpainter_tilesCount')); return Number.isFinite(value) ? Math.max(0, Math.min(48, Math.floor(value))) : 0; }
    catch { return 0; }
}

function painterSnapshot() { return grid.map(row => [...row]); }

function rememberPainterEdit() {
    painterUndo.push(painterSnapshot());
    if (painterUndo.length > 100) painterUndo.shift();
    painterRedo.length = 0;
}

function restorePainterEdit(redo = false) {
    const from = redo ? painterRedo : painterUndo;
    const to = redo ? painterUndo : painterRedo;
    if (!from.length || !state.isPlaying || state.isPaused) return;
    to.push(painterSnapshot());
    const saved = from.pop();
    grid.forEach((row, r) => saved[r].forEach((value, c) => { row[c] = value; }));
    tileCount = grid.flat().filter(Boolean).length;
    state.score = tileCount;
    document.getElementById('TEMPLATE-4weird-high-score').textContent = tileCount;
    refreshPainterHistory();
    render();
}

function refreshPainterHistory() {
    const undo = document.getElementById('sp-undo');
    const redo = document.getElementById('sp-redo');
    if (undo) undo.disabled = !painterUndo.length;
    if (redo) redo.disabled = !painterRedo.length;
    const status = document.getElementById('sp-edit-status');
    if (status) status.textContent = `${tileCount} / ${GRID_ROWS * GRID_COLS} notes · ${brushRow < 0 ? 'Free paint' : INSTRUMENTS[brushRow].name + ' brush'}`;
}
