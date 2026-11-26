// Storm Courier — tiny WebAudio sound effects, synthesized, no audio files.
// Everything is guarded: if the browser has no audio, the game plays silent.
export function createSound() {
  let context = null;
  let engineOsc = null;
  let engineGain = null;
  let muted = false;

  function ensureContext() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
      // A low engine hum whose pitch follows speed.
      engineOsc = context.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 62;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      engineGain = context.createGain();
      engineGain.gain.value = 0.0;
      engineOsc.connect(filter).connect(engineGain).connect(context.destination);
      engineOsc.start();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, duration, type, volume, when = 0) {
    if (muted) return;
    const ctx = ensureContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const start = ctx.currentTime + when;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    } catch {
      // Sound must never break the game.
    }
  }

  function noiseBurst(duration, volume) {
    if (muted) return;
    const ctx = ensureContext();
    if (!ctx) return;
    try {
      const length = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = volume;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 900;
      source.connect(filter).connect(gain).connect(ctx.destination);
      source.start();
    } catch {
      // Sound must never break the game.
    }
  }

  return {
    unlock() {
      const ctx = ensureContext();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    setEngine(speedRatio, boosting) {
      if (!engineGain || !engineOsc) return;
      try {
        engineGain.gain.value = 0.045 + speedRatio * 0.03 + (boosting ? 0.03 : 0);
        engineOsc.frequency.value = 58 + speedRatio * 46 + (boosting ? 26 : 0);
      } catch {
        // Ignore audio errors mid-flight.
      }
    },
    ring() {
      tone(880, 0.14, 'sine', 0.16);
      tone(1318, 0.2, 'sine', 0.14, 0.07);
    },
    boost() {
      noiseBurst(0.45, 0.12);
      tone(220, 0.4, 'triangle', 0.08);
    },
    thunder() {
      noiseBurst(0.9, 0.1);
    },
    crash() {
      noiseBurst(0.7, 0.22);
      tone(70, 0.6, 'sawtooth', 0.16);
    },
    win() {
      [523, 659, 784, 1046].forEach((freq, i) => tone(freq, 0.22, 'triangle', 0.14, i * 0.11));
    },
    toggleMute() {
      muted = !muted;
      if (engineGain) engineGain.gain.value = 0;
      return muted;
    },
  };
}
