'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { BUCKET_PRODUCTS, FRUIT_PRODUCTS } from '@/lib/products';
import { CUP_SCALE } from '@/lib/cupSize';
import { BELT } from '@/lib/layout';
import { hoverEntity, selectEntity, useIsHovered, useIsSelected } from '@/lib/interaction';
import { registerAnchor, unregisterAnchor } from '@/lib/anchors';
import { useLabQuality } from './QualityContext';
import { FruitCupProp } from '@/components/mart/FruitCup';
import { BucketProp } from '@/components/mart/SlimeBucket';

const NO_HIT = () => null;

/** Spacing between items along the belt, which sets how many are in transit. */
const JAR_SPACING = 1.1;
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
  const slatsRef = useRef<THREE.InstancedMesh>(null);
  const { reducedMotion } = useLabQuality();

  const hovered = useIsHovered('station', 'conveyor');
  const selected = useIsSelected('station', 'conveyor');
  const active = hovered || selected;

  const beltLength = BELT.endX - BELT.startX;
  const beltCentre = (BELT.startX + BELT.endX) / 2;
  /*
    Jars now run only as far as the packaging tunnel — everything east of it is
    shippers, which the palletiser owns. Derived from the belt's own speed rather
    than a hand-set duration, so the run can be shortened again without the
    cargo quietly changing pace.
  */
  const travelSpan = BELT.retireX - BELT.spawnX;
  const travelSeconds = travelSpan / BELT.speed;
  /*
    The slats run the whole bed, the cargo only the stretch between the wall and
    the packaging tunnel — so they cannot share a lap time. They did, which ran
    the belt surface at 1.9x the speed of the things standing on it: the slats
    visibly slid out from under every cup. Each now takes its own distance at
    BELT.speed, which is the one number both are supposed to move at.
  */
  const slatSeconds = beltLength / BELT.speed;
  /* Rounded to an even number, so the two designs alternate all the way round —
     an odd count puts two of a kind side by side wherever the loop closes. */
  const jarCount = Math.max(2, Math.round(travelSpan / JAR_SPACING / 2) * 2);

  /** Reused every frame; writing a fresh Matrix4 per slat would be 33 a frame. */
  const slat = useMemo(() => new THREE.Matrix4(), []);

  const jars = useMemo(
    () =>
      Array.from({ length: jarCount }, (_, index) => {
        const bucket = index % 2 === 1;
        const pair = Math.floor(index / 2);
        return {
          bucket,
          // every third fruit cup, so a short run of cargo still shows a spread
          product: bucket
            ? BUCKET_PRODUCTS[pair % BUCKET_PRODUCTS.length]
            : FRUIT_PRODUCTS[(pair * 3) % FRUIT_PRODUCTS.length],
          offset: index / jarCount,
        };
      }),
    [jarCount],
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

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const elapsed = clock.getElapsedTime();
    const t = elapsed / travelSeconds;

    jarsRef.current?.children.forEach((jar, index) => {
      const progress = (t + jars[index].offset) % 1;
      jar.position.x = BELT.spawnX + progress * travelSpan;
      // a touch of wobble, as a jar on a moving belt would have
      jar.rotation.z = Math.sin(clock.getElapsedTime() * 2.2 + index) * 0.035;
    });

    /*
      One InstancedMesh rather than thirty-three meshes. They are identical
      boxes in one material moving along one axis, which is the exact shape
      instancing is for — same pixels, one draw call instead of thirty-three.
    */
    const slats = slatsRef.current;
    if (slats) {
      for (let index = 0; index < SLAT_COUNT; index += 1) {
        const progress = (elapsed / slatSeconds + index / SLAT_COUNT) % 1;
        slat.makeTranslation(BELT.startX + progress * beltLength, 0, 0);
        slats.setMatrixAt(index, slat);
      }
      slats.instanceMatrix.needsUpdate = true;
    }

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
      <instancedMesh
        ref={slatsRef}
        args={[undefined, undefined, SLAT_COUNT]}
        position={[0, BELT.y + 0.085, BELT.z]}
        frustumCulled={false}
        raycast={NO_HIT}
      >
        <boxGeometry args={[0.05, 0.012, 0.66]} />
        <meshStandardMaterial color="#6d7686" roughness={0.9} />
      </instancedMesh>

      {/* legs */}
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
        The cargo: the shop's two newest lines, a fruit series cup and a boba
        bucket in turn, at the size every cup in both rooms is. They are the
        SB Mart models, as props — a cup riding the belt must not register a
        product anchor, or it would fight the one on the stand for the same id,
        and nothing on the belt answers the pointer.

        Both models stand on their own origin, so the group sits exactly on the
        slat tops.
      */}
      <group ref={jarsRef} position={[0, BELT.surfaceY, BELT.z]}>
        {jars.map(({ product, bucket }, index) => (
          <group key={index}>
            {bucket ? (
              <BucketProp product={product} position={[0, 0, 0]} scale={CUP_SCALE.bucket} />
            ) : (
              <FruitCupProp product={product} position={[0, 0, 0]} scale={CUP_SCALE.fruit} />
            )}
          </group>
        ))}
      </group>
    </group>
  );
}
