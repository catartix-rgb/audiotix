// ferrofluidFragment.glsl
// Deep-black liquid metal. The fluid is almost completely black at the surface
// but reveals an iridescent rim and bright cusps at the spike tips.

uniform vec3 uColorBase;       // dim main tint (palette accent)
uniform vec3 uColorAccent;     // mid tint (palette base)
uniform vec3 uColorHighlight;  // tip / beat highlight (palette highlight)
uniform float uBeat;
uniform float uEnergy;

varying vec3 vNormal;
varying vec3 vViewPos;
varying float vSpike;
varying float vRim;

void main() {
  // base liquid metal: near-black body with slight gradient
  vec3 col = vec3(0.015);

  // smooth iridescent rim — power curve so it's tight on silhouettes
  float rim = pow(vRim, 2.8);
  col += mix(uColorBase, uColorAccent, rim) * rim * 0.9;

  // spike tips glow — exponential falloff so only sharpest peaks light up
  float tip = smoothstep(0.15, 0.55, vSpike);
  col += uColorHighlight * tip * 0.85;

  // beat flash adds a global lift
  col += uColorHighlight * uBeat * 0.18;

  // slight overall lift by energy
  col *= 0.85 + uEnergy * 0.5;

  gl_FragColor = vec4(col, 1.0);
}
