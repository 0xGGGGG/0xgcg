// ---------------------------------------------------------------------------
// Lenia — continuous cellular automaton (Bert Wang-Chak Chan). A ping-pong GLSL
// sim: convolve the field A with a soft radial kernel K → potential U, apply a
// bell growth function G, update A ← clip(A + Δt·G(U), 0,1). Smooth lifelike
// organisms. Mask-limited (white = alive zone). Shares the bloom's GL context;
// exposes `.texture` (current state, R channel = occupancy) to the render pass.
//   G(U) = 2·exp(−(U−μ)²/2σ²) − 1 ;  K(r) = exp(−(r/R−μK)²/2σK²)
// ---------------------------------------------------------------------------

const LVERT = `#version 300 es
const vec2 V[3] = vec2[3](vec2(-1.0,-1.0), vec2(3.0,-1.0), vec2(-1.0,3.0));
void main(){ gl_Position = vec4(V[gl_VertexID], 0.0, 1.0); }`;

const lsim = (R) => `#version 300 es
precision highp float;
out vec4 o;
uniform sampler2D uPrev;
uniform sampler2D uMask;
uniform float uHasMask;
uniform vec2 uRes;
uniform float uMu, uSigma, uDt, uMuK, uSigK;
const int R = ${R};
void main(){
  vec2 tc = gl_FragCoord.xy / uRes;
  vec2 px = 1.0 / uRes;
  float sumKA = 0.0, sumK = 0.0;
  for (int dy=-R; dy<=R; dy++) for (int dx=-R; dx<=R; dx++) {
    float rr = sqrt(float(dx*dx + dy*dy)) / float(R);
    if (rr > 1.0) continue;
    float k = exp(-pow(rr - uMuK, 2.0) / (2.0 * uSigK * uSigK));
    float a = texture(uPrev, tc + vec2(float(dx),float(dy))*px).r;
    sumKA += k * a; sumK += k;
  }
  float U = sumKA / max(sumK, 1e-6);
  float G = 2.0 * exp(-pow(U - uMu, 2.0) / (2.0 * uSigma * uSigma)) - 1.0;
  float A = clamp(texture(uPrev, tc).r + uDt * G, 0.0, 1.0);
  if (uHasMask > 0.5) { vec4 m = texture(uMask, tc); float ml = max(max(m.r,m.g),m.b) * (m.a<1.0?m.a:1.0); A *= step(0.5, ml); }
  o = vec4(A, A, A, 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error('lenia compile:\n' + gl.getShaderInfoLog(s)); throw new Error('lenia shader'); }
  return s;
}

export class Lenia {
  constructor(gl, { size = 256, R = 12 } = {}) {
    this.gl = gl; this.size = size; this.R = R;
    this.params = { mu: 0.16, sigma: 0.030, dt: 0.10, muK: 0.5, sigK: 0.15 }; // wider σ → robust, spreading
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, LVERT));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, lsim(R)));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error('lenia link:\n' + gl.getProgramInfoLog(p)); throw new Error('lenia link'); }
    this.prog = p;
    const L = (n) => gl.getUniformLocation(p, n);
    this.U = { prev: L('uPrev'), mask: L('uMask'), hasMask: L('uHasMask'), res: L('uRes'), mu: L('uMu'), sigma: L('uSigma'), dt: L('uDt'), muK: L('uMuK'), sigK: L('uSigK') };
    this.vao = gl.createVertexArray();
    this.a = this._target(); this.b = this._target();
    this.seed(1);
  }

  _target() {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.size, this.size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return { tex: t, fb };
  }

  // seed soft random blobs near the centre (Lenia needs structured initial mass)
  seed(seed) {
    const gl = this.gl, S = this.size;
    const c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, S, S);
    let s = (seed >>> 0) || 1; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    // faint full-field noise floor so activity can spread, not just die
    for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(255,255,255,${0.05 + rnd() * 0.15})`; x.fillRect((rnd() * S) | 0, (rnd() * S) | 0, 2, 2); }
    // a big central reservoir of mass + a few satellite blobs
    for (let i = 0; i < 10; i++) {
      const cx = S * (0.35 + rnd() * 0.3), cy = S * (0.35 + rnd() * 0.3), rad = this.R * (2.0 + rnd() * 4.0);
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.fill();
    }
    for (const t of [this.a, this.b]) { gl.bindTexture(gl.TEXTURE_2D, t.tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, c); }
  }

  step(maskTex, hasMask, n = 1) {
    const gl = this.gl, pr = this.params;
    gl.useProgram(this.prog); gl.bindVertexArray(this.vao);
    gl.viewport(0, 0, this.size, this.size);
    gl.uniform1i(this.U.prev, 0); gl.uniform1i(this.U.mask, 2);
    gl.uniform2f(this.U.res, this.size, this.size);
    gl.uniform1f(this.U.mu, pr.mu); gl.uniform1f(this.U.sigma, pr.sigma); gl.uniform1f(this.U.dt, pr.dt);
    gl.uniform1f(this.U.muK, pr.muK); gl.uniform1f(this.U.sigK, pr.sigK);
    gl.uniform1f(this.U.hasMask, hasMask ? 1 : 0);
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
