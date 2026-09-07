'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { STATION_POS } from '@/lib/layout';
import { useLabQuality } from './QualityContext';

const NO_HIT = () => null;

/**
 * The break corner. Deliberately round-topped and pedestal-based so it reads as
 * a cafe table at a glance, rather than as another rectangular production bench.
 *
 * Entirely decorative — nothing here takes a pointer hit.
 */
export function BreakArea() {
  const brewRef = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>(null);
  const { reducedMotion } = useLabQuality();
  const [x, , z] = STATION_POS.breakArea;

  useFrame(({ clock }) => {
    const lamp = brewRef.current;
    if (!lamp) return;
    // the machine's ready-light breathes slowly
    lamp.material.emissiveIntensity = reducedMotion
      ? 0.7
      : 0.45 + (Math.sin(clock.getElapsedTime() * 1.1) + 1) * 0.35;
  });

  return (
    <group position={[x, 0, z]}>
      {/* pedestal cafe table */}
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.44, 0.5, 0.1, 24]} />
        <meshStandardMaterial color={PALETTE.metalDark} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.11, 0.13, 0.85, 16]} />
        <meshStandardMaterial color={PALETTE.metal} roughness={0.4} metalness={0.45} />
      </mesh>
      <mesh position={[0, 0.96, 0]} castShadow receiveShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.78, 0.78, 0.09, 32]} />
        <meshStandardMaterial color={PALETTE.shell} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.915, 0]} raycast={NO_HIT}>
        <cylinderGeometry args={[0.8, 0.8, 0.03, 32]} />
        <meshStandardMaterial color={PALETTE.berry} roughness={0.7} />
      </mesh>

      {/* small espresso machine */}
      <group position={[-0.24, 1.0, -0.16]} rotation={[0, 0.45, 0]}>
        <RoundedBox args={[0.42, 0.34, 0.3]} radius={0.06} smoothness={4} position={[0, 0.17, 0]} castShadow raycast={NO_HIT}>
          <meshStandardMaterial color="#f6f1ea" roughness={0.4} />
        </RoundedBox>
        <RoundedBox args={[0.34, 0.12, 0.24]} radius={0.04} smoothness={3} position={[0, 0.4, 0]} castShadow raycast={NO_HIT}>
          <meshStandardMaterial color={PALETTE.berry} roughness={0.45} />
        </RoundedBox>
        {/* group head + drip tray */}
        <mesh position={[0, 0.14, 0.17]} castShadow raycast={NO_HIT}>
          <cylinderGeometry args={[0.04, 0.05, 0.1, 12]} />
          <meshStandardMaterial color={PALETTE.metalDark} roughness={0.35} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.03, 0.19]} raycast={NO_HIT}>
          <boxGeometry args={[0.22, 0.03, 0.14]} />
          <meshStandardMaterial color={PALETTE.metalDark} roughness={0.4} metalness={0.5} />
        </mesh>
        {/* ready light */}
        <mesh ref={brewRef} position={[0.14, 0.28, 0.16]} raycast={NO_HIT}>
          <sphereGeometry args={[0.028, 10, 8]} />
          <meshStandardMaterial color="#7bbf6a" emissive="#7bbf6a" emissiveIntensity={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* cups, tray, sugar */}
      {[
        [0.22, 0.1],
        [0.36, -0.14],
        [0.1, -0.3],
      ].map(([cx, cz], index) => (
        <group key={index} position={[cx, 1.0, cz]}>
          <mesh castShadow raycast={NO_HIT}>
            <cylinderGeometry args={[0.052, 0.042, 0.1, 14]} />
            <meshStandardMaterial color="#fdfaf4" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.038, 0]} raycast={NO_HIT}>
            <cylinderGeometry args={[0.044, 0.044, 0.016, 14]} />
            <meshStandardMaterial color="#6f4327" roughness={0.3} />
          </mesh>
          <mesh position={[0.058, 0.01, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={NO_HIT}>
            <torusGeometry args={[0.026, 0.008, 6, 12]} />
            <meshStandardMaterial color="#fdfaf4" roughness={0.4} />
          </mesh>
        </group>
      ))}
      <mesh position={[0.26, 0.97, -0.02]} rotation={[0, 0.3, 0]} raycast={NO_HIT}>
        <boxGeometry args={[0.34, 0.02, 0.26]} />
        <meshStandardMaterial color={PALETTE.wood} roughness={0.7} />
      </mesh>
      <mesh position={[-0.06, 1.02, 0.28]} castShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.06, 0.06, 0.13, 14]} />
        <meshStandardMaterial color="#e7dcc9" roughness={0.6} />
      </mesh>

      {/* two little stools */}
      {[
        [0.95, 0.55],
        [-0.75, 0.85],
      ].map(([sx, sz], index) => (
        <group key={index} position={[sx, 0, sz]}>
          <mesh position={[0, 0.46, 0]} castShadow receiveShadow raycast={NO_HIT}>
            <cylinderGeometry args={[0.24, 0.24, 0.1, 18]} />
            <meshStandardMaterial color={index ? PALETTE.mint : PALETTE.butter} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.21, 0]} castShadow raycast={NO_HIT}>
            <cylinderGeometry args={[0.06, 0.08, 0.42, 12]} />
            <meshStandardMaterial color={PALETTE.metal} roughness={0.45} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.02, 0]} raycast={NO_HIT}>
            <cylinderGeometry args={[0.2, 0.22, 0.04, 16]} />
            <meshStandardMaterial color={PALETTE.metalDark} roughness={0.5} metalness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
