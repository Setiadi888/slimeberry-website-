'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import type { WorkerPose } from '@/lib/workerPose';
import {
  sharedBox,
  sharedCapsule,
  sharedSphere,
  sharedStandard,
} from '@/lib/shared3d';

/*
  Three of these are on the floor at once, and every one of them used to build
  its own copy of the same twenty geometries and materials. They are identical
  by construction, so they are built once here and handed to every instance.

  The head is the exception: its material is animated — the face flushes when
  they are prodded — so it stays per-instance. Sharing a mutated material would
  flush all three faces at once.
*/
const LEG_GEO = sharedCapsule(0.06, 0.16, 4, 10);
const SHOE_GEO = sharedCapsule(0.075, 0.08, 4, 10);
const COLLAR_GEO = sharedBox(0.2, 0.09, 0.06);
const BUTTON_GEO = sharedSphere(0.018, 8, 6);
const ARM_GEO = sharedCapsule(0.048, 0.17, 4, 10);
const HAND_GEO = sharedSphere(0.055, 12, 10);
const HEAD_GEO = sharedSphere(0.225, 24, 20);
const EYE_GEO = sharedSphere(0.029, 12, 10);
const BROW_GEO = sharedBox(0.062, 0.015, 0.012);

const COLLAR_MAT = sharedStandard('#e7ecf3', 0.7);
const BUTTON_MAT = sharedStandard('#c6cedb', 0.5);
const EYE_MAT = sharedStandard(PALETTE.ink, 0.35);
const BROW_MAT = sharedStandard(PALETTE.ink, 0.5);

/* ------------------------------------------------------------------- mouth */

const HEAD_RADIUS = 0.225;
const MOUTH_SEGMENTS = 14;
const MOUTH_HALF_WIDTH = 0.038;
const MOUTH_DEPTH = 0.038;
/** Half the stroke's thickness at its middle — the radius of the old tube. */
const MOUTH_STROKE = 0.008;
/** How far proud of the skin the stroke is laid, so no part of it dips inside. */
const MOUTH_LIFT = 0.0025;

const mouthPoints = Array.from({ length: MOUTH_SEGMENTS + 1 }, () => new THREE.Vector3());
const mouthTangent = new THREE.Vector3();
const mouthNormal = new THREE.Vector3();
const mouthSide = new THREE.Vector3();
const mouthEdge = new THREE.Vector3();

/**
 * Lays the mouth on the head for a given crossness: 0 a smile, 1 a frown.
 *
 * It used to be a flat half-torus, turned over through half a turn as the face
 * went cross — and a flat arc cannot follow a round head. The smile got away with
 * it, because its middle hangs below the corners where the head falls away. But
 * turned over, the middle rose to where the head bulges furthest forward, which
 * put it inside the skull: all that was left of a properly cross mouth was its
 * two corners, floating apart. The stroke is now bent rather than turned, and
 * every point along it is placed on the surface of the head whatever the bend.
 */
function drawMouth(geometry: THREE.BufferGeometry, grumpy: number): void {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const normal = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const bend = 1 - 2 * grumpy;
  const corners = -0.055 - grumpy * 0.014;
  const radius = HEAD_RADIUS + MOUTH_LIFT;

  mouthPoints.forEach((point, i) => {
    const t = (i / MOUTH_SEGMENTS) * Math.PI;
    const x = -Math.cos(t) * MOUTH_HALF_WIDTH;
    const y = corners - Math.sin(t) * MOUTH_DEPTH * bend;
    point.set(x, y, Math.sqrt(Math.max(radius * radius - x * x - y * y, 0)));
  });

  mouthPoints.forEach((point, i) => {
    const before = mouthPoints[Math.max(0, i - 1)];
    const after = mouthPoints[Math.min(MOUTH_SEGMENTS, i + 1)];
    mouthTangent.subVectors(after, before).normalize();
    mouthNormal.copy(point).normalize();
    mouthSide.crossVectors(mouthNormal, mouthTangent).normalize();
    // thinner toward the corners, so the ends read as rounded rather than cut off
    const half = MOUTH_STROKE * (0.55 + 0.45 * Math.sin((i / MOUTH_SEGMENTS) * Math.PI));
    for (let edge = 0; edge < 2; edge += 1) {
      mouthEdge.copy(point).addScaledVector(mouthSide, edge === 0 ? half : -half).setLength(radius);
      position.setXYZ(i * 2 + edge, mouthEdge.x, mouthEdge.y, mouthEdge.z);
      normal.setXYZ(i * 2 + edge, mouthNormal.x, mouthNormal.y, mouthNormal.z);
    }
  });

  position.needsUpdate = true;
  normal.needsUpdate = true;
}

/** A strip of two vertices per sample, rewritten in place whenever the mood changes. */
function createMouth(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const vertices = (MOUTH_SEGMENTS + 1) * 2;
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(vertices * 3), 3).setUsage(THREE.DynamicDrawUsage),
  );
  geometry.setAttribute(
    'normal',
    new THREE.BufferAttribute(new Float32Array(vertices * 3), 3).setUsage(THREE.DynamicDrawUsage),
  );
  const index: number[] = [];
  for (let i = 0; i < MOUTH_SEGMENTS; i += 1) {
    const a = i * 2;
    index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  geometry.setIndex(index);
  // set once by hand: the vertices move, and a computed sphere would go stale
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -0.055, 0.19), 0.07);
  drawMouth(geometry, 0);
  return geometry;
}

export type WorkerHairStyle =
  | 'wavy-bob'
  | 'high-bun'
  | 'curly-crop'
  | 'side-pony'
  | 'side-part'
  | 'low-pony'
  | 'soft-crop'
  | 'double-bun';

export type WorkerHeadwear =
  | 'beret'
  | 'headband'
  | 'back-cap'
  | 'beanie'
  | 'visor'
  | 'kerchief'
  | 'shop-cap'
  | 'bow'
  /* The shop keepers' own, never handed out at random. */
  | 'strawberry-clip'
  | 'sunglasses'
  | 'headphones'
  | 'aviator'
  | 'flower-cap';

/** What someone is. The factory is all human; the shop is not. */
export type WorkerSpecies = 'human' | 'cat' | 'bunny' | 'bear' | 'penguin';

export type WorkerMotif = 'drop' | 'check' | 'parcel' | 'moon' | 'star' | 'leaf' | 'berry' | 'flower';

export type WorkerEyes = 'round' | 'soft' | 'focused' | 'sparkle';

/**
 * How one of them looks. Only the three colours are required: the rest of the
 * wardrobe is optional, and anything left out is chosen for that character from
 * the colours they already have — so a cast written before hair styles and hats
 * existed still gets a full set, and every one of them a different one.
 */
export interface WorkerAppearance {
  skin: string;
  hair: string;
  cap: string;
  uniform?: string;
  trousers?: string;
  shoes?: string;
  accent?: string;
  hairStyle?: WorkerHairStyle;
  headwear?: WorkerHeadwear;
  motif?: WorkerMotif;
  outfit?: 'lab' | 'mart';
  eyes?: WorkerEyes;
  /** Anything but 'human' swaps the hair for ears and a muzzle. */
  species?: WorkerSpecies;
  /** Ears and tail, where they are not the same colour as the head. */
  fur?: string;
  /** The muzzle, the beak, or a penguin's face. */
  muzzle?: string;
  /** A cross-body strap and its pouch. Empty for anyone who carries nothing. */
  sling?: string;
  tail?: boolean;
}

const HAIR_STYLES: WorkerHairStyle[] = [
  'wavy-bob', 'high-bun', 'curly-crop', 'side-pony', 'side-part', 'low-pony', 'soft-crop', 'double-bun',
];
const HEADWEAR: WorkerHeadwear[] = [
  'beret', 'headband', 'back-cap', 'beanie', 'visor', 'kerchief', 'shop-cap', 'bow',
];
const MOTIFS: WorkerMotif[] = ['drop', 'check', 'parcel', 'moon', 'star', 'leaf', 'berry', 'flower'];
const EYE_SHAPES: WorkerEyes[] = ['round', 'soft', 'focused', 'sparkle'];

/** Stable across reloads: the same character always draws the same wardrobe. */
function hashOf(text: string): number {
  let value = 0;
  for (let i = 0; i < text.length; i += 1) value = (value * 31 + text.charCodeAt(i)) >>> 0;
  return value;
}

type Look = Required<WorkerAppearance>;

function lookOf(appearance: WorkerAppearance): Look {
  const seed = hashOf(`${appearance.skin}|${appearance.hair}|${appearance.cap}`);
  return {
    skin: appearance.skin,
    hair: appearance.hair,
    cap: appearance.cap,
    uniform: appearance.uniform ?? PALETTE.coat,
    trousers: appearance.trousers ?? '#6f7b8d',
    shoes: appearance.shoes ?? PALETTE.ink,
    accent: appearance.accent ?? appearance.cap,
    hairStyle: appearance.hairStyle ?? HAIR_STYLES[seed % HAIR_STYLES.length],
    headwear: appearance.headwear ?? HEADWEAR[(seed >>> 3) % HEADWEAR.length],
    motif: appearance.motif ?? MOTIFS[(seed >>> 7) % MOTIFS.length],
    outfit: appearance.outfit ?? 'lab',
    eyes: appearance.eyes ?? EYE_SHAPES[(seed >>> 11) % EYE_SHAPES.length],
    species: appearance.species ?? 'human',
    fur: appearance.fur ?? appearance.skin,
    muzzle: appearance.muzzle ?? '#fdfaf4',
    sling: appearance.sling ?? '',
    tail: appearance.tail ?? false,
  };
}

/** How wide and tall an eye is drawn, per shape. */
const EYE_SCALE: Record<WorkerEyes, [number, number, number]> = {
  round: [1, 1, 1],
  soft: [1.05, 0.72, 1],
  focused: [0.84, 0.84, 0.84],
  sparkle: [1.06, 1.06, 1.06],
};

function Hair({ style, material }: { style: WorkerHairStyle; material: THREE.Material }) {
  const curl = (key: string, position: [number, number, number], scale: [number, number, number]) => (
    <mesh key={key} position={position} scale={scale} material={material} castShadow>
      <sphereGeometry args={[0.09, 12, 10]} />
    </mesh>
  );

  return (
    <group>
      <mesh position={[0, 0.075, -0.035]} scale={[1.03, 0.82, 1.02]} material={material} castShadow>
        <sphereGeometry args={[0.226, 22, 18, 0, Math.PI * 2, 0, Math.PI / 1.72]} />
      </mesh>
      {style === 'wavy-bob' && <>
        {curl('wl', [-0.17, -0.055, -0.015], [0.72, 1.35, 0.78])}
        {curl('wr', [0.17, -0.055, -0.015], [0.72, 1.35, 0.78])}
        {curl('wf', [-0.075, 0.145, 0.13], [0.9, 0.48, 0.45])}
      </>}
      {style === 'high-bun' && <>
        {curl('bun', [0, 0.265, -0.055], [1.15, 1.15, 1.0])}
        {curl('bang', [0.085, 0.13, 0.155], [0.95, 0.48, 0.42])}
      </>}
      {style === 'curly-crop' && <>
        {[-0.15, -0.075, 0, 0.075, 0.15].map((x, index) =>
          curl(`curl-${index}`, [x, 0.17 + (index % 2) * 0.025, 0.025], [0.76, 0.76, 0.76]))}
      </>}
      {style === 'side-pony' && <>
        {curl('pony-a', [0.225, 0.04, -0.06], [0.78, 1.1, 0.78])}
        {curl('pony-b', [0.255, -0.085, -0.07], [0.62, 0.9, 0.62])}
        {curl('sweep', [-0.07, 0.15, 0.145], [1.2, 0.45, 0.42])}
      </>}
      {style === 'side-part' && <>
        {curl('part-a', [-0.095, 0.16, 0.12], [1.35, 0.5, 0.44])}
        {curl('part-b', [0.11, 0.12, 0.145], [0.85, 0.45, 0.42])}
      </>}
      {style === 'low-pony' && <>
        {curl('low-a', [0, -0.04, -0.215], [0.92, 1.18, 0.78])}
        {curl('low-b', [0, -0.15, -0.23], [0.66, 0.9, 0.64])}
      </>}
      {style === 'soft-crop' && <>
        {curl('soft-a', [-0.1, 0.155, 0.11], [1.22, 0.55, 0.5])}
        {curl('soft-b', [0.09, 0.14, 0.135], [1.08, 0.5, 0.45])}
      </>}
      {style === 'double-bun' && <>
        {curl('db-l', [-0.17, 0.19, -0.03], [0.88, 0.88, 0.82])}
        {curl('db-r', [0.17, 0.19, -0.03], [0.88, 0.88, 0.82])}
        {curl('db-f', [0, 0.15, 0.145], [1.28, 0.42, 0.4])}
      </>}
    </group>
  );
}

function Headwear({ style, material, accent }: { style: WorkerHeadwear; material: THREE.Material; accent: THREE.Material }) {
  if (style === 'beret') return <group position={[0.02, 0.225, 0]} rotation={[0.04, 0, -0.16]}>
    <mesh scale={[1.45, 0.45, 1.16]} material={material} castShadow><sphereGeometry args={[0.14, 18, 12]} /></mesh>
    <mesh position={[0, 0.068, 0]} material={accent}><sphereGeometry args={[0.025, 8, 6]} /></mesh>
  </group>;
  if (style === 'headband') return <mesh position={[0, 0.165, 0]} rotation={[Math.PI / 2, 0, 0]} material={material}>
    <torusGeometry args={[0.204, 0.023, 8, 24, Math.PI]} />
  </mesh>;
  if (style === 'back-cap' || style === 'shop-cap') return <group position={[0, 0.19, 0.005]}>
    <mesh scale={[1.08, 0.54, 1]} material={material} castShadow><sphereGeometry args={[0.19, 18, 12]} /></mesh>
    <mesh
      position={[0, -0.012, style === 'back-cap' ? -0.2 : 0.2]}
      rotation={[Math.PI / 2 + 0.12, 0, 0]}
      scale={[1.5, 1, 0.55]}
      material={material}
      castShadow
    >
      <capsuleGeometry args={[0.05, 0.12, 4, 10]} />
    </mesh>
  </group>;
  if (style === 'beanie') return <group position={[0, 0.205, 0]}>
    <mesh scale={[1.05, 0.72, 1.02]} material={material} castShadow><sphereGeometry args={[0.195, 18, 14]} /></mesh>
    <mesh position={[0, 0.145, 0]} material={accent}><sphereGeometry args={[0.045, 10, 8]} /></mesh>
  </group>;
  if (style === 'visor') return <group position={[0, 0.19, 0.01]}>
    <mesh rotation={[Math.PI / 2, 0, 0]} material={material}><torusGeometry args={[0.195, 0.022, 8, 22, Math.PI]} /></mesh>
    <mesh position={[0, -0.02, 0.185]} rotation={[0.06, 0, Math.PI / 2]} material={material} castShadow><capsuleGeometry args={[0.04, 0.2, 4, 10]} /></mesh>
  </group>;
  if (style === 'kerchief') return <group position={[0, 0.19, -0.01]}>
    <mesh scale={[1.08, 0.48, 1.02]} material={material} castShadow><sphereGeometry args={[0.19, 18, 12]} /></mesh>
    <mesh position={[0.15, -0.06, -0.15]} rotation={[0.2, 0, -0.5]} material={material} castShadow><coneGeometry args={[0.065, 0.16, 8]} /></mesh>
  </group>;
  if (style === 'strawberry-clip') return <group position={[-0.155, 0.185, 0.08]} rotation={[0, 0, 0.35]}>
    <mesh material={material} castShadow><sphereGeometry args={[0.046, 12, 10]} /></mesh>
    <mesh position={[0, 0.042, 0]} rotation={[0, 0, -0.35]} scale={[1, 0.42, 0.6]} material={accent}>
      <sphereGeometry args={[0.032, 8, 6]} />
    </mesh>
  </group>;
  if (style === 'sunglasses') return <group position={[0, 0.205, 0.075]} rotation={[0.38, 0, 0]}>
    {[-1, 1].map((side) => (
      <mesh key={side} position={[side * 0.083, 0, 0]} rotation={[0, 0, side * -0.07]} material={material} castShadow>
        <boxGeometry args={[0.108, 0.058, 0.028]} />
      </mesh>
    ))}
    <mesh material={material}><boxGeometry args={[0.07, 0.02, 0.026]} /></mesh>
  </group>;
  if (style === 'headphones') return <group>
    {/* the band arcs over the top; the cups sit where ears would be */}
    <mesh position={[0, 0.02, 0]} material={material}>
      <torusGeometry args={[0.216, 0.026, 8, 26, Math.PI]} />
    </mesh>
    {[-1, 1].map((side) => (
      <group key={side} position={[side * 0.214, 0.015, 0]} rotation={[0, 0, Math.PI / 2]}>
        <mesh material={material} castShadow><cylinderGeometry args={[0.078, 0.078, 0.055, 16]} /></mesh>
        <mesh position={[0, side * 0.03, 0]} material={accent}><cylinderGeometry args={[0.052, 0.052, 0.014, 14]} /></mesh>
      </group>
    ))}
  </group>;
  if (style === 'aviator') return <group>
    <mesh position={[0, 0.02, -0.01]} scale={[1.05, 1.04, 1.04]} material={material} castShadow>
      <sphereGeometry args={[0.2, 18, 14, 0, Math.PI * 2, 0, Math.PI / 1.9]} />
    </mesh>
    <mesh position={[0, 0.15, 0.02]} rotation={[Math.PI / 2, 0, 0]} material={accent}>
      <torusGeometry args={[0.202, 0.022, 8, 26]} />
    </mesh>
    {[-1, 1].map((side) => (
      <mesh
        key={side}
        position={[side * 0.098, 0.168, 0.188]}
        rotation={[Math.PI / 2 + 0.2, 0, side * 0.16]}
        material={accent}
        castShadow
      >
        <cylinderGeometry args={[0.066, 0.066, 0.055, 16]} />
      </mesh>
    ))}
  </group>;
  if (style === 'flower-cap') return <group position={[0, 0.19, 0.005]}>
    <mesh scale={[1.08, 0.54, 1]} material={material} castShadow><sphereGeometry args={[0.19, 18, 12]} /></mesh>
    <mesh
      position={[0, -0.012, 0.2]}
      rotation={[Math.PI / 2 + 0.12, 0, 0]}
      scale={[1.5, 1, 0.55]}
      material={material}
      castShadow
    >
      <capsuleGeometry args={[0.05, 0.12, 4, 10]} />
    </mesh>
    <group position={[0.1, 0.055, 0.135]} scale={0.5}>
      <Motif motif="flower" material={accent} />
    </group>
  </group>;
  return <group position={[0.16, 0.17, 0.03]} rotation={[0, 0, 0.25]}>
    <mesh position={[-0.04, 0, 0]} rotation={[0, 0, -0.7]} material={material}><sphereGeometry args={[0.065, 10, 8]} /></mesh>
    <mesh position={[0.04, 0, 0]} rotation={[0, 0, 0.7]} material={material}><sphereGeometry args={[0.065, 10, 8]} /></mesh>
    <mesh material={accent}><sphereGeometry args={[0.027, 8, 6]} /></mesh>
  </group>;
}

/**
 * The parts that make somebody an animal rather than a person: ears, a muzzle or
 * a beak, and the cat's whiskers. They hang off the same head sphere everyone
 * has, so the eyes, the blush and every hat still land where they always did.
 */
function SpeciesHead({
  species,
  fur,
  muzzle,
  accent,
}: {
  species: WorkerSpecies;
  fur: THREE.Material;
  muzzle: THREE.Material;
  accent: THREE.Material;
}) {
  if (species === 'cat') return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.13, 0.295, -0.012]} rotation={[0, 0, side * 0.24]}>
          <mesh material={fur} castShadow><coneGeometry args={[0.082, 0.17, 4]} /></mesh>
          <mesh position={[0, -0.006, 0.03]} scale={[0.58, 0.6, 0.58]}>
            <coneGeometry args={[0.082, 0.17, 4]} />
            <meshStandardMaterial color="#f0a898" roughness={0.75} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -0.05, 0.2]} scale={[1.3, 0.92, 0.72]} material={muzzle}>
        <sphereGeometry args={[0.072, 14, 12]} />
      </mesh>
      <mesh position={[0, -0.026, 0.246]}>
        <sphereGeometry args={[0.018, 10, 8]} />
        <meshStandardMaterial color="#e08fa2" roughness={0.5} />
      </mesh>
      {[-1, 1].map((side) =>
        [-1, 0, 1].map((row) => (
          <mesh
            key={`${side}-${row}`}
            position={[side * 0.145, -0.045 + row * 0.024, 0.178]}
            rotation={[0, side * 0.55, row * 0.28]}
          >
            <boxGeometry args={[0.09, 0.006, 0.004]} />
            <meshStandardMaterial color="#7a6d60" roughness={0.6} />
          </mesh>
        )),
      )}
    </group>
  );

  if (species === 'bunny') return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.085, 0.31, -0.02]} rotation={[-0.06, 0, side * 0.13]}>
          <mesh material={fur} castShadow><capsuleGeometry args={[0.05, 0.17, 4, 10]} /></mesh>
          <mesh position={[0, 0.008, 0.026]} scale={[0.6, 0.86, 0.5]}>
            <capsuleGeometry args={[0.05, 0.17, 4, 10]} />
            <meshStandardMaterial color="#f3b7c4" roughness={0.78} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -0.05, 0.2]} scale={[1.22, 0.86, 0.66]} material={muzzle}>
        <sphereGeometry args={[0.07, 14, 12]} />
      </mesh>
      <mesh position={[0, -0.024, 0.242]}>
        <sphereGeometry args={[0.016, 10, 8]} />
        <meshStandardMaterial color="#e08fa2" roughness={0.5} />
      </mesh>
    </group>
  );

  if (species === 'bear') return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.178, 0.205, -0.02]}>
          <mesh material={fur} castShadow><sphereGeometry args={[0.078, 14, 12]} /></mesh>
          <mesh position={[0, 0.004, 0.044]} scale={[0.62, 0.62, 0.5]} material={accent}>
            <sphereGeometry args={[0.078, 12, 10]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -0.055, 0.19]} scale={[1.4, 1, 0.78]} material={muzzle}>
        <sphereGeometry args={[0.078, 14, 12]} />
      </mesh>
      <mesh position={[0, -0.028, 0.248]}>
        <sphereGeometry args={[0.023, 10, 8]} />
        <meshStandardMaterial color="#4a3b33" roughness={0.5} />
      </mesh>
    </group>
  );

  if (species === 'penguin') return (
    <group>
      <mesh position={[0, -0.02, 0.072]} scale={[0.88, 0.96, 0.8]} material={muzzle}>
        <sphereGeometry args={[0.2, 18, 14]} />
      </mesh>
      <mesh position={[0, -0.05, 0.226]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.038, 0.08, 10]} />
        <meshStandardMaterial color="#f0a13a" roughness={0.45} />
      </mesh>
    </group>
  );

  return null;
}

function Motif({ motif, material }: { motif: WorkerMotif; material: THREE.Material }) {
  if (motif === 'star') return <mesh rotation={[0, 0, Math.PI / 4]} material={material}><octahedronGeometry args={[0.045, 0]} /></mesh>;
  if (motif === 'leaf') return <mesh rotation={[0.3, 0, -0.55]} scale={[0.65, 1, 0.35]} material={material}><sphereGeometry args={[0.05, 10, 8]} /></mesh>;
  if (motif === 'parcel' || motif === 'check') return <mesh rotation={[0, 0, motif === 'check' ? Math.PI / 4 : 0]} material={material}><boxGeometry args={[0.066, 0.066, 0.02]} /></mesh>;
  if (motif === 'moon') return <group><mesh material={material}><sphereGeometry args={[0.052, 10, 8]} /></mesh><mesh position={[0.022, 0.018, 0.012]}><sphereGeometry args={[0.044, 10, 8]} /><meshBasicMaterial color="#fff8ee" /></mesh></group>;
  if (motif === 'flower') return <group>{[0,1,2,3,4].map((i)=><mesh key={i} position={[Math.cos(i*Math.PI*2/5)*0.038,Math.sin(i*Math.PI*2/5)*0.038,0]} material={material}><sphereGeometry args={[0.027,8,6]} /></mesh>)}</group>;
  if (motif === 'berry') return <group><mesh material={material}><sphereGeometry args={[0.052,10,8]} /></mesh><mesh position={[0,0.052,0]} rotation={[0,0,-0.25]} scale={[0.5,1,0.4]} material={material}><sphereGeometry args={[0.025,8,6]} /></mesh></group>;
  return <mesh scale={motif === 'drop' ? [0.75, 1.15, 0.55] : [1,1,1]} material={material}><sphereGeometry args={[0.046,10,8]} /></mesh>;
}

/**
 * Procedural stand-in character. Everything here is primitives — replacing this
 * component with a GLTF character is a drop-in swap as long as the replacement
 * accepts the same `pose` object.
 */
export function WorkerModel({ pose, appearance }: { pose: WorkerPose; appearance: WorkerAppearance }) {
  const rootRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const crateRef = useRef<THREE.Group>(null);
  const cupRef = useRef<THREE.Group>(null);
  const faceRef = useRef<THREE.MeshStandardMaterial>(null);
  const browsRef = useRef<THREE.Group>(null);

  const look = useMemo(() => lookOf(appearance), [appearance]);

  /* Appearance-keyed materials. Shared by colour rather than by instance: two
     workers in the same coat get the same material, and none of these is ever
     mutated — the head's is the one exception, because a prodded face flushes. */
  const skinMat = useMemo(() => sharedStandard(look.skin, 0.6), [look.skin]);
  const hairMat = useMemo(() => sharedStandard(look.hair, 0.8), [look.hair]);
  const capMat = useMemo(() => sharedStandard(look.cap, 0.55), [look.cap]);
  const accentMat = useMemo(() => sharedStandard(look.accent, 0.5), [look.accent]);
  const coatMat = useMemo(() => sharedStandard(look.uniform, 0.72), [look.uniform]);
  const trouserMat = useMemo(() => sharedStandard(look.trousers, 0.75), [look.trousers]);
  const shoeMat = useMemo(() => sharedStandard(look.shoes, 0.6), [look.shoes]);
  const furMat = useMemo(() => sharedStandard(look.fur, 0.75), [look.fur]);
  const muzzleMat = useMemo(() => sharedStandard(look.muzzle, 0.7), [look.muzzle]);
  const slingMat = useMemo(() => sharedStandard(look.sling || '#4a4038', 0.62), [look.sling]);

  /* Their own skin, and the same skin flushed. Kept as objects so the per-frame
     blend is a lerp between two colours rather than parsing a hex every frame. */
  const skinTones = useMemo(() => {
    const calm = new THREE.Color(look.skin);
    return { calm, cross: calm.clone().lerp(new THREE.Color('#d4514c'), 0.5) };
  }, [look.skin]);

  /* Each character's own, since each one's mouth bends on its own. */
  const mouthShape = useMemo(createMouth, []);
  const mouthDrawnAt = useRef(0);
  useEffect(() => () => mouthShape.dispose(), [mouthShape]);

  useFrame(() => {
    const swing = Math.sin(pose.phase) * pose.locomotion;
    const counterSwing = Math.sin(pose.phase + Math.PI) * pose.locomotion;

    /*
      Sitting folds the legs forward off the front of the stool. The seat is 0.37
      above the floor and these characters' hips are 0.355 above their feet, so
      perching costs almost no height — the read is entirely in the legs.
    */
    const seated = -1.0 * pose.sit;
    if (leftLegRef.current) leftLegRef.current.rotation.x = swing * 0.9 * (1 - pose.sit) + seated;
    if (rightLegRef.current) rightLegRef.current.rotation.x = counterSwing * 0.9 * (1 - pose.sit) + seated;

    if (leftArmRef.current) {
      if (pose.carrying) {
        leftArmRef.current.rotation.x = -1.25;
        leftArmRef.current.rotation.z = 0.28;
      } else if (pose.inspect > 0.01) {
        leftArmRef.current.rotation.x = -1.05 * pose.inspect;
        leftArmRef.current.rotation.z = 0.42 * pose.inspect;
      } else if (pose.work > 0.01) {
        leftArmRef.current.rotation.x = -0.5 - Math.sin(pose.phase * 2) * 0.45 * pose.work;
        leftArmRef.current.rotation.z = 0.1;
      } else {
        leftArmRef.current.rotation.x = counterSwing * 0.7;
        leftArmRef.current.rotation.z = 0.1;
      }
    }

    if (rightArmRef.current) {
      if (pose.sip > 0.01) {
        // cup up to the mouth
        rightArmRef.current.rotation.x = -1.85 * pose.sip;
        rightArmRef.current.rotation.z = -0.5 * pose.sip;
      } else if (pose.wave > 0.01) {
        /*
          Positive z swings the arm out and up. It used to be -2.1, which rotated
          it the other way — across the chest and inside the coat, so a wave read
          as the arm vanishing. The rest poses tuck in with a small z, which is
          the sign convention this follows.
        */
        rightArmRef.current.rotation.z = 2.05 * pose.wave;
        rightArmRef.current.rotation.x = Math.sin(pose.phase * 3) * 0.3 * pose.wave;
      } else if (pose.carrying) {
        rightArmRef.current.rotation.x = -1.25;
        rightArmRef.current.rotation.z = -0.28;
      } else if (pose.inspect > 0.01) {
        rightArmRef.current.rotation.x = (-1.05 - Math.sin(pose.phase * 1.6) * 0.12) * pose.inspect;
        rightArmRef.current.rotation.z = -0.42 * pose.inspect;
      } else if (pose.work > 0.01) {
        rightArmRef.current.rotation.x = -0.5 - Math.sin(pose.phase * 2 + Math.PI) * 0.45 * pose.work;
        rightArmRef.current.rotation.z = -0.1;
      } else {
        rightArmRef.current.rotation.x = swing * 0.7;
        rightArmRef.current.rotation.z = -0.1;
      }
    }

    /*
      Being prodded past their patience: the face flushes, the smile turns over
      into a frown and a pair of brows come down. Driven from the same value as
      the complaint bubble, so the two always agree.
    */
    if (faceRef.current) faceRef.current.color.lerpColors(skinTones.calm, skinTones.cross, pose.grumpy);
    // redrawn only while the mood is moving, and settled to exactly 0 so a face
    // that has calmed down is the same smile it started with
    const cross = pose.grumpy < 0.004 ? 0 : pose.grumpy;
    if (cross !== mouthDrawnAt.current && (cross === 0 || Math.abs(cross - mouthDrawnAt.current) > 0.004)) {
      drawMouth(mouthShape, cross);
      mouthDrawnAt.current = cross;
    }
    if (browsRef.current) {
      browsRef.current.scale.setScalar(Math.max(0.001, pose.grumpy));
      browsRef.current.visible = pose.grumpy > 0.02;
    }

    if (headRef.current) {
      // a small cross shake on top of the walk sway
      headRef.current.rotation.z = swing * 0.06 + Math.sin(pose.phase * 6) * 0.05 * pose.grumpy;
      // looking down at work, further down when inspecting, level when the
      // visitor has their attention
      headRef.current.rotation.x = pose.work * 0.2 + pose.inspect * 0.36 - pose.attention * 0.14;
    }

    if (rootRef.current) {
      const stride = Math.abs(Math.sin(pose.phase)) * 0.035 * pose.locomotion;
      /*
        Up, not down. Their hips sit 0.355 above the floor and the stool seat is
        0.37, so dropping them 3cm buried the coat inside the seat. Lifting 5cm
        puts the seam of the coat just clear of it.
      */
      rootRef.current.position.y = stride + pose.bob + pose.attention * 0.015 + pose.sit * 0.05;
      // settles back a little on the seat, rather than perching bolt upright
      rootRef.current.rotation.x = pose.inspect * 0.17 - pose.sit * 0.1;
    }

    if (crateRef.current) crateRef.current.visible = pose.carrying;
  });

  return (
    <group ref={rootRef}>
      {/* legs */}
      <group ref={leftLegRef} position={[-0.09, 0.32, 0]}>
        <mesh position={[0, -0.16, 0]} castShadow geometry={LEG_GEO} material={trouserMat} />
        <mesh position={[0, -0.32, 0.03]} castShadow geometry={SHOE_GEO} material={shoeMat} />
      </group>
      <group ref={rightLegRef} position={[0.09, 0.32, 0]}>
        <mesh position={[0, -0.16, 0]} castShadow geometry={LEG_GEO} material={trouserMat} />
        <mesh position={[0, -0.32, 0.03]} castShadow geometry={SHOE_GEO} material={shoeMat} />
      </group>

      {/* the coat, and the badge on its chest */}
      <RoundedBox
        args={[0.34, 0.44, 0.24]}
        radius={0.1}
        smoothness={4}
        position={[0, 0.53, 0]}
        material={coatMat}
        castShadow
        receiveShadow
      />
      <group position={[0.088, 0.6, 0.126]}>
        <Motif motif={look.motif} material={accentMat} />
      </group>

      {/* a cross-body strap and the little bag on the end of it */}
      {look.sling && (
        <group>
          <mesh position={[0, 0.55, 0.126]} rotation={[0, 0, 0.62]} material={slingMat} castShadow>
            <boxGeometry args={[0.055, 0.46, 0.028]} />
          </mesh>
          <RoundedBox
            args={[0.14, 0.12, 0.08]}
            radius={0.03}
            smoothness={3}
            position={[-0.175, 0.4, 0.105]}
            material={slingMat}
            castShadow
          />
        </group>
      )}

      {/* a tail, for whoever came with one */}
      {look.tail && (
        <group position={[0, 0.44, -0.13]} rotation={[0.55, 0, 0]}>
          <mesh material={furMat} castShadow><capsuleGeometry args={[0.036, 0.15, 4, 8]} /></mesh>
          <mesh position={[0, 0.15, -0.035]} rotation={[-0.7, 0, 0]} material={furMat} castShadow>
            <capsuleGeometry args={[0.028, 0.12, 4, 8]} />
          </mesh>
        </group>
      )}
      {/* collar */}
      <mesh position={[0, 0.7, 0.1]} rotation={[0.3, 0, 0]} geometry={COLLAR_GEO} material={COLLAR_MAT} />
      {/* buttons */}
      {[0.58, 0.47].map((y) => (
        <mesh key={y} position={[0, y, 0.125]} geometry={BUTTON_GEO} material={BUTTON_MAT} />
      ))}

      {/* arms */}
      <group ref={leftArmRef} position={[-0.19, 0.68, 0]}>
        <mesh position={[0, -0.15, 0]} castShadow geometry={ARM_GEO} material={coatMat} />
        <mesh position={[0, -0.29, 0]} castShadow geometry={HAND_GEO} material={skinMat} />
      </group>
      <group ref={rightArmRef} position={[0.19, 0.68, 0]}>
        <mesh position={[0, -0.15, 0]} castShadow geometry={ARM_GEO} material={coatMat} />
        <mesh position={[0, -0.29, 0]} castShadow geometry={HAND_GEO} material={skinMat} />
      </group>

      {/* carried crate */}
      <group ref={crateRef} position={[0, 0.5, 0.26]} visible={false}>
        <RoundedBox args={[0.26, 0.2, 0.2]} radius={0.04} smoothness={3} castShadow>
          <meshStandardMaterial color={PALETTE.wood} roughness={0.8} />
        </RoundedBox>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.08, 12]} />
          <meshPhysicalMaterial color={PALETTE.berry} roughness={0.2} clearcoat={0.8} />
        </mesh>
      </group>

      {/* coffee cup, only out during a break */}
      <group ref={cupRef} position={[0.14, 0.78, 0.16]} visible={false}>
        <mesh castShadow>
          <cylinderGeometry args={[0.045, 0.037, 0.1, 14]} />
          <meshStandardMaterial color="#fdfaf4" roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.036, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.016, 14]} />
          <meshStandardMaterial color="#6f4327" roughness={0.3} />
        </mesh>
      </group>

      {/* head */}
      <group ref={headRef} position={[0, 0.9, 0]}>
        <mesh castShadow geometry={HEAD_GEO}>
          {/* the one material that is not shared: this one gets animated */}
          <meshStandardMaterial ref={faceRef} color={look.skin} roughness={0.62} />
        </mesh>

        {look.species === 'human' ? (
          <Hair style={look.hairStyle} material={hairMat} />
        ) : (
          <SpeciesHead species={look.species} fur={furMat} muzzle={muzzleMat} accent={accentMat} />
        )}
        <Headwear style={look.headwear} material={capMat} accent={accentMat} />

        {/*
          Eyes, blush and brows all sit on a head of 0.225. They were placed on
          the 0.2 one this file used to build, which left every one of them
          buried a centimetre or two inside the skull.
        */}
        {[-0.075, 0.075].map((x) => (
          <group key={x} position={[x, 0.015, 0.2]}>
            <mesh geometry={EYE_GEO} material={EYE_MAT} scale={EYE_SCALE[look.eyes]} />
            {look.eyes === 'sparkle' && (
              <mesh position={[0.012, 0.013, 0.019]}>
                <sphereGeometry args={[0.009, 8, 6]} />
                <meshBasicMaterial color="#fff8ee" />
              </mesh>
            )}
          </group>
        ))}
        {[-0.13, 0.13].map((x) => (
          <mesh key={x} position={[x, -0.05, 0.168]}>
            <sphereGeometry args={[0.038, 12, 10]} />
            <meshBasicMaterial color="#f0a898" transparent opacity={0.45} />
          </mesh>
        ))}
        {/* Mouth: one stroke laid on the head, bending from a smile to a frown.
            The animals wear theirs on a muzzle or a beak instead. */}
        {look.species === 'human' && (
          <mesh geometry={mouthShape}>
            <meshStandardMaterial color={PALETTE.ink} roughness={0.5} side={THREE.DoubleSide} />
          </mesh>
        )}
        {/* cross brows, folded away until they are needed */}
        <group ref={browsRef} visible={false} scale={0.001}>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[side * 0.078, 0.082, 0.196]}
              rotation={[0, 0, side * -0.42]}
              geometry={BROW_GEO}
              material={BROW_MAT}
            />
          ))}
        </group>
      </group>
    </group>
  );
}
