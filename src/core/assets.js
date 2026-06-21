import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { STAGES, MODELS } from '../config/stages.js';

// Mood-board image planes that float around each stage node (so they read
// in VR too), plus optional OBJ/FBX model loading. Missing images fall
// back to a generated, on-theme placeholder canvas so the scene is never
// empty.

export function buildMoodPlanes(stageNodes) {
  const group = new THREE.Group();
  const loader = new THREE.TextureLoader();

  stageNodes.forEach(({ position, stage }) => {
    const imgs = stage.images || [];
    const count = Math.max(3, imgs.length);
    for (let k = 0; k < count; k++) {
      const angle = (k / count) * Math.PI * 2 + stage.index;
      const radius = 6.5;
      const pos = position.clone().add(
        new THREE.Vector3(Math.cos(angle) * radius, (k - count / 2) * 1.6, Math.sin(angle) * radius)
      );

      const tex = placeholderTexture(stage, k);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.82,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.6), mat);
      plane.position.copy(pos);
      plane.lookAt(position);
      group.add(plane);

      // try to upgrade to a real image if present
      const url = imgs[k];
      if (url) {
        loader.load(
          url,
          (real) => {
            real.colorSpace = THREE.SRGBColorSpace;
            mat.map = real;
            mat.needsUpdate = true;
          },
          undefined,
          () => {} // keep placeholder on error
        );
      }
    }
  });

  return group;
}

function placeholderTexture(stage, k) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 320;
  const g = c.getContext('2d');

  const grad = g.createLinearGradient(0, 0, 512, 320);
  grad.addColorStop(0, '#000000');
  grad.addColorStop(1, '#222222');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 320);

  // glitchy monochrome scanlines / blocks
  g.globalAlpha = 0.5;
  for (let i = 0; i < 60; i++) {
    g.fillStyle = i % 3 === 0 ? '#6e6e6e' : '#373737';
    const y = (i * 53 + k * 31) % 320;
    g.fillRect((i * 91) % 512, y, 30 + (i % 5) * 18, 2 + (i % 4));
  }
  g.globalAlpha = 1;

  g.fillStyle = '#cccccc';
  g.font = 'bold 40px monospace';
  g.fillText(stage.title, 26, 70);
  g.fillStyle = '#808080';
  g.font = '20px monospace';
  g.fillText(stage.subtitle, 26, 100);
  g.fillStyle = 'rgba(210,210,210,0.5)';
  g.font = '15px monospace';
  g.fillText((stage.layers[k % stage.layers.length] || '').toUpperCase(), 26, 290);
  g.strokeStyle = '#3c3c3c';
  g.lineWidth = 4;
  g.strokeRect(6, 6, 500, 308);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function loadModels(scene) {
  if (!MODELS.length) return;
  const obj = new OBJLoader();
  const fbx = new FBXLoader();
  MODELS.forEach((m) => {
    const place = (o) => {
      if (m.pos) o.position.set(...m.pos);
      if (m.scale) o.scale.setScalar(m.scale);
      scene.add(o);
    };
    try {
      if (m.type === 'fbx') fbx.load(m.url, place, undefined, () => console.warn('FBX failed:', m.url));
      else obj.load(m.url, place, undefined, () => console.warn('OBJ failed:', m.url));
    } catch (e) {
      console.warn('model load error', e);
    }
  });
}
