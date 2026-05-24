// ferrofluidFragment.glsl  v0.3
// Liquid-metal shading: deep black body, iridescent rim that shifts color
// based on flow direction, bright cusps at spike tips.

uniform vec3 uColorBase;
uniform vec3 uColorAccent;
uniform vec3 uColorHighlight;
uniform float uBeat;
uniform float uEnergy;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vViewPos;
varying float vSpike;
varying float vRim;
varying float vFlow;

void main() {
  vec3 col = vec3(0.012);

  // Iridescent rim — color shifts slightly with flow magnitude and time,
  // so calm areas look different from active flow zones.
  float rim = pow(vRim, 2.6);
  float flowTint = clamp(vFlow * 0.6, 0.0, 1.0);
  vec3 rimColor = mix(uColorBase, uColorAccent, flowTint);
  // small time-based hue shift to suggest oil-slick interference
  rimColor += sin(uTime * 0.4 + vFlow * 3.0) * 0.05 * uColorHighlight;
  col += rimColor * rim * 0.95;

  // Spike tips — exponential falloff so only the sharpest peaks light up
  float tip = smoothstep(0.18, 0.6, vSpike);
  col += uColorHighlight * tip * 0.95;
  // tiny hot core on big spikes
  float hotCore = smoothstep(0.45, 0.9, vSpike);
  col += vec3(1.0) * hotCore * 0.3;

  col += uColorHighlight * uBeat * 0.16;
  col *= 0.85 + uEnergy * 0.55;

  gl_FragColor = vec4(col, 1.0);
}
