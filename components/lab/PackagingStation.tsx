'use client';

import { RoundedBox } from '@react-three/drei';
import { PALETTE } from '@/lib/palette';
import { BELT, STATION_POS } from '@/lib/layout';
import { NO_HIT, StationGroup } from './StationGroup';

/**
 * Packaging closes the line: the belt runs into this housing, which is also
 * where jars are retired. Because the loop point sits inside solid geometry, a
 * jar is only ever seen entering — never vanishing in the open.
 */
export function PackagingStation() {
  const localBeltX = BELT.retireX - STATION_POS.packaging[0];
  const localBeltZ = BELT.z - STATION_POS.packaging[2];

  return (
    <StationGroup id="packaging" position={STATION_POS.packaging} ringRadius={1.15} ringColor="#d94f75">
      {/* receiving housing, straddling the belt's end */}
      <group position={[localBeltX, 0, localBeltZ]}>
        <RoundedBox args={[1.05, 1.15, 1.15]} radius={0.1} smoothness={3} position={[0.16, BELT.y + 0.5, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={PALETTE.machine} roughness={0.44} metalness={0.14} />
        </RoundedBox>
        {/* mouth the belt feeds into */}
        <mesh position={[-0.36, BELT.y + 0.24, 0]} raycast={NO_HIT}>
          <boxGeometry args={[0.08, 0.4, 0.72]} />
          <meshStandardMaterial color="#2f3540" roughness={0.9} />
        </mesh>
      </group>

      {/* body + box stack */}
      <RoundedBox args={[1.5, 1.1, 1.3]} radius={0.12} smoothness={4} position={[0, 0.55, -0.9]} castShadow receiveShadow raycast={NO_HIT}>
        <meshStandardMaterial color={PALETTE.machine} roughness={0.42} metalness={0.12} />
      </RoundedBox>
      <mesh position={[0, 1.16, -0.9]} castShadow raycast={NO_HIT}>
        <boxGeometry args={[1.1, 0.12, 0.95]} />
        <meshStandardMaterial color={PALETTE.metal} roughness={0.4} metalness={0.45} />
      </mesh>
      {[0, 1].map((i) => (
        <RoundedBox
          key={i}
          args={[0.52, 0.34, 0.46]}
          radius={0.04}
          smoothness={3}
          position={[-0.1 + i * 0.16, 1.4 + i * 0.36, -0.9]}
          rotation={[0, i * 0.25, 0]}
          castShadow
          raycast={NO_HIT}
        >
          <meshStandardMaterial color={PALETTE.wood} roughness={0.82} />
        </RoundedBox>
      ))}
    </StationGroup>
  );
}
