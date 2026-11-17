

    // Initialize Audio Context safely upon user gesture
    function initAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }

// Play a single note
    function playNote(frequency, duration = 0.3, waveType = 'sine', row = 0) {
        if (!audioContext || isMuted) return;

        const now = audioContext.currentTime;
        const env = 0.05;

        // Oscillator
        const osc = audioContext.createOscillator();
        osc.type = waveType;
        osc.frequency.value = frequency;

        // Gain envelope
        const gain = audioContext.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.start(now);
        osc.stop(now + duration);
    }
