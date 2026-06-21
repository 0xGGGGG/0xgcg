import { PROJECT } from '../config/stages.js';

// ---------------------------------------------------------------------------
// The cosmic address — a fully zoomable "you are here", from the front wall of
// the Maschinenhalle out to the observable universe and back to the void.
// It is the SCRIPT's "one graph / many skins" idea made literal: the same
// pointer, rendered at every scale. Opened from the header (or the `A` key);
// scroll / arrows / +- to zoom between tiers.
// ---------------------------------------------------------------------------

const lat = PROJECT.lat.toFixed(4);
const lon = PROJECT.lon.toFixed(4);

// tiers, most-local (0) -> most-cosmic. `scale` is a readable size of the tier.
const TIERS = [
  { glyph: '§', name: 'THE LOOP', detail: 'front wall · void engine · 0xGCG', scale: '~10 m' },
  { glyph: '⌖', name: 'MASCHINENHALLE', detail: 'the immersive hall · 4 surfaces', scale: '~40 m' },
  { glyph: '⌂', name: 'KUNSTKRAFTWERK', detail: 'Saalfelder Str. 8b · 04179', scale: '~120 m' },
  { glyph: '◎', name: 'LEIPZIG', detail: `Saxony · Germany · ${lat}°N ${lon}°E`, scale: '~20 km' },
  { glyph: '⊕', name: 'EARTH', detail: '3rd planet · 1 AU from Sol', scale: '12,742 km' },
  { glyph: '☉', name: 'SOLAR SYSTEM', detail: 'Sol · 8 planets · Oort cloud', scale: '~0.0003 ly' },
  { glyph: '✦', name: 'ORION ARM', detail: '~26,000 ly from Galactic Center', scale: '26 kly' },
  { glyph: '✺', name: 'MILKY WAY', detail: 'barred spiral · ~400 billion stars', scale: '~105,000 ly' },
  { glyph: '◍', name: 'LOCAL GROUP', detail: 'Milky Way · Andromeda · ~80 galaxies', scale: '~10 Mly' },
  { glyph: '❋', name: 'VIRGO SUPERCLUSTER', detail: '~100 galaxy groups', scale: '~110 Mly' },
  { glyph: '✸', name: 'LANIAKEA', detail: 'our supercluster · ~100,000 galaxies', scale: '~520 Mly' },
  { glyph: '∞', name: 'OBSERVABLE UNIVERSE', detail: '~2 trillion galaxies · 13.8 Gyr', scale: '~93 Gly' },
  { glyph: '⟲', name: 'VOID', detail: 'seed · return · grow(); corrupt(); glitch();', scale: '10⁰ → ∞ → 10⁰' },
];

export class CosmicAddress {
  constructor() {
    this.focus = 2; // open centered on KUNSTKRAFTWERK
    this.visible = false;

    const el = document.createElement('div');
    el.id = 'cosmos';
    el.innerHTML = `
      <div class="cz-scrim"></div>
      <div class="cz-frame">
        <div class="cz-head">
          <span class="cz-kicker">you are here</span>
          <span class="cz-loc">${PROJECT.code} · cosmic address</span>
          <button class="cz-close" title="Close (Esc)">✕</button>
        </div>
        <div class="cz-stage">
          <div class="cz-reticle"></div>
          <div class="cz-track"></div>
          <div class="cz-zoom">
            <button class="cz-out" title="Zoom out (↑)">⊖</button>
            <div class="cz-rail"><div class="cz-railfill"></div></div>
            <button class="cz-in" title="Zoom in (↓)">⊕</button>
          </div>
        </div>
        <div class="cz-foot">
          <span class="cz-date" id="cz-date">—</span>
          <span class="cz-tag">one graph · many skins</span>
        </div>
      </div>`;
    document.body.appendChild(el);
    this.el = el;
    this.track = el.querySelector('.cz-track');
    this.railfill = el.querySelector('.cz-railfill');

    // build tier rows
    this.rows = TIERS.map((t, i) => {
      const r = document.createElement('button');
      r.className = 'cz-tier';
      r.innerHTML = `
        <span class="czt-glyph">${t.glyph}</span>
        <span class="czt-text">
          <span class="czt-name">${t.name}</span>
          <span class="czt-detail">${t.detail}</span>
        </span>
        <span class="czt-scale">${t.scale}</span>`;
      r.addEventListener('click', () => this.goto(i));
      this.track.appendChild(r);
      return r;
    });

    // interactions
    el.querySelector('.cz-scrim').addEventListener('click', () => this.hide());
    el.querySelector('.cz-close').addEventListener('click', () => this.hide());
    el.querySelector('.cz-out').addEventListener('click', () => this.goto(this.focus + 1));
    el.querySelector('.cz-in').addEventListener('click', () => this.goto(this.focus - 1));
    el.querySelector('.cz-stage').addEventListener('wheel', (e) => {
      e.preventDefault();
      this.goto(this.focus + (e.deltaY < 0 ? 1 : -1)); // scroll up = zoom out
    }, { passive: false });

    // live date/time
    this.dateEl = el.querySelector('#cz-date');
    this.tickHandle = setInterval(() => this.tick(), 1000);
    this.tick();

    this.layout();
  }

  tick() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp =
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const tz = -d.getTimezoneOffset() / 60;
    const tzs = `UTC${tz >= 0 ? '+' : ''}${tz}`;
    if (this.dateEl) this.dateEl.textContent = `${stamp} ${tzs}`;
    const hdr = document.getElementById('av-date');
    if (hdr) hdr.textContent = stamp;
  }

  goto(i) {
    this.focus = Math.max(0, Math.min(TIERS.length - 1, i));
    this.layout();
  }

  layout() {
    const f = this.focus;
    this.rows.forEach((r, i) => {
      const d = i - f;                          // signed distance from focus
      const ad = Math.abs(d);
      const y = d * 78;                          // vertical spacing
      const scale = Math.max(0.5, 1 - ad * 0.13);
      const op = Math.max(0.1, 1 - ad * 0.26);
      r.style.transform = `translate(-50%, calc(-50% + ${y}px)) scale(${scale})`;
      r.style.opacity = String(op);
      r.style.zIndex = String(100 - ad);
      r.classList.toggle('active', i === f);
    });
    // rail fill: bottom = local, top = cosmic
    this.railfill.style.height = `${(f / (TIERS.length - 1)) * 100}%`;
  }

  toggle() { this.visible ? this.hide() : this.show(); }

  show() {
    this.visible = true;
    this.el.classList.add('show');
  }
  hide() {
    this.visible = false;
    this.el.classList.remove('show');
  }
}

// set the static header coordinate readout once
export function initHeaderAddress() {
  const c = document.getElementById('av-coords');
  if (c) c.textContent = `${lat}°N ${lon}°E`;
}
