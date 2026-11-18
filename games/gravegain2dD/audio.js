(() => {
  const MUTE_KEY = 'gravegain2dD-muted';
  let ctx = null;
  let muted = false;
  let musicTimer = null;
  let stepIndex = 0;

  try {
    muted = localStorage.getItem(MUTE_KEY) === '1';
  } catch {}

  function ensureContext() {
    if (muted) return null;
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function tone(freq, duration, type = 'sine', gainVal = 0.08, slideTo = null, delay = 0) {
    const audio = ensureContext();
    if (!audio) return;
    const now = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function noise(duration, gainVal = 0.05, filterFreq = 900) {
    const audio = ensureContext();
    if (!audio) return;
    const sampleCount = Math.max(1, Math.floor(audio.sampleRate * duration));
    const buffer = audio.createBuffer(1, sampleCount, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) data[i] = Math.random() * 2 - 1;
    const src = audio.createBufferSource();
    src.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = audio.createGain();
    const now = audio.currentTime;
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    src.start(now);
  }

  const sfx = {
    step() {
      noise(0.045, 0.025, 420);
    },
    jump() {
      tone(220, 0.14, 'triangle', 0.07, 460);
    },
    wallJump() {
      tone(290, 0.16, 'triangle', 0.08, 620);
    },
    vault() {
      tone(340, 0.12, 'sine', 0.08, 680);
      tone(510, 0.16, 'triangle', 0.06, 880, 0.05);
    },
    stomp() {
      tone(190, 0.11, 'square', 0.07, 90);
      tone(440, 0.14, 'triangle', 0.07, 740, 0.04);
    },
    shard(combo = 1) {
      const base = 523.25 * Math.pow(1.06, Math.min(combo - 1, 10));
      tone(base, 0.11, 'sine', 0.07);
      tone(base * 1.5, 0.15, 'triangle', 0.05, null, 0.04);
    },
    ward() {
      tone(660, 0.18, 'sawtooth', 0.06, 220);
      noise(0.14, 0.05, 1600);
    },
    hit() {
      tone(150, 0.24, 'sawtooth', 0.09, 55);
      noise(0.2, 0.07, 320);
    },
    draft() {
      tone(392, 0.14, 'triangle', 0.06);
      tone(523.25, 0.18, 'triangle', 0.06, null, 0.07);
      tone(659.25, 0.24, 'sine', 0.06, null, 0.14);
    },
    warden() {
      tone(110, 0.45, 'sawtooth', 0.07, 78);
      tone(164.8, 0.45, 'triangle', 0.05, 110, 0.06);
    }
  };

  const scale = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 392];

  function startMusic() {
    if (musicTimer || muted) return;
    musicTimer = setInterval(() => {
      if (muted || !ctx || ctx.state !== 'running') return;
      const note = scale[stepIndex % scale.length];
      stepIndex++;
      tone(note, 0.28, 'sine', 0.022);
      if (stepIndex % 4 === 0) tone(note * 0.5, 0.45, 'triangle', 0.025);
    }, 340);
  }

  function stopMusic() {
    if (musicTimer) {
      clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  function setMuted(next) {
    muted = Boolean(next);
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {}
    if (muted) stopMusic();
    else {
      ensureContext();
      startMusic();
    }
    return muted;
  }

  window.GraveGainAudio = {
    sfx,
    startMusic,
    stopMusic,
    isMuted: () => muted,
    toggleMute: () => setMuted(!muted),
    unlock: () => {
      ensureContext();
      startMusic();
    }
  };
})();
