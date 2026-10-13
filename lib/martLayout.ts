import * as THREE from 'three';
import { HOME_POSITION, HOME_TARGET } from './cameraFraming';

/**
 * SB Mart — the shop behind the Lab's back wall.
 *
 * Twice the floor it used to have: 13.4 x 12.3 = 164.8, against 9.5 x 8.7 =
 * 82.65 before, which puts it level with the Lab's 15 x 11 = 165. Each side grew
 * by root two rather than the room by one long side, so it is still the squarer
 * of the two rooms — it is framed on a portrait phone far more often than the
 * Lab, and a long thin room crops badly there. The ceiling went up to the Lab's
 * 5.4 with it: the giant installation in the middle needs the height, and a
 * gallery-style shop wants the air.
 */
export const MART = {
  width: 13.4,
  depth: 12.3,
  height: 5.4,
  /** Wall centres; both are 0.34 thick, matching the Lab's construction. */
  wallZ: -6.32,
  wallX: -6.87,
} as const;

/** Inner wall faces — the usable extent of the floor. */
export const MART_FACE_Z = -6.15;
export const MART_FACE_X = -6.7;

export const MART_POS = {
  /** Back through to the Lab. */
  returnDoor: [-4.0, 0, MART_FACE_Z] as const,
  sign: [1.9, 3.75, MART_FACE_Z] as const,
  /*
    The back-wall corner — the signature run, the record cabinet and the counter
    in front of them — moved as one piece when the floor doubled: back 1.8 to the
    new wall and across 1.4 to use the wider one. Moving them together is what
    kept the two cabinets joined and the till exactly where the keeper's stop
    expects it.
  */
  /** Wall run carrying the four signature jars, up to the record cabinet's edge. */
  wallShelf: [1.8, 0, -5.7] as const,
  /** The record cabinet. */
  vinyl: [4.8, 0, -5.7] as const,
  /** The counter, in front of the record cabinet, so till and stereo share a corner. */
  counter: [5.0, 0, -4.0] as const,
  trolley: [3.68, 0, 3.25] as const,
  mat: [-4.0, 0, -5.35] as const,
  /** The radio's table and the floor lamp, in the back-left corner by the door. */
  sideTable: [-6.0, 0, -4.35] as const,
  lamp: [-6.27, 0, -5.62] as const,
  /** Big statement plant on the west wall. */
  monstera: [-5.95, 0, -0.85] as const,
  /**
   * The giant momo, in the middle of the floor where the rug used to be — the
   * installation the shop is now arranged around. Measured with the rest: every
   * corridor clears its plinth by at least 0.45, for a body 0.28 in radius.
   */
  momo: [0.2, 0, -0.4] as const,
  /** The shop cat's favourite spot: curled up on the rim of momo's plinth. */
  cat: [1.45, 0, 1.1] as const,
  /** All three product lines on one fixture, square to the room. */
  seriesIsland: [-0.42, 0, 3.32] as const,
} as const;

/**
 * The shop is seen from the same direction as the Lab, so stepping through the
 * door reads as turning a corner in one world rather than cutting to a
 * different set. Only the distance and the field of view change.
 */
/* Aimed at the installation rather than at the middle of the floor: momo is
   what the room is now arranged around, and the target sits high enough to keep
   its head in frame. */
export const MART_HOME_TARGET = new THREE.Vector3(0.5, 1.6, -0.6);
export const MART_FOV = 42;
export const MART_VIEW_DIRECTION = HOME_POSITION.clone().sub(HOME_TARGET).normalize();

/**
 * Framing half-extents. Set to the content zone — momo in the middle with the
 * island, counter and wall run around it — rather than the whole doubled floor:
 * fitting the far corners of the bigger room into a portrait frame pushes the
 * camera so far back that the shop becomes a doll's house, and the corners it
 * then crops are bare concrete. Momo is tall, so the height half-extent carries
 * the installation; the distance is capped close enough that a phone fills.
 */
const MART_HALF_WIDTH = 5.2;
const MART_HALF_HEIGHT = 3.4;

/**
 * Distance is solved straight from the frustum here rather than scaled off a
 * base distance as the Lab does — the mart has no "home distance" worth
 * preserving, it simply wants to be as close as the aspect allows.
 */
export function solveMartFraming(aspect: number): number {
  const verticalTan = Math.tan((MART_FOV * Math.PI) / 360);
  const horizontalTan = verticalTan * Math.max(aspect, 0.2);
  const needed = Math.max(MART_HALF_HEIGHT / verticalTan, MART_HALF_WIDTH / horizontalTan);
  return THREE.MathUtils.clamp(needed, 12, 21);
}

export function martHomePosition(aspect: number): THREE.Vector3 {
  return MART_HOME_TARGET.clone().addScaledVector(MART_VIEW_DIRECTION, solveMartFraming(aspect));
}

/**
 * momo's plinth. Its footprint is what every corridor in the shop was measured
 * against, and its top is where the cat curls up, so both live here rather than
 * inside the installation.
 */
export const MOMO_PLINTH = { radius: 1.9, height: 0.35 } as const;

/** Named vantage points, used when a fixture is tapped. */
export type MartPreset = 'shelf' | 'counter' | 'vinyl' | 'series' | 'momo';

export const MART_PRESETS: Record<MartPreset, { target: THREE.Vector3; distance: number }> = {
  shelf: { target: new THREE.Vector3(1.8, 1.3, -5.3), distance: 5.4 },
  counter: { target: new THREE.Vector3(5.0, 0.95, -4.1), distance: 5.2 },
  vinyl: { target: new THREE.Vector3(4.8, 1.3, -5.3), distance: 4.8 },
  series: { target: new THREE.Vector3(-0.42, 1.05, 3.32), distance: 5.0 },
  momo: { target: new THREE.Vector3(0.2, 1.9, -0.4), distance: 9.0 },
};
