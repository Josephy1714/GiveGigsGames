(function () {
    'use strict';

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterVolume = 0.8;
        this.musicVolume = 0.5;
        this.sfxVolume = 0.8;
        this.muted = false;
        this.ambientOsc1 = null;
        this.ambientOsc2 = null;
        this.ambientGain = null;
        this.ambientFilter = null;
        this.ambientLfo = null;
        this.ambientLfoGain = null;
        this.ambientPlaying = false;
    }

    initCtx() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playSfx(type, pitchMod = 1.0) {
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const mainVol = this.masterVolume * this.sfxVolume;
        if (mainVol <= 0.001) return;

        if (type === 'swing') {
            // Crisp white noise swoosh
            const bufferSize = this.ctx.sampleRate * 0.15;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(800 * pitchMod, now);
            filter.frequency.exponentialRampToValueAtTime(300 * pitchMod, now + 0.15);
            filter.Q.value = 3.0;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.3 * mainVol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start(now);
            noise.stop(now + 0.15);
        } else if (type === 'gunshot') {
            // Layer a filtered muzzle crack over a falling tonal body so each
            // weapon reads as a shot instead of a lone oscillator click.
            const bufferSize = Math.floor(this.ctx.sampleRate * 0.055);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const samples = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) samples[i] = Math.random() * 2 - 1;

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const crackFilter = this.ctx.createBiquadFilter();
            crackFilter.type = 'highpass';
            crackFilter.frequency.setValueAtTime(1500 * pitchMod, now);
            crackFilter.Q.value = 0.7;
            const crackGain = this.ctx.createGain();
            crackGain.gain.setValueAtTime(0.28 * mainVol, now);
            crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
            noise.connect(crackFilter);
            crackFilter.connect(crackGain);
            crackGain.connect(this.ctx.destination);
            noise.start(now);
            noise.stop(now + 0.055);

            const body = this.ctx.createOscillator();
            const bodyGain = this.ctx.createGain();
            body.type = 'triangle';
            body.frequency.setValueAtTime(115 * pitchMod, now);
            body.frequency.exponentialRampToValueAtTime(34, now + 0.12);
            bodyGain.gain.setValueAtTime(0.38 * mainVol, now);
            bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            body.connect(bodyGain);
            bodyGain.connect(this.ctx.destination);
            body.start(now);
            body.stop(now + 0.12);

            const thump = this.ctx.createOscillator();
            const thumpGain = this.ctx.createGain();
            thump.type = 'sine';
            thump.frequency.setValueAtTime(72 * pitchMod, now);
            thump.frequency.exponentialRampToValueAtTime(38, now + 0.095);
            thumpGain.gain.setValueAtTime(0.2 * mainVol, now);
            thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
            thump.connect(thumpGain);
            thumpGain.connect(this.ctx.destination);
            thump.start(now);
            thump.stop(now + 0.095);
        } else if (type === 'weapon_swap') {
            [0, 0.055].forEach((offset, index) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime((index === 0 ? 430 : 760) * pitchMod, now + offset);
                osc.frequency.exponentialRampToValueAtTime((index === 0 ? 210 : 360) * pitchMod, now + offset + 0.045);
                gain.gain.setValueAtTime(0.12 * mainVol, now + offset);
                gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.045);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + offset);
                osc.stop(now + offset + 0.045);
            });
        } else if (type === 'bolt_cycle') {
            [0, 0.105].forEach((offset, index) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime((index === 0 ? 520 : 760) * pitchMod, now + offset);
                osc.frequency.exponentialRampToValueAtTime((index === 0 ? 240 : 330) * pitchMod, now + offset + 0.04);
                gain.gain.setValueAtTime((index === 0 ? 0.16 : 0.12) * mainVol, now + offset);
                gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.04);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + offset);
                osc.stop(now + offset + 0.04);
            });
        } else if (type === 'footstep') {
            const bufferSize = Math.floor(this.ctx.sampleRate * 0.035);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const samples = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) samples[i] = Math.random() * 2 - 1;

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(720 * pitchMod, now);
            filter.frequency.exponentialRampToValueAtTime(260, now + 0.035);
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.15 * mainVol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(now);
            noise.stop(now + 0.04);

            const thud = this.ctx.createOscillator();
            const thudGain = this.ctx.createGain();
            thud.type = 'sine';
            thud.frequency.setValueAtTime(90 * pitchMod, now);
            thud.frequency.exponentialRampToValueAtTime(42, now + 0.065);
            thudGain.gain.setValueAtTime(0.16 * mainVol, now);
            thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
            thud.connect(thudGain);
            thudGain.connect(this.ctx.destination);
            thud.start(now);
            thud.stop(now + 0.065);
        } else if (type === 'reload') {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(460, now);
            osc.frequency.exponentialRampToValueAtTime(720, now + 0.07);
            gain.gain.setValueAtTime(0.08 * mainVol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.11);
        } else if (type === 'ward_hit' || type === 'ward_break') {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const shattered = type === 'ward_break';
            const duration = shattered ? 0.24 : 0.085;
            osc.type = shattered ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(shattered ? 780 : 540, now);
            osc.frequency.exponentialRampToValueAtTime(shattered ? 95 : 920, now + duration);
            gain.gain.setValueAtTime((shattered ? 0.32 : 0.16) * mainVol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + duration);
        } else if (type === 'hit' || type === 'hit_armor' || type === 'hit_kill') {
            // Crunchy impact with low punch
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const armor = type === 'hit_armor';
            const kill = type === 'hit_kill';
            osc.type = armor ? 'triangle' : 'sawtooth';
            osc.frequency.setValueAtTime((armor ? 1180 : kill ? 310 : 160) * pitchMod, now);
            osc.frequency.exponentialRampToValueAtTime(armor ? 520 : kill ? 55 : 20, now + 0.12);
            gain.gain.setValueAtTime(0.4 * mainVol, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.12);
        } else if (type === 'crit') {
            // High punchy chime + explosion
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880 * pitchMod, now);
            osc.frequency.exponentialRampToValueAtTime(220, now + 0.2);
            gain.gain.setValueAtTime(0.5 * mainVol, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'block') {
            // High metallic parry ding
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1100, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.25);
            gain.gain.setValueAtTime(0.45 * mainVol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'spell') {
            // Mystical rising zap
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(320 * pitchMod, now);
            osc.frequency.exponentialRampToValueAtTime(950 * pitchMod, now + 0.22);
            gain.gain.setValueAtTime(0.35 * mainVol, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.22);
        } else if (type === 'explode') {
            // Deep bass rumble
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(90, now);
            osc.frequency.exponentialRampToValueAtTime(10, now + 0.35);
            gain.gain.setValueAtTime(0.6 * mainVol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.35);
        } else if (type === 'loot') {
            // Ascending bright chime
            [523.25, 659.25, 783.99].forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.05);
                gain.gain.setValueAtTime(0.25 * mainVol, now + idx * 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.18);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + idx * 0.05);
                osc.stop(now + idx * 0.05 + 0.18);
            });
        } else if (type === 'potion') {
            // Liquid gulp
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(500, now + 0.08);
            osc.frequency.exponentialRampToValueAtTime(250, now + 0.16);
            gain.gain.setValueAtTime(0.3 * mainVol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'levelup') {
            // Triumphant 4-note chord fanfare
            [440, 554.37, 659.25, 880].forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.09);
                gain.gain.setValueAtTime(0.35 * mainVol, now + idx * 0.09);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.4);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + idx * 0.09);
                osc.stop(now + idx * 0.09 + 0.4);
            });
        } else if (type === 'horde_warning') {
            // A rattling rise distinct from the boss roar, signaling a pack
            // entering through the routes around the player.
            const duration = 0.42;
            const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * duration), this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
            const noise = this.ctx.createBufferSource();
            const filter = this.ctx.createBiquadFilter();
            const noiseGain = this.ctx.createGain();
            noise.buffer = buffer;
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(520 * pitchMod, now);
            filter.frequency.exponentialRampToValueAtTime(1500 * pitchMod, now + duration * 0.75);
            filter.Q.value = 2.5;
            noiseGain.gain.setValueAtTime(0.001, now);
            noiseGain.gain.linearRampToValueAtTime(0.22 * mainVol, now + 0.05);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(now);
            noise.stop(now + duration);

            const call = this.ctx.createOscillator();
            const callGain = this.ctx.createGain();
            call.type = 'triangle';
            call.frequency.setValueAtTime(360 * pitchMod, now + 0.08);
            call.frequency.exponentialRampToValueAtTime(170 * pitchMod, now + duration);
            callGain.gain.setValueAtTime(0.001, now + 0.08);
            callGain.gain.linearRampToValueAtTime(0.18 * mainVol, now + 0.13);
            callGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            call.connect(callGain);
            callGain.connect(this.ctx.destination);
            call.start(now + 0.08);
            call.stop(now + duration);
        } else if (type === 'boss_roar') {
            // Low rumbling beast roar
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(70, now);
            osc.frequency.linearRampToValueAtTime(110, now + 0.25);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.7);
            gain.gain.setValueAtTime(0.55 * mainVol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.7);
        }
    }

    _ambientTarget() {
        if (this.muted) return 0;
        const t = 0.08 * this.masterVolume * this.musicVolume;
        return Math.min(0.1, Math.max(0, t));
    }

    _applyAmbientGain() {
        if (!this.ctx || !this.ambientGain) return;
        try {
            const t = this._ambientTarget();
            const now = this.ctx.currentTime;
            this.ambientGain.gain.cancelScheduledValues(now);
            this.ambientGain.gain.setTargetAtTime(t, now, 0.08);
        } catch (e) {}
    }

    setMuted(muted) {
        this.muted = !!muted;
        this._applyAmbientGain();
        return this.muted;
    }

    toggleMute() {
        return this.setMuted(!this.muted);
    }

    startAmbientMusic() {
        // Constant background hum disabled
        return;
        this.initCtx();
        if (!this.ctx) return;
        if (this.ctx.state === 'closed') return;
        // Restart guard: never stack oscillators.
        if (this.ambientPlaying || this.ambientOsc1 || this.ambientOsc2) return;

        try {
            const now = this.ctx.currentTime;
            const target = this._ambientTarget();

            this.ambientGain = this.ctx.createGain();
            // Slow attack: start silent, bloom to quiet bed (<=0.1).
            this.ambientGain.gain.setValueAtTime(0.0001, now);
            this.ambientGain.gain.linearRampToValueAtTime(Math.max(0.0001, target), now + 2.5);

            this.ambientFilter = this.ctx.createBiquadFilter();
            this.ambientFilter.type = 'lowpass';
            this.ambientFilter.frequency.setValueAtTime(520, now);

            // Quiet musical bed: detuned triangle/sine pair on A2 (110Hz).
            this.ambientOsc1 = this.ctx.createOscillator();
            this.ambientOsc1.type = 'triangle';
            this.ambientOsc1.frequency.setValueAtTime(110, now);
            this.ambientOsc1.detune.setValueAtTime(-6, now);

            this.ambientOsc2 = this.ctx.createOscillator();
            this.ambientOsc2.type = 'sine';
            this.ambientOsc2.frequency.setValueAtTime(110, now);
            this.ambientOsc2.detune.setValueAtTime(7, now);

            // Gentle tremolo LFO on bed level.
            this.ambientLfo = this.ctx.createOscillator();
            this.ambientLfo.type = 'sine';
            this.ambientLfo.frequency.setValueAtTime(3.5, now);
            this.ambientLfoGain = this.ctx.createGain();
            this.ambientLfoGain.gain.setValueAtTime(Math.max(0.0001, target * 0.3), now);
            this.ambientLfo.connect(this.ambientLfoGain);
            this.ambientLfoGain.connect(this.ambientGain.gain);

            this.ambientOsc1.connect(this.ambientFilter);
            this.ambientOsc2.connect(this.ambientFilter);
            this.ambientFilter.connect(this.ambientGain);
            this.ambientGain.connect(this.ctx.destination);

            this.ambientOsc1.start(now);
            this.ambientOsc2.start(now);
            this.ambientLfo.start(now);
            this.ambientPlaying = true;
        } catch (e) {
            // Audio autoplay might be blocked until user gesture: full cleanup.
            this._teardownAmbientNodes();
        }
    }

    _teardownAmbientNodes() {
        const nodes = ['ambientOsc1', 'ambientOsc2', 'ambientLfo'];
        for (const key of nodes) {
            const n = this[key];
            if (n) {
                try { n.stop(); } catch (e) {}
                try { n.disconnect(); } catch (e) {}
                this[key] = null;
            }
        }
        if (this.ambientLfoGain) {
            try { this.ambientLfoGain.disconnect(); } catch (e) {}
            this.ambientLfoGain = null;
        }
        if (this.ambientFilter) {
            try { this.ambientFilter.disconnect(); } catch (e) {}
            this.ambientFilter = null;
        }
        if (this.ambientGain) {
            try { this.ambientGain.disconnect(); } catch (e) {}
            this.ambientGain = null;
        }
        this.ambientPlaying = false;
    }

    stopAmbientMusic() {
        this._teardownAmbientNodes();
    }

    speak(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.volume = Math.min(1.0, this.masterVolume);
            u.rate = 1.05;
            window.speechSynthesis.speak(u);
        }
    }
}

    window.GraveGainSoundEngine = SoundEngine;
})();
