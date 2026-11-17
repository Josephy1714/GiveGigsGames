

    function initAudio() {
        if (audioCtx) {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            return;
        }
        
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        // 1. Create Master Output Chain
        masterAnalyser = audioCtx.createAnalyser();
        masterAnalyser.fftSize = 256;
        
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.8;
        
        mainFilter = audioCtx.createBiquadFilter();
        mainFilter.type = 'lowpass';
        mainFilter.frequency.value = state.settings.cutoff;
        mainFilter.Q.value = state.settings.resonance;

        // 2. Create Delay FX Routing
        delayNode = audioCtx.createDelay(2.0);
        delayNode.delayTime.value = state.settings.delayTime;
        
        delayFeedbackNode = audioCtx.createGain();
        delayFeedbackNode.gain.value = state.settings.delayFeedback;
        
        delayFilter = audioCtx.createBiquadFilter();
        delayFilter.type = 'bandpass';
        delayFilter.frequency.value = 1000;
        delayFilter.Q.value = 0.8;
        
        delayGainNode = audioCtx.createGain();
        delayGainNode.gain.value = state.settings.delayGain;
        
        // Connect delay feedback loop
        delayNode.connect(delayFilter);
        delayFilter.connect(delayFeedbackNode);
        delayFeedbackNode.connect(delayNode);
        
        // 3. Create Reverb FX Routing
        reverbNode = audioCtx.createConvolver();
        reverbGainNode = audioCtx.createGain();
        reverbGainNode.gain.value = state.settings.reverbGain;
        
        // Generate synthetic impulse response for reverb
        const impulseLen = audioCtx.sampleRate * 2.5; // 2.5 seconds reverb tail
        const impulseBuffer = audioCtx.createBuffer(2, impulseLen, audioCtx.sampleRate);
        for (let channel = 0; channel < 2; channel++) {
            const data = impulseBuffer.getChannelData(channel);
            for (let i = 0; i < impulseLen; i++) {
                // Exponential decay white noise
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLen, 2.5);
            }
        }
        reverbNode.buffer = impulseBuffer;

        // 4. Connect FX sends
        // Connections: mainFilter -> Reverb & Delay
        // mainFilter -> masterAnalyser -> masterGain -> destination
        mainFilter.connect(masterAnalyser);
        masterAnalyser.connect(masterGain);
        masterGain.connect(audioCtx.destination);
        
        // FX sends from Main Filter
        mainFilter.connect(delayNode);
        delayNode.connect(delayGainNode);
        delayGainNode.connect(masterAnalyser);
        
        mainFilter.connect(reverbNode);
        reverbNode.connect(reverbGainNode);
        reverbGainNode.connect(masterAnalyser);

        // 5. Build mixer tracks
        TRACKS.forEach(t => {
            const trackGain = audioCtx.createGain();
            trackGain.gain.value = state.settings.vol[t];
            
            const trackPanner = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
            if (trackPanner) {
                trackPanner.pan.value = state.settings.pan[t];
                trackGain.connect(trackPanner);
                trackPanner.connect(mainFilter);
            } else {
                trackGain.connect(mainFilter);
            }
            
            channels[t].gain = trackGain;
            channels[t].panner = trackPanner;
        });

        // Initialize white noise buffer
        getNoiseBuffer();
    }

// -------------------------------------------------------------
    // 4. DYNAMIC SYNTH DRUM VOICES
    // -------------------------------------------------------------
    function playKick(time, v) {
        const vv = Math.max(0.15, Math.min(1, typeof v === 'number' ? v : 1));
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(channels.drums.gain);

        osc.frequency.setValueAtTime(150, time);
        // Exponential sweep down for standard kick thump
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.3);

        gain.gain.setValueAtTime(0.3 + 0.7 * vv, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

        osc.start(time);
        osc.stop(time + 0.3);
    }

function playSnare(time, v) {
        const vv = Math.max(0.15, Math.min(1, typeof v === 'number' ? v : 1));
        // Noise source
        const noise = audioCtx.createBufferSource();
        noise.buffer = getNoiseBuffer();
        
        const noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;
        
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.15 + 0.55 * vv, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(channels.drums.gain);

        // Snap body (sine tone)
        const snap = audioCtx.createOscillator();
        const snapGain = audioCtx.createGain();
        snap.type = 'triangle';
        snap.frequency.setValueAtTime(180, time);
        snap.frequency.exponentialRampToValueAtTime(100, time + 0.1);
        
        snapGain.gain.setValueAtTime(0.1 + 0.4 * vv, time);
        snapGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        
        snap.connect(snapGain);
        snapGain.connect(channels.drums.gain);

        noise.start(time);
        snap.start(time);
        noise.stop(time + 0.25);
        snap.stop(time + 0.1);
    }

function playHihat(time, isClosed, v) {
        if (typeof isClosed !== 'boolean') { v = isClosed; isClosed = true; }
        const vv = Math.max(0.15, Math.min(1, typeof v === 'number' ? v : 1));
        const source = audioCtx.createBufferSource();
        source.buffer = getNoiseBuffer();

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 7500;
        filter.Q.value = 3;

        const gain = audioCtx.createGain();
        const duration = isClosed ? 0.05 : 0.25;
        
        gain.gain.setValueAtTime(0.06 + 0.24 * vv, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(channels.drums.gain);

        source.start(time);
        source.stop(time + duration);
    }

function playPerc1(time, v) {
        const vv = Math.max(0.15, Math.min(1, typeof v === 'number' ? v : 1));
        // Cowbell style ring
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc1.type = 'square';
        osc2.type = 'square';
        
        osc1.frequency.setValueAtTime(800, time);
        osc2.frequency.setValueAtTime(540, time); // metallic offset
        
        gain.gain.setValueAtTime(0.06 + 0.24 * vv, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(channels.drums.gain);
        
        osc1.start(time);
        osc2.start(time);
        
        osc1.stop(time + 0.15);
        osc2.stop(time + 0.15);
    }

function playPerc2(time, v) {
        const vv = Math.max(0.15, Math.min(1, typeof v === 'number' ? v : 1));
        // Woodblock style
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(900, time);
        osc.frequency.exponentialRampToValueAtTime(400, time + 0.07);
        
        gain.gain.setValueAtTime(0.1 + 0.4 * vv, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);
        
        osc.connect(gain);
        gain.connect(channels.drums.gain);
        
        osc.start(time);
        osc.stop(time + 0.07);
    }

// -------------------------------------------------------------
    // 5. INDIVIDUAL NOTE TRIGGERS (velocity scales loudness 0.15..1)
    // -------------------------------------------------------------
    function playSynthNote(track, noteIdx, time, velocity) {
        if (!audioCtx) return;
        const vel = Math.max(0.15, Math.min(1, typeof velocity === 'number' ? velocity : 1));
        const duration = state.settings.decay;

        if (track === 'lead') {
            const frequency = LEAD_PITCHES[noteIdx];
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = state.settings.waveform;
            osc.frequency.setValueAtTime(frequency, time);
            
            // Envelope attack 0.01s, decay (peak scaled by velocity)
            gain.gain.setValueAtTime(0.001, time);
            gain.gain.linearRampToValueAtTime(0.1 + 0.4 * vel, time + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
            
            osc.connect(gain);
            gain.connect(channels.lead.gain);
            
            osc.start(time);
            osc.stop(time + duration);
        }
        else if (track === 'bass') {
            const frequency = BASS_PITCHES[noteIdx];
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'triangle'; // bass sounds clean on triangle/saw mix
            osc.frequency.setValueAtTime(frequency, time);
            
            gain.gain.setValueAtTime(0.001, time);
            gain.gain.linearRampToValueAtTime(0.15 + 0.65 * vel, time + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duration * 1.5);
            
            osc.connect(gain);
            gain.connect(channels.bass.gain);
            
            osc.start(time);
            osc.stop(time + duration * 1.5);
        }
        else if (track === 'chords') {
            // Polyphonic Chord trigger!
            const chordFrequencies = CHORD_PITCHES[noteIdx];
            const chordDuration = duration * 2.5; // chord pads ring longer
            
            chordFrequencies.forEach(freq => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                
                osc.type = 'sine'; // sine pads are nice and smooth
                osc.frequency.setValueAtTime(freq, time);
                
                // Slow attack pad envelope (peak scaled by velocity)
                gain.gain.setValueAtTime(0.001, time);
                gain.gain.linearRampToValueAtTime(0.05 + 0.2 * vel, time + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, time + chordDuration);
                
                osc.connect(gain);
                gain.connect(channels.chords.gain);
                
                osc.start(time);
                osc.stop(time + chordDuration);
            });
        }
        else if (track === 'drums') {
            // Map index to respective drum synth voice (velocity-aware)
            switch(noteIdx) {
                case 0: playKick(time, vel); break;
                case 1: playSnare(time, vel); break;
                case 2: playHihat(time, true, vel); break;
                case 3: playHihat(time, false, vel); break;
                case 4: playClap(time, vel); break;
                case 5: playRimshot(time, vel); break;
                case 6: playPerc1(time, vel); break;
                case 7: playPerc2(time, vel); break;
            }
        }
    }
