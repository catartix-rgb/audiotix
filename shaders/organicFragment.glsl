// organicVertex.glsl  v0.3
// Audio-reactive icosahedron with aperiodic flow.
// Improvements over v0.2:
//  - sampling coordinates DRIFT independently per octave (no aligned loops)
//  - speed itself is modulated by a slow noise channel (varies over time)
//  - per-axis asymmetric stretch makes the body feel less spherical / alive
//  - uSeed makes each session unique

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform float uBeat;
uniform float uIntensity;
uniform float uSeed;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;

vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
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
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
    i.y + vec4(0.0, i1.y, i2.y, 1.0)) +
    i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  vec3 pos = position;
  vec3 n = normalize(pos);

  // Per-octave time drift — each layer flows in a different direction at
  // a slightly different (and modulated) rate. The 1.13 / 1.27 multipliers
  // are intentionally non-integer so octaves never realign.
  float speedMod = 0.7 + 0.3 * snoise(vec3(uTime * 0.04, uSeed, 0.0));
  float t1 = uTime * 0.22 * speedMod;
  float t2 = uTime * 0.31 * (0.85 + 0.3 * snoise(vec3(uSeed, uTime * 0.06, 1.0)));
  float t3 = uTime * 0.55;

  // Per-octave drift vectors with seeded offsets — no two sessions look the same
  vec3 drift1 = vec3(t1, t2 * 0.7, -t1 * 0.6) + vec3(uSeed);
  vec3 drift2 = vec3(-t2, t1, t2 * 0.9) + vec3(uSeed * 2.0);
  vec3 drift3 = vec3(t3, -t3 * 1.1, t3 * 0.8) + vec3(uSeed * 3.0);

  // Multi-scale noise with audio bands modulating each scale
  float low  = snoise(n * 1.5 + drift1) * (0.4 + uBass * 0.95);
  float midN = snoise(n * 3.5 + drift2) * (0.18 + uMid * 0.55);
  float hi   = snoise(n * 8.5 + drift3) * (0.06 + uHigh * 0.4);

  // Region mask — some parts of the surface are more "active" than others,
  // and that mask itself slowly drifts.
  float region = 0.5 + 0.5 * snoise(n * 1.8 + vec3(uTime * 0.05, uSeed * 5.0, 0.0));
  float disp = (low + midN + hi) * uIntensity * (0.6 + region * 0.8);

  // Beat punch — slight outward push, weighted by region so the punch
  // looks asymmetric instead of a clean uniform pulse.
  disp += uBeat * 0.18 * (0.5 + region);

  pos += n * disp;

  // Subtle global stretch — asymmetric breathing
  vec3 stretch = vec3(
    snoise(vec3(uTime * 0.08, uSeed, 0.0)),
    snoise(vec3(0.0, uTime * 0.07, uSeed * 2.0)),
    snoise(vec3(uSeed * 3.0, 0.0, uTime * 0.09))
  ) * 0.05 * (1.0 + uBass);
  pos += stretch;

  vNormal = normalize(normalMatrix * normal);
  vPosition = pos;
  vDisplacement = disp;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
