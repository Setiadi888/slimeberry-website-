/**
 * Wandering that stays in its lane.
 *
 * The characters used to walk one hand-authored cycle forever: purposeful, but
 * you learn it in twenty seconds. Choosing destinations at random instead is the
 * obvious fix and the wrong one — it is what an earlier version did, and it sent
 * workers straight through the benches.
 *
 * So the destination is random and the *path* is not. Each character owns a
 * corridor — an open polyline whose every leg was measured against the furniture
 * with the 0.28 body radius — plus a handful of stops, each attached to the
 * corridor node it is reached from. Getting from one stop to another means
 * stepping onto the corridor, walking it to the other stop's node, and stepping
 * off. Which stop comes next is a weighted throw; how it gets there never is.
 */

/** A place worth standing, hanging off one node of the owner's corridor. */
export interface RoamStop {
  id: string;
  at: [number, number];
  /** Facing while stood here, radians. Omitted means "keep whatever you had". */
  facing?: number;
  /** Seconds to stay, picked uniformly from the range. */
  dwell: [number, number];
  action?: 'work' | 'idle' | 'inspect' | 'sit';
  /** Index into the corridor this stop joins at. */
  node: number;
  /** Relative odds of being chosen. Default 1. */
  weight?: number;
  /** Carry the crate on the leg out of here. */
  carries?: boolean;
  /**
   * Forces the next stop, for the errands that only make sense as a pair — the
   * tray fetched from the greenhouse goes to the mixer, the loaded trolley goes
   * back up the line. Randomness is in *whether* the errand is chosen, not in
   * where it ends.
   */
  then?: string;
  /** Kick the mixer on arrival. */
  startsMachine?: boolean;
  /** Run the tap on arrival — a wash at the sink. */
  washes?: boolean;
}

export interface RoamPlan {
  /** The corridor, in order. Legs between consecutive nodes are known clear. */
  lane: [number, number][];
  stops: RoamStop[];
}

/** The part of a stop the router actually needs. The cat has its own verbs. */
export interface LanePoint {
  at: [number, number];
  node: number;
}

/**
 * The corridor nodes to walk through to get from node `from` to node `to`,
 * exclusive of `from` and inclusive of `to`.
 *
 * The corridor is an open path, not a ring: a worker's beat is a line down the
 * factory, and pretending it loops would let a route close across the middle of
 * the benches.
 */
export function laneBetween(from: number, to: number): number[] {
  const path: number[] = [];
  const direction = to >= from ? 1 : -1;
  for (let i = from + direction; i !== to + direction; i += direction) path.push(i);
  return path;
}

/**
 * The full list of floor positions to walk, from the stop you are standing at to
 * the one you are going to: onto the corridor, along it, then off to the target.
 */
export function planWalk(
  lane: [number, number][],
  from: LanePoint,
  to: LanePoint,
): [number, number][] {
  const legs: [number, number][] = [];
  // step onto the corridor first, unless the stop already sits on its node
  const entry = lane[from.node];
  if (entry && (entry[0] !== from.at[0] || entry[1] !== from.at[1])) legs.push(entry);
  for (const index of laneBetween(from.node, to.node)) {
    const node = lane[index];
    if (node) legs.push(node);
  }
  const exit = lane[to.node];
  if (!exit || exit[0] !== to.at[0] || exit[1] !== to.at[1]) legs.push(to.at);
  return legs;
}

/**
 * Picks where to go next: weighted, never the stop just left, and never the one
 * before that either — two stops taken out of the draw is enough to stop the
 * short beats reading as a two-step shuffle, and every character here has at
 * least four places to be.
 */
export function pickStop<T extends { id: string; weight?: number }>(
  stops: T[],
  recent: string[],
): T {
  /*
    Weight zero means "somewhere I can be sent, never somewhere I choose" — the
    staff door, which is only ever reached because a shift ended. Filtered out
    before the draw rather than left to contribute nothing to it, because a zero
    at the end of the list can still fall out of the running total.
  */
  const open = stops.filter((stop) => stop.weight !== 0);
  const eligible = open.filter((stop) => !recent.includes(stop.id));
  const pool = eligible.length > 0 ? eligible : open.length > 0 ? open : stops;

  const total = pool.reduce((sum, stop) => sum + (stop.weight ?? 1), 0);
  let roll = Math.random() * total;
  for (const stop of pool) {
    roll -= stop.weight ?? 1;
    if (roll <= 0) return stop;
  }
  return pool[pool.length - 1];
}

/** Seconds to stand at a stop this time round. */
export function rollDwell(stop: { dwell: [number, number] }): number {
  const [low, high] = stop.dwell;
  return low + Math.random() * (high - low);
}
