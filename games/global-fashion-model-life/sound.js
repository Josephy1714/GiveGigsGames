"use strict";
const soundFX = (() => {
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem("gfml-muted") === "1"; } catch {}

  function ensure() {
    if (muted) return null;
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, dur, type = "sine", vol = 0.08, delay = 0) {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  return {
    isMuted: () => muted,
    toggle() {
      muted = !muted;
      try { localStorage.setItem("gfml-muted", muted ? "1" : "0"); } catch {}
      if (!muted) tone(523.25, 0.08, "triangle", 0.06);
      return muted;
    },
    tap() { tone(420, 0.045, "triangle", 0.035); },
    shutter() {
      const c = ensure();
      if (!c) return;
      const len = Math.floor(c.sampleRate * 0.055);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.25));
      const src = c.createBufferSource();
      const gain = c.createGain();
      src.buffer = buf;
      gain.gain.value = 0.14;
      src.connect(gain);
      gain.connect(c.destination);
      src.start();
    },
    beat(tier) {
      if (tier === "perfect") { tone(659.25, 0.12, "triangle", 0.09); tone(880, 0.18, "sine", 0.08, 0.06); }
      else if (tier === "good") { tone(523.25, 0.12, "triangle", 0.07); }
      else { tone(220, 0.16, "sawtooth", 0.05); }
    },
    cash() {
      tone(783.99, 0.09, "triangle", 0.07);
      tone(1046.5, 0.18, "triangle", 0.08, 0.07);
    },
    fanfare() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.22, "triangle", 0.08, i * 0.08));
    },
    flight() {
      tone(392, 0.15, "sine", 0.06);
      tone(523.25, 0.2, "sine", 0.06, 0.12);
      tone(659.25, 0.28, "sine", 0.06, 0.24);
    }
  };
})();
