'use client';

import { RoundedBox } from '@react-three/drei';
import { SIGNATURE_PRODUCTS } from '@/lib/products';
import { PALETTE } from '@/lib/palette';
import { Product } from './Product';

const SLOT_SPACING = 0.85;

/** Freestanding display cabinet, angled toward the camera so every jar is clickable. */
export function ProductShelf({
  position,
  rotation = 0,
}: {
  position: [number, number, number];
  rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RoundedBox args={[4.1, 2.9, 0.16]} radius={0.07} smoothness={3} position={[0, 1.6, -0.42]} castShadow receiveShadow>
        <meshStandardMaterial color={PALETTE.wallMint} roughness={0.85} />
      </RoundedBox>

      {[-2.02, 2.02].map((x) => (
        <RoundedBox key={x} args={[0.16, 2.9, 0.95]} radius={0.06} smoothness={3} position={[x, 1.6, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={PALETTE.shell} roughness={0.7} />
        </RoundedBox>
      ))}

      <RoundedBox args={[4.3, 0.16, 1.05]} radius={0.06} smoothness={3} position={[0, 3.13, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={PALETTE.shell} roughness={0.65} />
      </RoundedBox>

      <RoundedBox args={[4.05, 0.14, 0.95]} radius={0.05} smoothness={3} position={[0, 1.52, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={PALETTE.shell} roughness={0.6} />
      </RoundedBox>

      <RoundedBox args={[4.05, 0.14, 0.95]} radius={0.05} smoothness={3} position={[0, 0.62, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={PALETTE.shell} roughness={0.6} />
      </RoundedBox>

      {/* backup stock on the lower shelf — scenery, not pickable */}
      {SIGNATURE_PRODUCTS.map((product, index) => (
        <mesh key={product.id} position={[(index - 1.5) * SLOT_SPACING, 0.83, 0.05]} castShadow>
          <cylinderGeometry args={[0.19, 0.19, 0.28, 18]} />
          <meshPhysicalMaterial color={product.color} roughness={0.25} clearcoat={0.7} transparent opacity={0.86} />
        </mesh>
      ))}

      {[-1.8, 1.8].map((x) => (
        <mesh key={x} position={[x, 0.09, 0]} castShadow>
          <boxGeometry args={[0.42, 0.18, 0.8]} />
          <meshStandardMaterial color={PALETTE.woodDark} roughness={0.8} />
        </mesh>
      ))}

      {SIGNATURE_PRODUCTS.map((product) => (
        <Product
          key={product.id}
          product={product}
          position={[(product.slot - 1.5) * SLOT_SPACING, 1.59, 0.04]}
        />
      ))}
    </group>
  );
}
