

    // -------------------------------------------------------------
    // 9. UI BINDINGS, RENDER LOGIC & EVENT LISTENERS
    // -------------------------------------------------------------

    function buildSequencerUI() {
        const labelsContainer = document.getElementById('sequencer-y-labels');
        const gridContainer = document.getElementById('sequencer-grid');
        const indicatorContainer = document.querySelector('.steps-indicators-grid');
        
        labelsContainer.innerHTML = '';
        gridContainer.innerHTML = '';
        indicatorContainer.innerHTML = '';

        // Playhead indicator nodes
        for (let s = 0; s < NUM_STEPS; s++) {
            const node = document.createElement('div');
            node.className = 'step-indicator-node';
            node.id = `step-node-${s}`;
            indicatorContainer.appendChild(node);
        }

        // Labels for rows depending on active track
        let rowNames = [];
        if (state.activeTrack === 'lead') rowNames = ['C5', 'A4', 'G4', 'E4', 'D4', 'C4', 'A3', 'G3'];
        if (state.activeTrack === 'bass') rowNames = ['C3', 'Bb2', 'Ab2', 'G2', 'F2', 'Eb2', 'D2', 'C2'];
        if (state.activeTrack === 'chords') rowNames = CHORD_NAMES;
        if (state.activeTrack === 'drums') rowNames = DRUM_NAMES;

        for (let row = 0; row < NUM_ROWS; row++) {
            const lbl = document.createElement('div');
            lbl.className = 'pitch-row-label';
            lbl.textContent = rowNames[row];
            labelsContainer.appendChild(lbl);
            
            const rowDiv = document.createElement('div');
            rowDiv.className = 'sequencer-row-grid';
            rowDiv.id = `grid-row-${row}`;
            
            for (let col = 0; col < NUM_STEPS; col++) {
                const cell = document.createElement('div');
                cell.className = 'sequencer-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.setAttribute('role', 'button');
                cell.setAttribute('tabindex', '0');
                cell.setAttribute('aria-label', `Step ${col + 1}`);
                
                paintCellVelocity(cell, row, col);
                if (state.grids[state.activeTrack][row][col]) {
                    cell.classList.add('active-step');
                }

                // Touch sequencer: tap toggles, vertical drag paints velocity.
                attachTouchCell(cell, row, col);

                rowDiv.appendChild(cell);
            }
            gridContainer.appendChild(rowDiv);
        }

        // Apply grid styling tag to container so the correct active color triggers
        const sequencerWrapper = document.querySelector('.sequencer-container');
        sequencerWrapper.className = `sequencer-container ${state.activeTrack}-mode`;
        syncPocketTracks();
        window.dispatchEvent(new Event('studio-grid-rebuilt'));
    }

function paintCellVelocity(cellElement, row, col) {
        const v = state.vel[state.activeTrack][row][col];
        cellElement.style.setProperty('--vel', v.toFixed(2));
        cellElement.setAttribute('aria-pressed', state.grids[state.activeTrack][row][col] ? 'true' : 'false');
    }

function applyVelocity(row, col, cellElement, v) {
        const nv = Math.max(0.15, Math.min(1, v));
        state.vel[state.activeTrack][row][col] = nv;
        if (!state.grids[state.activeTrack][row][col]) {
            state.grids[state.activeTrack][row][col] = true;
            cellElement.classList.add('active-step');
        }
        paintCellVelocity(cellElement, row, col);
    }

// Tap = toggle. Vertical drag on a pad = velocity fader (drag up = louder).
    function attachTouchCell(cellElement, row, col) {
        let tracking = null;

        cellElement.addEventListener('pointerdown', (e) => {
            initAudio();
            try { cellElement.setPointerCapture(e.pointerId); } catch (_) {}
            tracking = {
                id: e.pointerId,
                startY: e.clientY,
                startVel: state.vel[state.activeTrack][row][col],
                wasActive: state.grids[state.activeTrack][row][col],
                dragged: false
            };
        });

        cellElement.addEventListener('pointermove', (e) => {
            if (!tracking || e.pointerId !== tracking.id) return;
            const dy = tracking.startY - e.clientY;
            if (Math.abs(dy) > 12) {
                tracking.dragged = true;
                cellElement.classList.add('vel-drag');
                applyVelocity(row, col, cellElement, tracking.startVel + dy / 140);
            }
        });

        const finish = (e) => {
            if (!tracking || (e && e.pointerId !== tracking.id)) return;
            const wasDrag = tracking.dragged;
            tracking = null;
            cellElement.classList.remove('vel-drag');
            if (!wasDrag) {
                toggleCell(row, col, cellElement);
            }
        };

        cellElement.addEventListener('pointerup', finish);
        cellElement.addEventListener('pointercancel', () => {
            tracking = null;
            cellElement.classList.remove('vel-drag');
        });

        // Keyboard access: Enter/Space toggles focused pad.
        cellElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                toggleCell(row, col, cellElement);
            }
        });

        // Prevent iOS double-tap zoom / context menu on long press.
        cellElement.addEventListener('contextmenu', (e) => e.preventDefault());
    }

function toggleCell(row, col, cellElement) {
        initAudio();
        const activeGrid = state.grids[state.activeTrack];
        activeGrid[row][col] = !activeGrid[row][col];
        
        if (activeGrid[row][col]) {
            cellElement.classList.add('active-step');
            if (state.vel[state.activeTrack][row][col] < 0.15) {
                state.vel[state.activeTrack][row][col] = 0.8;
            }
            paintCellVelocity(cellElement, row, col);
            // Play note trigger feedback instantly when clicking (with velocity)
            playSynthNote(state.activeTrack, row, audioCtx.currentTime, state.vel[state.activeTrack][row][col]);
        } else {
            cellElement.classList.remove('active-step');
            paintCellVelocity(cellElement, row, col);
        }
    }

function highlightPlayheadColumn(stepIndex) {
        // Toggle indicators at the top
        for (let s = 0; s < NUM_STEPS; s++) {
            const node = document.getElementById(`step-node-${s}`);
            if (node) {
                if (s === stepIndex) {
                    node.classList.add('active-playhead');
                } else {
                    node.classList.remove('active-playhead');
                }
            }
        }

        // Highlight cells in grid
        for (let row = 0; row < NUM_ROWS; row++) {
            const rowDiv = document.getElementById(`grid-row-${row}`);
            if (rowDiv) {
                for (let col = 0; col < NUM_STEPS; col++) {
                    const cell = rowDiv.children[col];
                    if (cell) {
                        if (col === stepIndex) {
                            cell.classList.add('active-playhead-step');
                            if (cell.classList.contains('active-step')) {
                                rowDiv.classList.add('playhead-col-active');
                            }
                        } else {
                            cell.classList.remove('active-playhead-step');
                        }
                    }
                }
            }
        }
    }

function removePlayheadHighlights() {
        for (let s = 0; s < NUM_STEPS; s++) {
            const node = document.getElementById(`step-node-${s}`);
            if (node) node.classList.remove('active-playhead');
        }

        for (let row = 0; row < NUM_ROWS; row++) {
            const rowDiv = document.getElementById(`grid-row-${row}`);
            if (rowDiv) {
                rowDiv.classList.remove('playhead-col-active');
                for (let col = 0; col < NUM_STEPS; col++) {
                    const cell = rowDiv.children[col];
                    if (cell) cell.classList.remove('active-playhead-step');
                }
            }
        }
    }
