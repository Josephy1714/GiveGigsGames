/* GraveGain2DE: Smash Slash Bash Mash — Procedural Web Audio Engine */
(function () {
  'use strict';

  const MUTE_KEY = 'gravegain2dE:muted';
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (_) {}

  function ensure() {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ctx = new AC();
      }
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch (_) {}
    return ctx;
  }

  function tone(freq, endFreq, dur, type, vol, delay) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    try {
      const t0 = c.currentTime + (delay || 0);
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type || 'triangle';
      osc.frequency.setValueAtTime(Math.max(30, freq), t0);
      if (endFreq && endFreq !== freq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), t0 + dur);
      }
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(vol || 0.12, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (_) {}
  }

  function noise(dur, vol, filterFreq, delay) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    try {
      const len = Math.max(1, Math.floor(c.sampleRate * dur));
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource();
      src.buffer = buf;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq || 1200;
      const gain = c.createGain();
      const t0 = c.currentTime + (delay || 0);
      gain.gain.setValueAtTime(vol || 0.14, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      src.start(t0);
    } catch (_) {}
  }

  function play(kind, intensity) {
    if (muted) return;
    const p = intensity || 1;
    switch (kind) {
      case 'select':
        tone(520, 740, 0.07, 'triangle', 0.08);
        break;
      case 'start':
        tone(330, 440, 0.1, 'triangle', 0.12, 0);
        tone(440, 660, 0.12, 'triangle', 0.12, 0.09);
        tone(660, 880, 0.2, 'sawtooth', 0.11, 0.18);
        break;
      case 'jump':
        tone(250, 480, 0.1, 'sine', 0.09);
        break;
      case 'doublejump':
        tone(360, 680, 0.12, 'triangle', 0.1);
        break;
      case 'dash':
        noise(0.11, 0.09, 1400);
        tone(420, 180, 0.11, 'sawtooth', 0.06);
        break;
      case 'swing':
        noise(0.08, 0.08, 2200);
        tone(290, 140, 0.08, 'triangle', 0.06);
        break;
      case 'hit':
        noise(0.09 * p, 0.14 * Math.min(1.4, p), 1800);
        tone(190 * p, 58, 0.12 * p, 'square', 0.12);
        break;
      case 'smash':
        noise(0.18, 0.22, 1600);
        tone(240, 45, 0.24, 'sawtooth', 0.18);
        tone(480, 120, 0.14, 'square', 0.1, 0.02);
        break;
      case 'shield':
        tone(640, 420, 0.08, 'sine', 0.09);
        break;
      case 'shieldbreak':
        noise(0.3, 0.2, 2400);
        tone(760, 140, 0.35, 'sawtooth', 0.15);
        break;
      case 'counter':
        tone(660, 990, 0.08, 'triangle', 0.13);
        tone(990, 1320, 0.14, 'sine', 0.12, 0.06);
        break;
      case 'proj':
        tone(680, 260, 0.1, 'square', 0.07);
        break;
      case 'heal':
        tone(440, 660, 0.12, 'sine', 0.09, 0);
        tone(660, 880, 0.16, 'sine', 0.09, 0.08);
        break;
      case 'ledge':
        tone(220, 320, 0.06, 'triangle', 0.07);
        break;
      case 'orb':
        tone(523, 784, 0.14, 'sine', 0.12, 0);
        tone(784, 1046, 0.2, 'triangle', 0.12, 0.08);
        break;
      case 'ultimate':
        noise(0.36, 0.24, 2400);
        tone(180, 720, 0.22, 'sawtooth', 0.16, 0);
        tone(720, 110, 0.38, 'square', 0.16, 0.16);
        break;
      case 'ko':
        noise(0.34, 0.25, 1100);
        tone(310, 46, 0.42, 'sawtooth', 0.18);
        tone(160, 36, 0.45, 'triangle', 0.15, 0.05);
        break;
      case 'tick':
        tone(440, 440, 0.08, 'triangle', 0.1);
        break;
      case 'go':
        tone(587, 880, 0.24, 'sawtooth', 0.14);
        break;
      case 'win':
        tone(440, 440, 0.11, 'triangle', 0.12, 0);
        tone(554, 554, 0.11, 'triangle', 0.12, 0.11);
        tone(659, 659, 0.12, 'triangle', 0.12, 0.22);
        tone(880, 880, 0.34, 'sawtooth', 0.13, 0.34);
        break;
      default:
        break;
    }
  }

  window.GG2DE_AUDIO = {
    unlock: ensure,
    play,
    isMuted: () => muted,
    toggleMute: () => {
      muted = !muted;
      try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (_) {}
      return muted;
    }
  };
})();
