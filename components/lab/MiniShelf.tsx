'use client';

import { RoundedBox } from '@react-three/drei';
import { MINI_PRODUCTS } from '@/lib/products';
import { PALETTE } from '@/lib/palette';
import { Product } from './Product';
import { SlimeTub } from './SlimeTub';

const PER_ROW = 5;
const SPACING = 0.68;
const MINI_SCALE = 0.52;
/**
 * The retail tub is a bigger format than the testers around it, so it reads as
 * the showcase piece rather than another sample jar.
 */
const TUB_SCALE = 0.62;
/** First retail tub on trial — the rest of the cabinet is still tester jars. */
const TUB_PRODUCT_ID = 'mango';

/**
 * Wall cabinet of tester-size jars. These used to be decorative props; they are
 * real products now, using the same `Product` component as the display shelf so
 * picking, focus and the cart all behave identically.
 */
export function MiniShelf({
  position,
  rotation = 0,
}: {
  position: [number, number, number];
  rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[0, 1].map((row) => {
        const y = row * 0.92;
        return (
          <group key={row} position={[0, y, 0]}>
            <RoundedBox args={[3.9, 0.12, 0.6]} radius={0.05} smoothness={3} castShadow receiveShadow>
              <meshStandardMaterial color={PALETTE.shell} roughness={0.62} />
            </RoundedBox>
            <mesh position={[0, -0.2, -0.24]}>
              <boxGeometry args={[3.9, 0.3, 0.09]} />
              <meshStandardMaterial color={PALETTE.wallTrim} roughness={0.82} />
            </mesh>

            {MINI_PRODUCTS.slice(row * PER_ROW, row * PER_ROW + PER_ROW).map((product, index) => {
              const at: [number, number, number] = [
                (index - (PER_ROW - 1) / 2) * SPACING,
                0.06,
                0.02,
              ];
              return product.id === TUB_PRODUCT_ID ? (
                <SlimeTub key={product.id} product={product} position={at} scale={TUB_SCALE} />
              ) : (
                <Product key={product.id} product={product} position={at} scale={MINI_SCALE} />
              );
            })}
          </group>
        );
      })}
    </group>
  );
}
