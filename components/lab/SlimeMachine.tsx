'use client';

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { emitLabEvent, onLabEvent } from '@/lib/labEvents';
import { registerAnchor, unregisterAnchor } from '@/lib/anchors';
import { hoverEntity, selectEntity, useIsHovered, useIsSelected } from '@/lib/interaction';
import { useProductionStage } from '@/lib/production';
import { useLabQuality } from './QualityContext';

/** Status the lamps report, driven by whatever stage the line is on. */
const STATUS_BY_STAGE: Record<string, { label: string; color: string }> = {
  grow: { label: 'Idle', color: '#8fb3d9' },
  mix: { label: 'Running', color: '#7bbf6a' },
  colour: { label: 'Tinting', color: '#b3a4e0' },
  qc: { label: 'Checking', color: '#e8b84b' },
  pack: { label: 'Running', color: '#7bbf6a' },
};

/**
 * The mixer. It idles slowly and spins up for a few seconds when a worker
 * presses the button (or the visitor does), so the lab has cause-and-effect
 * rather than one unbroken loop.
 */
export function SlimeMachine({
  id = 'mixer',
  position,
  rotation = 0,
}: {
  id?: string;
  position: [number, number, number];
  rotation?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const paddleRef = useRef<THREE.Group>(null);
  const buttonRef = useRef<THREE.Mesh>(null);
  const lampsRef = useRef<THREE.Group>(null);
  const speedRef = useRef(0.35);
  const activeUntilRef = useRef(0);
  const [pressed, setPressed] = useState(false);
  const { reducedMotion } = useLabQuality();
  const stage = useProductionStage();
  const status = STATUS_BY_STAGE[stage.id] ?? STATUS_BY_STAGE.mix;
  const hovered = useIsHovered('machine', id);
  const selected = useIsSelected('machine', id);
  const active = hovered || selected;

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    registerAnchor('machine', id, group);
    return () => {
      unregisterAnchor('machine', id);
      document.body.style.cursor = 'auto';
    };
  }, [id]);

  useEffect(() => onLabEvent('machine:start', () => {
    activeUntilRef.current = performance.now() + 6200;
  }), []);

  useFrame((state, delta) => {
    const now = performance.now();
    const busy = now < activeUntilRef.current;

    const targetSpeed = reducedMotion ? 0 : busy ? 3.1 : 0.35;
    speedRef.current = THREE.MathUtils.damp(speedRef.current, targetSpeed, 2.2, delta);

    if (paddleRef.current) {
      paddleRef.current.rotation.y += delta * speedRef.current;
      paddleRef.current.position.y = busy && !reducedMotion
        ? Math.sin(state.clock.getElapsedTime() * 6) * 0.02
        : 0;
    }

    if (buttonRef.current) {
      const depth = pressed ? 0.03 : 0;
      buttonRef.current.position.z = THREE.MathUtils.damp(buttonRef.current.position.z, 0.24 - depth, 14, delta);
    }

    if (lampsRef.current) {
      const t = state.clock.getElapsedTime();
      lampsRef.current.children.forEach((lamp, index) => {
        const mesh = lamp as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
        const blink = busy
          ? (Math.sin(t * 7 + index * 1.6) + 1) * 0.5
          : (Math.sin(t * 1.1 + index * 2.1) + 1) * 0.25;
        mesh.material.emissiveIntensity = 0.15 + blink * 1.5;
      });
    }
  });

  const press = () => {
    setPressed(true);
    emitLabEvent('machine:start');
    emitLabEvent('tank:splash');
    window.setTimeout(() => setPressed(false), 220);
  };

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, rotation, 0]}
      onPointerOver={(event) => {
        event.stopPropagation();
        hoverEntity({ kind: 'machine', id });
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        hoverEntity(null);
        document.body.style.cursor = 'auto';
      }}
      onClick={(event) => {
        event.stopPropagation();
        selectEntity({ kind: 'machine', id });
      }}
    >
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={active}>
        <ringGeometry args={[1.5, 1.64, 44]} />
        <meshBasicMaterial color={PALETTE.berry} transparent opacity={selected ? 0.85 : 0.4} />
      </mesh>

      {/* plinth */}
      <RoundedBox args={[2.5, 0.36, 1.7]} radius={0.09} smoothness={3} position={[0, 0.18, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={PALETTE.metalDark} roughness={0.5} metalness={0.35} />
      </RoundedBox>

      {/* body */}
      <RoundedBox args={[2.2, 1.5, 1.45]} radius={0.16} smoothness={4} position={[0, 1.1, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={PALETTE.machine} roughness={0.42} metalness={0.15} />
      </RoundedBox>

      {/* control face */}
      <RoundedBox args={[1.15, 0.72, 0.1] } radius={0.05} smoothness={3} position={[-0.42, 1.22, 0.74]} castShadow>
        <meshStandardMaterial color={PALETTE.shell} roughness={0.55} />
      </RoundedBox>
      <group ref={lampsRef} position={[-0.42, 1.45, 0.81]}>
        {[-0.28, 0, 0.28].map((x, index) => {
          // the middle lamp reports the live status; the outer two stay as
          // steady power/feed indicators
          const colour = index === 1 ? status.color : index === 0 ? PALETTE.berry : PALETTE.mint;
          return (
            <mesh key={x} position={[x, 0, 0]}>
              <sphereGeometry args={[0.058, 14, 12]} />
              <meshStandardMaterial
                color={colour}
                emissive={colour}
                emissiveIntensity={0.4}
                roughness={0.3}
              />
            </mesh>
          );
        })}
      </group>
      {/* dial */}
      <mesh position={[-0.42, 1.06, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.06, 20]} />
        <meshStandardMaterial color={PALETTE.metal} roughness={0.35} metalness={0.5} />
      </mesh>

      {/* the button */}
      <mesh
        ref={buttonRef}
        position={[0.55, 1.22, 0.24]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
        onClick={(event) => {
          event.stopPropagation();
          press();
        }}
      >
        <cylinderGeometry args={[0.2, 0.2, 0.5, 20]} />
        <meshStandardMaterial color={PALETTE.berry} roughness={0.35} emissive={PALETTE.berry} emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0.55, 1.22, 0.72]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.08, 20]} />
        <meshStandardMaterial color={PALETTE.shell} roughness={0.6} />
      </mesh>

      {/* mixing dome */}
      <mesh position={[0, 2.16, 0]}>
        <sphereGeometry args={[0.62, 26, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color="#eef8ff"
          roughness={0.05}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          clearcoat={1}
        />
      </mesh>
      <mesh position={[0, 1.87, 0]} castShadow>
        <cylinderGeometry args={[0.66, 0.66, 0.16, 26]} />
        <meshStandardMaterial color={PALETTE.metal} roughness={0.35} metalness={0.5} />
      </mesh>
      <group ref={paddleRef} position={[0, 2.02, 0]}>
        {[0, Math.PI / 2].map((angle) => (
          <mesh key={angle} rotation={[0, angle, 0]} castShadow>
            <boxGeometry args={[0.9, 0.22, 0.07]} />
            <meshStandardMaterial color={PALETTE.metalDark} roughness={0.4} metalness={0.4} />
          </mesh>
        ))}
        <mesh>
          <sphereGeometry args={[0.26, 18, 14]} />
          <meshPhysicalMaterial color={PALETTE.berry} roughness={0.16} clearcoat={1} />
        </mesh>
      </group>

      {/* hopper */}
      <mesh position={[0.95, 2.0, -0.3]} castShadow>
        <cylinderGeometry args={[0.34, 0.16, 0.6, 18]} />
        <meshStandardMaterial color={PALETTE.metal} roughness={0.4} metalness={0.45} />
      </mesh>
    </group>
  );
}
