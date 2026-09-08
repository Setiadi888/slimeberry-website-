'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { useLabQuality } from './QualityContext';

/** Decorative props never take pointer hits (see the interaction hierarchy). */
const NO_HIT = () => null;

export function WorkTable({
  position,
  rotation = 0,
  withBeakers = true,
}: {
  position: [number, number, number];
  rotation?: number;
  withBeakers?: boolean;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RoundedBox args={[2.2, 0.16, 1.3]} radius={0.06} smoothness={3} position={[0, 0.92, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={PALETTE.shell} roughness={0.55} />
      </RoundedBox>
      <RoundedBox args={[2.05, 0.5, 1.15]} radius={0.06} smoothness={3} position={[0, 0.6, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={PALETTE.wood} roughness={0.8} />
      </RoundedBox>
      {[
        [-0.9, 0.5],
        [0.9, 0.5],
        [-0.9, -0.5],
        [0.9, -0.5],
      ].map(([x, z], index) => (
        <mesh key={index} position={[x, 0.18, z]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.36, 10]} />
          <meshStandardMaterial color={PALETTE.woodDark} roughness={0.8} />
        </mesh>
      ))}

      {withBeakers && (
        <group position={[0, 1.0, 0]}>
          <Beaker position={[-0.62, 0, 0.16]} color="#f2a8c4" />
          <Beaker position={[-0.24, 0, -0.2]} color="#a8d96a" scale={0.8} />
          <mesh position={[0.55, 0.09, 0.05]} castShadow>
            <boxGeometry args={[0.5, 0.18, 0.36]} />
            <meshStandardMaterial color={PALETTE.metal} roughness={0.35} metalness={0.5} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export function Beaker({
  position,
  color,
  scale = 1,
}: {
  position: [number, number, number];
  color: string;
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.11, 0.13, 0.32, 16, 1, true]} />
        <meshPhysicalMaterial
          color="#ffffff"
          roughness={0.08}
          metalness={0}
          transparent
          opacity={0.45}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.17, 16]} />
        <meshStandardMaterial color={color} roughness={0.25} />
      </mesh>
    </group>
  );
}

/**
 * Pipework linking the machine to the tanks. Small beads travel the curve to
 * suggest flow — four moving meshes rather than an animated texture.
 */
export function Pipes() {
  const { reducedMotion } = useLabQuality();
  const beadsRef = useRef<THREE.Group>(null);

  // A short arc now: the tanks stand next to the mixer rather than across the
  // room, so the pipe only has to hop the gap between them.
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.15, 2.2, -3.45),
        new THREE.Vector3(-2.6, 2.72, -3.55),
        new THREE.Vector3(-2.0, 2.84, -3.6),
        new THREE.Vector3(-1.4, 2.62, -3.55),
        new THREE.Vector3(-0.95, 2.22, -3.5),
      ]),
    [],
  );

  const tube = useMemo(() => new THREE.TubeGeometry(curve, 48, 0.11, 12, false), [curve]);

  useFrame(({ clock }) => {
    if (!beadsRef.current || reducedMotion) return;
    const t = clock.getElapsedTime() * 0.14;
    beadsRef.current.children.forEach((bead, index) => {
      const progress = (t + index / beadsRef.current!.children.length) % 1;
      curve.getPointAt(progress, bead.position as THREE.Vector3);
    });
  });

  return (
    <group>
      <mesh geometry={tube} castShadow receiveShadow>
        <meshStandardMaterial color={PALETTE.metal} roughness={0.35} metalness={0.45} />
      </mesh>
      {/* collars */}
      {[0.18, 0.5, 0.82].map((t) => {
        const point = curve.getPointAt(t);
        return (
          <mesh key={t} position={point} castShadow>
            <sphereGeometry args={[0.15, 14, 12]} />
            <meshStandardMaterial color={PALETTE.metalDark} roughness={0.4} metalness={0.5} />
          </mesh>
        );
      })}
      <group ref={beadsRef}>
        {[0, 1, 2, 3].map((index) => (
          <mesh key={index}>
            <sphereGeometry args={[0.07, 10, 8]} />
            <meshStandardMaterial color={PALETTE.berry} emissive={PALETTE.berry} emissiveIntensity={0.35} roughness={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function Stool({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.28, 0.28, 0.12, 18]} />
        <meshStandardMaterial color={PALETTE.berry} roughness={0.6} />
      </mesh>
      {[0, 1, 2].map((index) => {
        const angle = (index / 3) * Math.PI * 2;
        return (
          <mesh key={index} position={[Math.cos(angle) * 0.18, 0.23, Math.sin(angle) * 0.18]} castShadow>
            <cylinderGeometry args={[0.035, 0.035, 0.46, 8]} />
            <meshStandardMaterial color={PALETTE.woodDark} roughness={0.75} />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * The break corner: a thermos, two cups, a plate and a folded napkin on the
 * bench beside the conveyor. Deliberately a handful of primitives — the charm
 * comes from it simply being there, not from any mechanism.
 *
 * Decoration only; nothing here responds to the pointer.
 */
export function CoffeeSetup({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* thermos */}
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.1, 0.32, 18]} />
        <meshStandardMaterial color="#b9633f" roughness={0.42} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.34, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.085, 0.06, 18]} />
        <meshStandardMaterial color="#8a4a2e" roughness={0.5} />
      </mesh>
      <mesh position={[0.1, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.055, 0.016, 8, 18, Math.PI]} />
        <meshStandardMaterial color="#8a4a2e" roughness={0.5} />
      </mesh>

      {/* two cups */}
      {[
        [0.24, 0.07],
        [0.4, -0.09],
      ].map(([x, z], index) => (
        <group key={index} position={[x, 0, z]}>
          <mesh position={[0, 0.07, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.045, 0.14, 16]} />
            <meshStandardMaterial color="#fdfaf4" roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.115, 0]}>
            <cylinderGeometry args={[0.046, 0.046, 0.02, 16]} />
            <meshStandardMaterial color="#6f4327" roughness={0.3} />
          </mesh>
          <mesh position={[0.062, 0.075, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.028, 0.009, 8, 14, Math.PI]} />
            <meshStandardMaterial color="#fdfaf4" roughness={0.45} />
          </mesh>
        </group>
      ))}

      {/* plate + a folded napkin */}
      <mesh position={[-0.24, 0.02, -0.06]} castShadow>
        <cylinderGeometry args={[0.13, 0.13, 0.02, 22]} />
        <meshStandardMaterial color="#fdfaf4" roughness={0.5} />
      </mesh>
      <mesh position={[-0.24, 0.045, -0.06]} rotation={[0, 0.5, 0]}>
        <boxGeometry args={[0.14, 0.03, 0.1]} />
        <meshStandardMaterial color="#f0cdd6" roughness={0.85} />
      </mesh>
    </group>
  );
}

/**
 * Worker belongings. Each character keeps a couple of recognisable things at
 * their station — the cheapest possible way to say who works where.
 * Decorative: none of these respond to the pointer.
 */
export function JunoNotes({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* open notebook */}
      <mesh position={[0, 0.02, 0]} rotation={[0, 0.3, 0]} raycast={NO_HIT}>
        <boxGeometry args={[0.34, 0.03, 0.26]} />
        <meshStandardMaterial color="#fdfaf4" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.036, 0]} rotation={[0, 0.3, 0]} raycast={NO_HIT}>
        <boxGeometry args={[0.03, 0.005, 0.26]} />
        <meshStandardMaterial color={PALETTE.berry} roughness={0.6} />
      </mesh>
      {/* scribbled mixing notes */}
      {[-0.06, 0, 0.06].map((z) => (
        <mesh key={z} position={[0.06, 0.038, z]} rotation={[0, 0.3, 0]} raycast={NO_HIT}>
          <boxGeometry args={[0.14, 0.004, 0.012]} />
          <meshStandardMaterial color="#b9c0cc" roughness={0.8} />
        </mesh>
      ))}
      {/* pencil */}
      <mesh position={[0.24, 0.03, -0.05]} rotation={[0, 0, Math.PI / 2]} raycast={NO_HIT}>
        <cylinderGeometry args={[0.014, 0.014, 0.26, 8]} />
        <meshStandardMaterial color="#f0c86a" roughness={0.6} />
      </mesh>
      <mesh position={[0.37, 0.03, -0.05]} rotation={[0, 0, Math.PI / 2]} raycast={NO_HIT}>
        <coneGeometry args={[0.015, 0.05, 8]} />
        <meshStandardMaterial color="#8a6a4a" roughness={0.7} />
      </mesh>
    </group>
  );
}

export function CacaTools({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* clipboard */}
      <group rotation={[0, -0.35, 0]}>
        <mesh position={[0, 0.015, 0]} castShadow raycast={NO_HIT}>
          <boxGeometry args={[0.3, 0.02, 0.38]} />
          <meshStandardMaterial color={PALETTE.woodDark} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.03, -0.01]} raycast={NO_HIT}>
          <boxGeometry args={[0.26, 0.008, 0.32]} />
          <meshStandardMaterial color="#fdfaf4" roughness={0.75} />
        </mesh>
        <mesh position={[0, 0.042, 0.15]} raycast={NO_HIT}>
          <boxGeometry args={[0.12, 0.02, 0.05]} />
          <meshStandardMaterial color={PALETTE.metal} roughness={0.4} metalness={0.5} />
        </mesh>
        {/* ticked-off QC rows */}
        {[-0.08, -0.02, 0.04].map((z) => (
          <mesh key={z} position={[0, 0.036, z]} raycast={NO_HIT}>
            <boxGeometry args={[0.16, 0.004, 0.012]} />
            <meshStandardMaterial color="#9dc47f" roughness={0.8} />
          </mesh>
        ))}
      </group>

      {/* magnifying glass */}
      <group position={[0.36, 0, 0.06]} rotation={[0, 0.5, 0]}>
        <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={NO_HIT}>
          <torusGeometry args={[0.075, 0.014, 8, 16]} />
          <meshStandardMaterial color={PALETTE.metalDark} roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.028, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={NO_HIT}>
          <circleGeometry args={[0.072, 20]} />
          <meshPhysicalMaterial color="#eaf6fb" roughness={0.05} transparent opacity={0.4} />
        </mesh>
        <mesh position={[0.13, 0.03, 0]} rotation={[0, 0, Math.PI / 2]} raycast={NO_HIT}>
          <cylinderGeometry args={[0.016, 0.016, 0.13, 8]} />
          <meshStandardMaterial color="#8a5a3c" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

export function BimoSupplies({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* tape roll */}
      <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={NO_HIT}>
        <torusGeometry args={[0.075, 0.035, 8, 18]} />
        <meshStandardMaterial color="#e8c98a" roughness={0.55} />
      </mesh>
      {/* flat-packed boxes */}
      <mesh position={[-0.3, 0.03, 0.08]} rotation={[0, 0.2, 0]} castShadow raycast={NO_HIT}>
        <boxGeometry args={[0.34, 0.05, 0.26]} />
        <meshStandardMaterial color={PALETTE.wood} roughness={0.85} />
      </mesh>
      <mesh position={[-0.3, 0.075, 0.08]} rotation={[0, 0.13, 0]} raycast={NO_HIT}>
        <boxGeometry args={[0.34, 0.045, 0.26]} />
        <meshStandardMaterial color={PALETTE.woodDark} roughness={0.85} />
      </mesh>
      {/* sheet of shipping labels */}
      <mesh position={[0.26, 0.008, 0.02]} rotation={[0, -0.25, 0]} raycast={NO_HIT}>
        <boxGeometry args={[0.24, 0.012, 0.18]} />
        <meshStandardMaterial color="#fdfaf4" roughness={0.75} />
      </mesh>
      {[0.05, -0.02].map((z) => (
        <mesh key={z} position={[0.26, 0.016, z]} rotation={[0, -0.25, 0]} raycast={NO_HIT}>
          <boxGeometry args={[0.16, 0.004, 0.03]} />
          <meshStandardMaterial color="#c9d0da" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/** The board the lab log is written on. The text itself is a projected label. */
export function LabLogBoard({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh raycast={NO_HIT}>
        <boxGeometry args={[0.9, 1.1, 0.06]} />
        <meshStandardMaterial color={PALETTE.woodDark} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0, 0.04]} raycast={NO_HIT}>
        <boxGeometry args={[0.78, 0.96, 0.02]} />
        <meshStandardMaterial color="#fdfaf4" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.5, 0.06]} raycast={NO_HIT}>
        <boxGeometry args={[0.24, 0.08, 0.03]} />
        <meshStandardMaterial color={PALETTE.metal} roughness={0.4} metalness={0.5} />
      </mesh>
    </group>
  );
}

/**
 * A stray blob that got away, hiding behind the crates. Purely something to
 * notice — no interaction, no label, no reward beyond spotting it.
 */
export function HiddenSlimeBlob({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    // breathes very slightly, as if trying not to be seen
    const squash = 1 + Math.sin(t * 0.9) * 0.035;
    ref.current.scale.set(2 - squash, squash, 2 - squash);
  });

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <group ref={ref}>
        <mesh castShadow raycast={NO_HIT}>
          <sphereGeometry args={[0.17, 18, 14]} />
          <meshPhysicalMaterial color="#a8d96a" roughness={0.2} clearcoat={0.9} />
        </mesh>
        {[-0.06, 0.06].map((x) => (
          <mesh key={x} position={[x, 0.04, 0.15]} raycast={NO_HIT}>
            <sphereGeometry args={[0.022, 10, 8]} />
            <meshStandardMaterial color="#3f4a2a" roughness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
