'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { NO_HIT } from './StationGroup';
import { useLabQuality } from './QualityContext';
import { TurnedForm, POT_PROFILE } from './DesignedForms';

type PlantKind = 'monstera' | 'fern' | 'herb';

/** Curved, split blades; fern leaflets are merged into one reusable frond. */
function blade(kind: PlantKind): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const points: THREE.Vector2[] = [];
  for (const side of [1, -1]) {
    for (let i = 0; i <= 40; i++) {
      const t = side === 1 ? i / 40 : 1 - i / 40;
      let width = Math.pow(Math.sin(Math.PI * t), 0.7) * (kind === 'monstera' ? 0.34 : 0.19);
      if (kind === 'monstera') {
        for (const split of [0.32, 0.53, 0.73]) {
          width *= 1 - 0.8 * Math.max(0, 1 - Math.abs(t - split - side * 0.018) / 0.045);
        }
      }
      points.push(new THREE.Vector2(side * width, t));
    }
  }
  shape.setFromPoints(points);
  const leaf = new THREE.ShapeGeometry(shape);
  const position = leaf.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    position.setZ(i, Math.sin(position.getY(i) * Math.PI) * 0.11 + Math.abs(position.getX(i)) * 0.18);
  }
  leaf.computeVertexNormals();
  if (kind !== 'fern') return leaf;
  const pieces: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 9; i++) {
    const y = 0.1 + i * 0.095;
    for (const side of [-1, 1]) {
      const part = leaf.clone();
      const size = 0.3 * (1 - y * 0.7);
      part.scale(size * 0.65, size, size);
      part.rotateZ(side * -1.03);
      part.translate(0, y, Math.sin(y * Math.PI) * 0.11);
      pieces.push(part);
    }
  }
  leaf.dispose();
  const result = mergeGeometries(pieces);
  pieces.forEach((part) => part.dispose());
  return result;
}

export function Foliage({ kind, seed = 0, growing = false }: {
  kind: PlantKind; seed?: number; growing?: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const age = useRef(0);
  const { reducedMotion } = useLabQuality();
  const geometry = useMemo(() => blade(kind), [kind]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const count = kind === 'fern' ? 7 : 6;
  useFrame((_, delta) => {
    if (!ref.current) return;
    if (!reducedMotion) age.current += Math.min(delta, 0.05);
    ref.current.children.forEach((leaf, i) => {
      // Grow once from seedlings; never shrink or reset visibly to repeat a loop.
      const progress = reducedMotion || !growing ? 1 : THREE.MathUtils.smoothstep(age.current, i * 3, 65 + seed * 7);
      leaf.scale.setScalar(0.15 + progress * 0.85);
      leaf.rotation.z = reducedMotion ? 0 : Math.sin(age.current * 0.48 + seed + i) * 0.025;
    });
  });
  return (
    <group ref={ref}>
      {Array.from({ length: count }, (_, i) => (
        <group key={i} scale={growing && !reducedMotion ? 0.15 : 1}>
          <group rotation={[0, i * 2.399 + seed, 0]}>
            <group rotation={[0.3 + i % 3 * 0.16, 0, 0]}>
              <mesh position={[0, 0.24, 0]} raycast={NO_HIT}>
                <cylinderGeometry args={[0.008, 0.015, 0.48, 5]} />
                <meshStandardMaterial color="#66844a" roughness={0.9} />
              </mesh>
              <mesh geometry={geometry} position={[0, kind === 'fern' ? 0.04 : 0.4, 0]}
                rotation={[kind === 'fern' ? 0.7 : 0.45, 0, 0]}
                scale={kind === 'herb' ? 0.64 : 0.85} raycast={NO_HIT}>
                <meshStandardMaterial color={i % 2 ? '#4b8551' : '#79a65e'} side={THREE.DoubleSide} roughness={0.8} />
              </mesh>
            </group>
          </group>
        </group>
      ))}
    </group>
  );
}

export function BotanicalPot({ position, kind, scale = 1, color = '#e4c8b5' }: {
  position: [number, number, number]; kind: 'monstera' | 'fern'; scale?: number; color?: string;
}) {
  return (
    <group position={position} scale={scale}>
      <TurnedForm profile={POT_PROFILE} color={color} roughness={.78} />
      <mesh position={[0, 0.44, 0]} raycast={NO_HIT}>
        <cylinderGeometry args={[0.245, 0.245, 0.02, 20]} />
        <meshStandardMaterial color="#655342" roughness={1} />
      </mesh>
      <group position={[0, 0.46, 0]}><Foliage kind={kind} seed={position[0]} /></group>
    </group>
  );
}
