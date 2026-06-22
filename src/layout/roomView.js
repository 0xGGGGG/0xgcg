import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { ViewHelper } from 'three/addons/helpers/ViewHelper.js';
import { buildSection } from '../ui/sectionView.js';
import { CircularPlayer } from '../ui/circularPlayer.js';
import { linkTexture } from '../ui/linkPreview.js';
import { createArrowField } from './arrows.js';
import { Narrator, speechSeconds } from '../ui/narrator.js';

const PHASE_COLOR = { meta: '#8be8a0', data: '#bfd0ff', loop: '#ff7ad9', patch: '#e8d48b', return: '#b888ff' };

// ---------------------------------------------------------------------------
// ## Layout — a navigable, holographic 3D plan of the venue (the
// Maschinenhalle at Kunstkraftwerk, Leipzig). The FBX is already separated
// into five named meshes (BackWall / Floor / FrontWall / LeftWall /
// RightWall), so SCRIPT.md §2's four named systems map 1:1 onto real
// surface geometry:
//
//   BackWall   -> Meta       (rear wall — creator / debug layer)
//   Floor      -> Data       (soundtrack made visible, rear -> front)
//   FrontWall  -> The Loop   (void engine / black seed)
//   Left/Right -> The Patch  (side-wall version history)
//
// The room is drawn as a dark wireframe blueprint to match the Core
// neuron aesthetic (black void, glowing white edges). Each surface carries
// a DOM marker styled like the act markers; a Blender-style axis gizmo
// (ViewHelper) sits in the corner for orientation.
// ---------------------------------------------------------------------------

const MODEL_URL = 'assets/materials/Maschinenhalle_separated_Panorama.fbx';
const FIT_SIZE = 44; // longest model dimension is scaled to this many world units

// Surface metadata, keyed by FBX mesh name. Distilled from SCRIPT.md §2.
export const SURFACES = [
  {
    mesh: 'FrontWall', key: 'loop', tag: 'FRONT', label: 'The Loop',
    sub: 'Front wall',
    role: 'main altar · void engine · recursive compiler',
    body:
      'The centre of attention. It receives Data and transforms it into ' +
      'worlds — one recurring object across the whole film. It pulses with ' +
      'the soundtrack like a physical law, never an EDM drop.',
    also: ['black hole', 'pulsar', 'pupil', 'cell nucleus', 'seed', 'server node', 'void main()'],
    fragments: ['void main() {', '  init();', '  while (true) {', '    grow(); optimize();', '    overfit(); glitch();', '    dimension++;', '  }', '}'],
    refs: [
      { label: 'Black hole / event horizon shader', url: 'https://www.shadertoy.com/results?query=black+hole' },
      { label: 'Pulsar — recurring object', url: 'https://www.youtube.com/results?search_query=pulsar+visualization' },
    ],
  },
  {
    mesh: 'Floor', key: 'data', tag: 'FLOOR', label: 'Data',
    sub: 'Floor',
    role: 'soundtrack made visible · the causal fiction',
    body:
      'The floor receives the soundtrack as spectral bands flowing rear → ' +
      'front, from Meta toward The Loop. The audience sits inside the signal ' +
      'before it becomes image.',
    also: ['FFT river', 'spectrogram', 'cymatic plate', 'EEG / seismograph', 'data bloodstream'],
    fragments: ['sub  → gravity, black liquid', 'low  → roots, pipe currents', 'mid  → cellular sparks', 'high → scanlines, data dust'],
    refs: [
      { label: 'Ryoji Ikeda — data as architecture', url: 'https://www.youtube.com/results?search_query=ryoji+ikeda+test+pattern' },
      { label: 'Cymatics / Chladni', url: 'https://www.youtube.com/results?search_query=chladni+cymatics' },
    ],
  },
  {
    mesh: 'BackWall', key: 'meta', tag: 'REAR', label: 'Meta',
    sub: 'Rear wall',
    role: 'process · creator · debug · fourth-wall breach',
    body:
      'The backdoor terminal of creation — the hidden operating system ' +
      'behind the universe. It documents the making: logs, shaders, ' +
      'sessions, failed renders, TODOs.',
    also: ['screen captures', 'Claude Code logs', 'shader snippets', 'failed renders', 'prompt fragments'],
    fragments: ['init substrate...', 'seed: void', 'growth_rule: recursive_branching', 'optimize: true', 'overfit_threshold: 0.74', 'dimension++  // return void'],
    refs: [
      { label: 'Claude Code', url: 'https://claude.com/claude-code' },
      { label: 'Terminal / glitch typography', url: 'https://www.youtube.com/results?search_query=terminal+glitch+typography' },
    ],
  },
  {
    mesh: 'LeftWall', key: 'patch', tag: 'SIDE · L', label: 'The Patch',
    sub: 'Left wall',
    role: 'memory of the loop · version history',
    body:
      'The side walls are the memory of the loop. Arches become portals / ' +
      'commits / phase buffers. Read front-to-back as history: newest near ' +
      'the front, fossilized states and source leakage toward the rear.',
    also: ['software commits', 'synth patch cables', 'cultivated land', 'timeline of changes'],
    fragments: ['Patch 0.4 — recursive branching', 'Patch 0.6 — circuit inheritance', 'Patch 0.7 — data swarm', 'Patch 0.8 — rollback failed'],
    refs: [
      { label: 'Wave Function Collapse', url: 'https://github.com/mxgmn/WaveFunctionCollapse' },
      { label: 'git history visualization', url: 'https://www.youtube.com/results?search_query=git+history+visualization' },
    ],
  },
  {
    mesh: 'RightWall', key: 'patch', tag: 'SIDE · R', label: 'The Patch',
    sub: 'Right wall',
    role: 'mirror archive · Indra’s net',
    body:
      'The opposite bank of the same river of history. Side portals replay ' +
      'previous, future and failed branches of the same story at different ' +
      'scales — each jewel reflects every other.',
    also: ['previous layer', 'future preview', 'failed generation', 'source / meta leak'],
    fragments: ['commit 03f7a9', '+ added membrane behavior', '+ increased branching density', '! corruption detected'],
    refs: [
      { label: "Indra's net — each node holds the whole", url: 'https://en.wikipedia.org/wiki/Indra%27s_net' },
      { label: 'Cellular automata', url: 'https://www.youtube.com/results?search_query=cellular+automata' },
    ],
  },
];

export function createRoomView(renderer) {
  // ---- scene / camera / controls ------------------------------------
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.004);

  const camera = new THREE.PerspectiveCamera(
    55, window.innerWidth / window.innerHeight, 0.1, 4000
  );

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = true;
  controls.screenSpacePanning = false;
  controls.minDistance = 6;
  controls.maxDistance = 260;
  controls.enabled = false; // activated when Layout becomes the live mode

  scene.add(new THREE.AmbientLight(0x404040, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 0.5);
  key.position.set(1, 2, 1);
  scene.add(key);

  // ---- axis gizmo (Blender-style) -----------------------------------
  const viewHelper = new ViewHelper(camera, renderer.domElement);
  viewHelper.setLabels('X', 'Y', 'Z');

  // ---- DOM markers (one per surface) --------------------------------
  const markerWrap = document.createElement('div');
  markerWrap.id = 'room-markers';
  document.body.appendChild(markerWrap);

  // ---- info card ----------------------------------------------------
  const card = document.createElement('div');
  card.id = 'room-card';
  document.body.appendChild(card);
  let pinned = -1; // index of a click-pinned surface (-1 = none)

  // ---- gizmo-area options: frame-all + section toggle ---------------
  const frameBtn = document.createElement('button');
  frameBtn.id = 'frame-btn';
  frameBtn.className = 'gizmo-opt';
  frameBtn.title = 'Frame the whole room';
  frameBtn.innerHTML = '⤢ frame';
  frameBtn.addEventListener('click', () => frameRoom());
  document.body.appendChild(frameBtn);

  const secToggle = document.createElement('button');
  secToggle.id = 'section-toggle';
  secToggle.className = 'gizmo-opt';
  secToggle.title = 'Toggle the annotated cross-section';
  secToggle.innerHTML = '▣ section';
  document.body.appendChild(secToggle);

  const secOverlay = document.createElement('div');
  secOverlay.id = 'section-overlay';
  document.body.appendChild(secOverlay);
  let secBuilt = false;

  function toggleSection(force) {
    const show = force !== undefined ? force : !secOverlay.classList.contains('show');
    if (show && !secBuilt) {
      const panel = document.createElement('div');
      panel.className = 'so-panel';
      panel.innerHTML = `<div class="so-head"><span>venue cross-section · click a surface</span><button class="so-close">✕</button></div>`;
      panel.querySelector('.so-close').addEventListener('click', () => toggleSection(false));
      panel.appendChild(buildSection({
        interactive: true,
        onSelect: (surf) => {
          const mesh = { meta: 'BackWall', data: 'Floor', loop: 'FrontWall', patch: 'LeftWall' }[surf];
          const k = surfaces.indexOf(surfBy(mesh));
          if (k >= 0) pin(k); // pauses the loop, flies the camera, opens the card
          toggleSection(false);
        },
      }));
      secOverlay.appendChild(panel);
      secBuilt = true;
    }
    secOverlay.classList.toggle('show', show);
    secToggle.classList.toggle('on', show);
  }
  secToggle.addEventListener('click', () => toggleSection());

  // ---- transient state ----------------------------------------------
  const surfaces = []; // { def, mesh, center, normal, marker, fill, edges, baseEdgeOpacity }
  let root = null;     // the scaled/centered model group
  let bounds = null;   // THREE.Box3 of the fitted model
  let arrowFields = [];// per-surface oriented arrow flows
  let tAcc = 0;        // time accumulator for pulses

  // ---- the loop cycle (SCRIPT §2 causal chain) ----------------------
  // Meta documents -> Data flows rear→front -> The Loop transforms ->
  // The Patch remembers (slides front→rear) -> dissolves back into Meta.
  const CYCLE = [
    { key: 'meta',   mesh: 'BackWall',  label: 'META',      sub: 'documents · the rear wall dreams the making', dur: 4.0 },
    { key: 'data',   mesh: 'Floor',     label: 'DATA',      sub: 'flows · soundtrack rear → front',             dur: 4.5 },
    { key: 'loop',   mesh: 'FrontWall', label: 'THE LOOP',  sub: 'transforms · data becomes world',             dur: 4.0 },
    { key: 'patch',  mesh: 'LeftWall',  label: 'THE PATCH', sub: 'remembers · slides front → rear, dissolves to Meta', dur: 5.0 },
  ];
  const cyc = { on: true, i: 0, t: 0 };
  let segDur = 5;          // current phase dwell (grows to fit the spoken narration)
  let intro = null;        // opening sequence: hold on the framed room, then fly to Meta
  let activated = false;   // Layout is the live mode
  const INTRO_HOLD = 2.5;  // seconds parked at the initial framing before flying in
  const em = { data: 0, patch: 0, loop: 0, meta: 0 };       // eased emphasis 0..1
  const emT = { data: 0, patch: 0, loop: 0, meta: 0 };       // targets

  const surfBy = (mesh) => surfaces.find((s) => s.def.mesh === mesh);
  const clock = new THREE.Clock();

  // ---- circular transport (drives the cycle, camera follows) --------
  const SHORT = { meta: 'META', data: 'DATA', loop: 'LOOP', patch: 'PATCH' };
  const player = new CircularPlayer({
    steps: CYCLE.map((c) => ({ key: c.key, label: c.label, short: SHORT[c.key], sub: c.sub, color: PHASE_COLOR[c.key], dur: c.dur })),
    onSelect: (i) => { intro = null; cyc.i = i; cyc.t = 0; cycleEnter(i, { fly: true }); },
    onToggle: (on) => { cyc.on = on; if (on) narrateCard(); else narrator.stop(); },
    playing: true,
  });
  player.mount(document.getElementById('player-mount'));
  const narrator = new Narrator();
  // the entity speaks the active surface (label → body) with karaoke; the phase
  // dwell stretches to fit so the progress ring keeps turning and the line finishes
  function narrateCard() {
    const title = card.querySelector('.rc-title'), body = card.querySelector('.rc-body');
    const text = (title ? title.textContent : '') + ' . ' + (body ? body.textContent : '');
    segDur = Math.max(CYCLE[cyc.i].dur, speechSeconds(text));
    narrator.speak([title, body]);
  }

  // ---- load the model -----------------------------------------------
  const loader = new FBXLoader();
  loader.load(MODEL_URL, onLoaded, undefined, (err) => {
    console.warn('[layout] FBX failed to load:', err);
    showLoadError();
  });

  function onLoaded(obj) {
    // Fit: recenter to origin and scale longest axis to FIT_SIZE.
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const longest = Math.max(size.x, size.y, size.z) || 1;
    const s = FIT_SIZE / longest;

    root = new THREE.Group();
    obj.position.sub(center);        // center the model
    root.scale.setScalar(s);
    root.add(obj);
    scene.add(root);
    scene.updateMatrixWorld(true); // so per-surface world boxes are accurate

    // Holographic re-skin + collect named surfaces.
    obj.traverse((child) => {
      if (!child.isMesh) return;
      const def = SURFACES.find((d) => d.mesh === child.name);
      reskin(child, def);
      if (def) registerSurface(def, child);
    });

    bounds = new THREE.Box3().setFromObject(root);
    addGround();
    buildArrows();
    frameAll();
    // if Layout is already the live mode, run the opening sequence now that the
    // model exists; otherwise just pre-stage Meta silently for the next entry
    if (activated) startIntro();
    else cycleEnter(cyc.i, { fly: false });
    document.getElementById('layout-loading')?.remove();
  }

  // Dark translucent fill + glowing edge overlay (the blueprint look).
  function reskin(mesh, def) {
    const isSurface = !!def;
    mesh.material = new THREE.MeshBasicMaterial({
      color: isSurface ? 0x0c1118 : 0x080a0e,
      transparent: true,
      opacity: isSurface ? 0.5 : 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    // hard structural edges (room outline) — bright
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry, 18),
      new THREE.LineBasicMaterial({
        color: isSurface ? 0xcfe0ff : 0x8aa0c0,
        transparent: true,
        opacity: isSurface ? 0.7 : 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    edges.renderOrder = 2;
    mesh.add(edges);
    mesh.userData.edges = edges;
    // faint full wireframe so subdivided meshes read as a mesh, not just an outline
    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({
        color: 0x4a5a72,
        transparent: true,
        opacity: isSurface ? 0.16 : 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    wire.renderOrder = 1;
    mesh.add(wire);
  }

  function registerSurface(def, mesh) {
    const wb = new THREE.Box3().setFromObject(mesh);
    const center = wb.getCenter(new THREE.Vector3());
    const sz = wb.getSize(new THREE.Vector3());
    // marker pushed slightly off the surface toward the room interior
    const toCenter = new THREE.Vector3(0, 0, 0).sub(center);
    // dominant thin axis = surface normal
    const normal = surfaceNormal(sz);
    if (normal.dot(toCenter) < 0) normal.multiplyScalar(-1);
    const anchor = center.clone().addScaledVector(normal, Math.min(...[sz.x, sz.y, sz.z].filter((v) => v > 0.01)) * 0.5 + 1.5);

    const marker = document.createElement('button');
    marker.className = `room-marker rm-${def.key}`;
    marker.innerHTML = `<i></i><b>${def.tag}</b><span>${def.label}</span>`;
    const idx = surfaces.length;
    marker.addEventListener('pointerenter', () => highlight(idx, true));
    marker.addEventListener('pointerleave', () => { if (pinned !== idx) highlight(idx, false); });
    marker.addEventListener('click', () => pin(idx));
    markerWrap.appendChild(marker);

    surfaces.push({
      def, mesh, center, anchor, normal, size: sz.clone(),
      marker,
      fill: mesh.material,
      edges: mesh.userData.edges,
      baseEdgeOpacity: mesh.userData.edges.material.opacity,
      baseFillOpacity: mesh.material.opacity,
    });
  }

  function surfaceNormal(size) {
    // the smallest dimension is the wall thickness -> its axis is the normal
    if (size.x <= size.y && size.x <= size.z) return new THREE.Vector3(1, 0, 0);
    if (size.y <= size.x && size.y <= size.z) return new THREE.Vector3(0, 1, 0);
    return new THREE.Vector3(0, 0, 1);
  }

  function highlight(i, on) {
    const s = surfaces[i];
    if (!s) return;
    s.marker.classList.toggle('hot', on);
    s.edges.material.opacity = on ? 0.85 : s.baseEdgeOpacity;
    s.fill.opacity = on ? Math.min(0.5, s.baseFillOpacity + 0.2) : s.baseFillOpacity;
    // sibling Patch wall lights up together (shared identity)
    if (on && s.def.key === 'patch') {
      surfaces.forEach((o, k) => { if (k !== i && o.def.key === 'patch') { o.edges.material.opacity = 0.55; } });
    } else if (!on && s.def.key === 'patch') {
      surfaces.forEach((o, k) => { if (k !== i && o.def.key === 'patch' && pinned !== k) o.edges.material.opacity = o.baseEdgeOpacity; });
    }
  }

  function pin(i) {
    intro = null; cyc.on = false; player.setPlaying(false); narrator.stop(); // manual inspection pauses the loop
    if (pinned === i) { pinned = -1; highlight(i, false); hideCard(); return; }
    if (pinned >= 0) highlight(pinned, false);
    pinned = i;
    highlight(i, true);
    showCard(surfaces[i].def);
    focusSurface(surfaces[i]);
  }

  function showCard(def) {
    hideLinkOnWall();
    card.className = `rc-${def.key}`;
    card.innerHTML = `
      <div class="rc-meta"><span>${def.tag}</span><span class="rc-key">${def.key}</span></div>
      <h4><span class="rc-title">${def.label}</span> <small>· ${def.sub}</small></h4>
      ${def.role ? `<p class="rc-role">${def.role}</p>` : ''}
      <p class="rc-body">${def.body}</p>
      ${def.also ? `<div class="rc-also">${def.also.map((a) => `<span>${a}</span>`).join('')}</div>` : ''}
      ${def.fragments ? `<code class="rc-code">${def.fragments.join('\n')}</code>` : ''}
      ${def.refs ? `<div class="rc-refs">${def.refs.map((r) => `<a href="${r.url}" target="_blank" rel="noopener">↗ ${r.label}</a>`).join('')}</div>` : ''}`;
    card.querySelectorAll('.rc-refs a').forEach((a) => {
      a.addEventListener('pointerenter', () => showLinkOnWall(def, a.href, a.textContent.replace(/^↗\s*/, '').trim()));
      a.addEventListener('pointerleave', () => hideLinkOnWall());
    });
    card.classList.add('show');
  }
  function hideCard() { card.classList.remove('show'); hideLinkOnWall(); }

  // map a link preview onto the focused wall (hover on a Layout ref pill)
  let linkPlane = null;
  function showLinkOnWall(def, url, label) {
    const s = surfBy(def.mesh); if (!s) return;
    if (!linkPlane) {
      linkPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 1, side: THREE.DoubleSide,
          depthWrite: false, blending: THREE.AdditiveBlending })
      );
      linkPlane.renderOrder = 5;
      scene.add(linkPlane);
    }
    linkPlane.material.map = linkTexture(url, label);
    linkPlane.material.needsUpdate = true;
    const n = s.normal, sz = s.size;
    const ax = Math.abs(n.x) > Math.abs(n.y) && Math.abs(n.x) > Math.abs(n.z) ? 'x'
      : (Math.abs(n.y) > Math.abs(n.z) ? 'y' : 'z');
    linkPlane.position.copy(s.center).addScaledVector(n, 0.4);
    if (ax === 'y') {
      linkPlane.rotation.set(-Math.PI / 2, 0, 0);
      linkPlane.scale.set(sz.x * 0.82, sz.z * 0.72, 1);
    } else {
      linkPlane.up.set(0, 1, 0);
      linkPlane.lookAt(linkPlane.position.clone().add(n)); // readable face toward the room
      linkPlane.scale.set((ax === 'x' ? sz.z : sz.x) * 0.82, sz.y * 0.72, 1);
    }
    linkPlane.visible = true;
  }
  function hideLinkOnWall() { if (linkPlane) linkPlane.visible = false; }

  // gently fly the orbit target + camera to a (target, eye) pair, arcing
  // around the room's Y axis so transitions feel orbital, not a straight slide
  let flyAnim = null;
  function flyTo(target, eye) {
    const c = bounds ? bounds.getBoundingSphere(new THREE.Sphere()).center : new THREE.Vector3();
    flyAnim = { c, fromT: controls.target.clone(), toT: target.clone(), fromP: camera.position.clone(), toP: eye.clone(), t: 0 };
  }
  function focusSurface(s) {
    if (!s) return;
    const target = s.center.clone();
    const dist = Math.max(FIT_SIZE * 0.55, 18);
    const eye = target.clone().addScaledVector(s.normal, dist);
    eye.y = target.y + FIT_SIZE * 0.18;
    flyTo(target, eye);
  }

  function frameAll() {
    if (!bounds) return;
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    const r = sphere.radius;
    controls.target.copy(sphere.center);
    // 0.78 = tighten the fit so the room fills the frame (not the whole sphere)
    const dist = (r / Math.sin((camera.fov * Math.PI) / 180 / 2)) * 0.78;
    // View from the REAR side: rear wall (Meta) close, front wall (The Loop)
    // far — matching the audience's back-to-front read of the room.
    const back = surfaces.find((s) => s.def.mesh === 'BackWall');
    const front = surfaces.find((s) => s.def.mesh === 'FrontWall');
    const dir = (back && front)
      ? back.center.clone().sub(front.center).setY(0).normalize() // toward the rear
      : new THREE.Vector3(0, 0, 1);
    const perp = new THREE.Vector3(-dir.z, 0, dir.x); // lateral, for a 3/4 view
    camera.position.copy(sphere.center)
      .addScaledVector(dir, dist * 0.62)
      .addScaledVector(perp, dist * 0.42);
    camera.position.y = sphere.center.y + dist * 0.42;
    camera.near = r / 100;
    camera.far = r * 100;
    camera.updateProjectionMatrix();
    controls.update();
  }

  function addGround() {
    const r = bounds.getBoundingSphere(new THREE.Sphere()).radius;
    const grid = new THREE.GridHelper(r * 4, 48, 0x223040, 0x111820);
    grid.position.y = bounds.min.y - 0.5;
    grid.material.transparent = true;
    grid.material.opacity = 0.4;
    scene.add(grid);
  }

  // Oriented arrow flows, one per surface (SCRIPT §2 directional motion).
  function buildArrows() {
    const back = surfBy('BackWall'), front = surfBy('FrontWall'), floor = surfBy('Floor');
    const left = surfBy('LeftWall'), right = surfBy('RightWall');
    if (!back || !front || !floor || !left || !right) return;
    const dataDir = Math.sign(front.center.z - back.center.z) || 1;   // rear → front (floor)
    const patchDir = Math.sign(back.center.z - front.center.z) || -1; // front → rear (side walls)
    arrowFields = [
      { key: 'meta',  f: createArrowField(scene, back,  { mode: 'random', color: 0x8be8a0, count: 70 }) },
      { key: 'data',  f: createArrowField(scene, floor, { mode: 'flow',   color: 0xbfd0ff, count: 130, dirSign: dataDir }) },
      { key: 'loop',  f: createArrowField(scene, front, { mode: 'whirl',  color: 0xff7ad9, count: 100 }) },
      { key: 'patch', f: createArrowField(scene, left,  { mode: 'patch',  color: 0xe8d48b, count: 95, dirSign: patchDir }) },
      { key: 'patch', f: createArrowField(scene, right, { mode: 'patch',  color: 0xe8d48b, count: 95, dirSign: patchDir }) },
    ];
  }

  function updateArrows(dt) {
    for (const a of arrowFields) a.f.update(dt, tAcc, em[a.key]);
  }

  // ---- loop-cycle sequencer -----------------------------------------
  function cycleEnter(i, { fly = true } = {}) {
    if (!surfaces.length) return;
    pinned = -1;
    const c = CYCLE[i];
    emT.data = c.key === 'data' ? 1 : 0;
    emT.patch = c.key === 'patch' ? 1 : 0;
    emT.loop = c.key === 'loop' ? 1 : 0;
    emT.meta = c.key === 'meta' ? 1 : 0;
    surfaces.forEach((s, k) => highlight(k, false));
    if (c.key === 'patch') {
      [surfBy('LeftWall'), surfBy('RightWall')].forEach((s) => { const k = surfaces.indexOf(s); if (k >= 0) highlight(k, true); });
    } else {
      const k = surfaces.indexOf(surfBy(c.mesh)); if (k >= 0) highlight(k, true);
    }
    const def = SURFACES.find((d) => d.mesh === c.mesh);
    segDur = c.dur; // base dwell; narrateCard grows it to fit the narration
    if (def) showCard(def);
    if (cyc.on) narrateCard(); else narrator.stop(); // speak only while the loop is playing
    if (fly) focusForPhase(c.key);
    player.setActive(i);
  }

  // camera vantage per phase (mirrors clicking a surface marker)
  function focusForPhase(key) {
    if (key === 'data') {
      const floor = surfBy('Floor'); if (!floor) return;
      const c = floor.center.clone();
      const fs = new THREE.Box3().setFromObject(floor.mesh).getSize(new THREE.Vector3());
      const span = Math.max(fs.x, fs.z);
      const eye = c.clone();
      eye.y = c.y + span * 0.95;                 // high enough to read the whole floor
      const back = surfBy('BackWall');           // 3/4 from the rear, not pure top-down
      if (back) eye.addScaledVector(back.center.clone().sub(c).setY(0).normalize(), span * 0.5);
      return flyTo(c, eye);
    }
    if (key === 'loop') return focusSurface(surfBy('FrontWall'));
    if (key === 'meta') return focusSurface(surfBy('BackWall'));
    if (key === 'patch') {
      // a front-elevated 3/4 vantage, pulled back enough to read both full side walls
      const front = surfBy('FrontWall'), back = surfBy('BackWall');
      if (!front || !back || !bounds) return;
      const center = bounds.getBoundingSphere(new THREE.Sphere()).center;
      const dir = front.center.clone().sub(back.center).setY(0).normalize(); // toward front
      const dist = FIT_SIZE * 1.15;
      const eye = center.clone().addScaledVector(dir, dist * 0.78);
      eye.y = center.y + dist * 0.5;
      flyTo(center, eye);
    }
  }

  function showLoadError() {
    const el = document.getElementById('layout-loading');
    if (el) el.textContent = 'could not load room model — check assets/materials/';
  }

  // ---- public API ---------------------------------------------------
  // open on the framed room, hold, fly to Meta, then begin Meta's stage on arrival
  function startIntro() {
    if (!surfaces.length) return; // load handler will re-run this once the model is in
    hideCard();
    narrator.stop();
    pinned = -1;
    cyc.i = 0; cyc.t = 0;
    frameAll();                 // initial vantage: the whole room
    player.setActive(cyc.i);
    intro = { t: 0, flown: false };
  }

  function activate() {
    activated = true;
    controls.enabled = true;
    markerWrap.style.display = 'block';
    player.el.style.display = 'flex';
    frameBtn.style.display = 'block';
    secToggle.style.display = 'block';
    cyc.on = true;
    player.setPlaying(true);
    startIntro();
    onResize();
    clock.getDelta(); // reset
  }
  function deactivate() {
    activated = false;
    intro = null;
    controls.enabled = false;
    markerWrap.style.display = 'none';
    player.el.style.display = 'none';
    frameBtn.style.display = 'none';
    secToggle.style.display = 'none';
    toggleSection(false);
    hideCard();
    narrator.stop();
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  function update(dt) {
    if (flyAnim) {
      const a = flyAnim;
      a.t = Math.min(1, a.t + dt / 1.5);
      const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
      const clamp01 = (x) => Math.max(0, Math.min(1, x));
      // translate (radius + height) first, then orbit around Y — so a top/floor
      // vantage is reached before the rotation swings around
      const eMove = ease(clamp01(a.t / 0.6));
      const eAng = ease(clamp01((a.t - 0.3) / 0.7));
      const c = a.c, fp = a.fromP, tp = a.toP;
      const a0 = Math.atan2(fp.z - c.z, fp.x - c.x);
      const a1 = Math.atan2(tp.z - c.z, tp.x - c.x);
      let da = a1 - a0;
      da = ((da + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; // shortest arc
      const r0 = Math.hypot(fp.x - c.x, fp.z - c.z);
      const r1 = Math.hypot(tp.x - c.x, tp.z - c.z);
      const ang = a0 + da * eAng, r = r0 + (r1 - r0) * eMove, y = fp.y + (tp.y - fp.y) * eMove;
      camera.position.set(c.x + Math.cos(ang) * r, y, c.z + Math.sin(ang) * r);
      controls.target.lerpVectors(a.fromT, a.toT, eMove);
      if (a.t >= 1) flyAnim = null;
    }
    if (viewHelper.animating) viewHelper.update(dt);

    // opening sequence: hold on the framed room, fly to Meta, start its stage on arrival
    if (intro) {
      intro.t += dt;
      if (!intro.flown && intro.t >= INTRO_HOLD) { intro.flown = true; focusForPhase('meta'); }
      else if (intro.flown && !flyAnim) { intro = null; cyc.t = 0; cycleEnter(cyc.i, { fly: false }); }
    }

    // advance the loop cycle + ease emphasis
    tAcc += dt;
    if (cyc.on && surfaces.length && !flyAnim && !intro) {  // progress runs continuously; dwell is sized to the narration
      cyc.t += dt;
      if (cyc.t >= segDur) { cyc.t = 0; cyc.i = (cyc.i + 1) % CYCLE.length; cycleEnter(cyc.i); }
    }
    player.setProgress(cyc.i, flyAnim ? 0 : cyc.t / segDur);
    for (const k of ['data', 'patch', 'loop', 'meta']) em[k] += (emT[k] - em[k]) * Math.min(1, dt * 3);

    updateArrows(dt);

    // breathing pulse on the active Loop / Meta wall
    const pulse = 0.5 + 0.5 * Math.sin(tAcc * 3.2);
    const fl = surfBy('FrontWall');
    if (fl) fl.edges.material.opacity = fl.baseEdgeOpacity + em.loop * (0.3 + 0.5 * pulse);
    const bk = surfBy('BackWall');
    if (bk) bk.edges.material.opacity = bk.baseEdgeOpacity + em.meta * (0.25 + 0.35 * pulse);

    controls.update();
  }

  // call after renderer.render(scene, camera)
  function renderGizmo() { viewHelper.render(renderer); }

  function updateMarkers() {
    for (const s of surfaces) {
      const v = s.anchor.clone().project(camera);
      const el = s.marker;
      if (v.z > 1) { el.style.display = 'none'; continue; }
      el.style.display = 'flex';
      el.style.left = `${(v.x * 0.5 + 0.5) * window.innerWidth}px`;
      el.style.top = `${(-v.y * 0.5 + 0.5) * window.innerHeight}px`;
      const dist = camera.position.distanceTo(s.anchor);
      el.style.opacity = String(Math.max(0.4, Math.min(1, 90 / dist)));
    }
  }

  function handleGizmoClick(e) { return viewHelper.handleClick(e); }
  function frameRoom() {
    if (pinned >= 0) highlight(pinned, false);
    pinned = -1;
    hideCard();
    frameAll();
  }

  return {
    scene, camera, controls,
    activate, deactivate, onResize,
    update, renderGizmo, updateMarkers, handleGizmoClick,
    frameRoom,
  };
}
