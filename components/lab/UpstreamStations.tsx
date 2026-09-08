'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { STATION_POS } from '@/lib/layout';
import { useLabQuality } from './QualityContext';
import { NO_HIT, StationGroup } from './StationGroup';

/** Herb beds. Each entry is a planter of one ingredient. */
const HERBS = [
  { name: 'mint', leaf: '#8fbc6d', berry: null, x: -0.75 },
  { name: 'basil', leaf: '#6ea45a', berry: null, x: -0.25 },
  { name: 'strawberry', leaf: '#7fb35f', berry: '#e4536f', x: 0.25 },
  { name: 'blueberry', leaf: '#6f9e73', berry: '#5b6fc0', x: 0.75 },
  { name: 'chamomile', leaf: '#9dc47f', berry: '#fdf3c8', x: 1.25 },
] as const;

/**
 * The greenhouse: where the botanical ingredients come from. A glazed frame over
 * five planters, one per herb, each swaying on its own phase.
 */
export function Greenhouse() {
  const bedsRef = useRef<THREE.Group>(null);
  const { reducedMotion } = useLabQuality();

  useFrame(({ clock }) => {
    if (!bedsRef.current || reducedMotion) return;
    const t = clock.getElapsedTime();
    bedsRef.current.children.forEach((bed, index) => {
      bed.rotation.z = Math.sin(t * 0.5 + index * 1.3) * 0.05;
    });
  });

  return (
    <StationGroup id="greenhouse" position={STATION_POS.greenhouse} ringRadius={1.55} ringColor="#8fbc6d">
      {/* raised bed */}
      <RoundedBox args={[3.0, 0.42, 1.5]} radius={0.08} smoothness={3} position={[0, 0.21, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={PALETTE.wood} roughness={0.85} />
      </RoundedBox>
      <mesh position={[0, 0.44, 0]} raycast={NO_HIT}>
        <boxGeometry args={[2.8, 0.06, 1.32]} />
        <meshStandardMaterial color="#6b533c" roughness={0.95} />
      </mesh>

      {/* planting */}
      <group ref={bedsRef} position={[0, 0.47, 0]}>
        {HERBS.map((herb) => (
          <group key={herb.name} position={[herb.x, 0, 0]}>
            {[-0.22, 0, 0.22].map((z, leafIndex) => (
              <mesh
                key={z}
                position={[(leafIndex - 1) * 0.07, 0.18, z]}
                rotation={[0, leafIndex * 0.8, (leafIndex - 1) * 0.22]}
                scale={[0.09, 0.2, 0.07]}
                castShadow
                raycast={NO_HIT}
              >
                <sphereGeometry args={[1, 10, 8]} />
                <meshStandardMaterial color={herb.leaf} roughness={0.72} />
              </mesh>
            ))}
            {herb.berry && (
              <mesh position={[0.05, 0.28, 0.05]} castShadow raycast={NO_HIT}>
                <sphereGeometry args={[0.045, 10, 8]} />
                <meshStandardMaterial color={herb.berry} roughness={0.35} />
              </mesh>
            )}
          </group>
        ))}
      </group>

      {/* glazing: a light frame, panes left implied so the plants stay readable */}
      {[-1.5, 1.5].map((x) => (
        <mesh key={x} position={[x, 1.1, 0]} castShadow raycast={NO_HIT}>
          <boxGeometry args={[0.07, 1.7, 0.07]} />
          <meshStandardMaterial color={PALETTE.shell} roughness={0.55} />
        </mesh>
      ))}
      {[-0.72, 0.72].map((z) => (
        <mesh key={z} position={[0, 1.95, z]} rotation={[0, 0, 0]} castShadow raycast={NO_HIT}>
          <boxGeometry args={[3.08, 0.07, 0.07]} />
          <meshStandardMaterial color={PALETTE.shell} roughness={0.55} />
        </mesh>
      ))}
      <mesh position={[0, 1.95, 0]} raycast={NO_HIT}>
        <boxGeometry args={[3.08, 1.66, 1.5]} />
        <meshPhysicalMaterial color="#eaf6fb" roughness={0.06} transparent opacity={0.13} />
      </mesh>
      <mesh position={[0, 2.3, 0]} rotation={[0, 0, 0]} castShadow raycast={NO_HIT}>
        <boxGeometry args={[3.16, 0.09, 1.58]} />
        <meshStandardMaterial color={PALETTE.mint} roughness={0.6} />
      </mesh>
    </StationGroup>
  );
}

/** Texture bench: a small press over a slime pad, plus sample dishes. */
export function TextureLab() {
  const pressRef = useRef<THREE.Group>(null);
  const padRef = useRef<THREE.Mesh>(null);
  const { reducedMotion } = useLabQuality();

  useFrame(({ clock }) => {
    if (reducedMotion || !pressRef.current || !padRef.current) return;
    const t = clock.getElapsedTime();
    // press dips, pad squashes in response — the whole story of the station
    const dip = (Math.sin(t * 0.9) + 1) * 0.5;
    pressRef.current.position.y = 1.32 - dip * 0.16;
    padRef.current.scale.set(1 + dip * 0.12, 1 - dip * 0.3, 1 + dip * 0.12);
  });

  return (
    <StationGroup id="texture" position={STATION_POS.textureLab} rotation={Math.PI / 2} ringRadius={1.05} ringColor="#9dc47f">
      <RoundedBox args={[1.8, 0.13, 1.0]} radius={0.06} smoothness={3} position={[0, 0.93, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={PALETTE.shell} roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[1.6, 0.5, 0.85]} radius={0.07} smoothness={3} position={[0, 0.62, 0]} castShadow receiveShadow raycast={NO_HIT}>
        <meshStandardMaterial color="#eef2f7" roughness={0.6} />
      </RoundedBox>
      {[[-0.66, 0.34], [0.66, 0.34], [-0.66, -0.34], [0.66, -0.34]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.19, z]} castShadow raycast={NO_HIT}>
          <cylinderGeometry args={[0.05, 0.05, 0.38, 10]} />
          <meshStandardMaterial color={PALETTE.metalDark} roughness={0.45} metalness={0.35} />
        </mesh>
      ))}

      {/* gantry + plunger */}
      <mesh position={[-0.35, 1.28, 0]} castShadow raycast={NO_HIT}>
        <boxGeometry args={[0.09, 0.6, 0.09]} />
        <meshStandardMaterial color={PALETTE.metal} roughness={0.4} metalness={0.5} />
      </mesh>
      <group ref={pressRef} position={[0, 1.32, 0]}>
        <mesh position={[0.1, 0, 0]} castShadow raycast={NO_HIT}>
          <boxGeometry args={[0.72, 0.09, 0.16]} />
          <meshStandardMaterial color={PALETTE.metal} roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0.32, -0.12, 0]} castShadow raycast={NO_HIT}>
          <cylinderGeometry args={[0.1, 0.12, 0.2, 14]} />
          <meshStandardMaterial color={PALETTE.metalDark} roughness={0.4} metalness={0.5} />
        </mesh>
      </group>
      {/* the pad being squashed */}
      <mesh ref={padRef} position={[0.32, 1.03, 0]} castShadow raycast={NO_HIT}>
        <capsuleGeometry args={[0.14, 0.05, 5, 16]} />
        <meshPhysicalMaterial color="#f2a8c4" roughness={0.16} clearcoat={1} sheen={0.6} />
      </mesh>

      {/* sample dishes */}
      {['#a8d96a', '#8ed0e8', '#f7d774'].map((tint, i) => (
        <group key={tint} position={[-0.52 + i * 0.2, 1.0, 0.3]}>
          <mesh raycast={NO_HIT}>
            <cylinderGeometry args={[0.08, 0.08, 0.025, 14]} />
            <meshStandardMaterial color="#fdfaf4" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.025, 0]} raycast={NO_HIT}>
            <sphereGeometry args={[0.05, 10, 8]} />
            <meshPhysicalMaterial color={tint} roughness={0.2} clearcoat={0.8} />
          </mesh>
        </group>
      ))}
    </StationGroup>
  );
}
