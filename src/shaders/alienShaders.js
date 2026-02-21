import * as THREE from 'three'

// ---------------------------------------------------------------------------
// Ashima simplex3D noise (Stefan Gustavson, Ian McEwan)
// Inlined to avoid external dependencies.
// ---------------------------------------------------------------------------
const SIMPLEX_NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`

// ---------------------------------------------------------------------------
// Vertex shader: simplex noise displacement along normals
// ---------------------------------------------------------------------------
export const VERTEX_SHADER = /* glsl */ `
${SIMPLEX_NOISE_GLSL}

uniform float uTime;
uniform float uNoiseFreq;
uniform float uNoiseAmplitude;
uniform float uNoiseSpeed;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vDisplacement;

void main() {
  vec3 pos = position;
  float n = snoise(pos * uNoiseFreq + uTime * uNoiseSpeed);
  vDisplacement = n;
  pos += normal * n * uNoiseAmplitude;

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPos.xyz;
  vNormal = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`

// ---------------------------------------------------------------------------
// Fragment shader: fresnel rim + emotion color + pattern overlay
// Pattern types: 0=wash, 1=expand ring, 2=contract ring, 3=flicker, 4=y-sweep
// ---------------------------------------------------------------------------
export const FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uEmotionColor;
uniform float uGlowIntensity;
uniform float uRimStrength;
uniform float uTime;

uniform vec3 uPatternColor;
uniform float uPatternIntensity;
uniform float uPatternProgress;
uniform int uPatternType;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vDisplacement;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 3.0);

  // Base emission: emotion color with glow + fresnel rim
  vec3 base = uEmotionColor * uGlowIntensity + uEmotionColor * fresnel * uRimStrength;

  // Displacement-based brightness variation
  float dispBrightness = 0.85 + vDisplacement * 0.15;
  base *= dispBrightness;

  // Pattern overlay
  float patternMask = 0.0;

  if (uPatternIntensity > 0.001) {
    if (uPatternType == 0) {
      // Uniform wash -- entire surface
      patternMask = 1.0;
    } else if (uPatternType == 1) {
      // Expand ring -- radial outward from center
      float dist = length(vWorldPosition.xy);
      float ring = 1.0 - smoothstep(uPatternProgress * 2.0 - 0.3, uPatternProgress * 2.0, dist);
      patternMask = ring;
    } else if (uPatternType == 2) {
      // Contract ring -- radial inward toward center
      float dist = length(vWorldPosition.xy);
      float ring = smoothstep((1.0 - uPatternProgress) * 2.0 - 0.3, (1.0 - uPatternProgress) * 2.0, dist);
      patternMask = ring;
    } else if (uPatternType == 3) {
      // Flicker -- strobe
      patternMask = step(0.5, fract(uTime * 12.0));
    } else if (uPatternType == 4) {
      // Y-sweep -- band slides bottom to top
      float band = smoothstep(uPatternProgress * 3.0 - 1.5, uPatternProgress * 3.0 - 1.0, vWorldPosition.y)
                  - smoothstep(uPatternProgress * 3.0 - 1.0, uPatternProgress * 3.0 - 0.5, vWorldPosition.y);
      patternMask = band;
    }

    base = mix(base, uPatternColor, patternMask * uPatternIntensity);
  }

  // Alpha: core is semi-transparent, rim is bright
  float alpha = 0.6 + fresnel * 0.4;

  gl_FragColor = vec4(base, alpha);
}
`

// ---------------------------------------------------------------------------
// Emotion -> shader parameter config
// ---------------------------------------------------------------------------
export const EMOTION_SHADER_CONFIG = {
  curious: {
    color: [0.49, 0.72, 0.86],
    glowIntensity: 0.55,
    rimStrength: 0.6,
    noiseAmplitude: 0.30,
    noiseSpeed: 0.5,
    noiseFreq: 1.8,
    floatAmp: 0.03,
    floatSpeed: 0.8,
    rotSpeed: 0.3,
    bloomIntensity: 1.2,
  },
  excited: {
    color: [0.78, 0.91, 0.97],
    glowIntensity: 0.90,
    rimStrength: 1.2,
    noiseAmplitude: 0.50,
    noiseSpeed: 1.4,
    noiseFreq: 2.4,
    floatAmp: 0.08,
    floatSpeed: 2.0,
    rotSpeed: 0.8,
    bloomIntensity: 2.5,
  },
  frustrated: {
    color: [0.35, 0.48, 0.54],
    glowIntensity: 0.25,
    rimStrength: 0.3,
    noiseAmplitude: 0.18,
    noiseSpeed: 0.2,
    noiseFreq: 1.2,
    floatAmp: 0.01,
    floatSpeed: 0.3,
    rotSpeed: 0.05,
    bloomIntensity: 0.4,
  },
  hopeful: {
    color: [0.96, 0.78, 0.26],
    glowIntensity: 0.70,
    rimStrength: 0.8,
    noiseAmplitude: 0.35,
    noiseSpeed: 0.7,
    noiseFreq: 1.6,
    floatAmp: 0.05,
    floatSpeed: 1.1,
    rotSpeed: 0.4,
    bloomIntensity: 1.6,
  },
  grateful: {
    color: [0.97, 0.91, 0.78],
    glowIntensity: 0.95,
    rimStrength: 1.0,
    noiseAmplitude: 0.40,
    noiseSpeed: 0.6,
    noiseFreq: 1.5,
    floatAmp: 0.04,
    floatSpeed: 0.9,
    rotSpeed: 0.2,
    bloomIntensity: 2.0,
  },
}

// ---------------------------------------------------------------------------
// Pattern type mapping: visual pattern ID -> shader config
// Colors match COLORS in constants.js converted to normalized RGB
// ---------------------------------------------------------------------------
export const PATTERN_MAP = {
  yes:       { type: 1, color: [0.29, 0.87, 0.50] },   // green, expand ring
  no:        { type: 0, color: [0.94, 0.27, 0.27] },   // red, uniform wash
  self:      { type: 2, color: [0.38, 0.65, 0.98] },   // blue, contract ring
  other:     { type: 1, color: [0.38, 0.65, 0.98] },   // blue, expand ring
  energy:    { type: 3, color: [0.98, 0.80, 0.08] },   // yellow, flicker
  direction: { type: 4, color: [0.89, 0.91, 0.94] },   // white, y-sweep
  home:      { type: 0, color: [0.96, 0.62, 0.04] },   // amber, uniform wash
}

// ---------------------------------------------------------------------------
// Default uniforms factory -- returns fresh THREE.Uniform objects
// ---------------------------------------------------------------------------
export function DEFAULT_UNIFORMS() {
  const cfg = EMOTION_SHADER_CONFIG.curious
  return {
    uTime: new THREE.Uniform(0),
    uNoiseFreq: new THREE.Uniform(cfg.noiseFreq),
    uNoiseAmplitude: new THREE.Uniform(cfg.noiseAmplitude),
    uNoiseSpeed: new THREE.Uniform(cfg.noiseSpeed),
    uEmotionColor: new THREE.Uniform(new THREE.Vector3(...cfg.color)),
    uGlowIntensity: new THREE.Uniform(cfg.glowIntensity),
    uRimStrength: new THREE.Uniform(cfg.rimStrength),
    uPatternColor: new THREE.Uniform(new THREE.Vector3(1, 1, 1)),
    uPatternIntensity: new THREE.Uniform(0),
    uPatternProgress: new THREE.Uniform(0),
    uPatternType: new THREE.Uniform(0),
  }
}
