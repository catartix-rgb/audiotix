'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { audioEngine } from '@/hooks/useAudio';
import { AudioUploader } from './AudioUploader';
import { Controls } from './Controls';

export function Overlay() {
  const hasAudio = useStore((s) => s.hasAudio);
  const showUI = useStore((s) => s.showUI);
  const toggleUI = useStore((s) => s.toggleUI);
  const cycleMode = useStore((s) => s.cycleMode);
  const setPlaying = useStore((s) => s.setPlaying);
  const isPlaying = useStore((s) => s.isPlaying);
  const toggleFreeCamera = useStore((s) => s.toggleFreeCamera);
  const volume = useStore((s) => s.volume);
  const setVolume = useStore((s) => s.setVolume);

  // keyboard shortcuts — feels like a real installation control surface
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (hasAudio) setPlaying(!isPlaying);
      } else if (e.code === 'KeyH') {
        toggleUI();
      } else if (e.code === 'KeyM') {
        cycleMode();
      } else if (e.code === 'KeyC') {
        toggleFreeCamera();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setVolume(Math.min(1, volume + 0.05));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setVolume(Math.max(0, volume - 0.05));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasAudio, isPlaying, setPlaying, toggleUI, cycleMode, toggleFreeCamera, volume, setVolume]);

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-10 transition-opacity duration-700 ${
        showUI ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <CornerMarks />

      <div className="absolute top-6 left-6 font-mono text-[10px] tracking-wider2 text-osc/70">
        <div>SONARA</div>
        <div className="text-ink-300 mt-1">audio · particles · light</div>
      </div>

      <div className="absolute top-6 right-6 text-right font-mono text-[10px] tracking-wider2 text-ink-300">
        <div>v0.1 · 2026</div>
        <div className="text-osc/60 mt-1">[H] hide · [M] mode · [C] cam · [↑↓] vol</div>
      </div>

      {!hasAudio && (
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <AudioUploader />
        </div>
      )}

      {hasAudio && (
        <div className="absolute bottom-6 left-6">
          <Controls />
        </div>
      )}

      {hasAudio && <VuMeter />}
    </div>
  );
}

function CornerMarks() {
  const S = 14;
  return (
    <>
      <div className="absolute top-3 left-3 pointer-events-none" style={{ width: S, height: S }}>
        <div className="absolute top-0 left-0 w-full h-px bg-osc/40" />
        <div className="absolute top-0 left-0 h-full w-px bg-osc/40" />
      </div>
      <div className="absolute top-3 right-3 pointer-events-none" style={{ width: S, height: S }}>
        <div className="absolute top-0 right-0 w-full h-px bg-osc/40" />
        <div className="absolute top-0 right-0 h-full w-px bg-osc/40" />
      </div>
      <div className="absolute bottom-3 left-3 pointer-events-none" style={{ width: S, height: S }}>
        <div className="absolute bottom-0 left-0 w-full h-px bg-osc/40" />
        <div className="absolute bottom-0 left-0 h-full w-px bg-osc/40" />
      </div>
      <div className="absolute bottom-3 right-3 pointer-events-none" style={{ width: S, height: S }}>
        <div className="absolute bottom-0 right-0 w-full h-px bg-osc/40" />
        <div className="absolute bottom-0 right-0 h-full w-px bg-osc/40" />
      </div>
    </>
  );
}

function VuMeter() {
  const [vals, setVals] = useState({ b: 0, m: 0, h: 0 });

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const f = audioEngine.frame;
      setVals({ b: f.bass, m: f.mid, h: f.high });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const Bar = ({ label, v }: { label: string; v: number }) => (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-ink-300 w-6">{label}</span>
      <div className="relative w-32 h-[3px] bg-ink-500/40">
        <div
          className="absolute top-0 left-0 h-full bg-osc transition-[width] duration-75"
          style={{ width: `${Math.min(100, v * 140)}%` }}
        />
      </div>
      <span className="text-[9px] text-osc w-7 text-right tabular-nums">{v.toFixed(2)}</span>
    </div>
  );

  return (
    <div className="absolute bottom-6 right-6 bg-black/55 backdrop-blur-md border border-osc/20 p-4 font-mono pointer-events-auto">
      <div className="text-[10px] text-osc/70 tracking-wider2 mb-2">░ SIGNAL</div>
      <div className="space-y-1.5">
        <Bar label="BASS" v={vals.b} />
        <Bar label="MID" v={vals.m} />
        <Bar label="HIGH" v={vals.h} />
      </div>
    </div>
  );
}
