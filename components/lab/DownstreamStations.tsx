'use client';

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { BELT, FLOOR_TOP_Y, STATION_POS } from '@/lib/layout';
import { useCartLines } from '@/lib/cart';
import { getProduct } from '@/lib/products';
import { registerAnchor, unregisterAnchor } from '@/lib/anchors';
import { hoverEntity, selectEntity, useIsHovered, useIsSelected } from '@/lib/interaction';
import { useLabQuality } from './QualityContext';
import { NO_HIT, StationGroup } from './StationGroup';
import { ServicePanel } from './DesignedForms';
import { Glassware } from './Glassware';

/** Local z offset from a south bench to the belt centreline. */
const toBelt = (benchZ: number) => BELT.z - benchZ;

/** Cap on the order stack, so a large basket cannot overflow the cage. */
const MAX_CRATES = 6;

/*
  The nozzle comes down to just over a lid rather than into it. It used to dip
  to 0.92, which was already inside the old cups; the fruit series cups stand a
  few centimetres taller again, so it now rests higher and stops 2cm clear of
  the tallest thing the belt carries.
*/
const NOZZLE_REST = 1.31;
const NOZZLE_DIP = 0.1;

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
    nozzleRef.current.position.y = NOZZLE_REST - Math.max(0, Math.sin(t * 1.5)) * NOZZLE_DIP;
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
        <mesh ref={nozzleRef} position={[0, NOZZLE_REST, 0]} castShadow raycast={NO_HIT}>
          <cylinderGeometry args={[0.07, 0.05, 0.24, 12]} />
          <meshStandardMaterial color={PALETTE.metalDark} roughness={0.35} metalness={0.55} />
        </mesh>
      </group>
    </StationGroup>
  );
}

/**
 * Labelling: a desk of label rolls, standing shoulder to shoulder with QC.
 *
 * It used to carry a gantry over the belt — a post, a spinning reel and an
 * applicator arm that tapped each jar as it passed. That was built when
 * labelling sat downstream of filling and upstream of packaging. Filling has
 * since moved to the west end of the belt and packaging to the middle, so the
 * arm was left tapping at boxes that had already been sealed and printed, and
 * read as loose hardware floating over the line rather than as a machine doing
 * anything. The desk does the job now.
 */
export function LabellingStation() {
  return (
    <StationGroup id="labelling" position={STATION_POS.labelling} ringRadius={1.0} ringColor="#f3d78c">
      <RoundedBox args={[1.15, 0.13, 0.9]} radius={0.05} smoothness={3} position={[0, 0.93, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={PALETTE.shell} roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[1.0, 0.52, 0.78]} radius={0.07} smoothness={3} position={[0, 0.62, 0]} castShadow receiveShadow raycast={NO_HIT}>
        <meshStandardMaterial color="#eef2f7" roughness={0.6} />
      </RoundedBox>

      <group position={[0,.61,.4]}><ServicePanel width={.82} height={.35}/></group>

      {/* The bench glass: flask, beaker and two reagent bottles. The label rolls
          and the tape-and-boxes that used to be here are gone. */}
      <Glassware position={[0.05, 0.995, -0.02]} rotation={-0.18} />

    </StationGroup>
  );
}

/**
 * A little trolley. Used as scenery at dispatch and as the vehicle that carries
 * a purchase away in the add-to-cart sequence.
 */
/** How the trolley stands. It is parked scenery; nobody wheels it about. */
const PARK_ROTATION = 0.6;

/**
 * The order trolley.
 *
 * It replaced the dispatch pallet, which was a painted bay and a slab of
 * flooring that could only ever be looked at. This does the same job — every
 * unit added to the cart drops a crate into the basket, which is what ties the
 * shop back to the factory — and it stays where it is put.
 */
export function OrderTrolley() {
  const lines = useCartLines();
  const rootRef = useRef<THREE.Group>(null);
  const cratesRef = useRef<THREE.Group>(null);
  const wheelsRef = useRef<THREE.Group>(null);
  const hovered = useIsHovered('station', 'trolley');
  const selected = useIsSelected('station', 'trolley');
  const active = hovered || selected;
  const { reducedMotion } = useLabQuality();

  const [parkX, , parkZ] = STATION_POS.trolleyPark;

  useEffect(() => {
    const group = rootRef.current;
    if (!group) return;
    registerAnchor('station', 'trolley', group);
    return () => {
      unregisterAnchor('station', 'trolley');
      document.body.style.cursor = 'auto';
    };
  }, []);

  // One crate per unit, not per line, so a repeat purchase visibly stacks up.
  // Capped so a large basket cannot overflow the cage.
  const crates = lines
    .flatMap((line) => Array.from({ length: line.quantity }, () => line.productId))
    .slice(-MAX_CRATES);

  useFrame(({ clock }, delta) => {
    const step = Math.min(delta, 1 / 30);
    const t = clock.getElapsedTime();

    cratesRef.current?.children.forEach((crate, index) => {
      // settle in with a small drop when a crate first appears
      crate.position.y = THREE.MathUtils.damp(crate.position.y, index * 0.22, 6, step);
      if (!reducedMotion) crate.rotation.y = Math.sin(t * 0.5 + index) * 0.05;
    });

    if (reducedMotion) return;
    // parked for good, so the castors only ever drift
    wheelsRef.current?.children.forEach((wheel, index) => {
      wheel.rotation.z = Math.sin(t * 0.4 + index) * 0.05;
    });
  });

  return (
    <group
      ref={rootRef}
      position={[parkX, FLOOR_TOP_Y, parkZ]}
      rotation={[0, PARK_ROTATION, 0]}
      onPointerOver={(event) => {
        event.stopPropagation();
        hoverEntity({ kind: 'station', id: 'trolley' });
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        hoverEntity(null);
        document.body.style.cursor = 'auto';
      }}
      onClick={(event) => {
        event.stopPropagation();
        selectEntity({ kind: 'station', id: 'trolley' });
      }}
    >
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={active} raycast={NO_HIT}>
        <ringGeometry args={[0.62, 0.74, 36]} />
        <meshBasicMaterial color="#c98f3a" transparent opacity={selected ? 0.85 : 0.4} />
      </mesh>

      {/* deck — the one mesh left pickable, so the trolley can be tapped */}
      <RoundedBox args={[0.78, 0.07, 0.56]} radius={0.03} smoothness={3} position={[0, 0.26, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={PALETTE.metal} roughness={0.42} metalness={0.4} />
      </RoundedBox>
      {/* push bar */}
      <mesh position={[-0.36, 0.52, 0]} castShadow raycast={NO_HIT}>
        <boxGeometry args={[0.06, 0.52, 0.5]} />
        <meshStandardMaterial color={PALETTE.metalDark} roughness={0.4} metalness={0.45} />
      </mesh>
      <mesh position={[-0.36, 0.76, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.028, 0.028, 0.5, 12]} />
        <meshStandardMaterial color={PALETTE.berry} roughness={0.5} />
      </mesh>
      {/* cage sides, so the crates read as held rather than balanced */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0.02, 0.42, side * 0.27]} castShadow raycast={NO_HIT}>
          <boxGeometry args={[0.66, 0.26, 0.03]} />
          <meshStandardMaterial color={PALETTE.metal} roughness={0.45} metalness={0.4} transparent opacity={0.55} />
        </mesh>
      ))}

      <group ref={wheelsRef}>
        {[[-0.28, 0.22], [-0.28, -0.22], [0.3, 0.22], [0.3, -0.22]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.11, z]} rotation={[Math.PI / 2, 0, 0]} castShadow raycast={NO_HIT}>
            <cylinderGeometry args={[0.1, 0.1, 0.05, 12]} />
            <meshStandardMaterial color="#5c6470" roughness={0.6} />
          </mesh>
        ))}
      </group>

      {/* the order, stacking up */}
      <group ref={cratesRef} position={[0.02, 0.33, 0]}>
        {crates.map((productId, index) => {
          const product = getProduct(productId);
          return (
            <group key={`${productId}-${index}`} position={[0, 0.6, 0]}>
              <RoundedBox args={[0.44, 0.2, 0.4]} radius={0.04} smoothness={3} castShadow raycast={NO_HIT}>
                <meshStandardMaterial color={PALETTE.wood} roughness={0.8} />
              </RoundedBox>
              <mesh position={[0, 0.11, 0]} castShadow raycast={NO_HIT}>
                <cylinderGeometry args={[0.08, 0.08, 0.06, 14]} />
                <meshStandardMaterial color={product?.color ?? PALETTE.berry} roughness={0.35} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}
