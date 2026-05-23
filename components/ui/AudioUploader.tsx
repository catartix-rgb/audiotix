'use client';

import { useCallback, useState } from 'react';
import { useStore } from '@/hooks/useStore';

export function AudioUploader() {
  const setAudio = useStore((s) => s.setAudio);
  const setPlaying = useStore((s) => s.setPlaying);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('audio/')) return;
      const url = URL.createObjectURL(file);
      setAudio(url, file.name);
      // user gesture already happened — start playing
      setPlaying(true);
    },
    [setAudio, setPlaying],
  );

  return (
    <div
      className={`relative pointer-events-auto select-none transition-all duration-500 ${
        dragOver ? 'scale-[1.01]' : 'scale-100'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
    >
      <label className="block cursor-pointer">
        <input
          type="file"
          accept="audio/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <div
          className={`
            border border-osc/30 ${dragOver ? 'border-osc' : ''}
            px-12 py-16 text-center
            backdrop-blur-sm bg-black/40
            transition-colors
          `}
          style={{
            boxShadow: dragOver
              ? '0 0 40px rgba(61,255,162,0.25), inset 0 0 40px rgba(61,255,162,0.06)'
              : 'inset 0 0 30px rgba(61,255,162,0.04)',
          }}
        >
          <div className="font-mono text-[10px] tracking-wider2 text-osc/60 mb-6">
            ░░ SONARA / INPUT ░░
          </div>
          <div className="font-display text-3xl md:text-4xl text-ink-50 mb-3">
            Arrastra tu sonido
          </div>
          <div className="font-mono text-xs text-ink-300 mb-8">
            mp3 · wav · flac · ogg · m4a
          </div>
          <div className="inline-block border border-osc/40 px-6 py-2 font-mono text-[11px] tracking-wider2 text-osc">
            ○ &nbsp; SELECCIONAR ARCHIVO
          </div>
        </div>
      </label>
    </div>
  );
}
