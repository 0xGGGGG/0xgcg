import * as THREE from 'three';

// Flies the camera between stage nodes on a gentle arc while continuously
// easing its look-target onto the destination node — so the framing never
// snaps or spins. While idle, OrbitControls takes over for free-look.

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);

export class CameraRig {
  constructor(camera, controls, stageNodes) {
    this.camera = camera;
    this.controls = controls;
    this.nodes = stageNodes;
    this.anim = null;
    this.current = -1;
    this.onArrive = () => {};
    this.onDepart = () => {};
    this._center = new THREE.Vector3(0, 0, 0);
    this._look = new THREE.Vector3();
  }

  viewpointFor(i) {
    const node = this.nodes[i].position;
    // sit a fixed distance out from the node, biased away from world center
    const out = node.clone().sub(this._center).normalize().multiplyScalar(15);
    out.y += 3;
    return node.clone().add(out);
  }

  goTo(i, duration = 2.4) {
    if (i === this.current && !this.anim) return;
    const node = this.nodes[i].position.clone();
    const from = this.camera.position.clone();
    const to = this.viewpointFor(i);

    // a single lifted midpoint -> smooth 3-point arc, no overshoot
    const dist = from.distanceTo(to);
    const mid = from.clone().lerp(to, 0.5);
    mid.y += Math.min(dist * 0.12, 3.5);
    const path = new THREE.CatmullRomCurve3([from, mid, to]);

    this.anim = {
      path,
      fromLook: this.controls.target.clone(), // what we were looking at
      toLook: node,
      t: 0,
      dur: duration,
      index: i,
    };
    this.controls.enabled = false;
    this.onDepart(i);
  }

  update(dt, time) {
    if (this.anim) {
      const a = this.anim;
      a.t = Math.min(1, a.t + dt / a.dur);
      const e = easeInOut(a.t);
      this.camera.position.copy(a.path.getPoint(e));
      // ease the focus point from old target to the node and look at it
      this._look.copy(a.fromLook).lerp(a.toLook, smoother(a.t));
      this.camera.lookAt(this._look);
      if (a.t >= 1) {
        this.current = a.index;
        this.controls.target.copy(a.toLook);
        this.controls.enabled = true;
        this.controls.update();
        const idx = a.index;
        this.anim = null;
        this.onArrive(idx);
      }
    } else if (this.controls.enabled) {
      // subtle idle breathing drift around the target
      this.camera.position.x += Math.sin(time * 0.3) * 0.1 * dt;
      this.camera.position.y += Math.cos(time * 0.23) * 0.1 * dt;
      this.controls.update();
    }
  }
}
