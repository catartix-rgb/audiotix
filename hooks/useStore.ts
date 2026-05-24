'use client';

import { create } from 'zustand';

export type VisualMode =
  | 'organic'
  | 'particles'
  | 'oscilloscope'
  | 'nodes'
  | 'ferrofluid'
  | 'datamosh';

export type PaletteName = 'osciloscopio' | 'amber' | 'monocromo' | 'rick';
export type MediaType = 'image' | 'video' | null;

export interface AudioState {
  // audio playback
  audioUrl: string | null;
  audioName: string | null;
  isPlaying: boolean;
  hasAudio: boolean;

  // media (image / video for datamosh)
  mediaUrl: string | null;
  mediaName: string | null;
  mediaType: MediaType;

  // settings
  mode: VisualMode;
  palette: PaletteName;
  intensity: number;     // 0..2
  sensitivity: number;   // 0..2
  bloom: number;         // 0..2
  volume: number;        // 0..1 (master gain)
  showUI: boolean;
  freeCamera: boolean;   // true = user has control (OrbitControls)

  // actions
  setAudio: (url: string, name: string) => void;
  clearAudio: () => void;
  setMedia: (url: string, name: string, type: MediaType) => void;
  clearMedia: () => void;
  setPlaying: (p: boolean) => void;
  setMode: (m: VisualMode) => void;
  setPalette: (p: PaletteName) => void;
  setIntensity: (n: number) => void;
  setSensitivity: (n: number) => void;
  setBloom: (n: number) => void;
  setVolume: (n: number) => void;
  toggleUI: () => void;
  toggleFreeCamera: () => void;
  cycleMode: () => void;
}

const MODES: VisualMode[] = [
  'organic',
  'particles',
  'oscilloscope',
  'nodes',
  'ferrofluid',
  'datamosh',
];

export const useStore = create<AudioState>((set, get) => ({
  audioUrl: null,
  audioName: null,
  isPlaying: false,
  hasAudio: false,

  mediaUrl: null,
  mediaName: null,
  mediaType: null,

  mode: 'organic',
  palette: 'osciloscopio',
  intensity: 1.0,
  sensitivity: 1.0,
  bloom: 1.0,
  volume: 0.8,
  showUI: true,
  freeCamera: false,

  setAudio: (url, name) =>
    set({ audioUrl: url, audioName: name, hasAudio: true, isPlaying: false }),
  clearAudio: () =>
    set({ audioUrl: null, audioName: null, hasAudio: false, isPlaying: false }),
  setMedia: (url, name, type) =>
    set({ mediaUrl: url, mediaName: name, mediaType: type }),
  clearMedia: () => set({ mediaUrl: null, mediaName: null, mediaType: null }),
  setPlaying: (p) => set({ isPlaying: p }),
  setMode: (m) => set({ mode: m }),
  setPalette: (p) => set({ palette: p }),
  setIntensity: (n) => set({ intensity: n }),
  setSensitivity: (n) => set({ sensitivity: n }),
  setBloom: (n) => set({ bloom: n }),
  setVolume: (n) => set({ volume: n }),
  toggleUI: () => set({ showUI: !get().showUI }),
  toggleFreeCamera: () => set({ freeCamera: !get().freeCamera }),
  cycleMode: () => {
    const idx = MODES.indexOf(get().mode);
    set({ mode: MODES[(idx + 1) % MODES.length] });
  },
}));
