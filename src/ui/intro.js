import { PROJECT } from '../config/stages.js';

// ---------------------------------------------------------------------------
// SCRIPT.md §1 — the title boot, as a full-page ASCII canvas: matrix code
// rain + CRT scanlines/grain/vignette, with the 0xGCG mark formed *out of*
// the falling characters. `0x` is fixed; the GCG glyphs slot-cycle through a
// hex / genetic / katakana / code pool and lock one by one onto G·C·G, then
// the title resolves and two doors open — CORE and LAYOUT.
//
// This is the index (`/`). The whole page is the canvas.
// ---------------------------------------------------------------------------

const POOL = '01XATCGｦｱｲｳｴｵｶｷｸｹｺﾊﾐﾑﾒﾝ{}[]/\\<>=+*#§$%&'.split('');
// saturated CRT phosphor palette (hues, degrees) — greens, lime, gold, amber,
// magenta, cyan, violet, blue — drawn from the per-act colors of the piece.
const HUES = [150, 95, 45, 22, 320, 185, 268, 208];
const rnd = (n) => (Math.random() * n) | 0;
const pick = () => POOL[rnd(POOL.length)];

export class Intro {
  constructor({ onEnter }) {
    this.onEnter = onEnter;
    this.timers = [];
    this.raf = 0;
    this.reelIv = 0;
    this.resolved = false;
    this.dim = false;

    const el = document.createElement('div');
    el.id = 'intro';
    el.innerHTML = `
      <canvas class="in-canvas"></canvas>
      <div class="in-crt"></div>
      <div class="in-wrap">
        <div class="in-reveal">
          <h1 class="in-verbs">
            <span class="v" data-v="0">Grow.</span>
            <span class="v" data-v="1">Corrupt.</span>
            <span class="v" data-v="2">Glitch.</span>
          </h1>
          <div class="in-after">
            <p class="in-tag">— Same story over and over again.</p>
            <p class="in-credit">a short script made by AI and its human; about the universe, the core loop.</p>
            <nav class="in-doors">
              <button class="in-door" data-go="core">[ enter <b>CORE</b> ▸ ]<small>the neuron storyboard</small></button>
              <button class="in-door" data-go="layout">[ enter <b>LAYOUT</b> ▸ ]<small>the venue blueprint</small></button>
            </nav>
            <p class="in-hint">↵ enter · click a door · or press <kbd>C</kbd> / <kbd>L</kbd></p>
          </div>
        </div>
      </div>
      <div class="in-foot">
        <span>${PROJECT.code} · ${PROJECT.venue}</span>
        <span class="in-date" id="in-date">—</span>
      </div>`;
    document.body.appendChild(el);
    this.el = el;
    this.canvas = el.querySelector('.in-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.mask = document.createElement('canvas');
    this.mctx = this.mask.getContext('2d', { willReadFrequently: true });

    this.verbs = [...el.querySelectorAll('.v')];
    el.querySelectorAll('.in-door').forEach((b) =>
      b.addEventListener('click', () => this.onEnter(b.dataset.go)));
    el.addEventListener('click', (e) => {
      if (!this.resolved && !e.target.closest('.in-door')) this.resolve();
    });
    this._onResize = () => this.resize();
    addEventListener('resize', this._onResize);

    this.dateEl = el.querySelector('#in-date');
    this.dateTimer = setInterval(() => this.tickDate(), 1000);
    this.tickDate();
  }

  tickDate() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    if (this.dateEl) this.dateEl.textContent =
      `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
      `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  // ---- sizing + logo mask -------------------------------------------
  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = innerWidth, h = innerHeight;
    this.W = w; this.H = h;
    this.canvas.width = w * dpr; this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.font = Math.max(12, Math.round(w / 110)); // responsive cell size
    this.ctx.font = `${this.font}px monospace`;
    this.cellW = Math.max(7, this.ctx.measureText('0').width + 1);
    this.cellH = Math.round(this.font * 1.08);
    this.cols = Math.ceil(w / this.cellW);
    this.rows = Math.ceil(h / this.cellH);
    if (!this.drops || this.drops.length !== this.cols) {
      this.drops = Array.from({ length: this.cols }, () => -rnd(this.rows));
    }
    // a vivid hue per column, fully saturated
    this.colHue = Array.from({ length: this.cols }, () => HUES[rnd(HUES.length)]);
    this.colSat = Array.from({ length: this.cols }, () => 96 + rnd(5)); // 96–100

    // the 0xGCG mark is drawn on its OWN, coarser grid so its glyphs are
    // ~1.5x larger than the rain characters
    this.logoFont = Math.round(this.font * 1.5);
    this.ctx.font = `${this.logoFont}px monospace`;
    this.logoCellW = Math.max(10, this.ctx.measureText('0').width + 1);
    this.logoCellH = Math.round(this.logoFont * 1.05);
    this.logoCols = Math.ceil(w / this.logoCellW);
    this.logoRows = Math.ceil(h / this.logoCellH);

    this.mask.width = w; this.mask.height = h;
    this.maskGrid = new Uint8Array(this.logoCols * this.logoRows);
    this.logoChar = new Array(this.logoCols * this.logoRows).fill('');
    this.buildMask();
  }

  // sample the rendered "0x?CG" into a per-cell boolean grid (the logo is
  // drawn *with the falling glyphs* — this just marks which cells light up)
  buildMask() {
    if (!this.mctx) return;
    const { mctx, W, H } = this;
    const text = '0x' + (this.reels ? this.reels.join('') : 'GCG');
    mctx.clearRect(0, 0, W, H);
    mctx.fillStyle = '#fff';
    mctx.textBaseline = 'middle';
    mctx.textAlign = 'center';
    let fs = Math.min(W * 0.16, H * 0.34);
    mctx.font = `700 ${fs}px ui-monospace, monospace`;
    // shrink to fit width
    while (mctx.measureText(text).width > W * 0.82 && fs > 10) {
      fs *= 0.94; mctx.font = `700 ${fs}px ui-monospace, monospace`;
    }
    const cy = H * 0.40;
    mctx.fillText(text, W / 2, cy);
    const img = mctx.getImageData(0, 0, W, H).data;
    const g = this.maskGrid; g.fill(0);
    for (let r = 0; r < this.logoRows; r++) {
      const py = Math.min(H - 1, (r * this.logoCellH + this.logoCellH * 0.5) | 0);
      for (let c = 0; c < this.logoCols; c++) {
        const px = Math.min(W - 1, (c * this.logoCellW + this.logoCellW * 0.5) | 0);
        if (img[(py * W + px) * 4 + 3] > 80) {
          const idx = r * this.logoCols + c;
          g[idx] = 1;
          if (!this.logoChar[idx]) this.logoChar[idx] = pick();
        }
      }
    }
  }

  // ---- boot animation -----------------------------------------------
  play() {
    this.el.classList.add('show');
    this.el.classList.remove('resolved', 'lit');
    this.verbs.forEach((v) => v.classList.remove('show'));
    this.resolved = false; this.dim = false;
    this.reels = [pick(), pick(), pick()];
    this.locked = [false, false, false];
    this.clearTimers();
    this.resize();

    // each letter locks, then reveals its verb:
    //   0xG -> Grow. ,  0xGC -> Grow. Corrupt. ,  0xGCG -> Grow. Corrupt. Glitch.
    const FINAL = ['G', 'C', 'G'];
    const stopAt = [2400, 4000, 5600]; // slower: ~1.6s between each letter
    stopAt.forEach((ms, i) => this.timers.push(setTimeout(() => {
      this.reels[i] = FINAL[i]; this.locked[i] = true; this.buildMask();
      this.revealVerb(i);
    }, ms)));
    this.timers.push(setTimeout(() => this.resolve(), 6400));

    this.reelIv = setInterval(() => {
      let changed = false;
      for (let i = 0; i < 3; i++) if (!this.locked[i]) { this.reels[i] = pick(); changed = true; }
      if (changed) this.buildMask();
    }, 80);

    if (!this.raf) this.loop();
  }

  revealVerb(i) {
    this.el.classList.add('lit');
    this.verbs[i] && this.verbs[i].classList.add('show');
  }

  resolve() {
    if (this.resolved) return;
    this.resolved = true;
    this.dim = true;
    clearInterval(this.reelIv); this.reelIv = 0;
    this.reels = ['G', 'C', 'G']; this.locked = [true, true, true];
    this.buildMask();
    this.clearTimers();
    this.verbs.forEach((v) => v.classList.add('show')); // in case of skip
    this.el.classList.add('lit', 'resolved');
  }

  loop() {
    this.draw();
    this.raf = requestAnimationFrame(() => this.loop());
  }

  draw() {
    const { ctx, W, H, cellW, cellH } = this;
    // trailing fade (stronger once resolved so the reveal text reads)
    ctx.fillStyle = this.dim ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.10)';
    ctx.fillRect(0, 0, W, H);
    ctx.font = `${this.font}px monospace`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    // matrix rain — vivid & many-shaded: a 5-char gradient tail per column
    // (varied lightness = lots of shades) topped by a bright saturated head
    const TAIL = 5;
    for (let c = 0; c < this.cols; c++) {
      const x = c * cellW;
      const y = this.drops[c] * cellH;
      const h = this.colHue[c], s = this.colSat[c];
      for (let k = TAIL; k >= 1; k--) {
        const ty = y - k * cellH;
        if (ty < 0 || ty >= H) continue;
        const L = 18 + rnd(46) - k * 3;            // wide spread => many shades
        const a = (this.dim ? 0.32 : 0.62) / k;    // fades up the tail
        ctx.fillStyle = `hsla(${h},${s}%,${Math.max(10, L)}%,${a})`;
        ctx.fillText(pick(), x, ty);
      }
      if (y >= 0 && y < H) {
        // bright head — mid lightness keeps the hue vivid (not washed white)
        ctx.fillStyle = `hsla(${h},${s}%,${this.dim ? 58 : 66}%,${this.dim ? 0.7 : 1})`;
        ctx.fillText(pick(), x, y);
      }
      if (y > H && Math.random() > 0.975) this.drops[c] = -rnd(8);
      this.drops[c] += this.dim ? 0.55 : 1;
    }

    // the 0xGCG mark, formed out of bright glyphs (own 1.5x grid)
    const g = this.maskGrid;
    if (g) {
      const lw = this.logoCellW, lh = this.logoCellH;
      ctx.font = `700 ${this.logoFont}px monospace`;
      for (let r = 0; r < this.logoRows; r++) {
        for (let c = 0; c < this.logoCols; c++) {
          const idx = r * this.logoCols + c;
          if (!g[idx]) continue;
          if (Math.random() < 0.06) this.logoChar[idx] = pick(); // shimmer
          const x = c * lw, y = r * lh;
          ctx.fillStyle = 'rgba(0,0,0,0.92)'; ctx.fillRect(x, y, lw, lh); // knock-out
          // bright white mark with saturated sparkles
          ctx.fillStyle = Math.random() < 0.24 ? `hsl(${HUES[rnd(HUES.length)]},100%,68%)` : '#ffffff';
          ctx.fillText(this.logoChar[idx], x, y);
        }
      }
    }
  }

  // ---- show / hide --------------------------------------------------
  show() { this.play(); }   // always replay the boot when arriving at /
  hide() {
    this.el.classList.remove('show');
    cancelAnimationFrame(this.raf); this.raf = 0;
    clearInterval(this.reelIv); this.reelIv = 0;
    this.clearTimers();
  }
  clearTimers() { this.timers.forEach(clearTimeout); this.timers = []; }
}
