

    function applyMuteToMaster() {
        if (audioCtx && masterGain) {
            masterGain.gain.setValueAtTime(isMuted ? 0 : 0.8, audioCtx.currentTime);
        }
    }

function setMuted(m) {
        isMuted = !!m;
        applyMuteToMaster();
        return isMuted;
    }

function toggleMute() {
        return setMuted(!isMuted);
    }

function getNoiseBuffer() {
        if (!audioCtx) return null;
        if (noiseBuffer) return noiseBuffer;
        
        const bufferSize = audioCtx.sampleRate * 2;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        noiseBuffer = buffer;
        return noiseBuffer;
    }

// Update synth parameter node values dynamically
    function updateSynthParameters() {
        if (!audioCtx) return;
        
        const now = audioCtx.currentTime;
        mainFilter.frequency.setValueAtTime(state.settings.cutoff, now);
        mainFilter.Q.setValueAtTime(state.settings.resonance, now);
        
        delayNode.delayTime.setValueAtTime(state.settings.delayTime, now);
        delayFeedbackNode.gain.setValueAtTime(state.settings.delayFeedback, now);
        delayGainNode.gain.setValueAtTime(state.settings.delayGain, now);
        
        reverbGainNode.gain.setValueAtTime(state.settings.reverbGain, now);
    }

function playClap(time, v) {
        const vv = Math.max(0.15, Math.min(1, typeof v === 'number' ? v : 1));
        // Multi-trigger white noise bursts
        const duration = 0.28;
        const source = audioCtx.createBufferSource();
        source.buffer = getNoiseBuffer();

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1500;
        
        const gain = audioCtx.createGain();
        
        // 3 quick pre-bursts + final decay tail (scaled by velocity)
        const peak = 0.12 + 0.48 * vv;
        gain.gain.setValueAtTime(peak, time);
        gain.gain.setValueAtTime(0.01, time + 0.01);
        gain.gain.setValueAtTime(peak, time + 0.02);
        gain.gain.setValueAtTime(0.01, time + 0.03);
        gain.gain.setValueAtTime(peak, time + 0.04);
        gain.gain.setValueAtTime(0.01, time + 0.05);
        gain.gain.setValueAtTime(peak * 1.1, time + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(channels.drums.gain);

        source.start(time);
        source.stop(time + duration);
    }

function playRimshot(time, v) {
        const vv = Math.max(0.15, Math.min(1, typeof v === 'number' ? v : 1));
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, time);
        osc.frequency.exponentialRampToValueAtTime(100, time + 0.04);

        gain.gain.setValueAtTime(0.08 + 0.32 * vv, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

        osc.connect(gain);
        gain.connect(channels.drums.gain);

        osc.start(time);
        osc.stop(time + 0.04);
    }

function updateSlidersAndDropdowns() {
        // Tempo UI update
        document.getElementById('input-bpm').value = state.bpm;
        document.getElementById('label-bpm').textContent = state.bpm + ' BPM';

        // Synth Controls UI updates
        document.getElementById('param-cutoff').value = state.settings.cutoff;
        document.getElementById('display-cutoff').textContent = state.settings.cutoff + ' Hz';
        
        document.getElementById('param-q').value = state.settings.resonance;
        document.getElementById('display-q').textContent = state.settings.resonance.toFixed(1);
        
        document.getElementById('param-decay').value = state.settings.decay;
        document.getElementById('display-decay').textContent = state.settings.decay + 's';
        
        document.getElementById('param-waveform').value = state.settings.waveform;
        
        document.getElementById('param-delay-gain').value = state.settings.delayGain;
        document.getElementById('display-delay-gain').textContent = Math.round(state.settings.delayGain * 100) + '%';
        
        document.getElementById('param-delay-feedback').value = state.settings.delayFeedback;
        document.getElementById('display-delay-feedback').textContent = Math.round(state.settings.delayFeedback * 100) + '%';
        
        document.getElementById('param-delay-time').value = state.settings.delayTime;
        document.getElementById('display-delay-time').textContent = state.settings.delayTime + 's';
        
        document.getElementById('param-reverb').value = state.settings.reverbGain;
        document.getElementById('display-reverb').textContent = Math.round(state.settings.reverbGain * 100) + '%';

        // Track mixer updates
        TRACKS.forEach(track => {
            const strip = document.querySelector(`.track-channel[data-track="${track}"]`);
            if (strip) {
                strip.querySelector('.channel-vol').value = state.settings.vol[track];
                strip.querySelector('.channel-pan').value = state.settings.pan[track];
            }
        });

        // Trigger mixer nodes values updates
        if (audioCtx) {
            TRACKS.forEach(t => {
                if (channels[t].gain) {
                    channels[t].gain.gain.value = state.settings.vol[t];
                }
                if (channels[t].panner) {
                    channels[t].panner.pan.value = state.settings.pan[t];
                }
            });
            updateSynthParameters();
        }

        // Rebuild steps UI
        buildSequencerUI();
        syncPocketFX();
        syncPocketBpm();
    }

// ---- Pocket studio (mobile) helpers ----
    function setActiveTrack(track) {
        if (!TRACKS.includes(track)) return;
        state.activeTrack = track;
        document.querySelectorAll('.track-channel').forEach(s => {
            s.classList.toggle('active', s.dataset.track === track);
        });
        buildSequencerUI();
    }

function syncPocketTracks() {
        document.querySelectorAll('.pocket-pad').forEach(p => {
            const on = p.dataset.track === state.activeTrack;
            p.classList.toggle('is-active', on);
            p.setAttribute('aria-selected', on ? 'true' : 'false');
        });
    }

function fmtCutoff(hz) {
        return hz >= 1000 ? (hz / 1000).toFixed(1) + 'k' : Math.round(hz) + '';
    }

function syncPocketFX() {
        const map = [
            ['pocket-cutoff', 'pocket-cutoff-val', state.settings.cutoff, (v) => fmtCutoff(v)],
            ['pocket-decay', 'pocket-decay-val', state.settings.decay, (v) => Number(v).toFixed(2) + 's'],
            ['pocket-echo', 'pocket-echo-val', state.settings.delayGain, (v) => Math.round(v * 100) + '%'],
            ['pocket-space', 'pocket-space-val', state.settings.reverbGain, (v) => Math.round(v * 100) + '%']
        ];
        map.forEach(([id, labelId, val, fmt]) => {
            const el = document.getElementById(id);
            const lab = document.getElementById(labelId);
            if (el && document.activeElement !== el) el.value = val;
            if (lab) lab.textContent = fmt(val);
        });
    }

function syncPocketBpm() {
        const bpmEl = document.getElementById('input-bpm');
        const bpmLab = document.getElementById('label-bpm');
        const pVal = document.getElementById('pocket-bpm-val');
        if (bpmEl && document.activeElement !== bpmEl) bpmEl.value = state.bpm;
        if (bpmLab) bpmLab.textContent = state.bpm + ' BPM';
        if (pVal) pVal.textContent = state.bpm;
    }

function setBpm(next) {
        state.bpm = Math.max(60, Math.min(200, Math.round(next)));
        syncPocketBpm();
    }

function clearActiveTrack() {
        const grid = state.grids[state.activeTrack];
        const vels = state.vel[state.activeTrack];
        for (let r = 0; r < NUM_ROWS; r++) {
            grid[r].fill(false);
            vels[r].fill(1);
        }
        buildSequencerUI();
    }

function loadPreset(name) {
        const preset = PRESETS[name];
        if (!preset) return;
        
        state.bpm = preset.bpm;
        
        // Deep copy grids (velocities reset to full — tap a pad then drag for dynamics)
        TRACKS.forEach(t => {
            for (let r = 0; r < NUM_ROWS; r++) {
                state.grids[t][r] = [...preset.grids[t][r]];
                state.vel[t][r] = preset.grids[t][r].map(on => (on ? 0.9 : 1));
            }
        });

        // Copy settings
        Object.keys(preset.settings).forEach(key => {
            if (typeof preset.settings[key] === 'object') {
                state.settings[key] = { ...preset.settings[key] };
            } else {
                state.settings[key] = preset.settings[key];
            }
        });

        updateSlidersAndDropdowns();
    }

function setupEventListeners() {
        window.addEventListener('pointerdown', initAudio, { once: true });

        // Start Overlay
        document.getElementById('btn-start-studio').addEventListener('click', () => {
            initAudio();
            document.getElementById('start-screen').classList.add('hidden');
        });

        // Transport
        document.getElementById('btn-play-stop').addEventListener('click', toggleSequencer);
        document.getElementById('btn-clear-track').addEventListener('click', clearActiveTrack);
        document.getElementById('btn-reset-all').addEventListener('click', resetAll);
        
        // Share & Preset Songs
        document.getElementById('btn-share-song').addEventListener('click', shareSong);
        document.getElementById('select-preset').addEventListener('change', (e) => {
            if (e.target.value) {
                loadPreset(e.target.value);
            }
        });

        // BPM slider
        document.getElementById('input-bpm').addEventListener('input', (e) => {
            state.bpm = parseInt(e.target.value);
            document.getElementById('label-bpm').textContent = state.bpm + ' BPM';
            syncPocketBpm();
        });

        // Pocket studio pads (thumb track switcher)
        document.querySelectorAll('.pocket-pad').forEach(pad => {
            pad.addEventListener('click', () => {
                initAudio();
                setActiveTrack(pad.dataset.track);
            });
        });

        // Pocket big transport
        const pocketPlay = document.getElementById('btn-pocket-play');
        if (pocketPlay) pocketPlay.addEventListener('click', toggleSequencer);
        const pocketClear = document.getElementById('btn-pocket-clear');
        if (pocketClear) pocketClear.addEventListener('click', clearActiveTrack);
        const bpmDown = document.getElementById('pocket-bpm-down');
        const bpmUp = document.getElementById('pocket-bpm-up');
        if (bpmDown) bpmDown.addEventListener('click', () => setBpm(state.bpm - 2));
        if (bpmUp) bpmUp.addEventListener('click', () => setBpm(state.bpm + 2));

        // Pocket thumb FX faders (two-way synced with main synth controls)
        const pocketCutoff = document.getElementById('pocket-cutoff');
        if (pocketCutoff) pocketCutoff.addEventListener('input', (e) => {
            state.settings.cutoff = parseInt(e.target.value);
            document.getElementById('param-cutoff').value = state.settings.cutoff;
            document.getElementById('display-cutoff').textContent = state.settings.cutoff + ' Hz';
            if (audioCtx) updateSynthParameters();
            syncPocketFX();
        });
        const pocketDecay = document.getElementById('pocket-decay');
        if (pocketDecay) pocketDecay.addEventListener('input', (e) => {
            state.settings.decay = parseFloat(e.target.value);
            document.getElementById('param-decay').value = state.settings.decay;
            document.getElementById('display-decay').textContent = state.settings.decay + 's';
            syncPocketFX();
        });
        const pocketEcho = document.getElementById('pocket-echo');
        if (pocketEcho) pocketEcho.addEventListener('input', (e) => {
            state.settings.delayGain = parseFloat(e.target.value);
            document.getElementById('param-delay-gain').value = state.settings.delayGain;
            document.getElementById('display-delay-gain').textContent = Math.round(state.settings.delayGain * 100) + '%';
            if (audioCtx) updateSynthParameters();
            syncPocketFX();
        });
        const pocketSpace = document.getElementById('pocket-space');
        if (pocketSpace) pocketSpace.addEventListener('input', (e) => {
            state.settings.reverbGain = parseFloat(e.target.value);
            document.getElementById('param-reverb').value = state.settings.reverbGain;
            document.getElementById('display-reverb').textContent = Math.round(state.settings.reverbGain * 100) + '%';
            if (audioCtx) updateSynthParameters();
            syncPocketFX();
        });

        // Track channel strips selectors & sliders
        document.querySelectorAll('.track-channel').forEach(channelStrip => {
            const trackName = channelStrip.dataset.track;
            
            // Select channel strip on click
            channelStrip.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT') return; // let faders trigger separately
                
                document.querySelectorAll('.track-channel').forEach(s => s.classList.remove('active'));
                channelStrip.classList.add('active');
                
                state.activeTrack = trackName;
                buildSequencerUI();
                syncPocketTracks();
            });

            // Volume fader
            channelStrip.querySelector('.channel-vol').addEventListener('input', (e) => {
                const vol = parseFloat(e.target.value);
                state.settings.vol[trackName] = vol;
                if (channels[trackName].gain) {
                    channels[trackName].gain.gain.setValueAtTime(vol, audioCtx.currentTime);
                }
            });

            // Pan fader
            channelStrip.querySelector('.channel-pan').addEventListener('input', (e) => {
                const pan = parseFloat(e.target.value);
                state.settings.pan[trackName] = pan;
                if (channels[trackName].panner) {
                    channels[trackName].panner.pan.setValueAtTime(pan, audioCtx.currentTime);
                }
            });
        });

        // Dynamic synth control sliders
        document.getElementById('param-cutoff').addEventListener('input', (e) => {
            state.settings.cutoff = parseInt(e.target.value);
            document.getElementById('display-cutoff').textContent = state.settings.cutoff + ' Hz';
            if (audioCtx) updateSynthParameters();
            syncPocketFX();
        });

        document.getElementById('param-q').addEventListener('input', (e) => {
            state.settings.resonance = parseFloat(e.target.value);
            document.getElementById('display-q').textContent = state.settings.resonance.toFixed(1);
            if (audioCtx) updateSynthParameters();
        });

        document.getElementById('param-decay').addEventListener('input', (e) => {
            state.settings.decay = parseFloat(e.target.value);
            document.getElementById('display-decay').textContent = state.settings.decay + 's';
            syncPocketFX();
        });

        document.getElementById('param-waveform').addEventListener('change', (e) => {
            state.settings.waveform = e.target.value;
        });

        document.getElementById('param-delay-gain').addEventListener('input', (e) => {
            state.settings.delayGain = parseFloat(e.target.value);
            document.getElementById('display-delay-gain').textContent = Math.round(state.settings.delayGain * 100) + '%';
            if (audioCtx) updateSynthParameters();
            syncPocketFX();
        });

        document.getElementById('param-delay-feedback').addEventListener('input', (e) => {
            state.settings.delayFeedback = parseFloat(e.target.value);
            document.getElementById('display-delay-feedback').textContent = Math.round(state.settings.delayFeedback * 100) + '%';
            if (audioCtx) updateSynthParameters();
        });

        document.getElementById('param-delay-time').addEventListener('input', (e) => {
            state.settings.delayTime = parseFloat(e.target.value);
            document.getElementById('display-delay-time').textContent = state.settings.delayTime + 's';
            if (audioCtx) updateSynthParameters();
        });

        document.getElementById('param-reverb').addEventListener('input', (e) => {
            state.settings.reverbGain = parseFloat(e.target.value);
            document.getElementById('display-reverb').textContent = Math.round(state.settings.reverbGain * 100) + '%';
            if (audioCtx) updateSynthParameters();
            syncPocketFX();
        });

        // Keyboard triggers
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            if (e.code === 'Space') {
                e.preventDefault();
                toggleSequencer();
            }
            if (e.code === 'KeyC') {
                e.preventDefault();
                clearActiveTrack();
            }
            if (e.code === 'KeyR') {
                e.preventDefault();
                resetAll();
            }
        });
    }

// -------------------------------------------------------------
    // 10. SETUP CREDITS POPULATING FUNCTION
    // -------------------------------------------------------------
    function populateCredits() {
        const defaults = {
            "title": "Sound Painter 2",
            "maker": {
                "name": "WewennJr",
                "bio": "Independent contributor creating games for the 4weird platform. I build creative, playable experiences using pure HTML5 and vanilla JavaScript. Sound Painter 2 is a sequel that moves closer to a full desktop music workstation.",
                "url": "",
                "urlLabel": ""
            },
            "credits": [
                {
                    "name": "WewennJr",
                    "role": "Game Creator",
                    "avatar": "🎹",
                    "primary": true,
                    "url": "",
                    "urlLabel": ""
                }
            ]
        };

        function apply(data) {
            // Security: game.json is contributor-supplied; insert as text,
            // never innerHTML.
            var bioEl = document.getElementById('TEMPLATE-4weird-maker-bio');
            if (bioEl) {
                bioEl.textContent = '';
                var bioP = document.createElement('p');
                bioP.textContent = (data.maker && data.maker.bio) || '';
                bioEl.appendChild(bioP);
            }
            const grid = document.getElementById('TEMPLATE-4weird-credits-grid');
            if (data.credits && data.credits.length > 0 && grid) {
                grid.textContent = '';
                data.credits.forEach(c => {
                    const card = document.createElement('div');
                    card.className = 'TEMPLATE-4weird-credit-card' + (c.primary ? ' TEMPLATE-4weird-primary' : '');
                    const avatar = document.createElement('div');
                    avatar.className = 'TEMPLATE-4weird-credit-avatar';
                    avatar.textContent = c.avatar || '👤';
                    const name = document.createElement('h3');
                    name.className = 'TEMPLATE-4weird-credit-name';
                    name.textContent = c.name || '';
                    const role = document.createElement('p');
                    role.className = 'TEMPLATE-4weird-credit-role';
                    role.textContent = c.role || '';
                    card.append(avatar, name, role);
                    grid.appendChild(card);
                });
            }
        }

        fetch('game.json')
            .then(r => r.json())
            .then(apply)
            .catch(() => apply(defaults));
    }
