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

    el.querySelectorAll('.sp-btn').forEach((b) => b.addEventListener('click', () => this.action(b.dataset.a)));
    el.querySelectorAll('.sp-door').forEach((b) => b.addEventListener('click', () => { this.stop(); this.onEnter && this.onEnter(b.dataset.go); }));

    if (this.tts) {
      this.pickVoice();
      this.tts.onvoiceschanged = () => this.pickVoice();
    }
    this.render(0);
  }

  pickVoice() {
    const vs = this.tts.getVoices();
    this.voice = vs.find((v) => /en[-_]GB/i.test(v.lang) && /male|daniel|arthur/i.test(v.name))
      || vs.find((v) => /^en/i.test(v.lang)) || vs[0] || null;
  }

  // ---- render a passage ---------------------------------------------
  render(i) {
    this.i = Math.max(0, Math.min(PASSAGES.length - 1, i));
    const p = PASSAGES[this.i];
    this.counter.textContent = `${String(this.i + 1).padStart(2, '0')} / ${String(PASSAGES.length).padStart(2, '0')} · ${p.tag}`;
    this.paras = [];
    this.paraIdx = 0;

    const wrap = document.createElement('div');
    wrap.className = 'sp-passage' + (p.hero ? ' hero' : '');
    wrap.innerHTML = `<h2 class="sp-title">${p.title}</h2>`;
    const body = document.createElement('div'); body.className = 'sp-body';
    wrap.appendChild(body);

    p.paras.forEach((text) => {
      const pEl = document.createElement('p'); pEl.className = 'sp-para';
      const words = [];
      let idx = 0;
      // wrap words in spans, keep whitespace as text so charIndex maps cleanly
      text.split(/(\s+)/).forEach((tok) => {
        if (/^\s+$/.test(tok) || tok === '') { pEl.appendChild(document.createTextNode(tok)); idx += tok.length; return; }
        const w = document.createElement('span'); w.className = 'w'; w.textContent = tok;
        pEl.appendChild(w); words.push({ el: w, s: idx, e: idx + tok.length }); idx += tok.length;
      });
      body.appendChild(pEl);
      this.paras.push({ el: pEl, text, words });
    });

    if (p.code) {
      const c = document.createElement('pre'); c.className = 'sp-codeblock'; c.textContent = p.code;
      body.appendChild(c);
    }
    if (p.media) body.appendChild(this.media(p.media));

    this.stage.innerHTML = '';
    this.stage.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('in'));
  }

  media(m) {
    const box = document.createElement('div'); box.className = 'sp-media';
    if (m.type === 'iframe') box.innerHTML = `<iframe src="${m.src}" loading="lazy" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    else if (m.type === 'video') box.innerHTML = `<video src="${m.src}" controls playsinline></video>`;
    else if (m.type === 'html') box.innerHTML = m.html;
    if (m.caption) box.insertAdjacentHTML('beforeend', `<span class="sp-cap">${m.caption}</span>`);
    return box;
  }

  // ---- narration (TTS + karaoke) ------------------------------------
  speakFrom(idx) {
    if (!this.tts) return;
    if (idx >= this.paras.length) { this.onPassageEnd(); return; }
    this.paraIdx = idx;
    const para = this.paras[idx];
    this.paras.forEach((q) => q.el.classList.remove('active'));
    para.el.classList.add('active');
    const u = new SpeechSynthesisUtterance(para.text);
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
      this.advTimer = setTimeout(() => { if (this.playing) { this.render(this.i + 1); this.speakFrom(0); } }, 1000);
    } else { this.playing = false; this.setPlayBtn(); }
  }

  setPlayBtn() {
    const b = this.el.querySelector('.sp-play');
    if (b) b.textContent = this.playing ? '❚❚ pause' : '▶ play';
  }

  action(a) {
    clearTimeout(this.advTimer);
    if (a === 'reset') { this.playing = false; this.stop(); this.render(0); this.setPlayBtn(); }
    else if (a === 'prev') { this.stopSpeak(); this.render(this.i - 1); if (this.playing) this.speakFrom(0); }
    else if (a === 'next') { this.stopSpeak(); this.render(this.i + 1); if (this.playing) this.speakFrom(0); }
    else if (a === 'play') {
      this.playing = !this.playing; this.setPlayBtn();
      if (this.playing) this.speakFrom(0); else if (this.tts) this.tts.cancel();
    }
  }
  stopSpeak() { if (this.tts) this.tts.cancel(); clearTimeout(this.advTimer); }
  stop() { this.playing = false; this.stopSpeak(); }

  key(e) {
    if (e.key === 'ArrowRight') { this.action('next'); return true; }
    if (e.key === 'ArrowLeft') { this.action('prev'); return true; }
    if (e.key === ' ') { e.preventDefault(); this.action('play'); return true; }
    if (e.key.toLowerCase() === 'r') { this.action('reset'); return true; }
    return false;
  }

  // ---- matrix backdrop ----------------------------------------------
  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.W = innerWidth; this.H = innerHeight;
    this.canvas.width = this.W * dpr; this.canvas.height = this.H * dpr;
    this.canvas.style.width = this.W + 'px'; this.canvas.style.height = this.H + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.font = 14; this.cell = 16;
    this.cols = Math.ceil(this.W / this.cell);
    this.drops = Array.from({ length: this.cols }, () => -((Math.random() * this.H / this.cell) | 0));
  }
  draw() {
    const g = this.ctx;
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, this.W, this.H);
    g.font = `${this.font}px monospace`;
    for (let c = 0; c < this.cols; c++) {
      const y = this.drops[c] * this.cell;
      if (y > 0 && y < this.H) {
        g.fillStyle = 'rgba(90,150,120,0.35)';
        g.fillText(POOL[(Math.random() * POOL.length) | 0], c * this.cell, y);
      }
      if (y > this.H && Math.random() > 0.975) this.drops[c] = 0;
      this.drops[c] += 1;
    }
  }

  show() {
    this.el.classList.add('show');
    this.resize();
    if (!this._onR) { this._onR = () => this.resize(); addEventListener('resize', this._onR); }
    if (!this.raf) { const loop = () => { this.draw(); this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); }
  }
  hide() {
    this.el.classList.remove('show');
    this.stop();
    cancelAnimationFrame(this.raf); this.raf = 0;
  }
}
