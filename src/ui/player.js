// ---------------------------------------------------------------------------
// A reusable transport / timeline player, shared by Core (the 5 acts) and
// Layout (the loop cycle). It shows a big play/pause, step chips with arrows,
// a ruler (minor ticks + a colored boundary line per stage) with a playhead,
// and a caption. Clicking a step (or a ruler segment) selects it — owners
// wire that to navigate the camera. Built to grow into a full timeline view.
// ---------------------------------------------------------------------------

export class Player {
  // steps: [{ key, label, sub, color, dur }]
  // opts.waveform → ruler shows the active track's waveform (voice-memo scrubber)
  constructor({ steps, onSelect, onToggle, onSeek, waveform = false, playing = true }) {
    this.steps = steps;
    this.onSelect = onSelect;
    this.onToggle = onToggle;
    this.onSeek = onSeek;
    this.waveform = waveform;
    this.playing = playing;
    this.active = 0;
    this.total = steps.reduce((s, x) => s + (x.dur || 1), 0);

    const el = document.createElement('div');
    el.className = 'player';
    el.innerHTML =
      `<div class="pl-main">` +
        `<button class="pl-toggle" title="Play / pause (space)">${playing ? '❚❚' : '▶'}</button>` +
        `<div class="pl-steps">${steps.map((s, i) =>
          `<button class="pl-step" data-i="${i}" style="--c:${s.color}"><i></i><span>${s.label}</span></button>`)
          .join('<b class="pl-arrow">→</b>')}</div>` +
      `</div>` +
      `<div class="pl-ruler${waveform ? ' is-wave' : ''}">` +
        (waveform ? `<canvas class="pl-wave"></canvas>` : `<div class="pl-track"></div>`) +
        `<div class="pl-head"></div></div>` +
      `<div class="pl-cap"><b></b><span></span></div>`;
    this.el = el;
    this.head = el.querySelector('.pl-head');
    this.track = el.querySelector('.pl-track');
    this.cap = el.querySelector('.pl-cap');
    this.canvas = el.querySelector('.pl-wave');

    if (waveform) {
      const ruler = el.querySelector('.pl-ruler');
      ruler.addEventListener('pointerdown', (e) => {
        const r = ruler.getBoundingClientRect();
        this.onSeek && this.onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
      });
    } else {
      this.buildRuler();
    }

    el.querySelector('.pl-toggle').addEventListener('click', () => {
      this.setPlaying(!this.playing);
      this.onToggle && this.onToggle(this.playing);
    });
    el.querySelectorAll('.pl-step').forEach((b) =>
      b.addEventListener('click', () => this.onSelect && this.onSelect(+b.dataset.i)));

    this.setActive(0);
    this.setProgress(0, 0);
  }

  buildRuler() {
    const frag = document.createDocumentFragment();
    // ruler minor ticks
    const N = 48;
    for (let k = 0; k <= N; k++) {
      const t = document.createElement('div');
      t.className = 'pl-tick' + (k % 6 === 0 ? ' maj' : '');
      t.style.left = `${(k / N) * 100}%`;
      frag.appendChild(t);
    }
    // per-stage colored segment + a boundary line at its start
    let cum = 0;
    this.steps.forEach((s, i) => {
      const w = ((s.dur || 1) / this.total) * 100;
      const seg = document.createElement('div');
      seg.className = 'pl-seg';
      seg.dataset.i = i;
      seg.style.left = `${cum}%`;
      seg.style.width = `${w}%`;
      seg.style.setProperty('--c', s.color);
      seg.addEventListener('click', () => this.onSelect && this.onSelect(i));
      frag.appendChild(seg);
      const bound = document.createElement('div');
      bound.className = 'pl-bound';
      bound.style.left = `${cum}%`;
      bound.style.setProperty('--c', s.color);
      frag.appendChild(bound);
      cum += w;
    });
    this.track.appendChild(frag);
  }

  cumStart(i) {
    let c = 0;
    for (let k = 0; k < i; k++) c += this.steps[k].dur || 1;
    return c / this.total;
  }

  setActive(i) {
    this.active = i;
    this.el.querySelectorAll('.pl-step').forEach((b, k) => b.classList.toggle('on', k === i));
    this.el.querySelectorAll('.pl-seg').forEach((b, k) => b.classList.toggle('on', k === i));
    const s = this.steps[i];
    if (s) {
      this.cap.querySelector('b').textContent = s.label;
      this.cap.querySelector('span').textContent = s.sub || '';
      this.cap.style.setProperty('--c', s.color);
    }
  }

  // playhead across the whole ruler: step i + fraction within it (0..1)
  setProgress(i, stepFrac) {
    const f = this.cumStart(i) + ((this.steps[i].dur || 1) / this.total) * Math.max(0, Math.min(1, stepFrac));
    this.head.style.left = `${f * 100}%`;
  }

  setPlaying(on) {
    this.playing = on;
    this.el.querySelector('.pl-toggle').textContent = on ? '❚❚' : '▶';
  }

  // ---- waveform-scrubber mode ----
  setTrack(peaks, color) {
    this._peaks = peaks; this._waveColor = color || '#cdd8e4';
    this.drawWave();
  }
  setHead(frac) { this.head.style.left = `${Math.max(0, Math.min(1, frac)) * 100}%`; }

  drawWave() {
    const c = this.canvas, peaks = this._peaks;
    if (!c || !peaks) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.clientWidth || c.parentElement.clientWidth || 600, h = c.clientHeight || 28;
    c.width = w * dpr; c.height = h * dpr;
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const n = peaks.length, bw = w / n, mid = h / 2;
    g.fillStyle = this._waveColor;
    for (let i = 0; i < n; i++) {
      const ph = Math.max(1, peaks[i] * (h - 2));
      g.globalAlpha = 0.35 + peaks[i] * 0.55;
      g.fillRect(i * bw, mid - ph / 2, Math.max(1, bw - 1), ph);
    }
    g.globalAlpha = 1;
  }

  mount(parent) { parent.appendChild(this.el); return this; }
}
