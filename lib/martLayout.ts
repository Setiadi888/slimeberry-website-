import * as THREE from 'three';
import { HOME_POSITION, HOME_TARGET } from './cameraFraming';

/**
 * SB Mart — the little shop behind the Lab's back wall.
 *
 * Floor area is deliberately half the Lab's: 9.5 x 8.7 = 82.65 against the
 * Lab's 15 x 11 = 165. It is squarer than the Lab on purpose, because it is
 * framed on a portrait phone far more often than the Lab ever is, and a long
 * thin room crops badly there.
 */
export const MART = {
  width: 9.5,
  depth: 8.7,
  height: 4.2,
  /** Wall centres; both are 0.34 thick, matching the Lab's construction. */
  wallZ: -4.52,
  wallX: -4.92,
} as const;

/** Inner wall faces — the usable extent of the floor. */
export const MART_FACE_Z = -4.35;
export const MART_FACE_X = -4.75;

export const MART_POS = {
  /** Back through to the Lab. */
  returnDoor: [-2.6, 0, MART_FACE_Z] as const,
  sign: [0.5, 3.05, MART_FACE_Z] as const,
  /** Wall run carrying the four signature jars. */
  wallShelf: [0.2, 0, -3.85] as const,
  /** The record cabinet, where the chiller used to stand. */
  vinyl: [3.4, 0, -3.9] as const,
  /** Moved across to sit in front of the record cabinet, so the till, the
   *  stereo and the stock all share one staff corner. */
  counter: [3.6, 0, -2.2] as const,
  /** Blob rug filling the middle of the floor, clear of the counter's corner. */
  carpet: [0.2, 0, -0.3] as const,
  trolley: [2.6, 0, 2.3] as const,
  mat: [3.4, 0, 3.0] as const,
  stock: [-4.0, 0, -2.6] as const,
} as const;

/**
 * The shop is seen from the same direction as the Lab, so stepping through the
 * door reads as turning a corner in one world rather than cutting to a
 * different set. Only the distance and the field of view change.
 */
/* Sits right of centre: with the counter moved across to the record cabinet,
   the whole shop now lives on the back and right of the floor, and aiming at
   the middle framed a lot of empty carpet. */
export const MART_HOME_TARGET = new THREE.Vector3(1.1, 1.2, -1.1);
export const MART_FOV = 40;
export const MART_VIEW_DIRECTION = HOME_POSITION.clone().sub(HOME_TARGET).normalize();

/**
 * Framing half-extents. Width is set to the shopping zone rather than the whole
 * floor: fitting the far corners of a square room into a portrait frame pushes
 * the camera so far back that the shop becomes a doll's house, and the corners
 * it crops are bare floor and wall.
 */
const MART_HALF_WIDTH = 5.0;
const MART_HALF_HEIGHT = 2.3;

/**
 * Distance is solved straight from the frustum here rather than scaled off a
 * base distance as the Lab does — the mart has no "home distance" worth
 * preserving, it simply wants to be as close as the aspect allows.
 */
export function solveMartFraming(aspect: number): number {
  const verticalTan = Math.tan((MART_FOV * Math.PI) / 360);
  const horizontalTan = verticalTan * Math.max(aspect, 0.2);
  const needed = Math.max(MART_HALF_HEIGHT / verticalTan, MART_HALF_WIDTH / horizontalTan);
  return THREE.MathUtils.clamp(needed, 9.5, 30);
}

export function martHomePosition(aspect: number): THREE.Vector3 {
  return MART_HOME_TARGET.clone().addScaledVector(MART_VIEW_DIRECTION, solveMartFraming(aspect));
}

/** Named vantage points, used when a fixture is tapped. */
export type MartPreset = 'shelf' | 'counter' | 'vinyl';

export const MART_PRESETS: Record<MartPreset, { target: THREE.Vector3; distance: number }> = {
  shelf: { target: new THREE.Vector3(0.2, 1.3, -3.4), distance: 5.2 },
  counter: { target: new THREE.Vector3(3.6, 1.1, -2.3), distance: 5.2 },
  vinyl: { target: new THREE.Vector3(3.4, 1.3, -3.5), distance: 4.8 },
};
