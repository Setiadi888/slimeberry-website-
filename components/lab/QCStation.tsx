'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { BELT, STATION_POS } from '@/lib/layout';
import { useLabQuality } from './QualityContext';
import { NO_HIT, StationGroup } from './StationGroup';
import { ServicePanel } from './DesignedForms';
import { Microscope } from './Microscope';

/**
 * Quality control, sited on the belt so the flow reads without labels: batches
 * pass under the scanner arch, the lamp blinks approval, and the inspection
 * bench sits immediately alongside.
 */
export function QCStation() {
  const lampRef = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>(null);
  const { reducedMotion } = useLabQuality();

  const localArchX = BELT.qcX - STATION_POS.qc[0];
  const localBeltZ = BELT.z - STATION_POS.qc[2];

  useFrame(({ clock }) => {
    const lamp = lampRef.current;
    if (!lamp) return;
    if (reducedMotion) {
      lamp.material.emissiveIntensity = 0.6;
      return;
    }
    const beat = (Math.sin(clock.getElapsedTime() * 1.35) + 1) * 0.5;
    lamp.material.emissiveIntensity = 0.35 + Math.pow(beat, 3) * 2.4;
  });

  return (
    <StationGroup id="qc" position={STATION_POS.qc} ringRadius={1.05} ringColor="#7bbf6a">
      {/* scanner arch straddling the belt */}
      <group position={[localArchX, 0, localBeltZ]}>
        {[-0.52, 0.52].map((z) => (
          <mesh key={z} position={[0, BELT.y + 0.42, z]} castShadow raycast={NO_HIT}>
            <boxGeometry args={[0.13, 0.85, 0.13]} />
            <meshStandardMaterial color={PALETTE.metal} roughness={0.4} metalness={0.5} />
          </mesh>
        ))}
        <RoundedBox args={[0.2, 0.2, 1.24]} radius={0.06} smoothness={3} position={[0, BELT.y + 0.9, 0]} castShadow raycast={NO_HIT}>
          <meshStandardMaterial color={PALETTE.machine} roughness={0.4} metalness={0.2} />
        </RoundedBox>
        <mesh ref={lampRef} position={[0, BELT.y + 0.9, 0]} raycast={NO_HIT}>
          <sphereGeometry args={[0.075, 14, 12]} />
          <meshStandardMaterial color="#7bbf6a" emissive="#7bbf6a" emissiveIntensity={0.6} roughness={0.3} />
        </mesh>
      </group>

      {/* inspection bench — rounded and lit, unlike the production tables */}
      <RoundedBox args={[1.5, 0.14, 1.0]} radius={0.07} smoothness={4} position={[0, 0.92, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={PALETTE.shell} roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, 1.0, 0.02]} rotation={[-Math.PI / 2, 0, 0]} raycast={NO_HIT}>
        <planeGeometry args={[0.85, 0.55]} />
        <meshStandardMaterial color="#eaf6fb" emissive="#dcf1fb" emissiveIntensity={0.5} roughness={0.5} />
      </mesh>
      <RoundedBox args={[1.3, 0.5, 0.85]} radius={0.08} smoothness={3} position={[0, 0.6, 0]} castShadow receiveShadow raycast={NO_HIT}>
        <meshStandardMaterial color="#eef2f7" roughness={0.6} />
      </RoundedBox>
      {[[-0.55, 0.36], [0.55, 0.36], [-0.55, -0.36], [0.55, -0.36]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.18, z]} castShadow raycast={NO_HIT}>
          <cylinderGeometry args={[0.055, 0.055, 0.36, 10]} />
          <meshStandardMaterial color={PALETTE.metalDark} roughness={0.45} metalness={0.35} />
        </mesh>
      ))}

      {/* The one thing on this bench. The magnifier on its stand and the two
          pass/fail trays that stood beside it are gone. */}
      <Microscope position={[0.26, 0.99, -0.02]} rotation={-0.42} />
      <group position={[0,.6,.435]}><ServicePanel width={1.08} height={.35}/></group>
    </StationGroup>
  );
}
