/**
 * audio.js - Web Audio Synthesis Engine
 * Synthesizes dynamic retro sounds and feedback chimes without external assets.
 */
window.VMAudio = (function() {
    let audioCtx = null;
    let isMuted = false;

    function getContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.15) {
        if (isMuted) return;
        const ctx = getContext();
        if (!ctx) return;

        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            
            gain.gain.setValueAtTime(gainVal, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            // Audio policy failure silently suppressed
        }
    }

    function playPreset(presetName) {
        if (isMuted) return;
        const freqs = window.VM_CONSTANTS.SOUND_PRESETS[presetName] || [440];
        freqs.forEach((f, idx) => {
            setTimeout(() => {
                playTone(f, 'sine', 0.12, 0.12);
            }, idx * 60);
        });
    }

    function setMuted(val) {
        isMuted = !!val;
    }

    function toggleMute() {
        isMuted = !isMuted;
        return isMuted;
    }

    return {
        playTone,
        playPreset,
        setMuted,
        toggleMute,
        isMuted: () => isMuted
    };
})();
