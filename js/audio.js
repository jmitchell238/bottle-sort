'use strict';

let audioCtx = null;

function ensureAudio() {
  if (save.muted) return null;
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function beep({ freq = 440, dur = 0.08, type = 'sine', gain = 0.04, slide = 0 } = {}) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function sfxSelect() {
  beep({ freq: 480, dur: 0.05, type: 'sine', gain: 0.025 });
}

function sfxPour(units) {
  const n = Math.max(1, units | 0);
  beep({ freq: 280 + n * 30, dur: 0.1, type: 'triangle', gain: 0.04, slide: 60 });
  setTimeout(() => beep({ freq: 360 + n * 20, dur: 0.07, type: 'sine', gain: 0.025 }), 50);
}

function sfxInvalid() {
  beep({ freq: 180, dur: 0.1, type: 'sawtooth', gain: 0.02, slide: -40 });
}

function sfxWin() {
  beep({ freq: 440, dur: 0.1, type: 'sine', gain: 0.04, slide: 80 });
  setTimeout(() => beep({ freq: 554, dur: 0.1, type: 'sine', gain: 0.04 }), 90);
  setTimeout(() => beep({ freq: 659, dur: 0.16, type: 'sine', gain: 0.045, slide: 40 }), 180);
}

function sfxClick() {
  beep({ freq: 520, dur: 0.04, type: 'square', gain: 0.02 });
}

function sfxUndo() {
  beep({ freq: 360, dur: 0.06, type: 'triangle', gain: 0.03, slide: -50 });
}
