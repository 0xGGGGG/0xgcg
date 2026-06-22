// ---------------------------------------------------------------------------
// The Core timeline transport: a big play/pause, the act chips, and a ruler
// that shows ALL stages side by side — each segment carries that stage's
// soundtrack waveform, with a colored boundary line per stage and a playhead.
// Clicking a chip or a segment navigates to that stage. Built to grow into a
// fuller timeline view.
// ---------------------------------------------------------------------------

export class Player {
  // steps: [{ key, label, sub, color, dur }]
  constructor({ steps, onSelect, onToggle, playing = true }) {
    this.steps = steps;
    this.onSelect = onSelect;
    this.onToggle = onToggle;
    this.playing = playing;
    this.active = 0;
    this.total = steps.reduce((s, x) => s + (x.dur || 1), 0);
    this.tracks = null; // per-step peaks (Float32Array[])

    const el = document.createElement('div');
    el.className = 'player';
    el.innerHTML =
      `<div class="pl-main">` +
        `<button class="pl-toggle" title="Play / pause (space)">${playing ? '❚❚' : '▶'}</button>` +
        `<div class="pl-steps">${steps.map((s, i) =>
          `<button class="pl-step" data-i="${i}" style="--c:${s.color}"><i></i><span>${s.label}</span></button>`)
          .join('<b class="pl-arrow">→</b>')}</div>` +
      `</div>` +
      `<div class="pl-ruler"><canvas class="pl-wave"></canvas><div class="pl-bounds"></div><div class="pl-head"></div></div>` +
      `<div class="pl-cap"><b></b><span></span></div>`;
    this.el = el;
    this.head = el.querySelector('.pl-head');
    this.canvas = el.querySelector('.pl-wave');
    this.ruler = el.querySelector('.pl-ruler');
    this.cap = el.querySelector('.pl-cap');

    // boundary lines per stage
    let cum = 0;
    const boundsWrap = el.querySelector('.pl-bounds');
    this.steps.forEach((s) => {
      const b = document.createElement('div');
      b.className = 'pl-bound';
      b.style.left = `${(cum / this.total) * 100}%`;
      b.style.setProperty('--c', s.color);
      boundsWrap.appendChild(b);
      cum += s.dur || 1;
    });

    // click a segment of the ruler -> select that stage
    this.ruler.addEventListener('pointerdown', (e) => {
      const r = this.ruler.getBoundingClientRect();
      const f = (e.clientX - r.left) / r.width;
      this.onSelect && this.onSelect(this.indexAt(f));
    });
    el.querySelectorAll('.pl-step').forEach((b) =>
      b.addEventListener('click', () => this.onSelect && this.onSelect(+b.dataset.i)));
    el.querySelector('.pl-toggle').addEventListener('click', () => {
      this.setPlaying(!this.playing);
      this.onToggle && this.onToggle(this.playing);
    });
    addEventListener('resize', () => this.drawWave());

    this.setActive(0);
    this.setProgress(0, 0);
  }

  indexAt(frac) {
    let cum = 0;
    for (let i = 0; i < this.steps.length; i++) {
      cum += (this.steps[i].dur || 1) / this.total;
      if (frac <= cum) return i;
    }
    return this.steps.length - 1;
  }
  cumStart(i) {
    let c = 0;
    for (let k = 0; k < i; k++) c += this.steps[k].dur || 1;
    return c / this.total;
  }

  setTracks(peaksList) { this.tracks = peaksList; this.drawWave(); }

  setActive(i) {
    this.active = i;
    this.el.querySelectorAll('.pl-step').forEach((b, k) => b.classList.toggle('on', k === i));
    const s = this.steps[i];
    if (s) {
      this.cap.querySelector('b').textContent = s.label;
      this.cap.querySelector('span').textContent = s.sub || '';
      this.cap.style.setProperty('--c', s.color);
    }
    this.drawWave();
  }

  // playhead across the whole timeline: step i + fraction within it
  setProgress(i, frac) {
    const f = this.cumStart(i) + ((this.steps[i].dur || 1) / this.total) * Math.max(0, Math.min(1, frac));
    this.head.style.left = `${f * 100}%`;
  }

  setPlaying(on) {
    this.playing = on;
    this.el.querySelector('.pl-toggle').textContent = on ? '❚❚' : '▶';
  }

  drawWave() {
    const c = this.canvas;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.clientWidth || c.parentElement.clientWidth || 600, h = c.clientHeight || 30;
    if (!w) return;
    c.width = w * dpr; c.height = h * dpr;
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const mid = h / 2;
    let cum = 0;
    this.steps.forEach((s, i) => {
      const x0 = (cum / this.total) * w;
      const segW = ((s.dur || 1) / this.total) * w;
      cum += s.dur || 1;
      // faint segment tint
      g.fillStyle = hexA(s.color, i === this.active ? 0.10 : 0.04);
      g.fillRect(x0, 0, segW, h);
      const peaks = this.tracks && this.tracks[i];
      if (!peaks) return;
      const n = peaks.length, bw = segW / n;
      const active = i === this.active;
      for (let k = 0; k < n; k++) {
        const ph = Math.max(1, peaks[k] * (h - 4));
        g.globalAlpha = active ? 0.45 + peaks[k] * 0.5 : 0.16 + peaks[k] * 0.22;
        g.fillStyle = s.color;
        g.fillRect(x0 + k * bw, mid - ph / 2, Math.max(0.7, bw - 0.5), ph);
      }
      g.globalAlpha = 1;
    });
  }

  mount(parent) { parent.appendChild(this.el); return this; }
}

function hexA(hex, a) {
  const m = hex.replace('#', '');
  const n = parseInt(m.length === 3 ? m.split('').map((x) => x + x).join('') : m, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
