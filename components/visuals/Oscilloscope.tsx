'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BufferGeometry,
  BufferAttribute,
  LineBasicMaterial,
  Line,
  Color,
  AdditiveBlending,
} from 'three';
import { audioEngine } from '@/hooks/useAudio';
import { useStore } from '@/hooks/useStore';
import { getPalette } from '@/lib/palettes';

const POINTS = 512;
const RINGS = 6;
const SPACING = 0.55;

/**
 * Stack of parallel oscilloscope lines that read live waveform data.
 * Feels like a frozen analog scope cluster.
 */
export function Oscilloscope() {
  const groupRef = useRef<any>(null);
  const sensitivity = useStore((s) => s.sensitivity);
  const intensity = useStore((s) => s.intensity);
  const paletteName = useStore((s) => s.palette);

  const lines = useMemo(() => {
    const arr: { geom: BufferGeometry; mat: LineBasicMaterial; line: Line }[] = [];
    for (let r = 0; r < RINGS; r++) {
      const positions = new Float32Array(POINTS * 3);
      for (let i = 0; i < POINTS; i++) {
        const x = (i / (POINTS - 1) - 0.5) * 4.5;
        positions[i * 3 + 0] = x;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = (r - (RINGS - 1) / 2) * SPACING;
      }
      const geom = new BufferGeometry();
      geom.setAttribute('position', new BufferAttribute(positions, 3));
      const mat = new LineBasicMaterial({
        color: new Color('#3DFFA2'),
        transparent: true,
        opacity: 1 - Math.abs(r - (RINGS - 1) / 2) / RINGS,
        blending: AdditiveBlending,
        depthWrite: false,
      });
      const line = new Line(geom, mat);
      arr.push({ geom, mat, line });
    }
    return arr;
  }, []);

  useFrame((state, delta) => {
    const frame = audioEngine.update(sensitivity);
    const wave = frame.wave;
    const step = wave.length / POINTS;
    const palette = getPalette(paletteName);

    for (let r = 0; r < RINGS; r++) {
      const { geom, mat } = lines[r];
      const attr = geom.getAttribute('position') as BufferAttribute;
      const ringPhase = (r / RINGS) * 0.15;
      for (let i = 0; i < POINTS; i++) {
        const v = wave[Math.floor(i * step + r * 4) % wave.length];
        // map 0..255 to -1..1 with intensity scaling
        const y = ((v - 128) / 128) * (0.9 + intensity * 0.6) + ringPhase * frame.bass;
        attr.setY(i, y);
      }
      attr.needsUpdate = true;
      // tint shift on highs / beat
      mat.color.copy(palette.base).lerp(palette.highlight, frame.beat * 0.7);
    }

    if (groupRef.current) {
      // gentle camera-friendly drift
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.25;
      groupRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {lines.map((l, i) => (
        <primitive key={i} object={l.line} />
      ))}
    </group>
  );
}
