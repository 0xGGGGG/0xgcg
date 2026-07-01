# BLOOM — radial growth lab

A standalone experimental page at **`/bloom.html`** (dev: `http://localhost:5173/bloom.html`).
A **two-pass WebGL2** lab: a **growth automaton** spreads occupancy outward from a
seed (organically, per-layer rules — not a circle), and a render pass draws the
**scale shells** masked by that growth, graded by the
**`init → grow → optimize → overfit → corrupt → glitch → dimension++`** cycle.

- Engine: `src/lab/bloom.js` (shaders inline). No deps beyond a GL2 canvas.
- Controls: space play/pause · `r` reseed · cycle scrubber · seed/dimension HUD.
- Each shell is **procedural for now**; any shell can be overlaid with an
  AI-generated tileable texture (below), **black-keyed** so only the pattern shows.

## Growth automaton (organic expansion)

A ping-pong FBO (`FRAG_SIM`, `SIM`²) holds an occupancy field (R = grown, sticky;
G = freshness → tip glow). Each step, an empty cell adjacent to grown cells may
grow — with a probability **assigned per scale layer**, so the expansion morphology
differs by ring. The cycle's growth (0..1) caps the frontier radius (timing tracks
the clock; the *shape* stays organic — tendrils thin out past the cap).

| # | Layer | **Growth rule** | Procedural style | AI texture (black-keyed) |
|---|-------|-----------------|------------------|---------------------------|
| 0 | Dark matter | **diffuse** (smooth front) | fBm filament field | cosmic web / dark-matter filaments |
| 1 | Atoms | **diffuse** | point lattice + orbitals | atomic orbital lattice |
| 2 | Cells | **CA** (cluster + death) | voronoi + Turing | microscopy cell tissue |
| 3 | Organisms | **branch** (tip dendrites) | log-polar veins | **blood veins / vasculature** |
| 4 | Neurons | **branch** | log-polar dendrites | **neuron dendrite web** |
| 5 | Civilization | **rect** (axis routing) | road/city grid | aerial city street network |
| 6 | Machines | **rect** | gear teeth rings | mechanical gear field |
| 7 | Circuits | **rect** | PCB traces + vias | **PCB circuit board** |
| 8 | Data | **branch** (graph) | flow streams + blobs | **blob graph / node-edge structure** |
| 9 | Meta | **fill** (fast) | glyph / terminal rain | glyph / code-rain sheet |

(Rules live in `FRAG_SIM`'s per-shell `prob` switch and in `LAYERS[].grow`.)

---

## AI texture generation (fal / replicate)

**Goal:** seamless, **tileable**, **top-down / flat**, high-contrast textures **on
pure black**, so they tile around the ring without visible seams. The shader
**strips the black** automatically (luminance × alpha key) — only the lit pattern
overlays the growth, so you can export either **opaque-on-black** (JPG/PNG) or a
**transparent PNG** (real alpha); both work.

**Models**
- fal: `fal-ai/flux/dev` (quality) or `fal-ai/flux/schnell` (fast iterate);
  `fal-ai/flux-lora` if we train a look. Pass `enable_safety_checker:false`,
  square `1024×1024` (or `1536`), and request tiling where supported.
- replicate: `black-forest-labs/flux-dev` / `flux-schnell`;
  `lucataco/flux-dev-lora`. For true seamless tiles, an SDXL tiling pipeline
  (e.g. an SDXL + `seamless`/`tileable` LoRA) beats vanilla Flux.
- Seamless trick when a model has no tiling flag: generate large, then
  offset-tile + heal the seam, or generate a **radial-symmetric** image and map it
  by angle (polar) so only the radial seam matters.

**Shared style suffix** (append to each prompt):
> `, seamless tileable texture, top-down flat orthographic view, on pure black
> background, high detail, fine filaments, bioluminescent glow, dark sci-fi,
> 8k microscopy, no text, no watermark, centered, even lighting`

**Negative:** `text, watermark, logo, frame, border, vignette, people, hands, blurry, low-contrast, jpeg artifacts`

### Per-layer prompts

0. **Dark matter** — `the cosmic web, dark matter filaments and voids, faint blue-violet gossamer threads connecting nodes across deep space, n-body simulation aesthetic`
1. **Atoms** — `a lattice of glowing atomic orbitals, electron probability clouds and nucleus points, pale cyan, quantum field, ordered grid of luminous spheres`
2. **Cells** — `dense biological cell tissue under a microscope, packed polygonal cell membranes, voronoi walls glowing teal, nuclei, fluorescent stain`
3. **Organisms / veins** — `intricate network of blood vessels and capillaries, branching red vasculature, angiography, fractal veins on black, wet organic`
4. **Neurons** — `a web of neurons, branching dendrites and axons, glowing synapse nodes, cyan-white electrical filaments, brain connectome, dark-field micrograph`
5. **Civilization** — `aerial night view of a sprawling city street grid, glowing amber roads and blocks, transport network, circuit-like urban map, top-down`
6. **Machines** — `interlocking brass and steel gears, mechanical clockwork field, concentric cogwheels and teeth, oily metallic, industrial macro`
7. **Circuits** — `a green printed circuit board, copper traces, vias and solder pads, dense PCB routing, electronic substrate, macro top-down`
8. **Data** — `an abstract node-edge graph data structure, glowing magenta nodes connected by flowing edges, blob clusters, network topology, particle streams`
9. **Meta** — `falling green code rain, terminal glyphs and hexadecimal, matrix character streams, monospace symbols on black, cyber`

> Tip: also generate a **grayscale companion** per layer (height / flow map) with
> `, grayscale height map, white on black` — feed it to the shader as a
> displacement / flow field for motion, not just color.

---

## Wiring an AI texture into a shell — already built in

`loadShellTextures()` does it automatically. To add one:

1. Drop the image in **`public/lab/`** (served at site root), e.g. `03_veins.png`.
2. Edit **`public/lab/manifest.json`** — a 10-slot array, **index = shell id**.
   Set slot 3 to `"03_veins.png"` (`null` = stay procedural). With no manifest it
   probes the canonical `NN_<slug>.(png|jpg)` names instead.
3. Reload. The image is uploaded into a `sampler2DArray` layer, sampled in **polar
   coords** (`vec2(ang/2π·TILES, lt)`) so it **tiles around the ring**, and
   **black-keyed** (`max(rgb)·a`) so only the pattern overlays the organic growth.

No code edits needed — just the file + the manifest slot.

---

## Techniques per phase (canonical — from `src/config/stages.js`)

The timeline names the techniques explicitly. The bloom maps **radius = scale
shell** and **time = phase**; each phase applies the named techniques as GLSL
gestures over the whole field:

| Phase | Canonical themes (stages.js) | In the shader (`bloomColor`) |
|-------|------------------------------|------------------------------|
| **INIT** | Noise Fields · Vector Flow · fBm · Drone | base field + turbulence warp (`fbm`, flow advection) |
| **GROW** | Particle Systems · L-Systems · Reaction–Diffusion/Turing · Cellular Automata | `branches()` (log-polar ridged = L-system-ish), Turing term in `sCells` |
| **OPTIMIZE** | Wave Function Collapse · Procedural Infrastructure · Flow Fields · Optimization Loops | `optAmt` rectilinear grid-snap (organic→roads/blocks) |
| **OVERFIT** | Self-Replication · CA Overrun · Erosion · Recursive Tiling | `ovfAmt` domain tiling (`fract` replication) + fbm erosion |
| **GLITCH** | Glitch/Datamosh · Pixel Sorting · Feedback/Compression · Eternal Return | block bursts + luminance "sort" streaks + scanline; loop = dimension++ |

Single-pass shader **approximates** the inherently multi-pass ones
(reaction-diffusion Gray-Scott, true pixel-sort, feedback/datamosh). Those are
where TouchDesigner shines — see below.

## TouchDesigner port (GLSL-first, by design)

The shader is factored so the **PORTABLE CORE** block in `src/lab/bloom.js`
(helpers + `styleFor` + `bloomColor`) drops into a **GLSL TOP** unchanged; only
the entry point differs.

**1. Pixel Shader (GLSL TOP):** paste the core, then:
```glsl
// TD provides vUV (0..1). Center + aspect-correct, then call the core.
out vec4 fragColor;
void main(){
    vec2 res = uTDOutputInfo.res.zw;                 // pixel resolution
    vec2 uv  = (vUV.st - 0.5) * vec2(res.x/res.y, 1.0);
    fragColor = TDOutputSwizzle(vec4(bloomColor(uv), 1.0));
}
```
**2. Uniforms** (GLSL TOP → Vectors/Scalars page): `uTime` (from `absTime.seconds`
or a Speed CHOP), `uSeed`, `uGrowth`, `uPhase` (drive from a LFO/Timer CHOP or a
Constant). `uHas[10]` → a uniform array; `uTex` (the per-shell array) → either a
**2D Texture Array** TOP input, or split the 10 shells into a layout/array TOP.
**3. Replace the `#version 300 es` / `precision` header** with TD's default
(330/460, no `precision`), and `texture(uTex, vec3(uv,layer))` works as-is.

**Map the multi-pass techniques to native TD nodes** (instead of the single-pass
fakes here):
- **Reaction–diffusion (GROW cells):** ping-pong two GLSL TOPs (Gray-Scott step)
  with a **Feedback TOP** — real Turing patterns, then composite into the cells shell.
- **Datamosh / feedback (GLITCH):** **Feedback TOP** + Displace/Cache — true
  frame-to-frame smear.
- **Pixel sorting (GLITCH):** a multi-pass GLSL sort over rows/columns (or the
  community pixel-sort TOX), not the streak fake.
- **Flow fields (OPTIMIZE):** a GLSL TOP velocity field driving a **Particle/GPU
  particles** system or a Force GLSL.

Everything else (noise/fbm/voronoi/branches/grade/glitch tints) is plain GLSL and
runs identically in WebGL2 and TD.

## Next experiments (parked)

- **StreamDiffusion on WebGPU** — feed the shader's current frame as the *init
  image* to a fast img2img diffusion loop, so the procedural bloom is
  continuously "dreamed" into photoreal texture in real time. (In TD: pair with
  StreamDiffusionTD / a TouchDesigner SD bridge.)
- Per-shell **flow maps** driving particle advection over the texture.
- True **Gray-Scott reaction-diffusion** (ping-pong) replacing the cells fake.
