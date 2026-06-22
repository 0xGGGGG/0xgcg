import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Oriented arrow fields that live ON a wall's plane, one per surface, each with
// its own motion (SCRIPT §2 causal chain made directional):
//   meta  → arrows wander randomly
//   data  → arrows flow rear → front (meta → loop) across the floor
//   loop  → arrows whirl like a pulsar; a few escape to the left/right edges
//   patch → arrows run loop → meta: a main stream threading the 7 arches
//           (n-1…n-7) + subtle local arrows circling inside each arch
// Each field fades with its phase emphasis (visible on the focused wall).
// ---------------------------------------------------------------------------

const ARCHES = 7;

function arrowGeometry() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0.62, 0, 0, -0.42, 0.36, 0, -0.42, -0.36, 0,
  ]), 3));
  g.computeVertexNormals();
  return g;
}

// in-plane basis (uAxis, vAxis) + half-extents for a surface
function basisFor(surf) {
  const n = surf.normal.clone().normalize();
  const sz = surf.size;
  const ax = Math.abs(n.x) > Math.abs(n.y) && Math.abs(n.x) > Math.abs(n.z) ? 'x'
    : (Math.abs(n.y) > Math.abs(n.z) ? 'y' : 'z');
  let uAxis, vAxis, halfU, halfV;
  if (ax === 'z') { uAxis = new THREE.Vector3(1, 0, 0); vAxis = new THREE.Vector3(0, 1, 0); halfU = sz.x / 2; halfV = sz.y / 2; }
  else if (ax === 'x') { uAxis = new THREE.Vector3(0, 0, 1); vAxis = new THREE.Vector3(0, 1, 0); halfU = sz.z / 2; halfV = sz.y / 2; }
  else { uAxis = new THREE.Vector3(1, 0, 0); vAxis = new THREE.Vector3(0, 0, 1); halfU = sz.x / 2; halfV = sz.z / 2; }
  return { n, uAxis, vAxis, halfU, halfV };
}

export function createArrowField(scene, surf, opts) {
  const { mode, color, count = 90, dirSign = 1 } = opts;
  const { n, uAxis, vAxis, halfU, halfV } = basisFor(surf);
  const origin = surf.center.clone().addScaledVector(n, 0.6);

  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(arrowGeometry(), mat, count);
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  scene.add(mesh);

  const base = new THREE.Color(color);
  const A = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const archU = (k) => -1 + (k + 0.5) / ARCHES * 2;

  for (let i = 0; i < count; i++) {
    const a = { bright: 0.7, size: rnd(0.5, 0.85), h: 0 };
    if (mode === 'random') {
      a.u = rnd(-0.9, 0.9); a.v = rnd(-0.9, 0.9); a.h = rnd(0, Math.PI * 2);
      a.turn = rnd(-0.8, 0.8); a.speed = rnd(0.10, 0.22); a.bright = rnd(0.4, 0.8);
    } else if (mode === 'flow') {
      a.u = rnd(-0.95, 0.95); a.v = rnd(-1, 1); a.speed = rnd(0.18, 0.34);
      a.h = dirSign > 0 ? Math.PI / 2 : -Math.PI / 2; a.bright = rnd(0.5, 0.9);
    } else if (mode === 'whirl') {
      a.r0 = rnd(0.18, 0.92); a.a = rnd(0, Math.PI * 2); a.om = (Math.random() < 0.5 ? 1 : -1) * rnd(0.4, 0.8);
      a.esc = 0; a.bright = rnd(0.5, 0.85);
    } else if (mode === 'patch') {
      if (i < count * 0.4) { // main stream, loop -> meta along the wall
        a.kind = 'main'; a.u = rnd(-1, 1); a.v = rnd(-0.18, 0.18); a.speed = rnd(0.16, 0.30);
        a.h = dirSign > 0 ? 0 : Math.PI; a.bright = rnd(0.55, 0.9); a.size = rnd(0.55, 0.85);
      } else { // subtle local circles inside an arch
        a.kind = 'local'; a.arch = i % ARCHES; a.la = rnd(0, Math.PI * 2); a.lr = rnd(0.05, 0.12);
        a.lom = (Math.random() < 0.5 ? 1 : -1) * rnd(0.8, 1.6); a.bright = rnd(0.12, 0.3); a.size = rnd(0.28, 0.42);
      }
    }
    A.push(a);
  }

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3();
  const scl = new THREE.Vector3(), rot = new THREE.Matrix4(), dir = new THREE.Vector3(), up = new THREE.Vector3();
  const col = new THREE.Color();

  function step(a, dt, time) {
    if (mode === 'random') {
      if (Math.random() < 0.02) a.turn = rnd(-0.9, 0.9);
      a.h += a.turn * dt;
      a.u += Math.cos(a.h) * a.speed * dt; a.v += Math.sin(a.h) * a.speed * dt;
      if (a.u > 0.95 || a.u < -0.95) { a.h = Math.PI - a.h; a.u = Math.max(-0.95, Math.min(0.95, a.u)); }
      if (a.v > 0.95 || a.v < -0.95) { a.h = -a.h; a.v = Math.max(-0.95, Math.min(0.95, a.v)); }
    } else if (mode === 'flow') {
      a.v += dirSign * a.speed * dt;
      if (a.v > 1) a.v = -1; else if (a.v < -1) a.v = 1;
      a.u += Math.sin(time * 0.5 + a.v * 6) * 0.04 * dt;
    } else if (mode === 'whirl') {
      if (a.esc > 0) {
        a.u += Math.cos(a.h) * 0.9 * dt; a.v += Math.sin(a.h) * 0.25 * dt;
        a.bright *= (1 - dt * 0.6);
        if (Math.abs(a.u) > 1.05 || a.bright < 0.05) { a.r0 = rnd(0.18, 0.7); a.a = rnd(0, Math.PI * 2); a.esc = 0; a.bright = rnd(0.5, 0.85); }
      } else {
        a.a += a.om * dt * (0.8 + 0.4 * Math.sin(time * 1.1));
        const r = a.r0 * (0.85 + 0.15 * Math.sin(time * 1.2 + a.a));
        a.u = Math.cos(a.a) * r; a.v = Math.sin(a.a) * r;
        a.h = a.a + (a.om > 0 ? Math.PI / 2 : -Math.PI / 2);
        if (Math.random() < 0.0016) { a.esc = 1; a.h = a.u >= 0 ? 0 : Math.PI; } // escape to a side edge
      }
    } else if (mode === 'patch') {
      if (a.kind === 'main') {
        a.u += dirSign * a.speed * dt;
        if (a.u > 1) a.u = -1; else if (a.u < -1) a.u = 1;
        a.v = 0.04 * Math.sin(a.u * Math.PI * ARCHES); // dip through the arches
      } else {
        a.la += a.lom * dt;
        a.u = archU(a.arch) + Math.cos(a.la) * a.lr;
        a.v = -0.02 + Math.sin(a.la) * a.lr * 1.4;
        a.h = a.la + (a.lom > 0 ? Math.PI / 2 : -Math.PI / 2);
      }
    }
  }

  function update(dt, time, gain) {
    for (let i = 0; i < A.length; i++) {
      const a = A[i];
      step(a, dt, time);
      if (mode === 'flow' || mode === 'patch' && a.kind === 'main') {
        // heading already fixed; keep
      }
      pos.copy(origin).addScaledVector(uAxis, a.u * halfU).addScaledVector(vAxis, a.v * halfV);
      dir.copy(uAxis).multiplyScalar(Math.cos(a.h)).addScaledVector(vAxis, Math.sin(a.h)).normalize();
      up.crossVectors(n, dir).normalize();
      rot.makeBasis(dir, up, n);
      q.setFromRotationMatrix(rot);
      scl.setScalar(a.size);
      m.compose(pos, q, scl);
      mesh.setMatrixAt(i, m);
      col.copy(base).multiplyScalar(Math.max(0, a.bright * gain));
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.visible = gain > 0.01;
  }

  return { mesh, update };
}
