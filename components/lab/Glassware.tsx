'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { NO_HIT } from './StationGroup';

/**
 * Laboratory glass: a conical flask, a beaker and a couple of reagent bottles.
 *
 * All three are lathed from a profile rather than assembled out of cylinders,
 * because the shape of the glass is the whole read — the shoulder of a flask,
 * the lip of a beaker, the neck of a bottle. What is inside each one is a
 * separate solid a shade smaller, so the liquid has a surface and a meniscus
 * rather than being a tint on the glass itself.
 *
 * Nothing here uses transmission: it is a refraction pass the rest of this world
 * does not pay for. Thin, glossy and mostly transparent reads as glass at the
 * size these are actually looked at.
 */

const GLASS_COLOUR = '#eaf6fb';

function Glass({ geometry }: { geometry: THREE.BufferGeometry }) {
  return (
    <mesh geometry={geometry} castShadow raycast={NO_HIT}>
      <meshPhysicalMaterial
        color={GLASS_COLOUR}
        roughness={0.06}
        metalness={0}
        transparent
        opacity={0.34}
        clearcoat={1}
        clearcoatRoughness={0.05}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function lathe(points: readonly (readonly [number, number])[], segments = 24): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    points.map(([x, y]) => new THREE.Vector2(x, y)),
    segments,
  );
}

/** A conical flask, 0.25 tall, with whatever is in it sloshing at the bottom. */
export function Flask({
  position,
  rotation = 0,
  liquid = '#e4738f',
}: {
  position: [number, number, number];
  rotation?: number;
  liquid?: string;
}) {
  const shape = useMemo(
    () =>
      lathe([
        [0, 0],
        [0.098, 0],
        [0.1, 0.014],
        [0.032, 0.163],
        [0.03, 0.225],
        [0.038, 0.237],
        [0.036, 0.248],
      ]),
    [],
  );

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Glass geometry={shape} />
      {/* the contents: the same cone, a size down, filled to a third */}
      <mesh position={[0, 0.045, 0]} raycast={NO_HIT}>
        <cylinderGeometry args={[0.062, 0.092, 0.082, 20]} />
        <meshPhysicalMaterial color={liquid} roughness={0.18} clearcoat={0.6} transparent opacity={0.88} />
      </mesh>
      {/* a paper band round the neck, as every flask on every bench has */}
      <mesh position={[0, 0.2, 0]} raycast={NO_HIT}>
        <cylinderGeometry args={[0.032, 0.032, 0.03, 16, 1, true]} />
        <meshStandardMaterial color="#fdfaf4" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** A low beaker with a pouring lip and three graduation rings. */
export function Beaker({
  position,
  rotation = 0,
  liquid = '#8ed0e8',
}: {
  position: [number, number, number];
  rotation?: number;
  liquid?: string;
}) {
  const shape = useMemo(
    () =>
      lathe([
        [0, 0],
        [0.072, 0],
        [0.074, 0.01],
        [0.074, 0.132],
        [0.082, 0.146],
      ]),
    [],
  );

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Glass geometry={shape} />
      <mesh position={[0, 0.042, 0]} raycast={NO_HIT}>
        <cylinderGeometry args={[0.067, 0.066, 0.076, 20]} />
        <meshPhysicalMaterial color={liquid} roughness={0.16} clearcoat={0.6} transparent opacity={0.85} />
      </mesh>
      {[0.05, 0.078, 0.106].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={NO_HIT}>
          <torusGeometry args={[0.0745, 0.0018, 6, 20]} />
          <meshStandardMaterial color="#fdfaf4" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/** A reagent bottle: shouldered body, screw cap, one small label. */
export function ReagentBottle({
  position,
  rotation = 0,
  cap = '#e4738f',
  liquid = '#f3d78c',
}: {
  position: [number, number, number];
  rotation?: number;
  cap?: string;
  liquid?: string;
}) {
  const shape = useMemo(
    () =>
      lathe([
        [0, 0],
        [0.052, 0],
        [0.054, 0.012],
        [0.054, 0.108],
        [0.03, 0.142],
        [0.03, 0.178],
      ]),
    [],
  );

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Glass geometry={shape} />
      <mesh position={[0, 0.05, 0]} raycast={NO_HIT}>
        <cylinderGeometry args={[0.048, 0.047, 0.088, 18]} />
        <meshPhysicalMaterial color={liquid} roughness={0.2} clearcoat={0.5} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 0.192, 0]} castShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.034, 0.034, 0.032, 18]} />
        <meshStandardMaterial color={cap} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.06, 0.055]} raycast={NO_HIT}>
        <planeGeometry args={[0.062, 0.05]} />
        <meshStandardMaterial color="#fdfaf4" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.072, 0.0555]} raycast={NO_HIT}>
        <planeGeometry args={[0.04, 0.006]} />
        <meshStandardMaterial color="#9aa0ad" roughness={0.9} />
      </mesh>
    </group>
  );
}

/**
 * The set as it stands on a bench: flask, beaker, and two bottles with
 * different caps, spaced so none of them hides another from the shop camera.
 */
export function Glassware({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Flask position={[-0.3, 0, 0.04]} rotation={0.4} liquid="#e4738f" />
      <Beaker position={[-0.05, 0, -0.14]} rotation={-0.3} liquid="#8ed0e8" />
      <ReagentBottle position={[0.19, 0, 0.06]} cap="#7bbf6a" liquid="#b7e08f" rotation={0.2} />
      <ReagentBottle position={[0.36, 0, -0.08]} cap="#4e9fbe" liquid="#a9d8ea" rotation={-0.5} />
    </group>
  );
}
