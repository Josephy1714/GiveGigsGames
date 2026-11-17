

function schedulePainterSound(callback, delay) {
    const id = setTimeout(() => {
        const index = pendingTimeouts.indexOf(id);
        if (index >= 0) pendingTimeouts.splice(index, 1);
        if (state.isPlaying && !state.isPaused) callback();
    }, delay);
    pendingTimeouts.push(id);
}

    // Play all tiles in sequence
    function playAll() {
        if (!state.isPlaying) return;
        initAudio();

        const tiledesc = [];
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                if (grid[row][col]) {
                    tiledesc.push({ row, col });
                }
            }
        }

        if (tiledesc.length === 0) return;

        // Columns are time steps: every instrument in a column forms a chord.
        while (pendingTimeouts.length) clearTimeout(pendingTimeouts.pop());
        tiledesc.forEach(tile => {
            schedulePainterSound(() => {
                playNote(NOTES[tile.col], 0.25, getWaveType(tile.row), tile.row);
            }, tile.col * 100);
        });
    }
function startPlayingPattern(e) {
        if (e) {
            e.preventDefault();
        }
        if (!state.isPlaying || state.isPaused) return;
        
        // Visual state
        playBtn.classList.add('playing');
        
        // Play once immediately
        playAll();
        
        // Loop interval (every 800ms)
        if (playInterval) clearInterval(playInterval);
        playInterval = setInterval(playAll, 800);
    }

function stopPlayingPattern(e) {
        if (e) {
            e.preventDefault();
        }
        playBtn.classList.remove('playing');
        if (playInterval) {
            clearInterval(playInterval);
            playInterval = null;
        }
    }

