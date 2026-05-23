'use client';

import { create } from 'zustand';

export type VisualMode = 'organic' | 'particles' | 'oscilloscope' | 'nodes';
export type PaletteName = 'osciloscopio' | 'amber' | 'monocromo' | 'rick';

export interface AudioState {
  // playback
  audioUrl: string | null;
  audioName: string | null;
  isPlaying: boolean;
  hasAudio: boolean;

  // settings
  mode: VisualMode;
  palette: PaletteName;
  intensity: number;     // 0..2 — qué tan dramática es la reacción visual
  sensitivity: number;   // 0..2 — multiplicador del análisis FFT
  bloom: number;         // 0..2
  showUI: boolean;

  // actions
  setAudio: (url: string, name: string) => void;
  clearAudio: () => void;
  setPlaying: (p: boolean) => void;
  setMode: (m: VisualMode) => void;
  setPalette: (p: PaletteName) => void;
  setIntensity: (n: number) => void;
  setSensitivity: (n: number) => void;
  setBloom: (n: number) => void;
  toggleUI: () => void;
  cycleMode: () => void;
}

const MODES: VisualMode[] = ['organic', 'particles', 'oscilloscope', 'nodes'];

export const useStore = create<AudioState>((set, get) => ({
  audioUrl: null,
  audioName: null,
  isPlaying: false,
  hasAudio: false,

  mode: 'organic',
  palette: 'osciloscopio',
  intensity: 1.0,
  sensitivity: 1.0,
  bloom: 1.0,
  showUI: true,

  setAudio: (url, name) =>
    set({ audioUrl: url, audioName: name, hasAudio: true, isPlaying: false }),
  clearAudio: () => set({ audioUrl: null, audioName: null, hasAudio: false, isPlaying: false }),
  setPlaying: (p) => set({ isPlaying: p }),
  setMode: (m) => set({ mode: m }),
  setPalette: (p) => set({ palette: p }),
  setIntensity: (n) => set({ intensity: n }),
  setSensitivity: (n) => set({ sensitivity: n }),
  setBloom: (n) => set({ bloom: n }),
  toggleUI: () => set({ showUI: !get().showUI }),
  cycleMode: () => {
    const idx = MODES.indexOf(get().mode);
    set({ mode: MODES[(idx + 1) % MODES.length] });
  },
}));
