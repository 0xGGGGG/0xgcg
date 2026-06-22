// ---------------------------------------------------------------------------
// Per-stage soundtrack + waveform data. Each act gets its own loop. By default
// the loop is synthesized (royalty-free, in the dark drone/pulse spirit of
// SCRIPT §10) so nothing copyrighted is bundled; drop assets/<id>.(mp3|ogg|webm)
// to override a stage with a licensed track.
//
// Waveform peaks are computed from a plain Float32Array (no AudioContext, so
// the timeline can render before any user gesture); the AudioContext is only
// created for playback, on the first gesture.
// ---------------------------------------------------------------------------

const SR = 44100;   // synth sample rate (AudioBuffer declares it; ctx resamples)
const DUR = 16;     // seconds per generated loop

const PARAMS = {
  init:     { base: 48, pulse: 0.30, noise: 0.04, mode: 'drone',  amp: 0.55 },
  grow:     { base: 62, pulse: 0.50, noise: 0.07, mode: 'breath', amp: 0.62 },
  optimize: { base: 55, pulse: 0.85, noise: 0.10, mode: 'click',  amp: 0.62 },
  overfit:  { base: 50, pulse: 1.40, noise: 0.16, mode: 'buzz',   amp: 0.66 },
  glitch:   { base: 44, pulse: 2.20, noise: 0.24, mode: 'broken', amp: 0.70 },
};

const rng = (s) => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;

export class Soundtrack {
  constructor() {
    this.ctx = null;
    this.gain = null;
    this.data = {};       // id -> Float32Array (synth)
    this.peaksCache = {}; // id -> Float32Array (waveform)
    this.buffers = {};    // id -> AudioBuffer (built on demand for playback)
    this.src = null;
    this.curId = null;
    this.startedAt = 0;
    this.pausedAt = 0;
    this.playing = false;
  }

  _data(id) {
    if (!this.data[id]) this.data[id] = synth(id);
    return this.data[id];
  }
  peaks(id, count = 200) {
    const key = id + ':' + count;
    if (!this.peaksCache[key]) this.peaksCache[key] = peaksOf(this._data(id), count);
    return this.peaksCache[key];
  }
  duration(id) { return this._data(id).length / SR; }

  _ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0.7;
    this.gain.connect(this.ctx.destination);
    return this.ctx;
  }
  async resume() { this._ensure(); if (this.ctx.state === 'suspended') { try { await this.ctx.resume(); } catch {} } }

  _buffer(id) {
    if (this.buffers[id]) return this.buffers[id];
    const ctx = this._ensure();
    const arr = this._data(id);
    const buf = ctx.createBuffer(1, arr.length, SR);
    buf.getChannelData(0).set(arr);
    this.buffers[id] = buf;
    tryLoad(ctx, id).then((real) => { if (real) { this.buffers[id] = real; } });
    return buf;
  }

  play(id, offset = 0) {
    this._ensure();
    this.stopSrc();
    const buf = this._buffer(id);
    const off = ((offset % buf.duration) + buf.duration) % buf.duration;
    const s = this.ctx.createBufferSource();
    s.buffer = buf; s.loop = true; s.connect(this.gain);
    s.start(0, off);
    this.src = s; this.curId = id; this.playing = true;
    this.startedAt = this.ctx.currentTime - off;
  }
  stopSrc() { if (this.src) { try { this.src.stop(); } catch {} this.src.disconnect(); this.src = null; } this.playing = false; }
  pause() { if (this.playing) { this.pausedAt = this.position(); this.stopSrc(); } }

  position() {
    if (!this.playing || !this.ctx || !this.curId) return this.pausedAt || 0;
    const d = this.duration(this.curId);
    return (((this.ctx.currentTime - this.startedAt) % d) + d) % d;
  }
  progress() {
    if (!this.curId) return 0;
    return this.position() / this.duration(this.curId);
  }
  seek(id, frac) { this.play(id, frac * this.duration(id)); }
}

// ---- synthesis -----------------------------------------------------------
function synth(id) {
  const p = PARAMS[id] || PARAMS.init;
  const n = Math.floor(DUR * SR);
  const d = new Float32Array(n);
  const rand = rng(((id.charCodeAt(0) || 65) * 131 + 7) >>> 0);
  const TAU = Math.PI * 2;
  let last = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const penv = 0.5 + 0.5 * Math.sin(TAU * p.pulse * t - Math.PI / 2);
    let s = 0;
    s += 0.30 * Math.sin(TAU * p.base * t);
    s += 0.12 * Math.sin(TAU * p.base * 2 * t);
    s += 0.30 * Math.sin(TAU * (p.base / 2) * t) * penv;
    let nz = (rand() * 2 - 1);
    if (p.mode === 'click') nz *= (rand() < 0.012 ? 1 : 0.05);
    else if (p.mode === 'breath') nz *= (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(TAU * 0.2 * t)));
    else if (p.mode === 'buzz') nz = Math.sign(Math.sin(TAU * p.base * 3 * t)) * 0.4 + nz * 0.5;
    else if (p.mode === 'broken') { if (rand() < 0.03) nz = (rand() * 2 - 1) * 2; if (rand() < 0.02) nz = 0; }
    s += nz * p.noise;
    s *= p.amp;
    last = last * 0.7 + s * 0.3; // gentle low-pass
    d[i] = last;
  }
  const xf = Math.floor(0.05 * SR);
  for (let i = 0; i < xf; i++) { const a = i / xf; d[i] = d[i] * a + d[n - xf + i] * (1 - a); }
  let max = 1e-4; for (let i = 0; i < n; i++) max = Math.max(max, Math.abs(d[i]));
  const g = 0.9 / max; for (let i = 0; i < n; i++) d[i] *= g;
  return d;
}

function peaksOf(d, count) {
  const step = Math.floor(d.length / count);
  const peaks = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    let m = 0; const a = i * step, b = a + step;
    for (let j = a; j < b; j++) { const v = Math.abs(d[j]); if (v > m) m = v; }
    peaks[i] = m;
  }
  return peaks;
}

async function tryLoad(ctx, id) {
  for (const ext of ['mp3', 'ogg', 'webm', 'wav']) {
    try {
      const res = await fetch(`assets/${id}.${ext}`);
      if (!res.ok) continue;
      return await ctx.decodeAudioData(await res.arrayBuffer());
    } catch { /* fall back to synth */ }
  }
  return null;
}
