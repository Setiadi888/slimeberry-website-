'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { goalForToday } from '@/lib/goals';
import { onLabEvent } from '@/lib/labEvents';
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

/** Bands down the bore, so the slime inside the glass reads as moving. */
function useFlowTexture(): THREE.CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 128, 0);
    gradient.addColorStop(0, '#e4738f');
    gradient.addColorStop(0.35, '#f3a6b8');
    gradient.addColorStop(0.5, '#ffd2dd');
    gradient.addColorStop(0.65, '#f3a6b8');
    gradient.addColorStop(1, '#e4738f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 16);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(5, 1);
    return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/**
 * Pipework linking the machine to the tanks.
 *
 * The run between the collars is a sight glass rather than steel, because the
 * point of the pipe is what is going through it: a core of slime fills the bore,
 * its banding scrolls along the curve, and four heavier blobs ride the same line
 * so the flow has something to read against.
 *
 * It runs at a trickle on its own and speeds up for as long as the mixer is
 * going, which is the same `machine:start` the button and the workers fire — so
 * pressing the button over there moves the slime up here.
 */
export function Pipes() {
  const { reducedMotion } = useLabQuality();
  const beadsRef = useRef<THREE.Group>(null);
  const flow = useFlowTexture();
  /** Runs down from 1 after the mixer is kicked, so the flow eases off. */
  const surge = useRef(0);
  const rate = useRef(0);

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
  /** The slime standing in the bore, a shade inside the glass. */
  const core = useMemo(() => new THREE.TubeGeometry(curve, 48, 0.082, 12, false), [curve]);
  useEffect(() => () => {
    tube.dispose();
    core.dispose();
  }, [tube, core]);

  useEffect(() => onLabEvent('machine:start', () => {
    surge.current = 1;
  }), []);

  useFrame((_, delta) => {
    const step = Math.min(delta, 1 / 30);
    // the mixer's kick lasts about six seconds; the flow follows it down
    surge.current = Math.max(0, surge.current - step / 6.2);
    const speed = reducedMotion ? 0 : 0.035 + surge.current * 0.28;
    rate.current += step * speed;
    flow.offset.x = -rate.current * 3;

    if (!beadsRef.current || reducedMotion) return;
    beadsRef.current.children.forEach((bead, index) => {
      const progress = (rate.current + index / beadsRef.current!.children.length) % 1;
      curve.getPointAt(progress, bead.position as THREE.Vector3);
    });
  });

  return (
    <group>
      <mesh geometry={core} raycast={NO_HIT}>
        <meshStandardMaterial map={flow} roughness={0.28} emissive="#e4738f" emissiveIntensity={0.12} />
      </mesh>
      <mesh geometry={tube} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#eaf6fb"
          roughness={0.08}
          metalness={0}
          transparent
          opacity={0.3}
          clearcoat={1}
          side={THREE.DoubleSide}
        />
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

/**
 * The chalkboard on the back wall.
 *
 * Chalk is the whole trick here: a clean vector stroke reads as a decal, so the
 * text is drawn three times at sub-pixel offsets in low alpha before the solid
 * pass, and a wash of speckle is laid over the slate. That is what makes a flat
 * canvas look like something somebody wrote with their hand.
 */
export function Chalkboard({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const painted = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#2f4038';
    ctx.fillRect(0, 0, 640, 400);

    // the ghost of everything wiped off it this week
    for (let i = 0; i < 90; i += 1) {
      ctx.fillStyle = `rgba(232,238,228,${0.012 + Math.random() * 0.022})`;
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * 640,
        Math.random() * 400,
        30 + Math.random() * 90,
        6 + Math.random() * 16,
        Math.random() * Math.PI,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    ctx.textAlign = 'center';

    /** One line, laid down as chalk: soft passes first, then the solid stroke. */
    const chalk = (text: string, y: number, font: string, colour: string) => {
      ctx.font = font;
      for (let i = 0; i < 3; i += 1) {
        ctx.fillStyle = colour.replace('ALPHA', '0.16');
        ctx.fillText(text, 320 + (Math.random() - 0.5) * 3.4, y + (Math.random() - 0.5) * 3.4);
      }
      ctx.fillStyle = colour.replace('ALPHA', '0.94');
      ctx.fillText(text, 320, y);
    };

    chalk("TODAY'S GOAL", 96, '600 40px ui-rounded, "SF Pro Rounded", system-ui, sans-serif', 'rgba(180,208,178,ALPHA)');

    // underline, drawn as a wobbly hand-pulled rule
    ctx.strokeStyle = 'rgba(180,208,178,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(196, 122);
    for (let x = 196; x <= 444; x += 22) ctx.lineTo(x, 122 + (Math.random() - 0.5) * 3.6);
    ctx.stroke();

    /*
      Today's goal, wrapped to fit rather than trusted to.

      The line changes daily and they are not all the same length, so the size is
      stepped down until the longest word fits and the whole thing lands in three
      lines or fewer. Written once when the board mounts: a page left open across
      midnight will still show yesterday's, which is exactly what a real board in
      an empty room would do.
    */
    const body = goalForToday();
    const hand = (size: number) =>
      `600 ${size}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;

    let size = 62;
    let lines: string[] = [];
    for (; size >= 30; size -= 3) {
      ctx.font = hand(size);
      lines = [];
      let line = '';
      for (const word of body.split(' ')) {
        const candidate = line ? `${line} ${word}` : word;
        if (ctx.measureText(candidate).width <= 512) {
          line = candidate;
        } else {
          if (line) lines.push(line);
          line = word;
        }
      }
      if (line) lines.push(line);
      if (lines.length <= 3 && lines.every((entry) => ctx.measureText(entry).width <= 512)) break;
    }

    const leading = size * 1.24;
    const top = 246 - ((lines.length - 1) * leading) / 2;
    lines.forEach((line, index) => {
      chalk(line, top + index * leading, hand(size), 'rgba(244,248,240,ALPHA)');
    });

    // a little blob doodle up in the corner, because somebody always does
    ctx.strokeStyle = 'rgba(232,180,200,0.8)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(576, 88, 30, 23, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(232,180,200,0.8)';
    [-11, 11].forEach((dx) => {
      ctx.beginPath();
      ctx.arc(576 + dx, 83, 3.6, 0, Math.PI * 2);
      ctx.fill();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, []);

  useEffect(() => () => painted?.dispose(), [painted]);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* frame */}
      <RoundedBox args={[2.0, 1.32, 0.08]} radius={0.04} smoothness={3} castShadow receiveShadow raycast={NO_HIT}>
        <meshStandardMaterial color={PALETTE.wood} roughness={0.82} />
      </RoundedBox>
      {/* slate */}
      <mesh position={[0, 0.03, 0.05]} raycast={NO_HIT}>
        <boxGeometry args={[1.82, 1.1, 0.02]} />
        {painted ? (
          <meshStandardMaterial map={painted} roughness={0.94} />
        ) : (
          <meshStandardMaterial color="#2f4038" roughness={0.94} />
        )}
      </mesh>
      {/* chalk tray, with the stub of chalk somebody left on it */}
      <mesh position={[0, -0.6, 0.09]} rotation={[0.18, 0, 0]} castShadow raycast={NO_HIT}>
        <boxGeometry args={[1.86, 0.05, 0.1]} />
        <meshStandardMaterial color={PALETTE.woodDark} roughness={0.85} />
      </mesh>
      <mesh position={[0.52, -0.575, 0.11]} rotation={[0, 0, Math.PI / 2]} castShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.018, 0.018, 0.11, 8]} />
        <meshStandardMaterial color="#f2f5ec" roughness={0.9} />
      </mesh>
      <mesh position={[-0.58, -0.565, 0.11]} castShadow raycast={NO_HIT}>
        <boxGeometry args={[0.16, 0.07, 0.07]} />
        <meshStandardMaterial color="#5e6a76" roughness={0.9} />
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
