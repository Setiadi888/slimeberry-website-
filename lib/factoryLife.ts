'use client';

import { createStore, useStore } from './store';
import { emitLabEvent } from './labEvents';
import { WORKERS, type WorkerData } from './workers';

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

const thoughtStore = createStore<{ workerId: string; text: string } | null>(null);
export const useThought = () => useStore(thoughtStore, (state) => state);

const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

/**
 * Whose life is being simulated. The Lab has three characters and machines to
 * rattle; SB Mart has Dilan and none, so the room swaps the cast in rather than
 * the scheduler guessing which objects exist.
 */
let cast: readonly WorkerData[] = WORKERS;
let machineEvents = true;

export function setLifeCast(next: readonly WorkerData[], withMachines = true): void {
  cast = next.length > 0 ? next : WORKERS;
  machineEvents = withMachines;
}

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

  if (machineEvents && roll < 0.06) {
    // somebody is servicing the Gachapon — the handle turns and the capsule
    // bed settles, as though a capsule had jammed and been freed
    emitLabEvent('gachapon:service');
  } else if (machineEvents && roll < 0.16) {
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
    // a passing thought
    thoughtStore.set(() => ({ workerId: worker.id, text: pick(worker.thoughts) }));
    if (thoughtTimer) clearTimeout(thoughtTimer);
    thoughtTimer = setTimeout(() => thoughtStore.set(() => null), 4600);
  }
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
