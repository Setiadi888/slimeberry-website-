'use client';

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Product as ProductData } from '@/lib/products';
import { PALETTE } from '@/lib/palette';
import { useJiggle } from '@/lib/useJiggle';
import { onProductPulse } from '@/lib/labEvents';
import { registerAnchor, unregisterAnchor } from '@/lib/anchors';
import { hoverEntity, selectEntity, useIsHovered, useIsSelected } from '@/lib/interaction';
import { useLabQuality } from './QualityContext';

interface ProductProps {
  product: ProductData;
  position: [number, number, number];
  /** 1 for the signature jars, smaller for the tester minis. */
  scale?: number;
}

/**
 * A merchandise jar. This is the procedural stand-in for `product.model`;
 * swapping in a GLB means replacing the meshes and keeping the group, the
 * pointer handlers and the anchor registration.
 *
 * Hover/selection is read here rather than passed down, so moving the pointer
 * across the shelf re-renders only the two jars whose state changed.
 */
export function Product({ product, position, scale = 1 }: ProductProps) {
  const groupRef = useRef<THREE.Group>(null);
  const jarRef = useRef<THREE.Group>(null);
  const { impulse, update } = useJiggle(140, 8);
  const { transmission, reducedMotion } = useLabQuality();

  const hovered = useIsHovered('product', product.id);
  const selected = useIsSelected('product', product.id);
  const active = hovered || selected;

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    registerAnchor('product', product.id, group);
    return () => {
      unregisterAnchor('product', product.id);
      document.body.style.cursor = 'auto';
    };
  }, [product.id]);

  useEffect(
    () =>
      onProductPulse((id) => {
        if (id === product.id) impulse(3.4);
      }),
    [impulse, product.id],
  );

  useFrame((state, delta) => {
    const jar = jarRef.current;
    if (!jar) return;

    const wobble = update(delta);
    jar.position.y = THREE.MathUtils.damp(jar.position.y, active ? 0.14 * scale : 0, 8, delta);

    const target = (selected ? 1.14 : hovered ? 1.07 : 1) * scale;
    const eased = THREE.MathUtils.damp(jar.scale.x, target, 9, delta);
    jar.scale.set(eased * (1 - wobble * 0.3), eased * (1 + wobble * 0.5), eased * (1 - wobble * 0.3));

    if (!reducedMotion) {
      jar.rotation.y += delta * (selected ? 0.55 : active ? 0.3 : 0.06);
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <group
        ref={jarRef}
        onPointerOver={(event) => {
          event.stopPropagation();
          hoverEntity({ kind: 'product', id: product.id });
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          hoverEntity(null);
          document.body.style.cursor = 'auto';
        }}
        onClick={(event) => {
          event.stopPropagation();
          impulse(1.6);
          selectEntity({ kind: 'product', id: product.id });
        }}
      >
        <mesh visible={false} position={[0, 0.34, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.9, 8]} />
        </mesh>

        <mesh position={[0, 0.26, 0]} castShadow>
          <capsuleGeometry args={[0.245, 0.16, 6, 20]} />
          <meshPhysicalMaterial
            color={product.color}
            roughness={0.13}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.1}
            sheen={0.7}
            sheenColor="#ffffff"
            transmission={transmission ? 0.24 : 0}
            thickness={transmission ? 0.7 : 0}
            ior={1.38}
            transparent={!transmission}
            opacity={transmission ? 1 : 0.94}
            emissive={product.color}
            emissiveIntensity={selected ? 0.3 : hovered ? 0.18 : 0.05}
          />
        </mesh>

        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.3, 0.285, 0.56, 26, 1, true]} />
          <meshPhysicalMaterial
            color="#f2fbff"
            roughness={0.04}
            metalness={0}
            transparent
            opacity={0.28}
            side={THREE.DoubleSide}
            clearcoat={1}
          />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.285, 0.26, 0.05, 26]} />
          <meshPhysicalMaterial color="#f2fbff" roughness={0.05} transparent opacity={0.35} clearcoat={1} />
        </mesh>

        <mesh position={[0, 0.19, 0]}>
          <cylinderGeometry args={[0.305, 0.295, 0.17, 26]} />
          <meshStandardMaterial color={PALETTE.shell} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.19, 0]}>
          <cylinderGeometry args={[0.308, 0.298, 0.045, 26]} />
          <meshStandardMaterial color={product.accent} roughness={0.5} />
        </mesh>

        <mesh position={[0, 0.61, 0]} castShadow>
          <cylinderGeometry args={[0.325, 0.315, 0.13, 26]} />
          <meshStandardMaterial color={product.accent} roughness={0.32} metalness={0.15} />
        </mesh>
        <mesh position={[0, 0.7, 0]} castShadow>
          <sphereGeometry args={[0.09, 16, 12]} />
          <meshStandardMaterial color={product.accent} roughness={0.28} metalness={0.2} />
        </mesh>
      </group>

      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={active} scale={scale}>
        <ringGeometry args={[0.36, 0.44, 32]} />
        <meshBasicMaterial color={product.accent} transparent opacity={selected ? 0.85 : 0.4} />
      </mesh>
    </group>
  );
}
