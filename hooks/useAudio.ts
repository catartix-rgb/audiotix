'use client';

import { useEffect, useRef } from 'react';
import { useStore } from './useStore';

/**
 * AudioEngine v0.5
 * Now exposes:
 *  - bass / mid / high — broad bands
 *  - voice — focused 200Hz..2.5kHz band where vocal content lives
 *  - transient — short spike on sudden onsets (vocal attacks, claps,
 *    consonants, snare hits). Independent of beat detection (which is bass).
 *  - bassEnv — sustained bass envelope (decays slower than bass itself).
 *    Useful for "magnetic field" style sustained reactions.
 */
export interface AudioFrame {
  bass: number;
  mid: number;
  high: number;
  voice: number;
  transient: number;
  bassEnv: number;
  energy: number;
  beat: number;
  freq: Uint8Array;
  wave: Uint8Array;
  time: number;
}

const FFT_SIZE = 1024;

function createEmptyFrame(): AudioFrame {
  return {
    bass: 0, mid: 0, high: 0, voice: 0,
    transient: 0, bassEnv: 0, energy: 0, beat: 0,
    freq: new Uint8Array(FFT_SIZE / 2),
    wave: new Uint8Array(FFT_SIZE),
    time: 0,
  };
}

class AudioEngine {
  ctx: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  gain: GainNode | null = null;
  source: MediaElementAudioSourceNode | null = null;
  el: HTMLAudioElement | null = null;
  freq = new Uint8Array(FFT_SIZE / 2);
  wave = new Uint8Array(FFT_SIZE);
  frame: AudioFrame = createEmptyFrame();

  private bassHistory: number[] = [];
  private transientHistory: number[] = [];
  private lastBeat = 0;
  private lastUpdateTime = -1;
  private prevHigh = 0;
  private prevVoice = 0;

  attach(el: HTMLAudioElement) {
    if (this.el === el) return;
    this.el = el;
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.source) { try { this.source.disconnect(); } catch {} }
    this.source = this.ctx.createMediaElementSource(el);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0.78;
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 1.0;
    this.source.connect(this.analyser);
    this.analyser.connect(this.gain);
    this.gain.connect(this.ctx.destination);
  }

  resume() { this.ctx?.resume(); }

  setVolume(v: number) {
    if (this.gain && this.ctx) {
      const now = this.ctx.currentTime;
      this.gain.gain.cancelScheduledValues(now);
      this.gain.gain.setTargetAtTime(Math.max(0, Math.min(2, v)), now, 0.02);
    }
  }

  update(sensitivity = 1): AudioFrame {
    const a = this.analyser;
    if (!a) return this.frame;

    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    if (now === this.lastUpdateTime) return this.frame;
    this.lastUpdateTime = now;

    a.getByteFrequencyData(this.freq);
    a.getByteTimeDomainData(this.wave);

    const len = this.freq.length;
    // Approximate bin boundaries (at 44.1kHz sample rate):
    //   bin = freq_hz / (sampleRate / fftSize) = freq_hz / 43.07
    // Standard bands:
    const bassEnd = Math.floor(len * 0.06);    // ~ 0..1.3kHz (bass region)
    const midEnd = Math.floor(len * 0.25);     // ~ 1.3..5.5kHz
    // Voice band: 200Hz..2.5kHz — most vocal fundamentals + formants
    const voiceStart = Math.floor(len * 0.012);
    const voiceEnd = Math.floor(len * 0.13);

    let b = 0, m = 0, h = 0, v = 0;
    for (let i = 0; i < bassEnd; i++) b += this.freq[i];
    for (let i = bassEnd; i < midEnd; i++) m += this.freq[i];
    for (let i = midEnd; i < len; i++) h += this.freq[i];
    for (let i = voiceStart; i < voiceEnd; i++) v += this.freq[i];

    const bass = (b / (bassEnd * 255)) * sensitivity;
    const mid = (m / ((midEnd - bassEnd) * 255)) * sensitivity;
    const high = (h / ((len - midEnd) * 255)) * sensitivity;
    const voice = (v / ((voiceEnd - voiceStart) * 255)) * sensitivity;

    // Smooth (exponential moving average)
    const k = 0.25;
    this.frame.bass += (bass - this.frame.bass) * k;
    this.frame.mid += (mid - this.frame.mid) * k;
    this.frame.high += (high - this.frame.high) * k;
    this.frame.voice += (voice - this.frame.voice) * k;
    this.frame.energy += ((bass + mid + high) / 3 - this.frame.energy) * k;

    // Sustained bass envelope — slower decay than bass itself.
    // Great for things like "magnetic field strength" that should hold steady.
    if (bass > this.frame.bassEnv) {
      this.frame.bassEnv = bass;                       // attack: instant
    } else {
      this.frame.bassEnv += (bass - this.frame.bassEnv) * 0.04;   // release: slow
    }

    // ---- Transient detector --------------------------------------------
    // Looks at sudden positive deltas in (high + voice). Captures consonants,
    // claps, snare, vocal attacks — anything percussive that ISN'T bass.
    const transientSignal = high * 0.5 + voice * 0.7;
    const delta = Math.max(0, transientSignal - this.prevHigh - this.prevVoice * 0.7);
    this.transientHistory.push(transientSignal);
    if (this.transientHistory.length > 30) this.transientHistory.shift();
    const tAvg =
      this.transientHistory.reduce((s, x) => s + x, 0) / this.transientHistory.length;
    if (delta > 0.04 && transientSignal > tAvg * 1.2) {
      this.frame.transient = Math.min(1, delta * 6);
    } else {
      this.frame.transient *= 0.82;   // fast decay
    }
    this.prevHigh = high;
    this.prevVoice = voice;

    // ---- Beat detection (bass) ----------------------------------------
    this.bassHistory.push(bass);
    if (this.bassHistory.length > 43) this.bassHistory.shift();
    const avg = this.bassHistory.reduce((s, x) => s + x, 0) / this.bassHistory.length;
    const ctxTime = this.ctx?.currentTime ?? 0;
    if (bass > avg * 1.32 && bass > 0.32 && ctxTime - this.lastBeat > 0.16) {
      this.lastBeat = ctxTime;
      this.frame.beat = 1;
    } else {
      this.frame.beat *= 0.86;
    }

    this.frame.freq = this.freq;
    this.frame.wave = this.wave;
    this.frame.time = this.el?.currentTime ?? 0;
    return this.frame;
  }
}

export const audioEngine = new AudioEngine();

export function useAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const url = useStore((s) => s.audioUrl);
  const isPlaying = useStore((s) => s.isPlaying);
  const setPlaying = useStore((s) => s.setPlaying);
  const volume = useStore((s) => s.volume);

  useEffect(() => {
    if (audioRef.current) {
      audioEngine.attach(audioRef.current);
      audioEngine.setVolume(volume);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !url) return;
    el.src = url;
    el.load();
  }, [url]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      audioEngine.resume();
      el.play().catch(() => setPlaying(false));
    } else {
      el.pause();
    }
  }, [isPlaying, setPlaying]);

  useEffect(() => { audioEngine.setVolume(volume); }, [volume]);

  return { audioRef, engine: audioEngine };
}
