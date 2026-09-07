'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { finishOrder, useCartFulfilling } from '@/lib/cart';
import { WORKERS } from '@/lib/workers';

/**
 * Order hand-off: the three characters light up in production order, then the
 * van leaves. Pure branding — a GSAP timeline over DOM, no simulation.
 */
export function OrderSequence() {
  const fulfilling = useCartFulfilling();
  const rootRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fulfilling || !rootRef.current || !stepsRef.current) return;

    const steps = Array.from(stepsRef.current.children);
    const timeline = gsap.timeline({ onComplete: finishOrder });

    timeline
      .fromTo(rootRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 })
      .fromTo(
        steps,
        { autoAlpha: 0.25, scale: 0.9, y: 6 },
        { autoAlpha: 1, scale: 1, y: 0, duration: 0.34, ease: 'back.out(2)', stagger: 0.42 },
      )
      .to({}, { duration: 0.7 })
      .to(rootRef.current, { autoAlpha: 0, duration: 0.4 });

    return () => {
      timeline.kill();
    };
  }, [fulfilling]);

  if (!fulfilling) return null;

  return (
    <div
      ref={rootRef}
      role="status"
      className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-[#f2e9de]/70 opacity-0 backdrop-blur-sm"
    >
      <div className="rounded-2xl bg-white/92 px-6 py-5 text-center shadow-[0_16px_50px_rgba(80,60,40,0.24)]">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#9aa0ad]">Order received</p>
        <div ref={stepsRef} className="mt-3 flex items-center gap-2">
          {WORKERS.map((worker) => (
            <div key={worker.id} className="flex flex-col items-center gap-1">
              <span
                className="grid h-11 w-11 place-items-center rounded-full text-lg"
                style={{ backgroundColor: `${worker.appearance.cap}33` }}
                aria-hidden
              >
                {worker.emoji}
              </span>
              <span className="text-[10px] font-medium text-[#5a6172]">{worker.name}</span>
            </div>
          ))}
          <span className="px-1 text-[#c6cbd4]" aria-hidden>
            →
          </span>
          <div className="flex flex-col items-center gap-1">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[#e4738f]/20 text-lg" aria-hidden>
              🚚
            </span>
            <span className="text-[10px] font-medium text-[#5a6172]">Dispatch</span>
          </div>
        </div>
        <p className="mt-3 text-[12px] text-[#6a7080]">Packed by hand at the Slime Lab.</p>
      </div>
    </div>
  );
}
