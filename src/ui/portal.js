import { STAGES } from '../config/stages.js';

// A storyteller hover-card: when the pointer rests on a black-hole orb,
// the portal opens next to it and previews that act's video and reference
// links. Hovering the card itself keeps it open so links stay clickable.

export class Portal {
  constructor() {
    const el = document.createElement('div');
    el.id = 'portal';
    document.body.appendChild(el);
    this.el = el;
    this.index = -1;
    this.visible = false;
    this.hideTimer = null;
    this.onHide = () => {};

    el.addEventListener('pointerenter', () => this.keepOpen());
    el.addEventListener('pointerleave', () => this.scheduleHide());
  }

  keepOpen() {
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
  }

  scheduleHide() {
    this.keepOpen();
    this.hideTimer = setTimeout(() => this.hide(), 180);
  }

  hide() {
    const was = this.index;
    this.visible = false;
    this.index = -1;
    this.el.classList.remove('show');
    if (was >= 0) this.onHide(was);
  }

  show(i) {
    this.keepOpen();
    if (this.index === i && this.visible) return;
    this.index = i;
    this.visible = true;
    const s = STAGES[i];
    const body = s.body.length > 220 ? s.body.slice(0, 218).trimEnd() + '…' : s.body;

    // The video plays on the orb itself now; the card carries the story + links.
    this.el.innerHTML = `
      <div class="p-meta"><span>ACT ${s.act}</span><span class="p-phase">${s.phase}</span></div>
      <h4>${s.title} <small>· ${s.subtitle}</small></h4>
      <div class="p-hint">▶ hover the orb — footage dissolves into the swirl</div>
      <p class="p-body">${body}</p>
      <div class="p-links">
        ${s.refs.map((r) => `<a href="${r.url}" target="_blank" rel="noopener">↗ ${r.label}</a>`).join('')}
      </div>`;
    this.el.classList.add('show');
  }

  // Anchor the card to the orb's projected screen position each frame.
  updatePosition(worldPos, camera) {
    if (!this.visible) return;
    const v = worldPos.clone().project(camera);
    if (v.z > 1) { this.hide(); return; }
    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-v.y * 0.5 + 0.5) * window.innerHeight;

    const w = this.el.offsetWidth || 280;
    const h = this.el.offsetHeight || 200;
    // prefer to the right of the orb, flip left near the edge; clamp vertically
    let px = x + 28;
    if (px + w > window.innerWidth - 12) px = x - w - 28;
    px = Math.max(12, px);
    let py = y - h * 0.4;
    py = Math.max(70, Math.min(py, window.innerHeight - h - 12));
    this.el.style.transform = `translate(${px}px, ${py}px)`;
  }
}
