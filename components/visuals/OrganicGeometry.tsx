'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { IcosahedronGeometry, ShaderMaterial, Mesh, Color } from 'three';
import { audioEngine } from '@/hooks/useAudio';
import { useStore } from '@/hooks/useStore';
import { getPalette } from '@/lib/palettes';

import vertex from '@/shaders/organicVertex.glsl';
import fragment from '@/shaders/organicFragment.glsl';

export function OrganicGeometry() {
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<ShaderMaterial>(null);
  const intensity = useStore((s) => s.intensity);
  const sensitivity = useStore((s) => s.sensitivity);
  const paletteName = useStore((s) => s.palette);

  const geometry = useMemo(() => new IcosahedronGeometry(1, 64), []);

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
    [], // create once; values get mutated in useFrame
  );

  useFrame((state, delta) => {
    const frame = audioEngine.update(sensitivity);
    const u = uniforms;
    u.uTime.value += delta;
    u.uBass.value = frame.bass;
    u.uMid.value = frame.mid;
    u.uHigh.value = frame.high;
    u.uBeat.value = frame.beat;
    u.uEnergy.value = frame.energy;
    u.uIntensity.value = intensity;

    const p = getPalette(paletteName);
    u.uColorBase.value.copy(p.base);
    u.uColorAccent.value.copy(p.accent);
    u.uColorHighlight.value.copy(p.highlight);

    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.08;
      meshRef.current.rotation.x += delta * 0.03;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent={false}
      />
    </mesh>
  );
}
