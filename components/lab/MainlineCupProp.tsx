'use client';

import type { Product } from '@/lib/products';
import { NO_HIT } from './StationGroup';

/**
 * A Mainline SB Cup as scenery.
 *
 * The real `SlimeTub` registers a product anchor and answers the pointer, which
 * is right for a cup you can buy and wrong for one that is stock on a back
 * shelf or cargo on the belt — ten of those would fight the shelved cups over
 * the same ids. This is the same silhouette with none of that: tapered body,
 * chunky white lid, printed disc in the flavour's colour, grey foot ring.
 */
export function MainlineCupProp({
  product,
  position,
  scale = 1,
}: {
  product: Product;
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.02, 0]} castShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.115, 0.12, 0.03, 20]} />
        <meshStandardMaterial color="#d9d9d6" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.14, 0]} castShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.145, 0.118, 0.22, 20]} />
        <meshPhysicalMaterial
          color={product.color}
          roughness={0.22}
          clearcoat={0.8}
          transparent
          opacity={0.93}
        />
      </mesh>
      <mesh position={[0, 0.28, 0]} castShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.163, 0.163, 0.08, 22]} />
        <meshStandardMaterial color="#fbfbf9" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.321, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={NO_HIT}>
        <circleGeometry args={[0.125, 20]} />
        <meshStandardMaterial color={product.accent} roughness={0.6} />
      </mesh>
    </group>
  );
}
