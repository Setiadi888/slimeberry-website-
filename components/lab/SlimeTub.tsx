'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Product as ProductData } from '@/lib/products';
import { useJiggle } from '@/lib/useJiggle';
import { onProductPulse } from '@/lib/labEvents';
import { registerAnchor, unregisterAnchor } from '@/lib/anchors';
import { hoverEntity, selectEntity, useIsHovered, useIsSelected } from '@/lib/interaction';
import {
  drawContained,
  drawFlowerFallback,
  drawWordmarkFallback,
  textureFrom,
  useBrandImage,
} from '@/lib/brand';

const LID_WHITE = '#fbfbf9';
const BASE_GREY = '#d9d9d6';
const INK_BLUE = '#3b4a9e';
const INK_PURPLE = '#4b3b9e';

/** Hex to rgba, so a product's own accent can be laid down as translucent check. */
function withAlpha(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

/**
 * Lid artwork, drawn to a canvas rather than shipped as an image: gingham in the
 * flavour's own colour, the stacked wordmark with its white outline, and the
 * "fruit series" band. The check and the band take the tint so a shelf of these
 * reads as one range in several flavours rather than one repeated product.
 */
function useLidTexture(tint: string, wordmark: HTMLImageElement | null): THREE.CanvasTexture {
  return useMemo(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const c = size / 2;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // gingham, clipped to an inner disc so a white rim frames it like the print
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, size * 0.455, 0, Math.PI * 2);
    ctx.clip();
    const band = size / 15;
    ctx.fillStyle = withAlpha(tint, 0.5);
    for (let i = 0; i < size / band; i += 2) {
      ctx.fillRect(i * band, 0, band, size);
      ctx.fillRect(0, i * band, size, band);
    }
    ctx.restore();

    // tight halo so the wordmark sits on the check rather than erasing it
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.beginPath();
    ctx.ellipse(c, c - 26, 168, 96, 0, 0, Math.PI * 2);
    ctx.fill();

    // the real wordmark if it has been supplied, the drawn one until then
    if (wordmark) drawContained(ctx, wordmark, c, c - 28, size * 0.72, size * 0.52);
    else drawWordmarkFallback(ctx, c, c - 24, 260);

    // "fruit series" band
    ctx.fillStyle = tint;
    ctx.beginPath();
    ctx.roundRect(c - 165, c + 88, 330, 60, 30);
    ctx.fill();
    ctx.font = 'italic 700 44px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('fruit series', c, c + 119);

    // small print
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.fillStyle = withAlpha(tint, 0.95);
    ctx.fillText('SLIME · NOT FOR CONSUMPTION', c, c + 176);
    ctx.fillText('NET 150 ml', c, c + 204);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, [tint, wordmark]);
}

/** The flower sticker on the tub wall: a white-edged bloom in the flavour tint. */
function useStickerTexture(tint: string, flower: HTMLImageElement | null): THREE.CanvasTexture {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const c = size / 2;

    ctx.clearRect(0, 0, size, size);

    if (flower) drawContained(ctx, flower, c, c, size * 0.96, size * 0.96);
    else drawFlowerFallback(ctx, c, c, c, tint);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, [tint, flower]);
}

interface SlimeTubProps {
  product: ProductData;
  position: [number, number, number];
  scale?: number;
  /** Turn the sticker toward the camera side of the shelf. */
  stickerRotation?: number;
}

/**
 * The retail tub: tapered body, chunky rounded lid, grey foot ring.
 *
 * Shares the exact interaction contract used by `Product` — anchor
 * registration, hover/select, the jiggle spring and the add-to-cart pulse — so
 * the camera, panel and cart treat it identically.
 */
export function SlimeTub({ product, position, scale = 1, stickerRotation = 0 }: SlimeTubProps) {
  const groupRef = useRef<THREE.Group>(null);
  const tubRef = useRef<THREE.Group>(null);
  const { impulse, update } = useJiggle(140, 8);
  /* The green flower for the greens, the blue one otherwise — the two marks
     supplied, matched to the flavour rather than tinted from it. */
  const wordmark = useBrandImage('wordmark');
  const flower = useBrandImage(product.accent === '#5f8c48' || product.accent === '#7aa844' ? 'flowerGreen' : 'flowerBlue');
  const lidTexture = useLidTexture(product.accent, wordmark);
  const stickerTexture = useStickerTexture(product.accent, flower);

  const hovered = useIsHovered('product', product.id);
  const selected = useIsSelected('product', product.id);
  const active = hovered || selected;

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    registerAnchor('product', product.id, group);
    return () => {
      unregisterAnchor('product', product.id);
      document.body.style.cursor = 'auto';
    };
  }, [product.id]);

  useEffect(
    () =>
      onProductPulse((id) => {
        if (id === product.id) impulse(3.4);
      }),
    [impulse, product.id],
  );

  useEffect(
    () => () => {
      lidTexture.dispose();
      stickerTexture.dispose();
    },
    [lidTexture, stickerTexture],
  );

  /** Lid profile, revolved: chunky ring with a rounded outer shoulder. */
  const lidProfile = useMemo(
    () =>
      [
        [0.0, 0.0],
        [0.425, 0.0],
        [0.44, 0.02],
        [0.445, 0.115],
        [0.432, 0.165],
        [0.4, 0.195],
        [0.345, 0.205],
        [0.0, 0.205],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
    [],
  );

  useFrame((state, delta) => {
    const tub = tubRef.current;
    if (!tub) return;
    const wobble = update(delta);
    tub.position.y = THREE.MathUtils.damp(tub.position.y, active ? 0.12 * scale : 0, 8, delta);
    const target = (selected ? 1.12 : hovered ? 1.06 : 1) * scale;
    const eased = THREE.MathUtils.damp(tub.scale.x, target, 9, delta);
    tub.scale.set(eased * (1 - wobble * 0.28), eased * (1 + wobble * 0.46), eased * (1 - wobble * 0.28));
  });

  return (
    <group ref={groupRef} position={position}>
      <group
        ref={tubRef}
        onPointerOver={(event) => {
          event.stopPropagation();
          hoverEntity({ kind: 'product', id: product.id });
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          hoverEntity(null);
          document.body.style.cursor = 'auto';
        }}
        onClick={(event) => {
          event.stopPropagation();
          impulse(1.5);
          selectEntity({ kind: 'product', id: product.id });
        }}
      >
        <mesh visible={false} position={[0, 0.34, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.9, 8]} />
        </mesh>

        {/* grey foot ring */}
        <mesh position={[0, 0.035, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.315, 0.325, 0.07, 40]} />
          <meshStandardMaterial color={BASE_GREY} roughness={0.72} />
        </mesh>

        {/* tapered body */}
        <mesh position={[0, 0.30, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.375, 0.305, 0.46, 44]} />
          <meshStandardMaterial color={product.color} roughness={0.38} metalness={0.02} />
        </mesh>

        {/* flower sticker, standing just off the wall */}
        <group rotation={[0, stickerRotation, 0]}>
          <mesh position={[0, 0.29, 0.362]} rotation={[0, 0, 0]}>
            <planeGeometry args={[0.28, 0.28]} />
            <meshStandardMaterial map={stickerTexture} transparent roughness={0.55} />
          </mesh>
        </group>

        {/* chunky lid collar */}
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <latheGeometry args={[lidProfile, 48]} />
          <meshStandardMaterial color={LID_WHITE} roughness={0.42} />
        </mesh>

        {/* printed lid face */}
        <mesh position={[0, 0.707, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.35, 48]} />
          <meshStandardMaterial map={lidTexture} roughness={0.5} />
        </mesh>
      </group>

      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={active} scale={scale}>
        <ringGeometry args={[0.44, 0.53, 36]} />
        <meshBasicMaterial color={product.accent} transparent opacity={selected ? 0.85 : 0.4} />
      </mesh>
    </group>
  );
}
