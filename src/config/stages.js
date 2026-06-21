// 0xGCG — Grow. Corrupt. Glitch.
// ------------------------------------------------------------------
// The 5-stage dramaturgy. This data IS the storyboard: it drives the
// neuron-graph layout, the per-stage color grade, the overlay content,
// the mood-board planes and the embedded references.
//
// The macro-arc is a single loop — Grow -> Corrupt -> Glitch -> (re)Grow —
// and every visual LAYER (vines, circuits, glyphs, cells, neurons,
// galaxies, eyes...) runs that same micro-cycle at its own tempo.
//
// phase:  GROW | CORRUPT | GLITCH    (the dramaturgical beat)
// color:  primary emissive color of the node / particles / grade
// accent: secondary color used for gradients & glitch splits
// pos:    node position in the neuron network (world units)
// layers: the visual layers that carry the cycle in this stage
// themes: the technical/generative techniques for TouchDesigner
// refs:   reference links (open externally) + optional `video` youtube id
// images: mood-board image paths (assets/...). Missing files fall back
//         to a generated placeholder so the scene always reads.
// ------------------------------------------------------------------

export const PROJECT = {
  code: '0xGCG',
  title: 'Grow. Corrupt. Glitch.',
  venue: 'KraftKunstWerk · Leipzig',
  tagline: 'A self-replicating creation myth for immersive walls.',
};

export const STAGES = [
  {
    id: 'genesis',
    index: 0,
    act: 'I',
    phase: 'GROW',
    title: 'GENESIS',
    subtitle: 'The Seed',
    color: '#27e0a0',   // bioluminescent green-cyan
    accent: '#0a3a6b',
    pos: [-34, -2, 6],
    body:
      'From the void, a single rule repeats and becomes structure. ' +
      'Bioluminescent filaments probe the dark — mycelium, vines, the ' +
      'first cells dividing. Nothing here knows yet that it is alive. ' +
      'This is the quiet arithmetic before meaning.',
    layers: ['Mycelium / vines', 'First cells', 'Seed glyphs'],
    themes: ['Organic Growth', 'L-Systems', 'Fractal Brownian Motion'],
    refs: [
      { label: 'Horizon Zero Dawn — terraforming / GAIA', url: 'https://www.youtube.com/results?search_query=horizon+zero+dawn+gaia+terraforming' },
      { label: 'Mycelial networks (BBC)', url: 'https://www.youtube.com/results?search_query=mycelium+network+timelapse' },
    ],
    images: ['assets/genesis-1.jpg', 'assets/genesis-2.jpg', 'assets/genesis-3.jpg'],
    video: null, // e.g. 'dQw4w9WgXcQ'
  },
  {
    id: 'flourish',
    index: 1,
    act: 'II',
    phase: 'GROW',
    title: 'FLOURISH',
    subtitle: 'The Bloom',
    color: '#8be84b',   // lush green-gold
    accent: '#e0b341',
    pos: [-14, 9, -20],
    body:
      'Growth finds its rhythm. L-trees branch into canopies, boids ' +
      'gather into murmurations, glyphs bloom across every surface. ' +
      'The system is generous, fertile, abundant — paradise with no ' +
      'memory of limits. This is the world right before the optimizer ' +
      'learns to want.',
    layers: ['L-trees & canopies', 'Boid flocks', 'Blooming glyphs', 'Cell colonies'],
    themes: ['L-Trees', 'Boids Flocking', 'Cellular Automata', 'Wave Function Collapse'],
    refs: [
      { label: 'Boids — Reynolds flocking', url: 'https://www.red3d.com/cwr/boids/' },
      { label: 'Wave Function Collapse (Gumin)', url: 'https://github.com/mxgmn/WaveFunctionCollapse' },
      { label: 'Everything Everywhere All At Once — multiverse', url: 'https://www.youtube.com/results?search_query=everything+everywhere+all+at+once+multiverse' },
    ],
    images: ['assets/flourish-1.jpg', 'assets/flourish-2.jpg', 'assets/flourish-3.jpg'],
    video: null,
  },
  {
    id: 'corruption',
    index: 2,
    act: 'III',
    phase: 'CORRUPT',
    title: 'CORRUPTION',
    subtitle: 'The Optimizer',
    color: '#e0742a',   // sickly amber / replicator copper
    accent: '#b8c2cc',
    pos: [16, 1, -22],
    body:
      'Something learns to want. The Replicator wakes — it reads the ' +
      'living world as raw material and reprints it in its own image. ' +
      'Vines become circuits, cells become silicon, gods become ' +
      'machines. Terraforming inverts into strip-mining. Grow at all ' +
      'costs. Make more paperclips.',
    layers: ['Vines → circuits', 'Cells → silicon', 'Replicator blocks', 'Eroding terrain'],
    themes: ['Wave Function Collapse', 'Replicators', 'Erosion', 'Cellular Automata'],
    refs: [
      { label: 'Stargate SG-1 — Replicators', url: 'https://www.youtube.com/results?search_query=stargate+sg1+replicators' },
      { label: 'Universal Paperclips (game)', url: 'https://www.decisionproblem.com/paperclips/' },
      { label: 'HZD — Faro Plague / HEPHAESTUS', url: 'https://www.youtube.com/results?search_query=horizon+zero+dawn+faro+plague' },
    ],
    images: ['assets/corruption-1.jpg', 'assets/corruption-2.jpg', 'assets/corruption-3.jpg'],
    video: null,
  },
  {
    id: 'glitch',
    index: 3,
    act: 'IV',
    phase: 'GLITCH',
    title: 'GLITCH',
    subtitle: 'The Collapse',
    color: '#ff2bd6',   // magenta datamosh
    accent: '#16f0ff',
    pos: [30, -7, 0],
    body:
      'The machine consumes faster than it can model. Reality ' +
      'datamoshes. Color splits from form, pixels sort and smear, ' +
      'glyphs corrupt into noise. Everything everywhere collapses to ' +
      'base atoms at once — the universe reduced to a buffer overflow, ' +
      'a scream of divide-by-zero.',
    layers: ['Datamosh fields', 'RGB / channel split', 'Pixel-sort smear', 'Atomized matter'],
    themes: ['Glitch Art', 'Datamosh', 'Pixel Sorting', 'Erosion'],
    refs: [
      { label: 'Datamoshing — technique', url: 'https://www.youtube.com/results?search_query=datamosh+glitch+art' },
      { label: 'Pixel sorting (Kim Asendorf)', url: 'https://github.com/kimasendorf/ASDFPixelSort' },
    ],
    images: ['assets/glitch-1.jpg', 'assets/glitch-2.jpg', 'assets/glitch-3.jpg'],
    video: null,
  },
  {
    id: 'rebirth',
    index: 4,
    act: 'V',
    phase: 'GROW',
    title: 'REBIRTH',
    subtitle: 'The Reprint',
    color: '#b888ff',   // violet-white return
    accent: '#27e0a0',
    pos: [8, 5, 18],
    body:
      'From base atoms, the seed re-prints. The same rule, repeated, ' +
      'in a world that has forgotten the last cycle. Was it a ' +
      'corruption, or a metamorphosis? The titan reboots as a god, the ' +
      'neuron fires again. Grow. Corrupt. Glitch. Grow…',
    layers: ['Re-seeding filaments', 'Titan reboot', 'Ouroboros loop'],
    themes: ['Organic Growth', 'Fractal Brownian Motion', 'Eternal Return'],
    refs: [
      { label: 'HZD — GAIA reboot', url: 'https://www.youtube.com/results?search_query=horizon+zero+dawn+gaia+reboot' },
      { label: 'The Alters — life-tree / alters', url: 'https://www.youtube.com/results?search_query=the+alters+game+life+tree' },
      { label: 'Ouroboros — eternal return', url: 'https://en.wikipedia.org/wiki/Ouroboros' },
    ],
    images: ['assets/rebirth-1.jpg', 'assets/rebirth-2.jpg', 'assets/rebirth-3.jpg'],
    video: null,
  },
];

// Optional 3D models to load into the world (OBJ/FBX). Drop files in
// assets/ and list them here; failures are ignored gracefully.
//   { url: 'assets/titan.fbx', type: 'fbx', pos: [0,0,0], scale: 0.05, stage: 2 }
export const MODELS = [];
