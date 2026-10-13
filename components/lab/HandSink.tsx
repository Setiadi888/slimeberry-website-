'use client';

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { STATION_POS } from '@/lib/layout';
import { registerAnchor, unregisterAnchor } from '@/lib/anchors';
import { hoverEntity, selectEntity, useIsHovered, useIsSelected } from '@/lib/interaction';
import { onLabEvent } from '@/lib/labEvents';
import { useLabQuality } from './QualityContext';
import { NO_HIT } from './StationGroup';

const STEEL = '#c9d1d6';
const STEEL_DARK = '#9aa5ad';
const BASIN = '#aeb8bf';

const WIDTH = 1.25;
const DEPTH = 0.62;
const TOP = 0.92;
/** How long the tap runs once somebody turns it on. */
const RUN_SECONDS = 4.2;

/**
 * The hand sink, where the goldfish tank used to be.
 *
 * A catering-grade trough in stainless: splashback up the wall, a pressed basin
 * with a radiused bottom, a swan-neck mixer with lever handles, soap on the wall
 * and a paper towel dispenser beside it. Everything is the same steel at
 * different roughness, which is what actually distinguishes a pressed basin from
 * a polished spout.
 *
 * It runs when somebody uses it and not otherwise: the workers' routes have a
 * stop here, and arriving at it fires `sink:use`, which is what starts the water
 * and the ripple in the basin. Nothing drips on an empty lab.
 */
export function HandSink() {
  const groupRef = useRef<THREE.Group>(null);
  const streamRef = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>>(null);
  const splashRef = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>>(null);
  /** Counts down from 1 while the tap is running. */
  const running = useRef(0);
  const { reducedMotion } = useLabQuality();
  const hovered = useIsHovered('station', 'sink');
  const selected = useIsSelected('station', 'sink');
  const active = hovered || selected;

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    registerAnchor('station', 'sink', group);
    return () => {
      unregisterAnchor('station', 'sink');
      document.body.style.cursor = 'auto';
    };
  }, []);

  useEffect(() => onLabEvent('sink:use', () => {
    running.current = 1;
  }), []);

  useFrame(({ clock }, delta) => {
    running.current = Math.max(0, running.current - Math.min(delta, 0.1) / RUN_SECONDS);
    const on = reducedMotion ? 0 : running.current > 0 ? 1 : 0;
    const t = clock.getElapsedTime();

    const stream = streamRef.current;
    if (stream) {
      stream.visible = on > 0;
      // the column of water wobbles rather than hangs there like a rod
      stream.scale.x = 1 + Math.sin(t * 24) * 0.07;
      stream.scale.z = 1 + Math.cos(t * 19) * 0.07;
    }
    const splash = splashRef.current;
    if (splash) {
      splash.visible = on > 0;
      splash.material.opacity = on * (0.3 + Math.abs(Math.sin(t * 9)) * 0.22);
      const spread = 1 + Math.abs(Math.sin(t * 9)) * 0.25;
      splash.scale.set(spread, spread, 1);
    }
  });

  return (
    <group
      ref={groupRef}
      position={[STATION_POS.sink[0], 0, STATION_POS.sink[2]]}
      rotation={[0, Math.PI / 2, 0]}
      onPointerOver={(event) => {
        event.stopPropagation();
        hoverEntity({ kind: 'station', id: 'sink' });
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        hoverEntity(null);
        document.body.style.cursor = 'auto';
      }}
      onClick={(event) => {
        event.stopPropagation();
        selectEntity({ kind: 'station', id: 'sink' });
      }}
    >
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={active}>
        <ringGeometry args={[0.85, 0.95, 36]} />
        <meshBasicMaterial color={PALETTE.mint} transparent opacity={selected ? 0.85 : 0.4} />
      </mesh>

      {/* legs and the undershelf they brace */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            position={[sx * (WIDTH / 2 - 0.08), TOP / 2, sz * (DEPTH / 2 - 0.09)]}
            castShadow
            raycast={NO_HIT}
          >
            <cylinderGeometry args={[0.022, 0.022, TOP, 10]} />
            <meshStandardMaterial color={STEEL_DARK} roughness={0.34} metalness={0.78} />
          </mesh>
        )),
      )}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow raycast={NO_HIT}>
        <boxGeometry args={[WIDTH - 0.14, 0.025, DEPTH - 0.16]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.42} metalness={0.7} />
      </mesh>

      {/* the top, with the basin pressed into it */}
      <RoundedBox
        args={[WIDTH, 0.06, DEPTH]}
        radius={0.016}
        smoothness={3}
        position={[0, TOP, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={STEEL} roughness={0.26} metalness={0.82} />
      </RoundedBox>
      <mesh position={[0, TOP - 0.1, 0.02]} receiveShadow raycast={NO_HIT}>
        <boxGeometry args={[0.66, 0.2, 0.36]} />
        <meshStandardMaterial color={BASIN} roughness={0.34} metalness={0.7} side={THREE.BackSide} />
      </mesh>
      {/* the drain, and the water standing in the bottom of the bowl */}
      <mesh position={[0, TOP - 0.195, 0.02]} rotation={[-Math.PI / 2, 0, 0]} raycast={NO_HIT}>
        <circleGeometry args={[0.03, 14]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.3} metalness={0.85} />
      </mesh>
      <mesh
        ref={splashRef}
        position={[0, TOP - 0.19, 0.02]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
        raycast={NO_HIT}
      >
        <ringGeometry args={[0.03, 0.1, 20]} />
        <meshBasicMaterial color="#cfe9f5" transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* splashback up the wall */}
      <mesh position={[0, TOP + 0.21, -DEPTH / 2 + 0.02]} castShadow receiveShadow raycast={NO_HIT}>
        <boxGeometry args={[WIDTH, 0.42, 0.03]} />
        <meshStandardMaterial color={STEEL} roughness={0.3} metalness={0.8} />
      </mesh>

      {/* swan-neck mixer: column, arc, spout, and a lever each side */}
      <mesh position={[0, TOP + 0.14, -0.2]} castShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.022, 0.026, 0.28, 12]} />
        <meshStandardMaterial color={STEEL} roughness={0.18} metalness={0.9} />
      </mesh>
      <mesh position={[0, TOP + 0.28, -0.1]} rotation={[Math.PI / 2, 0, 0]} castShadow raycast={NO_HIT}>
        <torusGeometry args={[0.1, 0.019, 10, 20, Math.PI]} />
        <meshStandardMaterial color={STEEL} roughness={0.18} metalness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 0.1, TOP + 0.21, -0.2]}
          rotation={[0, 0, side * 0.5]}
          castShadow
          raycast={NO_HIT}
        >
          <cylinderGeometry args={[0.012, 0.012, 0.13, 8]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.22} metalness={0.9} />
        </mesh>
      ))}

      {/* the water, when it is running */}
      <mesh ref={streamRef} position={[0, TOP - 0.06, 0.0]} visible={false} raycast={NO_HIT}>
        <cylinderGeometry args={[0.012, 0.016, 0.3, 8, 1, true]} />
        <meshPhysicalMaterial
          color="#dff1fb"
          roughness={0.05}
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* soap on the wall, and the towel dispenser beside it */}
      <mesh position={[-0.44, TOP + 0.2, -DEPTH / 2 + 0.06]} castShadow raycast={NO_HIT}>
        <boxGeometry args={[0.1, 0.17, 0.07]} />
        <meshStandardMaterial color="#eef3f5" roughness={0.5} />
      </mesh>
      <mesh position={[-0.44, TOP + 0.1, -DEPTH / 2 + 0.08]} rotation={[0.5, 0, 0]} raycast={NO_HIT}>
        <cylinderGeometry args={[0.008, 0.008, 0.06, 6]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.3} metalness={0.8} />
      </mesh>
      <RoundedBox
        args={[0.22, 0.26, 0.11]}
        radius={0.02}
        smoothness={2}
        position={[0.46, TOP + 0.26, -DEPTH / 2 + 0.08]}
        castShadow
        raycast={NO_HIT}
      >
        <meshStandardMaterial color={STEEL} roughness={0.34} metalness={0.72} />
      </RoundedBox>
      <mesh position={[0.46, TOP + 0.12, -DEPTH / 2 + 0.08]} raycast={NO_HIT}>
        <boxGeometry args={[0.16, 0.05, 0.015]} />
        <meshStandardMaterial color="#fdfbf6" roughness={0.9} />
      </mesh>
    </group>
  );
}
