'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';

/**
 * The room shell: a cutaway diorama plinth with two walls, so the lab reads as
 * a miniature you are looking into rather than a room you are standing in.
 */
export function LabEnvironment() {
  return (
    <group>
      {/* Studio surface the diorama sits on. Without it the area beneath the
          plinth's front edge is bare background, which left a dead band across
          the lower third of the frame. Fog fades its rim, so it reads as a
          sweep rather than a disc. */}
      <mesh position={[0, -0.71, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[21, 64]} />
        <meshStandardMaterial color="#e2d4c0" roughness={0.95} />
      </mesh>
      {/* Soft pool under the plinth. `far` is short so it only catches the
          plinth itself, and `frames={1}` bakes it once — the plinth never
          moves, so there is nothing to recompute. */}
      <ContactShadows
        position={[0, -0.68, 0]}
        scale={23}
        far={1.6}
        blur={2.6}
        opacity={0.34}
        resolution={512}
        frames={1}
        color="#8a7358"
      />

      {/* plinth */}
      <RoundedBox args={[15.8, 0.7, 11.8]} radius={0.22} smoothness={4} position={[0, -0.35, 0]} receiveShadow castShadow>
        <meshStandardMaterial color={PALETTE.floorTrim} roughness={0.85} />
      </RoundedBox>

      {/* floor */}
      <RoundedBox args={[15.0, 0.22, 11.0]} radius={0.09} smoothness={3} position={[0, 0.02, 0]} receiveShadow>
        <meshStandardMaterial color={PALETTE.floor} roughness={0.78} />
      </RoundedBox>

      {/* floor inlay, marks out the working area */}
      <mesh position={[0.1, 0.14, 0.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10.6, 6.6]} />
        <meshStandardMaterial color="#f0e6d6" roughness={0.9} />
      </mesh>

      {/* back wall */}
      <RoundedBox args={[15.0, 5.4, 0.34]} radius={0.1} smoothness={3} position={[0, 2.7, -5.6]} receiveShadow castShadow>
        <meshStandardMaterial color={PALETTE.wall} roughness={0.92} />
      </RoundedBox>
      <mesh position={[0, 0.62, -5.41]}>
        <boxGeometry args={[15.0, 0.42, 0.06]} />
        <meshStandardMaterial color={PALETTE.wallTrim} roughness={0.85} />
      </mesh>
      <mesh position={[0, 3.6, -5.41]}>
        <boxGeometry args={[15.0, 0.5, 0.05]} />
        <meshStandardMaterial color={PALETTE.wallMint} roughness={0.9} />
      </mesh>

      {/* left wall */}
      <RoundedBox args={[0.34, 5.4, 11.0]} radius={0.1} smoothness={3} position={[-7.6, 2.7, 0]} receiveShadow castShadow>
        <meshStandardMaterial color={PALETTE.wall} roughness={0.92} />
      </RoundedBox>
      <mesh position={[-7.41, 0.62, 0]}>
        <boxGeometry args={[0.06, 0.42, 11.0]} />
        <meshStandardMaterial color={PALETTE.wallTrim} roughness={0.85} />
      </mesh>

      {/* window on the back wall, with a warm pane */}
      <group position={[-2.2, 3.0, -5.38]}>
        <RoundedBox args={[2.5, 1.8, 0.16]} radius={0.09} smoothness={3}>
          <meshStandardMaterial color={PALETTE.shell} roughness={0.7} />
        </RoundedBox>
        <mesh position={[0, 0, 0.1]}>
          <planeGeometry args={[2.1, 1.4]} />
          <meshStandardMaterial color="#fdf1dc" emissive="#ffe9c6" emissiveIntensity={0.5} roughness={1} />
        </mesh>
        <mesh position={[0, 0, 0.13]}>
          <boxGeometry args={[0.07, 1.42, 0.03]} />
          <meshStandardMaterial color={PALETTE.shell} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.13]}>
          <boxGeometry args={[2.12, 0.07, 0.03]} />
          <meshStandardMaterial color={PALETTE.shell} roughness={0.7} />
        </mesh>
      </group>

      {/* wall sign: a slime drop instead of 3D text, so nothing has to be fetched */}
      <group position={[4.6, 3.7, -5.34]}>
        <mesh castShadow>
          <circleGeometry args={[0.62, 32]} />
          <meshStandardMaterial color={PALETTE.berry} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <circleGeometry args={[0.44, 32]} />
          <meshStandardMaterial color={PALETTE.shell} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.04, 0.04]} scale={[0.5, 0.62, 0.5]}>
          <sphereGeometry args={[0.36, 20, 16]} />
          <meshStandardMaterial color={PALETTE.berry} roughness={0.35} metalness={0.05} />
        </mesh>
      </group>

      {/* rug */}
      <mesh position={[-1.6, 0.15, 1.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.4, 40]} />
        <meshStandardMaterial color="#ecdfe0" roughness={0.95} />
      </mesh>
      <mesh position={[-1.6, 0.16, 1.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.85, 2.02, 40]} />
        <meshStandardMaterial color={PALETTE.berry} roughness={0.95} opacity={0.5} transparent />
      </mesh>

      <PottedPlant position={[-7.1, 0.13, -3.6]} />
      <PottedPlant position={[7.1, 0.13, 4.3]} scale={0.78} phase={2.4} />
      <PottedPlant position={[-7.15, 0.13, 4.4]} scale={0.62} phase={4.1} />

      <Crate position={[-1.9, 0.13, -4.9]} rotation={0.3} />
      <Crate position={[-1.15, 0.13, -4.75]} rotation={-0.2} scale={0.8} />
    </group>
  );
}

function PottedPlant({
  position,
  scale = 1,
  phase = 0,
}: {
  position: [number, number, number];
  scale?: number;
  phase?: number;
}) {
  const leavesRef = useRef<THREE.Group>(null);

  // barely-there sway; enough that the eye registers the room as not frozen
  useFrame(({ clock }) => {
    if (!leavesRef.current) return;
    const t = clock.getElapsedTime() + phase;
    leavesRef.current.rotation.z = Math.sin(t * 0.55) * 0.045;
    leavesRef.current.rotation.x = Math.cos(t * 0.4) * 0.03;
  });

  return (
    <group position={position} scale={scale}>
      <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.34, 0.26, 0.6, 20]} />
        <meshStandardMaterial color="#dba98c" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.37, 0.37, 0.1, 20]} />
        <meshStandardMaterial color="#c9917a" roughness={0.8} />
      </mesh>
      <group ref={leavesRef} position={[0, 0.62, 0]}>
      {[
        [0, 0.55, 0, 0],
        [0.22, 0.42, -0.5, 0.15],
        [-0.2, 0.46, 0.45, -0.12],
        [0.05, 0.5, 0.9, -0.3],
      ].map(([x, h, rot, tilt], index) => (
        <mesh
          key={index}
          castShadow
          position={[x, 0.13 + h * 0.45, tilt]}
          rotation={[tilt, rot, x * 0.9]}
          scale={[0.2, h, 0.14]}
        >
          <sphereGeometry args={[1, 14, 12]} />
          <meshStandardMaterial color={index % 2 ? '#8fbc6d' : PALETTE.mint} roughness={0.7} />
        </mesh>
      ))}
      </group>
    </group>
  );
}

function Crate({
  position,
  rotation = 0,
  scale = 1,
}: {
  position: [number, number, number];
  rotation?: number;
  scale?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <RoundedBox args={[0.9, 0.7, 0.9]} radius={0.08} smoothness={3} position={[0, 0.35, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={PALETTE.wood} roughness={0.82} />
      </RoundedBox>
      <mesh position={[0, 0.35, 0.46]}>
        <boxGeometry args={[0.72, 0.16, 0.03]} />
        <meshStandardMaterial color={PALETTE.woodDark} roughness={0.8} />
      </mesh>
    </group>
  );
}
