'use client';

import * as THREE from 'three';

/**
 * Shared geometry and material instances.
 *
 * Every `<boxGeometry args={...} />` in JSX builds its own BufferGeometry, and
 * every `<meshStandardMaterial color={...} />` its own material — so a component
 * rendered three times, or a `.map()` over eight positions, uploads eight copies
 * of identical data to the GPU and gives three.js eight distinct materials to
 * sort and switch between.
 *
 * These are the ones worth sharing: geometry that is identical across many
 * instances, and materials whose parameters never change after construction.
 *
 * The rule for using them is absolute — **never mutate a shared instance.**
 * Anything that animates a colour, an emissive intensity or an opacity has to
 * keep its own material, because a mutation here would silently change every
 * other object using it. The workers' faces are the live example: the head
 * flushes when they are prodded, so heads keep their own material while coats,
 * legs and shoes share.
 */

/** Caches, keyed by the arguments that define the resource. */
const boxes = new Map<string, THREE.BoxGeometry>();
const spheres = new Map<string, THREE.SphereGeometry>();
const capsules = new Map<string, THREE.CapsuleGeometry>();
const cylinders = new Map<string, THREE.CylinderGeometry>();
const standards = new Map<string, THREE.MeshStandardMaterial>();

const key = (values: readonly (number | string | boolean | undefined)[]) => values.join('|');

export function sharedBox(w: number, h: number, d: number): THREE.BoxGeometry {
  const k = key([w, h, d]);
  let geometry = boxes.get(k);
  if (!geometry) {
    geometry = new THREE.BoxGeometry(w, h, d);
    boxes.set(k, geometry);
  }
  return geometry;
}

export function sharedSphere(radius: number, widthSeg = 12, heightSeg = 10): THREE.SphereGeometry {
  const k = key([radius, widthSeg, heightSeg]);
  let geometry = spheres.get(k);
  if (!geometry) {
    geometry = new THREE.SphereGeometry(radius, widthSeg, heightSeg);
    spheres.set(k, geometry);
  }
  return geometry;
}

export function sharedCapsule(
  radius: number,
  length: number,
  capSeg = 4,
  radialSeg = 10,
): THREE.CapsuleGeometry {
  const k = key([radius, length, capSeg, radialSeg]);
  let geometry = capsules.get(k);
  if (!geometry) {
    geometry = new THREE.CapsuleGeometry(radius, length, capSeg, radialSeg);
    capsules.set(k, geometry);
  }
  return geometry;
}

export function sharedCylinder(
  top: number,
  bottom: number,
  height: number,
  radialSeg = 12,
): THREE.CylinderGeometry {
  const k = key([top, bottom, height, radialSeg]);
  let geometry = cylinders.get(k);
  if (!geometry) {
    geometry = new THREE.CylinderGeometry(top, bottom, height, radialSeg);
    cylinders.set(k, geometry);
  }
  return geometry;
}

/**
 * A standard material with fixed parameters. Only for surfaces that never
 * animate — see the warning above.
 */
export function sharedStandard(
  color: string,
  roughness: number,
  metalness = 0,
): THREE.MeshStandardMaterial {
  const k = key([color, roughness, metalness]);
  let material = standards.get(k);
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    standards.set(k, material);
  }
  return material;
}

/** Counts, for the performance report. Not used by the scene. */
export const sharedCounts = () => ({
  boxes: boxes.size,
  spheres: spheres.size,
  capsules: capsules.size,
  cylinders: cylinders.size,
  materials: standards.size,
});
