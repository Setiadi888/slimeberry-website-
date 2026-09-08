'use client';

import { useEffect } from 'react';
import { createStore, useStore } from './store';
import type { CameraPreset } from './cameraFraming';

export interface ProductionStage {
  id: string;
  index: number;
  label: string;
  /** Where the camera goes when this stage is selected. */
  view: CameraPreset;
}

/**
 * Mirrors the physical line: the belt carries slime out of the wall discharge,
 * through QC, filling and labelling, and packaging closes it on the right.
 */
export const STAGES: ProductionStage[] = [
  { id: 'grow', index: 1, label: 'Grow', view: 'greenhouse' },
  { id: 'mix', index: 2, label: 'Mix', view: 'mixing' },
  { id: 'texture', index: 3, label: 'Texture', view: 'texture' },
  { id: 'qc', index: 4, label: 'QC', view: 'qc' },
  { id: 'pack', index: 5, label: 'Pack', view: 'packing' },
];

/** Seconds each stage holds before production rolls on. */
const STAGE_SECONDS = 11;

const store = createStore({ current: 2 });

let timer: ReturnType<typeof setInterval> | null = null;
let subscribers = 0;

/**
 * Advances the production line on a shared interval. Reference-counted so the
 * timer exists only while something is actually rendering the stage readout.
 */
export function useProductionStage(): ProductionStage {
  useEffect(() => {
    subscribers += 1;
    if (!timer) {
      timer = setInterval(() => {
        store.set((state) => ({ current: (state.current + 1) % STAGES.length }));
      }, STAGE_SECONDS * 1000);
    }
    return () => {
      subscribers -= 1;
      if (subscribers === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, []);

  const index = useStore(store, (state) => state.current);
  return STAGES[index];
}

export const useStageIndex = () => useStore(store, (state) => state.current);
