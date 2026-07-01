// ---------------------------------------------------------------------------
// LTree — an L-system engine. Rewrite an axiom by production rules, then turtle-
// interpret the string into segments, drawn (revealed progressively) to a canvas.
// Ships presets and accepts a CUSTOM grammar (axiom + rules + angle). Turtle:
//   F G  draw forward · f  move (no draw) · + -  turn · [ ]  push/pop state
// Conforms to the field-engine interface { texture, params, defs, step, seed }.
// ---------------------------------------------------------------------------

export const LTREE_PRESETS = [
  { name: 'Plant',      axiom: 'X', rules: 'X=F+[[X]-X]-F[-FX]+X\nF=FF',          angle: 25,  iter: 5, sym: 1 },
  { name: 'Fern',       axiom: 'X', rules: 'X=F-[[X]+X]+F[+FX]-X\nF=FF',          angle: 25,  iter: 5, sym: 1 },
  { name: 'Bush',       axiom: 'F', rules: 'F=FF+[+F-F-F]-[-F+F+F]',              angle: 22,  iter: 4, sym: 1 },
  { name: 'Twig',       axiom: 'F', rules: 'F=F[+F]F[-F]F',                        angle: 25,  iter: 4, sym: 1 },
  { name: 'Seaweed',    axiom: 'F', rules: 'F=F[+F]F[-F][F]',                      angle: 20,  iter: 4, sym: 1 },
  { name: 'Sticks',     axiom: 'X', rules: 'X=F[+X]F[-X]+X\nF=FF',                angle: 20,  iter: 5, sym: 1 },
  { name: 'Bracket',    axiom: 'F', rules: 'F=FF-[-F+F+F]+[+F-F-F]',              angle: 22,  iter: 4, sym: 1 },
  { name: 'Frost',      axiom: 'F', rules: 'F=FF-[-F+F+F]+[+F-F-F]',              angle: 22,  iter: 3.22, sym: 1.68, jitter: 0.148, thick: 0.5 },
  { name: 'Koch',       axiom: 'F', rules: 'F=F+F-F-F+F',                          angle: 90,  iter: 3, sym: 1 },
  { name: 'Koch Island',axiom: 'F+F+F+F', rules: 'F=F+F-F-FF+F+F-F',              angle: 90,  iter: 2, sym: 1 },
  { name: 'Dragon',     axiom: 'FX',rules: 'X=X+YF+\nY=-FX-Y',                     angle: 90,  iter: 11, sym: 1 },
  { name: 'Levy C',     axiom: 'F', rules: 'F=+F--F+',                             angle: 45,  iter: 11, sym: 1 },
  { name: 'Hilbert',    axiom: 'A', rules: 'A=-BF+AFA+FB-\nB=+AF-BFB-FA+',         angle: 90,  iter: 5, sym: 1, draw: 'F' },
  { name: 'Gosper',     axiom: 'A', rules: 'A=A-B--B+A++AA+B-\nB=+A-BB--B-A++A+B', angle: 60, iter: 3, sym: 1, draw: 'AB' },
  { name: 'Arrowhead',  axiom: 'A', rules: 'A=+B-A-B+\nB=-A+B+A-',                 angle: 60,  iter: 6, sym: 1, draw: 'AB' },
  { name: 'Sierpinski', axiom: 'F-G-G', rules: 'F=F-G+F+G-F\nG=GG',               angle: 120, iter: 5, sym: 1 },
  { name: 'Crystal',    axiom: 'F+F+F+F', rules: 'F=FF+F++F+F',                   angle: 90,  iter: 3, sym: 1 },
  { name: 'Pentigree',  axiom: 'F', rules: 'F=+F++F----F--F++F++F-',              angle: 36,  iter: 4, sym: 1 },
  { name: 'Snowflake',  axiom: 'F++F++F', rules: 'F=F-F++F-F',                     angle: 60,  iter: 4, sym: 1 },
  { name: 'Mandala',    axiom: 'F', rules: 'F=F[+F]F[-F]F',                        angle: 25,  iter: 4, sym: 6 },
  { name: 'Rosette',    axiom: 'F', rules: 'F=FF+[+F-F-F]-[-F+F+F]',              angle: 24,  iter: 4, sym: 8 },
];

function mk2d(gl) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
function parseRules(str) { const r = {}; for (const ln of String(str).split('\n')) { const m = ln.split('='); if (m.length === 2 && m[0].trim()) r[m[0].trim()[0]] = m[1].trim(); } return r; }

export class LTree {
  constructor(gl, { size = 512 } = {}) {
    this.gl = gl; this.size = size;
    this.params = { angle: 25, iter: 5, sym: 1, jitter: 0.0, thick: 2.6 };
    this.defs = [
      { key: 'angle', min: 5, max: 120, label: 'angle' },
      { key: 'iter', min: 1, max: 7, label: 'iterations' },
      { key: 'sym', min: 1, max: 9, label: 'symmetry' },
      { key: 'jitter', min: 0, max: 0.4, label: 'jitter' },
      { key: 'thick', min: 0.5, max: 5, label: 'thickness' },
    ];
    this.presetIndex = 0;
    this.lsys = { axiom: LTREE_PRESETS[0].axiom, rules: LTREE_PRESETS[0].rules, draw: 'FG' };
    this.canvas = document.createElement('canvas'); this.canvas.width = this.canvas.height = size;
    this.ctx = this.canvas.getContext('2d');
    this.tex = mk2d(gl);
    this.setPreset(0);
  }
  _rand() { this.s = (this.s * 1664525 + 1013904223) >>> 0; return this.s / 4294967296; }

  setPreset(i) {
    this.presetIndex = ((i % LTREE_PRESETS.length) + LTREE_PRESETS.length) % LTREE_PRESETS.length;
    const P = LTREE_PRESETS[this.presetIndex];
    this.lsys = { axiom: P.axiom, rules: P.rules, draw: P.draw || 'FG' };
    this.params.angle = P.angle; this.params.iter = P.iter; this.params.sym = P.sym;
    this.params.jitter = P.jitter != null ? P.jitter : 0; this.params.thick = P.thick != null ? P.thick : 2.6;
    this.seed(1);
  }
  applyCustom(axiom, rules, draw) { this.lsys = { axiom: axiom || 'F', rules: rules || 'F=FF', draw: draw || 'FG' }; this.presetIndex = -1; this.seed(1); }

  _expand(axiom, rules, iter) {
    let s = axiom;
    for (let i = 0; i < iter; i++) { let n = ''; for (const ch of s) n += (rules[ch] != null ? rules[ch] : ch); s = n; if (s.length > 250000) break; }
    return s;
  }
  _turtle(str, angleDeg) {
    const seg = []; let x = 0, y = 0, a = -Math.PI / 2; const st = [];
    const ang = angleDeg * Math.PI / 180, jit = this.params.jitter, drawSet = this.lsys.draw || 'FG';
    let order = 0, depth = 0;
    for (const ch of str) {
      if (drawSet.indexOf(ch) >= 0) { const j = jit ? (this._rand() * 2 - 1) * jit : 0; const aa = a + j; const nx = x + Math.cos(aa), ny = y + Math.sin(aa); seg.push({ x1: x, y1: y, x2: nx, y2: ny, order: order++, depth }); x = nx; y = ny; }
      else if (ch === 'f') { x += Math.cos(a); y += Math.sin(a); }
      else if (ch === '+') a += ang;
      else if (ch === '-') a -= ang;
      else if (ch === '[') { st.push([x, y, a, depth]); depth++; }
      else if (ch === ']') { const p = st.pop(); if (p) { x = p[0]; y = p[1]; a = p[2]; depth = p[3]; } }
    }
    return seg;
  }

  seed(seed) {
    this.s = (seed >>> 0) || 1;
    const iter = Math.max(1, Math.round(this.params.iter)), sym = Math.max(1, Math.round(this.params.sym));
    const rules = parseRules(this.lsys.rules);
    const str = this._expand(this.lsys.axiom, rules, iter);
    const raw = this._turtle(str, this.params.angle);
    // normalise to unit radius about the figure centroid
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    for (const g of raw) { minx = Math.min(minx, g.x1, g.x2); maxx = Math.max(maxx, g.x1, g.x2); miny = Math.min(miny, g.y1, g.y2); maxy = Math.max(maxy, g.y1, g.y2); }
    const cx0 = (minx + maxx) / 2, cy0 = (miny + maxy) / 2, ext = Math.max(maxx - minx, maxy - miny, 1e-3) / 2;
    const S = this.size, c = S / 2, R = S * 0.40 / ext, maxD = Math.max(...raw.map((g) => g.depth), 1);
    this.segs = [];
    for (let k = 0; k < sym; k++) {
      const rot = k * 2 * Math.PI / sym, cs = Math.cos(rot), sn = Math.sin(rot);
      for (const g of raw) {
        const lx1 = (g.x1 - cx0) * R, ly1 = (g.y1 - cy0) * R, lx2 = (g.x2 - cx0) * R, ly2 = (g.y2 - cy0) * R;
        this.segs.push({ x1: c + lx1 * cs - ly1 * sn, y1: c + lx1 * sn + ly1 * cs, x2: c + lx2 * cs - ly2 * sn, y2: c + lx2 * sn + ly2 * cs, order: g.order, depth: g.depth });
      }
    }
    this.segs.sort((a, b) => a.order - b.order);
    this.maxD = maxD; this.drawn = 0;
    this.ctx.fillStyle = '#000'; this.ctx.fillRect(0, 0, S, S); this._upload();
  }

  step() {
    if (this.drawn >= this.segs.length) return;
    const batch = Math.max(4, Math.ceil(this.segs.length / 130)), end = Math.min(this.segs.length, this.drawn + batch);
    for (let i = this.drawn; i < end; i++) {
      const s = this.segs[i];
      this.ctx.strokeStyle = '#fff'; this.ctx.lineCap = 'round';
      this.ctx.lineWidth = Math.max(0.6, this.params.thick * (1 - s.depth / (this.maxD + 1)) + 0.4);
      this.ctx.beginPath(); this.ctx.moveTo(s.x1, s.y1); this.ctx.lineTo(s.x2, s.y2); this.ctx.stroke();
    }
    this.drawn = end; this._upload();
  }
  _upload() { const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, this.tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); }
  get texture() { return this.tex; }
}
