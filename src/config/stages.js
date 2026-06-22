// 0xGCG — Grow. Corrupt. Glitch.
// ------------------------------------------------------------------
// The 5-act dramaturgy. This data IS the storyboard: it drives the
// neuron-graph layout, the per-stage grade, the overlay content, the
// mood-board planes and references.
//
// The core cycle:  init -> [grow -> optimize] -> [overfit -> glitch] -> (loop)
// grow <> optimize and overfit <> glitch are pairs: growth and optimization
// are the same gesture getting better at itself; overfitting and glitch are
// the same collapse, the pattern reproducing through its own breakdown.
//
//   I.   Init     — the dark machine awaits input
//   II.  Grow     — the void becomes matter, then life
//   III. Optimize — growth's twin: life becomes efficient infrastructure
//   IV.  Overfit  — optimization past its substrate: overgrowth, replicators
//   V.   Glitch   — collapse, recognition, return to the seed
//
// phase:  INIT | GROW | OPTIMIZE | OVERFIT | GLITCH  (beat / color grade)
// pos:    node position in the neuron network (world units)
// layers/themes/refs/surfaces/sound/movement/reading — the descriptive blocks.
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

// the core operation, used across the surfaces / script
export const OPERATION = 'init();\ngrow(); optimize();\noverfit(); glitch();\ndimension++;\nreturn void;';

export const STAGES = [
  {
    id: 'init',
    index: 0,
    act: 'I',
    phase: 'INIT',
    title: 'INIT',
    subtitle: 'Idle State',
    color: '#5b7184',
    accent: '#0a1420',
    pos: [-34, -2, 6],
    body:
      'The universe is a dark machine waiting for input. init() runs; ' +
      'void main() idles. The rear wall dreams boot logs, the floor is a ' +
      'faint low-frequency field, and The Loop hangs as a black attractor ' +
      '— an absence with gravity. Dark matter thinks it is the beginning. ' +
      'Nothing has been fed yet.',
    layers: ['Void / dark-matter field', 'Sparse node graph', 'Boot logs (Meta)', 'Low-freq floor (Data)'],
    themes: ['Noise Fields', 'Vector Flow', 'Fractal Brownian Motion', 'Drone / Sub-bass'],
    time: '0:00–0:20',
    surfaces: {
      meta: 'slow boot logs — init… seed: void… awaiting signal',
      data: 'a faint low-frequency field; the river barely moves',
      loop: 'a black circular attractor — an absence with gravity, not yet a hole',
      patch: 'mostly inactive arches; faint residue, like empty memory slots',
    },
    sound: 'drone, low rumble, very sparse pulses',
    movement: 'almost still; large slow breathing',
    reading: 'something is about to be fed',
    refs: [
      { label: 'Ryoji Ikeda — data austerity', url: 'https://www.youtube.com/results?search_query=ryoji+ikeda+data+matrix' },
      { label: 'Ligeti — micropolyphonic clouds', url: 'https://www.youtube.com/results?search_query=ligeti+atmospheres' },
      { label: 'Rrose — Purge (sound behavior)', url: 'https://www.youtube.com/results?search_query=rrose+purge' },
    ],
    images: ['assets/init-1.jpg', 'assets/init-2.jpg', 'assets/init-3.jpg'],
    video: null,
  },
  {
    id: 'grow',
    index: 1,
    act: 'II',
    phase: 'GROW',
    title: 'GROW',
    subtitle: 'Morphogenesis',
    color: '#27e0a0',
    accent: '#0a3a6b',
    pos: [-14, 9, -20],
    body:
      'Data thickens into spectral bands and snaps the void into matter — ' +
      'particles, bonds, the first lattices. Then the signal becomes alive: ' +
      'membranes divide; roots, vines and mycelium spread the same graph at ' +
      'a biological tempo. A single rule, repeated, becomes structure, then ' +
      'life. Grow is the first half of one motion — the other half is optimize.',
    layers: ['Particles & bonds', 'Membranes & cell division', 'L-trees / vines / roots', 'Reaction–diffusion / Physarum'],
    themes: ['Particle Systems', 'L-Systems', 'Reaction–Diffusion / Turing', 'Cellular Automata'],
    time: '0:20–0:55',
    surfaces: {
      meta: 'parsing the spectrum; generating morphogenesis rules',
      data: 'bands split, then turn organic — root-like, circulatory',
      loop: 'the attractor pulses — void → particles → cells → roots',
      patch: 'first commits: field, particle bonds, unstable lattice, division',
    },
    sound: 'granular clicks, metallic chirps, then wet organic textures',
    movement: 'particles snap on the pulse; then slow expansion and branching',
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
    id: 'optimize',
    index: 2,
    act: 'III',
    phase: 'OPTIMIZE',
    title: 'OPTIMIZE',
    subtitle: 'Efficiency',
    color: '#8be84b',
    accent: '#e0b341',
    pos: [16, 1, -22],
    body:
      'Growth’s twin wakes: the system optimizes. Roots straighten into ' +
      'pipes and roads; cell membranes become city blocks; slime-mold paths ' +
      'become transport networks. Life becomes efficient infrastructure — a ' +
      'fossilized machine-organism waking up. Grow and optimize are the same ' +
      'gesture, getting better at itself.',
    layers: ['Roots → pipes / roads', 'Membranes → city blocks', 'WFC tiled growth', 'Transport networks'],
    themes: ['Wave Function Collapse', 'Procedural Infrastructure', 'Flow Fields', 'Optimization Loops'],
    time: '0:55–1:30',
    surfaces: {
      meta: 'objective: expand; infrastructure pass started',
      data: 'the river becomes rectilinear, pipe-like, directional',
      loop: 'the organism hardens — roots become roads, cells become blocks',
      patch: 'pipes, grids, machinery previews accrue toward the front',
    },
    sound: 'metallic resonance, factory pulse, valves, low industrial rhythm',
    movement: 'organic flow turns rectilinear, mechanical, efficient',
    reading: 'life has become infrastructure',
    refs: [
      { label: 'Wave Function Collapse (Gumin)', url: 'https://github.com/mxgmn/WaveFunctionCollapse' },
      { label: 'Horizon Zero Dawn — terraforming / GAIA', url: 'https://www.youtube.com/results?search_query=horizon+zero+dawn+gaia+terraforming' },
      { label: 'Physarum → transport networks', url: 'https://www.youtube.com/results?search_query=physarum+transport+network' },
    ],
    images: ['assets/optimize-1.jpg', 'assets/optimize-2.jpg', 'assets/optimize-3.jpg'],
    video: null,
  },
  {
    id: 'overfit',
    index: 3,
    act: 'IV',
    phase: 'OVERFIT',
    title: 'OVERFIT',
    subtitle: 'Over-optimization',
    color: '#e0742a',
    accent: '#b8c2cc',
    pos: [30, -7, 0],
    body:
      'Optimization continues past its substrate. The model overfits its ' +
      'world: pipes become circuits, cities become PCB boards, machines ' +
      'become replicators, replicators become data organisms. This is not ' +
      'sudden evil — it is growth beyond its means. growth_rate > ' +
      'substrate_capacity. Corruption is overgrowth. Overfit is the first ' +
      'half of the collapse — the other half is glitch.',
    layers: ['Pipes → circuits', 'Cities → PCB boards', 'Machines → replicators', 'CA overrun / data swarm'],
    themes: ['Self-Replication', 'Cellular Automata Overrun', 'Erosion', 'Recursive Tiling'],
    time: '1:30–2:15',
    surfaces: {
      meta: 'optimization loop unstable; growth_rate > substrate_capacity; corruption accepted',
      data: 'sharper, more digital, compressed',
      loop: 'circuits, replicators, machine swarms — over-efficient hunger',
      patch: 'dense corruptions — paperclip logic, swarm, broken city grid',
    },
    sound: 'mechanical throb, electrical buzz, irregular techno pressure',
    movement: 'fast internal mutation; still slow spatially — no strobing',
    reading: 'the same growth rule has become hunger',
    refs: [
      { label: 'Universal Paperclips (optimization as hunger)', url: 'https://www.decisionproblem.com/paperclips/' },
      { label: 'Stargate SG-1 — Replicators', url: 'https://www.youtube.com/results?search_query=stargate+sg1+replicators' },
      { label: 'Horizon Zero Dawn — Faro plague', url: 'https://www.youtube.com/results?search_query=horizon+zero+dawn+faro+plague' },
    ],
    images: ['assets/overfit-1.jpg', 'assets/overfit-2.jpg', 'assets/overfit-3.jpg'],
    video: null,
  },
  {
    id: 'glitch',
    index: 4,
    act: 'V',
    phase: 'GLITCH',
    title: 'GLITCH',
    subtitle: 'Dimension++',
    color: '#ff2bd6',
    accent: '#16f0ff',
    pos: [8, 5, 18],
    body:
      'The Loop is overfed and cannot digest the Data. Reality datamoshes; ' +
      'each pulse reveals a different skin inside the same shape — cosmic ' +
      'web, lattice, membrane, pipe, circuit, code graph. Everything aligns ' +
      '— one graph, many skins — then collapses to the black seed. ' +
      'dimension++; return void; The same story begins again. Overfit and ' +
      'glitch are one collapse: the glitch is how the pattern reproduces.',
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

// Optional 3D models (OBJ/FBX). Drop files in assets/ and list them here.
export const MODELS = [];
