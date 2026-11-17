
function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}


function playSound(type, pitchStep) {
    const ctx = getAudioContext();
    if (!ctx) return;
    // Combo raises the pitch: each streak step adds ~6% for a rising reward feel.
    const pitch = 1 + Math.min(Math.max(pitchStep || 0, 0), 8) * 0.06;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'whack-bad') {
        // High pitched retro ping
        osc.frequency.setValueAtTime(400 * pitch, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000 * pitch, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
    } else if (type === 'whack-good') {
        // Harsh error buzz
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.setValueAtTime(100, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.31);
    } else if (type === 'escape') {
        // Decrescendo swoosh/alarm
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.36);
    } else if (type === 'start') {
        // Upbeat chime sequence
        const notes = [300, 400, 500, 600];
        notes.forEach((freq, idx) => {
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.connect(g);
            g.connect(audioCtx.destination);
            o.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.1);
            g.gain.setValueAtTime(0.1, audioCtx.currentTime + idx * 0.1);
            g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + idx * 0.1 + 0.15);
            o.start(audioCtx.currentTime + idx * 0.1);
            o.stop(audioCtx.currentTime + idx * 0.1 + 0.16);
        });
    }
}
