'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { SIGNATURE_PRODUCTS } from '@/lib/products';
import { BELT } from '@/lib/layout';
import { hoverEntity, selectEntity, useIsHovered, useIsSelected } from '@/lib/interaction';
import { registerAnchor, unregisterAnchor } from '@/lib/anchors';
import { useLabQuality } from './QualityContext';

const NO_HIT = () => null;

/**
 * Seconds for one jar to travel the whole line. Slow on purpose, and scaled up
 * from 34 with the belt's new length so the cargo still moves at the same speed.
 */
const TRAVEL_SECONDS = 43;
const JAR_COUNT = 10;
const SLAT_COUNT = 33;

/**
 * The belt, running from the wall discharge east to packaging.
 *
 * Jars move at a constant speed with fixed spacing and are never scaled in or
 * out. They are spawned at `BELT.spawnX`, which sits inside the left wall behind
 * the discharge hood, and retired at `BELT.retireX`, which sits inside the
 * packaging housing — so the loop point is always behind solid geometry, and a
 * jar is only ever seen pushing out through the strip curtain, never appearing
 * or vanishing in the open.
 *
 * The belt slats use the same motion but wrap in the open, which is invisible
 * because they are identical and evenly spaced.
 */
export function Conveyor() {
  const anchorRef = useRef<THREE.Group>(null);
  const jarsRef = useRef<THREE.Group>(null);
  const slatsRef = useRef<THREE.Group>(null);
  const rollersRef = useRef<THREE.Group>(null);
  const { reducedMotion } = useLabQuality();

  const hovered = useIsHovered('station', 'conveyor');
  const selected = useIsSelected('station', 'conveyor');
  const active = hovered || selected;

  const beltLength = BELT.endX - BELT.startX;
  const beltCentre = (BELT.startX + BELT.endX) / 2;
  const travelSpan = BELT.retireX - BELT.spawnX;

  const jars = useMemo(
    () =>
      Array.from({ length: JAR_COUNT }, (_, index) => ({
        product: SIGNATURE_PRODUCTS[index % SIGNATURE_PRODUCTS.length],
        offset: index / JAR_COUNT,
      })),
    [],
  );

  useEffect(() => {
    const group = anchorRef.current;
    if (!group) return;
    registerAnchor('station', 'conveyor', group);
    return () => {
      unregisterAnchor('station', 'conveyor');
      document.body.style.cursor = 'auto';
    };
  }, []);

  useFrame(({ clock }, delta) => {
    if (reducedMotion) return;
    const t = clock.getElapsedTime() / TRAVEL_SECONDS;

    jarsRef.current?.children.forEach((jar, index) => {
      const progress = (t + jars[index].offset) % 1;
      jar.position.x = BELT.spawnX + progress * travelSpan;
      // a touch of wobble, as a jar on a moving belt would have
      jar.rotation.z = Math.sin(clock.getElapsedTime() * 2.2 + index) * 0.035;
    });

    slatsRef.current?.children.forEach((slat, index) => {
      const progress = (t + index / SLAT_COUNT) % 1;
      slat.position.x = BELT.startX + progress * beltLength;
    });

    rollersRef.current?.children.forEach((roller) => {
      roller.rotation.z -= delta * 1.6;
    });
  });

  return (
    <group>
      {/* belt bed */}
      <group
        ref={anchorRef}
        position={[beltCentre, 0, BELT.z]}
        onPointerOver={(event) => {
          event.stopPropagation();
          hoverEntity({ kind: 'station', id: 'conveyor' });
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          hoverEntity(null);
          document.body.style.cursor = 'auto';
        }}
        onClick={(event) => {
          event.stopPropagation();
          selectEntity({ kind: 'station', id: 'conveyor' });
        }}
      >
        <RoundedBox args={[beltLength, 0.16, 0.72]} radius={0.06} smoothness={3} position={[0, BELT.y, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={PALETTE.rubber} roughness={0.88} />
        </RoundedBox>
        <RoundedBox args={[beltLength + 0.24, 0.16, 0.9]} radius={0.06} smoothness={3} position={[0, BELT.y - 0.14, 0]} castShadow receiveShadow raycast={NO_HIT}>
          <meshStandardMaterial color={PALETTE.metal} roughness={0.4} metalness={0.45} />
        </RoundedBox>

        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={active} raycast={NO_HIT}>
          <ringGeometry args={[beltLength / 2 + 0.1, beltLength / 2 + 0.24, 48]} />
          <meshBasicMaterial color={PALETTE.berry} transparent opacity={selected ? 0.8 : 0.35} />
        </mesh>
      </group>

      {/* moving slats, so the belt visibly runs */}
      <group ref={slatsRef} position={[0, BELT.y + 0.085, BELT.z]}>
        {Array.from({ length: SLAT_COUNT }, (_, index) => (
          <mesh key={index} raycast={NO_HIT}>
            <boxGeometry args={[0.05, 0.012, 0.66]} />
            <meshStandardMaterial color="#6d7686" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* end rollers and legs */}
      <group ref={rollersRef}>
        {[BELT.startX, BELT.endX].map((x) => (
          <mesh key={x} position={[x, BELT.y, BELT.z]} rotation={[Math.PI / 2, 0, 0]} castShadow raycast={NO_HIT}>
            <cylinderGeometry args={[0.13, 0.13, 0.78, 16]} />
            <meshStandardMaterial color={PALETTE.metalDark} roughness={0.35} metalness={0.6} />
          </mesh>
        ))}
      </group>
      {[BELT.startX + 0.5, BELT.endX - 0.5].map((x) => (
        <mesh key={x} position={[x, 0.24, BELT.z]} castShadow raycast={NO_HIT}>
          <boxGeometry args={[0.2, 0.48, 0.6]} />
          <meshStandardMaterial color={PALETTE.metalDark} roughness={0.5} metalness={0.3} />
        </mesh>
      ))}

      {/* short transfer rollers carrying jars off the belt into QC */}
      <group>
        <RoundedBox args={[0.86, 0.12, 0.78]} radius={0.05} smoothness={3} position={[BELT.endX + 0.4, BELT.y - 0.05, BELT.z]} castShadow receiveShadow raycast={NO_HIT}>
          <meshStandardMaterial color={PALETTE.metal} roughness={0.42} metalness={0.45} />
        </RoundedBox>
        {[0.12, 0.4, 0.68].map((offset) => (
          <mesh
            key={offset}
            position={[BELT.endX + offset, BELT.y + 0.04, BELT.z]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
            raycast={NO_HIT}
          >
            <cylinderGeometry args={[0.055, 0.055, 0.7, 12]} />
            <meshStandardMaterial color={PALETTE.metalDark} roughness={0.35} metalness={0.6} />
          </mesh>
        ))}
      </group>

      {/*
        Decorative cargo. These are Mainline cup silhouettes rather than the real
        `SlimeTub` component: a tub on the belt must not register a product
        anchor, or the ten of them would fight the shelved cups for the same ids.
        Non-interactive by design — only workers, machines, stations and
        designated product objects respond to the pointer.
      */}
      <group ref={jarsRef} position={[0, BELT.y + 0.2, BELT.z]}>
        {jars.map(({ product }, index) => (
          <group key={index}>
            {/* foot ring */}
            <mesh position={[0, 0.02, 0]} castShadow raycast={NO_HIT}>
              <cylinderGeometry args={[0.115, 0.12, 0.03, 20]} />
              <meshStandardMaterial color="#d9d9d6" roughness={0.55} />
            </mesh>
            {/* tapered body */}
            <mesh position={[0, 0.14, 0]} castShadow raycast={NO_HIT}>
              <cylinderGeometry args={[0.145, 0.118, 0.22, 20]} />
              <meshPhysicalMaterial color={product.color} roughness={0.22} clearcoat={0.8} transparent opacity={0.93} />
            </mesh>
            {/* chunky white lid */}
            <mesh position={[0, 0.28, 0]} castShadow raycast={NO_HIT}>
              <cylinderGeometry args={[0.163, 0.163, 0.08, 22]} />
              <meshStandardMaterial color="#fbfbf9" roughness={0.45} />
            </mesh>
            {/* the lid's printed disc, in the flavour's own colour */}
            <mesh position={[0, 0.321, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={NO_HIT}>
              <circleGeometry args={[0.125, 20]} />
              <meshStandardMaterial color={product.accent} roughness={0.6} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
