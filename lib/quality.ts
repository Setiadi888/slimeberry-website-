'use client';

import { useEffect, useState } from 'react';

export interface QualitySettings {
  /** Device pixel ratio clamp passed to the canvas. */
  dpr: [number, number];
  shadows: boolean;
  shadowMapSize: number;
  /**
   * Real refraction. Measured at 812 draw calls / 45 fps with it on, because
   * three.js renders the entire scene an extra time to fill the transmission
   * buffer. The jars already read as glass from clearcoat + sheen + alpha, so
   * it is off everywhere until the scene is cheap enough to afford it.
   */
  transmission: boolean;
  particleCount: number;
  /** The visitor asked the OS to reduce motion; idle animation is stilled. */
  reducedMotion: boolean;
  isCoarsePointer: boolean;
}

const DESKTOP: Omit<QualitySettings, 'reducedMotion' | 'isCoarsePointer'> = {
  dpr: [1, 1.75],
  shadows: true,
  shadowMapSize: 2048,
  transmission: false,
  particleCount: 44,
};

const MOBILE: Omit<QualitySettings, 'reducedMotion' | 'isCoarsePointer'> = {
  dpr: [1, 1.4],
  shadows: true,
  shadowMapSize: 1024,
  transmission: false,
  particleCount: 16,
};

/**
 * Pixel budget. A large desktop window at dpr 1.75 asks for ~4.9M pixels, which
 * is fill-rate bound well before it is draw-call bound — measured at 44 fps on a
 * 1705x932 window. Scaling the cap with viewport area keeps the shaded pixel
 * count roughly constant instead of letting it grow with the window.
 */
function dprCapFor(width: number, height: number): number {
  const area = width * height;
  if (area > 1_500_000) return 1.25;
  if (area > 950_000) return 1.5;
  return 1.75;
}

/**
 * Device-aware quality. Resolved after mount so the server and first client
 * render agree, avoiding a hydration mismatch.
 */
export function useQuality(): QualitySettings {
  const [settings, setSettings] = useState<QualitySettings>({
    ...DESKTOP,
    reducedMotion: false,
    isCoarsePointer: false,
  });

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointerQuery = window.matchMedia('(pointer: coarse)');

    const resolve = () => {
      const small = window.innerWidth < 820 || pointerQuery.matches;
      const base = small ? MOBILE : DESKTOP;
      const cap = dprCapFor(window.innerWidth, window.innerHeight);
      setSettings({
        ...base,
        dpr: [1, Math.min(base.dpr[1], cap)],
        reducedMotion: motionQuery.matches,
        isCoarsePointer: pointerQuery.matches,
      });
    };

    resolve();
    window.addEventListener('resize', resolve);
    motionQuery.addEventListener('change', resolve);
    return () => {
      window.removeEventListener('resize', resolve);
      motionQuery.removeEventListener('change', resolve);
    };
  }, []);

  return settings;
}
