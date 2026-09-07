'use client';

import type * as THREE from 'three';

/**
 * Bridge from the canvas to the DOM overlay. The floating cards need the camera
 * to project world positions into screen space, and they run their own rAF loop
 * rather than re-rendering React every frame.
 */
export const viewport: {
  camera: THREE.Camera | null;
  width: number;
  height: number;
} = { camera: null, width: 0, height: 0 };

export function setViewport(camera: THREE.Camera, width: number, height: number): void {
  viewport.camera = camera;
  viewport.width = width;
  viewport.height = height;
}
