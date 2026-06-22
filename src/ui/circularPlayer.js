// ---------------------------------------------------------------------------
// A circular transport for the Layout loop — the four phases (meta → data →
// loop → patch) sit around a ring in loop order, play/pause in the centre, a
// progress arc sweeps the ring. Mirrors the linear Player's API so roomView
// can drive it the same way (setActive / setProgress / setPlaying).
// ---------------------------------------------------------------------------

const PATH = 1000; // svg circle pathLength

export class CircularPlayer {
  constructor({ steps, onSelect, onToggle, playing = true }) {
    this.steps = steps;
    this.onSelect = onSelect;
    this.onToggle = onToggle;
    this.playing = playing;
    this.n = steps.length;
    this.active = 0;

    const el = document.createElement('div');
    el.className = 'cplayer';
    el.innerHTML =
      `<div class="cp-ring">` +
        `<svg viewBox="0 0 110 110">` +
          `<circle class="cp-bg" cx="55" cy="55" r="46"></circle>` +
          `<circle class="cp-prog" cx="55" cy="55" r="46" pathLength="${PATH}" transform="rotate(-90 55 55)"></circle>` +
        `</svg>` +
        `<button class="cp-toggle" title="Play / pause (space)">${playing ? '❚❚' : '▶'}</button>` +
        steps.map((s, i) =>
          `<button class="cp-step cp-pos-${i} c-${s.key}" data-i="${i}" style="--c:${s.color}" title="${s.label}">` +
          `<i></i><span>${s.short || s.label}</span></button>`).join('') +
      `</div>` +
      `<div class="cp-cap"><b></b><span></span></div>`;
    this.el = el;
    this.prog = el.querySelector('.cp-prog');
    this.cap = el.querySelector('.cp-cap');
    this.prog.style.strokeDasharray = PATH;

    this.stepEls = [...el.querySelectorAll('.cp-step')];
    this.stepEls.forEach((b, i) => {
      const ang = (-90 + i * (360 / this.n)) * Math.PI / 180; // top, clockwise
      b.style.left = `${50 + Math.cos(ang) * 50}%`;
      b.style.top = `${50 + Math.sin(ang) * 50}%`;
      b.addEventListener('click', () => this.onSelect && this.onSelect(i));
    });
    el.querySelector('.cp-toggle').addEventListener('click', () => {
      this.setPlaying(!this.playing);
      this.onToggle && this.onToggle(this.playing);
    });

    this.setActive(0);
    this.setProgress(0, 0);
  }

  setActive(i) {
    this.active = i;
    this.stepEls.forEach((b, k) => b.classList.toggle('on', k === i));
    const s = this.steps[i];
    if (s) {
      this.cap.querySelector('b').textContent = s.label;
      this.cap.querySelector('span').textContent = s.sub || '';
      this.cap.style.setProperty('--c', s.color);
      this.prog.style.stroke = s.color;
    }
  }

  setProgress(i, frac) {
    const overall = (i + Math.max(0, Math.min(1, frac))) / this.n;
    this.prog.style.strokeDashoffset = PATH * (1 - overall);
  }

  setPlaying(on) {
    this.playing = on;
    this.el.querySelector('.cp-toggle').textContent = on ? '❚❚' : '▶';
  }

  mount(parent) { parent.appendChild(this.el); return this; }
}
