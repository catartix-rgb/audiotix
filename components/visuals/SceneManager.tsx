'use client';

import { useEffect, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useStore, VisualMode } from '@/hooks/useStore';
import { audioEngine } from '@/hooks/useAudio';
import { OrganicGeometry } from './OrganicGeometry';
import { Particles } from './Particles';
import { Oscilloscope } from './Oscilloscope';
import { NodeNetwork } from './NodeNetwork';
import { Ferrofluid } from './Ferrofluid';
import { Datamosh } from './Datamosh';
import { getPalette } from '@/lib/palettes';
import { colorEngine } from '@/lib/colorEngine';
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
    case 'ferrofluid':
      return <Ferrofluid />;
    case 'datamosh':
      return <Datamosh />;
  }
}

export function SceneManager() {
  const mode = useStore((s) => s.mode);
  const palette = useStore((s) => s.palette);
  const autoColor = useStore((s) => s.autoColor);
  const sensitivity = useStore((s) => s.sensitivity);
  const freeCamera = useStore((s) => s.freeCamera);
  const { camera, scene, gl } = useThree();
  const [activeMode, setActiveMode] = useState<VisualMode>(mode);

  // smooth crossfade-ish: dip cam out then back on mode change
  const transitionRef = useRef({ progress: 1, fromMode: mode });
  useEffect(() => {
    if (mode !== activeMode) {
      transitionRef.current = { progress: 0, fromMode: activeMode };
      setTimeout(() => setActiveMode(mode), 250);
    }
  }, [mode, activeMode]);

  // background + fog from palette (static palette only; auto handled in useFrame)
  useEffect(() => {
    if (autoColor) return;
    const p = getPalette(palette);
    scene.background = p.bg.clone() as Color;
    scene.fog = mode === 'datamosh' ? null : new Fog(p.bg.clone(), 4, 14);
    gl.setClearColor(p.bg, 1);
  }, [palette, scene, gl, mode, autoColor]);

  // mouse parallax (only used when freeCamera is OFF)
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
    const tr = transitionRef.current.progress;
    const camPullback = 1 - Math.sin(tr * Math.PI) * 0.5;

    const frame = audioEngine.update(sensitivity);
    const t = state.clock.elapsedTime;

    // Drive generative color + paint the background/fog when auto color is on
    if (autoColor) {
      colorEngine.update(frame, delta, t);
      const bg = colorEngine.palette.bg;
      if (scene.background instanceof Color) {
        scene.background.copy(bg);
      } else {
        scene.background = bg.clone();
      }
      if (mode !== 'datamosh') {
        if (!scene.fog) scene.fog = new Fog(bg.clone(), 4, 14);
        (scene.fog as Fog).color.copy(bg);
      }
      gl.setClearColor(bg, 1);
    }

    // Only animate camera when user is NOT in free-control mode
    if (!freeCamera) {
      // Datamosh wants a head-on framing
      if (activeMode === 'datamosh') {
        camera.position.x += (mouse.current.x * 0.15 - camera.position.x) * 0.05;
        camera.position.y += (-mouse.current.y * 0.1 - camera.position.y) * 0.05;
        const targetZ = 3.2 + Math.sin(t * 0.3) * 0.05 - frame.bass * 0.1;
        camera.position.z += (targetZ - camera.position.z) * 0.04;
        camera.lookAt(0, 0, 0);
      } else {
        const baseR = 4.2 * camPullback;
        const targetX = Math.sin(t * 0.12) * baseR * 0.4 + mouse.current.x * 0.6;
        const targetY = Math.cos(t * 0.09) * 0.6 + -mouse.current.y * 0.5;
        const targetZ = Math.cos(t * 0.12) * baseR + 3.5;
        const breath = 1 - frame.bass * 0.08;
        camera.position.x += (targetX * breath - camera.position.x) * 0.04;
        camera.position.y += (targetY - camera.position.y) * 0.04;
        camera.position.z += (targetZ * breath - camera.position.z) * 0.04;
        camera.lookAt(0, 0, 0);
      }
    }
  });

  return (
    <>
      <ModeRenderer mode={activeMode} />
      {freeCamera && (
        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={1.5}
          maxDistance={12}
          rotateSpeed={0.6}
          zoomSpeed={0.6}
          target={[0, 0, 0]}
        />
      )}
    </>
  );
}
