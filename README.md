# 0xGCG — Grow. Corrupt. Glitch.

An interactive Three.js concept explorer / storyboard for the immersive
visuals at **Kunstkraftwerk · Leipzig**. You fly through a 3D **neuron
network**; each soma node is one stage of a 5-act dramaturgy, with mood
boards, technical themes, embedded references and glowing particle flow.

## The concept

A self-replicating creation myth. The macro-arc is a single loop —
**Grow → Corrupt → Glitch → (re)Grow** — and every visual *layer* (vines,
circuits, glyphs, cells, neurons, galaxies, eyes…) runs that same
micro-cycle at its own tempo.

| Act | Stage | Phase | Carries |
|----|-----------|---------|---------|
| I | BOOT | GROW | the dark machine idles · void main(), dark-matter field, boot logs |
| II | FEED | GROW | Data snaps the void into matter · particles, bonds, cymatics |
| III | GROW | GROW | the signal becomes alive · cells, roots, reaction-diffusion, Physarum |
| IV | CORRUPT | CORRUPT | growth past its substrate → machine · WFC, replicators, circuits |
| V | GLITCH | GLITCH | recognition, collapse, return to seed · datamosh, one-graph alignment |

The 5 acts are the *energetic process*; the natural layers (void, cells,
infrastructure, circuits, data, meta) are the material *skins* it wears —
**one graph, many skins**. The loop edge GLITCH → BOOT is the Ouroboros
return. See [`SCRIPT.md`](SCRIPT.md) for the full surface-by-surface script.

Inspirations: Stargate SG-1 Replicators · Horizon Zero Dawn terraforming
& titan-AIs · Universal Paperclips · Everything Everywhere All At Once ·
The Alters life-tree.

The full installation script (spatial architecture, 3-minute timeline,
surface-by-surface direction, sound design) lives in [`SCRIPT.md`](SCRIPT.md).

## The place

The work is mapped onto the **Maschinenhalle** at Kunstkraftwerk, Leipzig.
Reference geometry, panoramas and production maps for the hall live in
[`assets/materials/`](assets/materials/) (FBX models + cross/frontal
panoramas). The four named surfaces from `SCRIPT.md` map onto the room as:

| Surface | Role |
|---------|------|
| Rear wall | **Meta** — the creator / debug layer |
| Floor | **Data** — the soundtrack made visible, flowing rear → front |
| Front wall | **The Loop** — the void engine / black seed |
| Side walls | **The Patch** — version history of the loop |

## Run it

No build step. From this folder:

```bash
python3 serve.py 8000
# then open http://localhost:8000  (or /core , /layout directly)
```

`serve.py` is a tiny static server with SPA fallback, so deep links and
refreshes on `/core` and `/layout` work. Plain `python3 -m http.server`
also works for the root, but will 404 on `/layout`. A server is required —
ES module importmaps won't load over `file://`. Three.js r169 loads from a
CDN, so you need network access on first load.

## Routes

- `/` → the **intro** (SCRIPT §1 title boot) with doors to Timeline & Layout.
- `/core` → the **Core** page (about / manifesto / stage-modes / references).
- `/timeline` → the **Timeline** (neuron storyboard) · `/layout` → the **Layout** view.
- The view switcher updates the URL; every trigger re-homes the viewpoint.

## Two views

A view switcher in the top bar toggles between:

- **Core** — the neuron-graph storyboard (the 5-act dramaturgy).
- **Layout** — a navigable holographic blueprint of the actual venue
  (`assets/materials/…Panorama.fbx`). The hall is drawn as a dark
  wireframe; each surface carries a marker mapping it to a SCRIPT.md
  system (rear→Meta, floor→Data, front→The Loop, sides→The Patch). A
  Blender-style axis gizmo sits bottom-right. Click a surface for its
  full card (role, interpretations, sample fragments).
  - **The loop cycle** (HUD, top): plays the SCRIPT §2 causal chain —
    **Meta** documents → **Data** flows rear→front along the floor →
    **The Loop** transforms on the front wall → **The Patch** remembers,
    its history sliding front→rear along the side walls → dissolves back
    into **Meta**. Each phase lights its surface, drives the card, and
    surges the matching particle current. Play/pause or click a step;
    clicking a surface marker pauses the loop for free inspection.

## The player / timeline

A shared transport sits at the bottom of both views — a big **play/pause**, the
stage chips (acts in Core, loop phases in Layout), and a **ruler** with minor
ticks and a colored boundary line per stage plus a moving playhead. Clicking a
stage (chip or ruler segment) **navigates the camera** there — identical to
clicking a node/surface in 3D. (It's built to grow into a full timeline view.)

## Controls

**Core**
- **drag** — orbit / free-look · **click a node** or a player stage — fly there
- **← / →** — prev / next · **1–5** — jump to act · **space** — play/pause

**Layout**
- **drag** — orbit · **scroll** — zoom · **click a surface** or player phase — fly there
- near the **gizmo** (bottom-right): **⤢ frame** (whole room) · **▣ section** (annotated cross-section)

**Both:** **C / L** switch view · **A** cosmic address · **H** hide the UI ·
**Enter VR** — WebXR (Core)

## Cosmic address

The venue readout in the header opens a fully zoomable "you are here" — from
the front wall of the Maschinenhalle (`51.3416°N 12.3361°E`) out through
Earth, the Solar System, the Milky Way, the Local Group, Laniakea and the
observable universe, then back to the void. Scroll / arrows / `+ −` to zoom;
the current date & time sit at the foot. It is the SCRIPT's *one graph, many
skins* made literal: the same pointer at every scale.

## Make it yours

- **Story / copy / colors:** everything lives in `src/config/stages.js`.
- **Mood boards:** drop images in `assets/` named like `genesis-1.jpg`,
  `corruption-2.jpg`, etc. (see the `images` arrays). Missing files fall
  back to generated on-theme placeholders.
- **Reference videos:** set a YouTube id on a stage's `video` field to
  embed it in that stage's panel.
- **3D models:** add OBJ/FBX to `assets/` and list them in `MODELS`
  (`src/config/stages.js`) with `{ url, type, pos, scale }`.

## Structure

```
index.html            importmap + UI shell
styles.css            overlay styling
src/main.js           renderer, loop, XR, Core/Layout switch, color grade
src/config/stages.js  the 5-stage dramaturgy (drives everything)
src/core/neuronGraph  network layout + curve baking (GPU particle source)
src/core/particles    GPU-driven flowing glow particles
src/core/cameraRig    artistic flight between nodes
src/core/postfx       UnrealBloom composer
src/core/assets       mood-board planes + OBJ/FBX loading
src/ui/overlay        per-stage DOM panel
src/ui/intro          §1 0xGCG slot-machine title page (the index /)
src/ui/cosmicAddress  zoomable venue→universe "you are here" overlay
src/layout/roomView   ## Layout: venue FBX blueprint + gizmo + surface markers
serve.py              static dev server with SPA fallback (routes)
```
