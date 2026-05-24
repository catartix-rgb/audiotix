'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { IcosahedronGeometry, ShaderMaterial, Mesh, Color, Vector3 } from 'three';
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

  // Higher-density mesh — spikes need fine vertex resolution
  const geometry = useMemo(() => new IcosahedronGeometry(1, 96), []);

  // Random seed per mount — fluid looks different every session
  const seed = useMemo(() => Math.random() * 100, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uHigh: { value: 0 },
      uBeat: { value: 0 },
      uEnergy: { value: 0 },
      uIntensity: { value: intensity },
      uSeed: { value: seed },
      uColorBase: { value: new Color() },
      uColorAccent: { value: new Color() },
      uColorHighlight: { value: new Color() },
    }),
    [seed],
  );

  // Rotation state — speed varies per session, axis wobbles over time
  const rotState = useRef({
    speed: 0.02 + Math.random() * 0.04,   // base speed varies per session
    axisDrift: new Vector3(Math.random(), Math.random(), Math.random()).normalize(),
    phaseX: Math.random() * 10,
    phaseY: Math.random() * 10,
    phaseZ: Math.random() * 10,
  });

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
      const t = uniforms.uTime.value;
      const r = rotState.current;
      // Rotation rate that itself varies (slower than the audio, faster
      // than the breathing). Plus tiny tilt that wanders.
      const speedMod = 1.0 + 0.4 * Math.sin(t * 0.07 + r.phaseX);
      meshRef.current.rotation.y += delta * r.speed * speedMod;
      meshRef.current.rotation.x =
        Math.sin(t * 0.13 + r.phaseY) * 0.12 +
        Math.sin(t * 0.31 + r.phaseZ) * 0.04;
      meshRef.current.rotation.z =
        Math.cos(t * 0.09 + r.phaseZ) * 0.08;
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
