/**
 * Single source of truth for where everything physically sits.
 *
 * The line now reads, end to end:
 *
 *   GREENHOUSE → INGREDIENT STORE → MIXING → COLOUR LAB → TEXTURE LAB
 *   → CONVEYOR → QC → FILLING → LABELLING → PACKAGING → FINISHED GOODS → DISPATCH
 *
 * Note this reverses the previous arrangement: packaging used to feed the belt,
 * but QC must sit after the conveyor and before packaging, so the belt now
 * carries mixed slime from the labs to QC, and the fill/label/pack sequence
 * happens after it.
 *
 * Geometry, worker routes, camera presets and signage all read from here.
 */

export const ROOM = {
  width: 15.0,
  depth: 11.0,
  height: 5.4,
  wallZ: -5.6,
  wallX: -7.6,
} as const;

/** Belt centreline. Slime travels +x, from the labs' chute to the QC arch. */
export const BELT = {
  z: 2.9,
  startX: -4.0,
  endX: 5.4,
  /** Spawn and retire points, both hidden inside solid housings. */
  spawnX: -4.7,
  retireX: 6.2,
  y: 0.62,
  /** Gantries straddling the belt, in travel order. */
  qcX: 0.9,
  fillX: 2.7,
  labelX: 4.3,
} as const;

export const STATION_POS = {
  greenhouse: [-5.9, 0, -3.75] as const,
  ingredients: [-3.2, 0, -4.0] as const,
  mixing: [-0.7, 0, -3.75] as const,
  tankMain: [1.75, 0, -3.8] as const,
  tankSecond: [3.2, 0, -3.9] as const,
  colourLab: [-6.1, 0, -1.2] as const,
  textureLab: [-6.1, 0, 0.9] as const,
  /** Chute feeding the belt entrance. */
  chute: [-4.42, 0, BELT.z] as const,
  conveyor: [(BELT.startX + BELT.endX) / 2, 0, BELT.z] as const,
  /* Benches sit south of the belt; their machinery straddles it as a gantry. */
  qc: [1.4, 0, 1.15] as const,
  filling: [2.7, 0, 1.2] as const,
  labelling: [4.3, 0, 1.2] as const,
  packaging: [6.6, 0, 2.55] as const,
  finishedGoods: [6.9, 0, -0.4] as const,
  dispatch: [6.3, 0, -2.8] as const,
  breakArea: [-6.0, 0, 4.0] as const,
  miniShelf: [-7.25, 1.15, 2.3] as const,
} as const;

/** Standing spots, all verified clear of every footprint (worker radius 0.28). */
export const STAND = {
  greenhouse: [-5.9, -2.35] as const,
  ingredients: [-3.2, -2.75] as const,
  mixer: [-0.7, -2.4] as const,
  mixerLane: [-2.0, -2.5] as const,
  colourLab: [-5.05, -1.2] as const,
  textureLab: [-5.05, 0.9] as const,
  /* The lane between the benches (z<=1.65) and the belt (z>=2.45) is only
     0.8 wide, so these all sit on its centreline. */
  qc: [1.4, 2.05] as const,
  qcFar: [2.05, 2.05] as const,
  filling: [2.7, 2.05] as const,
  labelling: [4.3, 2.05] as const,
  eastTurn: [5.3, 2.05] as const,
  eastLane: [5.3, 1.0] as const,
  dispatch: [5.3, -2.2] as const,
} as const;
