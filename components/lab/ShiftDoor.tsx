'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { STATION_POS } from '@/lib/layout';
import { registerAnchor, unregisterAnchor } from '@/lib/anchors';
import { hoverEntity, selectEntity } from '@/lib/interaction';
import { callShiftChange, readShift } from '@/lib/shift';
import { doorSlide } from '@/lib/audio';
import { useLabQuality } from './QualityContext';
import { NO_HIT } from './StationGroup';

const WIDTH = 1.32;
const HEIGHT = 2.3;
const PANEL = WIDTH / 2;

/** Painted sign on the head of the frame. */
function useSignTexture(): THREE.CanvasTexture | null {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#2f3540';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 0, 512, 4);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f8f3ea';
    ctx.font = 'bold 44px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
    ctx.fillText('STAFF ONLY', 256, 48);
    ctx.fillStyle = '#f0c86a';
    ctx.font = '600 24px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.fillText('PRESS TO CHANGE SHIFT', 256, 92);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, []);
}

/**
 * The staff door, in the west wall between the greenhouse and the texture bench.
 *
 * Unlike the SB Mart doorway this one is not a way in for the visitor — it is a
 * way out for the people who work here, and it is shut for the whole of a shift.
 * It opens twice a day on the clock, and whenever somebody presses it: the panels
 * slide back, the three on the floor walk out through them, the other three walk
 * in, and it shuts behind them. The sequence is `callShiftChange`; this component
 * only draws what `readShift` reports, which is why the called handover and the
 * five o'clock one look exactly alike.
 *
 * Deliberately built as a back-of-house door rather than a shopfront: painted
 * steel with a wired vision panel, a push bar and a hazard stripe, so it reads as
 * the door the staff come through and not another entrance to somewhere nice.
 */
export function ShiftDoor() {
  const groupRef = useRef<THREE.Group>(null);
  const leftRef = useRef<THREE.Group>(null);
  const rightRef = useRef<THREE.Group>(null);
  const spillRef = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>>(null);
  const lampRef = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>(null);
  const { reducedMotion } = useLabQuality();
  const sign = useSignTexture();
  /** Whether the panels were moving last frame, so the slide is heard once. */
  const wasOpen = useRef(false);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    registerAnchor('station', 'staffdoor', group);
    return () => {
      unregisterAnchor('station', 'staffdoor');
      document.body.style.cursor = 'auto';
    };
  }, []);

  useEffect(() => () => sign?.dispose(), [sign]);

  useFrame((_, delta) => {
    const step = Math.min(delta, 1 / 30);
    const shift = readShift();
    const open = shift.door;

    if (leftRef.current && rightRef.current) {
      // a sliver stays in the jamb, so the opening never reads as a hole
      const target = -open * PANEL * 0.94;
      leftRef.current.position.x = reducedMotion
        ? target
        : THREE.MathUtils.damp(leftRef.current.position.x, target, 5, step);
      rightRef.current.position.x = -leftRef.current.position.x;
    }

    // the rumble, once on the way open and once on the way shut
    const moving = open > 0.02;
    if (moving !== wasOpen.current) {
      wasOpen.current = moving;
      doorSlide();
    }

    if (spillRef.current) {
      spillRef.current.material.opacity = open * 0.4;
    }
    if (lampRef.current) {
      // amber while it is open, dark the rest of the shift
      lampRef.current.material.emissiveIntensity = 0.05 + open * 1.5;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[STATION_POS.staffDoor[0], 0, STATION_POS.staffDoor[2]]}
      rotation={[0, Math.PI / 2, 0]}
      onPointerOver={(event) => {
        event.stopPropagation();
        hoverEntity({ kind: 'station', id: 'staffdoor' });
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        hoverEntity(null);
        document.body.style.cursor = 'auto';
      }}
      onClick={(event) => {
        event.stopPropagation();
        // the card says what just happened; the door gets on with it
        selectEntity({ kind: 'station', id: 'staffdoor' });
        callShiftChange();
      }}
    >
      {/* hit volume, so the card can be found without hunting for a panel edge */}
      <mesh visible={false} position={[0, HEIGHT / 2, 0.3]}>
        <boxGeometry args={[WIDTH + 0.5, HEIGHT + 0.4, 0.8]} />
      </mesh>

      {/* the corridor behind. Warm, and much darker than the room, so an open
          door reads as somewhere rather than as a hole in the wall. */}
      <mesh position={[0, HEIGHT / 2, 0.01]} raycast={NO_HIT}>
        <planeGeometry args={[WIDTH, HEIGHT]} />
        <meshStandardMaterial color="#2a2028" emissive="#8a5c3a" emissiveIntensity={0.28} roughness={1} />
      </mesh>
      {/* a strip light down the far wall of it */}
      <mesh position={[0.3, HEIGHT * 0.62, 0.02]} raycast={NO_HIT}>
        <planeGeometry args={[0.1, HEIGHT * 0.5]} />
        <meshBasicMaterial color="#ffd9a0" transparent opacity={0.55} />
      </mesh>

      {/* jambs */}
      {[-1, 1].map((side) => (
        <RoundedBox
          key={side}
          args={[0.14, HEIGHT + 0.2, 0.22]}
          radius={0.03}
          smoothness={3}
          position={[side * (WIDTH / 2 + 0.07), (HEIGHT + 0.2) / 2, 0.1]}
          castShadow
          receiveShadow
          raycast={NO_HIT}
        >
          <meshStandardMaterial color={PALETTE.metal} roughness={0.5} metalness={0.35} />
        </RoundedBox>
      ))}

      {/* head rail and track */}
      <RoundedBox
        args={[WIDTH + 0.44, 0.18, 0.24]}
        radius={0.04}
        smoothness={3}
        position={[0, HEIGHT + 0.1, 0.11]}
        castShadow
        receiveShadow
        raycast={NO_HIT}
      >
        <meshStandardMaterial color={PALETTE.metalDark} roughness={0.42} metalness={0.5} />
      </RoundedBox>
      <mesh position={[0, HEIGHT + 0.005, 0.16]} raycast={NO_HIT}>
        <boxGeometry args={[WIDTH + 0.36, 0.04, 0.07]} />
        <meshStandardMaterial color="#6f7885" roughness={0.45} metalness={0.55} />
      </mesh>

      {/* threshold */}
      <mesh position={[0, 0.035, 0.16]} castShadow receiveShadow raycast={NO_HIT}>
        <boxGeometry args={[WIDTH + 0.26, 0.07, 0.28]} />
        <meshStandardMaterial color={PALETTE.metalDark} roughness={0.55} metalness={0.25} />
      </mesh>

      {/* the light across the floor once the panels part */}
      <mesh ref={spillRef} position={[0, 0.075, 0.85]} rotation={[-Math.PI / 2, 0, 0]} raycast={NO_HIT}>
        <planeGeometry args={[WIDTH + 0.3, 1.4]} />
        <meshBasicMaterial color="#ffcf95" transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* the two painted steel leaves */}
      {[
        { ref: leftRef, sign: -1 },
        { ref: rightRef, sign: 1 },
      ].map(({ ref, sign: side }) => (
        <group key={side} ref={ref} position={[0, 0, 0.14]}>
          <mesh position={[side * (PANEL / 2), HEIGHT / 2, 0]} castShadow raycast={NO_HIT}>
            <boxGeometry args={[PANEL - 0.01, HEIGHT - 0.03, 0.05]} />
            <meshStandardMaterial color="#dfe4ea" roughness={0.52} metalness={0.18} />
          </mesh>
          {/* wired vision panel */}
          <mesh position={[side * (PANEL / 2), HEIGHT * 0.68, 0.028]} raycast={NO_HIT}>
            <planeGeometry args={[PANEL * 0.52, 0.34]} />
            <meshStandardMaterial color="#b9c8cf" roughness={0.35} metalness={0.1} />
          </mesh>
          {/* hazard stripe along the foot, the way a service door is marked */}
          <mesh position={[side * (PANEL / 2), 0.22, 0.028]} raycast={NO_HIT}>
            <planeGeometry args={[PANEL - 0.06, 0.12]} />
            <meshStandardMaterial color={PALETTE.butter} roughness={0.6} />
          </mesh>
          {/* leading stile and push bar */}
          <mesh position={[side * 0.028, HEIGHT / 2, 0.005]} castShadow raycast={NO_HIT}>
            <boxGeometry args={[0.045, HEIGHT - 0.03, 0.062]} />
            <meshStandardMaterial color={PALETTE.metal} roughness={0.36} metalness={0.55} />
          </mesh>
          <mesh
            position={[side * (PANEL / 2), HEIGHT * 0.42, 0.05]}
            rotation={[0, 0, Math.PI / 2]}
            raycast={NO_HIT}
          >
            <cylinderGeometry args={[0.021, 0.021, PANEL * 0.62, 10]} />
            <meshStandardMaterial color={PALETTE.metalDark} roughness={0.3} metalness={0.7} />
          </mesh>
        </group>
      ))}

      {/* the lamp over the frame: dark all shift, amber at the handover */}
      <mesh ref={lampRef} position={[WIDTH / 2 - 0.14, HEIGHT + 0.24, 0.2]} raycast={NO_HIT}>
        <sphereGeometry args={[0.045, 12, 10]} />
        <meshStandardMaterial color="#f0a24a" emissive="#ffb14e" emissiveIntensity={0.05} roughness={0.35} />
      </mesh>
      <mesh position={[WIDTH / 2 - 0.14, HEIGHT + 0.3, 0.2]} raycast={NO_HIT}>
        <cylinderGeometry args={[0.05, 0.06, 0.05, 12]} />
        <meshStandardMaterial color={PALETTE.metalDark} roughness={0.5} metalness={0.4} />
      </mesh>

      {sign && (
        <mesh position={[0, HEIGHT + 0.44, 0.14]} castShadow raycast={NO_HIT}>
          <boxGeometry args={[WIDTH + 0.2, 0.38, 0.05]} />
          <meshStandardMaterial map={sign} roughness={0.62} />
        </mesh>
      )}
    </group>
  );
}
