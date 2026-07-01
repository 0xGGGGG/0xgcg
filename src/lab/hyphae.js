// ---------------------------------------------------------------------------
// Hyphae — node/agent growth (after inconvergent's hyphae.py). Connected,
// non-overlapping circles grow OUTWARD from seed nodes near the centre, wobble
// as they go, taper, and branch — producing real vines/veins, not a filled disc.
//
// Coordinates are in [0,1] (centre 0.5). rn = dist-from-centre / MAXR01 maps to
// the 10 scale bands; each band supplies its own params (radius, taper, wobble,
// branching, spacing, attempts, mask cutoff) → every layer is independently
// tunable. A white/black MASK limits where growth is allowed (white = grow), and
// the cycle's growth value (0..1) caps how far the frontier may reach.
//
// It draws into two canvases: `occ` (persistent vine occupancy) and `tip`
// (this-frame tips, cleared each frame) — both uploaded as textures and coloured
// per scale-ring by the render shader.
// ---------------------------------------------------------------------------

export class Hyphae {
  constructor({ size = 512, maxR01 = 0.47, sources = 12, paramsForBand, sampleMask } = {}) {
    this.size = size;
    this.maxR01 = maxR01;
    this.sources = sources;
    this.paramsForBand = paramsForBand;
    this.sampleMask = sampleMask || (() => 1);
    this.cell = 0.025;                       // spatial-hash cell size in [0,1]
    const N = 200000;
    this.NMAX = N;
    this.X = new Float32Array(N); this.Y = new Float32Array(N); this.R = new Float32Array(N);
    this.THE = new Float32Array(N); this.GEN = new Float32Array(N);
    this.P = new Int32Array(N); this.C = new Int32Array(N); this.D = new Int32Array(N);

    this.occ = document.createElement('canvas'); this.occ.width = this.occ.height = size;
    this.octx = this.occ.getContext('2d');
    this.tip = document.createElement('canvas'); this.tip.width = this.tip.height = size;
    this.tctx = this.tip.getContext('2d');
    this.reset(1);
  }

  // deterministic PRNG so a seed reproduces a bloom
  _rand() { this.s = (this.s * 1664525 + 1013904223) >>> 0; return this.s / 4294967296; }
  _gauss() { return (this._rand() + this._rand() + this._rand() - 1.5) * 0.95; }
  _key(cx, cy) { return cx * 100003 + cy; }

  reset(seed) {
    this.s = (seed >>> 0) || 1;
    this.num = 0; this.live = []; this.grid = new Map();
    this.octx.fillStyle = '#000'; this.octx.fillRect(0, 0, this.size, this.size);
    this.tctx.clearRect(0, 0, this.size, this.size);
    const r0 = this.paramsForBand(0).radius;
    for (let i = 0; i < this.sources; i++) {
      const a = this._rand() * Math.PI * 2, rr = this._rand() * 0.03;
      this._add(0.5 + Math.cos(a) * rr, 0.5 + Math.sin(a) * rr, r0, this._rand() * Math.PI * 2, -1, 0);
    }
  }

  _add(x, y, r, the, parent, gen) {
    const i = this.num;
    if (i >= this.NMAX) return -1;
    this.num++;
    this.X[i] = x; this.Y[i] = y; this.R[i] = r; this.THE[i] = the;
    this.P[i] = parent; this.GEN[i] = gen; this.C[i] = 0; this.D[i] = -1;
    const k = this._key(Math.floor(x / this.cell), Math.floor(y / this.cell));
    let b = this.grid.get(k); if (!b) { b = []; this.grid.set(k, b); }
    b.push(i);
    this.live.push(i);
    return i;
  }

  _collides(x, y, r, exclA, exclB, spacing) {
    const cx = Math.floor(x / this.cell), cy = Math.floor(y / this.cell);
    for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) {
      const b = this.grid.get(this._key(gx, gy)); if (!b) continue;
      for (let n = 0; n < b.length; n++) {
        const j = b[n]; if (j === exclA || j === exclB) continue;
        const dx = this.X[j] - x, dy = this.Y[j] - y;
        const dd = Math.sqrt(dx * dx + dy * dy);
        if (dd * 2.0 < (this.R[j] + r) * spacing) return true;   // mirrors hyphae.py: dd*2 > R+r
      }
    }
    return false;
  }

  _rn(x, y) { const dx = x - 0.5, dy = y - 0.5; return Math.sqrt(dx * dx + dy * dy) / this.maxR01; }

  clearTips() { this.tctx.clearRect(0, 0, this.size, this.size); }

  // run `attempts` growth attempts, capped to radius `growthCap` (0..1)
  step(growthCap, attempts) {
    const S = this.size;
    for (let t = 0; t < attempts && this.live.length; t++) {
      const li = (this._rand() * this.live.length) | 0;
      const k = this.live[li];
      const band = Math.max(0, Math.min(9, Math.floor(this._rn(this.X[k], this.Y[k]) * 10)));
      const p = this.paramsForBand(band);
      this.C[k]++;
      if (this.C[k] > p.maxAttempts) { this.live[li] = this.live[this.live.length - 1]; this.live.pop(); continue; }

      const hasChild = this.D[k] >= 0;
      const r = hasChild ? this.R[k] * p.radiusScale : this.R[k];
      if (r < 0.0015) { this.live[li] = this.live[this.live.length - 1]; this.live.pop(); continue; }

      const gen = this.GEN[k] + (hasChild ? 1 : 0);
      let the = this.THE[k] + this._gauss() * p.wobble;
      if (hasChild && this._rand() < p.branchChance) the += (this._rand() < 0.5 ? 1 : -1) * p.branchAngle;

      const stepLen = this.R[k] + r;
      const x = this.X[k] + Math.sin(the) * stepLen;
      const y = this.Y[k] + Math.cos(the) * stepLen;

      if (this._rn(x, y) > growthCap * 1.02 + 0.02) continue;          // frontier cap (cycle)
      if (x < 0.015 || x > 0.985 || y < 0.015 || y > 0.985) continue;  // bounds
      if (this.sampleMask(x, y) < p.minMask) continue;                 // mask: white = grow
      if (this._collides(x, y, r, k, this.P[k], p.spacing)) continue;

      const ni = this._add(x, y, r, the, k, gen);
      if (ni < 0) continue;
      if (this.D[k] < 0) this.D[k] = ni;

      const lw = Math.max(1, r * S * 1.6);
      const x1 = this.X[k] * S, y1 = this.Y[k] * S, x2 = x * S, y2 = y * S;
      for (const ctx of [this.octx, this.tctx]) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = lw; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
    }
  }
}
