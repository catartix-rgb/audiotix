'use client';

import { useEffect, useRef } from 'react';
import { useStore } from './useStore';

/**
 * AudioEngine is a singleton-ish object that exposes:
 *   - audioContext
 *   - analyser (FFT)
 *   - mediaElement (the HTMLAudioElement)
 *   - latest reactive bands (bass / mid / high) and time domain (waveform)
 *
 * We deliberately do NOT keep this in React state — that would re-render every frame.
 * Instead the values live on a mutable ref that visuals read inside useFrame().
 */
export interface AudioFrame {
  bass: number;        // 0..1 smoothed
  mid: number;         // 0..1 smoothed
  high: number;        // 0..1 smoothed
  energy: number;      // overall RMS 0..1 smoothed
  beat: number;        // 0..1 short-lived spike when a beat is detected
  freq: Uint8Array;    // raw FFT (length = fftSize/2)
  wave: Uint8Array;    // raw time domain
  time: number;        // seconds since playback started
}

const FFT_SIZE = 1024;

function createEmptyFrame(): AudioFrame {
  return {
    bass: 0,
    mid: 0,
    high: 0,
    energy: 0,
    beat: 0,
    freq: new Uint8Array(FFT_SIZE / 2),
    wave: new Uint8Array(FFT_SIZE),
    time: 0,
  };
}

class AudioEngine {
  ctx: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  source: MediaElementAudioSourceNode | null = null;
  el: HTMLAudioElement | null = null;
  freq = new Uint8Array(FFT_SIZE / 2);
  wave = new Uint8Array(FFT_SIZE);
  frame: AudioFrame = createEmptyFrame();

  // beat detection state
  private bassHistory: number[] = [];
  private lastBeat = 0;
  // per-frame cache so multiple visuals calling update() in same RAF tick
  // don't double-count beats or do redundant FFT reads
  private lastUpdateTime = -1;

  attach(el: HTMLAudioElement) {
    if (this.el === el) return;
    this.el = el;
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.source) {
      try {
        this.source.disconnect();
      } catch {}
    }
    this.source = this.ctx.createMediaElementSource(el);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0.8;
    this.source.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  resume() {
    this.ctx?.resume();
  }

  update(sensitivity = 1): AudioFrame {
    const a = this.analyser;
    if (!a) return this.frame;

    // dedupe within same animation frame — performance.now is monotonic per RAF
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    if (now === this.lastUpdateTime) return this.frame;
    this.lastUpdateTime = now;

    a.getByteFrequencyData(this.freq);
    a.getByteTimeDomainData(this.wave);

    const len = this.freq.length;
    // approximate ranges based on bin index (sampleRate / fftSize per bin)
    const bassEnd = Math.floor(len * 0.06);    // ~ 0..130 Hz
    const midEnd = Math.floor(len * 0.25);     // ~ 130..2200 Hz
    // highs go up to len

    let b = 0, m = 0, h = 0;
    for (let i = 0; i < bassEnd; i++) b += this.freq[i];
    for (let i = bassEnd; i < midEnd; i++) m += this.freq[i];
    for (let i = midEnd; i < len; i++) h += this.freq[i];

    const bass = (b / (bassEnd * 255)) * sensitivity;
    const mid = (m / ((midEnd - bassEnd) * 255)) * sensitivity;
    const high = (h / ((len - midEnd) * 255)) * sensitivity;

    // smooth (exponential moving average)
    const k = 0.25;
    this.frame.bass = this.frame.bass + (bass - this.frame.bass) * k;
    this.frame.mid = this.frame.mid + (mid - this.frame.mid) * k;
    this.frame.high = this.frame.high + (high - this.frame.high) * k;
    this.frame.energy =
      this.frame.energy + ((bass + mid + high) / 3 - this.frame.energy) * k;

    // crude but effective beat detection on bass band
    this.bassHistory.push(bass);
    if (this.bassHistory.length > 43) this.bassHistory.shift(); // ~0.7s at 60fps
    const avg = this.bassHistory.reduce((s, v) => s + v, 0) / this.bassHistory.length;
    const ctxTime = this.ctx?.currentTime ?? 0;
    if (bass > avg * 1.35 && bass > 0.35 && ctxTime - this.lastBeat > 0.18) {
      this.lastBeat = ctxTime;
      this.frame.beat = 1;
    } else {
      this.frame.beat *= 0.88;
    }

    this.frame.freq = this.freq;
    this.frame.wave = this.wave;
    this.frame.time = this.el?.currentTime ?? 0;
    return this.frame;
  }
}

export const audioEngine = new AudioEngine();

/**
 * Hook that ties the engine to a hidden <audio> element managed via React refs.
 * Returns the element ref + the engine itself.
 */
export function useAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const url = useStore((s) => s.audioUrl);
  const isPlaying = useStore((s) => s.isPlaying);
  const setPlaying = useStore((s) => s.setPlaying);

  // attach engine when element mounts
  useEffect(() => {
    if (audioRef.current) {
      audioEngine.attach(audioRef.current);
    }
  }, []);

  // load new source
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !url) return;
    el.src = url;
    el.load();
  }, [url]);

  // play / pause control
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

  return { audioRef, engine: audioEngine };
}
