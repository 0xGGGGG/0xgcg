# Organic growth techniques — research & plan

Reference for the BLOOM lab ([[LAB.md]]). **North star:** grow branches/vines
from the centre outward, **limited by a mask texture — white = grow zone, every
other area blocks growth.** These are all **agent/node-based** algorithms (not
the stateless field-CA we tried first), which is why they give true branches.

Sources (scraped 2026-06-30 — inconvergent.net 403s plain fetchers, load via a
real Chromium): hyphae, trees, differential-line, differential-lattice,
fractures by Anders Hoff (inconvergent); WaveFunctionCollapse by Maxim Gumin;
3D cellular automata by Darien Brito.

---

## 1. Hyphae — **primary engine for vines/veins from centre**
<https://inconvergent.net/generative/hyphae/> · repo `inconvergent/hyphae_ani`

Grow **connected circles that may not overlap**.
- A **node** = circle: `{pos, radius, dir}`. Seed one at the centre with a radius + travel direction.
- **Step:** append a new node on the **perimeter** of an existing node, in its travel direction; **wobble** the angle randomly each time; shrink the radius a little each append.
- **Branch:** pick a random node, grow a child **~perpendicular** to its travel dir. It either collides (stop) or becomes a new branch.
- **Collision:** a new node is rejected if it lands within a set distance of **any** existing node → use a spatial grid / kd-tree for the proximity query.
- **Feel:** make angle wobble **∝ 1/radius** (thin branches wobble more, thick are straighter). A branch child should be **considerably thinner** than its parent (mass conserved across a fork — "as much mass before as after").

→ root/vein/hyphae networks radiating from the seed. **Exactly the target.**
**Mask:** reject any candidate node whose position is **black** in the mask → growth confined to white.

**Concrete params from the real source** (`_refs/repos/inconvergent_hyphae/hyphae.py`):
node arrays `X,Y,R,THE(angle),GE(generation),P(parent),C(attempts),D(firstChild)`;
spatial **zone grid** for proximity. `SOURCE_NUM=9` seeds inside a centre circle.
Per step: pick a random node `k`; `C[k]++`; die if `C[k]>CK_MAX(15)`. New radius
`r = R[k]*RAD_SCALE(0.92)` if it already has a child else `R[k]`; die if `r<ONE`.
Angle `the = THE[k] + (1 − 1/((ge+1)^0.1))·gauss()·π` → **wobble grows with
generation**. New node at `(X[k]+sin(the)·r, Y[k]+cos(the)·r)`. **Accept only if**
`dist·2 > R[neighbour]+r` for every nearby node (no overlap). First child of a
node keeps the radius (straight extension); later picks shrink+wobble (branch).
**The mask plugs in at hyphae.py:301-305** — that "is the point inside the
CIRCLE_RADIUS?" test becomes "is the mask **white** at (x,y)?".

## 2. Trees — tip-only branching (simpler, faster)
<https://inconvergent.net/generative/trees/>

Like hyphae but **new branches only appear at the tips** of existing branches,
and **no collision detection**. Not physically real, but a convincing tree
illusion; add a one-sided shadow on branches for depth. Good cheap fallback /
for the Neurons & Organisms layers.

## 3. Differential line — folding organic boundaries
<https://inconvergent.net/generative/differential-line/> · repo `inconvergent/differential-line`

Connected polyline of nodes ("pearls on a string").
- Randomly **insert** new nodes between pairs of existing nodes (uniform, or biased to **high-curvature** spots for richer folds).
- Each iteration every node optimizes: stay **close to its two neighbours but not too close**, and push **away from all other nodes within a radius** (soft, no real collision).
→ space-filling folds — cabbage, intestines, coral, lichen. **Use for Cells/membranes.** Mask: clamp/repel nodes out of black areas.

## 4. Differential lattice — slime-mold outward network
<https://inconvergent.net/generative/differential-lattice/> · repo `inconvergent/differential-lattice`

Loosely-connected differential growth where **connections are recomputed every
step** via **Relative Neighbourhood** (two nodes are neighbours if the lune
between them holds no other node — from the leaf-venation algorithm). New nodes
appear where local density is **low-but-nonzero → growth pushes outward** like
slime mold. GPU-friendly (pyCUDA, 80k+ nodes). **Best match for the
Physarum/slime look** the user asked for, and for the Data layer. Mask: only
spawn nodes where the mask is white.

## 5. Fractures / Substrate — cracks, city, PCB
<https://inconvergent.net/generative/fractures/> · Tarbell's *Substrate*; *Craquelure*

Lines grow in a direction until they hit the boundary or **collide** with another
line; on stop, **spawn a new line perpendicular** at an arbitrary point. Venation
variant: scatter **sources**; a fracture steps toward the **mass-centre of
sources in its FOV** (bigger FOV → more meandering); terminate on collision or no
sources; spawn new fractures from tips. A **fracturing speed** that decays and is
**inherited (~0.8×)** by children concentrates density near the impact point.
→ glass cracks, rectilinear city grids, PCB traces. **Use for Civilization/
Circuits (rectilinear) and GLITCH (craquelure cracks).**

## 6. Wave Function Collapse — tiled infrastructure
<https://github.com/mxgmn/WaveFunctionCollapse>

Constraint-solver tiling. Each cell starts as a **superposition** of all tiles;
repeatedly **observe** (collapse) the **lowest-entropy** cell to a tile weighted
by example frequency, then **propagate** adjacency constraints to neighbours;
**backtrack** on contradiction. The *overlapping* model learns N×N patterns from
an input bitmap. **Use for OPTIMIZE — roads/blocks/machine tiling.** Mask: only
collapse cells inside the white area.

## 7. Cellular automata (multi-state "Generations" + 3D) — GLSL-native
Darien Brito, *3D Cellular Automata 1.0* (paywalled — **don't pull the code**):
"six classic models, each a live **GPU voxel volume** you reseed/tune in real
time **inside TouchDesigner**." i.e. a 3D-texture ping-pong GLSL/compute sim →
**directly the GLSL+TD path we want.** Refs:
[Softology](https://softologyblog.wordpress.com/2019/12/28/3d-cellular-automata-3/) ·
[LifeWiki 3D CA](https://conwaylife.com/wiki/Three-dimensional_cellular_automaton).

**Rule notation `Survival / Birth / States / Neighbourhood`**, e.g. `4/4/5/M`:
- empty cell (state 0) with **Birth** live-neighbours → born at the **max** state.
- live cell at max state with **Survival** neighbours → stays; otherwise it begins
  **dying**, decrementing one state per step (max → … → 1 → 0/dead). So `States`
  is a refractory/decay depth → shells, trails, crystalline shells.
- **M** = Moore (26 neighbours in 3D / 8 in 2D); **N/V** = von Neumann (6 / 4).
- Example rules: `4/4/5/M` (445), Clouds `13-26/13-14,17-19/2/M`, Pyroclastic
  `4-7/6-8/10/M`, Amoeba, Slow Decay, Builder.

**Why it matters here:** the **multi-state (Generations)** form is far more organic
than the binary CA we tried — and its **decay states ARE the age/freshness channel**
we already track. Two uses:
- **now (2D):** a 2D Generations CA (survive/birth + N decay states) for the
  Cells/Overfit layers — richer growth, glow from decay.
- **later (3D):** a voxel **3D bloom** (3D-texture ping-pong), exactly Darien
  Brito's TD approach, fully portable.
**Mask:** only allow **Birth** where the mask is white (gate the birth test).

## 8. Lenia — continuous CA (smooth lifelike organisms)
Bert Wang-Chak Chan. <https://chakazul.github.io/Lenia/JavaScript/Lenia.html> ·
repo `Chakazul/Lenia` (cloned) ·
[Wikipedia](https://en.wikipedia.org/wiki/Lenia) · [paper arXiv:2005.03742].

A **smooth generalization of Life** — continuous space/time/state. Instead of
counting neighbours it **convolves** the field with a soft radial **kernel**, then
applies a **growth function**:
- State `A(x) ∈ [0,1]`. Kernel `K` = concentric Gaussian ring(s), normalised to sum 1.
- Potential `U = K * A` (convolution over a neighbourhood radius R).
- Growth `G(U) = 2·exp(−(U−μ)²/(2σ²)) − 1` ∈ [−1,1].
- Update `A ← clip(A + Δt·G(U), 0, 1)`.
- *Orbium* archetype: kernel `μ_K=0.5, σ_K=0.15`; growth `μ=0.15, σ=0.015`; `Δt≈0.1`.
  Varying kernel/growth/seed yields **400+ "species"** (self-organising, self-repairing,
  radial/bilateral symmetry, gliders).

**GLSL/TD:** it's a **ping-pong shader** — one pass convolves the kernel (≈R² taps,
small R like 13 is fine; or FFT, which TD has), one applies growth. Maps to a
TouchDesigner GLSL-TOP feedback loop natively. **Mask:** multiply growth by the
mask (or seed only in white) → Lenia organisms confined to the grow zone.
**Use for:** living **Cells/Organisms** textures and a morphing **corrupt** field —
gorgeously organic, though not "branches from centre" (that's hyphae's job).

---

## Mapping to 0xGCG

**Cycle phase → technique regime**
| Phase | Technique |
|-------|-----------|
| INIT | sparse seed nodes / noise field |
| GROW | **hyphae** + differential line (veins, membranes) |
| OPTIMIZE | **WFC** + Substrate (roads, rectilinear) |
| OVERFIT | **differential lattice** (slime overgrowth) + fracture density |
| GLITCH | **fractures / craquelure** (cracks) + datamosh |

**Scale shell → growth style** (seed at centre, grow outward, colour by ring)
dark-matter noise · atoms lattice · **cells** differential-line · **organisms**
hyphae · **neurons** hyphae/tips · **civilization** WFC+substrate · machines WFC
· **circuits** substrate · **data** differential-lattice · meta glyph.

## Local reference copies (gitignored under `_refs/`)

Cloned source repos — `_refs/repos/`:
- `inconvergent_hyphae/hyphae.py` — **the primary reference** (full algorithm above)
- `inconvergent_tree/` · `inconvergent_differential-line/` · `inconvergent_differential-lattice/` (`main.py` + `modules/`) · `inconvergent_differential-mesh/` · `inconvergent_fracture/`
- `mxgmn_WaveFunctionCollapse/` — `Model.cs`, `OverlappingModel.cs`, `SimpleTiledModel.cs`, `samples/`
- `LingDong_ndwfc/` — **dependency-free N-dimensional WFC in JS** (`ndwfc.js` + `ndwfc-tools.js`); the practical WFC to port for the OPTIMIZE/infrastructure layer (`WFC({nd,weights,rules,wave})`, entropy/collapse/propagate).
- `Chakazul_Lenia/` — continuous CA; `JavaScript/` (`Lenia.html`, `Lenia-LifeForms.js`, `catalogue/`), plus `Python/`, `Jupyter/`, `Matlab/`, `R/`

Reference gifs/images (the visual targets) — `_refs/inconvergent/media/`:
`hyphae{1,2}.gif`, `tree{1,2}.gif`, `differential-line*.gif`, `difflat*.gif/jpg`,
`differential-mesh*.gif`, `fractures*.{gif,png}`. (inconvergent 403s plain
curl/WebFetch — fetched via a real Chromium's network stack.)

## Implementation plan (next)

1. **Replace the field-CA with a node-based agent engine** in `src/lab/` — a
   `Hyphae`/`DifferentialLattice` system: array of nodes, a **spatial-hash grid**
   for O(1) proximity, per-frame spawn + branch + collision-reject, radius shrink,
   **mask rejection** (sample the white/black texture at each candidate), and the
   cycle's growth value gating how far the frontier may reach.
2. **Render** the nodes/edges into a texture (canvas2D or instanced GL lines),
   then sample it in the existing WebGL shell shader so vines are **coloured per
   scale ring** and graded by phase. Keeps the look; fixes the structure.
3. **Per-layer params** (already built) → per-regime params (wobble, branch rate,
   radius shrink, spacing, FOV, density window).
4. **Mask** is the unifying input across every algorithm: white = grow zone.
   Default = grow everywhere; drop `public/lab/mask.png` to shape it.
5. **TouchDesigner:** the agent sim ports as a Python/SOP or GPU-particle system;
   mask = a TOP; the colouring shader is the same GLSL core. (Field algorithms —
   reaction-diffusion, the WebGL render — still map to Feedback/GLSL TOPs.)

## Other experiments (parked)
- **Fourier-series / epicycle drawing** (3Blue1Brown — youtu.be/MY4luNgGfms): take a
  contour, run a **DFT** to get rotating vectors (epicycles), and trace it as a sum
  of spinning circles. Draw the 0xGCG mark / a glyph this way, and/or use the traced
  path as a **growth path the hyphae follows**. Renderable in GLSL (sum of circles)
  or a tiny JS DFT over a sampled path.

## 9. Shader CA / reaction–diffusion (Softology) — living-texture siblings to Lenia
Index: <https://softologyblog.wordpress.com/category/cellular-automata-2/> (lots of
GLSL CA + RD examples). All ping-pong fragment shaders → TD-native, mask-gateable.

- **MNCA — Multiple Neighbourhoods CA**
  (<https://softologyblog.wordpress.com/2021/02/14/even-more-explorations-with-multiple-neighborhoods-cellular-automata/>):
  convolve the field against **several ring-shaped neighbourhoods** of different
  radii; each neighbourhood's average drives an **activation threshold** (32–52
  float params). Multi-scale variant (MSMNCA) layers radii. Produces lush
  slime/coral/vein organics — the richest "living texture" of the set. **Best
  upgrade for the Cells/Organisms layers.**
- **Gray–Scott reaction–diffusion**: two chemicals U,V; `U' = U + (Du·∇²U − U·V² +
  f·(1−U))·dt`, `V' = V + (Dv·∇²V + U·V² − (f+k)·V)·dt`. Tune **f, k, Du, Dv** →
  spots, stripes, worms, mitosis. The canonical RD; a 2-pass GLSL ping-pong.
- **3D / 5D / hexagonal / totalistic / cyclic CA**: variants of the
  `Survival/Birth/States/Neighbourhood` rule (see §7) on different lattices.
- Lenia/SmoothLife noted as the continuous-CA cousins (already implemented, §8).

**Plan fit:** add **MNCA** and **Gray–Scott** as extra *live-field* modes next to
Lenia (same ping-pong scaffold in `lenia.js` — generalise it), selectable per
layer or as a global mode. Each is mask-gated (white = alive) and phase-graded.
