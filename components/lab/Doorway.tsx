'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { registerAnchor, unregisterAnchor } from '@/lib/anchors';
import { hoverEntity, useIsHovered } from '@/lib/interaction';
import { useRoomPhase } from '@/lib/world';
import { doorSlide } from '@/lib/audio';
import { useLabQuality } from './QualityContext';
import { NO_HIT } from './StationGroup';

const WIDTH = 1.44;
const HEIGHT = 2.45;
const PANEL = WIDTH / 2;
/** How far each panel has crept back when the sensor notices you. */
const HOVER_OPEN = 0.22;

/**
 * Draws the fascia sign. Canvas rather than 3D text so the doorway needs no
 * font fetch, matching how every other sign in the world is made.
 */
function useSignTexture(label: string, sub: string, tint: string): THREE.CanvasTexture | null {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    /* 640x165 matches the fascia's own 3.88 aspect, so nothing is stretched. */
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 165;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#fbf6ee';
    ctx.fillRect(0, 0, 640, 165);
    ctx.fillStyle = tint;
    ctx.fillRect(0, 137, 640, 28);

    ctx.textAlign = 'center';

    /* Shrink to fit rather than trusting a fixed size: "SLIMEBERRY LAB" at the
       old 66px measured wider than the canvas, so both ends were being cut off.
       Measuring means any label length now fits inside the margins. */
    const face = (size: number) => `bold ${size}px ui-rounded, system-ui, sans-serif`;
    let size = 62;
    ctx.font = face(size);
    while (ctx.measureText(label).width > 566 && size > 24) {
      size -= 2;
      ctx.font = face(size);
    }
    ctx.fillStyle = tint;
    ctx.fillText(label, 320, 76);

    let subSize = 24;
    ctx.font = `600 ${subSize}px ui-rounded, system-ui, sans-serif`;
    while (ctx.measureText(sub).width > 580 && subSize > 12) {
      subSize -= 1;
      ctx.font = `600 ${subSize}px ui-rounded, system-ui, sans-serif`;
    }
    ctx.fillStyle = '#8b8f9c';
    ctx.fillText(sub, 320, 116);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, [label, sub, tint]);
}

/**
 * The sliding door between the two rooms.
 *
 * Both ends of the journey use this one component — the Lab's SB Mart door and
 * the Mart's way back — so the pair reads as two sides of the same opening.
 *
 * It sits closed. Two matte glass panels meet on the centre line, and because
 * the glass is frosted rather than clear you get only a soft suggestion of the
 * lit room behind it: enough to know somewhere is there, not enough to see it.
 * Coming close parts the panels a hand's width, the way a shop's sensor door
 * twitches when you approach, and actually going through slides them fully back
 * before the camera passes the threshold.
 */
export function Doorway({
  id,
  label,
  sub,
  tint,
  glow,
  position,
  rotation = 0,
  onEnter,
}: {
  /** Station id, so the hover card can describe it. */
  id: string;
  label: string;
  sub: string;
  tint: string;
  /** Colour of the light coming from the room beyond. */
  glow: string;
  position: readonly [number, number, number];
  rotation?: number;
  onEnter: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const leftRef = useRef<THREE.Group>(null);
  const rightRef = useRef<THREE.Group>(null);
  const spillRef = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>>(null);
  const lampRef = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>(null);
  const hovered = useIsHovered('station', id);
  const phase = useRoomPhase();
  const { reducedMotion } = useLabQuality();
  const sign = useSignTexture(label, sub, tint);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    registerAnchor('station', id, group);
    return () => {
      unregisterAnchor('station', id);
      document.body.style.cursor = 'auto';
    };
  }, [id]);

  useEffect(() => () => sign?.dispose(), [sign]);

  useFrame(({ clock }, delta) => {
    const step = Math.min(delta, 1 / 30);
    // fully back on the way through, ajar on approach, shut otherwise
    const target = phase === 'leaving' ? 1 : hovered ? HOVER_OPEN : 0;

    if (leftRef.current && rightRef.current) {
      // 0.94 rather than a full panel width so a sliver stays in the jamb,
      // which is what stops the opening reading as a hole with no doors
      const leftTarget = -target * PANEL * 0.94;
      leftRef.current.position.x = reducedMotion
        ? leftTarget
        : THREE.MathUtils.damp(leftRef.current.position.x, leftTarget, 7, step);
      rightRef.current.position.x = -leftRef.current.position.x;
    }

    if (spillRef.current) {
      // light only reaches the floor once the panels part
      const opened = Math.abs(leftRef.current?.position.x ?? 0) / PANEL;
      spillRef.current.material.opacity = 0.06 + opened * 0.42;
    }

    if (lampRef.current) {
      lampRef.current.material.emissiveIntensity = reducedMotion
        ? 0.55
        : 0.35 + (Math.sin(clock.getElapsedTime() * 2.2) + 1) * 0.2;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[position[0], position[1], position[2]]}
      rotation={[0, rotation, 0]}
      onPointerOver={(event) => {
        event.stopPropagation();
        hoverEntity({ kind: 'station', id });
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        hoverEntity(null);
        document.body.style.cursor = 'auto';
      }}
      onClick={(event) => {
        event.stopPropagation();
        hoverEntity(null);
        document.body.style.cursor = 'auto';
        doorSlide();
        onEnter();
      }}
    >
      {/* generous hit volume — this is the main thing to find on a phone */}
      <mesh visible={false} position={[0, HEIGHT / 2, 0.3]}>
        <boxGeometry args={[WIDTH + 0.6, HEIGHT + 0.5, 0.9]} />
      </mesh>

      {/* The room beyond. Dimmer than an open doorway would be — the frosted
          panels in front are what the visitor actually reads. */}
      <mesh position={[0, HEIGHT / 2, 0.012]} raycast={NO_HIT}>
        <planeGeometry args={[WIDTH, HEIGHT]} />
        <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.34} roughness={1} />
      </mesh>
      {/* vague shapes to catch behind the glass, so it is not a flat panel */}
      {[0.55, 1.15].map((y) => (
        <mesh key={y} position={[0.16, y, 0.02]} raycast={NO_HIT}>
          <planeGeometry args={[WIDTH * 0.62, 0.07]} />
          <meshBasicMaterial color="#c9b79c" transparent opacity={0.5} />
        </mesh>
      ))}

      {/* jambs */}
      {[-1, 1].map((side) => (
        <RoundedBox
          key={side}
          args={[0.16, HEIGHT + 0.22, 0.24]}
          radius={0.04}
          smoothness={3}
          position={[side * (WIDTH / 2 + 0.08), (HEIGHT + 0.22) / 2, 0.11]}
          castShadow
          receiveShadow
          raycast={NO_HIT}
        >
          <meshStandardMaterial color={PALETTE.shell} roughness={0.6} />
        </RoundedBox>
      ))}

      {/* head rail the panels hang from */}
      <RoundedBox
        args={[WIDTH + 0.5, 0.2, 0.26]}
        radius={0.05}
        smoothness={3}
        position={[0, HEIGHT + 0.12, 0.12]}
        castShadow
        receiveShadow
        raycast={NO_HIT}
      >
        <meshStandardMaterial color={PALETTE.metal} roughness={0.38} metalness={0.5} />
      </RoundedBox>
      {/* the track itself, a slot under the rail */}
      <mesh position={[0, HEIGHT + 0.01, 0.17]} raycast={NO_HIT}>
        <boxGeometry args={[WIDTH + 0.4, 0.04, 0.08]} />
        <meshStandardMaterial color={PALETTE.metalDark} roughness={0.45} metalness={0.55} />
      </mesh>

      {/* floor track + threshold */}
      <mesh position={[0, 0.035, 0.17]} castShadow receiveShadow raycast={NO_HIT}>
        <boxGeometry args={[WIDTH + 0.3, 0.07, 0.3]} />
        <meshStandardMaterial color={PALETTE.metalDark} roughness={0.55} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0.072, 0.17]} raycast={NO_HIT}>
        <boxGeometry args={[WIDTH + 0.24, 0.012, 0.05]} />
        <meshStandardMaterial color={PALETTE.metal} roughness={0.3} metalness={0.65} />
      </mesh>

      {/* light across the floor, only once the panels part */}
      <mesh
        ref={spillRef}
        position={[0, 0.075, 0.95]}
        rotation={[-Math.PI / 2, 0, 0]}
        raycast={NO_HIT}
      >
        <planeGeometry args={[WIDTH + 0.4, 1.6]} />
        <meshBasicMaterial color={glow} transparent opacity={0.06} depthWrite={false} />
      </mesh>

      {/*
        The two matte glass panels. Frosted is a rough, part-transparent
        surface rather than a refractive one — real transmission would force
        three.js to render the whole scene an extra time, which this project
        already measured and turned off everywhere.
      */}
      {[
        { ref: leftRef, sign: -1 },
        { ref: rightRef, sign: 1 },
      ].map(({ ref, sign: side }) => (
        <group key={side} ref={ref} position={[0, 0, 0.15]}>
          <mesh position={[side * (PANEL / 2), HEIGHT / 2, 0]} castShadow raycast={NO_HIT}>
            <boxGeometry args={[PANEL - 0.01, HEIGHT - 0.04, 0.045]} />
            <meshPhysicalMaterial
              color="#e4eef0"
              roughness={0.58}
              metalness={0}
              transparent
              opacity={0.74}
              clearcoat={0.3}
              clearcoatRoughness={0.6}
            />
          </mesh>
          {/* stile down the leading edge, and a top and bottom rail */}
          <mesh position={[side * 0.03, HEIGHT / 2, 0.005]} castShadow raycast={NO_HIT}>
            <boxGeometry args={[0.05, HEIGHT - 0.04, 0.06]} />
            <meshStandardMaterial color={PALETTE.metal} roughness={0.34} metalness={0.6} />
          </mesh>
          {[0.06, HEIGHT - 0.06].map((y) => (
            <mesh key={y} position={[side * (PANEL / 2), y, 0.005]} raycast={NO_HIT}>
              <boxGeometry args={[PANEL - 0.01, 0.07, 0.06]} />
              <meshStandardMaterial color={PALETTE.metal} roughness={0.34} metalness={0.6} />
            </mesh>
          ))}
          {/* pull handle */}
          <mesh position={[side * 0.16, HEIGHT * 0.46, 0.045]} raycast={NO_HIT}>
            <cylinderGeometry args={[0.022, 0.022, 0.5, 10]} />
            <meshStandardMaterial color={PALETTE.metalDark} roughness={0.3} metalness={0.7} />
          </mesh>
          {/* a band of etched frosting, the way shop doors are marked */}
          <mesh position={[side * (PANEL / 2), HEIGHT * 0.58, 0.03]} raycast={NO_HIT}>
            <planeGeometry args={[PANEL - 0.14, 0.1]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
          </mesh>
        </group>
      ))}

      {/* sensor lamp over the track */}
      <mesh ref={lampRef} position={[WIDTH / 2 - 0.1, HEIGHT + 0.06, 0.26]} raycast={NO_HIT}>
        <sphereGeometry args={[0.032, 10, 8]} />
        <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.4} roughness={0.3} />
      </mesh>

      {/* fascia sign */}
      {sign && (
        <mesh position={[0, HEIGHT + 0.52, 0.16]} castShadow raycast={NO_HIT}>
          <boxGeometry args={[WIDTH + 0.5, 0.5, 0.07]} />
          <meshStandardMaterial map={sign} roughness={0.65} />
        </mesh>
      )}
    </group>
  );
}
