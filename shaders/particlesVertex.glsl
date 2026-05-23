// particlesVertex.glsl
// Curl-flow style particle field. Each point has an angle around a torus-ish volume
// modulated by audio bands. Size scales with high-band energy.

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform float uBeat;
uniform float uIntensity;
uniform float uPixelRatio;

attribute float aSeed;     // 0..1 random per particle
attribute float aRadius;   // base radius
attribute float aSpeed;    // angular speed multiplier

varying float vSeed;
varying float vEnergy;

void main() {
  vSeed = aSeed;

  float t = uTime * (0.15 + aSpeed * 0.35);
  float angle = aSeed * 6.2831 + t;

  float r = aRadius * (1.0 + uBass * 0.6 * uIntensity);
  float y = sin(t * 1.1 + aSeed * 12.0) * (0.5 + uMid * 1.5 * uIntensity);

  vec3 pos = vec3(
    cos(angle) * r,
    y,
    sin(angle) * r
  );

  // jitter from highs — particles "vibrate" with treble
  pos.x += sin(uTime * 8.0 + aSeed * 30.0) * uHigh * 0.15 * uIntensity;
  pos.z += cos(uTime * 9.0 + aSeed * 27.0) * uHigh * 0.15 * uIntensity;

  // beat outward push
  pos *= 1.0 + uBeat * 0.12;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float size = (1.5 + uHigh * 5.0 + uBeat * 4.0) * uPixelRatio;
  gl_PointSize = size * (50.0 / -mvPosition.z);

  vEnergy = uBass + uMid + uHigh;
}
