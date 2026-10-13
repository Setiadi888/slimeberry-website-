'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { useLabQuality } from './QualityContext';
import { NO_HIT } from './StationGroup';

/**
 * The camera in the corner, watching the room.
 *
 * Mounted where the two walls meet, up at the top, on a stub bracket — which is
 * the only place a camera ever goes in a room like this, and the one spot where
 * nothing else is competing for the wall.
 *
 * It sweeps rather than tracks: a slow sine, which is the right motion for this
 * because a sine already slows to a stop at each end and turns back, the way a
 * pan-and-tilt head does when it reaches its limit. A red light on the back
 * blinks while it moves, so the thing reads as switched on from across the room.
 *
 * Graphite rather than the white a real one would be: these walls are cream, and
 * a cream camera on a cream wall four metres up is invisible from the one angle
 * this room is ever looked at.
 */
export function SecurityCamera({
  position,
  /** Which way the bracket points before the sweep is added; into the room. */
  facing = Math.PI / 4,
  scale = 1.4,
  /** Half the total pan, in radians. */
  sweep = 0.62,
  /** Seconds for one full left-right-left. */
  period = 16,
}: {
  position: [number, number, number];
  facing?: number;
  scale?: number;
  sweep?: number;
  period?: number;
}) {
  const yawRef = useRef<THREE.Group>(null);
  const lampRef = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>(null);
  const { reducedMotion } = useLabQuality();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (yawRef.current) {
      yawRef.current.rotation.y = reducedMotion ? 0 : Math.sin((t * Math.PI * 2) / period) * sweep;
    }
    const lamp = lampRef.current;
    if (lamp) {
      // a slow blink, and a steadier glow when it is not panning
      lamp.material.emissiveIntensity = reducedMotion ? 0.6 : 0.25 + Math.max(0, Math.sin(t * 2.2)) ** 6 * 2.2;
    }
  });

  return (
    <group position={position} rotation={[0, facing, 0]} scale={scale}>
      {/* the bracket: a plate in the corner behind it and a short arm forward */}
      <mesh position={[0, 0.06, -0.07]} rotation={[0, Math.PI / 4, 0]} castShadow raycast={NO_HIT}>
        <boxGeometry args={[0.16, 0.16, 0.03]} />
        <meshStandardMaterial color={PALETTE.metal} roughness={0.45} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.015, 0.02]} rotation={[0.5, 0, 0]} castShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.022, 0.022, 0.2, 10]} />
        <meshStandardMaterial color={PALETTE.metal} roughness={0.45} metalness={0.4} />
      </mesh>

      <group ref={yawRef} position={[0, -0.075, 0.1]}>
        {/* housing */}
        <mesh castShadow raycast={NO_HIT}>
          <boxGeometry args={[0.13, 0.12, 0.3]} />
          <meshStandardMaterial color="#5c6572" roughness={0.5} metalness={0.2} />
        </mesh>
        {/* sun shade, a touch longer than the body */}
        <mesh position={[0, 0.068, 0.015]} castShadow raycast={NO_HIT}>
          <boxGeometry args={[0.15, 0.022, 0.33]} />
          <meshStandardMaterial color="#e9e3d8" roughness={0.6} />
        </mesh>
        {/* the lens: a dark barrel with a glass face */}
        <mesh position={[0, 0, 0.168]} rotation={[Math.PI / 2, 0, 0]} castShadow raycast={NO_HIT}>
          <cylinderGeometry args={[0.044, 0.048, 0.07, 16]} />
          <meshStandardMaterial color={PALETTE.metalDark} roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.204]} rotation={[-Math.PI / 2, 0, 0]} raycast={NO_HIT}>
          <circleGeometry args={[0.038, 16]} />
          <meshPhysicalMaterial color="#2b3440" roughness={0.05} clearcoat={1} />
        </mesh>
        {/* recording light on the back */}
        <mesh ref={lampRef} position={[0, 0.02, -0.14]} raycast={NO_HIT}>
          <sphereGeometry args={[0.018, 10, 8]} />
          <meshStandardMaterial color="#f06a6a" emissive="#e03a3a" emissiveIntensity={0.6} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}
