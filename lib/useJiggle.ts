'use client';

import { useCallback, useRef } from 'react';

/**
 * Critically-ish damped spring used for squash-and-stretch.
 *
 * Kept as a hook driven from `useFrame` rather than a GSAP tween: it needs to
 * accept repeated impulses mid-flight (clicking a wobbling tank again should
 * add energy, not restart a tween) and it costs nothing per frame.
 */
export function useJiggle(stiffness = 120, damping = 9) {
  const state = useRef({ value: 0, velocity: 0 });

  const impulse = useCallback((strength = 1) => {
    state.current.velocity += strength;
  }, []);

  const update = useCallback(
    (delta: number) => {
      const step = Math.min(delta, 1 / 30); // guard against tab-restore spikes
      const s = state.current;
      s.velocity += (-stiffness * s.value - damping * s.velocity) * step;
      s.value += s.velocity * step;
      if (Math.abs(s.value) < 0.0001 && Math.abs(s.velocity) < 0.0001) {
        s.value = 0;
        s.velocity = 0;
      }
      return s.value;
    },
    [stiffness, damping],
  );

  return { impulse, update };
}
