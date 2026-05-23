'use client';

import { useEffect, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useStore, VisualMode } from '@/hooks/useStore';
import { audioEngine } from '@/hooks/useAudio';
import { OrganicGeometry } from './OrganicGeometry';
import { Particles } from './Particles';
import { Oscilloscope } from './Oscilloscope';
import { NodeNetwork } from './NodeNetwork';
import { getPalette } from '@/lib/palettes';
import { Color, Fog } from 'three';

function ModeRenderer({ mode }: { mode: VisualMode }) {
  switch (mode) {
    case 'organic':
      return <OrganicGeometry />;
    case 'particles':
      return <Particles />;
    case 'oscilloscope':
      return <Oscilloscope />;
    case 'nodes':
      return <NodeNetwork />;
  }
}

/**
 * SceneManager:
 *  - holds the active mode + a pending mode for crossfade
 *  - drives the dynamic camera (smooth orbit, breathing on bass)
 *  - sets background color from palette
 */
export function SceneManager() {
  const mode = useStore((s) => s.mode);
  const palette = useStore((s) => s.palette);
  const sensitivity = useStore((s) => s.sensitivity);
  const { camera, scene, gl } = useThree();
  const [activeMode, setActiveMode] = useState<VisualMode>(mode);

  // crossfade-ish: just swap on mode change (a true fade would need render-to-texture).
  // Instead we ease the camera Z out then back in so the swap feels intentional.
  const transitionRef = useRef({ progress: 1, fromMode: mode });
  useEffect(() => {
    if (mode !== activeMode) {
      transitionRef.current = { progress: 0, fromMode: activeMode };
      // swap halfway through
      setTimeout(() => setActiveMode(mode), 250);
    }
  }, [mode, activeMode]);

  // set bg + fog from palette
  useEffect(() => {
    const p = getPalette(palette);
    scene.background = p.bg.clone() as Color;
    scene.fog = new Fog(p.bg.clone(), 4, 14);
    gl.setClearColor(p.bg, 1);
  }, [palette, scene, gl]);

  // dynamic cinematic camera
  const mouse = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useFrame((state, delta) => {
    transitionRef.current.progress = Math.min(1, transitionRef.current.progress + delta * 2);
    const tr = transitionRef.current.progress; // 0 (just changed) -> 1
    const camPullback = 1 - Math.sin(tr * Math.PI) * 0.5; // dip out then back

    const frame = audioEngine.update(sensitivity);
    const t = state.clock.elapsedTime;

    // gentle orbit
    const baseR = 4.2 * camPullback;
    const targetX = Math.sin(t * 0.12) * baseR * 0.4 + mouse.current.x * 0.6;
    const targetY = Math.cos(t * 0.09) * 0.6 + -mouse.current.y * 0.5;
    const targetZ = Math.cos(t * 0.12) * baseR + 3.5;

    // bass-driven breathing
    const breath = 1 - frame.bass * 0.08;

    camera.position.x += (targetX * breath - camera.position.x) * 0.04;
    camera.position.y += (targetY - camera.position.y) * 0.04;
    camera.position.z += (targetZ * breath - camera.position.z) * 0.04;
    camera.lookAt(0, 0, 0);
  });

  return <ModeRenderer mode={activeMode} />;
}
