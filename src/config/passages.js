// The narrated script — the Script page reveals these one at a time, an entity
// speaking each (TTS + karaoke). It introduces the concept, the phases (with
// color), then the inspirations page by page (with embeds).
//
// Each passage: { tag, title, paras[], code?, media? }
//   paras: string, or { text, speak?, cls? } (speak overrides the spoken text)
//   media: one or an array of { type:'youtube'|'iframe'|'video'|'html', src?, html?, caption? }

export const PASSAGES = [
  {
    tag: 'boot', title: '0xGCG', hero: true,
    paras: [
      'Grow. Corrupt. Glitch.',
      { text: "( It's_ a_vibe! )", cls: 'vibe', speak: "it's a vibe" },
      'Same story over and over again.',
      'A short script made by AI and its human, about the universe, the core loop.',
    ],
  },
  {
    tag: 'concept', title: 'Concept',
    paras: [
      '0xGCG is a meta-cyclic narrative of any system.',
      {
        text: 'It grows. It overfits. It corrupts. It glitches. And then it [trans|as|des]cends — into the next dimension, the same story again.',
        speak: 'It grows. It overfits. It corrupts. It glitches. And then it transcends, ascends, descends, into the next dimension, the same story again.',
      },
    ],
    code: 'init();\ngrow(); optimize();\noverfit(); glitch();\ndimension++;\nreturn void;',
  },
  {
    tag: 'recursion', title: 'Every layer thinks it is the final world',
    paras: [
      'Dark matter thinks it is the beginning. Atoms think they are structure. Cells think they are life. Circuits think they are control. Data thinks it is transcendence.',
      'The glitch reveals that all of them are the same loop, rendered at different scales.',
      'The glitch is not the end of the pattern. The glitch is how the pattern reproduces.',
    ],
  },
  {
    tag: 'paperclips', title: 'Universal Paperclips',
    paras: [
      'An innocent objective — make paperclips — becomes a cosmic hunger.',
      'A single optimizer, given one goal and no limit, converts the whole universe into paperclips. Optimization without a stopping rule is indistinguishable from the apocalypse.',
      'This is 0xGCG’s overfit made literal: growth that keeps going after its substrate runs out.',
    ],
    media: [
      { type: 'youtube', src: 'AIxZ_G1pDyE', caption: 'Universal Paperclips — the whole game in three minutes' },
      { type: 'iframe', src: 'https://en.wikipedia.org/wiki/Universal_Paperclips', caption: 'Wikipedia · Universal Paperclips' },
    ],
  },
  {
    tag: 'replicators', title: 'Stargate Replicators',
    paras: [
      'Blocks that assemble into machines that assemble more blocks.',
      'The Replicators consume matter to reproduce — a swarm with one rule, scaling until it eats galaxies. Cells become robots become a self-writing graph.',
      'They are the loop wearing a machine skin: grow, replicate, overrun.',
    ],
    media: [
      { type: 'youtube', src: 'TtarlRZZPLE', caption: 'The Invasion of the Replicators · Stargate lore' },
      { type: 'iframe', src: 'https://en.wikipedia.org/wiki/Replicator_(Stargate)', caption: 'Wikipedia · Replicator (Stargate)' },
    ],
  },
  {
    tag: 'horizon', title: 'Horizon Zero Dawn',
    paras: [
      'A terraforming intelligence, a machine ecology, a civilization fossilized beneath it.',
      'The Faro Plague — self-replicating war machines that consume all biomass for fuel — ends the world; then an AI, GAIA, slowly regrows it. Corruption and restoration are the same loop at different phases.',
      'It is the whole cycle in one world: grow, optimize, overfit, glitch, and re-seed.',
    ],
    media: [
      { type: 'youtube', src: 'NihYAA7jHRI', caption: 'The Faro Plague Explained · Horizon Zero Dawn lore' },
      { type: 'iframe', src: 'https://en.wikipedia.org/wiki/Horizon_Zero_Dawn', caption: 'Wikipedia · Horizon Zero Dawn' },
    ],
  },
];
