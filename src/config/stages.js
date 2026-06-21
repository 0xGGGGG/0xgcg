// 0xGCG — Grow. Corrupt. Glitch.
// ------------------------------------------------------------------
// The 5-act dramaturgy, readapted to SCRIPT.md. This data IS the
// storyboard: it drives the neuron-graph layout, the per-stage color
// grade, the overlay content, the mood-board planes and references.
//
// SCRIPT.md §4 — the 5 acts are the ENERGETIC PROCESS, not a literal
// "Act 1 = dark matter" mapping. The natural layers (void, particles,
// cells, infrastructure, circuits, data, meta) are the material SKINS
// the process wears. The macro-arc is one loop — Grow → Corrupt →
// Glitch → return void → (re)Grow — and the side-wall Patch keeps the
// history while the rear-wall Meta documents the making.
//
//   I.   Boot   / Idle            — the dark machine awaits input
//   II.  Feed   / Collapse        — Data snaps the void into matter
//   III. Grow   / Morphogenesis   — the signal becomes alive
//   IV.  Corrupt/ Optimization    — growth past its substrate → machine
//   V.   Glitch / Dimension++     — recognition, collapse, return to seed
//
// phase:  GROW | CORRUPT | GLITCH    (the dramaturgical beat / color grade)
// color:  emissive tint (the world is graded monochrome; tint is a hint)
// accent: secondary color used for gradients & glitch splits
// pos:    node position in the neuron network (world units)
// layers: the material skins that carry the cycle in this act
// themes: the generative techniques for TouchDesigner (SCRIPT §9)
// refs:   reference links (open externally) — SCRIPT §13, how they relate
// images: mood-board image paths (assets/...). Missing files fall back
//         to a generated placeholder so the scene always reads.
// ------------------------------------------------------------------

export const PROJECT = {
  code: '0xGCG',
  title: 'Grow. Corrupt. Glitch.',
  venue: 'Kunstkraftwerk · Leipzig',
  tagline: 'Same story over and over again.',
  // Kunstkraftwerk Leipzig — Saalfelder Str. 8b, 04179 Leipzig, Germany
  lat: 51.3416,
  lon: 12.3361,
};

export const STAGES = [
  {
    id: 'boot',
    index: 0,
    act: 'I',
    phase: 'GROW',
    title: 'BOOT',
    subtitle: 'Idle State',
    color: '#5b7184',   // cold standby grey-blue
    accent: '#0a1420',
    pos: [-34, -2, 6],
    body:
      'The universe is a dark machine waiting for input. void main() ' +
      'idles. The rear wall dreams boot logs, the floor is a faint ' +
      'low-frequency field, and The Loop hangs as a black attractor — ' +
      'an absence with gravity. Dark matter thinks it is the beginning. ' +
      'Nothing has been fed yet.',
    layers: ['Void / dark-matter field', 'Sparse node graph', 'Boot logs (Meta)', 'Low-freq floor (Data)'],
    themes: ['Noise Fields', 'Vector Flow', 'Fractal Brownian Motion', 'Drone / Sub-bass'],
    time: '0:20–0:35',
    surfaces: {
      meta: 'slow boot logs — booting substrate… void main() … awaiting signal',
      data: 'a faint low-frequency field; the river barely moves',
      loop: 'a black circular attractor — an absence with gravity, not yet a hole',
      patch: 'mostly inactive arches; faint residue, like empty memory slots',
    },
    sound: 'drone, low rumble, very sparse pulses',
    movement: 'almost still; large slow breathing',
    reading: 'something is being fed',
    refs: [
      { label: 'Ryoji Ikeda — data austerity', url: 'https://www.youtube.com/results?search_query=ryoji+ikeda+data+matrix' },
      { label: 'Ligeti — micropolyphonic clouds', url: 'https://www.youtube.com/results?search_query=ligeti+atmospheres' },
      { label: 'Rrose — Purge (sound behavior)', url: 'https://www.youtube.com/results?search_query=rrose+purge' },
    ],
    images: ['assets/boot-1.jpg', 'assets/boot-2.jpg', 'assets/boot-3.jpg'],
    video: null, // e.g. 'dQw4w9WgXcQ'
  },
  {
    id: 'feed',
    index: 1,
    act: 'II',
    phase: 'GROW',
    title: 'FEED',
    subtitle: 'Collapse into Form',
    color: '#27e0a0',   // first matter — bioluminescent green-cyan
    accent: '#0a3a6b',
    pos: [-14, 9, -20],
    body:
      'Data thickens into spectral bands and flows rear → front across ' +
      'the floor. Every pulse that reaches The Loop snaps the void into ' +
      'matter: particles, bonds, the first unstable lattices. Atoms ' +
      'think they are structure. The Patch writes its first commits ' +
      'on the side walls.',
    layers: ['Particles & force fields', 'Molecular bonds / orbitals', 'Wave-function collapse', 'Cymatic floor (Data)'],
    themes: ['Particle Systems', 'Cymatics / Chladni', 'Attractor Fields', 'Stochastic Density'],
    time: '0:35–0:55',
    surfaces: {
      meta: 'parsing audio spectrum; first generation logs',
      data: 'the spectrum splits into bands, flowing hard toward the front',
      loop: 'the black attractor pulses — void → particles → bonds → molecules',
      patch: 'first commits on the front arches — Patch 0.1 field, 0.2 bonds',
    },
    sound: 'granular clicks, metallic chirps, microtonal shimmer, low pulse',
    movement: 'data flows continuously; particles snap into clusters on each pulse',
    reading: 'the signal is condensing into matter',
    refs: [
      { label: 'Cymatics / Chladni / Faraday waves', url: 'https://www.youtube.com/results?search_query=chladni+cymatics+faraday+waves' },
      { label: 'Stockhausen — Kontakte (pulse↔tone)', url: 'https://www.youtube.com/results?search_query=stockhausen+kontakte' },
      { label: 'Xenakis — stochastic architecture', url: 'https://www.youtube.com/results?search_query=iannis+xenakis+metastaseis' },
    ],
    images: ['assets/feed-1.jpg', 'assets/feed-2.jpg', 'assets/feed-3.jpg'],
    video: null,
  },
  {
    id: 'grow',
    index: 2,
    act: 'III',
    phase: 'GROW',
    title: 'GROW',
    subtitle: 'Morphogenesis',
    color: '#8be84b',   // lush green-gold
    accent: '#e0b341',
    pos: [16, 1, -22],
    body:
      'The signal becomes alive. Membranes divide; roots, vines, ' +
      'mycelium and slime-mold networks spread the same graph at a ' +
      'biological tempo. Cells think they are life. The side-wall Patch ' +
      'fills with parallel growth experiments — reaction-diffusion, ' +
      'L-systems, Physarum trails.',
    layers: ['Membranes & cell division', 'L-trees / vines / roots', 'Reaction–diffusion skins', 'Physarum networks'],
    themes: ['L-Systems', 'Reaction–Diffusion / Turing', 'Cellular Automata', 'Physarum / Slime Mold'],
    time: '0:55–1:20',
    surfaces: {
      meta: 'generating morphogenesis rules',
      data: 'the bands turn organic — root-like, circulatory',
      loop: 'one large, slow growth event: cells, membranes, roots',
      patch: 'each arch a different experiment — division, reaction-diffusion, L-system, Physarum',
    },
    sound: 'wet granularity, breath-like modulation, insect clicks',
    movement: 'slow expansion, splitting, crawling, branching',
    reading: 'the signal has become alive',
    refs: [
      { label: 'L-systems — Algorithmic Beauty of Plants', url: 'http://algorithmicbotany.org/papers/#abop' },
      { label: 'Turing patterns / reaction–diffusion', url: 'https://www.youtube.com/results?search_query=reaction+diffusion+turing+pattern' },
      { label: 'Physarum / slime-mold networks', url: 'https://www.youtube.com/results?search_query=physarum+slime+mold+network' },
    ],
    images: ['assets/grow-1.jpg', 'assets/grow-2.jpg', 'assets/grow-3.jpg'],
    video: null,
  },
  {
    id: 'corrupt',
    index: 3,
    act: 'IV',
    phase: 'CORRUPT',
    title: 'CORRUPT',
    subtitle: 'Optimization',
    color: '#e0742a',   // sickly amber / replicator copper
    accent: '#b8c2cc',
    pos: [30, -7, 0],
    body:
      'Growth continues past its substrate and becomes optimization. ' +
      'Roots straighten into pipes and roads; cells flatten into PCB ' +
      'traces; the Replicator reads the living world as raw material and ' +
      'reprints it as machine. This is not evil — it is over-efficient ' +
      'growth. growth_rate > substrate_capacity. Corruption accepted.',
    layers: ['Roots → pipes / roads', 'Cells → circuits', 'Replicator swarms', 'WFC city / PCB tiling'],
    themes: ['Wave Function Collapse', 'Self-Replication', 'Erosion', 'Cellular Automata Overrun'],
    time: '1:20–2:15',
    surfaces: {
      meta: 'optimization loop unstable; growth_rate > substrate_capacity; corruption accepted',
      data: 'sharper, more digital, compressed',
      loop: 'roots → pipes → circuits → replicators; over-efficient overgrowth',
      patch: 'dense corruptions — paperclip logic, machine swarm, broken city grid',
    },
    sound: 'factory resonance, pipe pressure, mechanical throb, electrical buzz',
    movement: 'the organic flow turns rectilinear, mechanical; fast internal mutation',
    reading: 'the same growth rule has become hunger',
    refs: [
      { label: 'Universal Paperclips (optimization as hunger)', url: 'https://www.decisionproblem.com/paperclips/' },
      { label: 'Stargate SG-1 — Replicators', url: 'https://www.youtube.com/results?search_query=stargate+sg1+replicators' },
      { label: 'Horizon Zero Dawn — Faro plague', url: 'https://www.youtube.com/results?search_query=horizon+zero+dawn+faro+plague' },
      { label: 'Wave Function Collapse (Gumin)', url: 'https://github.com/mxgmn/WaveFunctionCollapse' },
    ],
    images: ['assets/corrupt-1.jpg', 'assets/corrupt-2.jpg', 'assets/corrupt-3.jpg'],
    video: null,
  },
  {
    id: 'glitch',
    index: 4,
    act: 'V',
    phase: 'GLITCH',
    title: 'GLITCH',
    subtitle: 'Dimension++',
    color: '#ff2bd6',   // magenta datamosh
    accent: '#16f0ff',
    pos: [8, 5, 18],
    body:
      'The Loop is overfed and cannot digest the Data. Reality ' +
      'datamoshes; each pulse reveals a different skin inside the same ' +
      'shape — cosmic web, lattice, membrane, pipe, circuit, code graph. ' +
      'The fourth wall breaks and Meta exposes its source. Everything ' +
      'aligns — one graph, many skins — then collapses to the black ' +
      'seed. dimension++; return void; The same story begins again.',
    layers: ['Datamosh / channel split', 'Pixel-sort smear', 'Graph alignment (recognition)', 'Black-seed collapse (return)'],
    themes: ['Glitch / Datamosh', 'Pixel Sorting', 'Feedback / Compression', 'Eternal Return'],
    time: '2:15–3:00',
    surfaces: {
      meta: 'exposing source — screenshots, logs, shaders; then dimension++ / return void',
      data: 'compresses into the singularity; folds inward, briefly reverses',
      loop: 'each pulse reveals a different skin inside one shape; collapses to black seed',
      patch: 'desyncs — all phases at once: past, future, failed, alternate',
    },
    sound: 'dense glitch, broken clocks, error tones, low breathing → pressure collapse',
    movement: 'staggered wave front → sides; alignment; inward pull',
    reading: 'the glitch is how the pattern reproduces',
    refs: [
      { label: 'Datamoshing — technique', url: 'https://www.youtube.com/results?search_query=datamosh+glitch+art' },
      { label: 'Pixel sorting (Kim Asendorf)', url: 'https://github.com/kimasendorf/ASDFPixelSort' },
      { label: 'Ouroboros — cyclic return', url: 'https://en.wikipedia.org/wiki/Ouroboros' },
      { label: "Indra's net — each node holds the whole", url: 'https://en.wikipedia.org/wiki/Indra%27s_net' },
    ],
    images: ['assets/glitch-1.jpg', 'assets/glitch-2.jpg', 'assets/glitch-3.jpg'],
    video: null,
  },
];

// Optional 3D models to load into the world (OBJ/FBX). Drop files in
// assets/ and list them here; failures are ignored gracefully.
//   { url: 'assets/titan.fbx', type: 'fbx', pos: [0,0,0], scale: 0.05, stage: 2 }
export const MODELS = [];
