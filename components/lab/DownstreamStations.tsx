'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { BELT, STATION_POS } from '@/lib/layout';
import { SIGNATURE_PRODUCTS } from '@/lib/products';
import { useLabQuality } from './QualityContext';
import { NO_HIT, StationGroup } from './StationGroup';

/** Local z offset from a south bench to the belt centreline. */
const toBelt = (benchZ: number) => BELT.z - benchZ;

/**
 * Filling: a gantry straddling the belt with a nozzle that dips as jars pass,
 * fed from a small tank on the bench beside it.
 */
export function FillingMachine() {
  const nozzleRef = useRef<THREE.Mesh>(null);
  const { reducedMotion } = useLabQuality();
  const beltZ = toBelt(STATION_POS.filling[2]);

  useFrame(({ clock }) => {
    if (!nozzleRef.current || reducedMotion) return;
    const t = clock.getElapsedTime();
    nozzleRef.current.position.y = 1.16 - Math.max(0, Math.sin(t * 1.5)) * 0.12;
  });

  return (
    <StationGroup id="filling" position={STATION_POS.filling} ringRadius={1.0} ringColor="#e4738f">
      {/* bench + feed tank */}
      <RoundedBox args={[1.2, 0.13, 0.9]} radius={0.05} smoothness={3} position={[0, 0.93, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={PALETTE.shell} roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[1.05, 0.52, 0.78]} radius={0.07} smoothness={3} position={[0, 0.62, 0]} castShadow receiveShadow raycast={NO_HIT}>
        <meshStandardMaterial color="#eef2f7" roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, 1.22, 0]} castShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.26, 0.3, 0.46, 20]} />
        <meshPhysicalMaterial color="#f4879f" roughness={0.2} clearcoat={0.8} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 1.47, 0]} castShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.31, 0.31, 0.08, 20]} />
        <meshStandardMaterial color={PALETTE.metal} roughness={0.4} metalness={0.45} />
      </mesh>

      {/* feed pipe running to the gantry */}
      <mesh position={[0, 1.32, beltZ / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.06, 0.06, beltZ, 10]} />
        <meshStandardMaterial color={PALETTE.metal} roughness={0.4} metalness={0.5} />
      </mesh>

      {/* gantry over the belt */}
      <group position={[0, 0, beltZ]}>
        {[-0.55, 0.55].map((z) => (
          <mesh key={z} position={[0, BELT.y + 0.42, z]} castShadow raycast={NO_HIT}>
            <boxGeometry args={[0.12, 0.85, 0.12]} />
            <meshStandardMaterial color={PALETTE.metal} roughness={0.4} metalness={0.5} />
          </mesh>
        ))}
        <RoundedBox args={[0.42, 0.22, 1.3]} radius={0.06} smoothness={3} position={[0, BELT.y + 0.92, 0]} castShadow raycast={NO_HIT}>
          <meshStandardMaterial color={PALETTE.machine} roughness={0.42} metalness={0.15} />
        </RoundedBox>
        <mesh ref={nozzleRef} position={[0, 1.16, 0]} castShadow raycast={NO_HIT}>
          <cylinderGeometry args={[0.07, 0.05, 0.24, 12]} />
          <meshStandardMaterial color={PALETTE.metalDark} roughness={0.35} metalness={0.55} />
        </mesh>
      </group>
    </StationGroup>
  );
}

/**
 * Labelling: a roll of labels feeding an applicator arm that taps each jar as it
 * passes underneath.
 */
export function LabellingStation() {
  const rollRef = useRef<THREE.Mesh>(null);
  const armRef = useRef<THREE.Group>(null);
  const { reducedMotion } = useLabQuality();
  const beltZ = toBelt(STATION_POS.labelling[2]);

  useFrame(({ clock }, delta) => {
    if (reducedMotion) return;
    if (rollRef.current) rollRef.current.rotation.z -= delta * 0.9;
    if (armRef.current) {
      const t = clock.getElapsedTime();
      armRef.current.rotation.x = -0.35 + Math.max(0, Math.sin(t * 1.5 + 1)) * 0.4;
    }
  });

  return (
    <StationGroup id="labelling" position={STATION_POS.labelling} ringRadius={1.0} ringColor="#f3d78c">
      <RoundedBox args={[1.15, 0.13, 0.9]} radius={0.05} smoothness={3} position={[0, 0.93, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={PALETTE.shell} roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[1.0, 0.52, 0.78]} radius={0.07} smoothness={3} position={[0, 0.62, 0]} castShadow receiveShadow raycast={NO_HIT}>
        <meshStandardMaterial color="#eef2f7" roughness={0.6} />
      </RoundedBox>

      {/* spare label rolls on the bench */}
      {[-0.28, 0.06].map((x, i) => (
        <mesh key={x} position={[x, 1.06, -0.2]} rotation={[Math.PI / 2, 0, 0]} castShadow raycast={NO_HIT}>
          <torusGeometry args={[0.09, 0.035, 8, 16]} />
          <meshStandardMaterial color={i ? PALETTE.mint : PALETTE.berry} roughness={0.55} />
        </mesh>
      ))}

      <group position={[0, 0, beltZ]}>
        <mesh position={[0, BELT.y + 0.45, -0.55]} castShadow raycast={NO_HIT}>
          <boxGeometry args={[0.12, 0.9, 0.12]} />
          <meshStandardMaterial color={PALETTE.metal} roughness={0.4} metalness={0.5} />
        </mesh>
        {/* the feeding roll */}
        <mesh ref={rollRef} position={[0, BELT.y + 0.82, -0.34]} rotation={[0, 0, 0]} castShadow raycast={NO_HIT}>
          <cylinderGeometry args={[0.17, 0.17, 0.1, 20]} />
          <meshStandardMaterial color={PALETTE.berry} roughness={0.5} />
        </mesh>
        {/* applicator arm tapping down toward the belt */}
        <group ref={armRef} position={[0, BELT.y + 0.72, -0.34]}>
          <mesh position={[0, -0.12, 0.2]} rotation={[0.5, 0, 0]} castShadow raycast={NO_HIT}>
            <boxGeometry args={[0.1, 0.42, 0.07]} />
            <meshStandardMaterial color={PALETTE.metalDark} roughness={0.4} metalness={0.45} />
          </mesh>
          <mesh position={[0, -0.28, 0.36]} castShadow raycast={NO_HIT}>
            <boxGeometry args={[0.16, 0.06, 0.14]} />
            <meshStandardMaterial color={PALETTE.shell} roughness={0.5} />
          </mesh>
        </group>
      </group>
    </StationGroup>
  );
}

/** Shelves of completed product, ready to be wheeled to dispatch. */
export function FinishedGoods() {
  return (
    <StationGroup id="finished" position={STATION_POS.finishedGoods} rotation={-Math.PI / 2} ringRadius={1.35} ringColor="#9dc47f">
      <RoundedBox args={[2.6, 2.4, 0.16]} radius={0.07} smoothness={3} position={[0, 1.35, -0.38]} castShadow receiveShadow raycast={NO_HIT}>
        <meshStandardMaterial color={PALETTE.wallMint} roughness={0.85} />
      </RoundedBox>
      {[-1.27, 1.27].map((x) => (
        <RoundedBox key={x} args={[0.14, 2.4, 0.88]} radius={0.05} smoothness={3} position={[x, 1.35, 0]} castShadow receiveShadow raycast={NO_HIT}>
          <meshStandardMaterial color={PALETTE.shell} roughness={0.65} />
        </RoundedBox>
      ))}
      {[0.62, 1.42, 2.22].map((y) => (
        <RoundedBox key={y} args={[2.55, 0.12, 0.86]} radius={0.05} smoothness={3} position={[0, y, 0]} castShadow receiveShadow raycast={NO_HIT}>
          <meshStandardMaterial color={PALETTE.shell} roughness={0.6} />
        </RoundedBox>
      ))}

      {/* finished stock, decorative */}
      {[0.62, 1.42, 2.22].map((y, row) =>
        SIGNATURE_PRODUCTS.map((product, index) => (
          <group key={`${y}-${product.id}`} position={[(index - 1.5) * 0.6, y + 0.2, 0.02]}>
            <mesh castShadow raycast={NO_HIT}>
              <cylinderGeometry args={[0.19, 0.16, 0.28, 18]} />
              <meshPhysicalMaterial
                color={SIGNATURE_PRODUCTS[(index + row) % SIGNATURE_PRODUCTS.length].color}
                roughness={0.3}
                clearcoat={0.6}
              />
            </mesh>
            <mesh position={[0, 0.17, 0]} castShadow raycast={NO_HIT}>
              <cylinderGeometry args={[0.21, 0.21, 0.07, 18]} />
              <meshStandardMaterial color="#fbfbf9" roughness={0.45} />
            </mesh>
          </group>
        )),
      )}
    </StationGroup>
  );
}

/**
 * A little trolley. Used as scenery at dispatch and as the vehicle that carries
 * a purchase away in the add-to-cart sequence.
 */
export function Trolley({
  position,
  rotation = 0,
  cargoColor,
}: {
  position: [number, number, number];
  rotation?: number;
  cargoColor?: string;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RoundedBox args={[0.78, 0.07, 0.56]} radius={0.03} smoothness={3} position={[0, 0.26, 0]} castShadow receiveShadow raycast={NO_HIT}>
        <meshStandardMaterial color={PALETTE.metal} roughness={0.42} metalness={0.4} />
      </RoundedBox>
      <mesh position={[-0.36, 0.52, 0]} castShadow raycast={NO_HIT}>
        <boxGeometry args={[0.06, 0.52, 0.5]} />
        <meshStandardMaterial color={PALETTE.metalDark} roughness={0.4} metalness={0.45} />
      </mesh>
      {[[-0.28, 0.22], [-0.28, -0.22], [0.3, 0.22], [0.3, -0.22]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.11, z]} rotation={[Math.PI / 2, 0, 0]} castShadow raycast={NO_HIT}>
          <cylinderGeometry args={[0.1, 0.1, 0.05, 12]} />
          <meshStandardMaterial color="#5c6470" roughness={0.6} />
        </mesh>
      ))}
      {cargoColor && (
        <group position={[0.02, 0.42, 0]}>
          <RoundedBox args={[0.44, 0.26, 0.4]} radius={0.04} smoothness={3} castShadow raycast={NO_HIT}>
            <meshStandardMaterial color={PALETTE.wood} roughness={0.8} />
          </RoundedBox>
          <mesh position={[0, 0.16, 0]} castShadow raycast={NO_HIT}>
            <cylinderGeometry args={[0.1, 0.1, 0.07, 14]} />
            <meshStandardMaterial color={cargoColor} roughness={0.35} />
          </mesh>
        </group>
      )}
    </group>
  );
}
