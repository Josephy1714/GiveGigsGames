

    function resetAll() {
        TRACKS.forEach(track => {
            const grid = state.grids[track];
            const vels = state.vel[track];
            for (let r = 0; r < NUM_ROWS; r++) {
                grid[r].fill(false);
                vels[r].fill(1);
            }
        });
        
        state.bpm = 120;
        state.settings.cutoff = 2000;
        state.settings.resonance = 2.0;
        state.settings.decay = 0.3;
        state.settings.waveform = 'sawtooth';
        state.settings.delayGain = 0.2;
        state.settings.delayFeedback = 0.4;
        state.settings.delayTime = 0.3;
        state.settings.reverbGain = 0.15;
        
        TRACKS.forEach(t => {
            state.settings.vol[t] = t === 'chords' ? 0.6 : (t === 'lead' || t === 'bass' ? 0.7 : 0.8);
            state.settings.pan[t] = 0;
        });

        document.getElementById('select-preset').value = '';

        updateSlidersAndDropdowns();
    }
