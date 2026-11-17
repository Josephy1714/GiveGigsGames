

    function setMuted(m) {
        isMuted = !!m;
        if (isMuted) stopPlayingPattern();
        return isMuted;
    }

function toggleMute() {
        return setMuted(!isMuted);
    }

// Resize canvas for high DPI + responsive "Finger-paint symphony grid" tiles.
    // Small screens get full-bleed tiles sized to fit width (min ~40px touch target).
    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const dpr = Math.min(3, window.devicePixelRatio || 1);
        const cssW = Math.max(1, rect.width);
        const cssH = Math.max(1, rect.height);
        const gap = 4;
        const stepX = Math.max(1, Math.min(72, (cssW - 16) / GRID_COLS));
        const stepY = Math.max(1, Math.min(72, (cssH - 40) / GRID_ROWS));
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        canvas.style.width = cssW + 'px';
        canvas.style.height = cssH + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        Object.assign(layout, {
            tileW: Math.max(1, stepX - gap), tileH: Math.max(1, stepY - gap),
            stepX, stepY, gap, startX: (cssW - stepX * GRID_COLS) / 2 + gap / 2,
            startY: Math.max(4, (cssH - 32 - stepY * GRID_ROWS) / 2), cssW, cssH
        });
        render();
    }
// Calculate tile position from mouse/touch (uses responsive layout).
    function getTileAt(x, y) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = layout.cssW / rect.width;
        const scaleY = layout.cssH / rect.height;
        const localX = (x - rect.left) * scaleX;
        const localY = (y - rect.top) * scaleY;

        const col = Math.floor((localX - layout.startX) / (layout.stepX || layout.tileW));
        const row = Math.floor((localY - layout.startY) / (layout.stepY || layout.tileH));

        if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
            return { row, col };
        }
        return null;
    }

// Get waveform type based on row
    function getWaveType(row) {
        const types = ['sine', 'square', 'sawtooth', 'triangle', 'sine', 'square'];
        return types[row % types.length];
    }

// Handle tile click (tap = toggle + sound)
    function clickTile(row, col) {
        if (!state.isPlaying || state.isPaused) return;
        setTile(row, col, !grid[row][col], true);
    }

// Core setter shared by tap, drag-paint and chord paths.
    function setTile(row, col, active, sound) {
        if (!state.isPlaying || state.isPaused) return;
        if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return;
        // Brush mode: lock to the palette instrument row for fat-thumb painting.
        if (brushRow >= 0) row = brushRow;
        const wasActive = grid[row][col];
        if (wasActive === active) {
            if (sound && active) playTileSound(row, col);
            return;
        }
        rememberPainterEdit();
        grid[row][col] = active;
        tileCount += active ? 1 : -1;
        state.score = tileCount;
        refreshPainterHistory();
        const el = document.getElementById('TEMPLATE-4weird-high-score');
        if (el) el.textContent = tileCount;
        if (sound) playTileSound(row, col);
    }

function playTileSound(row, col) {
        initAudio();
        playNote(NOTES[col], 0.2, getWaveType(row), row);
        rowFlash = row;
        rowFlashUntil = performance.now() + 350;
    }
 // touchId -> { erase:boolean, seen:Set }
    function handleTouchPoint(touch, isStart) {
        const tile = getTileAt(touch.clientX, touch.clientY);
        if (!tile) return;
        const id = touch.identifier;
        if (isStart || !activeTouches.has(id)) {
            const landingRow = brushRow >= 0 ? brushRow : tile.row;
            activeTouches.set(id, { erase: !!grid[landingRow][tile.col], seen: new Set() });
        }
        const st = activeTouches.get(id);
        const key = tile.row + ':' + tile.col;
        if (st.seen.has(key)) return;
        st.seen.add(key);
        // Chord voice: each simultaneous finger gets a slightly brighter duration.
        const voices = Math.max(1, activeTouches.size);
        setTile(tile.row, tile.col, !st.erase, true);
        if (voices > 1) {
            // Extra shimmer for chords: replay with longer tail at low gain.
            const r = brushRow >= 0 ? brushRow : tile.row;
            playNote(NOTES[tile.col] * 2, 0.15, getWaveType(r), r);
        }
    }

    function buildPalette() {
        const pal = document.getElementById('sp-palette');
        if (!pal) return;
        pal.innerHTML = '';
        const freeBtn = document.createElement('button');
        freeBtn.type = 'button';
        freeBtn.className = 'sp-thumb sp-free' + (brushRow === -1 ? ' active' : '');
        freeBtn.setAttribute('aria-pressed', brushRow === -1 ? 'true' : 'false');
        freeBtn.title = 'Free paint (exact tile)';
        freeBtn.innerHTML = '<span class="sp-emoji">👆</span><span class="sp-name">Free</span>';
        freeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            brushRow = -1;
            buildPalette();
        });
        pal.appendChild(freeBtn);
        INSTRUMENTS.forEach((inst, row) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'sp-thumb' + (brushRow === row ? ' active' : '');
            b.setAttribute('aria-pressed', brushRow === row ? 'true' : 'false');
            b.style.setProperty('--inst', COLORS[row]);
            b.title = inst.name + ' brush — tap again for free paint';
            b.innerHTML = '<span class="sp-emoji">' + inst.emoji + '</span>' +
                '<span class="sp-dot"></span>' +
                '<span class="sp-name">' + inst.name + '</span>';
            b.addEventListener('click', (e) => {
                e.preventDefault();
                initAudio();
                // Tap active brush again = back to free paint; else select brush.
                brushRow = (brushRow === row) ? -1 : row;
                // Preview gliss so thumbs hear the timbre.
                NOTES.forEach((f, i) => {
                    schedulePainterSound(() => playNote(f, 0.18, getWaveType(row), row), i * 55);
                });
                rowFlash = row;
                rowFlashUntil = performance.now() + 600;
                buildPalette();
            });
            pal.appendChild(b);
        });
        pal.setAttribute('data-scheme', SCHEME);
    }

