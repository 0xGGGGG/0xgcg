// ---------------------------------------------------------------------------
// FieldSim — generalized ping-pong "living field" engine for the bloom lab.
// One scaffold, three continuous/RD cellular automata, all GLSL (→ TD-native),
// all mask-gated (white = alive zone). The display field is always the R channel.
//
//   lenia      — continuous CA: kernel convolve → bell growth → clip
//   smoothlife — disk(fill)+ring(neighbourhood) averages → smooth Life transition
//                (a 2-neighbourhood MNCA; reliable lifelike gliders/organisms)
//   grayscott  — reaction–diffusion (U,V): spots/stripes/worms/mitosis
//
// Param uniforms are named u_<key> to match the params object generically.
// ---------------------------------------------------------------------------

const VERT = `#version 300 es
const vec2 V[3] = vec2[3](vec2(-1.0,-1.0), vec2(3.0,-1.0), vec2(-1.0,3.0));
void main(){ gl_Position = vec4(V[gl_VertexID], 0.0, 1.0); }`;

const HEAD = `#version 300 es
precision highp float;
out vec4 o;
uniform sampler2D uPrev;
uniform sampler2D uMask;
uniform float uHasMask;
uniform float uTime;
uniform vec2 uRes;
`;

const SHADERS = {
  lenia: (R) => HEAD + `
uniform float u_mu, u_sigma, u_dt, u_muK, u_sigK;
const int R = ${R};
void main(){
  vec2 tc = gl_FragCoord.xy/uRes, px = 1.0/uRes;
  float sumKA=0.0, sumK=0.0;
  for (int dy=-R; dy<=R; dy++) for (int dx=-R; dx<=R; dx++) {
    float rr = sqrt(float(dx*dx+dy*dy))/float(R); if (rr>1.0) continue;
    float k = exp(-pow(rr-u_muK,2.0)/(2.0*u_sigK*u_sigK));
    sumKA += k*texture(uPrev, tc+vec2(float(dx),float(dy))*px).r; sumK += k;
  }
  float U = sumKA/max(sumK,1e-6);
  float G = 2.0*exp(-pow(U-u_mu,2.0)/(2.0*u_sigma*u_sigma)) - 1.0;
  float A = clamp(texture(uPrev,tc).r + u_dt*G, 0.0, 1.0);
  if (uHasMask>0.5){ vec4 m=texture(uMask,tc); A *= step(0.5, max(max(m.r,m.g),m.b)*(m.a<1.0?m.a:1.0)); }
  o = vec4(A, A, A, 1.0);
}`,

  smoothlife: (R) => HEAD + `
uniform float u_b1, u_b2, u_d1, u_d2, u_dt;
const int R = ${R};
const float aN = 0.028, aM = 0.147;
float sgm(float x, float a, float al){ return 1.0/(1.0+exp(-(x-a)*4.0/al)); }
void main(){
  vec2 tc = gl_FragCoord.xy/uRes, px = 1.0/uRes;
  float ri = float(R)/3.0;
  float m=0.0, mc=0.0, n=0.0, nc=0.0;
  for (int dy=-R; dy<=R; dy++) for (int dx=-R; dx<=R; dx++) {
    float rr = sqrt(float(dx*dx+dy*dy)); if (rr>float(R)+0.5) continue;
    float a = texture(uPrev, tc+vec2(float(dx),float(dy))*px).r;
    if (rr <= ri){ m+=a; mc+=1.0; } else { n+=a; nc+=1.0; }
  }
  m/=max(mc,1.0); n/=max(nc,1.0);
  float sm = sgm(m,0.5,aM);
  float b = mix(u_b1,u_d1,sm), d = mix(u_b2,u_d2,sm);
  float s = sgm(n,b,aN) * (1.0 - sgm(n,d,aN));     // birth/death interval on neighbourhood
  float A = clamp(texture(uPrev,tc).r + u_dt*(2.0*s-1.0), 0.0, 1.0);
  if (uHasMask>0.5){ vec4 mk=texture(uMask,tc); A *= step(0.5, max(max(mk.r,mk.g),mk.b)*(mk.a<1.0?mk.a:1.0)); }
  o = vec4(A, A, A, 1.0);
}`,

  truchet: () => HEAD + `
uniform float u_scale, u_width, u_curve, u_speed, u_contrast;
float h11(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec2 uv = gl_FragCoord.xy/uRes;
  vec2 g = uv*u_scale; vec2 id = floor(g), f = fract(g);
  float h = h11(id + floor(uTime*0.02*u_speed));
  if (h > 0.5) f.x = 1.0 - f.x;                 // random tile orientation
  float arc = min(abs(length(f) - 0.5), abs(length(f - vec2(1.0)) - 0.5));   // two quarter-circle arcs
  float diag = abs(f.x - f.y) * 0.70710678;     // straight diagonal
  float d = mix(diag, arc, u_curve);
  float A = clamp(smoothstep(u_width, 0.0, d) * u_contrast, 0.0, 1.0);
  if (uHasMask>0.5){ vec4 m=texture(uMask, uv); A *= step(0.5, max(max(m.r,m.g),m.b)*(m.a<1.0?m.a:1.0)); }
  o = vec4(A, A, A, 1.0);
}`,

  gameoflife: () => HEAD + `
uniform float u_sLo, u_sHi, u_bLo, u_bHi;     // survive/birth ranges (Conway = 2..3 / 3..3)
void main(){
  vec2 tc = gl_FragCoord.xy/uRes, px = 1.0/uRes;
  float n = 0.0;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ if(x==0&&y==0) continue; n += step(0.5, texture(uPrev, fract(tc+vec2(float(x),float(y))*px)).r); }
  float alive = step(0.5, texture(uPrev, tc).r);
  float live = alive>0.5 ? ((n>=u_sLo-0.5 && n<=u_sHi+0.5)?1.0:0.0) : ((n>=u_bLo-0.5 && n<=u_bHi+0.5)?1.0:0.0);
  if (uHasMask>0.5){ vec4 m=texture(uMask,tc); live *= step(0.5, max(max(m.r,m.g),m.b)*(m.a<1.0?m.a:1.0)); }
  o = vec4(live, live, live, 1.0);
}`,

  voronoi: () => HEAD + `
uniform float u_scale, u_jitter, u_edge, u_speed, u_contrast;
vec2 h2(vec2 p){ p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }
void main(){
  vec2 uv = gl_FragCoord.xy/uRes;
  vec2 g = uv*u_scale; vec2 i=floor(g), f=fract(g);
  float f1=8.0, f2=8.0;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec2 o=vec2(float(x),float(y));
    vec2 pt = 0.5 + u_jitter*0.5*sin(uTime*0.03*u_speed + 6.2831*h2(i+o));
    float d = length(o+pt-f);
    if(d<f1){ f2=f1; f1=d; } else if(d<f2){ f2=d; }
  }
  float edge = smoothstep(u_edge,0.0,f2-f1);     // glowing cell walls
  float body = smoothstep(0.8,0.0,f1)*0.35;       // cell interior
  float A = clamp((edge+body)*u_contrast, 0.0, 1.0);
  if (uHasMask>0.5){ vec4 m=texture(uMask, uv); A *= step(0.5, max(max(m.r,m.g),m.b)*(m.a<1.0?m.a:1.0)); }
  o = vec4(A, A, A, 1.0);
}`,

  grayscott: () => HEAD + `
uniform float u_f, u_k, u_Du, u_Dv, u_dt;
void main(){
  vec2 tc = gl_FragCoord.xy/uRes, px = 1.0/uRes;
  vec4 c = texture(uPrev, tc);
  float V = c.r, U = c.g;                          // state: R=V, G=U
  vec2 s = vec2(0.0);                              // laplacian of (V,U)
  s += -1.00 * vec2(V,U);
  s += 0.20 * (texture(uPrev,tc+vec2(px.x,0)).rg + texture(uPrev,tc-vec2(px.x,0)).rg + texture(uPrev,tc+vec2(0,px.y)).rg + texture(uPrev,tc-vec2(0,px.y)).rg);
  s += 0.05 * (texture(uPrev,tc+px).rg + texture(uPrev,tc-px).rg + texture(uPrev,tc+vec2(px.x,-px.y)).rg + texture(uPrev,tc+vec2(-px.x,px.y)).rg);
  float uvv = U*V*V;
  float Un = U + (u_Du*s.y - uvv + u_f*(1.0-U))*u_dt;
  float Vn = V + (u_Dv*s.x + uvv - (u_f+u_k)*V)*u_dt;
  if (uHasMask>0.5){ vec4 m=texture(uMask,tc); float g=step(0.5, max(max(m.r,m.g),m.b)*(m.a<1.0?m.a:1.0)); Vn*=g; Un=mix(1.0,Un,g); }
  o = vec4(clamp(Vn,0.0,1.0), clamp(Un,0.0,1.0), 0.0, 1.0);
}`,
};

const DEFAULTS = {
  lenia:      { mu: 0.245, sigma: 0.021, dt: 0.068, muK: 0.372, sigK: 0.170 },
  smoothlife: { b1: 0.257, b2: 0.336, d1: 0.330, d2: 0.549, dt: 0.30 },
  grayscott:  { f: 0.017, k: 0.051, Du: 0.921, Dv: 0.301, dt: 0.450 },
  voronoi:    { scale: 9.175, jitter: 0.590, edge: 0.010, speed: 1.275, contrast: 1.940 },
  truchet:    { scale: 15.495, width: 0.111, curve: 1.0, speed: 1.780, contrast: 0.690 },
  gameoflife: { sLo: 1.64, sHi: 3, bLo: 3, bHi: 3 },
};
export const FIELD_DEFS = {
  lenia: [
    { key: 'mu', min: 0.05, max: 0.35, label: 'growth μ' }, { key: 'sigma', min: 0.005, max: 0.06, label: 'growth σ' },
    { key: 'dt', min: 0.02, max: 0.3, label: 'Δt' }, { key: 'muK', min: 0.1, max: 0.9, label: 'kernel μ' }, { key: 'sigK', min: 0.05, max: 0.35, label: 'kernel σ' },
  ],
  smoothlife: [
    { key: 'b1', min: 0.0, max: 0.5, label: 'birth lo' }, { key: 'b2', min: 0.1, max: 0.6, label: 'birth hi' },
    { key: 'd1', min: 0.2, max: 0.6, label: 'death lo' }, { key: 'd2', min: 0.3, max: 0.8, label: 'death hi' }, { key: 'dt', min: 0.05, max: 0.6, label: 'Δt' },
  ],
  grayscott: [
    { key: 'f', min: 0.01, max: 0.09, label: 'feed f' }, { key: 'k', min: 0.04, max: 0.07, label: 'kill k' },
    { key: 'Du', min: 0.3, max: 1.4, label: 'diffuse U' }, { key: 'Dv', min: 0.2, max: 0.9, label: 'diffuse V' }, { key: 'dt', min: 0.4, max: 1.4, label: 'Δt' },
  ],
  voronoi: [
    { key: 'scale', min: 3, max: 16, label: 'cell count' }, { key: 'jitter', min: 0, max: 1, label: 'jitter' },
    { key: 'edge', min: 0.01, max: 0.2, label: 'wall width' }, { key: 'speed', min: 0, max: 3, label: 'drift speed' }, { key: 'contrast', min: 0.5, max: 2.5, label: 'contrast' },
  ],
  truchet: [
    { key: 'scale', min: 3, max: 24, label: 'tile count' }, { key: 'width', min: 0.02, max: 0.3, label: 'line width' },
    { key: 'curve', min: 0, max: 1, label: 'arc ↔ diagonal' }, { key: 'speed', min: 0, max: 4, label: 'reshuffle' }, { key: 'contrast', min: 0.5, max: 2.5, label: 'contrast' },
  ],
  gameoflife: [
    { key: 'sLo', min: 0, max: 8, label: 'survive ≥' }, { key: 'sHi', min: 0, max: 8, label: 'survive ≤' },
    { key: 'bLo', min: 0, max: 8, label: 'birth ≥' }, { key: 'bHi', min: 0, max: 8, label: 'birth ≤' },
  ],
};
const STEPS = { lenia: 2, smoothlife: 2, grayscott: 10, voronoi: 1, truchet: 1, gameoflife: 1 };

function compile(gl, type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error('field compile:\n' + gl.getShaderInfoLog(s)); throw new Error('field shader'); } return s; }

export class FieldSim {
  constructor(gl, { type = 'lenia', size = 256, R = 12, seed0 = null } = {}) {
    this.seed0 = seed0;   // fixed default seed (reproducible pattern) or null = random
    this.gl = gl; this.type = type; this.size = size; this.R = R;
    this.params = { ...DEFAULTS[type] };
    this.defs = FIELD_DEFS[type];
    this.steps = STEPS[type];
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, SHADERS[type](R)));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error('field link:\n' + gl.getProgramInfoLog(p)); throw new Error('field link'); }
    this.prog = p;
    this.U = { prev: gl.getUniformLocation(p, 'uPrev'), mask: gl.getUniformLocation(p, 'uMask'), hasMask: gl.getUniformLocation(p, 'uHasMask'), res: gl.getUniformLocation(p, 'uRes'), time: gl.getUniformLocation(p, 'uTime') };
    this.frame = 0;
    this.pU = {}; for (const d of this.defs) this.pU[d.key] = gl.getUniformLocation(p, 'u_' + d.key);
    this.vao = gl.createVertexArray();
    this.a = this._target(); this.b = this._target();
    this.seed(seed0 != null ? seed0 : 1);
  }

  _target() {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.size, this.size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return { tex: t, fb };
  }

  seed(seed) {
    const gl = this.gl, S = this.size;
    const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
    let s = (seed >>> 0) || 1; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    if (this.type === 'gameoflife') {
      x.fillStyle = '#000'; x.fillRect(0, 0, S, S);                          // ~28% random live cells
      const im = x.getImageData(0, 0, S, S);
      for (let i = 0; i < S * S; i++) { const v = rnd() < 0.28 ? 255 : 0; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
      x.putImageData(im, 0, 0);
    } else if (this.type === 'grayscott') {
      x.fillStyle = '#00ff00'; x.fillRect(0, 0, S, S);                       // U=1 (G), V=0 (R)
      for (let i = 0; i < 24; i++) { const r = 4 + rnd() * 8; x.fillStyle = 'rgba(255,128,0,1)'; x.beginPath(); x.arc(S * (0.2 + rnd() * 0.6), S * (0.2 + rnd() * 0.6), r, 0, 6.2832); x.fill(); }
    } else {
      x.fillStyle = '#000'; x.fillRect(0, 0, S, S);
      for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(255,255,255,${0.05 + rnd() * 0.2})`; x.fillRect((rnd() * S) | 0, (rnd() * S) | 0, 2, 2); }
      for (let i = 0; i < 10; i++) { const rad = this.R * (1.5 + rnd() * 4.0), cx = S * (0.3 + rnd() * 0.4), cy = S * (0.3 + rnd() * 0.4); const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rad, 0, 6.2832); x.fill(); }
    }
    for (const t of [this.a, this.b]) { gl.bindTexture(gl.TEXTURE_2D, t.tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, c); }
  }

  step(maskTex, hasMask, n = this.steps) {
    const gl = this.gl;
    gl.useProgram(this.prog); gl.bindVertexArray(this.vao); gl.viewport(0, 0, this.size, this.size);
    gl.uniform1i(this.U.prev, 0); gl.uniform1i(this.U.mask, 2); gl.uniform2f(this.U.res, this.size, this.size);
    gl.uniform1f(this.U.hasMask, hasMask ? 1 : 0);
    gl.uniform1f(this.U.time, this.frame++);
    for (const d of this.defs) gl.uniform1f(this.pU[d.key], this.params[d.key]);
    if (maskTex) { gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, maskTex); }
    for (let i = 0; i < n; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.b.fb);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.a.tex);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const t = this.a; this.a = this.b; this.b = t;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  get texture() { return this.a.tex; }
}
