import * as THREE from 'three';

// ---------------------------------------------------------------------------
// A link "preview" rendered to a canvas texture. NOTE: a live cross-origin
// page cannot be drawn into a WebGL texture (browser security; most ref sites
// also block being framed), so this builds a faux-browser preview card we CAN
// texture — fed into the soma's accretion/cloud shader (Core) or onto the
// focused wall (Layout).
// ---------------------------------------------------------------------------

const cache = new Map();

export function linkTexture(url, label = '') {
  const key = `${url}|${label}`;
  if (cache.has(key)) return cache.get(key);
  const tex = new THREE.CanvasTexture(makeCard(url, label));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}
function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function wrap(g, text, x, y, maxW, lh) {
  const words = text.split(/\s+/); let line = '', yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, yy); line = w; yy += lh; }
    else line = test;
    if (yy > y + lh * 3) break; // cap at 4 lines
  }
  if (line) g.fillText(line, x, yy);
}

function makeCard(url, label) {
  const w = 768, h = 480;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');

  g.fillStyle = '#06080c'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,0.04)';                 // scanlines
  for (let y = 0; y < h; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }

  g.fillStyle = '#0e141c'; g.fillRect(0, 0, w, 72);          // chrome bar
  g.fillStyle = '#2a3340';
  [28, 56, 84].forEach((x) => { g.beginPath(); g.arc(x, 36, 8, 0, 7); g.fill(); });
  g.fillStyle = '#0a0f15'; roundRect(g, 120, 18, w - 150, 36, 8); g.fill();
  g.fillStyle = '#9fb8d0'; g.font = '22px ui-monospace, monospace'; g.textBaseline = 'middle';
  g.textAlign = 'left'; g.fillText('▸ ' + domainOf(url), 138, 37);

  g.fillStyle = 'rgba(255,255,255,0.05)';                   // ↗ watermark
  g.font = '800 250px ui-monospace, monospace'; g.textAlign = 'right'; g.textBaseline = 'alphabetic';
  g.fillText('↗', w - 16, h - 56);

  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#f0f0f0'; g.font = '600 40px ui-monospace, monospace';
  wrap(g, label || domainOf(url), 40, 156, w - 80, 48);
  g.fillStyle = 'rgba(180,200,220,0.5)'; g.font = '20px ui-monospace, monospace';
  g.fillText(truncate(url, 58), 40, h - 36);

  g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4);
  return c;
}
