'use client';

import { Color } from 'three';
import type { Palette } from './palettes';
import type { AudioFrame } from '@/hooks/useAudio';

/**
 * ColorEngine v0.7 — generative, audio-reactive color with PUNCHY beat response.
 *
 * What changed vs v0.6:
 *  - Bigger, more visible hue jumps (biased toward triadic/complementary, not
 *    the near-invisible analogous step).
 *  - "snapBoost": on each beat the interpolation speed spikes, so the new color
 *    LANDS almost instantly, then drifts gently until the next beat. This makes
 *    the change read as a hit instead of a slow fade.
 *  - Backup bass-jump detector: even if the formal beat flag doesn't fire, a
 *    sharp rise in bass triggers a color change. Double guarantee.
 *  - Beat also pumps brightness/saturation for an extra visible "pop".
 */

type Harmony = 'complementary' | 'triadic' | 'analogous' | 'splitComp' | 'golden';

function fract(x: number): number {
  return ((x % 1) + 1) % 1;
}

function lerpHue(a: number, b: number, t: number): number {
  let d = b - a;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return fract(a + d * t);
}

class ColorEngine {
  palette: Palette = {
    bg: new Color('#050505'),
    base: new Color('#3DFFA2'),
    accent: new Color('#0E3D26'),
    highlight: new Color('#F2E255'),
  };

  private hue = Math.random();
  private targetHue = Math.random();
  private harmony: Harmony = 'triadic';
  private lastBeatTime = -1;
  private accentLightTarget = 0.2;
  private snapBoost = 0;       // 0..1 — spikes on beat, accelerates the transition
  private beatPulse = 0;       // 0..1 — brightness pop on beat
  private prevBass = 0;

  private _base = new Color();
  private _accent = new Color();
  private _highlight = new Color();
  private _bg = new Color();

  private harmonyOffset(): number {
    switch (this.harmony) {
      case 'complementary': return 0.5;
      case 'triadic': return 1 / 3;
      case 'analogous': return 0.14;   // bumped from 0.08 so even analogous is visible
      case 'splitComp': return 0.42;
      case 'golden': return 0.381966;
      default: return 0.14;
    }
  }

  private pickHarmony(): Harmony {
    // Bias toward LARGE, visible jumps. Analogous is rare now.
    const options: Harmony[] = [
      'triadic', 'triadic',
      'complementary', 'complementary',
      'splitComp', 'golden',
      'analogous',
    ];
    return options[Math.floor(Math.random() * options.length)];
  }

  private buildTarget(energy: number, beatPulse: number) {
    const sat = 0.72 + energy * 0.25 + beatPulse * 0.1;
    const light = 0.5 + beatPulse * 0.12;           // beat brightens base
    this._base.setHSL(this.hue, Math.min(1, sat), Math.min(0.75, light));

    const accentHue = fract(this.hue + this.harmonyOffset());
    this._accent.setHSL(accentHue, 0.5, this.accentLightTarget);

    this._highlight.setHSL(fract(this.hue + 0.05), 0.9, 0.7 + beatPulse * 0.1);

    this._bg.setHSL(this.hue, 0.45, 0.028 + beatPulse * 0.015);
  }

  reset() {
    this.hue = Math.random();
    this.targetHue = Math.random();
    this.harmony = this.pickHarmony();
  }

  update(frame: AudioFrame, delta: number, time: number) {
    // ---- beat trigger: formal beat OR a sharp bass jump (backup) ------
    const bassJump = frame.bass - this.prevBass;
    this.prevBass = frame.bass;
    const beatHit =
      (frame.beat > 0.3 || bassJump > 0.07) && time - this.lastBeatTime > 0.11;

    if (beatHit) {
      this.lastBeatTime = time;
      const offset = this.harmonyOffset();
      const dir = Math.random() < 0.5 ? 1 : -1;
      this.targetHue = fract(this.targetHue + offset * dir);
      // switch harmony fairly often so a set keeps evolving
      if (Math.random() < 0.35) this.harmony = this.pickHarmony();
      this.accentLightTarget = 0.13;
      this.snapBoost = 1.0;       // make the new color land fast
      this.beatPulse = 1.0;       // brightness pop
    }

    // ---- transient → quick nudge + brighten --------------------------
    if (frame.transient > 0.35) {
      this.targetHue = fract(this.targetHue + 0.05 * frame.transient);
      this.accentLightTarget = 0.3;
      this.snapBoost = Math.max(this.snapBoost, 0.7);
      this.beatPulse = Math.max(this.beatPulse, frame.transient);
    }

    // ---- ambient drift -----------------------------------------------
    this.targetHue = fract(this.targetHue + delta * 0.01);
    this.accentLightTarget += (0.2 - this.accentLightTarget) * delta * 1.5;

    // ---- decays ------------------------------------------------------
    // snapBoost decays fast (≈0.1s), beatPulse a touch slower for a visible flash
    this.snapBoost *= Math.pow(0.0008, delta);
    this.beatPulse *= Math.pow(0.02, delta);

    // ---- hue interpolation: fast during snap, gentle otherwise -------
    const hueSpeed = 2.0 + this.snapBoost * 16.0;
    this.hue = lerpHue(this.hue, this.targetHue, Math.min(1, delta * hueSpeed));

    // ---- build + lerp displayed colors -------------------------------
    this.buildTarget(frame.energy, this.beatPulse);
    const k = Math.min(1, delta * (4.0 + this.snapBoost * 18.0));
    this.palette.base.lerp(this._base, k);
    this.palette.accent.lerp(this._accent, k);
    this.palette.highlight.lerp(this._highlight, k);
    this.palette.bg.lerp(this._bg, k);
  }
}

export const colorEngine = new ColorEngine();
