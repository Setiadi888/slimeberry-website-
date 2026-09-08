/**
 * Single source of truth for where everything physically sits in the Lab.
 *
 * The line now reads, end to end:
 *
 *   GREENHOUSE → MIXING → TEXTURE LAB
 *   → TRANSFER LINE → QC → FILLING → LABELLING → PACKAGING → DISPATCH
 *
 * Three things shape the current arrangement. QC must sit after the conveyor and
 * before packaging, so the belt carries mixed slime from the labs to QC and the
 * fill/label/pack sequence happens after it. The belt runs into the left wall,
 * where a baggage-claim style discharge opening feeds it — jars are only ever
 * seen emerging from that hood, never appearing in mid-air. And the back wall is
 * now the room's architecture: mixing and the greenhouse sit along it on the
 * left, the shop cabinet stands flat against it on the right, and the SB Mart
 * door is cut into it beside the shop.
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

/**
 * Inner faces of the two walls. Anything beyond them is inside the wall volume
 * and therefore hidden from the camera, which is what lets jars spawn out of
 * sight behind the discharge opening.
 */
export const WALL_FACE_X = -7.43;
export const WALL_FACE_Z = -5.43;

/**
 * Top surface of the floor slab. The slab sits at y 0.02 and is 0.22 thick, so
 * the walkable surface is 0.14 — not 0, which is where characters used to be
 * placed, leaving every one of them shin-deep in the floor. Both rooms build
 * their floor the same way, so one number serves both.
 */
export const FLOOR_TOP_Y = 0.14;
/**
 * Where a character's group origin goes. The rig's shoes sit 0.035 below its
 * origin, so lifting by that much puts the soles exactly on the floor.
 */
export const CHARACTER_Y = FLOOR_TOP_Y + 0.035;

/**
 * Belt centreline. Slime travels +x, from the wall discharge to packaging.
 * Moved forward to z 3.9 so the back of the room belongs to the mixing lab and
 * the greenhouse; the benches and worker lane moved with it, which keeps every
 * gantry offset identical to before.
 */
export const BELT = {
  z: 3.9,
  /** West end sits in the discharge opening; east end runs into packaging. */
  startX: -7.35,
  endX: 5.4,
  /** Spawn and retire points, both hidden inside solid geometry. */
  spawnX: -7.72,
  retireX: 6.2,
  y: 0.62,
  /** Gantries straddling the belt, in travel order. */
  qcX: 0.9,
  fillX: 2.7,
  labelX: 4.3,
} as const;

export const STATION_POS = {
  greenhouse: [-5.9, 0, -3.75] as const,
  /** Stands against the greenhouse's east end, along the back wall. */
  mixing: [-3.15, 0, -3.8] as const,
  /**
   * Stood right beside the mixer they feed. They used to sit out at x 1.75 and
   * 3.2, which put them squarely in front of the shop cabinet and the SB Mart
   * door — and stretched the pipe run halfway across the room to reach them.
   */
  tankMain: [-0.95, 0, -3.5] as const,
  tankSecond: [0.85, 0, -3.55] as const,
  gachapon: [-6.1, 0, -1.2] as const,
  textureLab: [-6.1, 0, 0.9] as const,
  /** Discharge opening set into the left wall, where the belt begins. */
  discharge: [WALL_FACE_X, 0, BELT.z] as const,
  conveyor: [(BELT.startX + BELT.endX) / 2, 0, BELT.z] as const,
  /* Benches sit south of the belt; their machinery straddles it as a gantry. */
  qc: [1.4, 0, 2.15] as const,
  filling: [2.7, 0, 2.2] as const,
  labelling: [4.3, 0, 2.2] as const,
  packaging: [6.6, 0, 3.55] as const,
  dispatch: [6.3, 0, -2.8] as const,
  /** Back on the left, in the open floor the workers cross. */
  breakArea: [-4.6, 0, 2.4] as const,
  /** Square to the back wall, shifted left to make room for the SB Mart door. */
  shopShelf: [3.3, 0, -4.93] as const,
  /** The doorway through to SB Mart, cut into the wall beside the shop. */
  martDoor: [6.2, 0, WALL_FACE_Z] as const,
} as const;

/** Standing spots, all verified clear of every footprint (worker radius 0.28). */
export const STAND = {
  greenhouse: [-5.9, -2.35] as const,
  mixer: [-3.15, -2.5] as const,
  /** Open lane between the greenhouse and the mixer. */
  mixerLane: [-4.6, -2.5] as const,
  gachapon: [-5.05, -1.2] as const,
  textureLab: [-5.05, 0.9] as const,
  /* The lane between the benches (z<=2.65) and the belt (z>=3.45) is only
     0.8 wide, so these all sit on its centreline. */
  qc: [1.4, 3.05] as const,
  qcFar: [2.05, 3.05] as const,
  filling: [2.7, 3.05] as const,
  labelling: [4.3, 3.05] as const,
  eastTurn: [5.3, 3.05] as const,
  eastLane: [5.3, 1.0] as const,
  dispatch: [5.3, -2.2] as const,
} as const;
