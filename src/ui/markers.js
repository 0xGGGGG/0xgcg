// Billboard HUD markers for the orbs: always camera-facing (they're DOM, so
// always readable), clickable to fly there. The active orb's marker hides
// (you're already there); remote ones fade slightly with distance.

export class Markers {
  constructor(stageNodes, { onClick, onHover, onLeave }) {
    const wrap = document.createElement('div');
    wrap.id = 'markers';
    document.body.appendChild(wrap);
    this.wrap = wrap;
    this.nodes = stageNodes;
    this.items = stageNodes.map((n, i) => {
      const b = document.createElement('button');
      b.className = 'marker';
      b.innerHTML = `<i></i><b>${n.stage.act}</b><span>${n.stage.title}</span>`;
      b.addEventListener('click', () => onClick(i));
      b.addEventListener('pointerenter', () => onHover(i));
      b.addEventListener('pointerleave', () => onLeave(i));
      wrap.appendChild(b);
      return b;
    });
  }

  update(camera, activeIndex) {
    for (let i = 0; i < this.nodes.length; i++) {
      const el = this.items[i];
      if (i === activeIndex) { el.style.display = 'none'; continue; }
      const pos = this.nodes[i].position;
      const v = pos.clone().project(camera);
      if (v.z > 1) { el.style.display = 'none'; continue; } // behind camera
      const x = (v.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
      const dist = camera.position.distanceTo(pos);
      el.style.display = 'flex';
      el.style.opacity = Math.max(0.3, Math.min(1, 70 / dist));
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    }
  }
}
