// ---------------------------------------------------------------------------
// WFC — 3-lane socket Wave Function Collapse tileset. Each tile has three ports
// per edge (3-bit mask); neighbours must agree port-for-port. Tiles are sparse,
// routed to a centre hub and decorated per theme by the shared tiledeco module.
// The themes ARE the presets (Circuits, Pipes, Vessels, …). Conforms to the
// sandbox field interface { texture, params, defs, style, setStyle, step, seed,
// finish }. Tiles render via SVG→Image (async); the field re-uploads when ready.
// ---------------------------------------------------------------------------
import { THEMES, buildPool, decorateSvg } from '../../scripts/tiledeco.mjs';

const THEME_KEYS = Object.keys(THEMES);
const cap = (s) => s[0].toUpperCase() + s.slice(1);
export const WFC_STYLES = THEME_KEYS.map(cap);

const OPP = [2, 3, 0, 1], DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];

function mk2d(gl) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
const svgURL = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
const loadImg = (url) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url; });
function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function precompat(pool) { const M = pool.length, C = Array.from({ length: M }, () => [[], [], [], []]); for (let a = 0; a < M; a++) for (let d = 0; d < 4; d++) for (let b = 0; b < M; b++) if (pool[a].edges[d] === pool[b].edges[OPP[d]]) C[a][d].push(b); return C; }
function solve(pool, C, G, rng) {
  const M = pool.length, N = G * G;
  const cells = Array.from({ length: N }, () => new Set(Array.from({ length: M }, (_, i) => i)));
  for (let guard = 0; guard < N * 60; guard++) {
    let best = -1, bE = 1e9;
    for (let i = 0; i < N; i++) { const c = cells[i].size; if (c > 1 && c + rng() * 0.4 < bE) { bE = c + rng() * 0.4; best = i; } }
    if (best < 0) break;
    const opts = [...cells[best]], tot = opts.reduce((a, t) => a + pool[t].w, 0);
    let r = rng() * tot, pk = opts[0];
    for (const t of opts) { r -= pool[t].w; if (r <= 0) { pk = t; break; } }
    cells[best] = new Set([pk]);
    const stack = [best];
    while (stack.length) {
      const i = stack.pop(), x = i % G, y = (i / G) | 0;
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d], ny = y + DY[d]; if (nx < 0 || ny < 0 || nx >= G || ny >= G) continue;
        const ni = ny * G + nx, allowed = new Set();
        for (const t of cells[i]) for (const b of C[t][d]) allowed.add(b);
        const nc = cells[ni]; let changed = false;
        for (const t of [...nc]) if (!allowed.has(t)) { nc.delete(t); changed = true; }
        if (nc.size === 0) return null;
        if (changed) stack.push(ni);
      }
    }
  }
  return cells.map((s) => [...s][0] ?? 0);
}

export class WFC {
  constructor(gl, { size = 512 } = {}) {
    this.gl = gl; this.size = size;
    this.params = { grid: 9, size: 2.5, width: 1.0, density: 0.1, glow: 1.0 };
    this.defs = [
      { key: 'grid', min: 5, max: 18, label: 'grid' },
      { key: 'size', min: 0.4, max: 4, label: 'object size' },
      { key: 'width', min: 0.4, max: 2.6, label: 'line width' },
      { key: 'density', min: 0.1, max: 2.2, label: 'density' },
      { key: 'glow', min: 0, max: 2.6, label: 'glow' },
    ];
    this.style = 0;
    this.canvas = document.createElement('canvas'); this.canvas.width = this.canvas.height = size;
    this.ctx = this.canvas.getContext('2d');
    this.tex = mk2d(gl);
    this.pool = buildPool(); this.compat = precompat(this.pool);
    this._imgs = null; this._tileKey = ''; this._token = 0; this.s = 1;
    this.seed(1);
  }
  get texture() { return this.tex; }
  setStyle(i) { this.style = ((i % THEME_KEYS.length) + THEME_KEYS.length) % THEME_KEYS.length; this._imgs = null; this.seed(this.s || 1); }
  seed(seed) { this.s = (seed >>> 0) || 1; this._render(); }
  step() { /* static tileset — nothing to advance per frame */ }
  finish() { this._render(); }

  _tileOpts() { return { scale: this.params.size, tw: this.params.width, dens: this.params.density, glow: this.params.glow }; }
  _key() { const p = this.params; return [this.style, p.size, p.width, p.density, p.glow].join(','); }

  async _render() {
    const token = ++this._token;
    const theme = THEMES[THEME_KEYS[this.style]];
    // re-rasterise tiles only when style / visual params changed (not on reseed / grid)
    const key = this._key();
    if (this._tileKey !== key || !this._imgs) {
      this._tileKey = key;
      const opts = this._tileOpts();
      const imgs = await Promise.all(this.pool.map((t) => loadImg(svgURL(decorateSvg(t, theme, opts)))));
      if (token !== this._token) return;
      this._imgs = imgs;
    }
    // solve (retry a few seeds on contradiction) + composite
    const G = Math.max(2, Math.round(this.params.grid));
    let map = null;
    for (let k = 0; k < 6 && !map; k++) map = solve(this.pool, this.compat, G, mulberry((this.s ^ (k * 0x9e3779b9)) >>> 0));
    map = map || new Array(G * G).fill(0);
    const ctx = this.ctx, S = this.size, cell = S / G;
    ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < map.length; i++) { const im = this._imgs[map[i]]; if (im) ctx.drawImage(im, (i % G) * cell, ((i / G) | 0) * cell, cell, cell); }
    if (token !== this._token) return;
    this._upload();
  }
  _upload() { const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, this.tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); }
}
