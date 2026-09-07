'use client';

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useCartLines } from '@/lib/cart';
import { getProduct } from '@/lib/products';
import { PALETTE } from '@/lib/palette';
import { registerAnchor, unregisterAnchor } from '@/lib/anchors';
import { hoverEntity, selectEntity, useIsHovered, useIsSelected } from '@/lib/interaction';

const NO_HIT = () => null;
const MAX_CRATES = 6;

/**
 * Orders stack up at the end of the line. Adding to the cart drops a small
 * labelled crate here, which is what ties the shop back to the factory — Bimo's
 * route already ends at this corner.
 *
 * Decorative: the real cart UI stays in the header.
 */
export function DispatchDock({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const lines = useCartLines();
  const groupRef = useRef<THREE.Group>(null);
  const anchorRef = useRef<THREE.Group>(null);
  const hovered = useIsHovered('station', 'dispatch');
  const selected = useIsSelected('station', 'dispatch');
  const active = hovered || selected;

  useEffect(() => {
    const group = anchorRef.current;
    if (!group) return;
    registerAnchor('station', 'dispatch', group);
    return () => {
      unregisterAnchor('station', 'dispatch');
      document.body.style.cursor = 'auto';
    };
  }, []);

  // One crate per unit, not per line, so a repeat purchase visibly stacks up.
  // Capped so a large basket cannot flood the corner.
  const crates = lines
    .flatMap((line) => Array.from({ length: line.quantity }, () => line.productId))
    .slice(-MAX_CRATES);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.children.forEach((crate, index) => {
      // settle in with a small bob when it first appears
      const target = 0.34 + index * 0.26;
      crate.position.y = THREE.MathUtils.damp(crate.position.y, target, 6, 0.016);
      crate.rotation.y = Math.sin(t * 0.5 + index) * 0.05;
    });
  });

  return (
    <group
      ref={anchorRef}
      position={position}
      rotation={[0, rotation, 0]}
      onPointerOver={(event) => {
        event.stopPropagation();
        hoverEntity({ kind: 'station', id: 'dispatch' });
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        hoverEntity(null);
        document.body.style.cursor = 'auto';
      }}
      onClick={(event) => {
        event.stopPropagation();
        selectEntity({ kind: 'station', id: 'dispatch' });
      }}
    >
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={active} raycast={NO_HIT}>
        <ringGeometry args={[0.95, 1.08, 40]} />
        <meshBasicMaterial color="#c98f3a" transparent opacity={selected ? 0.85 : 0.4} />
      </mesh>

      {/* painted floor bay, so the corner reads as "dispatch" at a glance */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={NO_HIT}>
        <ringGeometry args={[0.78, 0.9, 40]} />
        <meshBasicMaterial color={PALETTE.berry} transparent opacity={0.28} />
      </mesh>

      {/* pallet: slats over bearers, tall enough to catch the light */}
      <RoundedBox args={[1.15, 0.12, 0.92]} radius={0.04} smoothness={3} position={[0, 0.16, 0]} receiveShadow castShadow raycast={NO_HIT}>
        <meshStandardMaterial color={PALETTE.wood} roughness={0.82} />
      </RoundedBox>
      {[-0.42, 0, 0.42].map((z) => (
        <mesh key={z} position={[0, 0.06, z]} castShadow receiveShadow raycast={NO_HIT}>
          <boxGeometry args={[1.15, 0.12, 0.14]} />
          <meshStandardMaterial color={PALETTE.woodDark} roughness={0.85} />
        </mesh>
      ))}

      <group ref={groupRef}>
        {crates.map((productId, index) => {
          const product = getProduct(productId);
          return (
            <group key={`${productId}-${index}`} position={[0, 1.4, 0]}>
              <RoundedBox args={[0.62, 0.24, 0.52]} radius={0.05} smoothness={3} castShadow raycast={NO_HIT}>
                <meshStandardMaterial color={PALETTE.wood} roughness={0.8} />
              </RoundedBox>
              {/* a dab of the product colour, so the stack reads as your order */}
              <mesh position={[0, 0.13, 0]} castShadow raycast={NO_HIT}>
                <cylinderGeometry args={[0.09, 0.09, 0.06, 14]} />
                <meshStandardMaterial color={product?.color ?? PALETTE.berry} roughness={0.35} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}
