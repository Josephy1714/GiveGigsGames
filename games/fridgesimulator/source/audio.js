

function initAudio() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return null;
    try {
        if (!audioCtx) audioCtx = new Audio();
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    } catch {
        // Audio is optional for gameplay.
    }
    return audioCtx;
}

function toggleSound() {
    soundMuted = !soundMuted;
    const btn = document.getElementById('btnSoundToggle');
    if (btn) {
        btn.textContent = soundMuted ? '🔇 Sound: OFF' : '🔊 Sound: ON';
        btn.style.color = soundMuted ? '#ef4444' : '#10b981';
    }
}

function playSound(type) {
    if (soundMuted) return;
    try {
        const ctx = initAudio();
        if (!ctx) return;
        const now = ctx.currentTime;
        
        switch(type) {
            case 'buy': {
                const o1 = ctx.createOscillator();
                const g1 = ctx.createGain();
                o1.connect(g1); g1.connect(ctx.destination);
                o1.type = 'sine';
                o1.frequency.setValueAtTime(880, now);
                o1.frequency.setValueAtTime(1320, now + 0.08);
                g1.gain.setValueAtTime(0.18, now);
                g1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                o1.start(now); o1.stop(now + 0.25);
                break;
            }
            case 'stock': {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.connect(g); g.connect(ctx.destination);
                o.type = 'triangle';
                o.frequency.setValueAtTime(220, now);
                o.frequency.exponentialRampToValueAtTime(60, now + 0.12);
                g.gain.setValueAtTime(0.2, now);
                g.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
                o.start(now); o.stop(now + 0.14);
                break;
            }
            case 'feed': {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.connect(g); g.connect(ctx.destination);
                o.type = 'triangle';
                o.frequency.setValueAtTime(300, now);
                o.frequency.linearRampToValueAtTime(450, now + 0.06);
                o.frequency.linearRampToValueAtTime(320, now + 0.12);
                g.gain.setValueAtTime(0.15, now);
                g.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                o.start(now); o.stop(now + 0.15);
                break;
            }
            case 'autofeed': {
                [440, 554.37, 659.25, 880].forEach((freq, i) => {
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.connect(g); g.connect(ctx.destination);
                    o.type = 'sine';
                    o.frequency.setValueAtTime(freq, now + i * 0.05);
                    g.gain.setValueAtTime(0.12, now + i * 0.05);
                    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.18);
                    o.start(now + i * 0.05); o.stop(now + i * 0.05 + 0.18);
                });
                break;
            }
            case 'nextday': {
                [261.63, 329.63, 392.00, 523.25].forEach((f, idx) => {
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.connect(g); g.connect(ctx.destination);
                    o.type = 'sine';
                    o.frequency.setValueAtTime(f, now + idx * 0.04);
                    g.gain.setValueAtTime(0.12, now + idx * 0.04);
                    g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.4);
                    o.start(now + idx * 0.04); o.stop(now + idx * 0.04 + 0.4);
                });
                break;
            }
            case 'unlock': {
                [523.25, 659.25, 783.99, 1046.50].forEach((f, idx) => {
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.connect(g); g.connect(ctx.destination);
                    o.type = 'triangle';
                    o.frequency.setValueAtTime(f, now + idx * 0.08);
                    g.gain.setValueAtTime(0.18, now + idx * 0.08);
                    g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
                    o.start(now + idx * 0.08); o.stop(now + idx * 0.08 + 0.35);
                });
                break;
            }
            case 'death': {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.connect(g); g.connect(ctx.destination);
                o.type = 'sawtooth';
                o.frequency.setValueAtTime(160, now);
                o.frequency.exponentialRampToValueAtTime(45, now + 0.6);
                g.gain.setValueAtTime(0.25, now);
                g.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
                o.start(now); o.stop(now + 0.7);
                break;
            }
        }
    } catch(e) {}
}
