'use client';

import { useSyncExternalStore } from 'react';

/**
 * Minimal external store.
 *
 * React context does not cross the React Three Fiber `<Canvas>` boundary — the
 * canvas runs its own reconciler — so shared state between the 3D scene and the
 * DOM overlay lives here instead. `useSyncExternalStore` keeps both trees in
 * sync without pulling in a state-management dependency.
 */
export interface Store<T> {
  get: () => T;
  set: (updater: (current: T) => T) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => state,
    set: (updater) => {
      const next = updater(state);
      if (Object.is(next, state)) return;
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function useStore<T, S>(store: Store<T>, selector: (state: T) => S): S {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.get()),
    () => selector(store.get()),
  );
}
