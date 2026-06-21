import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Bloom composer for the "everything glows" look. Note: WebXR draws via
// renderer.render() directly, so main.js bypasses the composer in XR.

export function buildComposer(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.3,   // strength  (subtle glow, not a wash)
    0.55,  // radius
    0.26   // threshold (only the brightest cores bloom)
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  return { composer, bloom };
}
