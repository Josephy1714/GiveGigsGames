

    function scheduler() {
        while (nextNoteTime < audioCtx.currentTime + SCHEDULE_AHEAD_TIME) {
            scheduleNotes(state.currentStep, nextNoteTime);
            advanceStep();
        }
        schedulerTimer = setTimeout(scheduler, LOOKAHEAD_MS);
    }

function scheduleNotes(stepIndex, time) {
        // Visual callback sync (uses requestAnimationFrame)
        const displayStep = stepIndex;
        audioCtx.resume();
        
        // Trigger all active notes at this step index across channels
        // (skipped while muted; the playhead highlight below still advances).
        if (!isMuted) TRACKS.forEach(track => {
            const grid = state.grids[track];
            const vels = state.vel[track];
            for (let row = 0; row < NUM_ROWS; row++) {
                if (grid[row][stepIndex]) {
                    playSynthNote(track, row, time, vels[row][stepIndex]);
                }
            }
        });

        // Sync grid view highlights on the UI
        setTimeout(() => {
            highlightPlayheadColumn(displayStep);
        }, (time - audioCtx.currentTime) * 1000);
    }

function advanceStep() {
        const secondsPerBeat = 60.0 / state.bpm;
        // 16th notes: 4 steps per beat
        const stepDuration = 0.25 * secondsPerBeat;
        
        nextNoteTime += stepDuration;
        
        state.currentStep = (state.currentStep + 1) % NUM_STEPS;
    }

function syncTransportUI() {
        const mainBtn = document.getElementById('btn-play-stop');
        const pocket = document.getElementById('pocket-transport');
        const pIcon = document.getElementById('pocket-play-icon');
        const pLabel = document.getElementById('pocket-play-label');
        if (mainBtn) {
            mainBtn.classList.toggle('playing', state.isPlaying);
            const lbl = mainBtn.querySelector('.label');
            const icn = mainBtn.querySelector('.icon');
            if (lbl) lbl.textContent = state.isPlaying ? 'Stop' : 'Play';
            if (icn) icn.textContent = state.isPlaying ? '■' : '▶';
        }
        if (pocket) pocket.classList.toggle('is-playing', state.isPlaying);
        if (pIcon) pIcon.textContent = state.isPlaying ? '■' : '▶';
        if (pLabel) pLabel.textContent = state.isPlaying ? 'STOP' : 'PLAY';
    }

function toggleSequencer() {
        initAudio();
        
        if (state.isPlaying) {
            // STOP
            state.isPlaying = false;
            if (schedulerTimer) {
                clearTimeout(schedulerTimer);
                schedulerTimer = null;
            }
            state.currentStep = -1;
            removePlayheadHighlights();
            syncTransportUI();
        } else {
            // PLAY
            state.isPlaying = true;
            state.currentStep = 0;
            nextNoteTime = audioCtx.currentTime + 0.05;
            
            // Sync dynamic parameters
            updateSynthParameters();
            scheduler();
            
            syncTransportUI();
        }
    }
