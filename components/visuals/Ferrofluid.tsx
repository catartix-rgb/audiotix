'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { IcosahedronGeometry, ShaderMaterial, Mesh, Color } from 'three';
import { audioEngine } from '@/hooks/useAudio';
import { useStore } from '@/hooks/useStore';
import { getPalette } from '@/lib/palettes';

import vertex from '@/shaders/ferrofluidVertex.glsl';
import fragment from '@/shaders/ferrofluidFragment.glsl';

export function Ferrofluid() {
  const meshRef = useRef<Mesh>(null);
  const intensity = useStore((s) => s.intensity);
  const sensitivity = useStore((s) => s.sensitivity);
  const paletteName = useStore((s) => s.palette);

  // High-res sphere — spikes need lots of vertices to look sharp
  const geometry = useMemo(() => new IcosahedronGeometry(1, 80), []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uHigh: { value: 0 },
      uBeat: { value: 0 },
      uEnergy: { value: 0 },
      uIntensity: { value: intensity },
      uColorBase: { value: new Color() },
      uColorAccent: { value: new Color() },
      uColorHighlight: { value: new Color() },
    }),
    [],
  );

  useFrame((_, delta) => {
    const frame = audioEngine.update(sensitivity);
    uniforms.uTime.value += delta;
    uniforms.uBass.value = frame.bass;
    uniforms.uMid.value = frame.mid;
    uniforms.uHigh.value = frame.high;
    uniforms.uBeat.value = frame.beat;
    uniforms.uEnergy.value = frame.energy;
    uniforms.uIntensity.value = intensity;

    const p = getPalette(paletteName);
    uniforms.uColorBase.value.copy(p.accent);
    uniforms.uColorAccent.value.copy(p.base);
    uniforms.uColorHighlight.value.copy(p.highlight);

    if (meshRef.current) {
      // very slow rotation — ferrofluid sculptures rotate barely visibly
      meshRef.current.rotation.y += delta * 0.04;
      meshRef.current.rotation.x = Math.sin(uniforms.uTime.value * 0.2) * 0.06;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <shaderMaterial
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
      />
    </mesh>
  );
}
