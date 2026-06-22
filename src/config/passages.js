// The narrated script — SCRIPT.md distilled into ordered passages. The Script
// page reveals these one at a time, an entity speaking each (TTS + karaoke).
// Each passage: { tag, title, paras[] (the spoken/karaoke units), code?, media? }
// media supports rich HTML: { type:'iframe'|'video'|'html', src?, html?, caption? }

export const PASSAGES = [
  {
    tag: 'boot', title: '0xGCG', hero: true,
    paras: [
      'Grow. Corrupt. Glitch.',
      'Same story over and over again.',
      'A short script made by AI and its human, about the universe, the core loop.',
    ],
  },
  {
    tag: 'concept', title: 'One-line concept',
    paras: [
      '0xGCG is a spatial loop where sound becomes data, data feeds a void, the void generates worlds, and each world survives as a patch in the room’s memory.',
      'The universe is not shown as a linear story. It is shown as a recurring operation.',
    ],
    code: 'grow();\ncorrupt();\nglitch();\ndimension++;\nreturn void;',
  },
  {
    tag: 'layers', title: 'Every layer thinks it is the final world',
    paras: [
      'Dark matter thinks it is the beginning.',
      'Atoms think they are structure.',
      'Cells think they are life.',
      'Civilization thinks it is intelligence.',
      'Circuits think they are control.',
      'Data thinks it is transcendence.',
      'The glitch reveals that all of them are the same loop, rendered at different scales.',
    ],
  },
  {
    tag: 'resolution', title: 'The resolution is recognition',
    paras: [
      'The resolution is not peace. The resolution is recognition.',
      'The glitch is not the end of the pattern. The glitch is how the pattern reproduces.',
    ],
  },
  {
    tag: 'architecture', title: 'Four named systems',
    paras: [
      'The room is a machine, a program, divided into four named systems.',
      'Meta documents. Data flows. The Loop transforms. The Patch remembers.',
      'Or, more poetically: Meta dreams. Data breathes. The Loop mutates. The Patch remembers.',
    ],
    code: 'Rear wall   -> Meta\nFloor       -> Data\nFront wall  -> The Loop\nSide walls  -> The Patch',
  },
  {
    tag: 'meta', title: 'Meta — the rear wall',
    paras: [
      'The process layer, the creator layer, the debug layer; the fourth-wall breach.',
      'Meta documents the making of the loop: logs, sessions, shader snippets, failed renders, TODOs.',
      'It is not only documentary. It is the hidden operating system behind the universe — the backdoor terminal of creation.',
    ],
    code: 'booting substrate...\nseed: void\ngrowth_rule: recursive_branching\ncorruption_threshold: 0.74\ndimension++  // return void',
  },
  {
    tag: 'data', title: 'Data — the floor',
    paras: [
      'The soundtrack made visible. The floor receives it as spectral bands, flowing rear to front, from Meta toward The Loop.',
      'The audience sits inside the signal. The audience is sitting on the soundtrack before it becomes image.',
      'The floor is not decorative. It is the causal fiction of the entire piece.',
    ],
  },
  {
    tag: 'loop', title: 'The Loop — the front wall',
    paras: [
      'The main altar. The void engine. Black hole, pulsar, event horizon, recursive compiler.',
      'It receives Data and transforms it into worlds — one recurring object across the whole film.',
      'It pulses with the soundtrack: not a drop, but a physical law.',
    ],
    code: 'void main() {\n  while (true) {\n    grow(); corrupt();\n    glitch(); dimension++;\n  }\n}',
  },
  {
    tag: 'patch', title: 'The Patch — the side walls',
    paras: [
      'The memory of the loop. The arches become portals, commits, phase buffers.',
      'Read front to back as history: newest near the front, fossilized states and source leakage toward the rear.',
      'A software patch, a synth patch, a cultivated land, a timeline — all at once.',
    ],
  },
  {
    tag: 'graph', title: 'One graph, many skins',
    paras: [
      'The whole piece is built from one hidden structure.',
      'The same topology appears at every scale — filaments, bonds, membranes, roots, pipes, circuits, a neural graph, an AI knowledge graph, and back to the black seed.',
      'The audience does not need to decode it. They should feel they are seeing the same story wearing different materials.',
    ],
  },
  {
    tag: 'acts', title: 'The five acts',
    paras: [
      'Boot and idle. Feed and collapse. Grow and morphogenesis. Corrupt and optimization. Glitch and dimension plus plus.',
      'The acts are the energetic process; the natural layers are the material skins.',
      'The ending does not solve the story. It reveals the rule.',
    ],
  },
  {
    tag: 'journey', title: 'The journey',
    paras: [
      'A void becomes particles. Particles become bonds. Bonds become membranes. Membranes become cells.',
      'Cells become roots. Roots become pipes. Pipes become circuits. Circuits become data.',
      'Data becomes code. Code becomes the creator. The creator becomes another layer of the loop.',
      'Growth becomes optimization. Optimization becomes corruption. Corruption becomes glitch. The glitch opens a new dimension.',
    ],
  },
  {
    tag: 'return', title: 'The same story begins again',
    paras: [
      'For one moment, everything aligns: cosmic web, molecule, cell, root, city, circuit, data, source code.',
      'One graph. Many skins.',
      'The room collapses back to the black seed. 0xGCG waits. The same story begins again.',
    ],
    code: 'grow();\ncorrupt();\nglitch();\ndimension++;\nreturn void;',
  },
];
