'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLabQuality } from './QualityContext';

/**
 * Ambient motes drifting through the room. One InstancedMesh so the whole
 * effect costs a single draw call.
 */
export function Particles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { particleCount, reducedMotion } = useLabQuality();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const motes = useMemo(
    () =>
      Array.from({ length: particleCount }, () => ({
        x: (Math.random() - 0.5) * 10,
        y: Math.random() * 4 + 0.4,
        z: (Math.random() - 0.5) * 8,
        scale: 0.018 + Math.random() * 0.03,
        speed: 0.04 + Math.random() * 0.07,
        drift: Math.random() * Math.PI * 2,
      })),
    [particleCount],
  );

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = reducedMotion ? 0 : clock.getElapsedTime();

    motes.forEach((mote, index) => {
      const y = ((mote.y + t * mote.speed) % 4.4) + 0.35;
      dummy.position.set(
        mote.x + Math.sin(t * 0.25 + mote.drift) * 0.28,
        y,
        mote.z + Math.cos(t * 0.2 + mote.drift) * 0.24,
      );
      dummy.scale.setScalar(mote.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particleCount]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 5]} />
      <meshBasicMaterial color="#fff6e6" transparent opacity={0.55} depthWrite={false} />
    </instancedMesh>
  );
}
