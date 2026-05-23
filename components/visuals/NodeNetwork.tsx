'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BufferGeometry,
  BufferAttribute,
  LineSegments,
  LineBasicMaterial,
  Mesh,
  SphereGeometry,
  MeshBasicMaterial,
  Group,
  Color,
  Vector3,
  AdditiveBlending,
} from 'three';
import { audioEngine } from '@/hooks/useAudio';
import { useStore } from '@/hooks/useStore';
import { getPalette } from '@/lib/palettes';

const NODE_COUNT = 28;
const MAX_LINK_DIST = 1.6;

/**
 * Floating nodes connected by thin lines when they get close.
 * Each node breathes with bass; the links flash with beats.
 * Heavy lifting (link calc) runs on CPU but is O(N^2) with N=28 — trivial.
 */
export function NodeNetwork() {
  const groupRef = useRef<Group>(null);
  const linesRef = useRef<LineSegments>(null);
  const sensitivity = useStore((s) => s.sensitivity);
  const intensity = useStore((s) => s.intensity);
  const paletteName = useStore((s) => s.palette);

  // node positions and original radii
  const nodes = useMemo(() => {
    const arr: { pos: Vector3; basePos: Vector3; mesh: Mesh; phase: number }[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.4 + Math.random() * 0.6;
      const pos = new Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      );
      const mesh = new Mesh(
        new SphereGeometry(0.035, 12, 12),
        new MeshBasicMaterial({ color: new Color('#3DFFA2'), transparent: true }),
      );
      mesh.position.copy(pos);
      arr.push({ pos: pos.clone(), basePos: pos.clone(), mesh, phase: Math.random() * 6.28 });
    }
    return arr;
  }, []);

  // line segments buffer — preallocate max possible links
  const { lineGeom, lineMat } = useMemo(() => {
    const maxLinks = (NODE_COUNT * (NODE_COUNT - 1)) / 2;
    const positions = new Float32Array(maxLinks * 2 * 3);
    const geom = new BufferGeometry();
    geom.setAttribute('position', new BufferAttribute(positions, 3));
    geom.setDrawRange(0, 0);
    const mat = new LineBasicMaterial({
      color: new Color('#3DFFA2'),
      transparent: true,
      opacity: 0.35,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    return { lineGeom: geom, lineMat: mat };
  }, []);

  useFrame((state, delta) => {
    const frame = audioEngine.update(sensitivity);
    const palette = getPalette(paletteName);
    const t = state.clock.elapsedTime;

    // animate nodes
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const wobble = 0.08 * (1 + intensity);
      n.pos
        .copy(n.basePos)
        .multiplyScalar(1 + frame.bass * 0.25 * intensity)
        .add(
          new Vector3(
            Math.sin(t * 0.7 + n.phase) * wobble,
            Math.cos(t * 0.5 + n.phase * 1.3) * wobble,
            Math.sin(t * 0.6 + n.phase * 0.7) * wobble,
          ),
        );
      n.mesh.position.copy(n.pos);
      (n.mesh.material as MeshBasicMaterial).color
        .copy(palette.base)
        .lerp(palette.highlight, frame.beat);
      const s = 1 + frame.energy * 1.4 + frame.beat * 1.0;
      n.mesh.scale.setScalar(s);
    }

    // recompute links
    const posAttr = lineGeom.getAttribute('position') as BufferAttribute;
    let writeIdx = 0;
    const maxDist = MAX_LINK_DIST * (0.8 + frame.bass * 0.6);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = nodes[i].pos.distanceTo(nodes[j].pos);
        if (d < maxDist) {
          posAttr.array[writeIdx + 0] = nodes[i].pos.x;
          posAttr.array[writeIdx + 1] = nodes[i].pos.y;
          posAttr.array[writeIdx + 2] = nodes[i].pos.z;
          posAttr.array[writeIdx + 3] = nodes[j].pos.x;
          posAttr.array[writeIdx + 4] = nodes[j].pos.y;
          posAttr.array[writeIdx + 5] = nodes[j].pos.z;
          writeIdx += 6;
        }
      }
    }
    posAttr.needsUpdate = true;
    lineGeom.setDrawRange(0, writeIdx / 3);
    lineMat.color.copy(palette.base).lerp(palette.highlight, frame.beat * 0.6);
    lineMat.opacity = 0.18 + frame.energy * 0.7;

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.07;
      groupRef.current.rotation.x = Math.sin(t * 0.2) * 0.18;
    }
  });

  return (
    <group ref={groupRef}>
      {nodes.map((n, i) => (
        <primitive key={i} object={n.mesh} />
      ))}
      <lineSegments ref={linesRef} geometry={lineGeom} material={lineMat} />
    </group>
  );
}
