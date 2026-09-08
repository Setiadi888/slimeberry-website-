import * as THREE from 'three';

/**
 * Home framing for the diorama, shared by the canvas's initial camera and the
 * GSAP reset so the two can never drift apart.
 */
/* Scaled out with the factory: the line now spans ~15 units, and leaving the
   old base distance meant solveFraming's 2.2x clamp cropped both ends. */
export const HOME_POSITION = new THREE.Vector3(10.4, 6.4, 12.3);
/* Nudged forward with the transfer line: the belt, its benches and packaging
   all moved to the front of the room, taking the content's centre with them. */
export const HOME_TARGET = new THREE.Vector3(0, 2.0, 0.2);
export const HOME_FOV = 34;

export const BASE_DISTANCE = HOME_POSITION.distanceTo(HOME_TARGET);

/**
 * Half-extents of the lab, used to fit it into the frustum. Grown from 6.2 when
 * the line was re-laid out, and again when the belt was carried through to the
 * left wall: measured along the camera's right vector, the discharge hood sits
 * 8.24 out, so 8.7 left it grazing the frame edge.
 */
const LAB_HALF_WIDTH = 9.9;
const LAB_HALF_HEIGHT = 3.4;

/**
 * How far back the camera must sit for the given viewport aspect, derived from
 * the frustum rather than from hand-tuned width breakpoints.
 *
 * A tall phone would mathematically need ~3.5x the base distance to fit the lab
 * across its narrow width, which would shrink the diorama to a speck. The clamp
 * trades a little horizontal cropping for a scene that is still legible, and
 * portrait additionally aims right so the product shelf — the one thing the
 * visitor must be able to reach — always stays in frame.
 */
export function solveFraming(aspect: number): { distance: number; targetShiftX: number } {
  const verticalTan = Math.tan((HOME_FOV * Math.PI) / 360);
  const horizontalTan = verticalTan * aspect;

  const needed = Math.max(LAB_HALF_HEIGHT / verticalTan, LAB_HALF_WIDTH / horizontalTan);
  const scale = THREE.MathUtils.clamp(needed / BASE_DISTANCE, 1, 2.2);

  return {
    distance: BASE_DISTANCE * scale,
    targetShiftX: aspect < 0.9 ? 1.15 : 0,
  };
}

export type CameraPreset =
  | 'greenhouse'
  | 'mixing'
  | 'texture'
  | 'qc'
  | 'packing'
  | 'dispatch'
  | 'gachapon';

/**
 * Named vantage points for the factory navigation. Distances are deliberately
 * similar so moving between them reads as gliding around one small world rather
 * than cutting between unrelated shots.
 */
export const CAMERA_PRESETS: Record<CameraPreset, { target: THREE.Vector3; distance: number }> = {
  greenhouse: { target: new THREE.Vector3(-5.3, 1.3, -3.0), distance: 7.2 },
  mixing: { target: new THREE.Vector3(-3.15, 1.5, -3.0), distance: 7.4 },
  texture: { target: new THREE.Vector3(-5.4, 1.1, 0.9), distance: 7.0 },
  gachapon: { target: new THREE.Vector3(-5.2, 1.7, -1.2), distance: 6.4 },
  qc: { target: new THREE.Vector3(1.3, 1.1, 3.1), distance: 7.0 },
  packing: { target: new THREE.Vector3(4.6, 1.1, 3.2), distance: 7.4 },
  dispatch: { target: new THREE.Vector3(6.0, 1.0, -1.2), distance: 7.0 },
};
