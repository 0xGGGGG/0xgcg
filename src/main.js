import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

import { STAGES } from './config/stages.js';
import { buildNeuronGraph } from './core/neuronGraph.js';
import { buildParticles } from './core/particles.js';
import { CameraRig } from './core/cameraRig.js';
import { buildComposer } from './core/postfx.js';
import { buildMoodPlanes, loadModels } from './core/assets.js';
import { Overlay } from './ui/overlay.js';
import { Portal } from './ui/portal.js';
import { Markers } from './ui/markers.js';
import { createRoomView } from './layout/roomView.js';
import { CosmicAddress, initHeaderAddress } from './ui/cosmicAddress.js';
import { Intro } from './ui/intro.js';

const app = document.getElementById('app');

// ---- renderer / scene / camera ---------------------------------------
// preserveDrawingBuffer lets us grab canvas snapshots (toDataURL) for the
// Meta wall / documentation captures; negligible cost for a storyboard tool.
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.xr.enabled = true;
app.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.02);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(-34, 6, 40);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 4;
controls.maxDistance = 120;

// ---- world ------------------------------------------------------------
const graph = buildNeuronGraph();
scene.add(graph.group);

const particles = buildParticles({
  curveTexture: graph.curveTexture,
  curveCount: graph.curveCount,
  curveColors: graph.curveColors,
  perCurve: 300,
});
scene.add(particles.points);

scene.add(buildMoodPlanes(graph.stageNodes));
loadModels(scene);

// ambient dust field
scene.add(buildDust());

// soft fill light (mood planes use unlit materials, but models may not)
scene.add(new THREE.AmbientLight(0x181818, 1.0));

const { composer, bloom } = buildComposer(renderer, scene, camera);

// ---- camera rig + overlay --------------------------------------------
const rig = new CameraRig(camera, controls, graph.stageNodes);

let auto = false;
let autoTimer = 0;
const DWELL = 13; // seconds parked at a node in auto mode

const overlay = new Overlay(document.getElementById('ui'), {
  onPrev: () => go((active - 1 + STAGES.length) % STAGES.length),
  onNext: () => go((active + 1) % STAGES.length),
  onToggleAuto: () => setAuto(!auto),
  onJump: (i) => go(i),
});

let active = 0;
rig.onDepart = () => overlay.hide();
rig.onArrive = (i) => {
  active = i;
  overlay.show(i);
};

function go(i) {
  active = i;
  rig.goTo(i);
}
function setAuto(on) {
  auto = on;
  autoTimer = 0;
  overlay.setAuto(on);
}

// ---- view mode: 'core' (neuron storyboard) | 'layout' (room plan) ----
let mode = 'core';
let room = null;  // lazily created RoomView (loads the FBX on first open)
let intro = null; // the §1 title page (index)
const navBtns = [...document.querySelectorAll('#view-nav button')];

// path <-> mode routing.  / -> intro (title) , /core -> core , /layout -> layout
const pathToMode = (p) => {
  const x = p.replace(/\/+$/, '');
  if (x === '/layout') return 'layout';
  if (x === '/core') return 'core';
  return 'intro';
};

// Reset the Core view to its original opening framing (intro glide to GENESIS).
function resetCore() {
  setAuto(false);
  active = 0;
  camera.position.set(-34, 10, 46);
  rig.current = -1;        // force the rig to re-fly even if already at stage 0
  rig.goTo(0, 4.5);
}

// `push`  — write the URL (skip on initial load / popstate)
// `reset` — re-home the viewpoint (every trigger resets, even same-view clicks)
function setMode(m, { push = true, reset = true } = {}) {
  mode = m;
  document.body.classList.toggle('mode-layout', m === 'layout');
  document.body.classList.toggle('mode-intro', m === 'intro');
  navBtns.forEach((b) => b.classList.toggle('on', b.dataset.view === m));
  if (m === 'intro') {
    setAuto(false);
    controls.enabled = false;
    if (room) room.deactivate();
    if (intro) intro.show();
  } else if (m === 'layout') {
    if (intro) intro.hide();
    setAuto(false);
    controls.enabled = false;
    if (!room) room = createRoomView(renderer);
    room.activate();
    if (reset) room.frameRoom(); // no-op until the FBX has loaded, then re-homes
  } else { // core
    if (intro) intro.hide();
    if (room) room.deactivate();
    controls.enabled = true;
    if (reset) resetCore();
  }
  if (push) {
    const path = m === 'layout' ? '/layout' : m === 'core' ? '/core' : '/';
    if (location.pathname !== path) history.pushState({ mode: m }, '', path);
  }
}
navBtns.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.view)));
document.getElementById('layout-frame').addEventListener('click', () => room && room.frameRoom());
// browser back / forward
addEventListener('popstate', () => setMode(pathToMode(location.pathname), { push: false }));

// ---- cosmic address (header trigger + `A` key) -----------------------
initHeaderAddress();
const cosmos = new CosmicAddress();
document.getElementById('addr-trigger').addEventListener('click', () => cosmos.toggle());

// ---- intro / title page (the index `/`) ------------------------------
intro = new Intro({ onEnter: (m) => setMode(m) });
// clicking the top-left 0xGCG brand returns to the index (replays the boot)
document.querySelector('#topbar .brand').addEventListener('click', () => setMode('intro'));

// ---- raycast: click to fly, hover to open the storyteller portal -----
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
const orbMeshes = graph.stageNodes.map((n) => n.mesh);
const portal = new Portal();
const markers = new Markers(graph.stageNodes, {
  onClick: (i) => { setAuto(false); go(i); },
  onHover: (i) => portal.show(i),     // info card opens on MARKER hover
  onLeave: () => portal.scheduleHide(),
});
let hovered = -1;                      // orb currently under the cursor (video/glow)

// ---- lazy video accretion textures (assets/<id>.mp4) -----------------
const videos = [];
function ensureVideo(i) {
  if (videos[i]) return videos[i];
  const stage = graph.stageNodes[i].stage;
  const u = graph.stageNodes[i].mesh.material.uniforms;
  const v = document.createElement('video');
  v.src = stage.clip || `assets/${stage.id}.mp4`;
  v.loop = true; v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
  const tex = new THREE.VideoTexture(v);
  tex.colorSpace = THREE.SRGBColorSpace;
  v.addEventListener('loadeddata', () => { u.uVideo.value = tex; u.uHasVideo.value = 1; });
  v.addEventListener('error', () => { u.uHasVideo.value = 0; }); // graceful: fluid only
  videos[i] = { v, tex };
  return videos[i];
}
function playVideo(i) { ensureVideo(i).v.play().catch(() => {}); }
function pauseVideo(i) { if (videos[i]) videos[i].v.pause(); }

function pick(e) {
  ptr.x = (e.clientX / window.innerWidth) * 2 - 1;
  ptr.y = -(e.clientY / window.innerHeight) * 2 + 1;
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects(orbMeshes);
  return hits.length ? graph.stageNodes.findIndex((n) => n.mesh === hits[0].object) : -1;
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (mode !== 'core') return;
  const i = pick(e);
  if (i >= 0) { setAuto(false); go(i); }
});

// gizmo axis snap (Layout) — ViewHelper consumes clicks in its corner
renderer.domElement.addEventListener('pointerup', (e) => {
  if (mode === 'layout' && room) room.handleGizmoClick(e);
});

renderer.domElement.addEventListener('pointermove', (e) => {
  if (mode !== 'core') {
    renderer.domElement.style.cursor = 'grab';
    return;
  }
  const i = pick(e);
  if (i >= 0) {
    if (i !== hovered) {
      if (hovered >= 0) pauseVideo(hovered);
      hovered = i;
      playVideo(i); // orb hover plays its video; the info card is marker-driven
    }
    renderer.domElement.style.cursor = 'pointer';
  } else {
    if (hovered >= 0) pauseVideo(hovered);
    hovered = -1;
    renderer.domElement.style.cursor = 'grab';
  }
});

// ---- keyboard ---------------------------------------------------------
addEventListener('keydown', (e) => {
  if (mode === 'intro') {
    if (e.key === 'Enter' || e.key === 'c') { setMode('core'); return; }
    if (e.key === 'l') { setMode('layout'); return; }
    return; // intro owns the keyboard until a door is chosen
  }
  if (e.key === 'Escape') { cosmos.hide(); return; }
  if (e.key.toLowerCase() === 'a') { cosmos.toggle(); return; }
  if (cosmos.visible && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    e.preventDefault();
    cosmos.goto(cosmos.focus + (e.key === 'ArrowUp' ? 1 : -1));
    return;
  }
  if (e.key.toLowerCase() === 'h') { document.getElementById('ui').classList.toggle('hidden'); return; }
  if (e.key === 'c') { setMode('core'); return; }
  if (e.key === 'l') { setMode('layout'); return; }
  if (mode !== 'core') return;
  if (e.key === 'ArrowRight') { setAuto(false); go((active + 1) % STAGES.length); }
  else if (e.key === 'ArrowLeft') { setAuto(false); go((active - 1 + STAGES.length) % STAGES.length); }
  else if (e.key === ' ') { e.preventDefault(); setAuto(!auto); }
  else if (e.key >= '1' && e.key <= '5') { setAuto(false); go(parseInt(e.key, 10) - 1); }
});

addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  if (room) room.onResize();
});

// ---- monochrome grade ------------------------------------------------
// Pitch-black universe, no hue shift. Only a subtle bloom modulation so
// GLITCH reads as a touch hotter without burning to white.
function applyGrade(dt) {
  const s = STAGES[active];
  const targetBloom = s.phase === 'GLITCH' ? 0.5 : s.phase === 'CORRUPT' ? 0.38 : 0.3;
  bloom.strength += (targetBloom - bloom.strength) * dt * 1.5;
}

// glitch amount (0..1) for the particle shader, driven by active phase
let glitch = 0;
function updateGlitch(dt) {
  const target = STAGES[active].phase === 'GLITCH' ? 1 : 0;
  glitch += (target - glitch) * dt * 1.5;
}

// pulse the active node + react to hover
function updateNodes(t) {
  graph.stageNodes.forEach((n, i) => {
    const u = n.mesh.material.uniforms;
    if (u) {
      u.uTime.value = t;
      const a = i === active ? 1 : 0;
      u.uActive.value += (a - u.uActive.value) * 0.08;
      const h = (i === hovered || i === portal.index) ? 1 : 0;
      u.uHover.value += (h - u.uHover.value) * 0.12;
    }
  });
}

// ---- loop -------------------------------------------------------------
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // ---- Intro mode: the title page is pure DOM; blank the canvas behind it
  if (mode === 'intro') {
    renderer.setRenderTarget(null);
    renderer.autoClear = true;
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    return;
  }

  // ---- Layout mode: render the room plan + gizmo, skip the Core world ----
  if (mode === 'layout') {
    if (room) {
      room.update(dt);
      // Clear ONCE manually, then keep autoClear off — otherwise the gizmo's
      // internal render would glClear the whole color buffer (no scissor) and
      // wipe the room, leaving only the corner gizmo.
      renderer.setRenderTarget(null);
      renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
      renderer.autoClear = false;
      renderer.clear();
      renderer.render(room.scene, room.camera);
      room.renderGizmo();
      room.updateMarkers();
    }
    return;
  }

  if (auto) {
    autoTimer += dt;
    if (!rig.anim && autoTimer > DWELL) {
      autoTimer = 0;
      go((active + 1) % STAGES.length);
    }
  }

  rig.update(dt, t);
  updateNodes(t);
  updateGlitch(dt);
  applyGrade(dt);
  particles.update(t, glitch);

  // keep the storyteller portal anchored to its orb
  if (portal.visible && portal.index >= 0) {
    portal.updatePosition(graph.stageNodes[portal.index].position, camera);
  }
  markers.update(camera, active);

  if (renderer.xr.isPresenting) {
    renderer.render(scene, camera); // composer/bloom bypassed in XR
  } else {
    composer.render();
  }
}
renderer.setAnimationLoop(frame);

// ---- boot: pick the view from the URL (/, /core -> core ; /layout -> layout)
overlay.setAuto(false);
setMode(pathToMode(location.pathname), { push: false });

// ---- helpers ----------------------------------------------------------
function buildDust() {
  const N = 1400;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 160;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 90;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 160;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x3a3a3a,
    size: 0.16,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}
