// particlesVertex.glsl  v0.3
// Curl-flow style particle cloud with aperiodic orbital motion.

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform float uBeat;
uniform float uIntensity;
uniform float uPixelRatio;

attribute float aSeed;
attribute float aRadius;
attribute float aSpeed;

varying float vSeed;
varying float vEnergy;

void main() {
  vSeed = aSeed;

  // Per-particle time channel — each particle runs on its own slightly
  // varying clock. Mix three frequencies so the orbit is quasi-periodic
  // (looks "natural", never visibly loops).
  float personalT = uTime * (0.15 + aSpeed * 0.35);
  float angle = aSeed * 6.2831 + personalT
              + sin(uTime * 0.3 + aSeed * 12.0) * 0.4
              + cos(uTime * 0.13 + aSeed * 7.0) * 0.2;

  // Radius pulses with bass + slow drift unique to each particle
  float radiusDrift = 1.0 + 0.15 * sin(uTime * 0.2 + aSeed * 30.0);
  float r = aRadius * radiusDrift * (1.0 + uBass * 0.6 * uIntensity);

  // Y position uses two superimposed sines with non-integer frequency ratio
  // (golden-ratio-ish) — never realigns into an obvious loop
  float y = sin(personalT * 1.1 + aSeed * 12.0) * 0.4
          + sin(personalT * 1.7 + aSeed * 27.0) * 0.2;
  y += sin(uTime * 0.4 + aSeed * 5.0) * uMid * 1.4 * uIntensity;

  vec3 pos = vec3(
    cos(angle) * r,
    y,
    sin(angle) * r
  );

  // Jitter from highs — particles "vibrate" with treble (more chaotic)
  pos.x += sin(uTime * 8.0 + aSeed * 30.0) * uHigh * 0.18 * uIntensity;
  pos.z += cos(uTime * 9.0 + aSeed * 27.0) * uHigh * 0.18 * uIntensity;
  pos.y += sin(uTime * 11.0 + aSeed * 41.0) * uHigh * 0.12 * uIntensity;

  // Beat outward push
  pos *= 1.0 + uBeat * 0.12;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float size = (1.5 + uHigh * 5.0 + uBeat * 4.0) * uPixelRatio;
  gl_PointSize = size * (50.0 / -mvPosition.z);

  vEnergy = uBass + uMid + uHigh;
}
