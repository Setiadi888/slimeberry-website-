'use client';

import { createStore, useStore } from './store';

/**
 * The factory runs two shifts, on the wall clock.
 *
 * The night crew clock on at five in the evening and off at five in the morning,
 * which means the room now agrees with the neon clock on the back wall: if it
 * says 23:40, the light is warm and the night crew are on the floor. An earlier
 * version ran a compressed cycle so a visitor would always see a handover within
 * a few minutes; this is the honest version, and the cost of it is that the
 * changeover is a thing that happens twice a day rather than a thing you can
 * wait around for.
 *
 * Two kinds of consumer read it, and they read it differently. The lighting and
 * the door want a smooth number sixty times a second, so they call `readShift()`
 * straight out of their frame loop and never touch React. The cast on the floor
 * changes twice a day, so that comes through a store and a slow poll — a React
 * re-render is the right tool for swapping three characters and the wrong one
 * for dimming a lamp.
 */

/** Hour the night crew clock on, and the hour they clock off. */
const NIGHT_FROM = 17;
const NIGHT_UNTIL = 5;

const DAY_MINUTES = 24 * 60;
const BOUNDARIES = [
  { at: NIGHT_UNTIL * 60, into: 'day' as const },
  { at: NIGHT_FROM * 60, into: 'night' as const },
];

/**
 * Minutes either side of the hour that the staff door is open.
 *
 * A real changeover is not instantaneous — one crew has to get across the floor
 * and out before the next comes in — so the door leads the hour by ninety
 * seconds and trails it by the same.
 */
const HANDOVER_MINUTES = 1.5;

/**
 * Minutes either side of the hour the light takes to turn over.
 *
 * Much wider than the handover, because dusk is not an event. At ten to five the
 * room has already started to warm; by ten past it is fully night, and the crew
 * changed over on the hour somewhere in the middle of that.
 */
const TURN_MINUTES = 10;

export type Crew = 'day' | 'night';

export interface ShiftReading {
  /** Whose shift it is — which crew is on the floor right now. */
  crew: Crew;
  /** 0 in daylight, 1 at night, eased across the turn of the hour. */
  night: number;
  /** True while the crews are changing over. */
  handover: boolean;
  /** How far the staff door has slid back, 0 to 1. */
  door: number;
  /** True for the crew on the floor while they are on their way out. */
  leaving: boolean;
}

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * Minutes from the nearest shift boundary, signed — negative before it, positive
 * after — along with which way that boundary turns.
 *
 * The day wraps, so each boundary is tried a day early and a day late as well:
 * at half past midnight the nearest boundary is five in the *morning*, four and
 * a half hours ahead, and not the seventeen hundred that is nineteen hours back.
 */
function nearestBoundary(minute: number): { delta: number; into: Crew } {
  let best = { delta: Infinity, into: 'day' as Crew };
  for (const boundary of BOUNDARIES) {
    for (const wrap of [-DAY_MINUTES, 0, DAY_MINUTES]) {
      const delta = minute - (boundary.at + wrap);
      if (Math.abs(delta) < Math.abs(best.delta)) best = { delta, into: boundary.into };
    }
  }
  return best;
}

/** Everything about the shift at a given minute of the day. Pure; safe per frame. */
function readShiftAtMinute(minute: number): ShiftReading {
  const m = ((minute % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  const crew: Crew = m >= NIGHT_FROM * 60 || m < NIGHT_UNTIL * 60 ? 'night' : 'day';

  const { delta, into } = nearestBoundary(m);

  /*
    The light turns over the boundary rather than at it. `turn` runs 0 to 1 as
    the hour passes; which end of the day that means depends on which boundary
    is nearest, so a dawn boundary reads it backwards.
  */
  const turn = smoothstep(-TURN_MINUTES, TURN_MINUTES, delta);
  const night = into === 'night' ? turn : 1 - turn;

  const handover = Math.abs(delta) < HANDOVER_MINUTES;
  // eased at both tails, so the panels never appear to jump
  const door =
    smoothstep(-HANDOVER_MINUTES, -HANDOVER_MINUTES + 0.3, delta) *
    (1 - smoothstep(HANDOVER_MINUTES - 0.3, HANDOVER_MINUTES, delta));

  return { crew, night, handover, door, leaving: handover && delta < 0 };
}

/* ------------------------------------------------- the handover, rung by hand */

/**
 * The staff door is pressable, and pressing it calls a changeover there and then
 * rather than waiting for five o'clock.
 *
 * It runs the same sequence the clock runs, only in seconds instead of minutes:
 * the door slides back, the crew on the floor walk out through it, the other
 * three walk in, and the door shuts behind them. Nothing about the *time*
 * changes — the light stays where the wall clock has it, because a visitor
 * calling the next crew in is a handover, not a jump to the evening.
 *
 * The swap is kept as an offset against the clock rather than as a crew of its
 * own, so a real boundary still turns the crews over underneath it.
 */
const CALL_OPEN = 0.4;
const CALL_SWAP = 2.8;
const CALL_TOTAL = 5.0;
const CALL_CLOSE = 0.8;

/** When the door was last pressed, in seconds on the frame clock; 0 when idle. */
let calledAt = 0;
/** True while the crews are the other way round from whatever the clock says. */
let swapped = false;
const other = (crew: Crew): Crew => (crew === 'day' ? 'night' : 'day');

const clock = () => (typeof performance === 'undefined' ? Date.now() : performance.now()) / 1000;

/**
 * Ring the changeover. Ignored while one is already running, so leaning on the
 * door does not stack up crews.
 */
export function callShiftChange(): void {
  if (typeof window === 'undefined' || calledAt) return;
  calledAt = clock();
  window.setTimeout(() => {
    swapped = !swapped;
    sample();
  }, CALL_SWAP * 1000);
  window.setTimeout(() => {
    calledAt = 0;
    sample();
  }, CALL_TOTAL * 1000);
  // publish the walk-out at once rather than waiting on the one-second poll
  sample();
}

/** True while a called changeover is still running. */
export const shiftChanging = () => calledAt !== 0;

/** Everything about the shift right now, on the visitor's own clock. */
export function readShift(): ShiftReading {
  const now = new Date();
  const base = readShiftAtMinute(now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60);
  const crew = swapped ? other(base.crew) : base.crew;
  if (!calledAt) return { ...base, crew };

  /*
    A called changeover, laid over whatever the clock was doing: the door opens,
    holds, and shuts, and the crew on the floor is walking out until the moment
    they are relieved. `crew` has already flipped by then — the timer above does
    it — so this only has to say which way they are walking.
  */
  const t = clock() - calledAt;
  const door = Math.min(1, Math.max(0, Math.min(t / CALL_OPEN, (CALL_TOTAL - t) / CALL_CLOSE)));
  return {
    ...base,
    crew,
    handover: true,
    door: Math.max(base.door, door),
    leaving: t < CALL_SWAP,
  };
}

/* ------------------------------------------------------------ the slow half */

interface CrewState {
  crew: Crew;
  /** True while this crew is walking off the floor. */
  leaving: boolean;
  /** True while this crew is walking on. */
  arriving: boolean;
}

const store = createStore<CrewState>({ crew: 'day', leaving: false, arriving: false });

let poll: ReturnType<typeof setInterval> | null = null;
let watchers = 0;

function sample() {
  const shift = readShift();
  store.set((current) => {
    const next: CrewState = {
      crew: shift.crew,
      leaving: shift.leaving,
      arriving: shift.handover && !shift.leaving,
    };
    return current.crew === next.crew &&
      current.leaving === next.leaving &&
      current.arriving === next.arriving
      ? current
      : next;
  });
}

/**
 * Runs the poll that publishes crew changes, reference counted so it only ticks
 * while something is watching. Once a second: the handover window is three
 * minutes wide, so a second's lag is invisible, and it keeps the frame loop out
 * of React.
 */
export function startShiftClock(): () => void {
  watchers += 1;
  if (watchers === 1) {
    sample();
    poll = setInterval(sample, 1000);
  }
  return () => {
    watchers -= 1;
    if (watchers === 0 && poll) {
      clearInterval(poll);
      poll = null;
    }
  };
}

export const useCrew = () => useStore(store, (state) => state.crew);
export const useCrewMotion = () =>
  useStore(store, (state) => (state.leaving ? 'leaving' : state.arriving ? 'arriving' : 'settled'));
export const readCrew = () => store.get().crew;
