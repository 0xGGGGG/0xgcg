// ---------------------------------------------------------------------------
// WFC — a tiled Wave Function Collapse (edge-matching pipe/circuit tiles). Each
// tile is an N/E/S/W socket bitmask; neighbours must share the socket across
// their shared edge. Observe the lowest-entropy cell, collapse it weighted, then
// propagate; restart on contradiction. Collapsed tiles are drawn to a canvas and
// revealed as it solves. Conforms to { texture, params, defs, step, seed }.
// ---------------------------------------------------------------------------

function mk2d(gl) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
export const WFC_STYLES = ['Pipes', 'Circuits', 'Neurons', 'Blobs', 'Glyphs', 'Conveyor', 'Rails'];
const PALETTES = [
  ['#ff3df0', '#b03cff', '#7a2dff', '#e066ff'],   // Pipes — steampunk pink/violet/purple
  ['#1fffa8', '#22e0ff', '#3affc0', '#8bff5a'],   // Circuits — cyberpunk green/cyan
  ['#49c8ff', '#9fe8ff', '#3a8fff', '#dff4ff'],   // Neurons — cyan/blue/white
  ['#ff4fd8', '#ff8a3c', '#ff5a7a', '#ffd24a'],   // Blobs — magenta/orange graph
  ['#e8b84a', '#ffd870', '#c89030', '#7fe0c0'],   // Glyphs — gold/amber chips
  ['#ffd23a', '#ffae3a', '#e0a020', '#ff9020'],   // Conveyor — industrial yellow/orange
  ['#cdd6df', '#aeb8c2', '#9aa6b0', '#c0cad4'],   // Rails — steel
];
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const bit = (t, e) => (t >> e) & 1;                       // edge e: 0=N 1=E 2=S 3=W
// compatibility: cell tile t, neighbour t' in dir d (0=N..3=W) — shared sockets equal
function compat(t, tp, d) {
  if (d === 0) return bit(t, 0) === bit(tp, 2);           // N: my N == their S
  if (d === 1) return bit(t, 1) === bit(tp, 3);           // E: my E == their W
  if (d === 2) return bit(t, 2) === bit(tp, 0);           // S
  return bit(t, 3) === bit(tp, 1);                        // W
}
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0], OPP = [2, 3, 0, 1];

export class WFC {
  constructor(gl, { size = 512, grid = 18 } = {}) {
    this.gl = gl; this.size = size; this.G = grid;
    this.params = { grid: 24.32, density: 0.325, thick: 0.079, jitter: 0.286, weight: 0.982 };
    this.defs = [
      { key: 'grid', min: 8, max: 32, label: 'grid' },
      { key: 'density', min: 0.1, max: 0.95, label: 'connectivity' },
      { key: 'thick', min: 0.06, max: 0.3, label: 'trace width' },
      { key: 'weight', min: 0.2, max: 2.5, label: 'tile weight' },
      { key: 'jitter', min: 0, max: 0.4, label: 'jitter' },
    ];
    this.style = 0;
    this.canvas = document.createElement('canvas'); this.canvas.width = this.canvas.height = size;
    this.ctx = this.canvas.getContext('2d');
    this.tex = mk2d(gl);
    // precompute compatibility masks comp[t][d] = bitmask of compatible neighbour tiles
    this.comp = [];
    for (let t = 0; t < 16; t++) { this.comp[t] = [0, 0, 0, 0]; for (let d = 0; d < 4; d++) { let m = 0; for (let tp = 0; tp < 16; tp++) if (compat(t, tp, d)) m |= (1 << tp); this.comp[t][d] = m; } }
    this.seed(1);
  }
  _rand() { this.s = (this.s * 1664525 + 1013904223) >>> 0; return this.s / 4294967296; }

  seed(seed) {
    this.s = (seed >>> 0) || 1;
    this.G = Math.round(this.params.grid);
    const G = this.G, N = G * G, full = 0xFFFF;
    this.cell = new Int32Array(N).fill(full);              // bitmask of possible tiles
    this.done = new Uint8Array(N);                         // 1 once drawn
    // weights: favour connectivity by `density`, scaled by `weight`
    this.w = new Float32Array(16);
    for (let t = 0; t < 16; t++) { const pc = (bit(t, 0) + bit(t, 1) + bit(t, 2) + bit(t, 3)); this.w[t] = (1 - this.params.density) * (pc === 0 ? 1 : 0.1) + this.params.density * (0.2 + pc) * this.params.weight; }
    this.ctx.fillStyle = '#000'; this.ctx.fillRect(0, 0, this.size, this.size);
    this.solved = false; this._upload();
  }
  _popcount(m) { let c = 0; while (m) { m &= m - 1; c++; } return c; }

  _observe() {
    const G = this.G, N = G * G; let best = -1, bestE = 1e9;
    for (let i = 0; i < N; i++) { const pc = this._popcount(this.cell[i]); if (pc > 1) { const e = pc + this._rand() * 0.4; if (e < bestE) { bestE = e; best = i; } } }
    if (best < 0) { this.solved = true; return -1; }
    // collapse `best` to a weighted-random tile from its options
    let m = this.cell[best], total = 0; const opts = [];
    for (let t = 0; t < 16; t++) if (m & (1 << t)) { opts.push(t); total += this.w[t]; }
    let r = this._rand() * total, pick = opts[0];
    for (const t of opts) { r -= this.w[t]; if (r <= 0) { pick = t; break; } }
    this.cell[best] = (1 << pick);
    return best;
  }
  _propagate(start) {
    const G = this.G, stack = [start];
    while (stack.length) {
      const i = stack.pop(), x = i % G, y = (i / G) | 0, m = this.cell[i];
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d], ny = y + DY[d]; if (nx < 0 || ny < 0 || nx >= G || ny >= G) continue;
        const ni = ny * G + nx;
        let allowed = 0; for (let t = 0; t < 16; t++) if (m & (1 << t)) allowed |= this.comp[t][d];
        const before = this.cell[ni], after = before & allowed;
        if (after !== before) { this.cell[ni] = after; if (after === 0) { this.solved = 'contradiction'; return; } stack.push(ni); }
      }
    }
  }
  setStyle(i) { this.style = ((i % WFC_STYLES.length) + WFC_STYLES.length) % WFC_STYLES.length; this.seed(this.s || 1); }

  _drawCell(i) {
    const G = this.G, ts = this.size / G, x = i % G, y = (i / G) | 0, X = this.ctx;
    const t = Math.log2(this.cell[i]) | 0;
    const cx = (x + 0.5) * ts, cy = (y + 0.5) * ts, lw = Math.max(1.2, ts * this.params.thick);
    const ex = [cx, cx + ts / 2, cx, cx - ts / 2], ey = [cy - ts / 2, cy, cy + ts / 2, cy];
    const pal = PALETTES[this.style], col = pal[Math.abs(x * 7 + y * 13) % pal.length];
    const edges = []; for (let e = 0; e < 4; e++) if (bit(t, e)) edges.push(e);
    this.done[i] = 1;
    if (!edges.length && this.style !== 4) return;

    if (this.style === 0) {                                 // PIPES — dark-cored steampunk tubes
      X.lineCap = 'round';
      for (const e of edges) { X.strokeStyle = 'rgba(15,0,22,0.95)'; X.lineWidth = lw * 1.5; X.beginPath(); X.moveTo(cx, cy); X.lineTo(ex[e], ey[e]); X.stroke(); X.strokeStyle = col; X.lineWidth = lw * 0.7; X.beginPath(); X.moveTo(cx, cy); X.lineTo(ex[e], ey[e]); X.stroke(); }
      X.fillStyle = col; X.beginPath(); X.arc(cx, cy, lw * 0.95, 0, 6.2832); X.fill();
      X.strokeStyle = 'rgba(15,0,22,0.95)'; X.lineWidth = lw * 0.35; X.beginPath(); X.arc(cx, cy, lw * 0.95, 0, 6.2832); X.stroke();
    } else if (this.style === 1) {                          // CIRCUITS — thin traces + pads + vias
      X.lineCap = 'butt'; X.strokeStyle = col; X.lineWidth = Math.max(1, lw * 0.45);
      for (const e of edges) { X.beginPath(); X.moveTo(cx, cy); X.lineTo(ex[e], ey[e]); X.stroke(); X.fillStyle = col; X.fillRect(ex[e] - lw * 0.4, ey[e] - lw * 0.4, lw * 0.8, lw * 0.8); }
      X.fillStyle = col; X.beginPath(); X.arc(cx, cy, lw * 0.5, 0, 6.2832); X.fill();
      X.fillStyle = 'rgba(0,0,0,0.8)'; X.beginPath(); X.arc(cx, cy, lw * 0.22, 0, 6.2832); X.fill();
    } else if (this.style === 2) {                          // NEURONS — slimy translucent dendrites
      X.lineCap = 'round';
      const curve = (w) => { for (const e of edges) { const mx = ex[e], my = ey[e], px = cx + (my - cy) * 0.35, py = cy - (mx - cx) * 0.35; X.lineWidth = w; X.beginPath(); X.moveTo(cx, cy); X.quadraticCurveTo(px, py, mx, my); X.stroke(); } };
      X.strokeStyle = rgba(col, 0.14); curve(lw * 1.9);      // gooey slime body
      X.strokeStyle = rgba(col, 0.42); curve(lw * 0.45);     // soft core
      const gr = X.createRadialGradient(cx, cy, 0, cx, cy, lw * 2.1); gr.addColorStop(0, rgba(col, 0.45)); gr.addColorStop(1, rgba(col, 0)); X.fillStyle = gr; X.beginPath(); X.arc(cx, cy, lw * 2.1, 0, 6.2832); X.fill();
      X.fillStyle = rgba('#eafdff', 0.7); X.beginPath(); X.arc(cx, cy, lw * 0.4, 0, 6.2832); X.fill();
    } else if (this.style === 3) {                          // BLOBS — graph nodes + edges
      X.lineCap = 'round'; X.strokeStyle = col; X.lineWidth = lw * 0.55;
      for (const e of edges) { X.beginPath(); X.moveTo(cx, cy); X.lineTo(ex[e], ey[e]); X.stroke(); }
      X.fillStyle = col; X.beginPath(); X.arc(cx, cy, ts * 0.26, 0, 6.2832); X.fill();
      X.fillStyle = 'rgba(255,255,255,0.5)'; X.beginPath(); X.arc(cx - ts * 0.08, cy - ts * 0.08, ts * 0.08, 0, 6.2832); X.fill();
    } else if (this.style === 5) {                          // CONVEYOR — belt edges + treads + roller
      const g = ts * 0.16, rw = Math.max(1.4, lw * 0.5);
      for (const e of edges) {
        const mx = ex[e], my = ey[e], dx = mx - cx, dy = my - cy, len = Math.hypot(dx, dy) || 1, px = -dy / len, py = dx / len;
        X.strokeStyle = col; X.lineWidth = rw; X.lineCap = 'round';
        for (const s of [-g, g]) { X.beginPath(); X.moveTo(cx + px * s, cy + py * s); X.lineTo(mx + px * s, my + py * s); X.stroke(); }
        X.strokeStyle = 'rgba(20,16,6,0.92)'; X.lineWidth = Math.max(1, lw * 0.3); X.lineCap = 'butt';
        const n = Math.max(1, Math.floor(len / (ts * 0.13)));
        for (let i = 0; i <= n; i++) { const t = i / n, bx = cx + dx * t, by = cy + dy * t; X.beginPath(); X.moveTo(bx + px * g, by + py * g); X.lineTo(bx - px * g, by - py * g); X.stroke(); }
      }
      X.fillStyle = col; X.beginPath(); X.arc(cx, cy, g * 0.8, 0, 6.2832); X.fill();
      X.fillStyle = 'rgba(20,16,6,0.92)'; X.beginPath(); X.arc(cx, cy, g * 0.32, 0, 6.2832); X.fill();
    } else if (this.style === 6) {                          // RAILS — wooden ties + steel rails
      const g = ts * 0.12, rw = Math.max(1, lw * 0.32);
      for (const e of edges) {
        const mx = ex[e], my = ey[e], dx = mx - cx, dy = my - cy, len = Math.hypot(dx, dy) || 1, px = -dy / len, py = dx / len;
        X.strokeStyle = 'rgba(120,84,52,0.95)'; X.lineWidth = Math.max(2, lw * 0.5); X.lineCap = 'butt';
        const n = Math.max(1, Math.floor(len / (ts * 0.11)));
        for (let i = 0; i <= n; i++) { const t = i / n, bx = cx + dx * t, by = cy + dy * t; X.beginPath(); X.moveTo(bx + px * g * 1.7, by + py * g * 1.7); X.lineTo(bx - px * g * 1.7, by - py * g * 1.7); X.stroke(); }
        X.strokeStyle = col; X.lineWidth = rw; X.lineCap = 'round';
        for (const s of [-g, g]) { X.beginPath(); X.moveTo(cx + px * s, cy + py * s); X.lineTo(mx + px * s, my + py * s); X.stroke(); }
      }
      X.fillStyle = col; X.beginPath(); X.arc(cx, cy, g * 0.7, 0, 6.2832); X.fill();
    } else {                                                // GLYPHS — chip tiles + rune marks, with negative space
      let gs = (x * 131 + y * 977 + 7) >>> 0; const grnd = () => (gs = (gs * 1664525 + 1013904223) >>> 0) / 4294967296;
      const showChip = grnd() > 0.45;                        // ~45% of tiles are empty → breathing room
      if (!edges.length && !showChip) return;                // fully empty cell
      const r = ts * 0.27; X.lineCap = 'square'; X.strokeStyle = col; X.lineWidth = Math.max(1, lw * 0.4);
      for (const e of edges) { const sx = showChip ? cx + (ex[e] - cx) * (r / (ts / 2)) : cx, sy = showChip ? cy + (ey[e] - cy) * (r / (ts / 2)) : cy; X.beginPath(); X.moveTo(sx, sy); X.lineTo(ex[e], ey[e]); X.stroke(); }
      if (!showChip) return;                                 // connection-only tile (sparser)
      X.strokeRect(cx - r, cy - r, r * 2, r * 2);
      X.fillStyle = col;
      const marks = 1 + (grnd() * 3 | 0);                    // 1–3 marks, leaving empty sub-blocks
      for (let m = 0; m < marks; m++) { const gx = cx + (grnd() - 0.5) * r * 1.3, gy = cy + (grnd() - 0.5) * r * 1.3, s = r * (0.14 + grnd() * 0.2); if (grnd() < 0.5) X.fillRect(gx - s / 2, gy - s / 4, s, s / 2); else { X.lineWidth = 1.2; X.beginPath(); X.moveTo(gx - s / 2, gy); X.lineTo(gx + s / 2, gy); X.stroke(); } }
    }
  }
  step() {
    if (this.solved === true) return;
    for (let n = 0; n < 4; n++) {                          // a few collapses per frame
      if (this.solved) break;
      const i = this._observe(); if (i < 0) break;
      this._propagate(i);
      if (this.solved === 'contradiction') { this.seed((this.s ^ 0x9e3779b9) >>> 0); return; }
    }
    // draw any newly-singleton cells
    const N = this.G * this.G; let drew = false;
    for (let i = 0; i < N; i++) if (!this.done[i] && this._popcount(this.cell[i]) === 1) { this._drawCell(i); drew = true; }
    if (drew) this._upload();
  }
  finish() {                                                // solve + draw fully in one call (live param edits)
    let guard = 0;
    while (this.solved !== true && guard++ < 6000) {
      const i = this._observe(); if (i < 0) break;
      this._propagate(i);
      if (this.solved === 'contradiction') this.seed((this.s ^ 0x9e3779b9) >>> 0);
    }
    const N = this.G * this.G;
    for (let i = 0; i < N; i++) if (!this.done[i] && this._popcount(this.cell[i]) === 1) this._drawCell(i);
    this._upload();
  }
  _upload() { const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, this.tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); }
  get texture() { return this.tex; }
}
