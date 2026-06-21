// ---------------------------------------------------------------------------
// The venue cross-section drawing, keyed to the monochrome aesthetic: the
// black-on-white architectural panorama is processed so black ink → white
// lines and white paper → transparent. Rendered with the four surface
// markers (Meta / Data / The Loop / The Patch) laid over the section, used as
// an interactive key in the Core cards and as a toggleable overlay in Layout.
// ---------------------------------------------------------------------------

const SRC = 'assets/materials/Cross_Panorama_4K_correct_Drawing_BoW.jpg';

// marker anchors as fractions of the drawing (tweak freely)
export const SECTION_MARKERS = [
  { surf: 'meta',  label: 'Meta',      x: 0.500, y: 0.090 },
  { surf: 'loop',  label: 'The Loop',  x: 0.500, y: 0.620 },
  { surf: 'data',  label: 'Data',      x: 0.500, y: 0.905 },
  { surf: 'patch', label: 'Patch · L', x: 0.405, y: 0.520 },
  { surf: 'patch', label: 'Patch · R', x: 0.595, y: 0.520 },
];

let _url = null;     // keyed PNG data URL (cached)
let _promise = null;
let _aspect = 2000 / 1132;

// process once: white → transparent, black → white
export function loadSection() {
  if (_promise) return _promise;
  _promise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      _aspect = img.naturalWidth / img.naturalHeight;
      const maxW = 1600;
      const scale = Math.min(1, maxW / img.naturalWidth);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0, w, h);
      const id = g.getImageData(0, 0, w, h), d = id.data;
      for (let i = 0; i < d.length; i += 4) {
        const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
        let a = 255 - lum;          // ink → opaque, paper → transparent
        if (a < 16) a = 0;          // clean faint paper noise
        d[i] = d[i + 1] = d[i + 2] = 255; // lines become white
        d[i + 3] = a;
      }
      g.putImageData(id, 0, 0);
      _url = c.toDataURL('image/png');
      resolve(_url);
    };
    img.onerror = () => resolve(null);
    img.src = SRC;
  });
  return _promise;
}

export const sectionAspect = () => _aspect;

// Build a DOM node: the keyed drawing + the four surface markers.
// opts: { interactive, onEnter(surf), onLeave(surf), onSelect(surf) }
export function buildSection(opts = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'section-draw';
  wrap.style.aspectRatio = String(_aspect);

  const img = document.createElement('img');
  img.className = 'sd-img';
  img.alt = 'venue cross-section';
  if (_url) img.src = _url;
  else loadSection().then((u) => { if (u) img.src = u; });
  wrap.appendChild(img);

  SECTION_MARKERS.forEach((m) => {
    const b = document.createElement('button');
    b.className = `sd-mk sd-${m.surf}`;
    b.dataset.surf = m.surf;
    b.style.left = `${m.x * 100}%`;
    b.style.top = `${m.y * 100}%`;
    b.innerHTML = `<i></i><span>${m.label}</span>`;
    if (opts.interactive) {
      b.addEventListener('pointerenter', () => opts.onEnter && opts.onEnter(m.surf));
      b.addEventListener('pointerleave', () => opts.onLeave && opts.onLeave(m.surf));
      b.addEventListener('click', () => opts.onSelect && opts.onSelect(m.surf));
    } else {
      b.style.pointerEvents = 'none';
    }
    wrap.appendChild(b);
  });
  return wrap;
}
