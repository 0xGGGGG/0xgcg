# 0xGCG — Grow. Corrupt. Glitch.

An interactive Three.js concept explorer / storyboard for the immersive
visuals at **KraftKunstWerk · Leipzig**. You fly through a 3D **neuron
network**; each soma node is one stage of a 5-act dramaturgy, with mood
boards, technical themes, embedded references and glowing particle flow.

## The concept

A self-replicating creation myth. The macro-arc is a single loop —
**Grow → Corrupt → Glitch → (re)Grow** — and every visual *layer* (vines,
circuits, glyphs, cells, neurons, galaxies, eyes…) runs that same
micro-cycle at its own tempo.

| Act | Stage | Phase | Carries |
|----|-----------|---------|---------|
| I | GENESIS | GROW | seed, mycelium, first cells · L-systems, fBm |
| II | FLOURISH | GROW | L-trees, boids, glyph bloom · WFC, cellular automata |
| III | CORRUPTION | CORRUPT | the Optimizer/Replicator reprints life as machine · erosion |
| IV | GLITCH | GLITCH | datamosh, RGB split, pixel sort, atomization |
| V | REBIRTH | GROW | the seed re-prints — Ouroboros back to Act I |

Inspirations: Stargate SG-1 Replicators · Horizon Zero Dawn terraforming
& titan-AIs · Universal Paperclips · Everything Everywhere All At Once ·
The Alters life-tree.

The full installation script (spatial architecture, 3-minute timeline,
surface-by-surface direction, sound design) lives in [`SCRIPT.md`](SCRIPT.md).

## The place

The work is mapped onto the **Maschinenhalle** at KraftKunstWerk, Leipzig.
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
python3 -m http.server 8000
# then open http://localhost:8000
```

(Any static server works. A server is required — ES module importmaps
won't load over `file://`.) Three.js r169 loads from a CDN, so you need
network access on first load.

## Controls

- **drag** — orbit / free-look around the current node
- **click a node** — fly to that stage
- **← / →** — previous / next stage · **1–5** — jump to act
- **space** — autoplay (13s dwell per stage; good for an installation loop)
- **H** — hide the UI · **Enter VR** — WebXR (bloom is bypassed in XR)

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
src/main.js           renderer, loop, XR, navigation, color grade
src/config/stages.js  the 5-stage dramaturgy (drives everything)
src/core/neuronGraph  network layout + curve baking (GPU particle source)
src/core/particles    GPU-driven flowing glow particles
src/core/cameraRig    artistic flight between nodes
src/core/postfx       UnrealBloom composer
src/core/assets       mood-board planes + OBJ/FBX loading
src/ui/overlay        per-stage DOM panel
```
