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

// Surface metadata, keyed by FBX mesh name. Copy distilled from SCRIPT.md §2.
export const SURFACES = [
  {
    mesh: 'FrontWall', key: 'loop', tag: 'FRONT', label: 'The Loop',
    sub: 'Front wall',
    body:
      'The void engine — black hole, pulsar, seed, void main(). It receives ' +
      'Data and transforms it into worlds. One recurring object across the ' +
      'whole film; it pulses like a physical law, not a drop.',
    code: 'while (true) { grow(); corrupt(); glitch(); dimension++; }',
  },
  {
    mesh: 'Floor', key: 'data', tag: 'FLOOR', label: 'Data',
    sub: 'Floor',
    body:
      'The soundtrack made visible. Spectral bands flow rear → front, from ' +
      'Meta toward The Loop. The audience sits inside the signal before it ' +
      'becomes image — the causal fiction of the whole piece.',
    code: 'sub · low · mid · high · transient',
  },
  {
    mesh: 'BackWall', key: 'meta', tag: 'REAR', label: 'Meta',
    sub: 'Rear wall',
    body:
      'The process / creator / debug layer — the backdoor terminal of ' +
      'creation. Boot logs, shader snippets, Claude Code sessions, failed ' +
      'renders, TODOs. The hidden operating system behind the universe.',
    code: 'booting substrate... seed: void',
  },
  {
    mesh: 'LeftWall', key: 'patch', tag: 'SIDE · L', label: 'The Patch',
    sub: 'Left wall',
    body:
      'The memory of the loop. Arches become portals / commits / phase ' +
      'buffers. Read front-to-back as history: newest mutation near the ' +
      'front, fossilized states and source leakage toward the rear.',
    code: 'Patch 0.7 — data swarm',
  },
  {
    mesh: 'RightWall', key: 'patch', tag: 'SIDE · R', label: 'The Patch',
    sub: 'Right wall',
    body:
      'The mirror archive. Side portals replay previous, future and failed ' +
      'branches of the same story at different scales — Indra’s net: each ' +
      'jewel reflects every other.',
    code: 'commit 03f7a9 ! corruption detected',
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

  // ---- transient state ----------------------------------------------
  const surfaces = []; // { def, mesh, center, normal, marker, fill, edges, baseEdgeOpacity }
  let root = null;     // the scaled/centered model group
  let bounds = null;   // THREE.Box3 of the fitted model
  let flow = null;     // floor data-flow particles
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
    if (pinned === i) { pinned = -1; highlight(i, false); hideCard(); return; }
    if (pinned >= 0) highlight(pinned, false);
    pinned = i;
    highlight(i, true);
    showCard(surfaces[i].def);
    focusSurface(surfaces[i]);
  }

  function showCard(def) {
    card.innerHTML = `
      <div class="rc-meta"><span>${def.tag}</span><span class="rc-key">${def.key}</span></div>
      <h4>${def.label} <small>· ${def.sub}</small></h4>
      <p class="rc-body">${def.body}</p>
      <code class="rc-code">${def.code}</code>`;
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
    flow = { off, lat, a, b, perp, halfWidth, geo };
  }

  function updateFlow(dt) {
    if (!flow) return;
    const p = flow.geo.attributes.position.array;
    const tmp = new THREE.Vector3();
    for (let i = 0; i < flow.off.length; i++) {
      flow.off[i] = (flow.off[i] + dt * 0.07) % 1;
      const t = flow.off[i];
      tmp.lerpVectors(flow.a, flow.b, t)
        .addScaledVector(flow.perp, flow.lat[i] * flow.halfWidth);
      tmp.y += Math.sin(t * Math.PI) * 0.5; // gentle lift mid-room
      p[i * 3] = tmp.x; p[i * 3 + 1] = tmp.y; p[i * 3 + 2] = tmp.z;
    }
    flow.geo.attributes.position.needsUpdate = true;
  }

  function showLoadError() {
    const el = document.getElementById('layout-loading');
    if (el) el.textContent = 'could not load room model — check assets/materials/';
  }

  // ---- public API ---------------------------------------------------
  function activate() {
    controls.enabled = true;
    markerWrap.style.display = 'block';
    onResize();
    clock.getDelta(); // reset
  }
  function deactivate() {
    controls.enabled = false;
    markerWrap.style.display = 'none';
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
    updateFlow(dt);
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
