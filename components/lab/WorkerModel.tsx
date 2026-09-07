'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import type { WorkerPose } from '@/lib/workerPose';

export interface WorkerAppearance {
  skin: string;
  hair: string;
  cap: string;
}

/**
 * Procedural stand-in character. Everything here is primitives — replacing this
 * component with a GLTF character is a drop-in swap as long as the replacement
 * accepts the same `pose` object.
 */
export function WorkerModel({ pose, appearance }: { pose: WorkerPose; appearance: WorkerAppearance }) {
  const rootRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const crateRef = useRef<THREE.Group>(null);
  const cupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const swing = Math.sin(pose.phase) * pose.locomotion;
    const counterSwing = Math.sin(pose.phase + Math.PI) * pose.locomotion;

    if (leftLegRef.current) leftLegRef.current.rotation.x = swing * 0.9;
    if (rightLegRef.current) rightLegRef.current.rotation.x = counterSwing * 0.9;

    if (leftArmRef.current) {
      if (pose.carrying) {
        leftArmRef.current.rotation.x = -1.25;
        leftArmRef.current.rotation.z = 0.28;
      } else if (pose.inspect > 0.01) {
        leftArmRef.current.rotation.x = -1.05 * pose.inspect;
        leftArmRef.current.rotation.z = 0.42 * pose.inspect;
      } else if (pose.work > 0.01) {
        leftArmRef.current.rotation.x = -0.5 - Math.sin(pose.phase * 2) * 0.45 * pose.work;
        leftArmRef.current.rotation.z = 0.1;
      } else {
        leftArmRef.current.rotation.x = counterSwing * 0.7;
        leftArmRef.current.rotation.z = 0.1;
      }
    }

    if (rightArmRef.current) {
      if (pose.sip > 0.01) {
        // cup up to the mouth
        rightArmRef.current.rotation.x = -1.85 * pose.sip;
        rightArmRef.current.rotation.z = -0.5 * pose.sip;
      } else if (pose.wave > 0.01) {
        rightArmRef.current.rotation.z = -2.1 * pose.wave;
        rightArmRef.current.rotation.x = Math.sin(pose.phase * 3) * 0.4 * pose.wave;
      } else if (pose.carrying) {
        rightArmRef.current.rotation.x = -1.25;
        rightArmRef.current.rotation.z = -0.28;
      } else if (pose.inspect > 0.01) {
        rightArmRef.current.rotation.x = (-1.05 - Math.sin(pose.phase * 1.6) * 0.12) * pose.inspect;
        rightArmRef.current.rotation.z = -0.42 * pose.inspect;
      } else if (pose.work > 0.01) {
        rightArmRef.current.rotation.x = -0.5 - Math.sin(pose.phase * 2 + Math.PI) * 0.45 * pose.work;
        rightArmRef.current.rotation.z = -0.1;
      } else {
        rightArmRef.current.rotation.x = swing * 0.7;
        rightArmRef.current.rotation.z = -0.1;
      }
    }

    if (headRef.current) {
      headRef.current.rotation.z = swing * 0.06;
      // looking down at work, further down when inspecting, level when the
      // visitor has their attention
      headRef.current.rotation.x = pose.work * 0.2 + pose.inspect * 0.36 - pose.attention * 0.14;
    }

    if (rootRef.current) {
      const stride = Math.abs(Math.sin(pose.phase)) * 0.035 * pose.locomotion;
      rootRef.current.position.y = stride + pose.bob + pose.attention * 0.015;
      rootRef.current.rotation.x = pose.inspect * 0.17;
    }

    if (crateRef.current) crateRef.current.visible = pose.carrying;
  });

  return (
    <group ref={rootRef}>
      {/* legs */}
      <group ref={leftLegRef} position={[-0.09, 0.32, 0]}>
        <mesh position={[0, -0.16, 0]} castShadow>
          <capsuleGeometry args={[0.055, 0.18, 4, 10]} />
          <meshStandardMaterial color="#6f7b8d" roughness={0.75} />
        </mesh>
        <mesh position={[0, -0.32, 0.03]} castShadow>
          <boxGeometry args={[0.13, 0.07, 0.19]} />
          <meshStandardMaterial color={PALETTE.ink} roughness={0.6} />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[0.09, 0.32, 0]}>
        <mesh position={[0, -0.16, 0]} castShadow>
          <capsuleGeometry args={[0.055, 0.18, 4, 10]} />
          <meshStandardMaterial color="#6f7b8d" roughness={0.75} />
        </mesh>
        <mesh position={[0, -0.32, 0.03]} castShadow>
          <boxGeometry args={[0.13, 0.07, 0.19]} />
          <meshStandardMaterial color={PALETTE.ink} roughness={0.6} />
        </mesh>
      </group>

      {/* lab coat */}
      <RoundedBox args={[0.34, 0.44, 0.24]} radius={0.1} smoothness={4} position={[0, 0.53, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={PALETTE.coat} roughness={0.72} />
      </RoundedBox>
      {/* collar */}
      <mesh position={[0, 0.7, 0.1]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.2, 0.09, 0.06]} />
        <meshStandardMaterial color="#e7ecf3" roughness={0.7} />
      </mesh>
      {/* buttons */}
      {[0.58, 0.47].map((y) => (
        <mesh key={y} position={[0, y, 0.125]}>
          <sphereGeometry args={[0.018, 8, 6]} />
          <meshStandardMaterial color="#c6cedb" roughness={0.5} />
        </mesh>
      ))}

      {/* arms */}
      <group ref={leftArmRef} position={[-0.19, 0.68, 0]}>
        <mesh position={[0, -0.15, 0]} castShadow>
          <capsuleGeometry args={[0.048, 0.17, 4, 10]} />
          <meshStandardMaterial color={PALETTE.coat} roughness={0.72} />
        </mesh>
        <mesh position={[0, -0.29, 0]} castShadow>
          <sphereGeometry args={[0.055, 12, 10]} />
          <meshStandardMaterial color={appearance.skin} roughness={0.6} />
        </mesh>
      </group>
      <group ref={rightArmRef} position={[0.19, 0.68, 0]}>
        <mesh position={[0, -0.15, 0]} castShadow>
          <capsuleGeometry args={[0.048, 0.17, 4, 10]} />
          <meshStandardMaterial color={PALETTE.coat} roughness={0.72} />
        </mesh>
        <mesh position={[0, -0.29, 0]} castShadow>
          <sphereGeometry args={[0.055, 12, 10]} />
          <meshStandardMaterial color={appearance.skin} roughness={0.6} />
        </mesh>
      </group>

      {/* carried crate */}
      <group ref={crateRef} position={[0, 0.5, 0.26]} visible={false}>
        <RoundedBox args={[0.26, 0.2, 0.2]} radius={0.04} smoothness={3} castShadow>
          <meshStandardMaterial color={PALETTE.wood} roughness={0.8} />
        </RoundedBox>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.08, 12]} />
          <meshPhysicalMaterial color={PALETTE.berry} roughness={0.2} clearcoat={0.8} />
        </mesh>
      </group>

      {/* coffee cup, only out during a break */}
      <group ref={cupRef} position={[0.14, 0.78, 0.16]} visible={false}>
        <mesh castShadow>
          <cylinderGeometry args={[0.045, 0.037, 0.1, 14]} />
          <meshStandardMaterial color="#fdfaf4" roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.036, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.016, 14]} />
          <meshStandardMaterial color="#6f4327" roughness={0.3} />
        </mesh>
      </group>

      {/* head */}
      <group ref={headRef} position={[0, 0.9, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.2, 24, 20]} />
          <meshStandardMaterial color={appearance.skin} roughness={0.62} />
        </mesh>
        {/* hair */}
        <mesh position={[0, 0.05, -0.01]} scale={[1.02, 0.86, 1.02]}>
          <sphereGeometry args={[0.2, 22, 18, 0, Math.PI * 2, 0, Math.PI / 1.9]} />
          <meshStandardMaterial color={appearance.hair} roughness={0.8} />
        </mesh>
        {/* cap band */}
        <mesh position={[0, 0.09, 0]} rotation={[0.12, 0, 0]}>
          <cylinderGeometry args={[0.185, 0.185, 0.07, 20]} />
          <meshStandardMaterial color={appearance.cap} roughness={0.55} />
        </mesh>
        {/* eyes */}
        {[-0.07, 0.07].map((x) => (
          <mesh key={x} position={[x, 0.01, 0.185]}>
            <sphereGeometry args={[0.024, 12, 10]} />
            <meshStandardMaterial color={PALETTE.ink} roughness={0.35} />
          </mesh>
        ))}
        {/* blush */}
        {[-0.12, 0.12].map((x) => (
          <mesh key={x} position={[x, -0.05, 0.16]}>
            <sphereGeometry args={[0.035, 12, 10]} />
            <meshBasicMaterial color="#f0a898" transparent opacity={0.45} />
          </mesh>
        ))}
        {/* smile */}
        <mesh position={[0, -0.055, 0.184]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.038, 0.008, 8, 16, Math.PI]} />
          <meshStandardMaterial color={PALETTE.ink} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}
