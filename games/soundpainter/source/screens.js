function initPainterScreens() {
    const frame = canvas.parentElement;
    frame.classList.add('bounded-painter');
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label', 'Music grid. Arrow keys move. Enter or Space toggles a note. Control Z undoes.');
    canvas.addEventListener('focus', () => { painterCursor.visible = true; render(); });
    canvas.addEventListener('blur', () => { painterCursor.visible = false; render(); });
    canvas.addEventListener('keydown', event => {
        const moves = { ArrowLeft:[0,-1], ArrowRight:[0,1], ArrowUp:[-1,0], ArrowDown:[1,0] };
        const delta = moves[event.key];
        if (!delta && !['Enter',' '].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        if (delta) {
            painterCursor.row = Math.max(0, Math.min(GRID_ROWS - 1, painterCursor.row + delta[0]));
            painterCursor.col = Math.max(0, Math.min(GRID_COLS - 1, painterCursor.col + delta[1]));
        } else if (!event.repeat) {
            clickTile(painterCursor.row, painterCursor.col);
        }
        const row = brushRow < 0 ? painterCursor.row : brushRow;
        canvas.setAttribute('aria-label', `${INSTRUMENTS[row].name}, note ${painterCursor.col + 1}, ${grid[row][painterCursor.col] ? 'on' : 'off'}. Arrow keys move; Enter toggles.`);
        render();
    });
    const stage = document.createElement('div');
    stage.className = 'sp-paint-stage';
    canvas.before(stage);
    stage.append(canvas);
    const instruments = document.createElement('section');
    instruments.className = 'sp-instrument-screen';
    instruments.hidden = true;
    const heading = document.createElement('h2');
    heading.textContent = 'Choose a brush';
    const instructions = document.createElement('p');
    instructions.textContent = 'Free paints the tile you touch. An instrument brush paints its row at any touched column. Select a brush, then return to Paint.';
    instruments.append(heading, instructions, document.getElementById('sp-palette'));
    stage.after(instruments);
    const tabs = document.createElement('nav');
    tabs.className = 'sp-screen-tabs';
    tabs.setAttribute('aria-label', 'Painter screens');
    const paint = document.createElement('button');
    const sounds = document.createElement('button');
    paint.textContent = '🎨 Paint';
    sounds.textContent = '🎛 Instruments';
    paint.type = sounds.type = 'button';
    const show = (editing) => {
        stage.hidden = !editing;
        instruments.hidden = editing;
        paint.setAttribute('aria-current', editing ? 'page' : 'false');
        sounds.setAttribute('aria-current', editing ? 'false' : 'page');
        if (editing) resizeCanvas();
    };
    paint.addEventListener('click', () => show(true));
    sounds.addEventListener('click', () => show(false));
    tabs.append(paint, sounds);
    frame.prepend(tabs);
    const controls = document.getElementById('TEMPLATE-4weird-game-controls');
    const undo = document.createElement('button');
    const redo = document.createElement('button');
    undo.id = 'sp-undo'; redo.id = 'sp-redo';
    undo.textContent = '↶ Undo'; redo.textContent = '↷ Redo';
    undo.type = redo.type = 'button';
    undo.className = redo.className = 'sound-painter-btn';
    undo.addEventListener('click', () => restorePainterEdit());
    redo.addEventListener('click', () => restorePainterEdit(true));
    controls.append(undo, redo);
    const status = document.createElement('p');
    status.id = 'sp-edit-status';
    status.setAttribute('role', 'status');
    controls.before(status);
    let resizeFrame = 0;
    const observer = new ResizeObserver(() => {
        if (resizeFrame) return;
        resizeFrame = requestAnimationFrame(() => {
            resizeFrame = 0;
            if (!stage.hidden) resizeCanvas();
        });
    });
    observer.observe(stage);
    document.getElementById('sp-palette').addEventListener('click', refreshPainterHistory);
    document.addEventListener('keydown', event => {
        if (event.target.closest?.('input,textarea,select') || event.repeat) return;
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
            event.preventDefault();
            restorePainterEdit(event.shiftKey);
        }
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && state.isPlaying && !state.isPaused) togglePause();
    });
    show(true);
    refreshPainterHistory();
}

initPainterScreens();
