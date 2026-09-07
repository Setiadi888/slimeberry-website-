'use client';

import { createStore, useStore } from './store';

/** Flipped from inside the canvas on the first rendered frame. */
const readyStore = createStore({ ready: false });

export function setLabReady(): void {
  readyStore.set((state) => (state.ready ? state : { ready: true }));
}

export const useLabReady = () => useStore(readyStore, (state) => state.ready);
