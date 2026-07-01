// ---------------------------------------------------------------------------
// Epicycles — Fourier drawing + pendulums. shape:
//   0-3  Fourier contours (heart / star / infinity / flower) via DFT epicycles
//   4    Harmonograph (perpendicular pendulums → Lissajous)
//   5-8  Connected pendulum CHAINS of 2..5 links (Verlet rope, chaotic trace)
// `tiles` (1..4) renders a grid of independent instances, each a different seed.
// Draws to a canvas → texture. Conforms to { texture, params, defs, step, seed }.
// ---------------------------------------------------------------------------

function mk2d(gl) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

const N = 256;
const SHAPES = [
  (i) => { const t = i / N * 2 * Math.PI; return [0.026 * 16 * Math.pow(Math.sin(t), 3), -0.026 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]; },
  (i) => { const t = i / N * 2 * Math.PI, r = 0.4 * (0.6 + 0.4 * Math.cos(5 * t)); return [r * Math.cos(t), r * Math.sin(t)]; },
  (i) => { const t = i / N * 2 * Math.PI, d = 1 + Math.sin(t) * Math.sin(t); return [0.42 * Math.cos(t) / d, 0.42 * Math.sin(t) * Math.cos(t) / d]; },
  (i) => { const t = i / N * 2 * Math.PI, r = 0.4 * (0.5 + 0.5 * Math.cos(6 * t)); return [r * Math.cos(t), r * Math.sin(t)]; },
];

export class Epicycles {
  constructor(gl, { size = 512 } = {}) {
    this.gl = gl; this.size = size;
    this.params = { shape: 5, circles: 48, speed: 1.0, scale: 0.85, trail: 1.0, tiles: 1 };
    this.defs = [
      { key: 'shape', min: 0, max: 8, label: 'shape 0-3 · pend 4-8' },
      { key: 'circles', min: 3, max: 120, label: 'circles' },
      { key: 'speed', min: 0.2, max: 3, label: 'speed' },
      { key: 'scale', min: 0.3, max: 1.2, label: 'scale' },
      { key: 'trail', min: 0.1, max: 1, label: 'trail length' },
      { key: 'tiles', min: 1, max: 4, label: 'tile grid' },
    ];
    this.canvas = document.createElement('canvas'); this.canvas.width = this.canvas.height = size;
    this.ctx = this.canvas.getContext('2d');
    this.tex = mk2d(gl);
    this.seed(1);
  }
  _rng(seed) { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

  _buildFourier(shape) {
    const fn = SHAPES[Math.max(0, Math.min(3, shape))], pts = [];
    for (let i = 0; i < N; i++) pts.push(fn(i));
    let mx = 0, my = 0; for (const p of pts) { mx += p[0]; my += p[1]; } mx /= N; my /= N;
    let mr = 1e-4; for (const p of pts) { p[0] -= mx; p[1] -= my; mr = Math.max(mr, Math.hypot(p[0], p[1])); }
    for (const p of pts) { p[0] /= mr; p[1] /= mr; }
    this.coeffs = [];
    for (let k = -N / 2; k < N / 2; k++) {
      let re = 0, im = 0;
      for (let n = 0; n < N; n++) { const a = -2 * Math.PI * k * n / N, c = Math.cos(a), si = Math.sin(a); re += pts[n][0] * c - pts[n][1] * si; im += pts[n][0] * si + pts[n][1] * c; }
      re /= N; im /= N; this.coeffs.push({ freq: k, amp: Math.hypot(re, im), phase: Math.atan2(im, re) });
    }
    this.coeffs.sort((a, b) => b.amp - a.amp);
  }

  _makeSim(shape, seed) {
    const rnd = this._rng(seed), sim = { shape, t: (seed % 97) / 97, trace: [] };
    if (shape === 4) {
      sim.harm = []; for (let i = 0; i < 4; i++) sim.harm.push({ a: 0.4 + rnd() * 0.5, fx: 1 + (rnd() * 4 | 0), fy: 1 + (rnd() * 4 | 0), px: rnd() * 6.2832, py: rnd() * 6.2832, axis: i < 2 });
    } else if (shape >= 5) {
      const Nn = shape - 3, L = 1 / Nn; sim.N = Nn; sim.pts = [];       // 5→2 links … 8→5 links
      let ang = -0.15 + rnd() * 0.3, x = 0, y = 0;                       // start ~horizontal → energetic
      for (let i = 0; i < Nn; i++) { ang += (rnd() - 0.5) * 0.7; x += Math.cos(ang) * L; y += Math.sin(ang) * L; sim.pts.push({ x, y, px: x, py: y }); }
    }
    return sim;
  }

  seed(seed) {
    const shape = Math.max(0, Math.min(8, Math.round(this.params.shape)));
    if (shape <= 3) this._buildFourier(shape);
    const tiles = Math.max(1, Math.round(this.params.tiles));
    this.sims = []; const base = (seed >>> 0) || 1;
    for (let i = 0; i < tiles * tiles; i++) this.sims.push(this._makeSim(shape, base + i * 7919 + 1));
  }

  step() {
    const S = this.size, X = this.ctx; X.fillStyle = '#000'; X.fillRect(0, 0, S, S);
    const tiles = Math.max(1, Math.round(this.params.tiles)), cell = S / tiles;
    const lw = Math.max(1, 2.2 / Math.sqrt(tiles)), br = Math.max(1.4, 3.5 / Math.sqrt(tiles));
    for (let ti = 0; ti < tiles * tiles; ti++) {
      const gx = ti % tiles, gy = (ti / tiles) | 0, cx = (gx + 0.5) * cell, cy = (gy + 0.5) * cell;
      const scale = cell * 0.32 * (this.params.scale / 0.85);
      const sim = this.sims[ti]; if (!sim) continue;
      let tip, period;
      if (sim.shape <= 3) { tip = this._fourier(sim, X, cx, cy, scale, lw); period = 1 / (this.params.speed * 0.0016); }
      else if (sim.shape === 4) { tip = this._harmo(sim, X, cx, cy, scale, lw); period = 6.2832 / (this.params.speed * 0.01); }
      else { tip = this._chain(sim, X, cx, cy, scale, lw, br); period = 1800; }
      sim.trace.push(tip);
      const maxTrace = Math.max(8, Math.round(period * this.params.trail));
      while (sim.trace.length > maxTrace) sim.trace.shift();
      X.strokeStyle = '#fff'; X.lineWidth = lw; X.lineCap = 'round'; X.beginPath();
      for (let i = 0; i < sim.trace.length; i++) { const p = sim.trace[i]; if (i === 0) X.moveTo(p[0], p[1]); else X.lineTo(p[0], p[1]); }
      X.stroke();
      X.fillStyle = '#fff'; X.beginPath(); X.arc(tip[0], tip[1], br, 0, 6.2832); X.fill();
    }
    const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, this.tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  _fourier(sim, X, cx, cy, scale, lw) {
    sim.t = (sim.t + this.params.speed * 0.0016) % 1;
    const tau = 2 * Math.PI * sim.t, nC = Math.round(this.params.circles);
    let px = cx, py = cy; X.strokeStyle = 'rgba(120,150,180,0.30)'; X.lineWidth = Math.max(0.5, lw * 0.5);
    for (let i = 0; i < nC && i < this.coeffs.length; i++) {
      const co = this.coeffs[i], r = co.amp * scale, ang = co.freq * tau + co.phase, nx = px + Math.cos(ang) * r, ny = py + Math.sin(ang) * r;
      if (r > 1.5) { X.beginPath(); X.arc(px, py, r, 0, 6.2832); X.stroke(); }
      X.beginPath(); X.moveTo(px, py); X.lineTo(nx, ny); X.stroke(); px = nx; py = ny;
    }
    return [px, py];
  }
  _harmo(sim, X, cx, cy, scale, lw) {
    sim.t += this.params.speed * 0.01; let ux = 0, uy = 0;
    for (const h of sim.harm) { if (h.axis) ux += h.a * Math.sin(h.fx * sim.t + h.px); else uy += h.a * Math.sin(h.fy * sim.t + h.py); }
    const px = cx + ux * scale * 0.55, py = cy + uy * scale * 0.55;
    X.strokeStyle = 'rgba(120,150,180,0.20)'; X.lineWidth = Math.max(0.5, lw * 0.4);
    X.beginPath(); X.moveTo(px, cy - scale); X.lineTo(px, cy + scale); X.moveTo(cx - scale, py); X.lineTo(cx + scale, py); X.stroke();
    return [px, py];
  }
  _chain(sim, X, cx, cy, scale, lw, br) {
    const g = 0.0006 * this.params.speed * this.params.speed, Nn = sim.N, L = 1 / Nn, pts = sim.pts;
    for (let i = 0; i < Nn; i++) { const p = pts[i], vx = (p.x - p.px) * 0.999, vy = (p.y - p.py) * 0.999; p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + g; }
    for (let k = 0; k < 12; k++) {
      { const p = pts[0], d = Math.hypot(p.x, p.y) || 1e-6, diff = (d - L) / d; p.x -= p.x * diff; p.y -= p.y * diff; }
      for (let i = 1; i < Nn; i++) { const a = pts[i - 1], p = pts[i]; let dx = p.x - a.x, dy = p.y - a.y; const d = Math.hypot(dx, dy) || 1e-6, diff = (d - L) / d; a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; p.x -= dx * diff * 0.5; p.y -= dy * diff * 0.5; }
    }
    X.strokeStyle = 'rgba(150,170,200,0.6)'; X.lineWidth = Math.max(1.2, lw); X.lineCap = 'round';
    X.beginPath(); X.moveTo(cx, cy); for (let i = 0; i < Nn; i++) X.lineTo(cx + pts[i].x * scale, cy + pts[i].y * scale); X.stroke();
    X.fillStyle = 'rgba(190,210,235,0.9)';
    for (let i = 0; i < Nn; i++) { X.beginPath(); X.arc(cx + pts[i].x * scale, cy + pts[i].y * scale, br, 0, 6.2832); X.fill(); }
    const last = pts[Nn - 1]; return [cx + last.x * scale, cy + last.y * scale];
  }
  get texture() { return this.tex; }
}
