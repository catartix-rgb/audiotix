// datamoshFragment.glsl
// Real-time datamosh / video glitch on an image or video texture.
// Effects layered:
//   - RGB channel separation that grows with mids
//   - UV displacement using waveform data (the "smear" of P-frames)
//   - Block-shift glitch on bass hits (corrupted macroblocks)
//   - Scanline overlay
//   - Pixel sort on beats (horizontal bands of frozen color)

uniform sampler2D uTexture;
uniform sampler2D uWaveform;   // 1xN texture with audio waveform
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform float uBeat;
uniform float uIntensity;
uniform vec2 uResolution;
uniform float uHasTexture;

varying vec2 vUv;

// hash for pseudo-random per-block jitter
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float hash11(float p) {
  return fract(sin(p * 12.9898) * 43758.5453);
}

void main() {
  vec2 uv = vUv;

  // Read waveform amplitude at the current Y to create horizontal smearing
  // (like the IPB encoding artifacts in poorly-compressed video)
  float waveAt = texture2D(uWaveform, vec2(uv.y, 0.5)).r;
  float waveOffset = (waveAt - 0.5) * 0.12 * uIntensity * (0.5 + uMid);
  uv.x += waveOffset;

  // ---- Block displacement on beats ------------------------------------
  // Quantize uv to a coarse grid and randomly shift each block
  float blockSize = 0.04;
  vec2 block = floor(uv / blockSize);
  float blockHash = hash(block + floor(uTime * 8.0));
  float beatShift = step(0.85, blockHash) * uBeat * 0.08 * uIntensity;
  uv.x += (hash(block) - 0.5) * beatShift * 2.0;

  // Horizontal "pixel-sort" bands — pick a few Y bands per second and
  // freeze them by snapping x to a low resolution.
  float band = floor(uv.y * 30.0);
  float bandSeed = hash11(band + floor(uTime * 2.0));
  float sortBand = step(0.96 - uHigh * 0.1, bandSeed) * uIntensity;
  uv.x = mix(uv.x, floor(uv.x * 60.0) / 60.0 + 0.5/60.0, sortBand);

  // ---- RGB channel separation -----------------------------------------
  float chroma = 0.004 + uMid * 0.025 * uIntensity + uBeat * 0.02;
  vec2 dir = vec2(1.0, 0.4);
  vec4 r = texture2D(uTexture, uv + dir * chroma);
  vec4 g = texture2D(uTexture, uv);
  vec4 b = texture2D(uTexture, uv - dir * chroma);

  vec3 col = vec3(r.r, g.g, b.b);

  // ---- Subtle scanlines ----------------------------------------------
  float scan = 0.92 + 0.08 * sin(vUv.y * uResolution.y * 1.6);
  col *= scan;

  // ---- Beat saturation pump ------------------------------------------
  float gray = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(gray), col, 1.0 + uBeat * 0.6);

  // ---- Vignette darken -----------------------------------------------
  float vig = smoothstep(1.2, 0.3, length(vUv - 0.5));
  col *= vig;

  // If no texture loaded yet, show audio-reactive placeholder
  if (uHasTexture < 0.5) {
    float grid = step(0.98, sin(vUv.x * 80.0) * sin(vUv.y * 80.0));
    col = vec3(0.05) + vec3(0.0, 0.3, 0.18) * grid * (0.5 + uBass);
  }

  gl_FragColor = vec4(col, 1.0);
}
