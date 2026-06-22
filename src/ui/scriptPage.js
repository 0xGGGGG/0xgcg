import { PASSAGES } from '../config/passages.js';
import { PROJECT } from '../config/stages.js';

// ---------------------------------------------------------------------------
// The Script page (the index) — merges the title boot and the about/manifesto
// into one narrated entity. It speaks SCRIPT.md passage by passage (Web Speech
// TTS) and karaoke-highlights each word as it is spoken; the passage reveals
// itself over a dim matrix/CRT backdrop. Rich HTML (iframe/video) is allowed
// per passage. Sticky reset / prev / play-pause / next at the bottom.
// ---------------------------------------------------------------------------

const POOL = '01XATCGｦｱｲｳｴｵﾊﾐﾑ{}[]/\\<>=+*#'.split('');
const HUES = [150, 95, 45, 22, 320, 185, 268, 208];
const rnd = (n) => (Math.random() * n) | 0;
const pick = () => POOL[rnd(POOL.length)];

export class ScriptPage {
  constructor({ onEnter }) {
    this.onEnter = onEnter;
    this.i = 0;
    this.playing = false;
    this.paras = [];     // [{ el, words:[{el,s,e}] }]
    this.paraIdx = 0;
    this.voice = null;
    this.tts = window.speechSynthesis || null;

    const el = document.createElement('div');
    el.id = 'script';
    el.innerHTML = `
      <canvas class="sp-bg"></canvas>
      <div class="sp-crt"></div>
      <div class="sp-frame">
        <header class="sp-top">
          <span class="sp-code">${PROJECT.code}</span>
          <span class="sp-counter"></span>
        </header>
        <div class="sp-stage"></div>
      </div>
      <nav class="sp-nav">
        <button class="sp-btn" data-a="reset" title="Reset (R)">⟲ reset</button>
        <button class="sp-btn" data-a="prev" title="Previous (←)">‹ prev</button>
        <button class="sp-btn sp-play" data-a="play" title="Play / pause (space)">▶ play</button>
        <button class="sp-btn" data-a="next" title="Next (→)">next ›</button>
        <div class="sp-doors">
          <button class="sp-door" data-go="core">Timeline ▸</button>
          <button class="sp-door" data-go="layout">Layout ▸</button>
        </div>
      </nav>`;
    document.body.appendChild(el);
    this.el = el;
    this.stage = el.querySelector('.sp-stage');
    this.counter = el.querySelector('.sp-counter');
    this.canvas = el.querySelector('.sp-bg');
    this.ctx = this.canvas.getContext('2d');
    this.mask = document.createElement('canvas');
    this.mctx = this.mask.getContext('2d', { willReadFrequently: true });
    this.boot = null; this.bootResolved = false; this.bootTimers = [];

    el.querySelectorAll('.sp-btn').forEach((b) => b.addEventListener('click', () => this.action(b.dataset.a)));
    el.querySelectorAll('.sp-door').forEach((b) => b.addEventListener('click', () => { this.stop(); this.onEnter && this.onEnter(b.dataset.go); }));

    // left rail: one tick per passage, hover reveals its title, jumps on click
    const rail = document.createElement('nav'); rail.className = 'sp-rail'; rail.setAttribute('aria-label', 'Sections');
    PASSAGES.forEach((p, i) => {
      const t = document.createElement('button'); t.className = 'sp-tick'; t.dataset.i = i;
      t.innerHTML = `<i></i><span class="sp-tick-label">${String(i + 1).padStart(2, '0')} · ${p.title}</span>`;
      t.addEventListener('click', () => this.goTo(i));
      rail.appendChild(t);
    });
    el.appendChild(rail);
    this.ticks = [...rail.querySelectorAll('.sp-tick')];
    this._onHash = () => {
      if (!el.classList.contains('show')) return;
      const idx = PASSAGES.findIndex((p) => p.tag === location.hash.replace('#', ''));
      if (idx >= 0 && idx !== this.i) this.goTo(idx);
    };
    window.addEventListener('hashchange', this._onHash);

    if (this.tts) {
      this.pickVoice();
      this.tts.onvoiceschanged = () => this.pickVoice();
    }
    // first render happens in show() so the boot reveal replays on entry
  }

  pickVoice() {
    const vs = this.tts.getVoices();
    this.voice = vs.find((v) => /en[-_]GB/i.test(v.lang) && /male|daniel|arthur/i.test(v.name))
      || vs.find((v) => /^en/i.test(v.lang)) || vs[0] || null;
  }

  // wrap each word in a <span> (karaoke target), keeping whitespace as text
  // so the utterance charIndex maps cleanly to a word
  wrapWords(text, el) {
    const words = []; let idx = 0;
    text.split(/(\s+)/).forEach((tok) => {
      if (tok === '' || /^\s+$/.test(tok)) { el.appendChild(document.createTextNode(tok)); idx += tok.length; return; }
      const w = document.createElement('span'); w.className = 'w'; w.textContent = tok;
      el.appendChild(w); words.push({ el: w, s: idx, e: idx + tok.length }); idx += tok.length;
    });
    return words;
  }

  // ---- render a passage ---------------------------------------------
  render(i) {
    clearTimeout(this.advTimer); clearTimeout(this._revealTimer);
    this.i = Math.max(0, Math.min(PASSAGES.length - 1, i));
    const p = PASSAGES[this.i];
    this.hero = !!p.hero;
    this.counter.textContent = `${String(this.i + 1).padStart(2, '0')} / ${String(PASSAGES.length).padStart(2, '0')} · ${p.tag}`;
    this.paras = []; this.paraIdx = 0;
    if (this.ticks) this.ticks.forEach((t, k) => t.classList.toggle('on', k === this.i));
    try { history.replaceState(history.state, '', location.pathname + '#' + p.tag); } catch {}

    const hasMedia = !!p.media;
    const wrap = document.createElement('div');
    wrap.className = 'sp-passage' + (p.hero ? ' hero' : '') + (hasMedia ? ' has-media' : '');

    // left column: the heading + description (what is spoken)
    const main = document.createElement('div'); main.className = 'sp-main';
    const title = document.createElement('h2'); title.className = 'sp-title';
    this.titleEl = title; this.titleText = p.title;
    this.titleWords = this.wrapWords(p.title, title);
    main.appendChild(title);

    const body = document.createElement('div'); body.className = 'sp-body';
    this.bodyEl = body;
    p.paras.forEach((entry) => {
      const text = typeof entry === 'string' ? entry : entry.text;
      const speak = typeof entry === 'string' ? entry : (entry.speak || entry.text);
      const cls = (typeof entry === 'object' && entry.cls) ? ' ' + entry.cls : '';
      const pEl = document.createElement('p'); pEl.className = 'sp-para' + cls;
      const words = this.wrapWords(text, pEl);
      body.appendChild(pEl);
      this.paras.push({ el: pEl, speak, words });
    });
    if (p.html) { const d = document.createElement('div'); d.className = 'sp-inline'; d.innerHTML = p.html; body.appendChild(d); }
    if (p.code) { const c = document.createElement('pre'); c.className = 'sp-codeblock'; c.textContent = p.code; body.appendChild(c); }
    if (p.link) {
      const a = document.createElement('button'); a.className = 'sp-link'; a.textContent = p.link.label;
      a.addEventListener('click', () => { this.stop(); this.onEnter && this.onEnter(p.link.go); });
      body.appendChild(a);
    }
    main.appendChild(body);
    wrap.appendChild(main);

    // right column (mobile: below): the sources / media
    if (hasMedia) {
      const aside = document.createElement('div'); aside.className = 'sp-aside';
      (Array.isArray(p.media) ? p.media : [p.media]).forEach((m) => aside.appendChild(this.media(m)));
      wrap.appendChild(aside);
    }

    this.stage.innerHTML = '';
    this.stage.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('in'));

    // hero: the ascii 0xGCG forms in the matrix, then the body reveals.
    // others: title shows, then (after a beat or after it is spoken) the body.
    if (this.hero) this.startBoot();
    else { this.stopBoot(); if (this.playing) this.startNarration(); else this._revealTimer = setTimeout(() => this.revealBody(), 850); }
  }

  revealBody() { if (this.bodyEl) this.bodyEl.classList.add('in'); }

  // ---- 0xGCG ascii boot reveal (hero) -------------------------------
  startBoot() {
    this.bootResolved = false;
    this.boot = { gain: 0, target: 1 };
    this.reels = [pick(), pick(), pick()];
    this.locked = [false, false, false];
    this.clearBootTimers();
    this.resize();
    const FINAL = ['G', 'C', 'G'];
    [1500, 2100, 2700].forEach((ms, i) => this.bootTimers.push(setTimeout(() => {
      this.reels[i] = FINAL[i]; this.locked[i] = true; this.buildMask();
    }, ms)));
    this.bootTimers.push(setTimeout(() => this.resolveBoot(), 3400));
    this.reelIv = setInterval(() => {
      let ch = false;
      for (let i = 0; i < 3; i++) if (!this.locked[i]) { this.reels[i] = pick(); ch = true; }
      if (ch) this.buildMask();
    }, 80);
  }
  resolveBoot() {
    if (this.bootResolved) return;
    this.bootResolved = true;
    clearInterval(this.reelIv); this.reelIv = 0;
    this.reels = ['G', 'C', 'G']; this.locked = [true, true, true]; this.buildMask();
    this.clearBootTimers();
    if (this.boot) this.boot.target = 0.85; // the mark lingers behind the hero text
    this.revealBody();
    if (this.playing) this.speakFrom(0);
  }
  stopBoot() { if (this.boot) this.boot.target = 0; clearInterval(this.reelIv); this.reelIv = 0; this.clearBootTimers(); }
  clearBootTimers() { this.bootTimers.forEach(clearTimeout); this.bootTimers = []; }

  media(m) {
    const box = document.createElement('div'); box.className = 'sp-media sp-media-' + m.type;
    if (m.type === 'youtube') box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${m.src}" loading="lazy" title="${m.caption || 'video'}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    else if (m.type === 'iframe') box.innerHTML = `<iframe src="${m.src}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    else if (m.type === 'video') box.innerHTML = `<video src="${m.src}" controls playsinline></video>`;
    else if (m.type === 'html') box.innerHTML = m.html;
    if (m.caption) {
      const href = m.type === 'youtube' ? `https://www.youtube.com/watch?v=${m.src}` : (m.src || '');
      box.insertAdjacentHTML('beforeend', href
        ? `<a class="sp-cap" href="${href}" target="_blank" rel="noopener">${m.caption} <b>↗ open</b></a>`
        : `<span class="sp-cap">${m.caption}</span>`);
    }
    return box;
  }

  // ---- narration (TTS + karaoke) ------------------------------------
  // speak the (big) title first, then pause, then reveal + speak the body
  startNarration() {
    if (this.hero) { if (this.bootResolved) { this.revealBody(); this.speakFrom(0); } return; }
    if (!this.titleText) { this.revealBody(); this.speakFrom(0); return; }
    this.speakTitle();
  }

  speakTitle() {
    this.titleEl.classList.add('active');
    const after = () => {
      this.titleWords.forEach((w) => w.el.classList.add('done'));
      this.titleEl.classList.remove('active');
      this._revealTimer = setTimeout(() => { this.revealBody(); this.speakFrom(0); }, 750);
    };
    if (!this.tts) { after(); return; }
    const u = new SpeechSynthesisUtterance(this.titleText);
    u.rate = 0.9; u.pitch = 0.8; if (this.voice) u.voice = this.voice;
    let lit = -1;
    u.onboundary = (e) => {
      const ci = e.charIndex || 0;
      const wi = this.titleWords.findIndex((w) => ci >= w.s && ci < w.e);
      if (wi >= 0 && wi !== lit) { if (lit >= 0) this.titleWords[lit].el.classList.remove('lit'); this.titleWords[wi].el.classList.add('lit'); lit = wi; }
    };
    u.onend = after;
    this.curUtter = u; this.tts.cancel(); this.tts.speak(u);
  }

  speakFrom(idx) {
    if (!this.tts) return;
    if (idx >= this.paras.length) { this.onPassageEnd(); return; }
    this.paraIdx = idx;
    const para = this.paras[idx];
    this.paras.forEach((q) => q.el.classList.remove('active'));
    para.el.classList.add('active');
    const u = new SpeechSynthesisUtterance(para.speak);
    u.rate = 0.95; u.pitch = 0.86; if (this.voice) u.voice = this.voice;
    let lit = -1;
    u.onboundary = (e) => {
      const ci = e.charIndex || 0;
      const wi = para.words.findIndex((w) => ci >= w.s && ci < w.e);
      if (wi >= 0 && wi !== lit) { if (lit >= 0) para.words[lit].el.classList.remove('lit'); para.words[wi].el.classList.add('lit'); lit = wi; }
    };
    u.onend = () => { para.words.forEach((w) => w.el.classList.add('done')); para.el.classList.remove('active'); if (this.playing) this.speakFrom(idx + 1); };
    this.curUtter = u;
    this.tts.cancel();
    this.tts.speak(u);
  }

  onPassageEnd() {
    if (this.playing && this.i < PASSAGES.length - 1) {
      this.advTimer = setTimeout(() => { if (this.playing) this.render(this.i + 1); }, 1100); // render auto-narrates
    } else { this.playing = false; this.setPlayBtn(); }
  }

  setPlayBtn() {
    const b = this.el.querySelector('.sp-play');
    if (b) b.textContent = this.playing ? '❚❚ pause' : '▶ play';
  }

  action(a) {
    clearTimeout(this.advTimer); clearTimeout(this._revealTimer);
    if (a === 'reset') { this.playing = false; this.stopSpeak(); this.render(0); this.setPlayBtn(); }
    else if (a === 'prev') { this.stopSpeak(); this.render(this.i - 1); }   // render narrates if playing
    else if (a === 'next') { this.stopSpeak(); this.render(this.i + 1); }
    else if (a === 'play') {
      if (!this.playing) {
        this.playing = true; this.setPlayBtn();
        if (this.tts && this.tts.paused) this.tts.resume();
        else if (!this.tts || !this.tts.speaking) this.startNarration();
      } else {
        this.playing = false; this.setPlayBtn();
        if (this.tts && this.tts.speaking) this.tts.pause();
      }
    }
  }

  goTo(i) {
    if (i === this.i) return;
    this.stopSpeak();
    this.render(i); // render auto-narrates when playing
  }

  stopSpeak() { if (this.tts) this.tts.cancel(); clearTimeout(this.advTimer); clearTimeout(this._revealTimer); }
  stop() { this.playing = false; this.stopSpeak(); }

  key(e) {
    if (e.key === 'ArrowRight') { this.action('next'); return true; }
    if (e.key === 'ArrowLeft') { this.action('prev'); return true; }
    if (e.key === ' ') { e.preventDefault(); this.action('play'); return true; }
    if (e.key.toLowerCase() === 'r') { this.action('reset'); return true; }
    return false;
  }

  // ---- matrix backdrop + 0xGCG mark ---------------------------------
  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.W = innerWidth; this.H = innerHeight;
    this.canvas.width = this.W * dpr; this.canvas.height = this.H * dpr;
    this.canvas.style.width = this.W + 'px'; this.canvas.style.height = this.H + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.font = Math.max(12, Math.round(this.W / 120));
    this.ctx.font = `${this.font}px monospace`;
    this.cellW = Math.max(7, this.ctx.measureText('0').width + 1);
    this.cellH = Math.round(this.font * 1.08);
    this.cols = Math.ceil(this.W / this.cellW);
    this.rows = Math.ceil(this.H / this.cellH);
    this.drops = Array.from({ length: this.cols }, () => -rnd(this.rows));
    this.colHue = Array.from({ length: this.cols }, () => HUES[rnd(HUES.length)]);
    this.colSat = Array.from({ length: this.cols }, () => 96 + rnd(5));
    // the 0xGCG mark on its own coarser grid (~1.5x the rain glyphs)
    this.logoFont = Math.round(this.font * 1.5);
    this.ctx.font = `${this.logoFont}px monospace`;
    this.logoCellW = Math.max(10, this.ctx.measureText('0').width + 1);
    this.logoCellH = Math.round(this.logoFont * 1.05);
    this.logoCols = Math.ceil(this.W / this.logoCellW);
    this.logoRows = Math.ceil(this.H / this.logoCellH);
    this.mask.width = this.W; this.mask.height = this.H;
    this.maskGrid = new Uint8Array(this.logoCols * this.logoRows);
    this.logoChar = new Array(this.logoCols * this.logoRows).fill('');
    this.buildMask();
  }

  buildMask() {
    if (!this.mctx || !this.logoRows) return;
    const { mctx, W, H } = this;
    const text = '0x' + (this.reels ? this.reels.join('') : 'GCG');
    mctx.clearRect(0, 0, W, H);
    mctx.fillStyle = '#fff'; mctx.textBaseline = 'middle'; mctx.textAlign = 'center';
    let fs = Math.min(W * 0.15, H * 0.3);
    mctx.font = `700 ${fs}px ui-monospace, monospace`;
    while (mctx.measureText(text).width > W * 0.8 && fs > 10) { fs *= 0.94; mctx.font = `700 ${fs}px ui-monospace, monospace`; }
    mctx.fillText(text, W / 2, H * 0.30);
    const img = mctx.getImageData(0, 0, W, H).data;
    const g = this.maskGrid; g.fill(0);
    for (let r = 0; r < this.logoRows; r++) {
      const py = Math.min(H - 1, (r * this.logoCellH + this.logoCellH * 0.5) | 0);
      for (let c = 0; c < this.logoCols; c++) {
        const px = Math.min(W - 1, (c * this.logoCellW + this.logoCellW * 0.5) | 0);
        if (img[(py * W + px) * 4 + 3] > 80) { const idx = r * this.logoCols + c; g[idx] = 1; if (!this.logoChar[idx]) this.logoChar[idx] = pick(); }
      }
    }
  }

  draw() {
    const g = this.ctx, W = this.W, H = this.H, cw = this.cellW, ch = this.cellH;
    if (this.boot) this.boot.gain += ((this.boot.target || 0) - this.boot.gain) * 0.05;
    const gain = this.boot ? this.boot.gain : 0;
    g.fillStyle = `rgba(0,0,0,${0.10 + gain * 0.10})`; g.fillRect(0, 0, W, H);
    g.font = `${this.font}px monospace`; g.textBaseline = 'top'; g.textAlign = 'left';
    const TAIL = 5;
    for (let c = 0; c < this.cols; c++) {
      const x = c * cw, y = this.drops[c] * ch, h = this.colHue[c], s = this.colSat[c];
      for (let k = TAIL; k >= 1; k--) {
        const ty = y - k * ch; if (ty < 0 || ty >= H) continue;
        const L = 18 + rnd(40) - k * 3, a = (0.18 + gain * 0.42) / k;
        g.fillStyle = `hsla(${h},${s}%,${Math.max(10, L)}%,${a})`; g.fillText(pick(), x, ty);
      }
      if (y >= 0 && y < H) { g.fillStyle = `hsla(${h},${s}%,${54 + gain * 12}%,${0.45 + gain * 0.5})`; g.fillText(pick(), x, y); }
      if (y > H && Math.random() > 0.975) this.drops[c] = -rnd(8);
      this.drops[c] += 0.6 + gain * 0.4;
    }
    // the 0xGCG mark, formed of bright glyphs, fading by boot gain
    if (gain > 0.02 && this.maskGrid) {
      const lw = this.logoCellW, lh = this.logoCellH, G = this.maskGrid;
      g.font = `700 ${this.logoFont}px monospace`;
      for (let r = 0; r < this.logoRows; r++) for (let c = 0; c < this.logoCols; c++) {
        const idx = r * this.logoCols + c; if (!G[idx]) continue;
        if (Math.random() < 0.06) this.logoChar[idx] = pick();
        const x = c * lw, y = r * lh;
        g.fillStyle = `rgba(0,0,0,${0.9 * gain})`; g.fillRect(x, y, lw, lh);
        g.fillStyle = Math.random() < 0.24 ? `hsl(${HUES[rnd(HUES.length)]},100%,68%)` : '#ffffff';
        g.globalAlpha = gain; g.fillText(this.logoChar[idx], x, y); g.globalAlpha = 1;
      }
    }
  }

  show() {
    this.el.classList.add('show');
    this.resize();
    if (!this._onR) { this._onR = () => this.resize(); addEventListener('resize', this._onR); }
    if (!this.raf) { const loop = () => { this.draw(); this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); }
    const hashIdx = PASSAGES.findIndex((p) => p.tag === location.hash.replace('#', ''));
    this.render(hashIdx > 0 ? hashIdx : 0); // honor #section anchor, else replay boot
  }
  hide() {
    this.el.classList.remove('show');
    this.stop();
    this.stopBoot();
    cancelAnimationFrame(this.raf); this.raf = 0;
  }
}
