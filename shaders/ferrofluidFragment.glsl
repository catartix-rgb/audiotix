// ferrofluidFragment.glsl  v0.4
// Liquid metal shading. Now uses world-space data for proper rim lighting.
// Depleted areas get an even darker shade (looks like "thin" fluid).

uniform vec3 uColorBase;
uniform vec3 uColorAccent;
uniform vec3 uColorHighlight;
uniform float uBeat;
uniform float uEnergy;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vViewPos;
varying vec3 vWorldPos;
varying float vSpike;
varying float vFlow;
varying float vDeplete;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fresnel = 1.0 - max(dot(viewDir, normalize(vNormal)), 0.0);

  // Near-black liquid metal base
  vec3 col = vec3(0.008);

  // Iridescent rim — fluid-magnitude colored
  float rim = pow(fresnel, 2.6);
  vec3 rimColor = mix(uColorBase, uColorAccent, clamp(vFlow * 0.6, 0.0, 1.0));
  rimColor += sin(uTime * 0.4 + vFlow * 3.0) * 0.05 * uColorHighlight;
  col += rimColor * rim * 0.95;

  // Spike tip glow — exponential, only top of columns lights up
  float tip = smoothstep(0.22, 0.7, vSpike);
  col += uColorHighlight * tip * 1.1;
  // hot core on the sharpest tips
  float hotCore = smoothstep(0.55, 1.0, vSpike);
  col += vec3(1.0) * hotCore * 0.4;

  // Depleted areas — go even darker (the fluid is "thin" there)
  col *= 1.0 - vDeplete * 4.0;

  // Global lifts
  col += uColorHighlight * uBeat * 0.16;
  col *= 0.85 + uEnergy * 0.55;

  gl_FragColor = vec4(col, 1.0);
}
