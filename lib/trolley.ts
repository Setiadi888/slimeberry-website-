'use client';

import { createStore, useStore } from './store';

/**
 * Whether somebody currently has hold of the shopping trolley.
 *
 * The trolley is scenery that occasionally becomes a prop: when a route point
 * is flagged `pushOut`, the worker walking that leg takes it, and the trolley
 * follows them until they let go. Keeping the state here rather than on the
 * worker means the trolley can read it without either component knowing about
 * the other — the worker publishes, the trolley subscribes.
 *
 * One trolley, one handler: if two characters were ever flagged to push at
 * once, the last one to claim it wins.
 */
const store = createStore<{ by: string | null }>({ by: null });

export function setTrolleyPusher(workerId: string, pushing: boolean): void {
  store.set((state) => {
    if (pushing) return state.by === workerId ? state : { by: workerId };
    return state.by === workerId ? { by: null } : state;
  });
}

export const useTrolleyPusher = () => useStore(store, (state) => state.by);
/** Non-reactive read, for the trolley's per-frame follow. */
export const readTrolleyPusher = () => store.get().by;
