'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { registerAnchor, unregisterAnchor } from '@/lib/anchors';
import { hoverEntity, selectEntity, useIsHovered, useIsSelected } from '@/lib/interaction';

/** Decorative meshes opt out of picking with this. */
export const NO_HIT = () => null;

/**
 * Shared shell for every interactive station: registers the anchor the floating
 * cards point at, wires hover/select, and draws the ground ring. Stations supply
 * only their own geometry, which keeps eleven of them from repeating the same
 * twenty lines of pointer plumbing.
 */
export function StationGroup({
  id,
  position,
  rotation = 0,
  ringRadius = 1.1,
  ringColor = '#e4738f',
  children,
}: {
  id: string;
  position: readonly [number, number, number];
  rotation?: number;
  ringRadius?: number;
  ringColor?: string;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const hovered = useIsHovered('station', id);
  const selected = useIsSelected('station', id);
  const active = hovered || selected;

  useEffect(() => {
    const group = ref.current;
    if (!group) return;
    registerAnchor('station', id, group);
    return () => {
      unregisterAnchor('station', id);
      document.body.style.cursor = 'auto';
    };
  }, [id]);

  return (
    <group
      ref={ref}
      position={[position[0], position[1], position[2]]}
      rotation={[0, rotation, 0]}
      onPointerOver={(event) => {
        event.stopPropagation();
        hoverEntity({ kind: 'station', id });
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        hoverEntity(null);
        document.body.style.cursor = 'auto';
      }}
      onClick={(event) => {
        event.stopPropagation();
        selectEntity({ kind: 'station', id });
      }}
    >
      {children}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={active} raycast={NO_HIT}>
        <ringGeometry args={[ringRadius, ringRadius + 0.13, 44]} />
        <meshBasicMaterial color={ringColor} transparent opacity={selected ? 0.85 : 0.4} />
      </mesh>
    </group>
  );
}
