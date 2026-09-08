'use client';

import { RoundedBox } from '@react-three/drei';
import { MINI_PRODUCTS, SIGNATURE_PRODUCTS } from '@/lib/products';
import { PALETTE } from '@/lib/palette';
import { SlimeTub } from './SlimeTub';
import { NO_HIT } from './StationGroup';

const SIGNATURE_SPACING = 0.78;
const MINI_SPACING = 0.62;
const MINI_PER_ROW = 5;
/* The whole cabinet is Mainline cups now. A cup is 0.89 wide at scale 1, so
   these two sizes keep the same footprints the old jars had. */
const SIGNATURE_SCALE = 0.78;
const MINI_SCALE = 0.6;

/** Shelf heights, bottom to top. The signatures sit at eye level. */
const ROW_Y = { minisLower: 0.62, signatures: 1.52, minisUpper: 2.42 } as const;

/**
 * The shop wall: one freestanding cabinet carrying every buyable jar.
 *
 * This replaces the two cabinets that used to do the job — the display shelf
 * that stood under the wall roundel, and the wall-mounted tester shelf on the
 * left. Both of those spots were cleared, and consolidating them here keeps
 * every product pickable through the same `Product` component, so picking,
 * focus and the cart behave identically to before.
 */
export function ShopShelf({
  position,
  rotation = 0,
}: {
  position: readonly [number, number, number];
  rotation?: number;
}) {
  return (
    <group position={[position[0], position[1], position[2]]} rotation={[0, rotation, 0]}>
      {/* backing */}
      <RoundedBox
        args={[3.4, 3.1, 0.16]}
        radius={0.07}
        smoothness={3}
        position={[0, 1.72, -0.42]}
        castShadow
        receiveShadow
        raycast={NO_HIT}
      >
        <meshStandardMaterial color={PALETTE.wallMint} roughness={0.85} />
      </RoundedBox>

      {/* uprights */}
      {[-1.67, 1.67].map((x) => (
        <RoundedBox
          key={x}
          args={[0.16, 3.1, 0.95]}
          radius={0.06}
          smoothness={3}
          position={[x, 1.72, 0]}
          castShadow
          receiveShadow
          raycast={NO_HIT}
        >
          <meshStandardMaterial color={PALETTE.shell} roughness={0.7} />
        </RoundedBox>
      ))}

      {/* cornice */}
      <RoundedBox
        args={[3.6, 0.16, 1.05]}
        radius={0.06}
        smoothness={3}
        position={[0, 3.35, 0]}
        castShadow
        receiveShadow
        raycast={NO_HIT}
      >
        <meshStandardMaterial color={PALETTE.shell} roughness={0.65} />
      </RoundedBox>

      {/* shelves */}
      {[ROW_Y.minisLower, ROW_Y.signatures, ROW_Y.minisUpper].map((y) => (
        <RoundedBox
          key={y}
          args={[3.35, 0.14, 0.95]}
          radius={0.05}
          smoothness={3}
          position={[0, y - 0.07, 0]}
          castShadow
          receiveShadow
          raycast={NO_HIT}
        >
          <meshStandardMaterial color={PALETTE.shell} roughness={0.6} />
        </RoundedBox>
      ))}

      {/* feet */}
      {[-1.45, 1.45].map((x) => (
        <mesh key={x} position={[x, 0.09, 0]} castShadow raycast={NO_HIT}>
          <boxGeometry args={[0.42, 0.18, 0.8]} />
          <meshStandardMaterial color={PALETTE.woodDark} roughness={0.8} />
        </mesh>
      ))}

      {/* the four signature cups, full size, at the front of the middle shelf */}
      {SIGNATURE_PRODUCTS.map((product) => (
        <SlimeTub
          key={product.id}
          product={product}
          position={[(product.slot - 1.5) * SIGNATURE_SPACING, ROW_Y.signatures, 0.04]}
          scale={SIGNATURE_SCALE}
          stickerRotation={(product.slot - 1.5) * 0.16}
        />
      ))}

      {/* tester cups, five to a row */}
      {[0, 1].map((row) => {
        const y = row === 0 ? ROW_Y.minisLower : ROW_Y.minisUpper;
        return MINI_PRODUCTS.slice(row * MINI_PER_ROW, row * MINI_PER_ROW + MINI_PER_ROW).map(
          (product, index) => (
            <SlimeTub
              key={product.id}
              product={product}
              position={[(index - (MINI_PER_ROW - 1) / 2) * MINI_SPACING, y, 0.02]}
              scale={MINI_SCALE}
              stickerRotation={(index - 2) * 0.14}
            />
          ),
        );
      })}
    </group>
  );
}
