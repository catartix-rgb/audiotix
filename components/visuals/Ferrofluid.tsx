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

  // Voronoi spikes need fine vertex resolution to look sharp.
  // 128 subdivisions = ~163k vertices. Heavier but worth it for the look.
  const geometry = useMemo(() => new IcosahedronGeometry(1, 128), []);

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

  const rotState = useRef({
    // Slower rotation than other modes — we want the user to SEE the columns
    speed: 0.015 + Math.random() * 0.025,
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
      const speedMod = 1.0 + 0.4 * Math.sin(t * 0.07 + r.phaseX);
      meshRef.current.rotation.y += delta * r.speed * speedMod;
      meshRef.current.rotation.x =
        Math.sin(t * 0.11 + r.phaseY) * 0.08 +
        Math.sin(t * 0.27 + r.phaseZ) * 0.03;
      meshRef.current.rotation.z =
        Math.cos(t * 0.08 + r.phaseZ) * 0.05;
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
