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

      {/* Proper mugs, not the little espresso cups: wider, straight-sided, with
          a real handle and a saucer under one of them. This is the corner people
          actually stand around, so it wanted the mug you would bring to it. */}
      {[
        { at: [0.3, 0.12] as const, tint: PALETTE.berry, angle: 0.5, saucer: true },
        { at: [0.12, -0.32] as const, tint: '#8ed0e8', angle: -1.1, saucer: false },
        { at: [0.44, -0.1] as const, tint: PALETTE.butter, angle: 2.2, saucer: false },
      ].map(({ at, tint, angle, saucer }, index) => (
        <group key={index} position={[at[0], 1.0, at[1]]} rotation={[0, angle, 0]}>
          {saucer && (
            <mesh position={[0, 0.008, 0]} castShadow receiveShadow raycast={NO_HIT}>
              <cylinderGeometry args={[0.105, 0.1, 0.016, 20]} />
              <meshStandardMaterial color="#fdfaf4" roughness={0.45} />
            </mesh>
          )}
          <mesh position={[0, saucer ? 0.085 : 0.075, 0]} castShadow raycast={NO_HIT}>
            <cylinderGeometry args={[0.072, 0.066, 0.14, 20]} />
            <meshStandardMaterial color="#fdfaf4" roughness={0.4} />
          </mesh>
          {/* a band of colour, the way a mug set is usually told apart */}
          <mesh position={[0, saucer ? 0.045 : 0.035, 0]} raycast={NO_HIT}>
            <cylinderGeometry args={[0.0735, 0.069, 0.045, 20]} />
            <meshStandardMaterial color={tint} roughness={0.5} />
          </mesh>
          {/* coffee */}
          <mesh position={[0, saucer ? 0.142 : 0.132, 0]} raycast={NO_HIT}>
            <cylinderGeometry args={[0.062, 0.062, 0.012, 20]} />
            <meshStandardMaterial color="#5b3a26" roughness={0.3} />
          </mesh>
          {/* handle */}
          <mesh
            position={[0.078, saucer ? 0.085 : 0.075, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
            raycast={NO_HIT}
          >
            <torusGeometry args={[0.038, 0.011, 8, 16, Math.PI * 1.1]} />
            <meshStandardMaterial color="#fdfaf4" roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* the wooden tray and the sugar tin they all sit near */}
      <mesh position={[0.24, 0.97, -0.04]} rotation={[0, 0.3, 0]} raycast={NO_HIT}>
        <boxGeometry args={[0.34, 0.02, 0.26]} />
        <meshStandardMaterial color={PALETTE.wood} roughness={0.7} />
      </mesh>
      <mesh position={[-0.08, 1.02, 0.3]} castShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.06, 0.06, 0.13, 14]} />
        <meshStandardMaterial color="#e7dcc9" roughness={0.6} />
      </mesh>

      {/* two little stools */}
      {/* Pulled in toward the table: the corner they now sit in is tighter than
          the old one, and a stool must not overhang the plinth. */}
      {[
        [0.95, 0.45],
        [-0.85, 0.6],
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
