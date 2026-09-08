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

      {/* Rug. Pulled back from its old spot so the belt, which now runs the
          full width of the floor, does not pass over it. */}
      <mesh position={[-2.0, 0.15, 0.35]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.0, 40]} />
        <meshStandardMaterial color="#ecdfe0" roughness={0.95} />
      </mesh>
      <mesh position={[-2.0, 0.16, 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.52, 1.68, 40]} />
        <meshStandardMaterial color={PALETTE.berry} roughness={0.95} opacity={0.5} transparent />
      </mesh>

      <PottedPlant position={[-7.1, 0.13, -3.6]} />
      <PottedPlant position={[7.2, 0.13, -4.3]} scale={0.82} phase={2.4} variant="succulent" />
      {/* Tucked into the front corner, clear of the belt's new lane. */}
      <PottedPlant position={[-7.1, 0.13, 5.05]} scale={0.7} phase={4.1} variant="succulent" />

      <Crate position={[-1.9, 0.13, -4.9]} rotation={0.3} />
      <Crate position={[-1.15, 0.13, -4.75]} rotation={-0.2} scale={0.8} />
    </group>
  );
}

/**
 * Desert planting, in two forms: a ribbed columnar cactus with arms, and a
 * rosette succulent. Both are far better suited to a factory than a leafy
 * houseplant — nobody in here has time to water anything — and both are cheaper
 * than the leaf cluster they replace.
 */
function PottedPlant({
  position,
  scale = 1,
  phase = 0,
  variant = 'cactus',
}: {
  position: [number, number, number];
  scale?: number;
  phase?: number;
  variant?: 'cactus' | 'succulent';
}) {
  const bodyRef = useRef<THREE.Group>(null);

  // barely-there sway; enough that the eye registers the room as not frozen
  useFrame(({ clock }) => {
    if (!bodyRef.current) return;
    const t = clock.getElapsedTime() + phase;
    bodyRef.current.rotation.z = Math.sin(t * 0.45) * 0.022;
    bodyRef.current.rotation.x = Math.cos(t * 0.33) * 0.016;
  });

  return (
    <group position={position} scale={scale}>
      {/* terracotta pot */}
      <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.34, 0.26, 0.6, 20]} />
        <meshStandardMaterial color="#dba98c" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.37, 0.37, 0.1, 20]} />
        <meshStandardMaterial color="#c9917a" roughness={0.8} />
      </mesh>
      {/* grit on top, so nothing floats out of bare soil */}
      <mesh position={[0, 0.66, 0]}>
        <cylinderGeometry args={[0.33, 0.33, 0.03, 20]} />
        <meshStandardMaterial color="#cbbfae" roughness={0.95} />
      </mesh>

      <group ref={bodyRef} position={[0, 0.67, 0]}>
        {variant === 'cactus' ? (
          <>
            {/* trunk, and two arms at different heights */}
            <mesh position={[0, 0.5, 0]} castShadow>
              <capsuleGeometry args={[0.17, 0.72, 6, 16]} />
              <meshStandardMaterial color="#7fa860" roughness={0.78} />
            </mesh>
            {[
              [-1, 0.52, 0.3],
              [1, 0.74, 0.24],
            ].map(([side, height, arm], index) => (
              <group key={index} position={[(side as number) * 0.16, height as number, 0]}>
                <mesh
                  position={[(side as number) * 0.1, 0, 0]}
                  rotation={[0, 0, (side as number) * -1.15]}
                  castShadow
                >
                  <capsuleGeometry args={[0.085, arm as number, 5, 12]} />
                  <meshStandardMaterial color="#7fa860" roughness={0.78} />
                </mesh>
                <mesh position={[(side as number) * 0.24, (arm as number) * 0.5 + 0.06, 0]} castShadow>
                  <capsuleGeometry args={[0.085, 0.26, 5, 12]} />
                  <meshStandardMaterial color="#7fa860" roughness={0.78} />
                </mesh>
              </group>
            ))}
            {/* ribs — thin strips are all it takes to read as a cactus */}
            {[0, 1, 2, 3].map((index) => {
              const angle = (index / 4) * Math.PI * 2;
              return (
                <mesh
                  key={angle}
                  position={[Math.cos(angle) * 0.16, 0.5, Math.sin(angle) * 0.16]}
                >
                  <capsuleGeometry args={[0.016, 0.66, 4, 6]} />
                  <meshStandardMaterial color="#93bb73" roughness={0.8} />
                </mesh>
              );
            })}
            {/* one flower on top, because a cactus in bloom is a nicer thing */}
            <mesh position={[0, 0.96, 0]} castShadow>
              <sphereGeometry args={[0.075, 12, 10]} />
              <meshStandardMaterial color={PALETTE.berry} roughness={0.6} />
            </mesh>
          </>
        ) : (
          <>
            {/* rosette: three rings of leaves, tighter and steeper as they rise */}
            {[
              { count: 7, radius: 0.3, height: 0.06, tilt: 1.15, size: 0.2, tint: '#7fa860' },
              { count: 6, radius: 0.19, height: 0.17, tilt: 0.8, size: 0.16, tint: '#93bb73' },
              { count: 5, radius: 0.09, height: 0.26, tilt: 0.42, size: 0.12, tint: '#a8cf87' },
            ].map((ring, ringIndex) =>
              Array.from({ length: ring.count }, (_, index) => {
                const angle = (index / ring.count) * Math.PI * 2 + ringIndex * 0.5;
                return (
                  <mesh
                    key={`${ringIndex}-${index}`}
                    position={[
                      Math.cos(angle) * ring.radius,
                      ring.height,
                      Math.sin(angle) * ring.radius,
                    ]}
                    rotation={[Math.cos(angle) * ring.tilt, -angle, Math.sin(angle) * ring.tilt]}
                    scale={[0.5, 0.32, 1]}
                    castShadow
                  >
                    <sphereGeometry args={[ring.size, 10, 8]} />
                    <meshStandardMaterial color={ring.tint} roughness={0.72} />
                  </mesh>
                );
              }),
            )}
          </>
        )}
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
