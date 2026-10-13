'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { WALL_FACE_Z } from '@/lib/layout';
import { NO_HIT } from './StationGroup';

const CANVAS_W = 1024;
const CANVAS_H = 430;

/** Which of the seven segments each digit lights. */
const DIGITS: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abged',
  '3': 'abgcd',
  '4': 'fgbc',
  '5': 'afgcd',
  '6': 'afgedc',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
};

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const pad = (n: number) => String(n).padStart(2, '0');

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const r = Math.min(w, h) * 0.42;
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
 * One seven-segment digit.
 *
 * Unlit segments are drawn faintly rather than skipped, which is what makes a
 * display read as a physical panel with tubes in it instead of as text — you can
 * see the shape of the eight behind every other number.
 */
function drawDigit(
  ctx: CanvasRenderingContext2D,
  glyph: string,
  x: number,
  y: number,
  w: number,
  h: number,
  colour: string,
) {
  const lit = DIGITS[glyph] ?? '';
  const t = w * 0.2;
  const half = h / 2;
  const bars: Record<string, [number, number, number, number]> = {
    a: [x + t * 0.6, y, w - t * 1.2, t],
    g: [x + t * 0.6, y + half - t / 2, w - t * 1.2, t],
    d: [x + t * 0.6, y + h - t, w - t * 1.2, t],
    f: [x, y + t * 0.6, t, half - t * 1.1],
    b: [x + w - t, y + t * 0.6, t, half - t * 1.1],
    e: [x, y + half + t * 0.5, t, half - t * 1.1],
    c: [x + w - t, y + half + t * 0.5, t, half - t * 1.1],
  };

  for (const [name, box] of Object.entries(bars)) {
    const on = lit.includes(name);
    ctx.save();
    if (on) {
      // two passes of bloom, then a hot core — the look of a lit tube
      ctx.shadowColor = colour;
      ctx.shadowBlur = w * 0.42;
      ctx.fillStyle = colour;
      roundRect(ctx, ...box);
      roundRect(ctx, ...box);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      roundRect(ctx, box[0] + box[2] * 0.14, box[1] + box[3] * 0.24, box[2] * 0.72, box[3] * 0.52);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      roundRect(ctx, ...box);
    }
    ctx.restore();
  }
}

/**
 * The clock on the back wall.
 *
 * Bright enough to be the one hard light source in a room made of pastels, and
 * big enough to read from the default camera without leaning in — 2.24m across,
 * which is wider than the chalkboard.
 *
 * Redrawn imperatively once a second from `useFrame` rather than from React
 * state on an interval: a ticking clock in state would re-render its subtree
 * sixty times a minute for a texture upload that costs almost nothing.
 */
export function NeonClock() {
  const stampRef = useRef('');
  const glowRef = useRef<THREE.MeshBasicMaterial>(null);

  const painted = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return { ctx, texture };
  }, []);

  useEffect(() => () => painted?.texture.dispose(), [painted]);

  useFrame(() => {
    if (!painted) return;
    const now = new Date();
    // repaint on the second, and blink the colon on the half
    const stamp = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}:${now.getDate()}`;
    if (stamp === stampRef.current) return;
    stampRef.current = stamp;

    const { ctx, texture } = painted;
    const time = '#ff4d88';
    const trim = '#5ce1ff';

    ctx.fillStyle = '#0c0a10';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    // the faint scan of a backlit panel
    const sheen = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    sheen.addColorStop(0, 'rgba(255,255,255,0.05)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const W = 116;
    const H = 214;
    const GAP = 22;
    let x = 168;
    drawDigit(ctx, hh[0], x, 54, W, H, time);
    x += W + GAP;
    drawDigit(ctx, hh[1], x, 54, W, H, time);
    x += W + GAP;

    // colon, on for the first half of every second
    const colonOn = now.getSeconds() % 2 === 0;
    ctx.save();
    ctx.fillStyle = colonOn ? time : 'rgba(255,255,255,0.05)';
    if (colonOn) {
      ctx.shadowColor = time;
      ctx.shadowBlur = 40;
    }
    for (const cy of [54 + H * 0.3, 54 + H * 0.68]) {
      ctx.beginPath();
      ctx.arc(x + 20, cy, 13, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    x += 40 + GAP;

    drawDigit(ctx, mm[0], x, 54, W, H, time);
    x += W + GAP;
    drawDigit(ctx, mm[1], x, 54, W, H, time);
    x += W + GAP + 18;

    // seconds, small, alongside
    const ss = pad(now.getSeconds());
    drawDigit(ctx, ss[0], x, 158, 44, 82, '#ff9ec4');
    drawDigit(ctx, ss[1], x + 54, 158, 44, 82, '#ff9ec4');

    // the date, underneath
    const label = `${DAYS[now.getDay()]}  ${pad(now.getDate())} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '600 46px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.shadowColor = trim;
    ctx.shadowBlur = 26;
    ctx.fillStyle = trim;
    ctx.fillText(label, CANVAS_W / 2, 356);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(label, CANVAS_W / 2, 356);
    ctx.restore();

    // a hairline rule between the two readouts
    ctx.fillStyle = 'rgba(92,225,255,0.22)';
    ctx.fillRect(200, 300, CANVAS_W - 400, 3);

    texture.needsUpdate = true;

    // the wall behind it breathes very slightly with the colon
    if (glowRef.current) glowRef.current.opacity = colonOn ? 0.2 : 0.16;
  });

  return (
    <group position={[-5.3, 3.45, WALL_FACE_Z + 0.05]}>
      {/* spill onto the plaster, so it reads as a light source not a poster */}
      <mesh position={[0, 0, -0.04]} raycast={NO_HIT}>
        <planeGeometry args={[3.1, 1.7]} />
        <meshBasicMaterial ref={glowRef} color="#ff6f9d" transparent opacity={0.18} depthWrite={false} />
      </mesh>

      {/* bezel */}
      <RoundedBox args={[2.24, 0.94, 0.1]} radius={0.05} smoothness={4} castShadow raycast={NO_HIT}>
        <meshStandardMaterial color="#22202a" roughness={0.5} metalness={0.35} />
      </RoundedBox>

      {/* the panel itself, emissive so it glows rather than being lit */}
      <mesh position={[0, 0, 0.055]} raycast={NO_HIT}>
        <planeGeometry args={[2.06, 0.8]} />
        {painted ? (
          <meshStandardMaterial
            map={painted.texture}
            emissiveMap={painted.texture}
            emissive="#ffffff"
            emissiveIntensity={1.5}
            toneMapped={false}
            roughness={0.9}
          />
        ) : (
          <meshStandardMaterial color="#0c0a10" roughness={0.9} />
        )}
      </mesh>
    </group>
  );
}
