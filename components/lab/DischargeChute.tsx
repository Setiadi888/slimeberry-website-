'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { BELT, STATION_POS } from '@/lib/layout';
import { useLabQuality } from './QualityContext';
import { NO_HIT } from './StationGroup';

/** Aperture half-extents, in the wall plane. */
const HALF_Z = 0.56;
const TOP_Y = 1.36;
const BOTTOM_Y = 0.46;
const STRIPS = 8;

/**
 * Small hazard-striped placard over the hood. Drawn to a canvas so the sign
 * needs no image asset, matching how the product labels are made.
 */
function useSignTexture(): THREE.CanvasTexture | null {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#2f3540';
    ctx.fillRect(0, 0, 320, 96);

    // hazard band along the bottom edge
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 78, 320, 18);
    ctx.clip();
    for (let x = -30; x < 360; x += 24) {
      ctx.fillStyle = (x / 24) % 2 === 0 ? '#f0c86a' : '#2f3540';
      ctx.beginPath();
      ctx.moveTo(x, 96);
      ctx.lineTo(x + 14, 78);
      ctx.lineTo(x + 26, 78);
      ctx.lineTo(x + 12, 96);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.fillStyle = '#f8f3ea';
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px ui-rounded, system-ui, sans-serif';
    ctx.fillText('DISCHARGE 01', 160, 42);
    ctx.fillStyle = '#e4738f';
    ctx.font = 'bold 18px ui-rounded, system-ui, sans-serif';
    ctx.fillText('SLIMEBERRY · MIX LINE', 160, 68);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, []);
}

/**
 * The discharge opening set into the left wall — an airport baggage-claim hood,
 * borrowed wholesale because it solves the problem exactly: jars now push out
 * through a strip curtain instead of blinking into existence over the belt.
 *
 * The dark recess panel sits a few millimetres proud of the wall face, so a jar
 * travelling from `BELT.spawnX` is hidden until it clears the aperture. The
 * strip curtain hangs above jar height, which keeps the illusion without any
 * intersection between the flaps and the cargo.
 *
 * Decorative throughout: the belt itself is the interactive station.
 */
export function DischargeChute() {
  const lampRef = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>(null);
  const stripsRef = useRef<THREE.Group>(null);
  const { reducedMotion } = useLabQuality();
  const sign = useSignTexture();

  useEffect(() => () => sign?.dispose(), [sign]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (lampRef.current) {
      lampRef.current.material.emissiveIntensity = reducedMotion
        ? 0.6
        : 0.25 + (Math.sin(t * 2.4) + 1) * 0.5;
    }

    // the curtain sways as though something just pushed through it
    if (stripsRef.current && !reducedMotion) {
      stripsRef.current.children.forEach((strip, index) => {
        strip.rotation.x = Math.sin(t * 1.6 + index * 0.7) * 0.08;
      });
    }
  });

  const stripWidth = (HALF_Z * 2) / STRIPS;

  return (
    <group position={[STATION_POS.discharge[0], 0, BELT.z]}>
      {/* the hole itself: a dark panel just proud of the wall face, which is
          what hides a jar until it has cleared the aperture */}
      <mesh position={[0.006, (TOP_Y + BOTTOM_Y) / 2, 0]} raycast={NO_HIT}>
        <boxGeometry args={[0.012, TOP_Y - BOTTOM_Y, HALF_Z * 2]} />
        <meshStandardMaterial color="#171b21" roughness={1} metalness={0} />
      </mesh>

      {/* jambs */}
      {[-1, 1].map((side) => (
        <group key={side} position={[0.09, (TOP_Y + BOTTOM_Y) / 2, side * (HALF_Z + 0.09)]}>
          <RoundedBox
            args={[0.19, TOP_Y - BOTTOM_Y + 0.2, 0.18]}
            radius={0.04}
            smoothness={3}
            castShadow
            receiveShadow
            raycast={NO_HIT}
          >
            <meshStandardMaterial color={PALETTE.machine} roughness={0.45} metalness={0.16} />
          </RoundedBox>
          {/* hazard chevrons down the jamb */}
          {[-0.3, -0.1, 0.1, 0.3].map((y) => (
            <mesh key={y} position={[0.1, y, 0]} rotation={[0.6, 0, 0]} raycast={NO_HIT}>
              <boxGeometry args={[0.012, 0.07, 0.16]} />
              <meshStandardMaterial color="#f0c86a" roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}

      {/* lintel + projecting hood */}
      <RoundedBox
        args={[0.2, 0.22, HALF_Z * 2 + 0.36]}
        radius={0.05}
        smoothness={3}
        position={[0.09, TOP_Y + 0.11, 0]}
        castShadow
        receiveShadow
        raycast={NO_HIT}
      >
        <meshStandardMaterial color={PALETTE.machine} roughness={0.45} metalness={0.16} />
      </RoundedBox>
      <mesh position={[0.24, TOP_Y + 0.02, 0]} rotation={[0, 0, -0.42]} castShadow raycast={NO_HIT}>
        <boxGeometry args={[0.34, 0.07, HALF_Z * 2 + 0.3]} />
        <meshStandardMaterial color={PALETTE.metal} roughness={0.4} metalness={0.42} />
      </mesh>

      {/* sill the belt runs over */}
      <mesh position={[0.13, BOTTOM_Y - 0.06, 0]} castShadow receiveShadow raycast={NO_HIT}>
        <boxGeometry args={[0.26, 0.1, HALF_Z * 2 + 0.3]} />
        <meshStandardMaterial color={PALETTE.metalDark} roughness={0.5} metalness={0.3} />
      </mesh>

      {/*
        Rubber strip curtain. It hangs above jar height on purpose — a jar tops
        out around y = 0.9, the strips stop at 0.98 — so the flaps read as parted
        by the cargo without ever intersecting it.
      */}
      <group ref={stripsRef} position={[0.035, 1.32, 0]}>
        {Array.from({ length: STRIPS }, (_, index) => (
          <mesh
            key={index}
            position={[0, -0.17, (index - (STRIPS - 1) / 2) * stripWidth]}
            raycast={NO_HIT}
          >
            <boxGeometry args={[0.012, 0.34, stripWidth * 0.86]} />
            <meshStandardMaterial
              color="#3c434f"
              roughness={0.92}
              transparent
              opacity={0.93}
            />
          </mesh>
        ))}
      </group>

      {/* running lamp on the hood */}
      <mesh ref={lampRef} position={[0.2, TOP_Y + 0.3, -HALF_Z - 0.05]} raycast={NO_HIT}>
        <sphereGeometry args={[0.055, 12, 10]} />
        <meshStandardMaterial
          color="#f0c86a"
          emissive="#f0a93a"
          emissiveIntensity={0.6}
          roughness={0.3}
        />
      </mesh>

      {/* placard */}
      {sign && (
        <mesh position={[0.13, TOP_Y + 0.52, 0.05]} rotation={[0, Math.PI / 2, 0]} castShadow raycast={NO_HIT}>
          <boxGeometry args={[0.92, 0.28, 0.05]} />
          <meshStandardMaterial map={sign} roughness={0.7} />
        </mesh>
      )}
    </group>
  );
}
