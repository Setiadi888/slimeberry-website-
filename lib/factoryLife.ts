'use client';

import { createStore, useStore } from './store';
import type { EntityKind } from './interaction';
import { emitLabEvent } from './labEvents';
import { readShift } from './shift';
import { LAB_CAST, type WorkerData } from './workers';

/**
 * Small, infrequent things that make the factory feel inhabited.
 *
 * Everything here reuses machinery that already exists — worker pose fields and
 * the tank's jiggle spring — so no new rigs or assets were needed. Events are
 * rare by design: the shop must stay the foreground.
 */
export type ReactionType = 'wave' | 'lookAround' | 'coffee';

export interface WorkerReaction {
  workerId: string;
  type: ReactionType;
  /** epoch ms when the reaction should end */
  until: number;
}

type ReactionHandler = (reaction: WorkerReaction) => void;
const reactionHandlers = new Set<ReactionHandler>();

export function onWorkerReaction(handler: ReactionHandler): () => void {
  reactionHandlers.add(handler);
  return () => {
    reactionHandlers.delete(handler);
  };
}

interface Thought {
  /** Who is speaking, as an anchor the bubble can be hung from. */
  speaker: { kind: EntityKind; id: string };
  text: string;
  /**
   * An idle musing gives way to whatever card the visitor has open; a complaint
   * is aimed at them and has to be seen, so it overrides and floats higher.
   */
  insistent: boolean;
  /** Metres above the anchor. A cat needs a much lower bubble than a person. */
  height: number;
}

const thoughtStore = createStore<Thought | null>(null);
export const useThought = () => useStore(thoughtStore, (state) => state);
/**
 * Non-reactive read, for the per-frame rig. The face and the bubble are driven
 * from this one value, so a worker can never be scowling without a complaint
 * over their head or the other way round.
 */
export const readThought = () => thoughtStore.get();

const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

/**
 * Whose life is being simulated. The Lab has three characters and machines to
 * rattle; SB Mart has a keeper and a cat and no machines, so the room swaps the cast
 * in rather than the scheduler guessing which objects exist.
 */
let cast: readonly WorkerData[] = LAB_CAST;
let catId: string | null = null;
/* The tanks are the Lab's and the shop has no machines, so the room says whether
   there is anything here to rattle. */
let tankEvents = true;

export function setLifeCast(
  next: readonly WorkerData[],
  machines: { tanks?: boolean } = {},
): void {
  cast = next.length > 0 ? next : LAB_CAST;
  tankEvents = machines.tanks ?? false;
}

/** Puts the shop cat in the rotation, or takes it out. */
export function setLifeCat(id: string | null): void {
  catId = id;
}

/**
 * What Oyen has to say. Mostly noise, because he is a cat — but every so often
 * something that suggests he has been following the conversation, which is the
 * joke and also, if you have ever owned one, the truth.
 */
const CAT_LINES = [
  // trills
  'mrrp?',
  'brrt! brrt!',
  'chrrp?',
  'ptrrp!',
  'prrp. (the counter is warmer)',
  // meows
  'mew.',
  'mew mew.',
  'mrrrow.',
  '…mrow.',
  'nyaaa~',
  'mrow — no. nothing. carry on.',
  'mrrp. (this shelf is mine now)',
  // purrs and the rest
  'prrrrr…',
  'purr. purr. purr.',
  '*slow blink*',
  '*tail flick*',
] as const;

const REACTION_DURATION: Record<ReactionType, number> = {
  wave: 2600,
  lookAround: 3200,
  coffee: 4200,
};

let timer: ReturnType<typeof setTimeout> | null = null;
let thoughtTimer: ReturnType<typeof setTimeout> | null = null;
let running = 0;

function fireOnce() {
  const roll = Math.random();
  const worker = pick(cast);

  // the cat takes a third of the shop's ambient moments
  if (catId && roll < 0.32) {
    say({ kind: 'station', id: catId }, pick(CAT_LINES), false, 3800, 0.72);
    return;
  }

  if (tankEvents && roll < 0.16) {
    // a jar in the tank shivers
    emitLabEvent('tank:splash');
  } else if (roll < 0.34) {
    // a worker notices the camera watching and waves at it
    const reaction: WorkerReaction = {
      workerId: worker.id,
      type: 'wave',
      until: Date.now() + REACTION_DURATION.wave,
    };
    reactionHandlers.forEach((handler) => handler(reaction));
  } else if (roll < 0.44) {
    const reaction: WorkerReaction = {
      workerId: worker.id,
      type: 'lookAround',
      until: Date.now() + REACTION_DURATION.lookAround,
    };
    reactionHandlers.forEach((handler) => handler(reaction));
  } else if (roll < 0.55) {
    const reaction: WorkerReaction = {
      workerId: worker.id,
      type: 'coffee',
      until: Date.now() + REACTION_DURATION.coffee,
    };
    reactionHandlers.forEach((handler) => handler(reaction));
  } else {
    /*
      A passing thought. Only the supervisor carries a second set — he is the one
      character who works both shifts, so half of what he has to say depends on
      which one he is standing in. Everybody else is only ever on the floor
      during their own shift, so their one list is already the right list.
    */
    const after = worker.nightThoughts && readShift().night > 0.5;
    say(
      { kind: 'worker', id: worker.id },
      pick(after ? worker.nightThoughts! : worker.thoughts),
      false,
      4600,
      1.5,
    );
  }
}

/** Puts a line above someone's head and clears it again. */
function say(
  speaker: { kind: EntityKind; id: string },
  text: string,
  insistent: boolean,
  ms: number,
  height: number,
): void {
  thoughtStore.set(() => ({ speaker, text, insistent, height }));
  if (thoughtTimer) clearTimeout(thoughtTimer);
  thoughtTimer = setTimeout(() => thoughtStore.set(() => null), ms);
}

/**
 * How many prods someone will take before saying something. They are patient,
 * but not infinitely so.
 */
const PATIENCE = 8;
const pokes = new Map<string, number>();

/**
 * Counts a click on a character. Past the eighth they answer back, and the
 * count resets — so a persistent visitor gets grumbled at repeatedly rather
 * than once and never again.
 */
export function pokeWorker(worker: WorkerData): void {
  const next = (pokes.get(worker.id) ?? 0) + 1;
  if (next <= PATIENCE) {
    pokes.set(worker.id, next);
    return;
  }
  pokes.set(worker.id, 0);
  say({ kind: 'worker', id: worker.id }, pick(worker.complaints), true, 4200, 2.15);
}

function schedule() {
  // Tightened from 7-16s: the bubbles were rare enough to be missed entirely.
  const delay = 4200 + Math.random() * 4800;
  timer = setTimeout(() => {
    fireOnce();
    schedule();
  }, delay);
}

/** Reference-counted so the scheduler runs once, only while mounted. */
export function startFactoryLife(): () => void {
  running += 1;
  if (running === 1) schedule();
  return () => {
    running -= 1;
    if (running === 0) {
      if (timer) clearTimeout(timer);
      if (thoughtTimer) clearTimeout(thoughtTimer);
      timer = null;
      thoughtTimer = null;
      thoughtStore.set(() => null);
    }
  };
}
