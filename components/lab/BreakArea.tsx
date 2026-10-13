'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { BREAK_SEATS, STATION_POS } from '@/lib/layout';
import { useLabQuality } from './QualityContext';
import { TurnedForm, TABLE_FOOT, STOOL_SEAT, MUG_PROFILE, Housing, InsetTray } from './DesignedForms';

const NO_HIT = () => null;

/** The stools, in the table's local frame. */
const SEATS = Object.values(BREAK_SEATS).map(
  ([x, z]) => [x - STATION_POS.breakArea[0], z - STATION_POS.breakArea[2]] as const,
);
/* One per seat, in the order BREAK_SEATS declares them. */
const SEAT_COLOURS = [PALETTE.mint, '#f0dfa4', PALETTE.butter, '#e4a0b4'] as const;

/**
 * The break corner. Deliberately round-topped and pedestal-based so it reads as
 * a cafe table at a glance, rather than as another rectangular production bench.
 *
 * Entirely decorative — nothing here takes a pointer hit.
 */
export function BreakArea() {
  const brewRef = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>(null);
  const { reducedMotion } = useLabQuality();
  const [x, , z] = STATION_POS.breakArea;

  useFrame(({ clock }) => {
    const lamp = brewRef.current;
    if (!lamp) return;
    // the machine's ready-light breathes slowly
    lamp.material.emissiveIntensity = reducedMotion
      ? 0.7
      : 0.45 + (Math.sin(clock.getElapsedTime() * 1.1) + 1) * 0.35;
  });

  return (
    <group position={[x, 0, z]}>
      {/* pedestal cafe table */}
      <TurnedForm profile={TABLE_FOOT} color={PALETTE.shell} roughness={.45} />
      <mesh position={[0, 0.96, 0]} castShadow receiveShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.78, 0.78, 0.09, 32]} />
        <meshStandardMaterial color={PALETTE.shell} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.915, 0]} raycast={NO_HIT}>
        <cylinderGeometry args={[0.8, 0.8, 0.03, 32]} />
        <meshStandardMaterial color={PALETTE.berry} roughness={0.7} />
      </mesh>

      {/* small espresso machine */}
      <group position={[-0.24, 1.0, -0.16]} rotation={[0, 0.45, 0]}>
        <group position={[0,.17,0]} scale={[.3,.3,.3]}><Housing width={1.4} height={1.13} depth={1} color="#f6f1ea" /></group>
        <mesh position={[.09,.19,.18]} rotation={[Math.PI/2,0,0]} raycast={NO_HIT}>
          <cylinderGeometry args={[.033,.033,.025,12]}/><meshStandardMaterial color="#d9ccb8" metalness={.5} roughness={.35}/></mesh>
        <RoundedBox args={[0.34, 0.12, 0.24]} radius={0.04} smoothness={3} position={[0, 0.4, 0]} castShadow raycast={NO_HIT}>
          <meshStandardMaterial color={PALETTE.berry} roughness={0.45} />
        </RoundedBox>
        {/* group head + drip tray */}
        <mesh position={[0, 0.14, 0.17]} castShadow raycast={NO_HIT}>
          <cylinderGeometry args={[0.04, 0.05, 0.1, 12]} />
          <meshStandardMaterial color={PALETTE.metalDark} roughness={0.35} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.03, 0.19]} raycast={NO_HIT}>
          <boxGeometry args={[0.22, 0.03, 0.14]} />
          <meshStandardMaterial color={PALETTE.metalDark} roughness={0.4} metalness={0.5} />
        </mesh>
        {/* ready light */}
        <mesh ref={brewRef} position={[0.14, 0.28, 0.16]} raycast={NO_HIT}>
          <sphereGeometry args={[0.028, 10, 8]} />
          <meshStandardMaterial color="#7bbf6a" emissive="#7bbf6a" emissiveIntensity={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* Proper mugs, not the little espresso cups: wider, straight-sided, with
          a real handle and a saucer under one of them. This is the corner people
          actually stand around, so it wanted the mug you would bring to it. */}
      {[
        { at: [0.3, 0.12] as const, tint: PALETTE.berry, angle: 0.5, saucer: true },
        { at: [0.12, -0.32] as const, tint: '#8ed0e8', angle: -1.1, saucer: false },
        { at: [0.44, -0.1] as const, tint: PALETTE.butter, angle: 2.2, saucer: false },
      ].map(({ at, tint, angle, saucer }, index) => (
        <group key={index} position={[at[0], 1.0, at[1]]} rotation={[0, angle, 0]}>
          {saucer && (
            <mesh position={[0, 0.008, 0]} castShadow receiveShadow raycast={NO_HIT}>
              <cylinderGeometry args={[0.105, 0.1, 0.016, 20]} />
              <meshStandardMaterial color="#fdfaf4" roughness={0.45} />
            </mesh>
          )}
          <group position={[0,saucer?.015:.005,0]}><TurnedForm profile={MUG_PROFILE} color="#fdfaf4" roughness={.4}/></group>
          {/* a band of colour, the way a mug set is usually told apart */}
          <mesh position={[0, saucer ? 0.045 : 0.035, 0]} raycast={NO_HIT}>
            <cylinderGeometry args={[0.0735, 0.069, 0.045, 20]} />
            <meshStandardMaterial color={tint} roughness={0.5} />
          </mesh>
          {/* coffee */}
          <mesh position={[0, saucer ? 0.142 : 0.132, 0]} raycast={NO_HIT}>
            <cylinderGeometry args={[0.062, 0.062, 0.012, 20]} />
            <meshStandardMaterial color="#5b3a26" roughness={0.3} />
          </mesh>
          {/* handle */}
          <mesh
            position={[0.078, saucer ? 0.085 : 0.075, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
            raycast={NO_HIT}
          >
            <torusGeometry args={[0.038, 0.011, 8, 16, Math.PI * 1.1]} />
            <meshStandardMaterial color="#fdfaf4" roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* the wooden tray and the sugar tin they all sit near */}
      <group position={[.24,1.005,-.04]} rotation={[0,.3,0]}><InsetTray width={.34} depth={.26} color={PALETTE.wood}/></group>
      <mesh position={[-0.08, 1.02, 0.3]} castShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.06, 0.06, 0.13, 14]} />
        <meshStandardMaterial color="#e7dcc9" roughness={0.6} />
      </mesh>

      {/*
        Four stools, one per beat, placed from BREAK_SEATS so the seat a
        character walks to is always the seat that is there. One each rather than
        shared: they choose where to go at random, and two of them heading for
        the same stool would eventually put both in the same half metre. The
        fourth is the supervisor's, who is on for both shifts and does
        occasionally sit down.
      */}
      {SEATS.map(([sx, sz], index) => (
        <group key={index} position={[sx, 0, sz]}>
          <group position={[0,.46,0]}><TurnedForm profile={STOOL_SEAT} color={SEAT_COLOURS[index]}/></group>
          {[0,1,2].map(leg=><mesh key={leg} position={[Math.cos(leg*Math.PI*2/3)*.12,.24,Math.sin(leg*Math.PI*2/3)*.12]}
            rotation={[Math.sin(leg*Math.PI*2/3)*-.22,0,Math.cos(leg*Math.PI*2/3)*.22]} raycast={NO_HIT}>
            <cylinderGeometry args={[.027,.019,.39,8]}/><meshStandardMaterial color={PALETTE.woodDark} roughness={.8}/></mesh>)}
          <mesh position={[0,.22,0]} rotation={[Math.PI/2,0,0]} raycast={NO_HIT}>
            <torusGeometry args={[.125,.01,5,16]}/><meshStandardMaterial color={PALETTE.woodDark} roughness={.8}/></mesh>
        </group>
      ))}
    </group>
  );
}
