'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { STATION_POS } from '@/lib/layout';
import { onLabEvent } from '@/lib/labEvents';
import { getReward, PHASE_MS, readGacha } from '@/lib/sbcoin';
import { drawContained, drawWordmarkFallback, useBrandImage } from '@/lib/brand';
import { useLabQuality } from './QualityContext';
import { NO_HIT, StationGroup } from './StationGroup';

const CAPSULE_COUNT = 18;
const GLOBE_R = 0.62;
const GLOBE_Y = 1.96;
/**
 * Where a dispensed capsule comes to rest. It has to sit in the open mouth of
 * the tray, in front of the cabinet face — parked any deeper and the tray's own
 * geometry hides the prize the whole sequence exists to show.
 */
const TRAY = new THREE.Vector3(0, 0.44, 0.58);
/** Height the capsule falls from, just under the mechanism housing. */
const DROP_FROM_Y = 0.95;
/** Where it leaves the mechanism — clear of the cabinet face, so it is seen. */
const DROP_FROM_Z = 0.5;

const CAPSULE_TINTS = [
  '#f4879f',
  '#f7d774',
  '#9dc47f',
  '#8ed0e8',
  '#b3a4e0',
  '#f2a8c4',
  '#f6b58c',
  '#9fe0d0',
];

/** Deterministic scatter, so the capsule bed is identical on every load. */
function capsuleSeed(index: number) {
  const a = Math.sin(index * 12.9898) * 43758.5453;
  const b = Math.sin(index * 78.233) * 12345.6789;
  const c = Math.sin(index * 39.425) * 24634.6345;
  const frac = (n: number) => n - Math.floor(n);
  return { x: frac(a) * 2 - 1, y: frac(b), z: frac(c) * 2 - 1 };
}

function useToppperTexture(wordmark: HTMLImageElement | null): THREE.CanvasTexture | null {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const sky = ctx.createLinearGradient(0, 0, 0, 192);
    sky.addColorStop(0, '#fdf3f6');
    sky.addColorStop(1, '#f7dbe4');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 512, 192);

    ctx.strokeStyle = '#e4738f';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 502, 182);

    ctx.textAlign = 'center';
    // the house mark, not a typeset approximation of it
    if (wordmark) drawContained(ctx, wordmark, 256, 74, 300, 108);
    else drawWordmarkFallback(ctx, 256, 74, 128);

    ctx.fillStyle = '#3f4756';
    ctx.font = 'bold 40px ui-rounded, system-ui, sans-serif';
    ctx.fillText('GACHAPON', 256, 143);

    ctx.fillStyle = '#8b8f9c';
    ctx.font = '600 24px ui-rounded, system-ui, sans-serif';
    ctx.fillText('1 SB COIN · 1 CAPSULE', 256, 168);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, [wordmark]);
}

/**
 * The Slimeberry Gachapon, standing where the Colour Lab bench used to.
 *
 * It is animated straight from the SB COIN store rather than from React state:
 * the sequence is read imperatively inside `useFrame`, so a whole play-through
 * costs zero re-renders of the scene. Everything is procedural primitives, in
 * keeping with the rest of the factory — no assets to fetch.
 */
export function Gachapon() {
  const handleRef = useRef<THREE.Group>(null);
  const globeRef = useRef<THREE.Group>(null);
  const capsulesRef = useRef<THREE.Group>(null);
  const prizeRef = useRef<THREE.Group>(null);
  const prizeTopRef = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>(null);
  const prizeBottomRef = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>(null);
  const coinRef = useRef<THREE.Mesh>(null);
  const lampsRef = useRef<THREE.Group>(null);
  const { reducedMotion } = useLabQuality();
  const wordmark = useBrandImage('wordmark');
  const topper = useToppperTexture(wordmark);

  /** Set by a passing worker servicing the machine; decays on its own. */
  const serviceUntil = useRef(0);

  const capsules = useMemo(
    () =>
      Array.from({ length: CAPSULE_COUNT }, (_, index) => {
        const seed = capsuleSeed(index + 1);
        const radius = GLOBE_R - 0.16;
        // pack them toward the bottom of the globe, as loose capsules settle
        const y = -radius * 0.55 + seed.y * radius * 0.9;
        const ring = Math.sqrt(Math.max(0, radius * radius - y * y)) * 0.82;
        const angle = seed.x * Math.PI;
        return {
          base: new THREE.Vector3(Math.cos(angle) * ring * Math.abs(seed.z || 0.4), y, Math.sin(angle) * ring),
          tint: CAPSULE_TINTS[index % CAPSULE_TINTS.length],
          phase: index * 0.7,
        };
      }),
    [],
  );

  useEffect(() => () => topper?.dispose(), [topper]);

  useEffect(
    () =>
      onLabEvent('gachapon:service', () => {
        serviceUntil.current = performance.now() + 2200;
      }),
    [],
  );

  useFrame(({ clock }) => {
    const now = performance.now();
    const { phase, phaseAt, drawn } = readGacha();
    const t = clock.getElapsedTime();
    const servicing = now < serviceUntil.current;

    // ---- indicator lights ------------------------------------------------
    lampsRef.current?.children.forEach((lamp, index) => {
      const material = (lamp as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>)
        .material;
      if (!material) return;
      const busy = phase !== 'idle' || servicing;
      material.emissiveIntensity = reducedMotion
        ? 0.5
        : busy
          ? 0.35 + (Math.sin(t * 12 + index * 1.6) + 1) * 0.7
          : 0.2 + (Math.sin(t * 1.4 + index * 2.1) + 1) * 0.25;
    });

    // ---- capsule bed -----------------------------------------------------
    // A shuffle while cranking, otherwise the gentlest settle so the globe is
    // never completely static.
    const agitation = phase === 'crank' ? 1 : servicing ? 0.5 : 0.06;
    capsulesRef.current?.children.forEach((capsule, index) => {
      const { base, phase: offset } = capsules[index];
      if (reducedMotion) {
        capsule.position.copy(base);
        return;
      }
      capsule.position.set(
        base.x + Math.sin(t * 3.1 + offset) * 0.02 * agitation * 3,
        base.y + Math.abs(Math.sin(t * 4.3 + offset)) * 0.03 * agitation * 3,
        base.z + Math.cos(t * 2.7 + offset) * 0.02 * agitation * 3,
      );
      capsule.rotation.x = t * 0.4 * agitation + offset;
    });

    // ---- handle ----------------------------------------------------------
    if (handleRef.current) {
      if (phase === 'crank') {
        const progress = Math.min(1, (now - phaseAt) / PHASE_MS.crank);
        // ease-out so it slows as the mechanism reaches its stop
        handleRef.current.rotation.z = -(1 - (1 - progress) ** 2) * Math.PI * 3;
      } else if (servicing) {
        handleRef.current.rotation.z = Math.sin((now - serviceUntil.current) * 0.006) * 1.4;
      } else if (phase === 'idle') {
        handleRef.current.rotation.z = 0;
      }
    }

    // ---- globe shudder ---------------------------------------------------
    if (globeRef.current) {
      const shudder = phase === 'crank' && !reducedMotion ? 0.012 : 0;
      globeRef.current.position.x = Math.sin(t * 34) * shudder;
      globeRef.current.position.y = GLOBE_Y + Math.sin(t * 27) * shudder;
    }

    // ---- the coin going in ----------------------------------------------
    if (coinRef.current) {
      if (phase === 'insert') {
        const progress = Math.min(1, (now - phaseAt) / PHASE_MS.insert);
        coinRef.current.visible = progress < 0.92;
        coinRef.current.position.set(-0.34, 1.5 - progress * 0.22, 0.5 - progress * 0.09);
        coinRef.current.rotation.y = progress * Math.PI * 2;
      } else if (coinRef.current.visible) {
        coinRef.current.visible = false;
      }
    }

    // ---- the prize capsule ----------------------------------------------
    const prize = prizeRef.current;
    if (prize) {
      const reward = drawn ? getReward(drawn) : null;
      const tint = reward?.colour ?? '#f4879f';
      prizeTopRef.current?.material.color.set(tint);

      if (phase === 'dispense' || phase === 'reveal') {
        prize.visible = true;
        if (phase === 'dispense') {
          const progress = Math.min(1, (now - phaseAt) / PHASE_MS.dispense);
          // falls clear of the mechanism into the open tray, with one small
          // settle at the end so it reads as landing rather than stopping dead
          const drop = Math.min(1, progress / 0.72);
          const settle = Math.max(0, (progress - 0.72) / 0.28);
          prize.position.set(
            0,
            THREE.MathUtils.lerp(DROP_FROM_Y, TRAY.y, drop * drop) +
              Math.sin(settle * Math.PI) * 0.07,
            THREE.MathUtils.lerp(DROP_FROM_Z, TRAY.z, drop),
          );
          prize.rotation.x = -progress * 7;
          if (prizeTopRef.current) prizeTopRef.current.position.y = 0;
          if (prizeBottomRef.current) prizeBottomRef.current.position.y = 0;
        } else {
          const open = Math.min(1, (now - phaseAt) / 520);
          prize.position.copy(TRAY);
          prize.rotation.x = 0;
          prize.rotation.y = t * 0.8;
          // the halves lift apart to show it has been opened
          if (prizeTopRef.current) prizeTopRef.current.position.y = open * 0.1;
          if (prizeBottomRef.current) prizeBottomRef.current.position.y = -open * 0.03;
        }
      } else if (prize.visible) {
        prize.visible = false;
      }
    }
  });

  return (
    <StationGroup
      id="gachapon"
      position={STATION_POS.gachapon}
      rotation={Math.PI / 2}
      ringRadius={1.05}
      ringColor="#e4738f"
    >
      {/* plinth + cabinet */}
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow raycast={NO_HIT}>
        <boxGeometry args={[1.5, 0.1, 1.0]} />
        <meshStandardMaterial color={PALETTE.metalDark} roughness={0.5} metalness={0.3} />
      </mesh>
      <RoundedBox
        args={[1.42, 0.86, 0.92]}
        radius={0.09}
        smoothness={4}
        position={[0, 0.53, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={PALETTE.berry} roughness={0.42} metalness={0.06} />
      </RoundedBox>
      {/* cream inset panel, so the cabinet is not one flat slab of pink */}
      <mesh position={[0, 0.62, 0.465]} raycast={NO_HIT}>
        <boxGeometry args={[1.16, 0.5, 0.02]} />
        <meshStandardMaterial color={PALETTE.shell} roughness={0.55} />
      </mesh>

      {/*
        Collection tray. The cabinet is a solid box, so the tray cannot be a
        recess cut into it — anything behind the front face at z = 0.46 is
        simply invisible. It is built instead as a cup standing proud of that
        face: a dark panel for the mouth, then a floor, cheeks and a low front
        lip in front of it, with the capsule resting where nothing overhangs it.
      */}
      <mesh position={[0, 0.48, 0.466]} raycast={NO_HIT}>
        <boxGeometry args={[0.72, 0.36, 0.02]} />
        <meshStandardMaterial color="#2a2f38" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.3, 0.58]} castShadow receiveShadow raycast={NO_HIT}>
        <boxGeometry args={[0.84, 0.05, 0.26]} />
        <meshStandardMaterial color={PALETTE.metal} roughness={0.42} metalness={0.4} />
      </mesh>
      {[-0.4, 0.4].map((x) => (
        <mesh key={x} position={[x, 0.42, 0.58]} castShadow raycast={NO_HIT}>
          <boxGeometry args={[0.05, 0.3, 0.26]} />
          <meshStandardMaterial color={PALETTE.shell} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 0.4, 0.7]} castShadow raycast={NO_HIT}>
        <boxGeometry args={[0.86, 0.24, 0.05]} />
        <meshStandardMaterial color={PALETTE.metal} roughness={0.42} metalness={0.4} />
      </mesh>

      {/* mechanism housing */}
      <RoundedBox
        args={[1.3, 0.5, 0.88]}
        radius={0.08}
        smoothness={4}
        position={[0, 1.2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={PALETTE.shell} roughness={0.48} />
      </RoundedBox>

      {/* SB COIN slot */}
      <mesh position={[-0.34, 1.28, 0.45]} castShadow raycast={NO_HIT}>
        <boxGeometry args={[0.16, 0.2, 0.05]} />
        <meshStandardMaterial color={PALETTE.metal} roughness={0.35} metalness={0.55} />
      </mesh>
      <mesh position={[-0.34, 1.3, 0.48]} raycast={NO_HIT}>
        <boxGeometry args={[0.035, 0.11, 0.02]} />
        <meshStandardMaterial color="#20242b" roughness={1} />
      </mesh>

      {/* the coin, only visible while it is being fed in */}
      <mesh ref={coinRef} visible={false} rotation={[Math.PI / 2, 0, 0]} raycast={NO_HIT}>
        <cylinderGeometry args={[0.055, 0.055, 0.014, 18]} />
        <meshStandardMaterial color="#f0c86a" roughness={0.28} metalness={0.62} />
      </mesh>

      {/* turning handle */}
      <group position={[0.32, 1.22, 0.46]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow raycast={NO_HIT}>
          <cylinderGeometry args={[0.13, 0.13, 0.07, 20]} />
          <meshStandardMaterial color={PALETTE.metal} roughness={0.38} metalness={0.5} />
        </mesh>
        <group ref={handleRef} position={[0, 0, 0.05]}>
          <mesh castShadow raycast={NO_HIT}>
            <boxGeometry args={[0.2, 0.05, 0.04]} />
            <meshStandardMaterial color={PALETTE.berry} roughness={0.4} />
          </mesh>
          <mesh position={[0.11, 0, 0.05]} castShadow raycast={NO_HIT}>
            <cylinderGeometry args={[0.035, 0.035, 0.1, 14]} />
            <meshStandardMaterial color={PALETTE.butter} roughness={0.35} />
          </mesh>
        </group>
      </group>

      {/* indicator lights */}
      <group ref={lampsRef}>
        {[-0.16, 0.0, 0.16].map((x) => (
          <mesh key={x} position={[x, 1.4, 0.44]} raycast={NO_HIT}>
            <sphereGeometry args={[0.032, 10, 8]} />
            <meshStandardMaterial
              color="#f7d774"
              emissive="#f0a93a"
              emissiveIntensity={0.4}
              roughness={0.3}
            />
          </mesh>
        ))}
      </group>

      {/* globe collar */}
      <mesh position={[0, 1.46, 0]} castShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.5, 0.56, 0.14, 28]} />
        <meshStandardMaterial color={PALETTE.metal} roughness={0.4} metalness={0.45} />
      </mesh>

      {/* capsule chamber */}
      <group ref={globeRef} position={[0, GLOBE_Y, 0]}>
        <group ref={capsulesRef}>
          {capsules.map(({ tint }, index) => (
            <mesh key={index} castShadow raycast={NO_HIT}>
              <sphereGeometry args={[0.105, 12, 10]} />
              <meshStandardMaterial color={tint} roughness={0.32} metalness={0.05} />
            </mesh>
          ))}
        </group>
        <mesh raycast={NO_HIT}>
          <sphereGeometry args={[GLOBE_R, 28, 20]} />
          <meshPhysicalMaterial
            color="#eaf7fb"
            roughness={0.05}
            metalness={0}
            transparent
            opacity={0.24}
            clearcoat={1}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* dome cap + finial */}
      <mesh position={[0, GLOBE_Y + 0.58, 0]} castShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.2, 0.28, 0.14, 20]} />
        <meshStandardMaterial color={PALETTE.berry} roughness={0.42} />
      </mesh>
      <mesh position={[0, GLOBE_Y + 0.71, 0]} castShadow raycast={NO_HIT}>
        <sphereGeometry args={[0.09, 14, 12]} />
        <meshStandardMaterial color={PALETTE.butter} roughness={0.35} metalness={0.15} />
      </mesh>

      {/* the capsule being dispensed */}
      <group ref={prizeRef} visible={false}>
        <mesh ref={prizeTopRef} position={[0, 0, 0]} castShadow raycast={NO_HIT}>
          <sphereGeometry args={[0.115, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#f4879f" roughness={0.3} metalness={0.05} />
        </mesh>
        <mesh ref={prizeBottomRef} position={[0, 0, 0]} castShadow raycast={NO_HIT}>
          <sphereGeometry args={[0.115, 14, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          <meshPhysicalMaterial
            color="#f8f3ea"
            roughness={0.12}
            transparent
            opacity={0.72}
            clearcoat={1}
          />
        </mesh>
      </group>

      {/* topper sign */}
      {topper && (
        <mesh position={[0, GLOBE_Y + 1.02, 0.03]} castShadow raycast={NO_HIT}>
          <boxGeometry args={[1.24, 0.46, 0.06]} />
          <meshStandardMaterial map={topper} roughness={0.62} />
        </mesh>
      )}
      {[-0.56, 0.56].map((x) => (
        <mesh key={x} position={[x, GLOBE_Y + 0.72, 0.03]} castShadow raycast={NO_HIT}>
          <cylinderGeometry args={[0.03, 0.03, 0.34, 10]} />
          <meshStandardMaterial color={PALETTE.metal} roughness={0.4} metalness={0.45} />
        </mesh>
      ))}
    </StationGroup>
  );
}
