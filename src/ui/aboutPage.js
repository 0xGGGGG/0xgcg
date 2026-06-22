import { PROJECT, STAGES } from '../config/stages.js';

// ---------------------------------------------------------------------------
// The "Core" page — the manifesto/about view: what, why, the spatial core
// elements, the one-graph-many-skins stage modes, and the reference grid.
// (The neuron storyboard that used to be "Core" is now "Timeline".)
// ---------------------------------------------------------------------------

const MODES = [
  { glyph: '·',  name: 'Void / Dark matter', text: 'gravitational filaments, sparse nodes — the quiet arithmetic before meaning' },
  { glyph: '∴',  name: 'Atoms',              text: 'particles and bonds snapping into the first structure' },
  { glyph: '⬡',  name: 'Molecules',          text: 'lattices, orbitals, unstable clusters' },
  { glyph: '◍',  name: 'Cells',              text: 'membranes, nuclei, division — the signal becomes alive' },
  { glyph: '❦',  name: 'Beings',             text: 'roots, vines, snakes, mycelium — organic networks' },
  { glyph: '⌗',  name: 'Industry',           text: 'roads, pipes, rails, machinery — life becomes infrastructure' },
  { glyph: '⊞',  name: 'Circuits',           text: 'PCB traces, solder nodes, machine logic' },
  { glyph: '⌁',  name: 'Data',               text: 'neural graph, packets, terminal logs' },
  { glyph: '§',  name: 'Code / Meta',        text: 'the AI/creator knowledge graph — the process that made it' },
  { glyph: '⟲',  name: 'Void (return)',      text: 'the black seed / 0xGCG — the same story begins again' },
];

const SURFACES = [
  { c: '#8be8a0', name: 'Meta · rear wall',   text: 'process / creator / debug layer — the backdoor terminal of creation' },
  { c: '#bfd0ff', name: 'Data · floor',       text: 'the soundtrack made visible, flowing rear → front' },
  { c: '#ff7ad9', name: 'The Loop · front',   text: 'the void engine — receives Data, renders worlds, pulses like a law' },
  { c: '#e8d48b', name: 'The Patch · sides',  text: 'the memory of the loop — history through the 7 arches' },
];

const domainOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

export class AboutPage {
  constructor({ onEnter }) {
    this.onEnter = onEnter;
    const refs = STAGES.flatMap((s) => (s.refs || []).map((r) => ({ ...r, color: s.color, stage: s.title })));
    const el = document.createElement('div');
    el.id = 'about';
    el.innerHTML = `
      <div class="ab-wrap">
        <header class="ab-head">
          <div><span class="ab-code">${PROJECT.code}</span> <span class="ab-title">${PROJECT.title}</span></div>
          <p class="ab-tag">${PROJECT.tagline}</p>
        </header>

        <section class="ab-sec">
          <h2>What</h2>
          <p>A spatial loop where <b>sound becomes data</b>, data feeds a <b>void</b>, the void
          generates worlds, and each world survives as a <b>patch</b> in the room's memory — a
          short immersive film about the recursive pattern behind matter, life, civilization,
          machines and data, made by AI and its human.</p>
          <pre class="ab-code-block">grow();
corrupt();
glitch();
dimension++;
return void;</pre>
        </section>

        <section class="ab-sec">
          <h2>Why</h2>
          <p>Every layer thinks it is the final world. Dark matter thinks it is the beginning;
          atoms think they are structure; cells think they are life; civilization thinks it is
          intelligence; circuits think they are control; data thinks it is transcendence. The
          glitch reveals they are the same loop at different scales — <b>the glitch is not the end
          of the pattern, it is how the pattern reproduces.</b></p>
        </section>

        <section class="ab-sec">
          <h2>Core elements — the four surfaces</h2>
          <div class="ab-grid">
            ${SURFACES.map((s) => `<div class="ab-card" style="--c:${s.c}"><b>${s.name}</b><span>${s.text}</span></div>`).join('')}
          </div>
        </section>

        <section class="ab-sec">
          <h2>One graph · many skins — stage modes</h2>
          <p class="ab-note">The same topology, rendered in different materials at every scale.</p>
          <div class="ab-modes">
            ${MODES.map((m) => `<div class="ab-mode"><i>${m.glyph}</i><b>${m.name}</b><span>${m.text}</span></div>`).join('')}
          </div>
        </section>

        <section class="ab-sec">
          <h2>Inspirations &amp; references</h2>
          <div class="ab-refs">
            ${refs.map((r) => `<a class="ab-ref" style="--c:${r.color}" href="${r.url}" target="_blank" rel="noopener">
              <span class="ab-ref-dom">${domainOf(r.url)}</span>
              <span class="ab-ref-lbl">${r.label}</span>
              <span class="ab-ref-stage">${r.stage}</span></a>`).join('')}
          </div>
        </section>

        <footer class="ab-foot">
          <button class="ab-enter" data-go="core">enter the Timeline ▸</button>
          <button class="ab-enter ghost" data-go="layout">open the Layout ▸</button>
        </footer>
      </div>`;
    document.body.appendChild(el);
    this.el = el;
    el.querySelectorAll('.ab-enter').forEach((b) =>
      b.addEventListener('click', () => this.onEnter && this.onEnter(b.dataset.go)));
  }

  show() { this.el.classList.add('show'); this.el.scrollTop = 0; }
  hide() { this.el.classList.remove('show'); }
}
