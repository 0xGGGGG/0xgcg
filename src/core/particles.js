import * as THREE from 'three';

// Glowing particles that flow along every neuron curve. Position is read
// from the baked curve DataTexture in the vertex shader, so motion is
// fully GPU-driven (no per-frame CPU work). Additive blending + bloom
// gives the "data flowing through synapses" glow.

export function buildParticles({ curveTexture, curveCount, perCurve = 60, curveColors }) {
  const total = curveCount * perCurve;
  const aCurve = new Float32Array(total);
  const aOffset = new Float32Array(total);
  const aSpeed = new Float32Array(total);
  const aSize = new Float32Array(total);
  const aColor = new Float32Array(total * 3);

  let i = 0;
  for (let c = 0; c < curveCount; c++) {
    const col = curveColors[c] || new THREE.Color('#ffffff');
    for (let k = 0; k < perCurve; k++) {
      aCurve[i] = c;
      aOffset[i] = k / perCurve + Math.sin(c * 12.9 + k) * 0.01;
      aSpeed[i] = 0.03 + ((c * 7 + k * 13) % 10) / 100; // 0.03..0.13
      aSize[i] = 1.5 + ((k * 17) % 10) * 0.211; // ~1.5–3.4, fine particles
      aColor[i * 3] = col.r;
      aColor[i * 3 + 1] = col.g;
      aColor[i * 3 + 2] = col.b;
      i++;
    }
  }

  const geo = new THREE.BufferGeometry();
  // a dummy position attribute is required; real position comes from texture
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geo.setAttribute('aCurve', new THREE.BufferAttribute(aCurve, 1));
  geo.setAttribute('aOffset', new THREE.BufferAttribute(aOffset, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(aSpeed, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCurveTex: { value: curveTexture },
      uCurveCount: { value: curveCount },
      uGlitch: { value: 0 },       // 0..1, ramps up during GLITCH stage
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aCurve;
      attribute float aOffset;
      attribute float aSpeed;
      attribute float aSize;
      attribute vec3 aColor;
      uniform float uTime;
      uniform sampler2D uCurveTex;
      uniform float uCurveCount;
      uniform float uGlitch;
      uniform float uPixelRatio;
      varying vec3 vColor;
      varying float vHead;

      void main(){
        float t = fract(aOffset + uTime * aSpeed);
        float row = (aCurve + 0.5) / uCurveCount;
        vec3 pos = texture2D(uCurveTex, vec2(t, row)).xyz;

        // glitch: snap & scatter particles when the world breaks down
        if (uGlitch > 0.001) {
          float q = mix(1.0, 0.15, uGlitch);
          pos = floor(pos / q) * q;
          float j = sin(aCurve*54.1 + uTime*40.0) * uGlitch * 2.0;
          pos += vec3(j, -j*0.5, j*0.3);
        }

        vColor = aColor;
        vHead = smoothstep(0.0, 0.25, t) * (1.0 - smoothstep(0.6, 1.0, t)) + 0.3;

        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPixelRatio * (30.0 / -mv.z) * (0.6 + vHead);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vHead;
      void main(){
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float a = smoothstep(0.5, 0.0, d);
        a *= a;
        gl_FragColor = vec4(vColor * (0.65 + vHead*0.5), a * (0.3 + vHead*0.35));
      }`,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;

  return {
    points,
    update(t, glitch = 0) {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uGlitch.value = glitch;
    },
  };
}
