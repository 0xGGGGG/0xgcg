// ---------------------------------------------------------------------------
// Per-stage soundtrack + waveform data. Each act gets its own loop. By default
// the loop is synthesized (royalty-free, in the dark drone/pulse spirit of
// SCRIPT §10) so nothing copyrighted is bundled; drop assets/<id>.(mp3|ogg|webm)
// to override a stage with a licensed track. Web Audio drives playback and the
// waveform peaks shown in the player's scrubber.
// ---------------------------------------------------------------------------

const DUR = 16; // seconds per generated loop

// per-stage synthesis params, tuned to each act's mood
const PARAMS = {
  boot:    { base: 48, pulse: 0.30, noise: 0.04, mode: 'drone',  amp: 0.55 },
  feed:    { base: 55, pulse: 0.85, noise: 0.10, mode: 'click',  amp: 0.62 },
  grow:    { base: 62, pulse: 0.50, noise: 0.07, mode: 'breath', amp: 0.62 },
  corrupt: { base: 50, pulse: 1.40, noise: 0.16, mode: 'buzz',   amp: 0.66 },
  glitch:  { base: 44, pulse: 2.20, noise: 0.24, mode: 'broken', amp: 0.70 },
};

const rng = (s) => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;

export class Soundtrack {
  constructor() {
    this.ctx = null;
    this.gain = null;
    this.tracks = {};     // id -> { buffer, peaks }
    this.src = null;
    this.curId = null;
    this.startedAt = 0;   // ctx time at offset 0
    this.pausedAt = 0;    // offset seconds when paused
    this.playing = false;
  }

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

  // lazily build (or load) a stage's track
  track(id) {
    if (this.tracks[id]) return this.tracks[id];
    const ctx = this._ensure();
    const buffer = synth(ctx, id);
    const t = { buffer, peaks: peaksOf(buffer, 240) };
    this.tracks[id] = t;
    // try to upgrade to a real owned file if present
    tryLoad(ctx, id).then((buf) => { if (buf) { t.buffer = buf; t.peaks = peaksOf(buf, 240); } });
    return t;
  }
  peaks(id) { return this.track(id).peaks; }
  duration(id) { return this.track(id).buffer.duration; }

  play(id, offset = 0) {
    this._ensure();
    this.stopSrc();
    const t = this.track(id);
    const off = ((offset % t.buffer.duration) + t.buffer.duration) % t.buffer.duration;
    const s = this.ctx.createBufferSource();
    s.buffer = t.buffer; s.loop = true; s.connect(this.gain);
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
function synth(ctx, id) {
  const p = PARAMS[id] || PARAMS.boot;
  const sr = ctx.sampleRate, n = Math.floor(DUR * sr);
  const buf = ctx.createBuffer(1, n, sr);
  const d = buf.getChannelData(0);
  const rand = rng((id.charCodeAt(0) * 131 + 7) >>> 0);
  const TAU = Math.PI * 2;
  let last = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const penv = 0.5 + 0.5 * Math.sin(TAU * p.pulse * t - Math.PI / 2);
    let s = 0;
    s += 0.30 * Math.sin(TAU * p.base * t);
    s += 0.12 * Math.sin(TAU * p.base * 2 * t);
    s += 0.30 * Math.sin(TAU * (p.base / 2) * t) * penv; // sub, pulsing
    // texture per mode
    let nz = (rand() * 2 - 1);
    if (p.mode === 'click') nz *= (rand() < 0.012 ? 1 : 0.05);
    else if (p.mode === 'breath') nz *= (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(TAU * 0.2 * t)));
    else if (p.mode === 'buzz') { nz = Math.sign(Math.sin(TAU * p.base * 3 * t)) * 0.4 + nz * 0.5; }
    else if (p.mode === 'broken') { if (rand() < 0.03) nz = (rand() * 2 - 1) * 2; if (rand() < 0.02) nz = 0; }
    s += nz * p.noise;
    s *= p.amp;
    last = last * 0.7 + s * 0.3; // gentle low-pass
    d[i] = last;
  }
  // seamless-ish loop: short equal-power crossfade of the tail into the head
  const xf = Math.floor(0.05 * sr);
  for (let i = 0; i < xf; i++) {
    const a = i / xf;
    d[i] = d[i] * a + d[n - xf + i] * (1 - a);
  }
  // normalize
  let max = 1e-4; for (let i = 0; i < n; i++) max = Math.max(max, Math.abs(d[i]));
  const g = 0.9 / max; for (let i = 0; i < n; i++) d[i] *= g;
  return buf;
}

function peaksOf(buffer, count) {
  const d = buffer.getChannelData(0), step = Math.floor(d.length / count);
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
      const res = await fetch(`assets/${id}.${ext}`, { method: 'GET' });
      if (!res.ok) continue;
      const ab = await res.arrayBuffer();
      return await ctx.decodeAudioData(ab);
    } catch { /* keep looking / fall back to synth */ }
  }
  return null;
}
