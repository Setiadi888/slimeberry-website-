'use client';

import { createStore, useStore } from './store';
import type { CameraPreset } from './cameraFraming';

export type EntityKind = 'product' | 'worker' | 'machine' | 'tank' | 'station';

export interface EntityRef {
  kind: EntityKind;
  id: string;
}

interface InteractionState {
  hovered: EntityRef | null;
  selected: EntityRef | null;
  /** Factory navigation vantage point, when nothing specific is selected. */
  view: CameraPreset | null;
  hintDismissed: boolean;
}

const store = createStore<InteractionState>({
  hovered: null,
  selected: null,
  view: null,
  hintDismissed: false,
});

const same = (a: EntityRef | null, b: EntityRef | null) =>
  a === b || (!!a && !!b && a.kind === b.kind && a.id === b.id);

export function hoverEntity(ref: EntityRef | null): void {
  store.set((state) => (same(state.hovered, ref) ? state : { ...state, hovered: ref }));
}

export function selectEntity(ref: EntityRef | null): void {
  store.set((state) =>
    same(state.selected, ref)
      ? state
      : { ...state, selected: ref, view: ref ? null : state.view, hintDismissed: true },
  );
}

/** Move to a named vantage point. Selecting an object always takes priority. */
export function setView(view: CameraPreset | null): void {
  store.set((state) =>
    state.view === view && !state.selected
      ? state
      : { ...state, view, selected: null, hintDismissed: true },
  );
}

export function dismissHint(): void {
  store.set((state) => (state.hintDismissed ? state : { ...state, hintDismissed: true }));
}

export const useHovered = () => useStore(store, (state) => state.hovered);
export const useSelected = () => useStore(store, (state) => state.selected);
export const useHintDismissed = () => useStore(store, (state) => state.hintDismissed);
export const useView = () => useStore(store, (state) => state.view);

/**
 * Boolean selectors. Scene objects subscribe through these so a pointer moving
 * across the factory only re-renders the two objects whose state actually
 * flipped, not every object in the tree.
 */
export const useIsHovered = (kind: EntityKind, id: string) =>
  useStore(store, (state) => state.hovered?.kind === kind && state.hovered.id === id);

export const useIsSelected = (kind: EntityKind, id: string) =>
  useStore(store, (state) => state.selected?.kind === kind && state.selected.id === id);
