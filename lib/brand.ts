'use client';

import { useEffect, useState } from 'react';
import * as THREE from 'three';

/**
 * The Slimeberry marks.
 *
 * Everything else in this world is drawn procedurally because there is nothing
 * to fetch — but a logo is not something to approximate. These load the real
 * artwork from `public/brand/` and fall back to a drawn stand-in when a file is
 * absent, so the scene never breaks over a missing asset and picks up the real
 * mark the moment one is dropped in.
 *
 * Drop these three files in to activate them:
 *
 *   public/brand/slimeberry-wordmark.png   the stacked logo with the leaf crown
 *   public/brand/sb-flower-green.png       the green SB flower
 *   public/brand/sb-flower-blue.png        the blue SB flower
 *
 * All three want a transparent background. The wordmark is drawn at roughly 6:5
 * and the flowers square.
 */
export type BrandMark = 'wordmark' | 'flowerGreen' | 'flowerBlue';

const FILES: Record<BrandMark, string> = {
  wordmark: '/brand/slimeberry-wordmark.png',
  flowerGreen: '/brand/sb-flower-green.png',
  flowerBlue: '/brand/sb-flower-blue.png',
};

/** Brand colours, used by the fallbacks and by anything drawing alongside. */
export const BRAND = {
  blue: '#3b4a9e',
  green: '#8cb63c',
  white: '#ffffff',
} as const;

/** null means "asked for, not available" — which is a settled answer, not a wait. */
const cache = new Map<BrandMark, HTMLImageElement | null>();
const pending = new Map<BrandMark, Promise<HTMLImageElement | null>>();

function load(mark: BrandMark): Promise<HTMLImageElement | null> {
  const existing = pending.get(mark);
  if (existing) return existing;

  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      cache.set(mark, image);
      resolve(image);
    };
    image.onerror = () => {
      // not supplied yet — callers draw their own fallback
      cache.set(mark, null);
      resolve(null);
    };
    image.src = FILES[mark];
  });

  pending.set(mark, promise);
  return promise;
}

/**
 * The artwork once loaded, or null while loading and for good if absent.
 *
 * Callers key their canvas `useMemo` on the returned value, so a texture is
 * drawn once with the fallback and redrawn once with the real mark when it
 * arrives. Nothing flashes if the artwork never turns up.
 */
export function useBrandImage(mark: BrandMark): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(() => cache.get(mark) ?? null);

  useEffect(() => {
    if (cache.has(mark)) {
      setImage(cache.get(mark) ?? null);
      return;
    }
    let live = true;
    void load(mark).then((result) => {
      if (live) setImage(result);
    });
    return () => {
      live = false;
    };
  }, [mark]);

  return image;
}

/** True once the mark has been asked for and answered either way. */
export const brandResolved = (mark: BrandMark) => cache.has(mark);

/**
 * Draws an image centred inside a box, preserving its aspect. Used everywhere
 * the real mark is composited onto a canvas texture.
 */
export function drawContained(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  centreX: number,
  centreY: number,
  maxWidth: number,
  maxHeight: number,
): void {
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  ctx.drawImage(image, centreX - width / 2, centreY - height / 2, width, height);
}

/**
 * The stacked wordmark, drawn — the stand-in used until the PNG is supplied,
 * and the same shapes the packaging has always used.
 */
export function drawWordmarkFallback(
  ctx: CanvasRenderingContext2D,
  centreX: number,
  centreY: number,
  size: number,
): void {
  // the leaf crown
  ctx.fillStyle = BRAND.green;
  for (let i = -2; i <= 2; i += 1) {
    ctx.save();
    ctx.translate(centreX + i * size * 0.15, centreY - size * 0.52);
    ctx.rotate(i * 0.4);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.14, size * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const stroke = (text: string, y: number, px: number) => {
    ctx.font = `800 ${px}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = px * 0.3;
    ctx.strokeStyle = BRAND.white;
    ctx.strokeText(text, centreX, y);
    ctx.fillStyle = BRAND.blue;
    ctx.fillText(text, centreX, y);
  };

  stroke('SLIME', centreY - size * 0.16, size * 0.4);
  stroke('BERRY', centreY + size * 0.22, size * 0.4);
}

/** The SB flower, drawn — the stand-in until the PNG is supplied. */
export function drawFlowerFallback(
  ctx: CanvasRenderingContext2D,
  centreX: number,
  centreY: number,
  radius: number,
  tint: string,
): void {
  const bloom = (petal: number, middle: number, colour: string) => {
    ctx.fillStyle = colour;
    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(
        centreX + Math.cos(angle) * radius * 0.52,
        centreY + Math.sin(angle) * radius * 0.52,
        petal,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(centreX, centreY, middle, 0, Math.PI * 2);
    ctx.fill();
  };

  bloom(radius * 0.56, radius * 0.66, BRAND.white);
  bloom(radius * 0.44, radius * 0.54, tint);

  ctx.font = `800 ${radius * 0.66}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
  ctx.fillStyle = BRAND.white;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SB', centreX, centreY + radius * 0.04);
}

/** Wraps a finished canvas as a colour texture. */
export function textureFrom(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
