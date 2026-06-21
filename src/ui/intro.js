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
    // a saturated hue per column (a few near-white columns for sparkle)
    this.colHue = Array.from({ length: this.cols }, () => HUES[rnd(HUES.length)]);
    this.colSat = Array.from({ length: this.cols }, () => (Math.random() < 0.12 ? 20 : 90));
    this.mask.width = w; this.mask.height = h;
    this.maskGrid = new Uint8Array(this.cols * this.rows);
    this.logoChar = new Array(this.cols * this.rows).fill('');
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
    for (let r = 0; r < this.rows; r++) {
      const py = Math.min(H - 1, (r * this.cellH + this.cellH * 0.5) | 0);
      for (let c = 0; c < this.cols; c++) {
        const px = Math.min(W - 1, (c * this.cellW + this.cellW * 0.5) | 0);
        if (img[(py * W + px) * 4 + 3] > 80) {
          const idx = r * this.cols + c;
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
    const stopAt = [1500, 2150, 2800];
    stopAt.forEach((ms, i) => this.timers.push(setTimeout(() => {
      this.reels[i] = FINAL[i]; this.locked[i] = true; this.buildMask();
      this.revealVerb(i);
    }, ms)));
    this.timers.push(setTimeout(() => this.resolve(), 3250));

    this.reelIv = setInterval(() => {
      let changed = false;
      for (let i = 0; i < 3; i++) if (!this.locked[i]) { this.reels[i] = pick(); changed = true; }
      if (changed) this.buildMask();
    }, 70);

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

    // matrix rain — saturated, many-shaded; one moving head per column,
    // a mid-shade char just behind it, dim tail left by the fade
    for (let c = 0; c < this.cols; c++) {
      const x = c * cellW;
      const y = this.drops[c] * cellH;
      const h = this.colHue[c], s = this.colSat[c];
      if (y >= 0 && y < H) {
        const L = 40 + rnd(24); // varied lightness => many shades
        ctx.fillStyle = `hsla(${h},${s}%,${L}%,${this.dim ? 0.4 : 0.8})`;
        ctx.fillText(pick(), x, y - cellH);
        // bright head
        ctx.fillStyle = `hsla(${h},${Math.min(100, s + 8)}%,${this.dim ? 70 : 82}%,${this.dim ? 0.6 : 1})`;
        ctx.fillText(pick(), x, y);
      }
      if (y > H && Math.random() > 0.975) this.drops[c] = -rnd(8);
      this.drops[c] += this.dim ? 0.55 : 1;
    }

    // the 0xGCG mark, formed out of bright glyphs
    const g = this.maskGrid;
    if (g) {
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const idx = r * this.cols + c;
          if (!g[idx]) continue;
          if (Math.random() < 0.06) this.logoChar[idx] = pick(); // shimmer
          const x = c * cellW, y = r * cellH;
          ctx.fillStyle = 'rgba(0,0,0,0.92)'; ctx.fillRect(x, y, cellW, cellH); // knock-out
          // bright white mark with saturated sparkles
          ctx.fillStyle = Math.random() < 0.22 ? `hsl(${this.colHue[c]},95%,72%)` : '#ffffff';
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
