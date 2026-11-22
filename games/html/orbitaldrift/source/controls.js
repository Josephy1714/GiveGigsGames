

function handleKeyDown(e) {
    if (e.target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
    if (e.repeat && ['KeyP', 'Escape', 'KeyM', 'KeyH'].includes(e.code)) return;
    if (e.code === 'Space') {
        e.preventDefault();
        if (gameActive && !isPaused) { sfx.init(); setThrust(true); }
    }
    if (e.code === 'KeyM') { sfx.init(); sfx.toggleMute(); applyMuteUI(); }
    if (e.code === 'KeyV' || e.code === 'KeyC') { cycleCameraView(); }
    if (e.code === 'KeyH' && (!gameActive || isPaused)) showHangar('key');
    if (!gameActive) {
        if (e.code === 'Digit1') applyShipSelection('cubesat', true);
        if (e.code === 'Digit2') applyShipSelection('dart', true);
        if (e.code === 'Digit3') applyShipSelection('station', true);
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameActive) togglePause();
    }
}


function handleKeyUp(e) {
    if (e.code === 'Space') setThrust(false);
}
