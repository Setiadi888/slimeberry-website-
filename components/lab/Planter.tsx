'use client';

import { useEffect, useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE } from '@/lib/palette';
import { FLOOR_TOP_Y } from '@/lib/layout';
import { NO_HIT } from './StationGroup';
import { Foliage } from './BotanicalPlants';

const TROUGH = '#e7ded0';
const TROUGH_RIM = '#d6c9b6';
const SOIL = '#4e4034';
const SPATHE = '#fbf7ef';
const SPADIX = '#f0e4a8';
const LILY_LEAF = '#2f6b3f';
const PINK = '#f2a0bd';
const BLUE = '#a8cde8';

const HEIGHT = 0.42;
const DEPTH = 0.52;

/**
 * A peace lily: a fan of dark lance leaves with three white spathes standing
 * over them, each with its pale spadix down the middle. The spathe is the whole
 * plant as far as recognising it goes — a hood of white where everything else is
 * green — so it is the one part drawn properly rather than suggested.
 */
function PeaceLily({ position, scale = 1, seed = 0 }: { position: [number, number, number]; scale?: number; seed?: number }) {
  const leaves = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 9; i += 1) {
      const angle = i * 2.399 + seed;
      const lean = 0.22 + (i % 3) * 0.16;
      const length = 0.52 + ((i * 7) % 5) * 0.045;
      /* A lance: a sphere pulled long and pressed flat, which at this size reads
         as a leaf and costs eight triangles rather than a shape's worth. */
      const leaf = new THREE.SphereGeometry(1, 8, 6).toNonIndexed();
      leaf.scale(0.085, length, 0.03);
      leaf.translate(0, length, 0);
      leaf.rotateX(lean);
      leaf.rotateY(angle);
      parts.push(leaf);
    }
    const merged = mergeGeometries(parts);
    parts.forEach((part) => part.dispose());
    return merged;
  }, [seed]);
  useEffect(() => () => leaves.dispose(), [leaves]);

  return (
    <group position={position} scale={scale}>
      <mesh geometry={leaves} castShadow raycast={NO_HIT}>
        <meshStandardMaterial color={LILY_LEAF} roughness={0.74} side={THREE.DoubleSide} />
      </mesh>
      {[0, 2.1, 4.2].map((angle, i) => (
        <group key={angle} rotation={[0, angle + seed, 0]}>
          <mesh position={[0.1, 0.46 + i * 0.07, 0]} rotation={[0, 0, -0.12]} raycast={NO_HIT}>
            <cylinderGeometry args={[0.009, 0.012, 0.92 + i * 0.14, 5]} />
            <meshStandardMaterial color="#54804a" roughness={0.85} />
          </mesh>
          {/* the hood, and the spadix standing in it */}
          <mesh
            position={[0.13, 0.95 + i * 0.14, 0.02]}
            rotation={[0.42, 0, -0.1]}
            castShadow
            raycast={NO_HIT}
          >
            <sphereGeometry args={[0.1, 10, 8, 0, Math.PI * 1.25, 0, Math.PI * 0.62]} />
            <meshStandardMaterial color={SPATHE} roughness={0.62} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0.13, 0.98 + i * 0.14, 0.05]} rotation={[0.3, 0, -0.1]} raycast={NO_HIT}>
            <cylinderGeometry args={[0.012, 0.016, 0.11, 6]} />
            <meshStandardMaterial color={SPADIX} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * A clump of small flowers — five petals round a yellow eye, on wiry stems, all
 * merged into one mesh. Filler, in the sense a florist means it: the colour that
 * goes in between the things with leaves.
 */
function Flowers({
  position,
  colour,
  count = 7,
  seed = 0,
  scale = 1,
}: {
  position: [number, number, number];
  colour: string;
  count?: number;
  seed?: number;
  scale?: number;
}) {
  const { petals, stems, eyes } = useMemo(() => {
    const petalParts: THREE.BufferGeometry[] = [];
    const stemParts: THREE.BufferGeometry[] = [];
    const eyeParts: THREE.BufferGeometry[] = [];
    const random = (n: number) => {
      const v = Math.sin(seed * 45.2 + n * 91.7) * 9871.23;
      return v - Math.floor(v);
    };
    for (let i = 0; i < count; i += 1) {
      const angle = random(i) * Math.PI * 2;
      const radius = 0.04 + random(i + 50) * 0.16;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const height = 0.16 + random(i + 11) * 0.16;

      const stem = new THREE.CylinderGeometry(0.004, 0.006, height, 4).toNonIndexed();
      stem.translate(x, height / 2, z);
      stemParts.push(stem);

      for (let p = 0; p < 5; p += 1) {
        const theta = (p / 5) * Math.PI * 2 + random(i + 7) * 2;
        const petal = new THREE.SphereGeometry(1, 6, 5).toNonIndexed();
        petal.scale(0.022, 0.009, 0.013);
        petal.translate(x + Math.cos(theta) * 0.022, height, z + Math.sin(theta) * 0.022);
        petalParts.push(petal);
      }
      const eye = new THREE.SphereGeometry(0.011, 6, 5).toNonIndexed();
      eye.translate(x, height + 0.002, z);
      eyeParts.push(eye);
    }
    const merge = (parts: THREE.BufferGeometry[]) => {
      const merged = mergeGeometries(parts);
      parts.forEach((part) => part.dispose());
      return merged;
    };
    return { petals: merge(petalParts), stems: merge(stemParts), eyes: merge(eyeParts) };
  }, [count, seed]);

  useEffect(
    () => () => {
      petals.dispose();
      stems.dispose();
      eyes.dispose();
    },
    [petals, stems, eyes],
  );

  return (
    <group position={position} scale={scale}>
      <mesh geometry={stems} raycast={NO_HIT}>
        <meshStandardMaterial color="#6d9150" roughness={0.9} />
      </mesh>
      <mesh geometry={petals} castShadow raycast={NO_HIT}>
        <meshStandardMaterial color={colour} roughness={0.66} />
      </mesh>
      <mesh geometry={eyes} raycast={NO_HIT}>
        <meshStandardMaterial color="#f7d978" roughness={0.6} />
      </mesh>
    </group>
  );
}

/**
 * The long planter in front of the door through to SB Mart.
 *
 * It replaces the two pots that stood either side of that corner, which read as
 * two pots rather than as planting. One trough, filled the way a planted bed
 * actually is: the big architectural things at the back and the ends — two
 * monstera and two peace lilies — with pink and baby blue filler worked in
 * between them so there is no bare soil showing between the stems.
 */
export function Planter({
  position,
  length = 3.3,
  rotation = 0,
}: {
  position: [number, number, number];
  length?: number;
  rotation?: number;
}) {
  const soilY = HEIGHT - 0.07;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* trough, rim and the soil inside it */}
      <RoundedBox
        args={[length, HEIGHT, DEPTH]}
        radius={0.035}
        smoothness={3}
        position={[0, FLOOR_TOP_Y + HEIGHT / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={TROUGH} roughness={0.85} />
      </RoundedBox>
      <mesh position={[0, FLOOR_TOP_Y + HEIGHT - 0.015, 0]} castShadow raycast={NO_HIT}>
        <boxGeometry args={[length + 0.05, 0.05, DEPTH + 0.05]} />
        <meshStandardMaterial color={TROUGH_RIM} roughness={0.8} />
      </mesh>
      <mesh position={[0, FLOOR_TOP_Y + soilY, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={NO_HIT}>
        <planeGeometry args={[length - 0.08, DEPTH - 0.08]} />
        <meshStandardMaterial color={SOIL} roughness={1} />
      </mesh>
      {/* a shallow foot, so it sits on the floor rather than in it */}
      <mesh position={[0, FLOOR_TOP_Y + 0.025, 0]} raycast={NO_HIT}>
        <boxGeometry args={[length - 0.12, 0.05, DEPTH - 0.1]} />
        <meshStandardMaterial color={PALETTE.metalDark} roughness={0.7} />
      </mesh>

      <group position={[0, FLOOR_TOP_Y + soilY, 0]}>
        {/* the two monstera, at the ends and set back */}
        <group position={[-length / 2 + 0.42, 0, -0.06]} scale={1.25}>
          <Foliage kind="monstera" seed={1.2} />
        </group>
        <group position={[length / 2 - 0.42, 0, -0.06]} scale={1.15}>
          <Foliage kind="monstera" seed={2.8} />
        </group>

        {/* the peace lilies, inboard of them */}
        <PeaceLily position={[-0.52, 0, 0.02]} scale={1.12} seed={0.6} />
        <PeaceLily position={[0.58, 0, -0.02]} scale={1.0} seed={2.1} />

        {/* and the colour, worked into every gap along the front */}
        <Flowers position={[-length / 2 + 0.78, 0, 0.12]} colour={PINK} seed={3} count={8} />
        <Flowers position={[-0.06, 0, 0.13]} colour={BLUE} seed={9} count={9} scale={1.1} />
        <Flowers position={[0.26, 0, -0.1]} colour={PINK} seed={5} count={6} />
        <Flowers position={[length / 2 - 0.8, 0, 0.12]} colour={BLUE} seed={13} count={8} />
        <Flowers position={[-1.1, 0, -0.08]} colour={BLUE} seed={17} count={5} scale={0.9} />
        <Flowers position={[1.12, 0, 0.1]} colour={PINK} seed={21} count={7} scale={1.05} />
      </group>
    </group>
  );
}
