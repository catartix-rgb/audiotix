'use client';

import { Color } from 'three';
import type { Palette } from './palettes';
import type { AudioFrame } from '@/hooks/useAudio';

/**
 * ColorEngine — generative, audio-reactive color.
 *
 * When Auto Color is enabled, the visuals stop reading static palettes and
 * instead read this engine's live palette. The engine:
 *
 *  - holds a "hue" that drifts continuously (slow ambient evolution)
 *  - on every strong BEAT, jumps the target hue by a color-theory interval
 *    (golden angle / triadic / complementary / analogous) so consecutive
 *    colors are harmonically related, never random mud
 *  - on TRANSIENTS (vocal hits / claps), nudges hue + pops brightness
 *  - smoothly interpolates the DISPLAYED colors toward the target every frame
 *    (color lerp) so changes feel like cinematic crossfades, not hard cuts
 *
 * The result: hands-off, the palette evolves with the music and "hits" on
 * the beat, staying tasteful because every move follows a harmony rule.
 */

type Harmony = 'complementary' | 'triadic' | 'analogous' | 'splitComp' | 'golden';

function fract(x: number): number {
  return ((x % 1) + 1) % 1;
}

// shortest-path hue interpolation around the color wheel (0..1)
function lerpHue(a: number, b: number, t: number): number {
  let d = b - a;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return fract(a + d * t);
}

class ColorEngine {
  // live palette the visuals read (mutated in place each frame)
  palette: Palette = {
    bg: new Color('#050505'),
    base: new Color('#3DFFA2'),
    accent: new Color('#0E3D26'),
    highlight: new Color('#F2E255'),
  };

  private hue = Math.random();
  private targetHue = Math.random();
  private harmony: Harmony = 'analogous';
  private lastBeatTime = -1;
  private accentLightTarget = 0.2;

  // scratch colors to avoid per-frame allocation
  private _base = new Color();
  private _accent = new Color();
  private _highlight = new Color();
  private _bg = new Color();

  private harmonyOffset(): number {
    switch (this.harmony) {
      case 'complementary': return 0.5;
      case 'triadic': return 1 / 3;
      case 'analogous': return 0.08;
      case 'splitComp': return 0.42;
      case 'golden': return 0.381966; // golden angle / 360
      default: return 0.08;
    }
  }

  private pickHarmony(): Harmony {
    const options: Harmony[] = [
      'analogous', 'analogous',           // weight analogous (tasteful)
      'complementary', 'triadic',
      'splitComp', 'golden',
    ];
    return options[Math.floor(Math.random() * options.length)];
  }

  private buildTarget(energy: number) {
    const sat = 0.7 + energy * 0.25;
    this._base.setHSL(this.hue, Math.min(1, sat), 0.55);

    const accentHue = fract(this.hue + this.harmonyOffset());
    this._accent.setHSL(accentHue, 0.45, this.accentLightTarget);

    // highlight: slightly shifted, brighter, more saturated — used for beat pops
    this._highlight.setHSL(fract(this.hue + 0.03), 0.85, 0.72);

    // background: very dark tint of the base hue (keeps blacks "warm/cool")
    this._bg.setHSL(this.hue, 0.4, 0.025);
  }

  reset() {
    this.hue = Math.random();
    this.targetHue = Math.random();
    this.harmony = this.pickHarmony();
  }

  update(frame: AudioFrame, delta: number, time: number) {
    // ---- beat → harmonic hue jump ------------------------------------
    if (frame.beat > 0.5 && time - this.lastBeatTime > 0.14) {
      this.lastBeatTime = time;
      const offset = this.harmonyOffset();
      const dir = Math.random() < 0.5 ? 1 : -1;
      this.targetHue = fract(this.targetHue + offset * dir);
      // occasionally switch the harmony scheme for variety over a set
      if (Math.random() < 0.22) this.harmony = this.pickHarmony();
      // beat momentarily deepens the accent (darker) for contrast punch
      this.accentLightTarget = 0.14;
    }

    // ---- transient → quick hue nudge + accent brighten ---------------
    if (frame.transient > 0.4) {
      this.targetHue = fract(this.targetHue + 0.015 * frame.transient);
      this.accentLightTarget = 0.28;
    }

    // ---- continuous ambient drift ------------------------------------
    this.targetHue = fract(this.targetHue + delta * 0.012);
    // accent light relaxes back toward mid
    this.accentLightTarget += (0.2 - this.accentLightTarget) * delta * 1.5;

    // ---- smooth the hue ----------------------------------------------
    this.hue = lerpHue(this.hue, this.targetHue, Math.min(1, delta * 2.2));

    // ---- build + lerp displayed colors -------------------------------
    this.buildTarget(frame.energy);
    const k = Math.min(1, delta * 4.0);
    this.palette.base.lerp(this._base, k);
    this.palette.accent.lerp(this._accent, k);
    this.palette.highlight.lerp(this._highlight, k);
    this.palette.bg.lerp(this._bg, k);
  }
}

export const colorEngine = new ColorEngine();
