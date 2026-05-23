'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  BufferGeometry,
  BufferAttribute,
  ShaderMaterial,
  Points,
  AdditiveBlending,
  Color,
} from 'three';
import { audioEngine } from '@/hooks/useAudio';
import { useStore } from '@/hooks/useStore';
import { getPalette } from '@/lib/palettes';

import vertex from '@/shaders/particlesVertex.glsl';
import fragment from '@/shaders/particlesFragment.glsl';

const COUNT = 6000;

export function Particles() {
  const pointsRef = useRef<Points>(null);
  const intensity = useStore((s) => s.intensity);
  const sensitivity = useStore((s) => s.sensitivity);
  const paletteName = useStore((s) => s.palette);
  const { viewport } = useThree();

  const geometry = useMemo(() => {
    const geom = new BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    const radii = new Float32Array(COUNT);
    const speeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3 + 0] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      seeds[i] = Math.random();
      // distribute particles across a band of radii for depth
      radii[i] = 0.8 + Math.random() * 2.6;
      speeds[i] = (Math.random() - 0.5) * 2;
    }
    geom.setAttribute('position', new BufferAttribute(positions, 3));
    geom.setAttribute('aSeed', new BufferAttribute(seeds, 1));
    geom.setAttribute('aRadius', new BufferAttribute(radii, 1));
    geom.setAttribute('aSpeed', new BufferAttribute(speeds, 1));
    return geom;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uHigh: { value: 0 },
      uBeat: { value: 0 },
      uIntensity: { value: intensity },
      uPixelRatio: {
        value:
          typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1,
      },
      uColorBase: { value: new Color() },
      uColorHighlight: { value: new Color() },
    }),
    [],
  );

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [uniforms],
  );

  useFrame((_, delta) => {
    const frame = audioEngine.update(sensitivity);
    uniforms.uTime.value += delta;
    uniforms.uBass.value = frame.bass;
    uniforms.uMid.value = frame.mid;
    uniforms.uHigh.value = frame.high;
    uniforms.uBeat.value = frame.beat;
    uniforms.uIntensity.value = intensity;
    const p = getPalette(paletteName);
    uniforms.uColorBase.value.copy(p.base);
    uniforms.uColorHighlight.value.copy(p.highlight);

    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.06;
    }
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}
