'use client';

import { useEffect } from 'react';
import { createStore, useStore } from './store';

/**
 * Brand-world metrics for the little factory readout. These are decorative, not
 * operational — they drift slowly so the panel feels live without ever claiming
 * to be real data.
 */
export interface LabMetrics {
  batches: number;
  producedKg: number;
  strawberryShare: number;
  qcPassed: number;
  ordersReady: number;
}

const store = createStore<LabMetrics>({
  batches: 128,
  producedKg: 42.8,
  strawberryShare: 87,
  qcPassed: 99.2,
  ordersReady: 24,
});

const drift = (value: number, amount: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value + (Math.random() - 0.5) * amount));

let timer: ReturnType<typeof setInterval> | null = null;
let subscribers = 0;

/** Reference-counted ticker, so the interval exists only while it is rendered. */
export function useLabMetrics(): LabMetrics {
  useEffect(() => {
    subscribers += 1;
    if (!timer) {
      timer = setInterval(() => {
        store.set((current) => ({
          batches: current.batches + (Math.random() > 0.55 ? 1 : 0),
          producedKg: Number(drift(current.producedKg + 0.3, 0.4, 40, 90).toFixed(1)),
          strawberryShare: Math.round(drift(current.strawberryShare, 2, 78, 94)),
          qcPassed: Number(drift(current.qcPassed, 0.3, 97.4, 99.9).toFixed(1)),
          ordersReady: Math.max(0, current.ordersReady + (Math.random() > 0.6 ? 1 : 0)),
        }));
      }, 6500);
    }
    return () => {
      subscribers -= 1;
      if (subscribers === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, []);

  return useStore(store, (state) => state);
}

/** Registers a shipped order, so the readout reacts to real purchases. */
export function recordOrder(units: number): void {
  store.set((current) => ({ ...current, ordersReady: current.ordersReady + units }));
}
