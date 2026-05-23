// organicFragment.glsl
// Edge-glow / fresnel material driven by displacement & audio.

uniform vec3 uColorBase;
uniform vec3 uColorAccent;
uniform vec3 uColorHighlight;
uniform float uBeat;
uniform float uEnergy;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;

void main() {
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.5);

  // base gradient between accent (interior) and base (rim)
  vec3 col = mix(uColorAccent, uColorBase, fresnel);

  // displacement adds bright tint
  col += uColorBase * smoothstep(0.0, 0.6, vDisplacement) * 0.45;

  // beat flash with highlight color
  col += uColorHighlight * uBeat * 0.35;

  // overall energy lift
  col *= 0.7 + uEnergy * 0.9;

  gl_FragColor = vec4(col, 1.0);
}
