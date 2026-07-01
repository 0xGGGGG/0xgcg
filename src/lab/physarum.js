// ---------------------------------------------------------------------------
// Physarum — GPU agent slime-mold. Thousands of agents sense the pheromone trail
// at three points, turn toward the strongest, step forward and deposit; the trail
// diffuses + decays. Emergent transport networks. Three passes/step (move,
// deposit-as-points, diffuse). Conforms to { texture, params, defs, step, seed }.
// Needs EXT_color_buffer_float (float agent state); disables gracefully if absent.
// ---------------------------------------------------------------------------

// Physarum parameter regimes (sensor angle/dist, turn, step, decay) — distinct
// slime-mold morphologies after Jones 2010 + community tunings.
export const PHYSARUM_PRESETS = [
  { name: 'Network',  sensorAngle: 22, sensorDist: 0.012, turn: 18, step: 0.0022, decay: 0.94 },
  { name: 'Filament', sensorAngle: 10, sensorDist: 0.022, turn: 8,  step: 0.0045, decay: 0.90 },
  { name: 'Mesh',     sensorAngle: 35, sensorDist: 0.007, turn: 32, step: 0.0014, decay: 0.965 },
  { name: 'Cells',    sensorAngle: 48, sensorDist: 0.030, turn: 42, step: 0.0020, decay: 0.92 },
  { name: 'Vortex',   sensorAngle: 18, sensorDist: 0.016, turn: 6,  step: 0.0032, decay: 0.885 },
  { name: 'Coral',    sensorAngle: 28, sensorDist: 0.006, turn: 24, step: 0.0011, decay: 0.975 },
];

const QUAD_V = `#version 300 es
const vec2 V[3]=vec2[3](vec2(-1.0,-1.0),vec2(3.0,-1.0),vec2(-1.0,3.0));
void main(){ gl_Position=vec4(V[gl_VertexID],0.0,1.0); }`;

const MOVE_F = `#version 300 es
precision highp float; out vec4 o;
uniform sampler2D uAgents, uTrail;
uniform vec2 uAgentRes;
uniform float uSensorAngle, uSensorDist, uTurn, uStep, uSeedf;
float hash(vec2 p){ p=fract(p*vec2(127.1,311.7)+uSeedf*0.13); p+=dot(p,p+34.3); return fract(p.x*p.y); }
float sense(vec2 pos, float ang){ return texture(uTrail, fract(pos + vec2(cos(ang),sin(ang))*uSensorDist)).r; }
void main(){
  vec2 tc = gl_FragCoord.xy/uAgentRes;
  vec4 a = texture(uAgents, tc);
  vec2 pos = a.xy; float ang = a.z;
  float c=sense(pos,ang), l=sense(pos,ang+uSensorAngle), r=sense(pos,ang-uSensorAngle);
  if (c>=l && c>=r) {}
  else if (l>r) ang += uTurn;
  else if (r>l) ang -= uTurn;
  else ang += (hash(tc+pos)*2.0-1.0)*uTurn;
  pos = fract(pos + vec2(cos(ang),sin(ang))*uStep);
  o = vec4(pos, ang, 1.0);
}`;

const DEP_V = `#version 300 es
uniform sampler2D uAgents; uniform int uAW;
void main(){ int id=gl_VertexID; ivec2 ij=ivec2(id%uAW, id/uAW);
  vec4 a=texelFetch(uAgents, ij, 0); gl_Position=vec4(a.xy*2.0-1.0,0.0,1.0); gl_PointSize=1.0; }`;
const DEP_F = `#version 300 es
precision highp float; out vec4 o; uniform float uDeposit;
void main(){ o=vec4(uDeposit); }`;

const DIFF_F = `#version 300 es
precision highp float; out vec4 o;
uniform sampler2D uTrail, uMask; uniform float uHasMask, uDecay; uniform vec2 uRes;
void main(){
  vec2 tc=gl_FragCoord.xy/uRes, px=1.0/uRes; float s=0.0;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++) s += texture(uTrail, fract(tc+vec2(float(x),float(y))*px)).r;
  s = (s/9.0) * uDecay;
  if (uHasMask>0.5){ vec4 m=texture(uMask,tc); s *= step(0.5, max(max(m.r,m.g),m.b)*(m.a<1.0?m.a:1.0)); }
  o = vec4(s, s, s, 1.0);
}`;

function sh(gl, ty, src) { const s = gl.createShader(ty); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error('physarum:\n' + gl.getShaderInfoLog(s)); throw 0; } return s; }
function prog(gl, v, f) { const p = gl.createProgram(); gl.attachShader(p, sh(gl, gl.VERTEX_SHADER, v)); gl.attachShader(p, sh(gl, gl.FRAGMENT_SHADER, f)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error('physarum link:\n' + gl.getProgramInfoLog(p)); throw 0; } return p; }

export class Physarum {
  constructor(gl, { trail = 512, aw = 200 } = {}) {
    this.gl = gl; this.TS = trail; this.AW = aw;
    this.params = { sensorAngle: 22, sensorDist: 0.012, turn: 18, step: 0.0022, decay: 0.94, deposit: 0.2 };
    this.defs = [
      { key: 'sensorAngle', min: 5, max: 60, label: 'sensor angle°' },
      { key: 'sensorDist', min: 0.003, max: 0.04, label: 'sensor dist' },
      { key: 'turn', min: 4, max: 50, label: 'turn angle°' },
      { key: 'step', min: 0.0005, max: 0.006, label: 'step size' },
      { key: 'decay', min: 0.85, max: 0.995, label: 'trail decay' },
    ];
    this.ext = gl.getExtension('EXT_color_buffer_float');
    this.disabled = !this.ext;
    this.vao = gl.createVertexArray();
    if (this.disabled) { this.trailTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.trailTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255])); console.warn('Physarum: no float render target — disabled'); return; }
    this.moveP = prog(gl, QUAD_V, MOVE_F);
    this.depP = prog(gl, DEP_V, DEP_F);
    this.diffP = prog(gl, QUAD_V, DIFF_F);
    this.agentA = this._tgt(aw, true); this.agentB = this._tgt(aw, true);
    this.trailA = this._tgt(trail, false); this.trailB = this._tgt(trail, false);
    this.seed(1);
  }
  _tgt(size, float) {
    const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    if (float) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, size, size, 0, gl.RGBA, gl.FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return { tex: t, fb, size };
  }
  seed(seed) {
    if (this.disabled) return;
    const gl = this.gl, AW = this.AW, n = AW * AW, data = new Float32Array(n * 4);
    let s = (seed >>> 0) || 1; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < n; i++) { data[i * 4] = rnd(); data[i * 4 + 1] = rnd(); data[i * 4 + 2] = rnd() * 6.2832; data[i * 4 + 3] = 1; }
    for (const a of [this.agentA, this.agentB]) { gl.bindTexture(gl.TEXTURE_2D, a.tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, AW, AW, 0, gl.RGBA, gl.FLOAT, data); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.trailA.fb); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.trailB.fb); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  step(maskTex, hasMask, n = 2) {
    if (this.disabled) return;
    const gl = this.gl, p = this.params, D2R = Math.PI / 180;
    gl.bindVertexArray(this.vao); gl.disable(gl.BLEND);
    for (let it = 0; it < n; it++) {
      // 1) move/sense → agentB
      gl.useProgram(this.moveP); gl.bindFramebuffer(gl.FRAMEBUFFER, this.agentB.fb); gl.viewport(0, 0, this.AW, this.AW);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.agentA.tex);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.trailA.tex);
      gl.uniform1i(gl.getUniformLocation(this.moveP, 'uAgents'), 0); gl.uniform1i(gl.getUniformLocation(this.moveP, 'uTrail'), 1);
      gl.uniform2f(gl.getUniformLocation(this.moveP, 'uAgentRes'), this.AW, this.AW);
      gl.uniform1f(gl.getUniformLocation(this.moveP, 'uSensorAngle'), p.sensorAngle * D2R);
      gl.uniform1f(gl.getUniformLocation(this.moveP, 'uSensorDist'), p.sensorDist);
      gl.uniform1f(gl.getUniformLocation(this.moveP, 'uTurn'), p.turn * D2R);
      gl.uniform1f(gl.getUniformLocation(this.moveP, 'uStep'), p.step);
      gl.uniform1f(gl.getUniformLocation(this.moveP, 'uSeedf'), (it + 1) * 1.7);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      let t = this.agentA; this.agentA = this.agentB; this.agentB = t;
      // 2) deposit agents → trailA (additive points)
      gl.useProgram(this.depP); gl.bindFramebuffer(gl.FRAMEBUFFER, this.trailA.fb); gl.viewport(0, 0, this.TS, this.TS);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.agentA.tex);
      gl.uniform1i(gl.getUniformLocation(this.depP, 'uAgents'), 0); gl.uniform1i(gl.getUniformLocation(this.depP, 'uAW'), this.AW);
      gl.uniform1f(gl.getUniformLocation(this.depP, 'uDeposit'), p.deposit);
      gl.drawArrays(gl.POINTS, 0, this.AW * this.AW);
      gl.disable(gl.BLEND);
      // 3) diffuse + decay → trailB
      gl.useProgram(this.diffP); gl.bindFramebuffer(gl.FRAMEBUFFER, this.trailB.fb); gl.viewport(0, 0, this.TS, this.TS);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.trailA.tex);
      gl.activeTexture(gl.TEXTURE2); if (maskTex) gl.bindTexture(gl.TEXTURE_2D, maskTex);
      gl.uniform1i(gl.getUniformLocation(this.diffP, 'uTrail'), 0); gl.uniform1i(gl.getUniformLocation(this.diffP, 'uMask'), 2);
      gl.uniform1f(gl.getUniformLocation(this.diffP, 'uHasMask'), hasMask ? 1 : 0);
      gl.uniform1f(gl.getUniformLocation(this.diffP, 'uDecay'), p.decay);
      gl.uniform2f(gl.getUniformLocation(this.diffP, 'uRes'), this.TS, this.TS);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      t = this.trailA; this.trailA = this.trailB; this.trailB = t;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  get texture() { return this.disabled ? this.trailTex : this.trailA.tex; }
}
