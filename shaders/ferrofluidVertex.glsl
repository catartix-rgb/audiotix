// ferrofluidVertex.glsl  v0.3
// Real ferromagnetic flow simulation:
//  - curl noise advects spike positions over time (they SLIDE around)
//  - multi-octave fbm gives natural-feeling surface
//  - aperiodic phase drifts so the motion never loops
//  - secondary breathing modulated by long-period noise so the body
//    "settles" and "stretches" unpredictably

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform float uBeat;
uniform float uEnergy;
uniform float uIntensity;
uniform float uSeed;   // randomized per session — different fluid each visit

varying vec3 vNormal;
varying vec3 vViewPos;
varying float vSpike;
varying float vRim;
varying float vFlow;

// ---- 3D simplex noise --------------------------------------------------
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
// ------------------------------------------------------------------------

// Curl of a 3D noise field — gives divergence-free flow (real fluid behavior).
// Sampling the curl at every vertex and using it to ADVECT noise coords
// makes the surface look like it's flowing, not just deforming in place.
vec3 curlNoise(vec3 p) {
  const float e = 0.1;
  vec3 dx = vec3(e, 0.0, 0.0);
  vec3 dy = vec3(0.0, e, 0.0);
  vec3 dz = vec3(0.0, 0.0, e);

  float p_x0 = snoise(p - dx); float p_x1 = snoise(p + dx);
  float p_y0 = snoise(p - dy); float p_y1 = snoise(p + dy);
  float p_z0 = snoise(p - dz); float p_z1 = snoise(p + dz);

  // offset for second component so it's decorrelated
  vec3 q = p + vec3(31.416, 47.853, 12.793);
  float q_x0 = snoise(q - dx); float q_x1 = snoise(q + dx);
  float q_y0 = snoise(q - dy); float q_y1 = snoise(q + dy);
  float q_z0 = snoise(q - dz); float q_z1 = snoise(q + dz);

  vec3 r = p + vec3(73.156, 28.012, 51.471);
  float r_x0 = snoise(r - dx); float r_x1 = snoise(r + dx);
  float r_y0 = snoise(r - dy); float r_y1 = snoise(r + dy);

  float x = (r_y1 - r_y0) - (q_z1 - q_z0);
  float y = (p_z1 - p_z0) - (r_x1 - r_x0);
  float z = (q_x1 - q_x0) - (p_y1 - p_y0);
  return vec3(x, y, z) / (2.0 * e);
}

// fbm — fractal Brownian motion. Multiple octaves of snoise for natural surfaces.
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  float f = 1.0;
  for (int i = 0; i < 4; i++) {
    v += a * snoise(p * f);
    f *= 2.13;   // not exactly 2.0 — avoids perfectly aligned octaves (more organic)
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 pos = position;
  vec3 n = normalize(pos);
  float t = uTime;

  // Aperiodic time channels — each motion runs on its own clock with a
  // slowly-modulated speed. This is the trick to avoid feeling looped:
  // the speed itself wanders.
  float speedDrift = 0.7 + 0.3 * snoise(vec3(t * 0.05, uSeed, 0.0));
  float t1 = t * 0.18 * speedDrift;
  float t2 = t * 0.31 * (0.8 + 0.4 * snoise(vec3(uSeed, t * 0.07, 1.0)));
  float t3 = t * 0.6;

  // ---- Flow field: where does THIS point come from? -------------------
  // Curl noise gives a velocity vector at every point. We advect the
  // sampling coordinate backwards in time — this is how fluid sims look
  // like they "flow" without actual particle simulation.
  vec3 flowSeed = n * 1.4 + vec3(uSeed * 13.0);
  vec3 flow = curlNoise(flowSeed + vec3(0.0, t1, 0.0)) * 0.4;
  vec3 advected = n * 3.0 + flow + vec3(t1, -t1 * 0.6, t2);

  vFlow = length(flow);

  // ---- Body breathing — long-period asymmetric stretch ----------------
  // Two different noise channels give X/Y/Z asymmetric breathing, plus a
  // bass amplification. The asymmetry is what makes it feel ALIVE.
  float breath = fbm(n * 0.9 + vec3(t * 0.08, uSeed, t * 0.04));
  vec3 stretch = vec3(
    snoise(n * 0.6 + vec3(t * 0.07, uSeed * 2.0, 0.0)),
    snoise(n * 0.6 + vec3(uSeed * 3.0, t * 0.09, 1.0)),
    snoise(n * 0.6 + vec3(2.0, uSeed * 4.0, t * 0.06))
  ) * 0.04;
  float bodyDisp = breath * (0.06 + uBass * 0.28 * uIntensity);
  pos += stretch * (1.0 + uBass * 0.5) * uIntensity;

  // ---- Spikes -- the iconic ferrofluid feature ------------------------
  // The spike field is read in ADVECTED coordinates, so spikes appear to
  // slide across the surface instead of pulsing in fixed places.
  float spikeNoise = fbm(advected * 1.4) * 0.5 + 0.5;

  // Add a faster, smaller-scale modulation so spike INTENSITY varies
  // erratically over the surface (some areas calm, others active)
  float regionMask = 0.5 + 0.5 * snoise(n * 2.2 + vec3(t * 0.12, uSeed * 7.0, 0.0));
  spikeNoise *= mix(0.4, 1.2, regionMask);

  // Sharpen into points — higher exponent = sharper, sparser spikes
  float spikeMask = pow(spikeNoise, 6.0);

  // Magnetization: how strongly the spikes are pulled out.
  // Reacts to BASS (sustained) + BEAT (transient pop) + a baseline ripple
  // that exists even in silence (real ferrofluid has surface tension waves).
  float baselineRipple = 0.04 + 0.03 * snoise(vec3(t3, uSeed, 0.0));
  float magnetize = baselineRipple
                  + uBass * 1.6 * uIntensity
                  + uBeat * 1.1 * uIntensity
                  + uEnergy * 0.3 * uIntensity;
  float spike = spikeMask * magnetize;

  // ---- Mid-frequency ripples ------------------------------------------
  // High-frequency surface texture driven by mids. Coordinates also
  // advected so ripples appear to TRAVEL across the surface.
  float ripple = snoise(advected * 6.0 + vec3(t * 1.4)) * 0.025 * uMid * uIntensity;

  // ---- Final displacement ---------------------------------------------
  float disp = bodyDisp + spike + ripple;
  pos += n * disp;

  vSpike = spike;

  vec3 transformedNormal = normalize(normalMatrix * normal);
  vNormal = transformedNormal;
  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  vViewPos = mvPos.xyz;
  vec3 viewDir = normalize(-mvPos.xyz);
  vRim = 1.0 - max(dot(viewDir, transformedNormal), 0.0);

  gl_Position = projectionMatrix * mvPos;
}
