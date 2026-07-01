// ---------------------------------------------------------------------------
// tiles3 — 3-lane socket WFC tiles. Sockets = three ports per edge (3-bit mask);
// neighbours must agree port-for-port. Tiles are sparse, routed to a centre hub,
// decorated per theme by the shared scripts/tiledeco.mjs. This script rasterises
// the pool via sharp, solves a WFC field, and writes preview sheets.
//
// Run:  node scripts/tiles3.mjs circuits --grid 10
// AI skin (edit mode): node --env-file=.env scripts/tiles3.mjs circuits --skin
// ---------------------------------------------------------------------------
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SIZE, FRAC, THEMES, buildPool, decorateSvg } from './tiledeco.mjs';

const OUT = '_dev-shots/tiles3';
const OPP = [2, 3, 0, 1], DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];

const renderDeco = (tile, theme) => sharp(Buffer.from(decorateSvg(tile, theme))).png().toBuffer();

// skeleton = the socket wiring only; doubles as the AI edit-mode template
function portXY(edge, i, S) { const f = FRAC[i] * S; if (edge === 0) return [f, 0]; if (edge === 2) return [f, S]; if (edge === 3) return [0, f]; return [S, f]; }
function skeletonSvg(tile, theme, template) {
  const S = SIZE, c = S / 2, lw = S * (template ? 0.05 : 0.028), paths = [], dots = [];
  for (const { edge, i } of tile.ports) { const [px, py] = portXY(edge, i, S); const ex = (edge === 1 || edge === 3) ? c : px, ey = (edge === 0 || edge === 2) ? c : py; paths.push(`M ${px} ${py} L ${ex} ${ey} L ${c} ${c}`); dots.push(`<circle cx="${px}" cy="${py}" r="${lw * 0.75}"/>`); }
  const hub = tile.ports.length ? `<circle cx="${c}" cy="${c}" r="${lw * 1.15}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><rect width="${S}" height="${S}" fill="${theme.bg}"/><g fill="none" stroke="${theme.col}" stroke-width="${lw}" stroke-linecap="round" stroke-linejoin="round">${paths.map((d) => `<path d="${d}"/>`).join('')}</g><g fill="${theme.col}">${dots.join('')}${hub}</g></svg>`;
}
const renderSkeleton = (tile, theme, template) => sharp(Buffer.from(skeletonSvg(tile, theme, template))).png().toBuffer();

// ── WFC over the pool (3-bit edge sockets) ──────────────────────────────────
function precompat(pool) { const M = pool.length, C = Array.from({ length: M }, () => [[], [], [], []]); for (let a = 0; a < M; a++) for (let d = 0; d < 4; d++) for (let b = 0; b < M; b++) if (pool[a].edges[d] === pool[b].edges[OPP[d]]) C[a][d].push(b); return C; }
function solve(pool, C, G, rng) {
  const M = pool.length, N = G * G;
  const cells = Array.from({ length: N }, () => new Set(Array.from({ length: M }, (_, i) => i)));
  for (let guard = 0; guard < N * 60; guard++) {
    let best = -1, bE = 1e9;
    for (let i = 0; i < N; i++) { const c = cells[i].size; if (c > 1 && c + rng() * 0.4 < bE) { bE = c + rng() * 0.4; best = i; } }
    if (best < 0) break;
    const opts = [...cells[best]], tot = opts.reduce((a, t) => a + pool[t].w, 0);
    let r = rng() * tot, pk = opts[0];
    for (const t of opts) { r -= pool[t].w; if (r <= 0) { pk = t; break; } }
    cells[best] = new Set([pk]);
    const stack = [best];
    while (stack.length) {
      const i = stack.pop(), x = i % G, y = (i / G) | 0;
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d], ny = y + DY[d]; if (nx < 0 || ny < 0 || nx >= G || ny >= G) continue;
        const ni = ny * G + nx, allowed = new Set();
        for (const t of cells[i]) for (const b of C[t][d]) allowed.add(b);
        const nc = cells[ni]; let changed = false;
        for (const t of [...nc]) if (!allowed.has(t)) { nc.delete(t); changed = true; }
        if (nc.size === 0) return null;
        if (changed) stack.push(ni);
      }
    }
  }
  return cells.map((s) => [...s][0] ?? 0);
}
function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ── AI skin (optional) ──────────────────────────────────────────────────────
async function skinTile(template, theme) {
  const key = process.env.OPENAI_API_KEY; if (!key) throw new Error('OPENAI_API_KEY missing');
  const prompt = `Redraw exactly along the existing coloured lines: sparse ${theme.kind} on near-black ${theme.bg}. Keep every line's endpoints at the borders and centre. Thin strokes, mostly empty, no text.`;
  const fd = new FormData();
  fd.set('model', 'gpt-image-1'); fd.set('prompt', prompt); fd.set('size', `${SIZE}x${SIZE}`); fd.set('quality', 'medium');
  fd.set('image', new Blob([template], { type: 'image/png' }), 'tile.png');
  const r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { authorization: `Bearer ${key}` }, body: fd });
  if (!r.ok) throw new Error(`edit ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return Buffer.from((await r.json()).data[0].b64_json, 'base64');
}

// ── main ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const themeName = args.find((a) => !a.startsWith('--')) || 'circuits';
const flag = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const theme = THEMES[themeName]; if (!theme) { console.error('themes:', Object.keys(THEMES).join(', ')); process.exit(1); }
const G = +flag('grid', 10);
const skin = args.includes('--skin');

const dir = join(OUT, themeName); await mkdir(dir, { recursive: true });
const pool = buildPool(), C = precompat(pool);
console.log(`\n▸ ${themeName} — pool of ${pool.length} tiles, ${skin ? 'AI-skinned' : 'procedural'}\n`);

const bufs = [];
for (let t = 0; t < pool.length; t++) {
  if (skin) { const tpl = await renderSkeleton(pool[t], theme, true); try { bufs.push(await skinTile(tpl, theme)); process.stdout.write('•'); } catch (e) { console.log('\nskin fail', e.message); bufs.push(await renderDeco(pool[t], theme)); } }
  else bufs.push(await renderDeco(pool[t], theme));
}
console.log('');

// contact sheet
{
  const cols = 8, rows = Math.ceil(pool.length / cols), cell = 128, pad = 6;
  const W = cols * cell + (cols + 1) * pad, H = rows * cell + (rows + 1) * pad;
  const comps = await Promise.all(bufs.map(async (b, i) => ({ input: await sharp(b).resize(cell, cell).png().toBuffer(), left: pad + (i % cols) * (cell + pad), top: pad + ((i / cols) | 0) * (cell + pad) })));
  await sharp({ create: { width: W, height: H, channels: 4, background: theme.bg } }).composite(comps).png().toFile(join(OUT, `${themeName}_pool.png`));
  console.log(`▸ pool sheet → ${OUT}/${themeName}_pool.png`);
}
// WFC field
{
  const map = solve(pool, C, G, mulberry(0x1f65));
  if (!map) console.log('▸ WFC did not converge');
  else {
    const cell = Math.min(128, (1600 / G) | 0), F = G * cell;
    const comps = await Promise.all(map.map(async (t, i) => ({ input: await sharp(bufs[t]).resize(cell, cell).png().toBuffer(), left: (i % G) * cell, top: ((i / G) | 0) * cell })));
    await sharp({ create: { width: F, height: F, channels: 4, background: theme.bg } }).composite(comps).png().toFile(join(OUT, `${themeName}_field.png`));
    console.log(`▸ WFC field (${G}×${G}) → ${OUT}/${themeName}_field.png\n`);
  }
}
