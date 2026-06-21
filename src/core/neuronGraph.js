import * as THREE from 'three';
import { STAGES } from '../config/stages.js';

// Builds the neuron network: 5 stage "soma" nodes + scattered dendrite
// nodes, connected by organic CatmullRom curves. Curves are baked into a
// float DataTexture so particles can flow along them entirely on the GPU.
//
// Returns:
//   group          THREE.Group to add to the scene
//   stageNodes     [{ position, mesh, stage }]  (the 5 navigable nodes)
//   curveTexture   DataTexture (SAMPLES wide, curves.length tall) of xyz
//   curveCount     number of curves baked
//   sampleCount    samples per curve
//   curveColors    [THREE.Color] one per curve (for particle tint)

const SAMPLES = 128;

// Black & white universe: pure white base, varied only by brightness per
// stage so the acts read as a progression. No hue -> bloom stays white.
const MONO = new THREE.Color('#ffffff');
const STAGE_INTENSITY = [0.5, 0.72, 0.64, 0.92, 0.78];
function monoForStage(i) {
  return MONO.clone().multiplyScalar(STAGE_INTENSITY[i] ?? 0.7);
}

// 1x1 black fallback so the video sampler is always valid before a clip loads
const BLACK_TEX = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
BLACK_TEX.needsUpdate = true;

function rand(seed) {
  // deterministic pseudo-random so layout is stable across reloads
  let s = Math.sin(seed * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

export function buildNeuronGraph() {
  const group = new THREE.Group();
  const stagePositions = STAGES.map((s) => new THREE.Vector3(...s.pos));

  // ---- stage soma nodes ----------------------------------------------
  const stageNodes = STAGES.map((stage, i) => {
    const color = monoForStage(i);
    const mesh = makeSoma(color);
    mesh.position.copy(stagePositions[i]);
    mesh.userData.stage = stage;
    group.add(mesh);
    return { position: stagePositions[i], mesh, stage };
  });

  // ---- node cloud (the physarum "medium") ----------------------------
  // Nodes flow ALONG the spine between stage anchors (so the network has
  // narrative direction) plus some volumetric scatter. The stage somas are
  // included as graph nodes so tendrils actually reach the navigable acts.
  const nodes = stagePositions.map((p, i) => ({ pos: p.clone(), stageIndex: i, soma: true }));

  // medium nodes seeded along each spine segment, jittered laterally
  let seed = 0;
  for (let i = 0; i < stagePositions.length; i++) {
    const a = stagePositions[i];
    const b = stagePositions[(i + 1) % stagePositions.length];
    const perSeg = 8;
    for (let k = 1; k <= perSeg; k++) {
      const t = (k - 0.5) / perSeg;
      const base = a.clone().lerp(b, t);
      const lateral = new THREE.Vector3(rand(seed++) - 0.5, rand(seed++) - 0.5, rand(seed++) - 0.5)
        .normalize().multiplyScalar(4 + rand(seed++) * 9);
      nodes.push({ pos: base.add(lateral), stageIndex: i, soma: false });
    }
  }
  // a little free-floating volumetric scatter
  for (let k = 0; k < 14; k++) {
    const si = k % stagePositions.length;
    const p = new THREE.Vector3(
      (rand(seed++) - 0.5) * 78,
      (rand(seed++) - 0.5) * 40,
      (rand(seed++) - 0.5) * 78
    );
    nodes.push({ pos: p, stageIndex: si, soma: false });
  }

  // draw the medium nodes as small dendrite dots
  nodes.forEach((n) => {
    if (n.soma) return;
    const mesh = makeDendrite(monoForStage(n.stageIndex).multiplyScalar(0.7), 0.18 + rand(seed++) * 0.3);
    mesh.position.copy(n.pos);
    group.add(mesh);
  });

  // ---- proximity graph (Voronoi/Delaunay dual) -----------------------
  // Connect each node to its k nearest neighbours -> a cellular mesh. This
  // is the dual of a Voronoi tessellation: edges link adjacent "cells".
  const K = 3;
  const MAX_LEN = 30;
  const edgeSet = new Set();
  const edges = [];
  const addEdge = (i, j) => {
    if (i === j) return;
    const key = i < j ? `${i}_${j}` : `${j}_${i}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push([i, j]);
  };
  for (let i = 0; i < nodes.length; i++) {
    const d = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      d.push([j, nodes[i].pos.distanceTo(nodes[j].pos)]);
    }
    d.sort((p, q) => p[1] - q[1]);
    addEdge(i, d[0][0]); // always keep nearest (no orphans)
    for (let n = 1; n < K && n < d.length; n++) {
      if (d[n][1] <= MAX_LEN) addEdge(i, d[n][0]);
    }
  }
  // guarantee the narrative loop is threaded stage -> stage
  for (let i = 0; i < stagePositions.length; i++) addEdge(i, (i + 1) % stagePositions.length);

  // ---- physarum tendrils: meandering curves per edge -----------------
  const curves = [];
  const curveColors = [];
  let branchSeed = 1000;
  edges.forEach(([i, j], idx) => {
    const a = nodes[i].pos;
    const b = nodes[j].pos;
    const spine = nodes[i].soma && nodes[j].soma; // narrative backbone
    const curve = physarumTendril(a, b);
    curves.push(curve);
    const si = Math.min(nodes[i].stageIndex, nodes[j].stageIndex);
    curveColors.push(monoForStage(si).multiplyScalar(spine ? 1.0 : 0.7));
    group.add(makeCurveLine(curve, monoForStage(si), spine ? 0.2 : 0.08));

    // physarum foraging: sprout short offshoots that wander off and
    // dead-end (the characteristic slime-mold exploratory veins).
    const nBranch = rand(idx * 3.1 + 5) < 0.55 ? (rand(idx * 7.7) < 0.3 ? 2 : 1) : 0;
    for (let bk = 0; bk < nBranch; bk++) {
      const t = 0.3 + rand(branchSeed++) * 0.4;
      const origin = curve.getPoint(t);
      const tan = curve.getTangent(t);
      const off = growOffshoot(origin, tan, branchSeed++);
      curves.push(off.curve);
      curveColors.push(monoForStage(si).multiplyScalar(0.45));
      group.add(makeCurveLine(off.curve, monoForStage(si), 0.06));
      // faint growing tip
      const tip = makeDendrite(monoForStage(si).multiplyScalar(0.5), 0.13);
      tip.position.copy(off.tip);
      group.add(tip);
    }
  });

  // ---- bake curves into a float texture ------------------------------
  const curveTexture = bakeCurves(curves);

  return { group, stageNodes, curveTexture, curveCount: curves.length, sampleCount: SAMPLES, curveColors };
}

// A physarum-style tendril between two points: walk the straight segment
// and displace interior points with deterministic 3D value noise so the
// path meanders and wanders like a slime-mold transport vein.
function physarumTendril(a, b) {
  const L = a.distanceTo(b);
  const n = Math.max(2, Math.min(8, Math.round(L / 4)));
  const amp = Math.min(L * 0.28, 7);
  const pts = [a.clone()];
  for (let s = 1; s < n; s++) {
    const t = s / n;
    const p = a.clone().lerp(b, t);
    // taper displacement toward the endpoints so tendrils anchor cleanly
    const taper = Math.sin(t * Math.PI);
    p.add(noiseVec(p, 0.08, 0.0).multiplyScalar(amp * taper));
    pts.push(p);
  }
  pts.push(b.clone());
  return new THREE.CatmullRomCurve3(pts);
}

// A foraging offshoot: an agent starts at `origin` heading roughly along
// the parent tangent, then turns its heading by noise each step while the
// step length shrinks — so it wanders out and dies at a tip (dead-end).
function growOffshoot(origin, tangent, seedBase) {
  const steps = 4 + Math.floor(rand(seedBase) * 4); // 4..7
  let dir = tangent.clone().normalize();
  // kick off at an angle to the parent vein
  dir.add(new THREE.Vector3(rand(seedBase + 1) - 0.5, rand(seedBase + 2) - 0.5, rand(seedBase + 3) - 0.5))
    .normalize();
  const pts = [origin.clone()];
  let p = origin.clone();
  for (let s = 1; s <= steps; s++) {
    dir.add(noiseVec(p, 0.13, seedBase * 1.7).multiplyScalar(0.85)).normalize();
    const stepLen = 2.6 * (1 - s / (steps + 2)); // taper to a stop
    p = p.clone().addScaledVector(dir, stepLen);
    pts.push(p.clone());
  }
  return { curve: new THREE.CatmullRomCurve3(pts), tip: p.clone() };
}

// ---- deterministic 3D value noise ------------------------------------
function hash3(x, y, z) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return h - Math.floor(h);
}
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const c = (i, j, k) => hash3(xi + i, yi + j, zi + k);
  const x00 = c(0, 0, 0) * (1 - u) + c(1, 0, 0) * u;
  const x10 = c(0, 1, 0) * (1 - u) + c(1, 1, 0) * u;
  const x01 = c(0, 0, 1) * (1 - u) + c(1, 0, 1) * u;
  const x11 = c(0, 1, 1) * (1 - u) + c(1, 1, 1) * u;
  const y0 = x00 * (1 - v) + x10 * v;
  const y1 = x01 * (1 - v) + x11 * v;
  return (y0 * (1 - w) + y1 * w) * 2 - 1; // -1..1
}
function noiseVec(p, freq, off) {
  return new THREE.Vector3(
    vnoise(p.x * freq + off, p.y * freq, p.z * freq),
    vnoise(p.x * freq, p.y * freq + off + 11.3, p.z * freq),
    vnoise(p.x * freq, p.y * freq, p.z * freq + off + 27.7)
  );
}

function bakeCurves(curves) {
  const w = SAMPLES;
  const h = curves.length;
  const data = new Float32Array(w * h * 4);
  for (let c = 0; c < h; c++) {
    const pts = curves[c].getSpacedPoints(SAMPLES - 1);
    for (let s = 0; s < w; s++) {
      const p = pts[s];
      const o = (c * w + s) * 4;
      data[o] = p.x;
      data[o + 1] = p.y;
      data[o + 2] = p.z;
      data[o + 3] = 1;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

// ---- meshes -----------------------------------------------------------

function makeSoma(color) {
  const geo = new THREE.SphereGeometry(2.6, 64, 64);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color },
      uTime: { value: 0 },
      uActive: { value: 0 },
      uHover: { value: 0 },
      uVideo: { value: BLACK_TEX },
      uHasVideo: { value: 0 },
    },
    transparent: false,
    depthWrite: true,
    vertexShader: /* glsl */ `
      varying vec3 vLocal; varying vec3 vNrm; varying vec3 vView;
      void main(){
        vLocal = position;
        vNrm = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vLocal; varying vec3 vNrm; varying vec3 vView;
      uniform vec3 uColor; uniform float uActive; uniform float uTime; uniform float uHover;
      uniform sampler2D uVideo; uniform float uHasVideo;

      float hash(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0;
        return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float vnoise(vec3 x){
        vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                       mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                       mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
      float fbm(vec3 p){ float a=0.5,s=0.0; for(int i=0;i<5;i++){ s+=a*vnoise(p); p*=2.02; a*=0.5;} return s; }

      void main(){
        float fres = pow(1.0 - max(dot(vNrm, vView), 0.0), 1.5);

        // accretion swirl: differential rotation about the local spin axis
        vec3 nd = normalize(vLocal);
        float r = length(nd.xy) + 1e-4;
        float ang = atan(nd.y, nd.x) + uTime*0.35 + (0.7 - r)*2.5;
        vec3 sp = vec3(cos(ang)*r, sin(ang)*r, nd.z);

        // domain-warped fluid noise
        vec3 q = sp*2.3 + vec3(0.0, 0.0, uTime*0.05);
        float w = fbm(q + vec3(fbm(q*0.8))*1.3);
        float fluid = smoothstep(0.38, 0.95, w);

        float rim  = pow(fres, 2.2);             // photon-ring edge
        float disk = smoothstep(0.05, 0.75, fres); // dark "hole" toward center
        float emit = rim*1.0 + fluid*disk*1.1;
        emit *= 0.85 + 0.3*sin(uTime*1.2 + nd.z*3.0);
        emit *= 1.0 + uActive*1.0 + uHover*0.8;

        // video accretion: warp the footage into the swirl, on hover only.
        // sampled in the same polar/noise field as the fluid -> the clip
        // dissolves into the spiral. Desaturated to keep the B&W palette.
        const float PI = 3.14159265;
        float ang2 = atan(nd.y, nd.x) + uTime*0.35 + (0.7 - r)*2.5;
        float rad2 = acos(clamp(nd.z, -1.0, 1.0)) / PI;
        vec2 vuv = vec2(ang2/(2.0*PI), rad2) + (w - 0.5)*0.12;
        float vlum = dot(texture2D(uVideo, fract(vuv)).rgb, vec3(0.299, 0.587, 0.114));
        emit += vlum * disk * uHover * uHasVideo * 1.6;

        // opaque black fluid: dark core stays solid (alpha 1), glow on top
        vec3 col = uColor * emit;
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.FrontSide,
  });
  return new THREE.Mesh(geo, mat);
}

function makeDendrite(color, size) {
  const geo = new THREE.SphereGeometry(size, 12, 12);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}

function makeCurveLine(curve, color, opacity = 0.16) {
  const pts = curve.getSpacedPoints(64);
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return new THREE.Line(geo, mat);
}
