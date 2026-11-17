

// Sound Synthesizer Class using Web Audio API
class SoundFX {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.muted = store.get('orbitaldrift_muted', '0') === '1';
        this.volume = parseFloat(store.get('orbitaldrift_volume', '0.8')) || 0.8;
        this.thrustOsc = null;
        this.thrustGain = null;
        this.musicInterval = null;
        this.musicTick = 0;
        this.tempo = 140;
        this.scale = [130.81, 146.83, 155.56, 174.61, 196.00, 207.65, 233.08, 261.63];
        this.dangerTimer = 0;
    }

    init() {
        if (this.ctx) {
            if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
            return true;
        }
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return false;
            this.ctx = new AC();
            const g = this.ctx.createGain();
            g.gain.value = this.muted ? 0 : this.volume;
            const comp = this.ctx.createDynamicsCompressor();
            comp.threshold.value = -18; comp.ratio.value = 8;
            g.connect(comp); comp.connect(this.ctx.destination);
            this.master = g;
            if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
            return true;
        } catch { this.ctx = null; return false; }
    }

    out() { return this.master || (this.ctx && this.ctx.destination); }

    setVolume(v) {
        this.volume = v;
        store.set('orbitaldrift_volume', String(v));
        if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : v, this.ctx.currentTime, 0.03);
    }

    toggleMute() {
        this.muted = !this.muted;
        store.set('orbitaldrift_muted', this.muted ? '1' : '0');
        if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.03);
        return this.muted;
    }

    startMusic() {
        if (!this.init()) return;
        if (this.musicInterval) return;
        const noteLength = 60 / this.tempo / 2;
        this.musicInterval = setInterval(() => {
            if (this.muted || !gameActive || isPaused) return;
            this.playBeatStep();
        }, noteLength * 1000);
    }

    stopMusic() {
        if (this.musicInterval) { clearInterval(this.musicInterval); this.musicInterval = null; }
    }

    setTempo(bpm) {
        if (bpm === this.tempo) return;
        this.tempo = bpm;
        if (this.musicInterval) { this.stopMusic(); this.startMusic(); }
    }

    playBeatStep() {
        if (!this.ctx || !this.out()) return;
        const now = this.ctx.currentTime;
        const tick = this.musicTick % 16;
        let noteIndex = 0;
        if (tick < 4) noteIndex = 0;
        else if (tick < 8) noteIndex = 2;
        else if (tick < 12) noteIndex = 4;
        else noteIndex = 6;
        if (tick % 4 === 0 || tick % 4 === 2 || (tick % 4 === 3 && Math.random() > 0.5)) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const freq = this.scale[noteIndex] / 2;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.connect(gain); gain.connect(this.out());
            osc.start(now); osc.stop(now + 0.2);
        }
        if (tick % 8 === 3 && Math.random() > 0.3) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const melodyNote = this.scale[Math.floor(Math.random() * this.scale.length)];
            osc.type = 'sine';
            osc.frequency.setValueAtTime(melodyNote, now);
            gain.gain.setValueAtTime(0.02, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.connect(gain); gain.connect(this.out());
            osc.start(now); osc.stop(now + 0.4);
        }
        this.musicTick++;
    }

    playCollect(chain = 0) {
        if (this.muted || !this.init() || !this.ctx) return;
        const now = this.ctx.currentTime;
        const step = Math.min(12, Math.floor(chain * 0.6));
        const base = 523.25 * Math.pow(2, step / 12);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(base, now);
        osc.frequency.exponentialRampToValueAtTime(base * 2, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain); gain.connect(this.out());
        osc.start(now); osc.stop(now + 0.15);
    }

    playComboLost() {
        if (this.muted || !this.init() || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.15);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain); gain.connect(this.out());
        osc.start(now); osc.stop(now + 0.15);
    }

    playNearMiss() {
        if (this.muted || !this.init() || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain); gain.connect(this.out());
        osc.start(now); osc.stop(now + 0.08);
    }

    playPhaseUp() {
        if (this.muted || !this.init() || !this.ctx) return;
        const now = this.ctx.currentTime;
        [440, 554, 659, 880].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.07);
            gain.gain.setValueAtTime(0.09, now + idx * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);
            osc.connect(gain); gain.connect(this.out());
            osc.start(now + idx * 0.07); osc.stop(now + idx * 0.07 + 0.25);
        });
    }

    playPowerUp() {
        if (this.muted || !this.init() || !this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [392.00, 523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.05);
            gain.gain.setValueAtTime(0.1, now + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);
            osc.connect(gain); gain.connect(this.out());
            osc.start(now + idx * 0.05); osc.stop(now + idx * 0.05 + 0.25);
        });
    }

    playHit() {
        if (this.muted || !this.init() || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(30, now + 0.4);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(90, now);
        osc2.frequency.linearRampToValueAtTime(10, now + 0.4);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain); osc2.connect(gain); gain.connect(this.out());
        osc.start(now); osc2.start(now);
        osc.stop(now + 0.4); osc2.stop(now + 0.4);
        // noise burst layer
        try {
            const len = Math.floor(this.ctx.sampleRate * 0.2);
            const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
            const src = this.ctx.createBufferSource(); src.buffer = buf;
            const f = this.ctx.createBiquadFilter(); f.type = 'lowpass';
            f.frequency.setValueAtTime(3000, now);
            f.frequency.exponentialRampToValueAtTime(200, now + 0.2);
            const ng = this.ctx.createGain(); ng.gain.setValueAtTime(0.25, now);
            ng.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            src.connect(f); f.connect(ng); ng.connect(this.out());
            src.start(now);
        } catch {}
    }

    playShieldBlock() {
        if (this.muted || !this.init() || !this.ctx) return;
        const now = this.ctx.currentTime;
        [1200, 1800].forEach((freq) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.connect(gain); gain.connect(this.out());
            osc.start(now); osc.stop(now + 0.25);
        });
    }

    playThrust(active) {
        if (this.muted || !active) { this.stopThrust(); return; }
        if (!this.init() || !this.ctx) return;
        if (this.thrustOsc) return;
        const now = this.ctx.currentTime;
        this.thrustOsc = this.ctx.createOscillator();
        this.thrustGain = this.ctx.createGain();
        this.thrustOsc.type = 'triangle';
        this.thrustOsc.frequency.setValueAtTime(80, now);
        this.thrustGain.gain.setValueAtTime(0.06, now);
        this.thrustOsc.connect(this.thrustGain);
        this.thrustGain.connect(this.out());
        this.thrustOsc.start(now);
    }

    stopThrust() {
        if (this.thrustOsc) {
            try { this.thrustOsc.stop(); } catch {}
            try { this.thrustOsc.disconnect(); } catch {}
            try { this.thrustGain && this.thrustGain.disconnect(); } catch {}
            this.thrustOsc = null; this.thrustGain = null;
        }
    }

    updateThrustFreq(radiusRatio) {
        if (this.thrustOsc && !this.muted && this.ctx) {
            const freq = 60 + (radiusRatio * 90);
            this.thrustOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
        }
    }

    updateDangerLoop(integrity) {
        if (!this.ctx || this.muted || !gameActive || isPaused) return;
        const now = performance.now();
        if (integrity <= maxIntegrity * 0.3 && now - this.dangerTimer > 900) {
            this.dangerTimer = now;
            const t = this.ctx.currentTime;
            [880, 660].forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine'; osc.frequency.setValueAtTime(freq, t + i * 0.12);
                gain.gain.setValueAtTime(0.045, t + i * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.1);
                osc.connect(gain); gain.connect(this.out());
                osc.start(t + i * 0.12); osc.stop(t + i * 0.12 + 0.1);
            });
        }
    }

    playStart() {
        if (this.muted || !this.init() || !this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            gain.gain.setValueAtTime(0.08, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);
            osc.connect(gain); gain.connect(this.out());
            osc.start(now + idx * 0.08); osc.stop(now + idx * 0.08 + 0.3);
        });
    }
}
