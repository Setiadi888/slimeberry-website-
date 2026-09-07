'use client';

import * as THREE from 'three';
import type { EntityKind } from './interaction';

/**
 * Live scene objects that UI can point at. Objects register themselves on
 * mount; storing the Object3D rather than a copied vector means a floating card
 * tracks a worker while they walk, with no state updates involved.
 */
const anchors = new Map<string, THREE.Object3D>();

export const anchorKey = (kind: EntityKind, id: string) => `${kind}:${id}`;

export function registerAnchor(kind: EntityKind, id: string, object: THREE.Object3D): void {
  anchors.set(anchorKey(kind, id), object);
}

export function unregisterAnchor(kind: EntityKind, id: string): void {
  anchors.delete(anchorKey(kind, id));
}

export function getAnchor(kind: EntityKind, id: string): THREE.Object3D | undefined {
  return anchors.get(anchorKey(kind, id));
}

const scratch = new THREE.Vector3();

/** World position of an anchor, plus an optional vertical offset. */
export function getAnchorPosition(
  kind: EntityKind,
  id: string,
  yOffset = 0,
): THREE.Vector3 | null {
  const object = anchors.get(anchorKey(kind, id));
  if (!object) return null;
  object.getWorldPosition(scratch);
  scratch.y += yOffset;
  return scratch;
}
