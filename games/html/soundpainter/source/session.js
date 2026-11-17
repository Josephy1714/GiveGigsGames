

    // Reset grid
    function resetGrid() {
        if (grid.some(row => row.some(Boolean))) rememberPainterEdit();
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                grid[r][c] = false;
            }
        }
        tileCount = 0;
        state.score = 0;
        document.getElementById('TEMPLATE-4weird-high-score').textContent = '0';
        refreshPainterHistory();
        render();
    }

// Toggle pause
    function togglePause() {
        if (!state.isPlaying) return;
        state.isPaused = !state.isPaused;
        document.getElementById('TEMPLATE-4weird-pause-screen').classList.toggle('hidden', !state.isPaused);
        if (state.isPaused) {
            stopPlayingPattern();
            while (pendingTimeouts.length) clearTimeout(pendingTimeouts.pop());
        }
        if (!state.isPaused) {
            lastTime = performance.now();
            requestAnimationFrame(gameLoop);
        } else {
            document.getElementById('TEMPLATE-4weird-pause-screen').classList.remove('hidden');
        }
    }

// Start game
    function startGame() {
        state.isPlaying = true;
        state.isPaused = false;
        resetGrid();
        document.getElementById('TEMPLATE-4weird-start-screen').classList.add('hidden');
        resizeCanvas();
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }

// End game
    function endGame() {
        state.isPlaying = false;
        // Stop path per AUDIO SPEC: no stacked loops or ringing timeouts.
        stopPlayingPattern();
        while (pendingTimeouts.length) clearTimeout(pendingTimeouts.pop());
        if (state.score > state.highScore) {
            state.highScore = state.score;
            try { localStorage.setItem('soundpainter_tilesCount', state.highScore); } catch {}
        }
        document.getElementById('TEMPLATE-4weird-game-over-screen').classList.remove('hidden');
    }
