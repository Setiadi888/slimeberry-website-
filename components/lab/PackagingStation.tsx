'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { BELT, STATION_POS } from '@/lib/layout';
import { useLabQuality } from './QualityContext';
import { NO_HIT, StationGroup } from './StationGroup';
import { Housing, ServicePanel } from './DesignedForms';

/** Half-extents of the belt corridor cut through the machine. */
const MOUTH_HALF_Z = 0.36;
const MOUTH_TOP = BELT.y + 0.52;
const MOUTH_BOTTOM = BELT.y - 0.08;

/**
 * Packaging, straddling the belt at its midpoint.
 *
 * It used to stand off the east end of the line, which meant the one thing the
 * machine is for happened behind it, out of sight. Here it is a tunnel with a
 * mouth at each end and the whole point is legible from across the room: jars
 * go in the west side, shippers come out the east side, and the belt visibly
 * carries two different things either side of it.
 *
 * Nothing is ever seen inside. The conveyor retires its jars at `BELT.retireX`,
 * which is this machine's centreline, and the palletiser starts its boxes just
 * inside the east mouth — so both transitions happen behind solid geometry, the
 * same trick the discharge hood uses at the other end of the line.
 */
export function PackagingStation() {
  const lampsRef = useRef<THREE.Group>(null);
  const { reducedMotion } = useLabQuality();

  useFrame(({ clock }) => {
    if (!lampsRef.current) return;
    const t = clock.getElapsedTime();
    lampsRef.current.children.forEach((lamp, index) => {
      const material = (lamp as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>).material;
      // a run-light chasing along the top, so the machine reads as working
      material.emissiveIntensity = reducedMotion
        ? 0.5
        : 0.12 + Math.max(0, Math.sin(t * 2.4 - index * 0.9)) ** 3 * 1.5;
    });
  });

  return (
    <StationGroup id="packaging" position={STATION_POS.packaging} ringRadius={1.15} ringColor="#d94f75">
      {/* the shell */}
      <group position={[0,BELT.y+.5,0]}><Housing width={1.4} height={1.52} depth={1.3} color={PALETTE.machine}/></group>
      <group position={[0,BELT.y+.34,.664]}><ServicePanel width={.94} height={.42}/></group>

      {/* the two mouths, recessed dark so cargo is swallowed rather than cut off */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.706, (MOUTH_TOP + MOUTH_BOTTOM) / 2, 0]} raycast={NO_HIT}>
            <boxGeometry args={[0.02, MOUTH_TOP - MOUTH_BOTTOM, MOUTH_HALF_Z * 2]} />
            <meshStandardMaterial color="#171b21" roughness={1} metalness={0} />
          </mesh>
          {/* a lintel over each opening */}
          <mesh position={[side * 0.72, MOUTH_TOP + 0.06, 0]} castShadow raycast={NO_HIT}>
            <boxGeometry args={[0.09, 0.09, MOUTH_HALF_Z * 2 + 0.16]} />
            <meshStandardMaterial color={PALETTE.metal} roughness={0.4} metalness={0.45} />
          </mesh>
        </group>
      ))}

      {/* hazard band around the waist, which is what says machine rather than box */}
      <RoundedBox args={[1.43,.11,1.33]} radius={.045} smoothness={2} position={[0, BELT.y + 1.02, 0]} raycast={NO_HIT}>
        <meshStandardMaterial color={PALETTE.berry} roughness={0.55} />
      </RoundedBox>

      {/* run-lights along the top edge */}
      <group ref={lampsRef} position={[0, BELT.y + 1.28, 0.63]}>
        {[-0.4, -0.13, 0.14, 0.41].map((x) => (
          <mesh key={x} position={[x, 0, 0]} raycast={NO_HIT}>
            <sphereGeometry args={[0.045, 12, 10]} />
            <meshStandardMaterial
              color="#f0c86a"
              emissive="#f0a93a"
              emissiveIntensity={0.5}
              roughness={0.3}
            />
          </mesh>
        ))}
      </group>

      {/* the roof plant: a hopper of flat-packs and the duct feeding it */}
      <mesh position={[-0.3, BELT.y + 1.42, -0.1]} castShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.24, 0.17, 0.36, 18]} />
        <meshStandardMaterial color={PALETTE.metal} roughness={0.42} metalness={0.42} />
      </mesh>
      <mesh position={[0.34, BELT.y + 1.36, -0.06]} rotation={[0, 0.3, 0]} castShadow raycast={NO_HIT}>
        <boxGeometry args={[0.42, 0.24, 0.34]} />
        <meshStandardMaterial color={PALETTE.wood} roughness={0.82} />
      </mesh>
      {[0.02, 0.1, 0.18].map((y) => (
        <mesh key={y} position={[0.34, BELT.y + 1.36 + y, -0.06]} rotation={[0, 0.3, 0]} raycast={NO_HIT}>
          <boxGeometry args={[0.43, 0.012, 0.35]} />
          <meshStandardMaterial color={PALETTE.woodDark} roughness={0.85} />
        </mesh>
      ))}

      {/* feet, so it stands on the floor rather than floating over the belt */}
      {[-1, 1].map((side) =>
        [-1, 1].map((end) => (
          <mesh
            key={`${side}-${end}`}
            position={[side * 0.55, (BELT.y - 0.26) / 2 + 0.07, end * 0.56]}
            castShadow
            raycast={NO_HIT}
          >
            <boxGeometry args={[0.11, BELT.y - 0.12, 0.11]} />
            <meshStandardMaterial color={PALETTE.metalDark} roughness={0.5} metalness={0.35} />
          </mesh>
        )),
      )}
    </StationGroup>
  );
}
