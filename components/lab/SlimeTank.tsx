'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { useJiggle } from '@/lib/useJiggle';
import { onLabEvent } from '@/lib/labEvents';
import { registerAnchor, unregisterAnchor } from '@/lib/anchors';
import { hoverEntity, selectEntity, useIsHovered, useIsSelected } from '@/lib/interaction';
import { useLabQuality } from './QualityContext';

interface SlimeTankProps {
  id: string;
  position: [number, number, number];
  color: string;
  radius?: number;
  height?: number;
  /** Offsets the idle motion so multiple tanks do not move in lockstep. */
  phase?: number;
  listenToSplash?: boolean;
}

/**
 * A glass cylinder of slowly turning slime. Hovering makes the slime stir a
 * little harder; clicking sends a squash impulse through the spring and opens
 * the batch it is holding.
 */
export function SlimeTank({
  id,
  position,
  color,
  radius = 0.85,
  height = 1.6,
  phase = 0,
  listenToSplash = false,
}: SlimeTankProps) {
  const groupRef = useRef<THREE.Group>(null);
  const slimeRef = useRef<THREE.Mesh>(null);
  const bubblesRef = useRef<THREE.Group>(null);
  const { impulse, update } = useJiggle();
  const { reducedMotion, transmission } = useLabQuality();

  const hovered = useIsHovered('tank', id);
  const selected = useIsSelected('tank', id);
  const active = hovered || selected;

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    registerAnchor('tank', id, group);
    return () => {
      unregisterAnchor('tank', id);
      document.body.style.cursor = 'auto';
    };
  }, [id]);

  useEffect(() => {
    if (!listenToSplash) return;
    return onLabEvent('tank:splash', () => impulse(2.2));
  }, [impulse, listenToSplash]);

  const bubbles = useMemo(
    () =>
      Array.from({ length: 5 }, () => ({
        x: (Math.random() - 0.5) * radius * 0.9,
        z: (Math.random() - 0.5) * radius * 0.9,
        scale: 0.05 + Math.random() * 0.06,
        speed: 0.16 + Math.random() * 0.16,
        offset: Math.random(),
      })),
    [radius],
  );

  useFrame((state, delta) => {
    const wobble = update(delta);

    if (slimeRef.current) {
      slimeRef.current.scale.set(1 - wobble * 0.35, 1 + wobble * 0.55, 1 - wobble * 0.35);
      if (!reducedMotion) {
        // stirs a little harder while the visitor is looking at it
        slimeRef.current.rotation.y += delta * (active ? 0.5 : 0.18);
        const t = state.clock.getElapsedTime() + phase;
        slimeRef.current.position.y = Math.sin(t * (active ? 1.5 : 0.7)) * (active ? 0.03 : 0.015);
      }
    }

    if (bubblesRef.current && !reducedMotion) {
      const t = state.clock.getElapsedTime();
      bubblesRef.current.children.forEach((bubble, index) => {
        const config = bubbles[index];
        const progress = (t * config.speed * (active ? 1.8 : 1) + config.offset) % 1;
        bubble.position.y = -height * 0.34 + progress * height * 0.6;
        const fade = Math.sin(progress * Math.PI);
        bubble.scale.setScalar(config.scale * (0.4 + fade * 0.6));
      });
    }
  });

  const slimeHeight = height * 0.72;

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={(event) => {
        event.stopPropagation();
        hoverEntity({ kind: 'tank', id });
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        hoverEntity(null);
        document.body.style.cursor = 'auto';
      }}
      onClick={(event) => {
        event.stopPropagation();
        impulse(2.6);
        selectEntity({ kind: 'tank', id });
      }}
    >
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius + 0.16, radius + 0.24, 0.24, 28]} />
        <meshStandardMaterial color={PALETTE.metalDark} roughness={0.45} metalness={0.4} />
      </mesh>

      <mesh ref={slimeRef} position={[0, 0.24 + slimeHeight / 2, 0]} castShadow>
        <capsuleGeometry args={[radius * 0.86, slimeHeight * 0.55, 8, 24]} />
        <meshPhysicalMaterial
          color={color}
          roughness={0.14}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.12}
          sheen={0.6}
          sheenColor="#ffffff"
          transmission={transmission ? 0.28 : 0}
          thickness={transmission ? 1.1 : 0}
          ior={1.36}
          transparent={!transmission}
          opacity={transmission ? 1 : 0.92}
          emissive={color}
          emissiveIntensity={selected ? 0.24 : hovered ? 0.16 : 0.06}
        />
      </mesh>

      <group ref={bubblesRef} position={[0, 0.24 + slimeHeight / 2, 0]}>
        {bubbles.map((bubble, index) => (
          <mesh key={index} position={[bubble.x, 0, bubble.z]}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.5} roughness={0.1} />
          </mesh>
        ))}
      </group>

      <mesh position={[0, 0.24 + height / 2, 0]}>
        <cylinderGeometry args={[radius, radius, height, 30, 1, true]} />
        <meshPhysicalMaterial
          color="#eaf6fb"
          roughness={0.05}
          metalness={0}
          transparent
          opacity={active ? 0.3 : 0.24}
          side={THREE.DoubleSide}
          clearcoat={1}
        />
      </mesh>

      <mesh position={[0, 0.24 + height, 0]} castShadow>
        <cylinderGeometry args={[radius + 0.1, radius + 0.1, 0.16, 30]} />
        <meshStandardMaterial color={PALETTE.metal} roughness={0.35} metalness={0.55} />
      </mesh>
      <mesh position={[0, 0.24 + height + 0.16, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.34, radius * 0.34, 0.2, 16]} />
        <meshStandardMaterial color={PALETTE.metalDark} roughness={0.4} metalness={0.5} />
      </mesh>

      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={active}>
        <ringGeometry args={[radius + 0.3, radius + 0.42, 40]} />
        <meshBasicMaterial color={color} transparent opacity={selected ? 0.85 : 0.4} />
      </mesh>
    </group>
  );
}
