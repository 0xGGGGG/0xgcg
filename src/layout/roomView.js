import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { ViewHelper } from 'three/addons/helpers/ViewHelper.js';

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
    fragments: ['void main() {', '  while (true) {', '    grow(); corrupt();', '    glitch(); dimension++;', '  }', '}'],
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
    fragments: ['booting substrate...', 'seed: void', 'growth_rule: recursive_branching', 'corruption_threshold: 0.74', 'dimension++  // return void'],
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

  // ---- loop-cycle HUD (step chips + play/pause + caption) ------------
  const hud = document.createElement('div');
  hud.id = 'loop-hud';
  document.body.appendChild(hud);

  // ---- transient state ----------------------------------------------
  const surfaces = []; // { def, mesh, center, normal, marker, fill, edges, baseEdgeOpacity }
  let root = null;     // the scaled/centered model group
  let bounds = null;   // THREE.Box3 of the fitted model
  let flow = null;     // floor data-flow particles (rear -> front)
  let patchWave = null;// side-wall history particles (front -> rear)
  let tAcc = 0;        // time accumulator for pulses

  // ---- the loop cycle (SCRIPT §2 causal chain) ----------------------
  // Meta documents -> Data flows rear→front -> The Loop transforms ->
  // The Patch remembers (slides front→rear) -> dissolves back into Meta.
  const CYCLE = [
    { key: 'meta',   mesh: 'BackWall',  label: 'META',      sub: 'documents · the rear wall dreams the making', dur: 4.0 },
    { key: 'data',   mesh: 'Floor',     label: 'DATA',      sub: 'flows · soundtrack rear → front',             dur: 4.5 },
    { key: 'loop',   mesh: 'FrontWall', label: 'THE LOOP',  sub: 'transforms · data becomes world',             dur: 4.0 },
    { key: 'patch',  mesh: 'LeftWall',  label: 'THE PATCH', sub: 'remembers · history slides front → rear',     dur: 5.0 },
    { key: 'return', mesh: 'BackWall',  label: 'RETURN',    sub: 'patch dissolves into meta · dimension++',      dur: 3.0 },
  ];
  const cyc = { on: true, i: 0, t: 0 };
  const em = { data: 0, patch: 0, loop: 0, meta: 0 };       // eased emphasis 0..1
  const emT = { data: 0, patch: 0, loop: 0, meta: 0 };       // targets

  const surfBy = (mesh) => surfaces.find((s) => s.def.mesh === mesh);
  const clock = new THREE.Clock();

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
    buildFlow();
    buildPatchWave();
    buildHud();
    cycleEnter(cyc.i); // start the loop on Meta
    frameAll();
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
      def, mesh, center, anchor, normal,
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
    cyc.on = false; updateHud(); // manual inspection pauses the loop
    if (pinned === i) { pinned = -1; highlight(i, false); hideCard(); return; }
    if (pinned >= 0) highlight(pinned, false);
    pinned = i;
    highlight(i, true);
    showCard(surfaces[i].def);
    focusSurface(surfaces[i]);
  }

  function showCard(def) {
    card.className = `rc-${def.key}`;
    card.innerHTML = `
      <div class="rc-meta"><span>${def.tag}</span><span class="rc-key">${def.key}</span></div>
      <h4>${def.label} <small>· ${def.sub}</small></h4>
      ${def.role ? `<p class="rc-role">${def.role}</p>` : ''}
      <p class="rc-body">${def.body}</p>
      ${def.also ? `<div class="rc-also">${def.also.map((a) => `<span>${a}</span>`).join('')}</div>` : ''}
      ${def.fragments ? `<code class="rc-code">${def.fragments.join('\n')}</code>` : ''}`;
    card.classList.add('show');
  }
  function hideCard() { card.classList.remove('show'); }

  // gently fly the orbit target/camera to frame one surface
  let flyAnim = null;
  function focusSurface(s) {
    const target = s.center.clone();
    const dist = Math.max(FIT_SIZE * 0.55, 18);
    const eye = target.clone().addScaledVector(s.normal, dist).setY(target.y + FIT_SIZE * 0.18);
    flyAnim = { fromT: controls.target.clone(), toT: target, fromP: camera.position.clone(), toP: eye, t: 0 };
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

  // Floor "Data" current: faint points drifting rear -> front (Back -> Front),
  // spread laterally across the floor width — the soundtrack made visible.
  function buildFlow() {
    const back = surfaces.find((s) => s.def.mesh === 'BackWall');
    const front = surfaces.find((s) => s.def.mesh === 'FrontWall');
    const floor = surfaces.find((s) => s.def.mesh === 'Floor');
    if (!back || !front || !floor) return;
    const N = 280;
    const a = back.center.clone();
    const b = front.center.clone();
    const y = new THREE.Box3().setFromObject(floor.mesh).max.y + 0.3;
    a.y = y; b.y = y;
    // in-plane perpendicular to the rear->front axis
    const dir = b.clone().sub(a).setY(0).normalize();
    const perp = new THREE.Vector3(-dir.z, 0, dir.x);
    const floorSize = new THREE.Box3().setFromObject(floor.mesh).getSize(new THREE.Vector3());
    const halfWidth = Math.max(floorSize.x, floorSize.z) * 0.42;

    const off = new Float32Array(N);
    const lat = new Float32Array(N);
    for (let i = 0; i < N; i++) { off[i] = Math.random(); lat[i] = (Math.random() - 0.5) * 2; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const mat = new THREE.PointsMaterial({
      color: 0xbfd0ff, size: 0.55, transparent: true, opacity: 0.55,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    flow = { off, lat, a, b, perp, halfWidth, geo, mat };
  }

  function updateFlow(dt) {
    if (!flow) return;
    const p = flow.geo.attributes.position.array;
    const tmp = new THREE.Vector3();
    const sp = 0.045 + em.data * 0.11; // surges during the DATA phase
    for (let i = 0; i < flow.off.length; i++) {
      flow.off[i] = (flow.off[i] + dt * sp) % 1;
      const t = flow.off[i];
      tmp.lerpVectors(flow.a, flow.b, t)
        .addScaledVector(flow.perp, flow.lat[i] * flow.halfWidth);
      tmp.y += Math.sin(t * Math.PI) * 0.5; // gentle lift mid-room
      p[i * 3] = tmp.x; p[i * 3 + 1] = tmp.y; p[i * 3 + 2] = tmp.z;
    }
    flow.geo.attributes.position.needsUpdate = true;
    flow.mat.opacity = 0.18 + em.data * 0.6;
  }

  // The Patch "history": particles riding both side walls FRONT -> REAR,
  // i.e. the loop's output ageing from newest (front) to fossil (rear).
  function buildPatchWave() {
    const left = surfBy('LeftWall'), right = surfBy('RightWall');
    const front = surfBy('FrontWall'), back = surfBy('BackWall'), floor = surfBy('Floor');
    if (!left || !right || !front || !back || !floor) return;
    const fz = front.center.z, bz = back.center.z;
    const yFloor = new THREE.Box3().setFromObject(floor.mesh).max.y;
    const hgt = Math.min(new THREE.Box3().setFromObject(left.mesh).getSize(new THREE.Vector3()).y, 11);
    const N = 240;
    const off = new Float32Array(N), yf = new Float32Array(N), side = new Float32Array(N);
    for (let i = 0; i < N; i++) { off[i] = Math.random(); yf[i] = Math.random(); side[i] = i % 2 ? 1 : -1; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const mat = new THREE.PointsMaterial({
      color: 0xe8d48b, size: 0.5, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);
    patchWave = { off, yf, side, geo, mat, fz, bz, yFloor, hgt, lx: left.center.x, rx: right.center.x };
  }

  function updatePatchWave(dt) {
    if (!patchWave) return;
    const pw = patchWave, p = pw.geo.attributes.position.array;
    const speed = 0.04 + em.patch * 0.12;
    for (let i = 0; i < pw.off.length; i++) {
      pw.off[i] = (pw.off[i] + dt * speed) % 1;
      const t = pw.off[i];
      p[i * 3] = pw.side[i] < 0 ? pw.lx : pw.rx;          // left or right wall
      p[i * 3 + 1] = pw.yFloor + 1 + pw.yf[i] * pw.hgt;   // up the wall
      p[i * 3 + 2] = pw.fz + (pw.bz - pw.fz) * t;         // front -> rear
    }
    pw.geo.attributes.position.needsUpdate = true;
    pw.mat.opacity = 0.08 + em.patch * 0.6;
  }

  // ---- loop-cycle sequencer -----------------------------------------
  function buildHud() {
    hud.innerHTML =
      `<div class="lh-row">` +
      `<button class="lh-toggle" title="Play / pause the loop">❚❚</button>` +
      `<div class="lh-steps">${CYCLE.map((c, i) =>
        `<button class="lh-step c-${c.key}" data-i="${i}"><i></i>${c.label}</button>`).join('<span class="lh-arrow">→</span>')}</div>` +
      `</div>` +
      `<div class="lh-cap"><b></b><span></span></div>`;
    hud.querySelector('.lh-toggle').addEventListener('click', () => { cyc.on = !cyc.on; updateHud(); });
    hud.querySelectorAll('.lh-step').forEach((b) => b.addEventListener('click', () => {
      cyc.i = +b.dataset.i; cyc.t = 0; cyc.on = true; cycleEnter(cyc.i);
    }));
    updateHud();
  }

  function updateHud() {
    const tgl = hud.querySelector('.lh-toggle'); if (tgl) tgl.textContent = cyc.on ? '❚❚' : '▶';
    hud.querySelectorAll('.lh-step').forEach((b, i) => b.classList.toggle('on', i === cyc.i));
    const cap = hud.querySelector('.lh-cap');
    if (cap) { const c = CYCLE[cyc.i]; cap.querySelector('b').textContent = c.label; cap.querySelector('span').textContent = c.sub; cap.className = `lh-cap c-${c.key}`; }
  }

  function cycleEnter(i) {
    if (!surfaces.length) return;
    pinned = -1;
    const c = CYCLE[i];
    emT.data = c.key === 'data' ? 1 : 0;
    emT.patch = c.key === 'patch' ? 1 : 0;
    emT.loop = c.key === 'loop' ? 1 : 0;
    emT.meta = (c.key === 'meta' || c.key === 'return') ? 1 : 0;
    surfaces.forEach((s, k) => highlight(k, false));
    if (c.key === 'patch') {
      [surfBy('LeftWall'), surfBy('RightWall')].forEach((s) => { const k = surfaces.indexOf(s); if (k >= 0) highlight(k, true); });
    } else {
      const k = surfaces.indexOf(surfBy(c.mesh)); if (k >= 0) highlight(k, true);
    }
    const def = SURFACES.find((d) => d.mesh === (c.key === 'return' ? 'BackWall' : c.mesh));
    if (def) showCard(def);
    updateHud();
  }

  function showLoadError() {
    const el = document.getElementById('layout-loading');
    if (el) el.textContent = 'could not load room model — check assets/materials/';
  }

  // ---- public API ---------------------------------------------------
  function activate() {
    controls.enabled = true;
    markerWrap.style.display = 'block';
    hud.style.display = 'flex';
    cyc.on = true;
    if (surfaces.length) cycleEnter(cyc.i);
    onResize();
    clock.getDelta(); // reset
  }
  function deactivate() {
    controls.enabled = false;
    markerWrap.style.display = 'none';
    hud.style.display = 'none';
    hideCard();
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  function update(dt) {
    if (flyAnim) {
      flyAnim.t = Math.min(1, flyAnim.t + dt / 1.1);
      const e = flyAnim.t < 0.5 ? 2 * flyAnim.t * flyAnim.t : 1 - Math.pow(-2 * flyAnim.t + 2, 2) / 2;
      controls.target.lerpVectors(flyAnim.fromT, flyAnim.toT, e);
      camera.position.lerpVectors(flyAnim.fromP, flyAnim.toP, e);
      if (flyAnim.t >= 1) flyAnim = null;
    }
    if (viewHelper.animating) viewHelper.update(dt);

    // advance the loop cycle + ease emphasis
    tAcc += dt;
    if (cyc.on && surfaces.length && !flyAnim) {
      cyc.t += dt;
      if (cyc.t >= CYCLE[cyc.i].dur) { cyc.t = 0; cyc.i = (cyc.i + 1) % CYCLE.length; cycleEnter(cyc.i); }
    }
    for (const k of ['data', 'patch', 'loop', 'meta']) em[k] += (emT[k] - em[k]) * Math.min(1, dt * 3);

    updateFlow(dt);
    updatePatchWave(dt);

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
