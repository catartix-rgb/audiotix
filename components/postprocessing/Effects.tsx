'use client';

import { EffectComposer, Bloom, ChromaticAberration, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';
import { useStore } from '@/hooks/useStore';
import { Vector2 } from 'three';
import { useMemo } from 'react';

export function Effects() {
  const bloom = useStore((s) => s.bloom);
  const offset = useMemo(() => new Vector2(0.0012, 0.0008), []);
  return (
   <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        intensity={0.8 * bloom}
        luminanceThreshold={0.18}
        luminanceSmoothing={0.85}
        kernelSize={KernelSize.LARGE}
        mipmapBlur
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={offset}
        radialModulation={false}
        modulationOffset={0}
      />
      <Noise opacity={0.04} premultiply blendFunction={BlendFunction.OVERLAY} />
      <Vignette eskil={false} offset={0.15} darkness={0.85} />
    </EffectComposer>
  );
}
