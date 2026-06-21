import { STAGES, PROJECT } from '../config/stages.js';
import { buildSection } from './sectionView.js';

const MONO_UI = '#d6d6d6'; // neutral grey accent for the black & white theme

// DOM overlay that shows the active stage: act/phase, title, concept body,
// layers, themes, embedded reference video and external links. Driven by
// the camera rig (hide on depart, show on arrive).

export class Overlay {
  constructor(root, { onPrev, onNext, onToggleAuto, onJump }) {
    this.root = root;
    this.onJump = onJump;
    this.panel = root.querySelector('#panel');
    this.dotsWrap = root.querySelector('#dots');

    root.querySelector('#prev').addEventListener('click', onPrev);
    root.querySelector('#next').addEventListener('click', onNext);
    this.autoBtn = root.querySelector('#auto');
    this.autoBtn.addEventListener('click', onToggleAuto);

    // build progress dots
    STAGES.forEach((s, i) => {
      const d = document.createElement('button');
      d.className = 'dot';
      d.style.setProperty('--c', MONO_UI);
      d.title = `${s.act} · ${s.title}`;
      d.addEventListener('click', () => onJump(i));
      this.dotsWrap.appendChild(d);
    });
    this.dots = [...this.dotsWrap.children];

    root.querySelector('#proj-code').textContent = PROJECT.code;
    root.querySelector('#proj-title').textContent = PROJECT.title;
    root.querySelector('#proj-venue').textContent = PROJECT.venue;
  }

  setAuto(on) {
    this.autoBtn.classList.toggle('on', on);
    this.autoBtn.textContent = on ? '❚❚ auto' : '▶ auto';
  }

  hide() {
    this.panel.classList.remove('show');
  }

  show(i) {
    const s = STAGES[i];
    this.dots.forEach((d, k) => d.classList.toggle('active', k === i));

    const phaseClass = s.phase.toLowerCase();
    const video = s.video
      ? `<div class="video"><iframe src="https://www.youtube.com/embed/${s.video}" frameborder="0" allowfullscreen></iframe></div>`
      : '';

    this.panel.innerHTML = `
      <div class="meta">
        <span class="act">ACT ${s.act}</span>
        <span class="phase ${phaseClass}">${s.phase}</span>
        ${s.time ? `<span class="time">${s.time}</span>` : ''}
        <span class="counter">${i + 1} / ${STAGES.length}</span>
      </div>
      <h1 style="--c:${MONO_UI}">${s.title}</h1>
      <h2>${s.subtitle}</h2>
      <p class="body">${s.body}</p>
      ${video}
      <div class="cols">
        <div class="col">
          <h3>Layers</h3>
          <ul>${s.layers.map((l) => `<li>${l}</li>`).join('')}</ul>
        </div>
        <div class="col">
          <h3>Techniques</h3>
          <ul>${s.themes.map((t) => `<li>${t}</li>`).join('')}</ul>
        </div>
      </div>
      ${s.surfaces ? `
      <div class="surfaces">
        <h3>On the four surfaces</h3>
        <div class="sf-section-mount"></div>
        <ul>
          <li class="sf sf-meta"><b>Meta</b><span>${s.surfaces.meta}</span></li>
          <li class="sf sf-data"><b>Data</b><span>${s.surfaces.data}</span></li>
          <li class="sf sf-loop"><b>The Loop</b><span>${s.surfaces.loop}</span></li>
          <li class="sf sf-patch"><b>The Patch</b><span>${s.surfaces.patch}</span></li>
        </ul>
      </div>` : ''}
      ${s.sound || s.movement || s.reading ? `
      <div class="qualia">
        ${s.sound ? `<div><b>Sound</b> ${s.sound}</div>` : ''}
        ${s.movement ? `<div><b>Movement</b> ${s.movement}</div>` : ''}
        ${s.reading ? `<div><b>Reading</b> ${s.reading}</div>` : ''}
      </div>` : ''}
      <div class="refs">
        <h3>References</h3>
        ${s.refs.map((r) => `<a href="${r.url}" target="_blank" rel="noopener">↗ ${r.label}</a>`).join('')}
      </div>`;
    // interactive section drawing keyed to the surface rows
    const mount = this.panel.querySelector('.sf-section-mount');
    if (mount) {
      const rows = (surf) => this.panel.querySelectorAll(`.surfaces .sf-${surf}`);
      mount.appendChild(buildSection({
        interactive: true,
        onEnter: (surf) => rows(surf).forEach((el) => el.classList.add('hot')),
        onLeave: (surf) => rows(surf).forEach((el) => el.classList.remove('hot')),
      }));
    }

    this.panel.style.setProperty('--accent', MONO_UI);
    this.panel.classList.add('show');
  }
}
