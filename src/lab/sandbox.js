// ---------------------------------------------------------------------------
// BLOOM — stacked organic-growth lab for 0xGCG.
//
// 10 full-frame layer textures (dark matter → atoms → cells → organisms →
// neurons → civilization → machines → circuits → data → meta), the SAME size,
// stacked on Z with transparency. Each layer is REVEALED by its own organic
// growth front spreading from the centre (domain-warped + branching tendrils),
// and the layers start with a staggered LAG so they pile up on top of each
// other as the init→…→glitch cycle runs. Every layer's growth is independently
// tunable. Pure GLSL (no CPU sim) → the core ports into a TouchDesigner GLSL TOP.
//
// (Node engines hyphae.js / lenia.js remain in the repo and can drive a specific
//  layer's reveal later; this view is the stacked, lagged, per-layer model.)
// ---------------------------------------------------------------------------

import { FieldSim, LENIA_PRESETS, TRUCHET_PRESETS } from './fields.js';
import { Physarum, PHYSARUM_PRESETS } from './physarum.js';
import { LTree, LTREE_PRESETS } from './ltree.js';
import { WFC, WFC_STYLES } from './wfc.js';
import { Epicycles } from './epicycles.js';

const LAYERS = [
  { name: 'Dark matter', slug: 'darkmatter', grow: 'diffuse', color: '#2b3a66' },
  { name: 'Atoms',       slug: 'atoms',      grow: 'diffuse', color: '#3f7fe0' },
  { name: 'Cells',       slug: 'cells',      grow: 'CA',      color: '#27c79a' },
  { name: 'Organisms',   slug: 'veins',      grow: 'branch',  color: '#c8203a' },
  { name: 'Neurons',     slug: 'neurons',    grow: 'branch',  color: '#49c8ff' },
  { name: 'Civilization',slug: 'city',       grow: 'rect',    color: '#e0b040' },
  { name: 'Machines',    slug: 'machines',   grow: 'rect',    color: '#b8c0c8' },
  { name: 'Circuits',    slug: 'circuits',   grow: 'rect',    color: '#1fe05a' },
  { name: 'Data',        slug: 'data',       grow: 'branch',  color: '#e23ce0' },
  { name: 'Meta',        slug: 'meta',       grow: 'fill',    color: '#7dff8a' },
];
const PHASES = ['INIT', 'GROW', 'OPTIMIZE', 'OVERFIT', 'CORRUPT', 'GLITCH'];
const CYCLE_DUR = 40;
const NTEX = 10;
const TEXW = 512;
const DOMAIN = 0.85;

const VERT = `#version 300 es
const vec2 V[3] = vec2[3](vec2(-1.0,-1.0), vec2(3.0,-1.0), vec2(-1.0,3.0));
void main(){ gl_Position = vec4(V[gl_VertexID], 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
out vec4 frag;
uniform vec2  uRes;
uniform float uTime;
uniform float uSeed;
uniform float uPhase;     // 0..6 cycle (colour grade)
uniform float uReveal;    // 0..1 reveal clock (drives the staggered layers)
uniform highp sampler2DArray uTex;   // optional AI texture per layer
uniform sampler2D uMaskTex;          // white = grow zone
uniform float uHasMask;
uniform float uHas[10];   // 1 if layer N has an AI texture
uniform vec4  uLP0[10];   // lag, speed, warp, branch
uniform vec4  uLP1[10];   // scale, alpha, edge, seed
uniform float uMode;      // 0 = stacked layers · 1 = live field (lenia/smoothlife/grayscott)
uniform float uFieldGain;
uniform float uGolMosh;   // Game of Life datamosh toggle
uniform float uGolMoshAmt; // datamosh strength
uniform float uFieldRGB;  // 1 = use the field texture's own colour (WFC tilesets)
uniform sampler2D uFieldTex;
const float DOMAIN = ${DOMAIN};
const float PI = 3.14159265;

float hash21(vec2 p){ p = fract(p*vec2(127.1,311.7) + uSeed*0.137); p += dot(p, p+34.345); return fract(p.x*p.y); }
vec2  hash22(vec2 p){ float n = hash21(p); return vec2(n, hash21(p+n)); }
float vnoise(vec2 p){
  vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  float a=hash21(i), b=hash21(i+vec2(1,0)), c=hash21(i+vec2(0,1)), d=hash21(i+vec2(1,1));
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*vnoise(p); p=p*2.02+vec2(7.1,3.7); a*=0.5; } return s; }
float ridged(vec2 p){ return 1.0 - abs(2.0*fbm(p)-1.0); }
float voro(vec2 p, out float edge){
  vec2 g=floor(p), f=fract(p); float f1=8.0, f2=8.0;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec2 o=vec2(float(x),float(y)); vec2 c=hash22(g+o); vec2 d=o+c-f; float dist=dot(d,d);
    if(dist<f1){ f2=f1; f1=dist; } else if(dist<f2){ f2=dist; }
  }
  edge=sqrt(f2)-sqrt(f1); return sqrt(f1);
}
// log-polar branching field (used for veins/dendrites AND the branching reveal front)
float branchField(vec2 p, float freq, float seed){
  float r=length(p)+1e-3; float a=atan(p.y,p.x);
  vec2 lp=vec2(a*1.6, log(r)*2.2 - uTime*0.04 + seed);
  vec2 w=lp + 0.5*vec2(fbm(lp*1.5+seed), fbm(lp*1.5+seed+5.0));
  return pow(smoothstep(0.42,1.0,ridged(w*freq)), 1.4);
}

// ---- full-frame layer styles (each layer is a whole-screen texture) ------
vec3 sDark(vec2 uv){ float n=fbm(uv*3.0+uTime*0.02); return mix(vec3(0.05,0.07,0.16), vec3(0.25,0.35,0.7), n*n); }
vec3 sAtoms(vec2 uv){ vec2 g=uv*10.0,cell=floor(g),f=fract(g)-0.5; float pd=length(f);
  return vec3(0.35,0.6,1.0)*smoothstep(0.16,0.0,pd)*step(0.4,hash21(cell+11.0)) + vec3(0.1,0.3,0.7)*smoothstep(0.02,0.0,abs(pd-0.30)); }
vec3 sCells(vec2 uv){ float e; voro(uv*7.0+uTime*0.03,e); return mix(vec3(0.03,0.16,0.13), vec3(0.3,1.0,0.78), smoothstep(0.07,0.0,e)); }
vec3 sVeins(vec2 uv){ float v=branchField(uv,3.0,0.0); return mix(vec3(0.06,0.0,0.0), vec3(1.0,0.16,0.18), v); }
vec3 sNeurons(vec2 uv){ float v=branchField(uv*1.05,3.6,3.0); return mix(vec3(0.0,0.04,0.08), vec3(0.4,0.9,1.0), v); }
vec3 sCity(vec2 uv){ vec2 g=uv*9.0; vec2 f=abs(fract(g)-0.5); return mix(vec3(0.05,0.04,0.02), vec3(1.0,0.75,0.34), smoothstep(0.45,0.5,max(f.x,f.y))); }
vec3 sMachines(vec2 uv){ float r=length(uv),ang=atan(uv.y,uv.x); float teeth=0.5+0.5*sin(ang*48.0); return mix(vec3(0.05,0.05,0.06), vec3(0.8,0.85,0.9), smoothstep(0.05,0.0,abs(fract(r*22.0)-0.5))*teeth); }
vec3 sCircuits(vec2 uv){ vec2 g=uv*12.0,fr=fract(g);
  float tr=(smoothstep(0.08,0.0,abs(fr.x-0.5))+smoothstep(0.08,0.0,abs(fr.y-0.5)))*step(0.5,hash21(floor(g)));
  float via=smoothstep(0.12,0.0,length(fract(g)-0.5))*step(0.7,hash21(floor(g)+7.0));
  return vec3(0.0,0.2,0.07)+vec3(0.12,1.0,0.35)*clamp(tr,0.0,1.0)+vec3(1.0,1.0,0.45)*via; }
vec3 sData(vec2 uv){ float r=length(uv); float flow=smoothstep(0.7,1.0,sin((r*30.0-uTime*1.5)+3.0*fbm(uv*3.0))); return mix(vec3(0.08,0.0,0.1), vec3(1.0,0.25,1.0), flow); }
vec3 sMeta(vec2 uv){ vec2 g=uv*vec2(20.0,24.0),cell=floor(g); float c0=hash21(vec2(cell.x,3.0)); float st=fract(c0*9.0+uTime*(0.4+c0*0.8)-cell.y*0.05);
  return vec3(0.0,0.06,0.0)+vec3(0.25,1.0,0.45)*(smoothstep(0.9,1.0,1.0-st)*step(0.5,hash21(cell+floor(uTime*8.0)))); }
vec3 styleFor(int k, vec2 uv){
  if(k==0) return sDark(uv); if(k==1) return sAtoms(uv); if(k==2) return sCells(uv); if(k==3) return sVeins(uv);
  if(k==4) return sNeurons(uv); if(k==5) return sCity(uv); if(k==6) return sMachines(uv); if(k==7) return sCircuits(uv);
  if(k==8) return sData(uv); return sMeta(uv);
}
vec3 phaseTint(float p){
  vec3 c0=vec3(0.55,0.65,0.9), c1=vec3(0.5,1.0,0.7), c2=vec3(0.72,1.0,0.5),
       c3=vec3(1.0,0.7,0.4), c4=vec3(1.0,0.4,0.8), c5=vec3(1.0,0.55,0.92);
  float t=clamp(p,0.0,5.0); float i=floor(t); float f=fract(t);
  vec3 a = i<0.5?c0 : i<1.5?c1 : i<2.5?c2 : i<3.5?c3 : i<4.5?c4 : c5;
  vec3 b = i<0.5?c1 : i<1.5?c2 : i<2.5?c3 : i<3.5?c4 : c5;
  return mix(a,b,f);
}

// organic reveal: a domain-warped, branching front expands with prog (0..1)
float revealMask(vec2 uv, float prog, vec4 a, vec4 bp){
  vec2 w = uv + a.z*0.30*vec2(fbm(uv*bp.x + bp.w), fbm(uv*bp.x + bp.w + 9.0)); // warp → ragged
  float organicR = length(w);
  if (a.w > 0.001) organicR -= branchField(uv, bp.x*0.5, bp.w) * a.w * 0.22;   // tendrils reach ahead
  float front = prog * 0.98;
  return smoothstep(front + bp.z, front - bp.z, organicR);
}

// ===== PORTABLE CORE (paste into a TD GLSL TOP; only main() differs) =======
vec3 bloomColor(vec2 uv){
  float r = length(uv);

  // ---- Lenia mode: render the living continuous-CA field, coloured per ring ----
  if (uMode > 0.5) {
    // Game of Life datamosh: live cells smear/displace/channel-split the texture (no black bg)
    if (uGolMosh > 0.5) {
      float S = uGolMoshAmt;
      vec2 blk = floor(uv*16.0);
      float g = texture(uFieldTex, uv/(2.0*DOMAIN)+0.5).r;
      // block sample the GoL so whole blocks move together (chunky datamosh)
      float gb = texture(uFieldTex, (blk+0.5)/16.0*0.0 + uv/(2.0*DOMAIN)+0.5).r;
      float m = max(g, gb);
      vec2 dir = normalize((hash22(blk)*2.0-1.0) + 0.001);
      float amt = m * (0.05 + 0.30*S);                 // block displacement (strong)
      vec2 duv = uv + dir*amt;
      int idm = int(min(clamp(length(duv)/0.80,0.0,1.0)*10.0, 9.0));
      float cs = m * (0.01 + 0.05*S);                  // chromatic split
      vec3 col;
      col.r = styleFor(idm, duv + dir*cs).r;
      col.g = styleFor(idm, duv).g;
      col.b = styleFor(idm, duv - dir*cs).b;
      // block-copy jumble — datamosh smears a far block over live cells
      vec2 jump = (hash22(blk+7.13)*2.0-1.0) * m * (0.12 + 0.35*S);
      col = mix(col, styleFor(int(min(clamp(length(uv+jump)/0.80,0.0,1.0)*10.0,9.0)), uv+jump), m*clamp(0.25+0.45*S,0.0,0.9));
      col += m*(0.15+0.25*S)*phaseTint(uPhase)*step(0.55, fract(uv.y*120.0 + uTime*3.0));  // scanline tears
      col *= phaseTint(uPhase);
      col += smoothstep(0.08,0.0,r)*vec3(0.4,0.5,0.6)*(0.5+0.5*sin(uTime));
      col *= smoothstep(1.05,0.18,r);
      return pow(max(col,0.0), vec3(0.85));
    }
    // WFC tilesets carry their own colour
    if (uFieldRGB > 0.5) {
      vec3 col = texture(uFieldTex, uv/(2.0*DOMAIN)+0.5).rgb * mix(vec3(1.0), phaseTint(uPhase), 0.35);
      float glit = smoothstep(4.6,5.7,uPhase);
      if (glit > 0.001) { float blk=hash21(floor(uv*vec2(8.0,40.0))+floor(uTime*12.0)); col += step(0.86,blk)*glit*vec3(0.3,0.0,0.4); }
      col += smoothstep(0.08,0.0,r)*vec3(0.4,0.5,0.6)*(0.5+0.5*sin(uTime));
      col *= smoothstep(1.05,0.18,r);
      return pow(max(col,0.0), vec3(0.85));
    }
    float A = clamp(texture(uFieldTex, uv/(2.0*DOMAIN)+0.5).r * uFieldGain, 0.0, 1.0);
    float rn = clamp(r/0.80, 0.0, 1.0);
    int id = int(min(rn*10.0, 9.0));
    vec3 col = styleFor(id, uv) * smoothstep(0.22, 0.6, A);
    col += smoothstep(0.55, 0.95, A) * phaseTint(uPhase) * 0.5;   // bright organism cores
    col *= phaseTint(uPhase);
    float glit = smoothstep(4.6,5.7,uPhase);
    if (glit > 0.001) { float blk=hash21(floor(uv*vec2(8.0,40.0))+floor(uTime*12.0)); col += step(0.86,blk)*glit*vec3(0.3,0.0,0.4); }
    col += smoothstep(0.08,0.0,r)*vec3(0.4,0.5,0.6)*(0.5+0.5*sin(uTime));
    col *= smoothstep(1.05,0.18,r);
    return pow(max(col,0.0), vec3(0.85));
  }

  float maskV = 1.0;
  if (uHasMask > 0.5) { vec4 m = texture(uMaskTex, uv/(2.0*DOMAIN)+0.5); maskV = max(max(m.r,m.g),m.b)*(m.a<1.0?m.a:1.0); }

  vec3 outc = vec3(0.0);
  for (int k = 0; k < 10; k++) {                 // stack layers 0..9, back to front
    vec4 a = uLP0[k];                            // lag, speed, warp, branch
    vec4 bp = uLP1[k];                           // scale, alpha, edge, seed
    float prog = clamp((uReveal - a.x) * a.y, 0.0, 1.0);
    if (prog <= 0.001) continue;
    float rv = revealMask(uv, prog, a, bp) * step(0.5, maskV);   // organic reveal, mask-gated
    if (rv <= 0.001) continue;
    vec3 texc = uHas[k] > 0.5 ? texture(uTex, vec3(uv*0.6+0.5, float(k))).rgb : styleFor(k, uv);
    float lum = max(max(texc.r,texc.g),texc.b);
    float al = rv * bp.y * smoothstep(0.06, 0.5, lum);           // transparency: dark = see-through
    outc = mix(outc, texc, al);
  }

  outc *= phaseTint(uPhase);

  // GLITCH grade on the composite
  float glit = smoothstep(4.6,5.7,uPhase);
  if (glit > 0.001) {
    float block=hash21(floor(uv*vec2(8.0,40.0)) + floor(uTime*12.0));
    outc += step(0.86,block)*glit*vec3(0.3,0.0,0.4);
    float streak=step(0.62, hash21(vec2(floor(uv.x*140.0), floor(uTime*3.0))));
    outc = mix(outc, vec3(max(max(outc.r,outc.g),outc.b)), glit*streak*0.55);
  }

  outc += smoothstep(0.08,0.0,r)*vec3(0.4,0.5,0.6)*(0.5+0.5*sin(uTime));  // seed glow
  outc *= smoothstep(1.05,0.18,r);                                       // vignette
  return pow(max(outc,0.0), vec3(0.85));
}
// ===== END PORTABLE CORE ==================================================

void main(){
  vec2 uv=(gl_FragCoord.xy - 0.5*uRes)/uRes.y;
  frag=vec4(bloomColor(uv), 1.0);
}`;

// ---- GL boilerplate ------------------------------------------------------
function compile(gl, type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error('compile:\n' + gl.getShaderInfoLog(s)); throw new Error('shader'); } return s; }
function program(gl, vs, fs) { const p = gl.createProgram(); gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error('link:\n' + gl.getProgramInfoLog(p)); throw new Error('link'); } return p; }

const canvas = document.getElementById('c');
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
if (!gl) document.body.insertAdjacentHTML('beforeend', '<div style="position:fixed;inset:0;display:grid;place-items:center;color:#e23c5a">WebGL2 not available</div>');

const prog = program(gl, VERT, FRAG);
const U = {};
['uRes', 'uTime', 'uSeed', 'uPhase', 'uReveal', 'uTex', 'uMaskTex', 'uHasMask', 'uHas', 'uLP0', 'uLP1', 'uMode', 'uFieldGain', 'uGolMosh', 'uGolMoshAmt', 'uFieldRGB', 'uFieldTex'].forEach((n) => U[n] = gl.getUniformLocation(prog, n));
const vao = gl.createVertexArray();

function tex2d() {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
function uploadTex(tex, src) { gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, src); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); }

// ---- growable-area MASK (white = grow) -----------------------------------
let hasMask = 0; const maskTex = tex2d();
async function loadMask() {
  for (const url of ['lab/mask.png', 'lab/mask.jpg']) {
    const im = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = url; });
    if (im) { const c = document.createElement('canvas'); c.width = c.height = 512; c.getContext('2d').drawImage(im, 0, 0, 512, 512); uploadTex(maskTex, c); hasMask = 1; console.log('bloom: growth mask bound from ' + url); return; }
  }
}

// ---- per-layer reveal parameters (each layer independent) ----------------
const PARAM_DEFS = [
  { key: 'lag', min: 0, max: 0.9, label: 'lag (start)' },
  { key: 'speed', min: 0.4, max: 3.0, label: 'reveal speed' },
  { key: 'warp', min: 0, max: 1.2, label: 'edge warp' },
  { key: 'branch', min: 0, max: 1.5, label: 'branchiness' },
  { key: 'scale', min: 1.5, max: 12, label: 'pattern scale' },
  { key: 'alpha', min: 0.1, max: 1, label: 'opacity' },
  { key: 'edge', min: 0.02, max: 0.3, label: 'edge soft' },
  { key: 'seed', min: 0, max: 100, label: 'seed' },
];
const REVEAL_PRESET = {
  diffuse: { speed: 1.4, warp: 0.7, branch: 0.15, scale: 4, alpha: 0.7, edge: 0.12 },
  CA:      { speed: 1.5, warp: 0.6, branch: 0.40, scale: 7, alpha: 0.8, edge: 0.09 },
  branch:  { speed: 1.7, warp: 0.45, branch: 1.05, scale: 5, alpha: 0.88, edge: 0.06 },
  rect:    { speed: 1.6, warp: 0.2, branch: 0.45, scale: 9, alpha: 0.8, edge: 0.07 },
  fill:    { speed: 2.0, warp: 0.8, branch: 0.25, scale: 11, alpha: 0.85, edge: 0.1 },
};
const PARAMS = LAYERS.map((l, i) => ({ lag: i * 0.075, seed: i * 13.0, ...REVEAL_PRESET[l.grow] }));
const lp0 = new Float32Array(40), lp1 = new Float32Array(40);
function buildFlats() {
  PARAMS.forEach((p, i) => { lp0.set([p.lag, p.speed, p.warp, p.branch], i * 4); lp1.set([p.scale, p.alpha, p.edge, p.seed], i * 4); });
}
buildFlats();

// ---- live-field engines (toggleable modes alongside the stacked reveal) --
const FIELD_MODES = ['lenia', 'smoothlife', 'gameoflife', 'grayscott', 'voronoi', 'truchet', 'physarum', 'ltree', 'wfc', 'epicycles'];
const FIELD_LABEL = { stack: 'Stacked', lenia: 'Lenia', smoothlife: 'SmoothLife', gameoflife: 'Game of Life', grayscott: 'Gray-Scott', voronoi: 'Voronoi', truchet: 'Truchet', physarum: 'Physarum', ltree: 'L-Tree', wfc: 'WFC', epicycles: 'Epicycles' };
const fields = {
  lenia: new FieldSim(gl, { type: 'lenia', size: 256, R: 12, seed0: 0x1f65 }),
  smoothlife: new FieldSim(gl, { type: 'smoothlife', size: 256, R: 11 }),
  gameoflife: new FieldSim(gl, { type: 'gameoflife', size: 220 }),
  grayscott: new FieldSim(gl, { type: 'grayscott', size: 256 }),
  voronoi: new FieldSim(gl, { type: 'voronoi', size: 256 }),
  truchet: new FieldSim(gl, { type: 'truchet', size: 256 }),
  physarum: new Physarum(gl, { trail: 512, aw: 200 }),
  ltree: new LTree(gl, { size: 512 }),
  wfc: new WFC(gl, { size: 512, grid: 18 }),
  epicycles: new Epicycles(gl, { size: 512 }),
};
for (const f of Object.values(fields)) f._defaults = { ...f.params };   // snapshot for ⟲ reset
const MODES = ['stack', ...FIELD_MODES];
// URL slugs: /sandbox/<slug> deep-links a mode (e.g. /sandbox/game-of-life)
const MODE_SLUG = {}, SLUG_MODE = {};
for (const m of MODES) { const s = FIELD_LABEL[m].toLowerCase().replace(/\s+/g, '-'); MODE_SLUG[m] = s; SLUG_MODE[s] = m; }
const modeFromPath = () => { const m = location.pathname.match(/^\/sandbox\/([^/]+)/); return m && SLUG_MODE[m[1]] ? SLUG_MODE[m[1]] : null; };
let mode = modeFromPath() || 'stack';
let golMosh = true;    // Game of Life datamosh-over-texture toggle (default on)
let golMoshAmt = 0.0;  // datamosh strength (0..2.5), default off
const activeField = () => (mode === 'stack' ? null : fields[mode]);
function switchMode(m, push = true) {
  mode = m; const f = activeField(); if (f) f.seed(f.seed0 != null ? f.seed0 : state.seed);
  if (push) { try { history.replaceState(null, '', '/sandbox/' + MODE_SLUG[m]); } catch {} }
  renderParams();
}
addEventListener('popstate', () => { const m = modeFromPath(); if (m && m !== mode) switchMode(m, false); });

// ---- AI texture array (optional per-layer overrides) ---------------------
const has = new Float32Array(NTEX); let hasDirty = true;
const texArr = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D_ARRAY, texArr);
gl.texStorage3D(gl.TEXTURE_2D_ARRAY, Math.floor(Math.log2(TEXW)) + 1, gl.RGBA8, TEXW, TEXW, NTEX);
gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
const black = new Uint8Array(TEXW * TEXW * 4);
for (let i = 0; i < NTEX; i++) gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, TEXW, TEXW, 1, gl.RGBA, gl.UNSIGNED_BYTE, black);
gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
const scratch = document.createElement('canvas'); scratch.width = scratch.height = TEXW; const sctx = scratch.getContext('2d');
const tryImg = (url) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url; });
async function loadShellTextures() {
  let n = 0, manifest = null;
  try { const r = await fetch('lab/manifest.json'); if (r.ok) manifest = await r.json(); } catch {}
  for (let i = 0; i < NTEX; i++) {
    const nn = String(i).padStart(2, '0');
    const cands = manifest ? (manifest[i] ? [`lab/${manifest[i]}`] : []) : [`lab/${nn}_${LAYERS[i].slug}.png`, `lab/${nn}_${LAYERS[i].slug}.jpg`];
    for (const url of cands) { const img = await tryImg(url); if (img) { sctx.clearRect(0, 0, TEXW, TEXW); sctx.drawImage(img, 0, 0, TEXW, TEXW); gl.bindTexture(gl.TEXTURE_2D_ARRAY, texArr); gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, TEXW, TEXW, 1, gl.RGBA, gl.UNSIGNED_BYTE, scratch); gl.generateMipmap(gl.TEXTURE_2D_ARRAY); has[i] = 1; hasDirty = true; n++; break; } }
  }
  if (n) console.log(`bloom: bound ${n} AI texture(s)`);
}

// ---- state + HUD ---------------------------------------------------------
const state = { c: 0, playing: true, seed: Math.floor(Math.random() * 1e4), dim: 0, t0: performance.now() / 1000, last: performance.now() / 1000 };
function resize() { const dpr = Math.min(2, window.devicePixelRatio || 1); canvas.width = Math.floor(innerWidth * dpr); canvas.height = Math.floor(innerHeight * dpr); }
addEventListener('resize', resize); resize();
const phaseOf = (c) => Math.min(5.999, c * 6);

const legend = document.getElementById('legend');   // legend overlay removed; keep null-safe for stack-layer lighting
if (legend) legend.innerHTML = LAYERS.map((l, i) => `<li data-i="${i}"><i style="background:${l.color};color:${l.color}"></i>${String(i).padStart(2, '0')} ${l.name} <em style="opacity:.5">· ${l.grow}</em></li>`).join('');
const legendLis = legend ? [...legend.querySelectorAll('li')] : [];
const phName = document.getElementById('ph-name'), phNum = document.getElementById('ph-num');
const cVal = document.getElementById('c-val'), dimVal = document.getElementById('dim-val'), seedVal = document.getElementById('seed-val');
const scrub = document.getElementById('scrub'), bPlay = document.getElementById('b-play'), bSeed = document.getElementById('b-seed');
const bShare = document.getElementById('b-share'), bReset = document.getElementById('b-reset'), bCollapse = document.getElementById('b-collapse'), paramsPanel = document.getElementById('params');
const locks = {};   // `${mode}:${key}` → true keeps a param fixed when rolling
function setPlay(on) { state.playing = on; bPlay.textContent = on ? '❚❚' : '▶'; bPlay.title = on ? 'pause' : 'play'; }
function resetParams() {                                 // ⟲ reset: params back to this mode's defaults
  const f = activeField();
  if (f) {
    if (mode === 'ltree' && f.presetIndex >= 0) f.setPreset(f.presetIndex);
    else { if (f._defaults) Object.assign(f.params, f._defaults); if (mode === 'lenia' || mode === 'truchet') f._presetIdx = 0; f.seed(state.seed); if (f.finish) f.finish(); }
  } else { PARAMS[selLayer] = { lag: selLayer * 0.075, seed: selLayer * 13.0, ...REVEAL_PRESET[LAYERS[selLayer].grow] }; buildFlats(); }
  renderParams();
}
function showSeed() { if (document.activeElement !== seedVal) seedVal.value = state.seed.toString(16).padStart(4, '0'); }
function reseed() { state.seed = Math.floor(Math.random() * 1e4); showSeed(); }         // new seed number only (loop uses this)
// debounced rebuild for structural modes — leading + trailing, so a drag stays
// responsive but never rebuilds more than ~1/LIVE_MS (expensive WFC/L-tree solves)
let _liveTimer = 0, _liveLast = 0; const LIVE_MS = 110;
function _doRebuild() { _liveLast = performance.now(); const f = activeField(); if (!f) return; f.seed(state.seed); if (f.finish) f.finish(); }
function liveReseed() {
  const dt = performance.now() - _liveLast;
  clearTimeout(_liveTimer);
  if (dt >= LIVE_MS) _doRebuild();                                    // leading edge: apply at once
  else _liveTimer = setTimeout(_doRebuild, LIVE_MS - dt);             // trailing edge: settle after the last move
}
function roll() {                                                                        // ⚄ roll: randomise UNLOCKED params + new seed
  const f = activeField(), defs = f ? f.defs : PARAM_DEFS, params = f ? f.params : PARAMS[selLayer];
  for (const d of defs) { if (locks[mode + ':' + d.key]) continue; params[d.key] = d.min + Math.random() * (d.max - d.min); }
  reseed(); if (f) f.seed(state.seed); else buildFlats(); renderParams();
}
bPlay.addEventListener('click', () => setPlay(!state.playing));
bSeed.addEventListener('click', roll);
bReset.addEventListener('click', resetParams);
bShare.addEventListener('click', shareLink);
bCollapse.addEventListener('click', () => { const c = paramsPanel.classList.toggle('collapsed'); bCollapse.textContent = c ? '⤢' : '⤡'; });
if (innerWidth <= 720) { paramsPanel.classList.add('collapsed'); bCollapse.textContent = '⤢'; }   // mobile: start collapsed
scrub.addEventListener('input', () => { state.c = +scrub.value / 1000; setPlay(false); });
seedVal.addEventListener('change', () => { const v = parseInt(seedVal.value, 16); if (isFinite(v)) { state.seed = v; const f = activeField(); if (f) f.seed(v); } showSeed(); });
seedVal.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') seedVal.blur(); });
addEventListener('keydown', (e) => { if (/^(input|textarea|select)$/i.test(e.target.tagName)) return; if (e.key === ' ') { e.preventDefault(); setPlay(!state.playing); } else if (e.key.toLowerCase() === 'r') roll(); });
showSeed();
function updateHud(c) {
  const pid = Math.min(5, Math.floor(phaseOf(c)));
  phName.textContent = PHASES[pid]; phNum.textContent = `${pid} / 5`;
  cVal.textContent = c.toFixed(2); dimVal.textContent = state.dim;
  if (!scrub.matches(':active')) scrub.value = String(Math.round(c * 1000));
  legendLis.forEach((li, i) => li.classList.toggle('on', c >= PARAMS[i].lag));   // lit once this layer has begun revealing
}

// ---- per-layer tuning panel ----------------------------------------------
const paramsEl = document.getElementById('params-body');
let selLayer = 3;
const slider = (d, p) => { const v = p[d.key], step = (d.max - d.min) / 200, lk = locks[mode + ':' + d.key]; return `<div class="prow"><label><span class="plock${lk ? ' on' : ''}" data-lock="${d.key}" title="lock — keep on roll">${lk ? '🔒' : '🔓'}</span>${d.label} <b>${(+v).toFixed(3)}</b></label><input type="range" data-k="${d.key}" min="${d.min}" max="${d.max}" step="${step}" value="${v}"></div>`; };
function wireLocks() { paramsEl.querySelectorAll('.plock').forEach((el) => el.addEventListener('click', () => { const k = mode + ':' + el.dataset.lock; locks[k] = !locks[k]; el.classList.toggle('on', locks[k]); el.textContent = locks[k] ? '🔒' : '🔓'; })); }
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function renderParams() {
  const modeBtn = `<div class="prow" style="margin-bottom:12px"><select id="p-mode" class="mode-select" title="jump to a mode">${MODES.map((m) => `<option value="${m}"${m === mode ? ' selected' : ''}>${FIELD_LABEL[m]}</option>`).join('')}</select></div>`;
  const fld = activeField();
  if (fld) {
    const pr = fld.params;
    const golBtn = mode === 'gameoflife'
      ? `<div class="prow-btns"><button id="p-mosh">datamosh: ${golMosh ? 'on' : 'off'}</button></div>` +
        (golMosh ? `<div class="prow"><label>mosh strength <b>${golMoshAmt.toFixed(2)}</b></label><input type="range" id="p-moshamt" min="0" max="2.5" step="0.01" value="${golMoshAmt}"></div>` : '')
      : '';
    // type-specific preset selector (shown right under the type dropdown)
    const ltPreset = mode === 'ltree' ? `<div class="prow-btns"><button id="p-preset">preset: ${fld.presetIndex >= 0 ? LTREE_PRESETS[fld.presetIndex].name : 'Custom'}</button></div>` : '';
    const wfcExtra = mode === 'wfc' ? `<div class="prow-btns"><button id="p-style">tileset: ${WFC_STYLES[fld.style]}</button></div>` : '';
    const leniaExtra = mode === 'lenia' ? `<div class="prow-btns"><button id="p-lpreset">preset: ${LENIA_PRESETS[fld._presetIdx || 0].name}</button></div>` : '';
    const truchetExtra = mode === 'truchet' ? `<div class="prow-btns"><button id="p-tpreset">preset: ${TRUCHET_PRESETS[fld._presetIdx || 0].name}</button></div>` : '';
    const physExtra = mode === 'physarum' ? `<div class="prow-btns"><button id="p-ppreset">preset: ${PHYSARUM_PRESETS[fld._presetIdx || 0].name}</button></div>` : '';
    const presetRow = leniaExtra + truchetExtra + physExtra + wfcExtra + ltPreset;
    const ltCustom = mode === 'ltree'
      ? `<div class="prow"><label>axiom</label><input id="lt-ax" type="text" value="${esc(fld.lsys.axiom)}" style="width:100%;background:rgba(255,255,255,.05);color:var(--fg);border:1px solid rgba(255,255,255,.14);border-radius:4px;padding:4px;font:inherit"></div>` +
        `<div class="prow"><label>rules · one per line (F=FF+[+F-F])</label><textarea id="lt-rules" rows="3" style="width:100%;background:rgba(255,255,255,.05);color:var(--fg);border:1px solid rgba(255,255,255,.14);border-radius:4px;padding:4px;font:inherit;resize:vertical">${esc(fld.lsys.rules)}</textarea></div>` +
        `<div class="prow-btns"><button id="lt-apply">apply custom</button></div>`
      : '';
    paramsEl.innerHTML = modeBtn + presetRow + `<div class="psub" style="margin-top:2px">${mode === 'grayscott' ? 'reaction–diffusion' : mode === 'truchet' ? 'tiling' : mode === 'ltree' ? 'L-system' : mode === 'wfc' ? 'wave function collapse' : mode === 'epicycles' ? 'fourier · pendulums' : mode === 'physarum' ? 'agent slime mold' : 'continuous CA · living field'}</div>` +
      fld.defs.map((d) => slider(d, pr)).join('') + golBtn + ltCustom;
    wireLocks();
    paramsEl.querySelectorAll('input[type=range]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const k = inp.dataset.k; if (k) pr[k] = +inp.value;
        inp.closest('.prow').querySelector('b').textContent = (+inp.value).toFixed(k ? 3 : 2);
        // structural modes must rebuild to reflect the change live (throttled per frame)
        if (mode === 'ltree' || mode === 'wfc') liveReseed();
        else if (mode === 'epicycles' && (k === 'shape' || k === 'tiles')) liveReseed();
      });
    });
    if (mode === 'gameoflife') {
      paramsEl.querySelector('#p-mosh').addEventListener('click', () => { golMosh = !golMosh; renderParams(); });
      const ms = paramsEl.querySelector('#p-moshamt'); if (ms) ms.addEventListener('input', () => { golMoshAmt = +ms.value; });
    }
    if (mode === 'ltree') {
      paramsEl.querySelector('#p-preset').addEventListener('click', () => { fld.setPreset((fld.presetIndex < 0 ? 0 : fld.presetIndex) + 1); renderParams(); });
      paramsEl.querySelector('#lt-apply').addEventListener('click', () => { fld.applyCustom(document.getElementById('lt-ax').value, document.getElementById('lt-rules').value); renderParams(); });
    }
    if (mode === 'wfc') paramsEl.querySelector('#p-style').addEventListener('click', () => { fld.setStyle(fld.style + 1); renderParams(); });
    if (mode === 'lenia') paramsEl.querySelector('#p-lpreset').addEventListener('click', () => {
      const i = ((fld._presetIdx || 0) + 1) % LENIA_PRESETS.length, P = LENIA_PRESETS[i];
      fld._presetIdx = i; fld.params.mu = P.mu; fld.params.sigma = P.sigma; fld.params.dt = P.dt; fld.params.muK = P.muK; fld.params.sigK = P.sigK;
      fld.seed0 = P.seed; fld.seed(P.seed); renderParams();
    });
    if (mode === 'truchet') paramsEl.querySelector('#p-tpreset').addEventListener('click', () => {
      const i = ((fld._presetIdx || 0) + 1) % TRUCHET_PRESETS.length, P = TRUCHET_PRESETS[i];
      fld._presetIdx = i; fld.params.scale = P.scale; fld.params.width = P.width; fld.params.curve = P.curve; fld.params.speed = P.speed; fld.params.contrast = P.contrast;
      renderParams();
    });
    if (mode === 'physarum') paramsEl.querySelector('#p-ppreset').addEventListener('click', () => {
      const i = ((fld._presetIdx || 0) + 1) % PHYSARUM_PRESETS.length, P = PHYSARUM_PRESETS[i];
      fld._presetIdx = i; fld.params.sensorAngle = P.sensorAngle; fld.params.sensorDist = P.sensorDist; fld.params.turn = P.turn; fld.params.step = P.step; fld.params.decay = P.decay;
      fld.seed(state.seed); renderParams();
    });
  } else {
    const L = LAYERS[selLayer], p = PARAMS[selLayer];
    const layerSel = `<div class="prow" style="margin-bottom:8px"><select id="p-layer" class="mode-select" style="font-size:12px;text-transform:none;letter-spacing:.04em">${LAYERS.map((l, i) => `<option value="${i}"${i === selLayer ? ' selected' : ''}>${String(i).padStart(2, '0')} · ${l.name}</option>`).join('')}</select></div>`;
    paramsEl.innerHTML = modeBtn + layerSel + `<div class="psub" style="margin-top:2px">growth: ${L.grow} · drag to tune</div>` +
      PARAM_DEFS.map((d) => slider(d, p)).join('') + `<div class="prow-btns"><button id="p-export">export</button></div>`;
    wireLocks();
    paramsEl.querySelector('#p-layer').addEventListener('change', (e) => { selLayer = +e.target.value; renderParams(); });
    paramsEl.querySelectorAll('input[type=range]').forEach((inp) => inp.addEventListener('input', () => { p[inp.dataset.k] = +inp.value; inp.closest('.prow').querySelector('b').textContent = (+inp.value).toFixed(3); buildFlats(); }));
    paramsEl.querySelector('#p-export').addEventListener('click', () => { const j = JSON.stringify(PARAMS, null, 2); if (navigator.clipboard) navigator.clipboard.writeText(j).catch(() => {}); console.log('bloom params (copied):\n' + j); });
  }
  paramsEl.querySelector('#p-mode').addEventListener('change', (e) => switchMode(e.target.value));
}

// ---- shareable config via URL (?c=<base64 json>) -------------------------
function encodeConfig() {
  const f = activeField(), cfg = { m: mode, s: state.seed };
  if (f) {
    cfg.p = { ...f.params };
    if (mode === 'lenia' || mode === 'truchet' || mode === 'physarum') cfg.pi = f._presetIdx || 0;
    else if (mode === 'wfc') cfg.st = f.style;
    else if (mode === 'ltree') { cfg.pi = f.presetIndex; cfg.ls = { a: f.lsys.axiom, r: f.lsys.rules, d: f.lsys.draw }; }
    else if (mode === 'gameoflife') { cfg.gm = golMosh ? 1 : 0; cfg.ga = golMoshAmt; }
  } else { cfg.l = selLayer; cfg.p = { ...PARAMS[selLayer] }; }
  return btoa(JSON.stringify(cfg));
}
function shareLink() {
  const url = `${location.origin}/sandbox/${MODE_SLUG[mode]}?c=${encodeConfig()}`;
  const done = () => { bShare.textContent = 'copied ✓'; setTimeout(() => { bShare.textContent = 'share ⧉'; }, 1400); };
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => prompt('copy link', url)); else prompt('copy link', url);
}
function applyConfig(b64) {
  let cfg; try { cfg = JSON.parse(atob(b64)); } catch { return; }
  if (!cfg || !MODES.includes(cfg.m)) return;
  mode = cfg.m; if (typeof cfg.s === 'number') state.seed = cfg.s; showSeed();
  const f = activeField();
  if (f) {
    if (cfg.p) Object.assign(f.params, cfg.p);
    if (mode === 'ltree' && cfg.ls) { f.lsys = { axiom: cfg.ls.a, rules: cfg.ls.r, draw: cfg.ls.d || 'FG' }; f.presetIndex = cfg.pi != null ? cfg.pi : -1; }
    else if ((mode === 'lenia' || mode === 'truchet' || mode === 'physarum') && cfg.pi != null) f._presetIdx = cfg.pi;
    if (mode === 'wfc' && cfg.st != null) f.style = cfg.st;
    if (mode === 'gameoflife') { if (cfg.gm != null) golMosh = !!cfg.gm; if (cfg.ga != null) golMoshAmt = cfg.ga; }
    f.seed(state.seed);
  } else if (cfg.l != null) { selLayer = Math.max(0, Math.min(LAYERS.length - 1, cfg.l)); if (cfg.p) Object.assign(PARAMS[selLayer], cfg.p); buildFlats(); }
}

legendLis.forEach((li, i) => li.addEventListener('click', () => { selLayer = i; legendLis.forEach((x, k) => x.classList.toggle('sel', k === i)); if (!activeField()) renderParams(); }));
const sharedCfg = new URLSearchParams(location.search).get('c');
if (sharedCfg) applyConfig(sharedCfg);
legendLis[selLayer]?.classList.add('sel');
renderParams();
try { history.replaceState(null, '', '/sandbox/' + MODE_SLUG[mode]); } catch {}   // canonical URL on load

// ---- loop ----------------------------------------------------------------
gl.useProgram(prog);
gl.uniform1i(U.uTex, 0); gl.uniform1i(U.uMaskTex, 2); gl.uniform1i(U.uFieldTex, 4);
loadShellTextures();
loadMask();

function frame() {
  const now = performance.now() / 1000;
  const dt = Math.min(0.05, now - state.last); state.last = now;
  if (state.playing) { state.c += dt / CYCLE_DUR; if (state.c >= 1) { state.c -= 1; state.dim++; reseed(); } }
  const c = state.c;

  const fld = activeField();
  if (fld && state.playing) fld.step(hasMask ? maskTex : null, hasMask);

  gl.useProgram(prog);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.bindVertexArray(vao);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, texArr);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, maskTex);
  gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, (fld || fields.lenia).texture);
  if (hasDirty) { gl.uniform1fv(U.uHas, has); hasDirty = false; }
  gl.uniform2f(U.uRes, canvas.width, canvas.height);
  gl.uniform1f(U.uTime, now - state.t0);
  gl.uniform1f(U.uSeed, state.seed);
  gl.uniform1f(U.uPhase, phaseOf(c));
  gl.uniform1f(U.uReveal, c);
  gl.uniform1f(U.uHasMask, hasMask);
  gl.uniform1f(U.uMode, fld ? 1 : 0);
  gl.uniform1f(U.uFieldGain, mode === 'grayscott' ? 2.6 : mode === 'physarum' ? 2.0 : 1.0);
  gl.uniform1f(U.uGolMosh, (mode === 'gameoflife' && golMosh) ? 1 : 0);
  gl.uniform1f(U.uGolMoshAmt, golMoshAmt);
  gl.uniform1f(U.uFieldRGB, mode === 'wfc' ? 1 : 0);
  gl.uniform4fv(U.uLP0, lp0);
  gl.uniform4fv(U.uLP1, lp1);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  updateHud(c);
  window.__bloomOk = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
