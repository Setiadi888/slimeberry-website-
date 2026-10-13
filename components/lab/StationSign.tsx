'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { useTracedLabelId } from '@/lib/journey';
import { STATION_SIGNS, type StationSign as SignSpec } from '@/lib/signage';
import { NO_HIT } from './StationGroup';

const CANVAS_W = 384;
const CANVAS_H = 112;
const ASPECT = CANVAS_H / CANVAS_W;
const THICKNESS = 0.042;

/** Shrinks the type until the name fits the plate. "QUALITY CONTROL" needs it. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): void {
  for (let size = 42; size >= 20; size -= 2) {
    ctx.font = `bold ${size}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) return;
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

/**
 * The plate's artwork: dark slate ground, an accent badge carrying the step
 * number, the station's name in the factory's cream, and a hairline rule.
 *
 * It doubles as the emissive map, which is what makes the highlight work — the
 * dark ground stays dark and only the printing glows when the product journey
 * traces this station.
 */
function useSignTexture(spec: SignSpec): THREE.CanvasTexture | null {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#2f3540';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // a lit bevel along the top edge, so the plate reads as a physical object
    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    ctx.fillRect(0, 0, CANVAS_W, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, CANVAS_H - 4, CANVAS_W, 4);

    ctx.textBaseline = 'middle';
    let textLeft = 26;

    if (spec.step) {
      ctx.fillStyle = spec.accent;
      roundedRect(ctx, 18, 22, 68, 68, 12);
      ctx.fillStyle = '#221f27';
      ctx.font = 'bold 40px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(spec.step, 52, 58);
      textLeft = 102;
    }

    ctx.textAlign = 'left';
    fitText(ctx, spec.text, CANVAS_W - textLeft - 22);
    ctx.fillStyle = '#f8f3ea';
    ctx.fillText(spec.text, textLeft, 51);

    // the rule under the name, in the station's own accent
    ctx.fillStyle = spec.accent;
    ctx.fillRect(textLeft, 82, Math.min(ctx.measureText(spec.text).width, CANVAS_W - textLeft - 22), 5);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, [spec.step, spec.text, spec.accent]);
}

function Sign({ spec }: { spec: SignSpec }) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const texture = useSignTexture(spec);
  const traced = useTracedLabelId() === spec.id;

  const width = spec.width ?? 0.78;
  const height = width * ASPECT;

  useEffect(() => () => texture?.dispose(), [texture]);

  useFrame(({ clock }, delta) => {
    const material = materialRef.current;
    if (!material) return;
    // the traced plate breathes rather than snapping on, which keeps a journey
    // playthrough reading as a light travelling down the line
    const target = traced ? 0.62 + Math.sin(clock.getElapsedTime() * 4.5) * 0.24 : 0;
    material.emissiveIntensity += (target - material.emissiveIntensity) * Math.min(1, delta * 7);
  });

  if (!texture) return null;

  return (
    <group position={spec.position} rotation={[0, spec.rotation ?? 0, 0]}>
      <mesh castShadow raycast={NO_HIT}>
        <boxGeometry args={[width, height, THICKNESS]} />
        <meshStandardMaterial
          ref={materialRef}
          map={texture}
          emissive={spec.accent}
          emissiveMap={texture}
          emissiveIntensity={0}
          roughness={0.58}
          metalness={0.1}
        />
      </mesh>

      {spec.stand ? (
        /* a folded foot, for the plates that stand on a surface */
        <mesh position={[0, -height / 2 - 0.012, 0.03]} castShadow raycast={NO_HIT}>
          <boxGeometry args={[width * 0.52, 0.024, 0.11]} />
          <meshStandardMaterial color={PALETTE.metal} roughness={0.42} metalness={0.5} />
        </mesh>
      ) : (
        /* standoff pins into the machine behind */
        [-1, 1].map((side) => (
          <mesh
            key={side}
            position={[side * width * 0.34, 0, -THICKNESS / 2 - 0.016]}
            rotation={[Math.PI / 2, 0, 0]}
            raycast={NO_HIT}
          >
            <cylinderGeometry args={[0.013, 0.013, 0.034, 8]} />
            <meshStandardMaterial color={PALETTE.metal} roughness={0.35} metalness={0.6} />
          </mesh>
        ))
      )}
    </group>
  );
}

/** Every plaque in the lab. Decorative — the machines themselves take the hits. */
export function StationSigns() {
  return (
    <>
      {STATION_SIGNS.map((spec) => (
        <Sign key={spec.id} spec={spec} />
      ))}
    </>
  );
}
