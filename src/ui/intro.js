import { PROJECT } from '../config/stages.js';

// ---------------------------------------------------------------------------
// SCRIPT.md §1 — the title boot. `0x` stays fixed; the `GCG` reels cycle like
// a hybrid of matrix rain / casino slot / hex memory address / genetic codon
// / corrupted bootloader, "as if the system is trying to name itself". The
// reels settle one by one onto G·C·G, the title resolves, and two doors open:
// CORE (the neuron storyboard) and LAYOUT (the venue blueprint).
//
// This is the index (`/`). Pure ASCII / terminal — no 3D.
// ---------------------------------------------------------------------------

const POOL = '01XATCGｦｱｳｴｵ{}[]/\\|_#*+-=!<>'.split('');
const WORDS = ['void', 'seed', 'null', 'main', 'loop', '0xGCG', 'grow', 'glitch'];

export class Intro {
  constructor({ onEnter }) {
    this.onEnter = onEnter;        // (mode:'core'|'layout') => void
    this.timers = [];
    this.reelIntervals = [];
    this.resolved = false;

    const el = document.createElement('div');
    el.id = 'intro';
    el.innerHTML = `
      <div class="in-scan"></div>
      <div class="in-wrap">
        <pre class="in-sigil">· ───────────  g r o w · c o r r u p t · g l i t c h  ─────────── ·</pre>

        <div class="in-title" aria-label="0xGCG">
          <span class="in-fixed">0x</span><span class="in-reel" data-r="0">G</span><span class="in-reel" data-r="1">C</span><span class="in-reel" data-r="2">G</span>
        </div>

        <pre class="in-boot">> booting substrate...
> seed: <span class="in-seed">null</span>
> loading references...
> awaiting signal<span class="in-cursor">_</span></pre>

        <div class="in-reveal">
          <h1>Grow. Corrupt. Glitch.</h1>
          <p class="in-tag">— Same story over and over again.</p>
          <p class="in-credit">a short script made by AI and its human; about the universe, the core loop.</p>
          <nav class="in-doors">
            <button class="in-door" data-go="core">[ enter <b>CORE</b> ▸ ]<small>the neuron storyboard</small></button>
            <button class="in-door" data-go="layout">[ enter <b>LAYOUT</b> ▸ ]<small>the venue blueprint</small></button>
          </nav>
          <p class="in-hint">↵ enter · click a door · or press <kbd>C</kbd> / <kbd>L</kbd></p>
        </div>
      </div>

      <div class="in-foot">
        <span>${PROJECT.code} · ${PROJECT.venue}</span>
        <span class="in-date" id="in-date">—</span>
      </div>`;
    document.body.appendChild(el);
    this.el = el;
    this.reels = [...el.querySelectorAll('.in-reel')];

    el.querySelectorAll('.in-door').forEach((b) =>
      b.addEventListener('click', () => this.onEnter(b.dataset.go)));
    // click anywhere before the reveal = skip the boot animation
    el.addEventListener('click', (e) => {
      if (!this.resolved && !e.target.closest('.in-door')) this.resolve(true);
    });

    this.dateEl = el.querySelector('#in-date');
    this.dateTimer = setInterval(() => this.tickDate(), 1000);
    this.tickDate();
  }

  tickDate() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    if (this.dateEl) {
      this.dateEl.textContent =
        `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
        `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    }
  }

  // begin / restart the boot animation
  play() {
    this.el.classList.add('show');
    this.el.classList.remove('resolved');
    this.resolved = false;
    this.clearTimers();

    const FINAL = ['G', 'C', 'G'];
    const stopAt = [1500, 1950, 2400]; // reels settle one by one
    this.reels.forEach((r, i) => {
      const iv = setInterval(() => {
        r.textContent = POOL[(Math.random() * POOL.length) | 0];
        r.classList.toggle('hot');
      }, 55 + i * 12);
      this.reelIntervals.push(iv);
      this.timers.push(setTimeout(() => {
        clearInterval(iv);
        r.textContent = FINAL[i];
        r.classList.add('locked');
      }, stopAt[i]));
    });

    // flicker the boot "seed" value while reels spin
    const seed = this.el.querySelector('.in-seed');
    const sIv = setInterval(() => {
      seed.textContent = WORDS[(Math.random() * WORDS.length) | 0];
    }, 140);
    this.reelIntervals.push(sIv);
    this.timers.push(setTimeout(() => { clearInterval(sIv); seed.textContent = 'void'; }, 2400));

    this.timers.push(setTimeout(() => this.resolve(false), 2750));
  }

  resolve(skip) {
    if (this.resolved) return;
    this.resolved = true;
    this.clearTimers();
    this.reels.forEach((r, i) => { r.textContent = 'GCG'[i]; r.classList.add('locked'); r.classList.remove('hot'); });
    const seed = this.el.querySelector('.in-seed');
    if (seed) seed.textContent = 'void';
    this.el.classList.add('resolved');
  }

  show() { this.el.classList.contains('resolved') ? this.el.classList.add('show') : this.play(); }
  hide() { this.el.classList.remove('show'); this.clearTimers(); }

  clearTimers() {
    this.reelIntervals.forEach(clearInterval); this.reelIntervals = [];
    this.timers.forEach(clearTimeout); this.timers = [];
  }
}
