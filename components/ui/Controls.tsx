'use client';

import { useCallback } from 'react';
import { useStore, VisualMode, PaletteName } from '@/hooks/useStore';

const MODES: { id: VisualMode; label: string }[] = [
  { id: 'organic', label: 'ORG' },
  { id: 'particles', label: 'PRT' },
  { id: 'oscilloscope', label: 'SCP' },
  { id: 'nodes', label: 'NDS' },
  { id: 'ferrofluid', label: 'FERR' },
  { id: 'datamosh', label: 'MOSH' },
];

const PALETTES: { id: PaletteName; label: string; sw: string }[] = [
  { id: 'osciloscopio', label: 'osc', sw: '#3DFFA2' },
  { id: 'amber', label: 'amber', sw: '#F2E255' },
  { id: 'monocromo', label: 'mono', sw: '#f5f5f5' },
  { id: 'rick', label: 'bone', sw: '#cdb89b' },
];

function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 2,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="font-mono text-[10px] text-ink-300 w-16 tracking-wider2">
        {label}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-osc h-[2px]"
      />
      <div className="font-mono text-[10px] text-osc w-10 text-right">
        {value.toFixed(2)}
      </div>
    </div>
  );
}

export function Controls() {
  const {
    mode,
    palette,
    intensity,
    sensitivity,
    bloom,
    volume,
    setMode,
    setPalette,
    setIntensity,
    setSensitivity,
    setBloom,
    setVolume,
    isPlaying,
    setPlaying,
    hasAudio,
    audioName,
    clearAudio,
    freeCamera,
    toggleFreeCamera,
    mediaUrl,
    mediaName,
    setMedia,
    clearMedia,
  } = useStore();

  const handleMediaUpload = useCallback(
    (file: File) => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isVideo && !isImage) return;
      const url = URL.createObjectURL(file);
      setMedia(url, file.name, isVideo ? 'video' : 'image');
    },
    [setMedia],
  );

  return (
    <div className="pointer-events-auto w-[320px] md:w-[360px] bg-black/55 backdrop-blur-md border border-osc/20 p-5 font-mono text-xs">
      {/* now playing */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-osc/70 tracking-wider2 text-[10px]">
          ░ NOW PLAYING
        </div>
        <button
          onClick={clearAudio}
          className="text-ink-300 hover:text-osc text-[10px] tracking-wider2"
        >
          [×] EJECT
        </button>
      </div>
      <div className="text-ink-50 text-sm mb-1 truncate">
        {audioName ?? '—'}
      </div>
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => setPlaying(!isPlaying)}
          disabled={!hasAudio}
          className="w-10 h-10 border border-osc/60 text-osc flex items-center justify-center hover:bg-osc/10 disabled:opacity-30"
          aria-label={isPlaying ? 'Pausa' : 'Reproducir'}
        >
          {isPlaying ? (
            <div className="flex gap-[3px]">
              <div className="w-[3px] h-3 bg-osc" />
              <div className="w-[3px] h-3 bg-osc" />
            </div>
          ) : (
            <div
              className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-osc"
              style={{ marginLeft: 2 }}
            />
          )}
        </button>
        <div className="text-[10px] text-ink-300">
          {isPlaying ? 'RUNNING' : hasAudio ? 'PAUSED' : 'IDLE'}
        </div>

        {/* camera mode toggle */}
        <button
          onClick={toggleFreeCamera}
          className={`ml-auto h-10 px-3 border text-[10px] tracking-wider2 transition-colors ${
            freeCamera
              ? 'border-osc text-osc bg-osc/10'
              : 'border-ink-500 text-ink-300 hover:border-osc/50 hover:text-osc'
          }`}
          title="Cámara libre: arrastra para rotar, rueda para zoom"
        >
          {freeCamera ? '○ FREE CAM' : '● AUTO CAM'}
        </button>
      </div>

      {/* modes (6 buttons in 2 rows) */}
      <div className="mb-4">
        <div className="text-[10px] text-ink-300 tracking-wider2 mb-2">░ SCENE</div>
        <div className="grid grid-cols-6 gap-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`py-2 text-[9px] tracking-wider2 border transition-colors ${
                mode === m.id
                  ? 'border-osc text-osc bg-osc/10'
                  : 'border-ink-500 text-ink-300 hover:text-osc hover:border-osc/50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* media upload — only visible in datamosh mode */}
      {mode === 'datamosh' && (
        <div className="mb-4 border border-amber-glow/40 p-3 bg-amber-glow/[0.03]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] text-amber-glow tracking-wider2">
              ░ MEDIA INPUT
            </div>
            {mediaUrl && (
              <button
                onClick={clearMedia}
                className="text-ink-300 hover:text-amber-glow text-[10px]"
              >
                [×]
              </button>
            )}
          </div>
          {mediaUrl ? (
            <div className="text-ink-50 text-[11px] truncate">{mediaName}</div>
          ) : (
            <label className="block cursor-pointer">
              <input
                type="file"
                accept="image/*,video/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleMediaUpload(f);
                }}
              />
              <div className="border border-dashed border-amber-glow/40 py-3 px-2 text-center text-[10px] text-amber-glow hover:bg-amber-glow/5">
                + IMAGEN / VIDEO
              </div>
            </label>
          )}
        </div>
      )}

      {/* palette */}
      <div className="mb-4">
        <div className="text-[10px] text-ink-300 tracking-wider2 mb-2">░ PALETTE</div>
        <div className="grid grid-cols-4 gap-1">
          {PALETTES.map((p) => (
            <button
              key={p.id}
              onClick={() => setPalette(p.id)}
              className={`py-2 flex flex-col items-center gap-1 border ${
                palette === p.id
                  ? 'border-osc'
                  : 'border-ink-500 hover:border-osc/50'
              }`}
            >
              <span className="w-3 h-3 rounded-full" style={{ background: p.sw }} />
              <span className="text-[9px] text-ink-300">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* sliders */}
      <div className="space-y-3">
        <Slider label="VOLUME" value={volume} onChange={setVolume} min={0} max={1} />
        <Slider label="INTENS" value={intensity} onChange={setIntensity} />
        <Slider label="SENSE" value={sensitivity} onChange={setSensitivity} />
        <Slider label="BLOOM" value={bloom} onChange={setBloom} />
      </div>
    </div>
  );
}
