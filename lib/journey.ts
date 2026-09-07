'use client';

import { useEffect } from 'react';
import { createStore, useStore } from './store';

/**
 * How a jar gets made, as the visitor is shown it. Each step names the factory
 * label it lights up, so the strip in the product panel and the highlight out in
 * the scene are driven by one list.
 */
export interface JourneyStep {
  id: string;
  label: string;
  /** Matches an id in FACTORY_LABELS. */
  labelId: string;
}

export const JOURNEY: JourneyStep[] = [
  { id: 'grow', label: 'Grown', labelId: 'greenhouse' },
  { id: 'mix', label: 'Mixed', labelId: 'mixing' },
  { id: 'colour', label: 'Tinted', labelId: 'colour' },
  { id: 'texture', label: 'Tested', labelId: 'texture' },
  { id: 'qc', label: 'Checked', labelId: 'qc' },
  { id: 'fill', label: 'Filled', labelId: 'filling' },
  { id: 'label', label: 'Labelled', labelId: 'labelling' },
  { id: 'pack', label: 'Packed', labelId: 'packaging' },
  { id: 'ship', label: 'Shipped', labelId: 'dispatch' },
];

/** Seconds each step holds before the trace moves on. */
const STEP_SECONDS = 1.25;

const store = createStore<{ productId: string | null; step: number }>({
  productId: null,
  step: 0,
});

let timer: ReturnType<typeof setInterval> | null = null;

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

/** Starts (or restarts) the trace for a product; pass null to clear it. */
export function traceProduct(productId: string | null): void {
  stop();
  store.set(() => ({ productId, step: 0 }));
  if (!productId) return;
  timer = setInterval(() => {
    store.set((current) => ({ ...current, step: (current.step + 1) % JOURNEY.length }));
  }, STEP_SECONDS * 1000);
}

export const useJourney = () => useStore(store, (state) => state);

/** The factory label currently lit by the trace, if any. */
export const useTracedLabelId = () =>
  useStore(store, (state) => (state.productId ? JOURNEY[state.step].labelId : null));

export function useJourneyCleanup(): void {
  useEffect(() => stop, []);
}
