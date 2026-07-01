// ---------------------------------------------------------------------------
// Epicycles — Fourier-series drawing (3Blue1Brown MY4luNgGfms). Sample a closed
// contour into complex points, DFT it into rotating vectors, then trace the path
// as a chain of spinning circles. Drawn to a canvas → texture. Conforms to the
// field-engine interface { texture, params, defs, step, seed }.
// ---------------------------------------------------------------------------

function mk2d(gl) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

const N = 256;
// closed-contour presets → N complex samples, centred, ~[-0.4,0.4]
const SHAPES = [
  function heart(i) { const t = i / N * 2 * Math.PI; return [0.026 * 16 * Math.pow(Math.sin(t), 3), -0.026 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]; },
  function star(i) { const t = i / N * 2 * Math.PI, k = 5, r = 0.4 * (0.6 + 0.4 * Math.cos(k * t)); return [r * Math.cos(t), r * Math.sin(t)]; },
  function infinity(i) { const t = i / N * 2 * Math.PI, d = 1 + Math.sin(t) * Math.sin(t); return [0.42 * Math.cos(t) / d, 0.42 * Math.sin(t) * Math.cos(t) / d]; },
  function flower(i) { const t = i / N * 2 * Math.PI, r = 0.4 * (0.5 + 0.5 * Math.cos(6 * t)); return [r * Math.cos(t), r * Math.sin(t)]; },
];

export class Epicycles {
  constructor(gl, { size = 512 } = {}) {
    this.gl = gl; this.size = size;
    this.params = { shape: 5, circles: 48, speed: 1.0, scale: 0.85, trail: 1.0 };
    this.defs = [
      { key: 'shape', min: 0, max: 5, label: 'shape (0-3) · pend 4-5' },
      { key: 'circles', min: 3, max: 120, label: 'circles' },
      { key: 'speed', min: 0.2, max: 3, label: 'speed' },
      { key: 'scale', min: 0.3, max: 1.2, label: 'scale' },
      { key: 'trail', min: 0.1, max: 1, label: 'trail length' },
    ];
    this.canvas = document.createElement('canvas'); this.canvas.width = this.canvas.height = size;
    this.ctx = this.canvas.getContext('2d');
    this.tex = mk2d(gl);
    this.seed(1);
  }

  seed(seed) {
    let s = (seed >>> 0) || 1; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    this.t = 0; this.trace = [];
    const sh = Math.max(0, Math.min(5, Math.round(this.params.shape)));
    if (sh === 4) {                      // harmonograph — pendulum-driven Lissajous/rose
      this.drive = 'harmonograph'; this.harm = [];
      for (let i = 0; i < 4; i++) this.harm.push({ a: 0.4 + rnd() * 0.5, fx: 1 + (rnd() * 4 | 0), fy: 1 + (rnd() * 4 | 0), px: rnd() * 6.2832, py: rnd() * 6.2832, axis: i < 2 });
      return;
    }
    if (sh === 5) {                      // double pendulum — chaotic swinging arms
      this.drive = 'double';
      this.dp = { a1: Math.PI * (0.4 + rnd() * 0.6), a2: Math.PI * (0.4 + rnd() * 0.6), a1v: 0, a2v: 0 };
      return;
    }
    this.drive = 'fourier';
    const shape = SHAPES[sh];
    const pts = []; for (let i = 0; i < N; i++) pts.push(shape(i));
    let mx = 0, my = 0; for (const p of pts) { mx += p[0]; my += p[1]; } mx /= N; my /= N;
    let mr = 1e-4; for (const p of pts) { p[0] -= mx; p[1] -= my; mr = Math.max(mr, Math.hypot(p[0], p[1])); }
    for (const p of pts) { p[0] /= mr; p[1] /= mr; }
    this.coeffs = [];
    for (let k = -N / 2; k < N / 2; k++) {
      let re = 0, im = 0;
      for (let n = 0; n < N; n++) { const a = -2 * Math.PI * k * n / N, c = Math.cos(a), si = Math.sin(a); re += pts[n][0] * c - pts[n][1] * si; im += pts[n][0] * si + pts[n][1] * c; }
      re /= N; im /= N;
      this.coeffs.push({ freq: k, amp: Math.hypot(re, im), phase: Math.atan2(im, re) });
    }
    this.coeffs.sort((a, b) => b.amp - a.amp);
  }

  step() {
    const S = this.size, c = S / 2;
    const x = this.ctx; x.fillStyle = '#000'; x.fillRect(0, 0, S, S);
    let tip;
    if (this.drive === 'harmonograph') tip = this._harmo(x, S, c);
    else if (this.drive === 'double') tip = this._double(x, S, c);
    else tip = this._fourier(x, S, c);
    const [px, py] = tip;

    // accumulate + draw the traced path
    this.trace.push([px, py]);
    const periodFrames = this.drive === 'double' ? 1800 : (this.drive === 'harmonograph' ? 6.2832 / (this.params.speed * 0.01) : 1 / (this.params.speed * 0.0016));
    const maxTrace = Math.max(8, Math.round(periodFrames * this.params.trail));
    while (this.trace.length > maxTrace) this.trace.shift();
    x.strokeStyle = '#fff'; x.lineWidth = 2.2; x.lineCap = 'round'; x.beginPath();
    for (let i = 0; i < this.trace.length; i++) { const p = this.trace[i]; if (i === 0) x.moveTo(p[0], p[1]); else x.lineTo(p[0], p[1]); }
    x.stroke();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(px, py, 3, 0, 6.2832); x.fill();

    const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, this.tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  _fourier(x, S, c) {
    const sc = this.params.scale * S * 0.30;
    this.t = (this.t + this.params.speed * 0.0016) % 1;
    const tau = 2 * Math.PI * this.t, nC = Math.round(this.params.circles);
    let px = c, py = c;
    x.strokeStyle = 'rgba(120,150,180,0.35)';
    for (let i = 0; i < nC && i < this.coeffs.length; i++) {
      const co = this.coeffs[i], r = co.amp * sc, ang = co.freq * tau + co.phase;
      const nx = px + Math.cos(ang) * r, ny = py + Math.sin(ang) * r;
      if (r > 1.5) { x.lineWidth = 1; x.beginPath(); x.arc(px, py, r, 0, 6.2832); x.stroke(); }
      x.beginPath(); x.moveTo(px, py); x.lineTo(nx, ny); x.stroke();
      px = nx; py = ny;
    }
    return [px, py];
  }

  _harmo(x, S, c) {                    // harmonograph: perpendicular pendulums → Lissajous/rose
    const sc = this.params.scale * S * 0.17;
    this.t += this.params.speed * 0.01;
    let X = 0, Y = 0;
    for (const h of this.harm) { if (h.axis) X += h.a * Math.sin(h.fx * this.t + h.px); else Y += h.a * Math.sin(h.fy * this.t + h.py); }
    const px = c + X * sc, py = c + Y * sc;
    x.strokeStyle = 'rgba(120,150,180,0.22)'; x.lineWidth = 1;   // pendulum projections (the swings)
    x.beginPath(); x.moveTo(px, 0); x.lineTo(px, S); x.moveTo(0, py); x.lineTo(S, py); x.stroke();
    return [px, py];
  }

  _double(x, S, c) {                   // double pendulum: two swinging rods, chaotic trace
    const dp = this.dp, sc = this.params.scale * S, l1 = sc * 0.16, l2 = sc * 0.16;
    const g = 1.2, m1 = 1, m2 = 1, dt = 0.05 * this.params.speed;
    for (let sub = 0; sub < 8; sub++) {
      const a1 = dp.a1, a2 = dp.a2, a1v = dp.a1v, a2v = dp.a2v, c12 = Math.cos(a1 - a2), s12 = Math.sin(a1 - a2);
      const dn = (2 * m1 + m2 - m2 * Math.cos(2 * a1 - 2 * a2));
      const a1a = (-g * (2 * m1 + m2) * Math.sin(a1) - m2 * g * Math.sin(a1 - 2 * a2) - 2 * s12 * m2 * (a2v * a2v * l2 + a1v * a1v * l1 * c12)) / (l1 * dn);
      const a2a = (2 * s12 * (a1v * a1v * l1 * (m1 + m2) + g * (m1 + m2) * Math.cos(a1) + a2v * a2v * l2 * m2 * c12)) / (l2 * dn);
      dp.a1v = (dp.a1v + a1a * dt) * 0.9999; dp.a2v = (dp.a2v + a2a * dt) * 0.9999; dp.a1 += dp.a1v * dt; dp.a2 += dp.a2v * dt;
    }
    const x1 = c + l1 * Math.sin(dp.a1), y1 = c + l1 * Math.cos(dp.a1);
    const x2 = x1 + l2 * Math.sin(dp.a2), y2 = y1 + l2 * Math.cos(dp.a2);
    x.strokeStyle = 'rgba(150,170,200,0.6)'; x.lineWidth = 2.2; x.lineCap = 'round';
    x.beginPath(); x.moveTo(c, c); x.lineTo(x1, y1); x.lineTo(x2, y2); x.stroke();
    x.fillStyle = 'rgba(190,210,235,0.9)';
    for (const bb of [[c, c, 3], [x1, y1, 4], [x2, y2, 5]]) { x.beginPath(); x.arc(bb[0], bb[1], bb[2], 0, 6.2832); x.fill(); }
    return [x2, y2];
  }
  get texture() { return this.tex; }
}
