/**
 * Single source of truth for where everything physically sits in the Lab.
 *
 * The line now reads, end to end:
 *
 *   GREENHOUSE → MIXING → TEXTURE LAB
 *   → TRANSFER LINE → FILLING → PACKAGING → QC → LABELLING → DISPATCH
 *
 * Filling moved to the west end of the belt so it happens *before* packaging,
 * which is the order the process actually has: a jar is filled and then it is
 * boxed. That freed its old slot on the bench strip, and the break corner took
 * it — so the two desks that get read together, quality control and labelling,
 * now stand side by side with the coffee table right beside them.
 *
 * The belt runs into the left wall, where a baggage-claim style discharge
 * opening feeds it — jars are only ever seen emerging from that hood, never
 * appearing in mid-air. The back wall is the room's architecture: mixing and the
 * greenhouse sit along it on the left, the shop cabinet stands flat against it
 * on the right, and the SB Mart door is cut into it beside the shop. The west
 * wall now carries a second door: the staff entrance, which opens only at the
 * change of shift.
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
  /** West end sits in the discharge opening; east end feeds the palletiser. */
  startX: -7.35,
  endX: 5.4,
  /**
   * Where cargo appears and disappears. Both sit inside solid geometry: the
   * spawn behind the discharge hood's strip curtain, and the retire inside the
   * packaging tunnel — which is also where a jar stops being a jar.
   */
  spawnX: -7.72,
  retireX: -1.0,
  y: 0.62,
  /**
   * Top of the moving surface. The bed is 0.16 thick centred on `y`, so its top
   * face is at 0.70, and the slats add another 0.011 on top of that. Cargo that
   * ignores this floats: the jars were sitting at 0.82 and reading as hovering.
   */
  surfaceY: 0.711,
  /** Metres per second. Everything riding the belt uses this one number. */
  speed: 0.32,
  /**
   * Gantries straddling the belt, in travel order. Filling comes first now: it
   * doses jars while they are still jars, which means it has to be west of the
   * packaging tunnel, where they stop being jars.
   */
  fillX: -4.6,
  qcX: 0.9,
  labelX: 2.75,
} as const;

/**
 * What comes out of the packaging tunnel. Slightly larger than a Mainline jar —
 * a shipper has to fit one with room to spare — but still comfortably inside the
 * belt's 0.72 width, with roughly 0.15 clear on either side.
 */
export const SHIPPER = { width: 0.38, height: 0.3, depth: 0.42 } as const;

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
  /** Against the left wall, in the stretch the reward machine used to share. */
  /** The fish tank sideboard, where the texture bench stood. */
  /** The hand sink on the west wall, where the goldfish tank used to stand. */
  sink: [-6.9, 0, 0.9] as const,
  /** Discharge opening set into the left wall, where the belt begins. */
  discharge: [WALL_FACE_X, 0, BELT.z] as const,
  /**
   * Staff entrance, cut into the west wall between the greenhouse and the
   * texture bench. Shut for the whole of a shift; open only at the handover.
   */
  staffDoor: [WALL_FACE_X, 0, -1.5] as const,
  conveyor: [(BELT.startX + BELT.endX) / 2, 0, BELT.z] as const,
  /* Benches sit south of the belt; their machinery straddles it as a gantry. */
  /**
   * On its own at the west end of the belt, where the break corner used to be.
   * It is the first thing that happens to a jar, so it stands nearest the
   * discharge hood the jars come out of.
   */
  filling: [-4.6, 0, 2.2] as const,
  qc: [1.4, 0, 2.15] as const,
  /** Shoulder to shoulder with QC — the two desks a jar is judged at. */
  labelling: [2.75, 0, 2.2] as const,
  /**
   * Mid-line, straddling the belt at its centre point. It used to sit off the
   * east end, which meant the change from jars to boxes happened out of sight
   * behind it; here the whole point of the machine is legible — jars go in the
   * west mouth, shippers come out the east one.
   */
  packaging: [-1.0, 0, BELT.z] as const,
  /** Palletising arm at the end of the line, and the pallet it stacks onto. */
  palletiser: [6.9, 0, 3.0] as const,
  pallet: [6.85, 0, 2.05] as const,
  /**
   * Where the order trolley waits. It took over from the dispatch pallet, which
   * was a slab of flooring nobody could interact with; the trolley does the same
   * job, can be wheeled off by whoever is passing, and puts itself back.
   */
  trolleyPark: [4.6, 0, -2.6] as const,
  /**
   * The break corner, in the slot filling used to hold — right beside the QC and
   * labelling desks. Set a little south of the bench line so the table and its
   * stools stay clear of the walking lane between the benches and the belt.
   */
  breakArea: [4.45, 0, 2.15] as const,
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
  sink: [-6.05, 0.9] as const,
  /** In front of the staff door, clear of both the greenhouse and the bench. */
  staffDoor: [-6.6, -1.5] as const,
  /* The lane between the benches (z<=2.65) and the belt (z>=3.45) is only
     0.8 wide, so these all sit on its centreline. */
  filling: [-4.6, 3.05] as const,
  qc: [1.4, 3.05] as const,
  qcFar: [2.05, 3.05] as const,
  labelling: [2.75, 3.05] as const,
  eastTurn: [5.35, 3.05] as const,
  /**
   * Pushed out from x 5.35 to 6.0 now that the break corner occupies the strip's
   * east end: the old line ran straight through where the far stool stands. It
   * still clears the pallet, whose west edge is at 6.32.
   */
  eastLane: [6.0, 0.6] as const,
  trolley: [4.6, -2.05] as const,
} as const;

/**
 * The four stools around the break table, as [x, z, facing].
 *
 * Keyed by the beat rather than by the person, because two crews share them —
 * the mixer's stool is the mixer's stool whether Juno or Nala is sitting on it.
 * One per beat, deliberately: characters choose where to go at random, and a
 * shared seat would eventually put two of them in the same half metre.
 *
 * Each sits just outside the 0.78 table top, turned to face across it, and all
 * four are on the south half. The north side faces the walking lane between the
 * benches and the belt, and a stool there would stand in the middle of it.
 */
export const BREAK_SEATS = {
  /** West, tucked against the end of the labelling bench. */
  qc: [3.55, 2.35, 1.789] as const,
  /** South-west, the one the supervisor drops onto when nobody needs him. */
  supervisor: [5.15, 1.6, -0.905] as const,
  /** South, facing back up at the line. */
  mixer: [4.55, 1.25, -0.111] as const,
  /** East, off the lane the packer walks down to the trolley. */
  packing: [5.3, 2.4, -1.858] as const,
} as const;
