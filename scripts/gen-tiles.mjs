// ---------------------------------------------------------------------------
// gen-tiles — AI-generated, socket-pinned WFC tilesets.
//
// Each tile is a square with a 4-bit edge socket (N/E/S/W = connected?). An
// image model fills the *interior* (transistors, chips, cables, vessels…); we
// then HARD-STAMP a canonical socket cap at each connected edge's midpoint and
// ERASE a thin band at each unconnected edge. Because every cap is identical
// geometry+colour, any two neighbours that agree on a shared edge line up
// pixel-for-pixel — WFC assembly is seamless regardless of what the AI drew.
//
// Run:  node --env-file=.env scripts/gen-tiles.mjs <theme> [--provider openai|gemini] [--grid 8] [--only 0,3,15]
// Keys are read from process.env only (never printed).
// ---------------------------------------------------------------------------
import sharp from 'sharp';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const SIZE = 1024;                 // per-tile resolution (4×+ the old ~28px cells)
const OUT = '_dev-shots/tiles';

// ── socket geometry (fraction of tile) ─────────────────────────────────────
// v2: a thin insulated trace — dark sheath around a brighter core — reaching
// only a short stub inward, so joints read as continuous wiring not glowing beads.
const CAP_LEN = 0.055;             // core width along the edge
const SHEATH = 1.7;               // sheath width = core × this
const CAP_DEPTH = 0.06;            // short seam-insurance cap (AI grows the real trace in edit mode)
const ERASE = 0.02;               // erase band on unconnected edges
const TONE_TARGET = 60;            // target mean luminance (0-255) for even tiles

const bit = (t, e) => (t >> e) & 1;                       // e: 0=N 1=E 2=S 3=W
const EDGE_NAMES = ['top', 'right', 'bottom', 'left'];
const darken = (hex, f) => { const n = parseInt(hex.slice(1), 16); return `rgb(${Math.round(((n >> 16) & 255) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)})`; };

// ── themes ─────────────────────────────────────────────────────────────────
// cap = the single canonical socket colour (all connectors meet here). bg is
// the near-black the app renders on. `interior` describes the rich 4× content.
const THEMES = {
  circuits: {
    cap: '#22e0ff', bg: '#04060a',
    style: 'cyberpunk printed-circuit-board macro, neon traces glowing on matte black substrate, crisp vector-like detail, top-down orthographic',
    interior: 'dense PCB circuitry: triangular transistors, rectangular microchips with pin rows, round vias and solder pads, multi-coloured signal cables (cyan, lime, magenta, amber) routing between components',
  },
  pipes: {
    cap: '#ff3df0', bg: '#04060a',
    style: 'Berlin water-extraction steampunk pipework, glossy enamel tubes in violet/fuchsia/neon-magenta, brass flanges and valves, dramatic rim light on black',
    interior: 'thick industrial pipes with bolted flanges, pressure gauges, valve wheels and elbow joints, violet and fuchsia neon enamel, riveted metal',
  },
  vessels: {
    cap: '#ff4f6d', bg: '#080306',
    style: 'medical microscopy of blood vasculature, wet translucent tissue, deep crimson and coral, subsurface glow, dark field',
    interior: 'branching blood vessels and capillaries, pulsing arteries, red blood cells, glossy wet membranes, organic bifurcations',
  },
  neurons: {
    cap: '#7fd6ff', bg: '#03060a',
    style: 'fluorescent neuroscience imaging, slimy translucent dendrites glowing cyan on black, wet bioluminescence',
    interior: 'neuron soma with branching axons and dendrites, synaptic terminals, glowing myelin, gooey translucent nerve fibres',
  },
  dataflow: {
    cap: '#3affc0', bg: '#04060a',
    style: 'abstract data-flow visualization, glowing packet streams on grid substrate, clean HUD aesthetic, teal and white',
    interior: 'flowing data conduits carrying luminous packets, hexagonal routers, binary glyph clusters, directional arrow lanes, glowing junction nodes',
  },
  vines: {
    cap: '#8bff5a', bg: '#040803',
    style: 'bioluminescent botanical illustration, lush vines on dark forest floor, dewy leaves, soft glow',
    interior: 'twisting vines and tendrils, curling leaves, small buds and thorns, moss, organic growth spirals',
  },
  rails: {
    cap: '#cdd6df', bg: '#05060a',
    style: 'top-down model railway, steel rails and wooden ties on dark ballast, precise miniature detail',
    interior: 'railway tracks with steel rails, wooden sleepers, junction switches and turnouts, gravel ballast, signal boxes',
  },
  conveyor: {
    cap: '#ffd23a', bg: '#06050a',
    style: 'industrial factory automation, yellow-black hazard conveyor belts, top-down, greasy metal',
    interior: 'conveyor belt segments with tread lines, rollers and pulleys, hazard-striped guards, gears and motors, sorting junctions',
  },
  botnet: {
    cap: '#b06dff', bg: '#04040a',
    style: 'dark-web botnet topology, ominous violet nodes and links on black, glitchy cyber aesthetic',
    interior: 'compromised node servers, spreading infection links, packet swarms, skull/hazard glyph chips, pulsing command-and-control hubs',
  },
};

// ── image providers (return a PNG Buffer, SIZE×SIZE) ───────────────────────
async function genOpenAI(prompt) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY missing in .env');
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, size: `${SIZE}x${SIZE}`, quality: 'medium', background: 'transparent', output_format: 'png', n: 1 }),
  });
  if (!r.ok) throw new Error(`openai ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  return Buffer.from(j.data[0].b64_json, 'base64');
}

async function genGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY missing in .env');
  const model = 'gemini-2.5-flash-image-preview';
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!r.ok) throw new Error(`gemini ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) throw new Error('gemini returned no image');
  return Buffer.from(part.inlineData.data, 'base64');
}

// EDIT mode: hand the model a template with the socket stubs pre-drawn and ask
// it to grow circuitry OUT of those stubs, so the interior actually connects to
// the sockets (fixes the "floating cap" overlay look of pure generation).
const TPL_DEPTH = 0.24;            // how far template stubs reach inward

async function buildTemplate(t, theme) {
  const S = SIZE, stubW = CAP_LEN * SHEATH * S, dep = TPL_DEPTH * S, hub = S * 0.11, c = S / 2;
  const stubs = [];
  for (let e = 0; e < 4; e++) if (bit(t, e)) stubs.push(stub(e, stubW, dep, S));
  const hasHub = stubs.length ? `<circle cx="${c}" cy="${c}" r="${hub}"/>` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><rect width="${S}" height="${S}" fill="${theme.bg}"/><g fill="${theme.cap}">${stubs.join('')}${hasHub}</g></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function genOpenAIEdit(prompt, template) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY missing in .env');
  const fd = new FormData();
  fd.set('model', 'gpt-image-1');
  fd.set('prompt', prompt);
  fd.set('size', `${SIZE}x${SIZE}`);
  fd.set('quality', 'medium');
  fd.set('image', new Blob([template], { type: 'image/png' }), 'tile.png');
  const r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { authorization: `Bearer ${key}` }, body: fd });
  if (!r.ok) throw new Error(`openai-edit ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  return Buffer.from(j.data[0].b64_json, 'base64');
}

function editPrompt(theme, t) {
  const on = [];
  for (let e = 0; e < 4; e++) if (bit(t, e)) on.push(EDGE_NAMES[e]);
  const keep = on.length
    ? `Keep the existing ${theme.cap} stubs exactly where they are (${on.join(', ')} edge midpoint${on.length > 1 ? 's' : ''}) and the central hub. Grow dense circuitry OUT of those stubs and the hub so every stub connects through the centre.`
    : 'Fill the tile with a self-contained component. Do not draw anything touching the borders.';
  return `Extend this into a square ${theme.style}. ${theme.interior}. ${keep} Do not add any connection to edges that have no stub. Background solid near-black ${theme.bg}. Flat top-down, no text, no watermark, fills the whole square.`;
}

const PROVIDERS = { openai: genOpenAI, gemini: genGemini };

// ── prompt for one tile given its connected edges ──────────────────────────
function tilePrompt(theme, t) {
  const on = [], off = [];
  for (let e = 0; e < 4; e++) (bit(t, e) ? on : off).push(EDGE_NAMES[e]);
  const conn = on.length
    ? `A ${theme.cap} conduit must exit at the exact CENTRE of the ${on.join(', ')} edge${on.length > 1 ? 's' : ''}, reaching all the way to the border.`
    : 'A closed component with NO connections leaving the tile.';
  const clear = off.length ? ` Keep the ${off.join(', ')} edge${off.length > 1 ? 's' : ''} completely clear — nothing crosses ${off.length > 1 ? 'them' : 'it'}.` : '';
  return `Square seamless game tile, ${theme.style}. ${theme.interior}. ${conn}${clear} All connectors meet the tile centre so paths join up. Background solid near-black ${theme.bg}. Flat top-down, no perspective, no text, no watermark, edge-to-edge composition, fills the whole square.`;
}

// ── socket cap + erase overlay (SVG composited after generation) ───────────
// A stub is drawn twice: wide dark sheath first, brighter core on top — an
// insulated trace crossing the edge midpoint. Both are canonical so neighbours
// that share an edge produce one continuous insulated wire across the seam.
function stub(e, w, dep, S) {
  const mid = S / 2, r = Math.min(dep, w) * 0.4;
  if (e === 0) return `<rect x="${mid - w / 2}" y="${-r}" width="${w}" height="${dep + r}" rx="${r}"/>`;
  if (e === 2) return `<rect x="${mid - w / 2}" y="${S - dep}" width="${w}" height="${dep + r}" rx="${r}"/>`;
  if (e === 1) return `<rect x="${S - dep}" y="${mid - w / 2}" width="${dep + r}" height="${w}" rx="${r}"/>`;
  return `<rect x="${-r}" y="${mid - w / 2}" width="${dep + r}" height="${w}" rx="${r}"/>`;
}
function overlaySvg(t, cap) {
  const S = SIZE, core = CAP_LEN * S, sheath = core * SHEATH, dep = CAP_DEPTH * S, er = ERASE * S;
  const sh = [], co = [], erase = [];
  for (let e = 0; e < 4; e++) {
    if (bit(t, e)) { sh.push(stub(e, sheath, dep, S)); co.push(stub(e, core, dep * 0.92, S)); }
    else {
      if (e === 0) erase.push(`<rect x="0" y="0" width="${S}" height="${er}"/>`);
      if (e === 2) erase.push(`<rect x="0" y="${S - er}" width="${S}" height="${er}"/>`);
      if (e === 1) erase.push(`<rect x="${S - er}" y="0" width="${er}" height="${S}"/>`);
      if (e === 3) erase.push(`<rect x="0" y="0" width="${er}" height="${S}"/>`);
    }
  }
  return {
    caps: `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><g fill="${darken(cap, 0.28)}">${sh.join('')}</g><g fill="${cap}">${co.join('')}</g></svg>`,
    erase: `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><g fill="#fff">${erase.join('')}</g></svg>`,
  };
}

// gently equalise overall brightness so tiles don't patch the grid
async function normalizeTone(png) {
  const s = await sharp(png).stats();
  const [r, g, b] = s.channels; const mean = 0.2126 * r.mean + 0.7152 * g.mean + 0.0722 * b.mean;
  const f = Math.max(0.72, Math.min(1.45, TONE_TARGET / Math.max(1, mean)));
  return sharp(png).modulate({ brightness: f }).png().toBuffer();
}

async function postProcess(png, t, theme) {
  const toned = await normalizeTone(png);
  const { caps, erase } = overlaySvg(t, theme.cap);
  return sharp(toned).ensureAlpha()
    .composite([
      { input: Buffer.from(erase), blend: 'dest-out' },   // clear unconnected edges
      { input: Buffer.from(caps), blend: 'over' },         // stamp canonical sockets
    ])
    .png().toBuffer();
}

// ── tiny socket-WFC to prove the tiles assemble ────────────────────────────
function solveWFC(G, rng) {
  const compat = (a, b, d) => bit(a, [0, 1, 2, 3][d]) === bit(b, [2, 3, 0, 1][d]);
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  const N = G * G, cell = Array.from({ length: N }, () => (1 << 16) - 1);
  const pc = (m) => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
  for (let guard = 0; guard < N * 40; guard++) {
    let best = -1, bE = 1e9;
    for (let i = 0; i < N; i++) { const c = pc(cell[i]); if (c > 1 && c + rng() * 0.3 < bE) { bE = c + rng() * 0.3; best = i; } }
    if (best < 0) break;
    const opts = []; for (let t = 0; t < 16; t++) if (cell[best] & (1 << t)) opts.push(t);
    // weight toward more-connected tiles for lively fields
    const w = opts.map((t) => 0.3 + (bit(t, 0) + bit(t, 1) + bit(t, 2) + bit(t, 3)));
    let r = rng() * w.reduce((a, b) => a + b, 0), pick = opts[0];
    for (let k = 0; k < opts.length; k++) { r -= w[k]; if (r <= 0) { pick = opts[k]; break; } }
    cell[best] = 1 << pick;
    const stack = [best];
    while (stack.length) {
      const i = stack.pop(), x = i % G, y = (i / G) | 0;
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d], ny = y + DY[d]; if (nx < 0 || ny < 0 || nx >= G || ny >= G) continue;
        const ni = ny * G + nx; let allowed = 0;
        for (let t = 0; t < 16; t++) if (cell[i] & (1 << t)) for (let tp = 0; tp < 16; tp++) if (compat(t, tp, d)) allowed |= (1 << tp);
        const after = cell[ni] & allowed;
        if (after !== cell[ni]) { if (!after) return null; cell[ni] = after; stack.push(ni); }
      }
    }
  }
  return cell.map((m) => Math.log2(m) | 0);
}

function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ── main ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const themeName = args.find((a) => !a.startsWith('--')) || 'circuits';
const flag = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const theme = THEMES[themeName];
if (!theme) { console.error(`unknown theme "${themeName}". known: ${Object.keys(THEMES).join(', ')}`); process.exit(1); }
const provider = PROVIDERS[flag('provider', 'openai')];
const grid = +flag('grid', 8);
const only = flag('only', null)?.split(',').map(Number);
const reprocess = args.includes('--reprocess');   // rebuild from saved raw, no API calls
const editMode = args.includes('--edit');          // template→edit (circuitry grows from sockets)
const tileIdx = only || Array.from({ length: 16 }, (_, i) => i);

const dir = join(OUT, themeName);
const rawDir = join(dir, 'raw');
await mkdir(rawDir, { recursive: true });
console.log(`\n▸ ${themeName} — ${tileIdx.length} tiles @ ${SIZE}px ${reprocess ? '(reprocess from raw, no API)' : 'via ' + flag('provider', 'openai')}\n`);

const tiles = new Array(16).fill(null);
for (const t of tileIdx) {
  const edges = ['N', 'E', 'S', 'W'].filter((_, e) => bit(t, e)).join('') || '·';
  const rawPath = join(rawDir, `t${String(t).padStart(2, '0')}.png`);
  process.stdout.write(`  tile ${String(t).padStart(2)} [${edges.padEnd(4)}] … `);
  try {
    let raw;
    if (reprocess) { raw = await readFile(rawPath); }
    else if (editMode) { raw = await genOpenAIEdit(editPrompt(theme, t), await buildTemplate(t, theme)); await writeFile(rawPath, raw); }
    else { raw = await provider(tilePrompt(theme, t)); await writeFile(rawPath, raw); }   // keep raw for free re-tuning
    const buf = await postProcess(raw, t, theme);
    await writeFile(join(dir, `t${String(t).padStart(2, '0')}.png`), buf);
    tiles[t] = buf;
    console.log('ok');
  } catch (e) { console.log('FAIL', e.message); }
}

// contact sheet (4×4)
const have = tiles.map((b, i) => ({ b, i })).filter((x) => x.b);
if (have.length) {
  const cell = 240, pad = 8, sheet = 4 * cell + 5 * pad;
  const bg = { create: { width: sheet, height: sheet, channels: 4, background: theme.bg } };
  const comps = await Promise.all(have.map(async ({ b, i }) => ({
    input: await sharp(b).resize(cell, cell).flatten({ background: theme.bg }).png().toBuffer(),
    left: pad + (i % 4) * (cell + pad), top: pad + ((i / 4) | 0) * (cell + pad),
  })));
  await sharp(bg).composite(comps).png().toFile(join(OUT, `${themeName}_sheet.png`));
  console.log(`\n▸ contact sheet → ${OUT}/${themeName}_sheet.png`);
}

// WFC field assembly
if (have.length >= 8) {
  const map = solveWFC(grid, mulberry(0x1f65));
  if (map) {
    const cell = 256, field = grid * cell;
    const comps = await Promise.all(map.map(async (t, i) => {
      const b = tiles[t] || tiles[0];
      return { input: await sharp(b).resize(cell, cell).flatten({ background: theme.bg }).png().toBuffer(), left: (i % grid) * cell, top: ((i / grid) | 0) * cell };
    }));
    await sharp({ create: { width: field, height: field, channels: 4, background: theme.bg } }).composite(comps).png().toFile(join(OUT, `${themeName}_field.png`));
    console.log(`▸ WFC field (${grid}×${grid}) → ${OUT}/${themeName}_field.png\n`);
  } else console.log('▸ WFC did not converge (need more tile variety)\n');
}
