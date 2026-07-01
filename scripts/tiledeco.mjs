// ---------------------------------------------------------------------------
// tiledeco — shared, pure (no node deps) tile geometry + decoration for the
// 3-lane socket WFC tileset. Used by scripts/tiles3.mjs (rasterises via sharp)
// AND the browser viewer (renders SVG live). decorateSvg() takes an `opts` bag
// so size / trace-width / density / glow / palette are all live-tunable.
// ---------------------------------------------------------------------------
export const SIZE = 512;
export const FRAC = [1 / 6, 1 / 2, 5 / 6];              // the 3 lane positions per edge
const OPP = [2, 3, 0, 1];

// palette presets the viewer can swap in (null/theme => the theme's own palette)
export const PALETTES = {
  theme: null,
  neon: ['#22e0ff', '#ff3df0', '#8bff5a', '#ffd23a', '#b06dff'],
  cyber: ['#00ffd5', '#00b3ff', '#7a5cff', '#ff2fb0', '#19ff9e'],
  warm: ['#ff8a3c', '#ffd23a', '#ff5a7a', '#ff3df0', '#ff5030'],
  ice: ['#7fd6ff', '#9fe8ff', '#3a8fff', '#eafdff', '#5ad1ff'],
  acid: ['#8bff5a', '#3affc0', '#c8ff00', '#ffd23a', '#00ffa2'],
   member: ['#ff3df0', '#b03cff', '#7a2dff', '#e066ff', '#ff6ad5'],
};

export const THEMES = {
  circuits: { kind: 'trace', motif: 'chip', col: '#22e0ff', mark: '#ff3df0', accents: ['#8bff5a', '#ffd23a', '#ff8a3c', '#b06dff', '#ff3df0'], core: null, bg: '#04060a' },
  pipes: { kind: 'tube', motif: 'valve', col: '#ff3df0', mark: '#ffd870', accents: ['#b03cff'], core: '#2a0620', bg: '#04060a' },
  vessels: { kind: 'organic', motif: 'cell', col: '#ff4f6d', mark: '#ff8a3c', accents: ['#ff5a7a'], core: null, bg: '#080306' },
  neurons: { kind: 'organic', motif: 'synapse', col: '#7fd6ff', mark: '#eafdff', accents: ['#3a8fff'], core: null, bg: '#03060a' },
  dataflow: { kind: 'trace', motif: 'packet', col: '#3affc0', mark: '#22e0ff', accents: ['#8bff5a'], core: null, bg: '#04060a' },
  vines: { kind: 'organic', motif: 'leaf', col: '#8bff5a', mark: '#3affc0', accents: ['#ffd23a'], core: null, bg: '#040803' },
  rails: { kind: 'track', motif: 'tie', col: '#cdd6df', mark: '#8a939c', accents: ['#aeb8c2'], core: '#05060a', bg: '#05060a' },
  conveyor: { kind: 'track', motif: 'tread', col: '#ffd23a', mark: '#26200a', accents: ['#ffae3a'], core: '#26200a', bg: '#06050a' },
  botnet: { kind: 'trace', motif: 'node', col: '#b06dff', mark: '#ff3df0', accents: ['#22e0ff'], core: null, bg: '#04040a' },
};

// ── pool ─────────────────────────────────────────────────────────────────────
const keyOf = (edges) => edges.join('.');
let _tid = 0;
function makeTile(edges, w, seed) { const ports = []; for (let e = 0; e < 4; e++) for (let i = 0; i < 3; i++) if (edges[e] & (1 << i)) ports.push({ edge: e, i }); return { edges, ports, w, seed: (seed ?? (++_tid * 2654435761)) >>> 0 }; }
function edgesFrom(pairs) { const e = [0, 0, 0, 0]; for (const [edge, i] of pairs) e[edge] |= (1 << i); return e; }
export function buildPool() {
  _tid = 0;
  const seen = new Set(), pool = [];
  const add = (edges, w) => { const k = keyOf(edges); if (!seen.has(k)) { seen.add(k); pool.push(makeTile(edges, w)); } };
  add([0, 0, 0, 0], 3.0);
  for (let i = 0; i < 3; i++) { add(edgesFrom([[0, i], [2, i]]), 1.4); add(edgesFrom([[3, i], [1, i]]), 1.4); }
  for (let e = 0; e < 4; e++) for (let i = 0; i < 3; i++) add(edgesFrom([[e, i]]), 1.1);
  let s = 0x9e37; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let n = 0; n < 90 && pool.length < 58; n++) { const cnt = 2 + (rnd() * 3 | 0), picks = []; for (let k = 0; k < cnt; k++) picks.push([rnd() * 4 | 0, rnd() * 3 | 0]); add(edgesFrom(picks), 0.8); }
  for (let k = 0; k < 6; k++) pool.push(makeTile([0, 0, 0, 0], 1.6, 0x51ed * (k + 1)));
  for (let k = 0; k < 8; k++) { const base = pool[7 + (k * 3) % 30]; pool.push(makeTile(base.edges.slice(), base.w, 0x77a1 * (k + 3))); }
  return pool;
}

// ── geometry ─────────────────────────────────────────────────────────────────
function portXY(edge, i, S) { const f = FRAC[i] * S; if (edge === 0) return [f, 0]; if (edge === 2) return [f, S]; if (edge === 3) return [0, f]; return [S, f]; }
function route(tile, S) { const c = S / 2, out = []; for (const { edge, i } of tile.ports) { const [px, py] = portXY(edge, i, S); const ex = (edge === 1 || edge === 3) ? c : px, ey = (edge === 0 || edge === 2) ? c : py; out.push({ px, py, ex, ey, cx: c, cy: c }); } return out; }
function samples(r, spacing) { const pts = []; const walk = (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy); if (len < 1) return; const tx = dx / len, ty = dy / len, n = Math.max(1, Math.round(len / spacing)); for (let k = 0; k <= n; k++) { const t = k / n; pts.push({ x: ax + dx * t, y: ay + dy * t, nx: -ty, ny: tx }); } }; walk(r.px, r.py, r.ex, r.ey); walk(r.ex, r.ey, r.cx, r.cy); return pts; }
const routePathQ = (r) => `M ${r.px} ${r.py} Q ${r.ex} ${r.ey} ${r.cx} ${r.cy}`;
const routePathL = (r) => `M ${r.px} ${r.py} L ${r.ex} ${r.ey} L ${r.cx} ${r.cy}`;
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
function mkRng(seed) { let s = (seed >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const pick = (rng, a) => a[(rng() * a.length) | 0];
const DARK = '#0a1418';

// ── component library (sizes are absolute px; callers pass scaled sizes) ─────
const cVia = (x, y, r, col) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/><circle cx="${x}" cy="${y}" r="${r * 0.45}" fill="#05070b"/>`;
const cPad = (x, y, s, col) => `<rect x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" fill="${col}"/>`;
const cJunction = (x, y, r, col) => `<circle cx="${x}" cy="${y}" r="${r * 1.7}" fill="${hexA(col, 0.18)}"/><circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/><circle cx="${x}" cy="${y}" r="${r * 0.4}" fill="#05070b"/>`;
const cCap = (x, y, s, col, ang) => `<g transform="rotate(${ang} ${x} ${y})"><line x1="${x - s * 0.16}" y1="${y - s}" x2="${x - s * 0.16}" y2="${y + s}" stroke="${col}" stroke-width="${s * 0.2}"/><line x1="${x + s * 0.16}" y1="${y - s}" x2="${x + s * 0.16}" y2="${y + s}" stroke="${col}" stroke-width="${s * 0.2}"/></g>`;
const cLed = (x, y, r, col) => `<circle cx="${x}" cy="${y}" r="${r * 2.2}" fill="${hexA(col, 0.2)}"/><circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.34}" fill="#fff" opacity="0.85"/>`;
const cTri = (x, y, s, col, ang) => `<g transform="rotate(${ang} ${x} ${y})"><polygon points="${x},${y - s} ${x + s * 0.87},${y + s * 0.55} ${x - s * 0.87},${y + s * 0.55}" fill="${DARK}" stroke="${col}" stroke-width="${s * 0.16}" stroke-linejoin="round"/><circle cx="${x}" cy="${y + s * 0.1}" r="${s * 0.16}" fill="${col}"/></g>`;
const cRes = (x, y, s, col, ang) => { const w = s, h = s * 0.34; return `<g transform="rotate(${ang} ${x} ${y})"><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${h * 0.35}" fill="#c8a86a"/><rect x="${x - w * 0.22}" y="${y - h / 2}" width="${w * 0.09}" height="${h}" fill="${col}"/><rect x="${x - w * 0.02}" y="${y - h / 2}" width="${w * 0.09}" height="${h}" fill="#ff3df0"/><rect x="${x + w * 0.18}" y="${y - h / 2}" width="${w * 0.09}" height="${h}" fill="#8bff5a"/></g>`; };
function cChip(x, y, s, col) { const h = s / 2, pl = s * 0.16; let p = ''; for (let k = -1; k <= 1; k++) { const o = y + k * s * 0.3; p += `<line x1="${x - h - pl}" y1="${o}" x2="${x - h}" y2="${o}" stroke="${col}" stroke-width="${s * 0.07}"/><line x1="${x + h}" y1="${o}" x2="${x + h + pl}" y2="${o}" stroke="${col}" stroke-width="${s * 0.07}"/>`; } return `${p}<rect x="${x - h}" y="${y - h}" width="${s}" height="${s}" rx="${s * 0.08}" fill="${DARK}" stroke="${col}" stroke-width="${s * 0.06}"/><circle cx="${x - h * 0.45}" cy="${y - h * 0.45}" r="${s * 0.1}" fill="${col}"/>`; }
function cProc(x, y, s, col, rng) { const h = s / 2, pl = s * 0.11, pw = s * 0.05; let p = ''; for (let k = -1; k <= 1; k++) { const o = k * s * 0.28; p += `<line x1="${x - h - pl}" y1="${y + o}" x2="${x - h}" y2="${y + o}" stroke="${col}" stroke-width="${pw}"/><line x1="${x + h}" y1="${y + o}" x2="${x + h + pl}" y2="${y + o}" stroke="${col}" stroke-width="${pw}"/><line x1="${x + o}" y1="${y - h - pl}" x2="${x + o}" y2="${y - h}" stroke="${col}" stroke-width="${pw}"/><line x1="${x + o}" y1="${y + h}" x2="${x + o}" y2="${y + h + pl}" stroke="${col}" stroke-width="${pw}"/>`; } const d = s * 0.28, acc = pick(rng, ['#ff3df0', '#8bff5a', '#ffd23a', col]); return `${p}<rect x="${x - h}" y="${y - h}" width="${s}" height="${s}" rx="${s * 0.06}" fill="${DARK}" stroke="${col}" stroke-width="${s * 0.05}"/><rect x="${x - d}" y="${y - d}" width="${d * 2}" height="${d * 2}" fill="none" stroke="${hexA(col, 0.5)}" stroke-width="${s * 0.03}"/><line x1="${x - d}" y1="${y}" x2="${x + d}" y2="${y}" stroke="${hexA(col, 0.35)}" stroke-width="${s * 0.02}"/><line x1="${x}" y1="${y - d}" x2="${x}" y2="${y + d}" stroke="${hexA(col, 0.35)}" stroke-width="${s * 0.02}"/><circle cx="${x - h * 0.62}" cy="${y - h * 0.62}" r="${s * 0.07}" fill="${acc}"/>`; }
function traceComp(rng, pal, col, p, sc) { const x = p.x, y = p.y, r = rng(); if (r < 0.42) return cPad(x, y, SIZE * 0.026 * sc, col); if (r < 0.6) return cVia(x, y, SIZE * 0.02 * sc, col); if (r < 0.76) return cRes(x, y, SIZE * 0.075 * sc, pick(rng, pal), Math.atan2(-p.nx, p.ny) * 57.3); if (r < 0.9) return cTri(x, y, SIZE * 0.032 * sc, pick(rng, pal), rng() * 360); return cLed(x, y, SIZE * 0.017 * sc, pick(rng, pal)); }
function fillerComp(rng, pal, x, y, sc) { const col = pick(rng, pal), r = rng(); if (r < 0.10) return cProc(x, y, SIZE * 0.18 * sc, col, rng); if (r < 0.32) return cChip(x, y, SIZE * 0.12 * sc, col); if (r < 0.55) return cTri(x, y, SIZE * 0.055 * sc, col, rng() * 360); if (r < 0.74) return cLed(x, y, SIZE * 0.028 * sc, col); if (r < 0.9) return cRes(x, y, SIZE * 0.085 * sc, col, rng() * 360); return cCap(x, y, SIZE * 0.05 * sc, col, rng() * 360); }
// hub: microprocessors are now RARE (busy hubs only); mostly solder junctions +
// small parts so the routes read as cables, not a wall of chips.
function hubTrace(rng, pal, c, n, sc) {
  const col = pick(rng, pal), r = rng();
  if (n >= 4 && r < 0.22) return cProc(c, c, SIZE * 0.22 * sc, col, rng);
  if (n >= 3 && r < 0.10) return cProc(c, c, SIZE * 0.2 * sc, col, rng);
  const q = rng();
  if (q < 0.34) return cJunction(c, c, SIZE * 0.05 * sc, col);
  if (q < 0.54) return cChip(c, c, SIZE * 0.12 * sc, col);
  if (q < 0.73) return cLed(c, c, SIZE * 0.048 * sc, col);
  if (q < 0.88) return cTri(c, c, SIZE * 0.075 * sc, col, rng() * 360);
  return cVia(c, c, SIZE * 0.045 * sc, col);
}

const tick = (p, half, col, w) => `<line x1="${p.x - p.nx * half}" y1="${p.y - p.ny * half}" x2="${p.x + p.nx * half}" y2="${p.y + p.ny * half}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;

// ── tube (pipes) parts ──────────────────────────────────────────────────────
const cRivet = (x, y, r, col) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/>`;
const cValveW = (x, y, s, mark, core) => `<circle cx="${x}" cy="${y}" r="${s}" fill="${core}" stroke="${mark}" stroke-width="${s * 0.22}"/><line x1="${x - s * 1.3}" y1="${y}" x2="${x + s * 1.3}" y2="${y}" stroke="${mark}" stroke-width="${s * 0.18}"/><line x1="${x}" y1="${y - s * 1.3}" x2="${x}" y2="${y + s * 1.3}" stroke="${mark}" stroke-width="${s * 0.18}"/><circle cx="${x}" cy="${y}" r="${s * 0.32}" fill="${mark}"/>`;
const cCoupling = (x, y, s, col, mark) => `<circle cx="${x}" cy="${y}" r="${s}" fill="none" stroke="${col}" stroke-width="${s * 0.34}"/><circle cx="${x}" cy="${y}" r="${s * 0.6}" fill="none" stroke="${mark}" stroke-width="${s * 0.16}"/>`;
function cGauge(x, y, s, col, mark, ang) { let t = ''; for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; t += `<line x1="${x + Math.cos(a) * s * 0.68}" y1="${y + Math.sin(a) * s * 0.68}" x2="${x + Math.cos(a) * s * 0.9}" y2="${y + Math.sin(a) * s * 0.9}" stroke="${hexA(col, 0.5)}" stroke-width="${s * 0.06}"/>`; } const na = ang * 0.01745; return `<circle cx="${x}" cy="${y}" r="${s}" fill="${DARK}" stroke="${col}" stroke-width="${s * 0.14}"/>${t}<line x1="${x}" y1="${y}" x2="${x + Math.cos(na) * s * 0.7}" y2="${y + Math.sin(na) * s * 0.7}" stroke="${mark}" stroke-width="${s * 0.12}"/><circle cx="${x}" cy="${y}" r="${s * 0.15}" fill="${mark}"/>`; }
function tubeMark(theme, p, S, sc, rng) { if (rng() < 0.55) { const o = S * 0.032; return cRivet(p.x + p.nx * o, p.y + p.ny * o, S * 0.007 * sc, theme.mark) + cRivet(p.x - p.nx * o, p.y - p.ny * o, S * 0.007 * sc, theme.mark); } return tick(p, S * 0.05 * sc, theme.mark, S * 0.01); }
function tubeHub(theme, c, S, sc, rng) { const q = rng(); if (q < 0.4) return cValveW(c, c, S * 0.052 * sc, theme.mark, theme.core); if (q < 0.7) return cCoupling(c, c, S * 0.07 * sc, theme.col, theme.mark); return cGauge(c, c, S * 0.06 * sc, theme.col, theme.mark, rng() * 360); }

// ── track (rails / conveyor) parts ──────────────────────────────────────────
const cBallast = (x, y, r, col) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/>`;
const cRoller = (x, y, r, col) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${col}" stroke-width="${r * 0.42}"/><line x1="${x - r}" y1="${y}" x2="${x + r}" y2="${y}" stroke="${col}" stroke-width="${r * 0.22}"/>`;
const cSignal = (x, y, s, col) => `<line x1="${x}" y1="${y + s}" x2="${x}" y2="${y - s}" stroke="#59636e" stroke-width="${s * 0.28}"/><circle cx="${x}" cy="${y - s}" r="${s * 0.42}" fill="${col}"/>`;
function cChevron(p, s, col) { const tx = p.ny, ty = -p.nx, bx = p.x - tx * s * 0.4, by = p.y - ty * s * 0.4, fx = p.x + tx * s * 0.6, fy = p.y + ty * s * 0.6; return `<line x1="${bx - p.nx * s}" y1="${by - p.ny * s}" x2="${fx}" y2="${fy}" stroke="${col}" stroke-width="${s * 0.28}"/><line x1="${bx + p.nx * s}" y1="${by + p.ny * s}" x2="${fx}" y2="${fy}" stroke="${col}" stroke-width="${s * 0.28}"/>`; }
function trackMark(theme, p, S, sc, rng) {
  if (theme.motif === 'tread') { if (rng() < 0.16) return cRoller(p.x, p.y, S * 0.03 * sc, theme.col); return tick(p, S * 0.05 * sc, theme.col, S * 0.012); }
  const t = tick(p, S * 0.052 * sc, theme.col, S * 0.013); if (rng() < 0.5) { const o = S * 0.05 * sc; return t + cRivet(p.x + p.nx * o, p.y + p.ny * o, S * 0.008 * sc, theme.mark) + cRivet(p.x - p.nx * o, p.y - p.ny * o, S * 0.008 * sc, theme.mark); } return t;
}
function trackHub(theme, c, S, sc, rng) { if (theme.motif === 'tread') return cRoller(c, c, S * 0.06 * sc, theme.col) + cBallast(c, c, S * 0.018 * sc, theme.col); const q = rng(); if (q < 0.45) return cSignal(c, c, S * 0.06 * sc, pick(rng, ['#27e0a0', '#ff4f4f', '#ffd23a'])); return cRoller(c, c, S * 0.05 * sc, theme.col); }

// ── organic (vessels / neurons / vines) parts ───────────────────────────────
const cBloodCell = (x, y, r, col, ang) => `<g transform="rotate(${ang} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.68}" fill="${col}"/><ellipse cx="${x}" cy="${y}" rx="${r * 0.5}" ry="${r * 0.3}" fill="rgba(0,0,0,0.35)"/></g>`;
const cSoma = (x, y, r, col, mark) => `<circle cx="${x}" cy="${y}" r="${r * 1.8}" fill="${hexA(col, 0.28)}"/><circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/><circle cx="${x}" cy="${y}" r="${r * 0.4}" fill="${mark}"/>`;
const cVesicle = (x, y, r, col) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${col}" stroke-width="${r * 0.55}"/>`;
function cSpine(p, len, col) { const ex = p.x + p.nx * len, ey = p.y + p.ny * len; return `<line x1="${p.x}" y1="${p.y}" x2="${ex}" y2="${ey}" stroke="${col}" stroke-width="${len * 0.16}"/><circle cx="${ex}" cy="${ey}" r="${len * 0.24}" fill="${col}"/>`; }
const cLeaf2 = (x, y, s, col, ang) => `<g transform="rotate(${ang} ${x} ${y})"><path d="M ${x} ${y} Q ${x + s * 0.6} ${y - s * 0.55} ${x + s * 1.5} ${y} Q ${x + s * 0.6} ${y + s * 0.55} ${x} ${y} Z" fill="${col}"/><line x1="${x}" y1="${y}" x2="${x + s * 1.5}" y2="${y}" stroke="rgba(0,0,0,0.25)" stroke-width="${s * 0.09}"/></g>`;
const cBud = (x, y, r, col) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.4}" fill="rgba(255,255,255,0.4)"/>`;
function cFlower(x, y, r, col, mark) { let p = ''; for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; p += `<ellipse cx="${px}" cy="${py}" rx="${r * 0.62}" ry="${r * 0.34}" fill="${col}" transform="rotate(${a * 57.3} ${px} ${py})"/>`; } return `${p}<circle cx="${x}" cy="${y}" r="${r * 0.5}" fill="${mark}"/>`; }
function organicMark(theme, p, S, sc, rng, pal) {
  if (theme.motif === 'cell') { if (rng() < 0.5) return cBloodCell(p.x, p.y, S * 0.02 * sc, theme.col, rng() * 360); return cSpine(p, S * 0.028 * sc, theme.mark); }
  if (theme.motif === 'synapse') { if (rng() < 0.55) return cSpine(p, S * 0.032 * sc, theme.col); return cVesicle(p.x, p.y, S * 0.013 * sc, theme.mark); }
  const rr = rng(); if (rr < 0.62) return cLeaf2(p.x, p.y, S * 0.026 * sc, pick(rng, pal), Math.atan2(p.ny, p.nx) * 57.3 + (rng() * 40 - 20)); if (rr < 0.82) return cBud(p.x, p.y, S * 0.013 * sc, theme.accents[0]); return '';
}
function organicHub(theme, c, S, sc, rng, pal) {
  if (theme.motif === 'cell') return cSoma(c, c, S * 0.05 * sc, theme.col, theme.mark);
  if (theme.motif === 'synapse') return cSoma(c, c, S * 0.055 * sc, theme.col, theme.mark);
  return cFlower(c, c, S * 0.05 * sc, theme.accents[0], theme.mark);
}

// negative-space filler + background texture per family (adds detail & variety)
function negFiller(theme, x, y, S, sc, rng, pal) {
  const q = rng();
  if (theme.kind === 'tube') { if (q < 0.4) return cGauge(x, y, S * 0.045 * sc, theme.col, theme.mark, rng() * 360); if (q < 0.7) return cValveW(x, y, S * 0.04 * sc, theme.mark, theme.core); return cCoupling(x, y, S * 0.05 * sc, theme.col, theme.mark); }
  if (theme.kind === 'track') { if (theme.motif === 'tread') { if (q < 0.5) return cRoller(x, y, S * 0.045 * sc, theme.col); return cChevron({ x, y, nx: 0, ny: 1 }, S * 0.05 * sc, theme.col); } if (q < 0.5) return cSignal(x, y, S * 0.05 * sc, pick(rng, ['#27e0a0', '#ff4f4f', '#ffd23a'])); return cRoller(x, y, S * 0.04 * sc, theme.col); }
  if (theme.motif === 'cell') return cBloodCell(x, y, S * 0.03 * sc, theme.col, rng() * 360) + cBloodCell(x + S * 0.04, y + S * 0.028, S * 0.024 * sc, theme.mark, rng() * 360);
  if (theme.motif === 'synapse') return cSoma(x, y, S * 0.032 * sc, theme.col, theme.mark);
  return cFlower(x, y, S * 0.038 * sc, theme.accents[0], theme.mark);
}
function bgTexture(theme, rng, dens) {
  const S = SIZE, R = () => (0.05 + rng() * 0.9) * S; let out = '', n = 0;
  if (theme.kind === 'track' && theme.motif === 'tie') { n = Math.round(22 * dens); for (let k = 0; k < n; k++) out += cBallast(R(), R(), S * (0.004 + rng() * 0.006), pick(rng, ['#3a4048', '#2a2e34', '#4a525a'])); }
  else if (theme.kind === 'track') { n = Math.round(7 * dens); for (let k = 0; k < n; k++) out += cBallast(R(), R(), S * 0.006, hexA(theme.col, 0.15)); }
  else if (theme.motif === 'cell') { n = Math.round(9 * dens); for (let k = 0; k < n; k++) out += rng() < 0.6 ? cBloodCell(R(), R(), S * (0.011 + rng() * 0.01), hexA(theme.col, 0.5), rng() * 360) : cBallast(R(), R(), S * 0.005, hexA(theme.mark, 0.3)); }
  else if (theme.motif === 'synapse') { n = Math.round(9 * dens); for (let k = 0; k < n; k++) out += rng() < 0.5 ? cVesicle(R(), R(), S * 0.01, hexA(theme.col, 0.5)) : cBallast(R(), R(), S * 0.004, hexA(theme.mark, 0.4)); }
  else if (theme.motif === 'leaf') { n = Math.round(8 * dens); for (let k = 0; k < n; k++) out += rng() < 0.5 ? cLeaf2(R(), R(), S * 0.015, hexA(theme.col, 0.5), rng() * 360) : cBallast(R(), R(), S * 0.005, hexA(theme.accents[0], 0.4)); }
  return out;
}

// ── the one entry point ──────────────────────────────────────────────────────
export function decorateSvg(tile, theme, opts = {}) {
  const { scale = 1, tw = 1, dens = 1, glow = 1, pal: palOverride = null } = opts;
  const S = SIZE, c = S / 2, rs = route(tile, S), g = [];
  const bg = `<rect width="${S}" height="${S}" fill="${theme.bg}"/>`;
  const rng = mkRng(tile.seed);
  const pal = (palOverride && palOverride.length) ? palOverride : [theme.col, ...(theme.accents || [])];
  const pathFor = theme.kind === 'organic' ? routePathQ : routePathL;
  const strokeR = (r, w, col) => `<path d="${pathFor(r)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  // layered bloom — visibly scales with the glow control (0 = off)
  const glowStroke = (r, coreW, col) => glow <= 0 ? '' : strokeR(r, coreW * 3.8, hexA(col, 0.05 * glow)) + strokeR(r, coreW * 2.4, hexA(col, 0.09 * glow)) + strokeR(r, coreW * 1.5, hexA(col, 0.17 * glow));

  g.push(bgTexture(theme, rng, dens));                    // background detail layer

  if (theme.kind === 'tube') {
    for (const r of rs) { g.push(glowStroke(r, S * 0.03 * tw, theme.col)); g.push(strokeR(r, S * 0.078 * tw, theme.col)); g.push(strokeR(r, S * 0.03 * tw, theme.core)); g.push(strokeR(r, S * 0.011 * tw, hexA('#ffffff', 0.22))); for (const p of samples(r, S * 0.12 / dens)) g.push(tubeMark(theme, p, S, scale, rng)); }
    for (const r of rs) g.push(cCoupling(r.px, r.py, S * 0.034 * scale, theme.col, theme.mark));
    if (tile.ports.length) g.push(tubeHub(theme, c, S, scale, rng));
  } else if (theme.kind === 'track') {
    for (const r of rs) { g.push(glowStroke(r, S * 0.03 * tw, theme.col)); g.push(strokeR(r, S * 0.07 * tw, theme.col)); g.push(strokeR(r, S * 0.03 * tw, theme.core)); const sp = (theme.motif === 'tread' ? S * 0.05 : S * 0.085) / dens; for (const p of samples(r, sp)) g.push(trackMark(theme, p, S, scale, rng)); }
    if (tile.ports.length) g.push(trackHub(theme, c, S, scale, rng));
  } else if (theme.kind === 'organic') {
    for (const r of rs) { const col = rng() < 0.35 ? pick(rng, pal) : theme.col; g.push(glowStroke(r, S * 0.02 * tw, col)); g.push(strokeR(r, S * 0.02 * tw, col)); for (const p of samples(r, S * 0.11 / dens)) g.push(organicMark(theme, p, S, scale, rng, pal)); }
    if (tile.ports.length) g.push(organicHub(theme, c, S, scale, rng, pal));
  } else { // trace
    for (const r of rs) { const col = pick(rng, pal); g.push(glowStroke(r, S * 0.019 * tw, col)); g.push(strokeR(r, S * 0.019 * tw, col)); for (const p of samples(r, S * 0.17 / dens)) if (rng() < Math.min(0.95, 0.55 * dens)) g.push(traceComp(rng, pal, col, p, scale)); }
    for (const r of rs) g.push(cVia(r.px, r.py, S * 0.03 * scale, pick(rng, pal)));
    if (tile.ports.length) g.push(hubTrace(rng, pal, c, tile.ports.length, scale));
  }
  // negative-space corner fillers (all families)
  const corners = [[FRAC[0], FRAC[0]], [FRAC[2], FRAC[0]], [FRAC[0], FRAC[2]], [FRAC[2], FRAC[2]]];
  const fillP = (tile.ports.length ? 0.28 : 0.62) * dens;
  for (const [fx, fy] of corners) if (rng() < fillP) g.push(theme.kind === 'trace' ? fillerComp(rng, pal, fx * S, fy * S, scale) : negFiller(theme, fx * S, fy * S, S, scale, rng, pal));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">${bg}${g.join('')}</svg>`;
}
