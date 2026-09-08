'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useRoom, useRoomPhase } from '@/lib/world';

const COPY = {
  lab: { name: 'Slimeberry Lab', line: 'Back onto the factory floor' },
  mart: { name: 'SB Mart', line: 'Mind the step' },
} as const;

/**
 * The threshold between the two rooms.
 *
 * The camera is already closing on the door when this starts, so the wipe only
 * has to cover the instant the scenes swap. It comes in from the sides like a
 * door closing behind you and opens again on the other side, which keeps the
 * move reading as walking through rather than as a page load.
 */
export function RoomTransition() {
  const phase = useRoomPhase();
  const room = useRoom();
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  /** The room being travelled to — during 'leaving', that is not `room` yet. */
  const [heading, setHeading] = useState<'lab' | 'mart'>('mart');

  useEffect(() => {
    if (phase === 'leaving') setHeading(room === 'lab' ? 'mart' : 'lab');
  }, [phase, room]);

  useEffect(() => {
    const panels = [leftRef.current, rightRef.current].filter(Boolean) as HTMLDivElement[];
    if (panels.length === 0) return;

    if (phase === 'leaving') {
      const timeline = gsap.timeline();
      timeline
        .set(panels, { xPercent: (index) => (index === 0 ? -100 : 100) })
        .to(panels, { xPercent: 0, duration: 0.5, ease: 'power2.in' }, 0.28)
        .fromTo(
          labelRef.current,
          { autoAlpha: 0, y: 8 },
          { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' },
          0.6,
        );
      return () => {
        timeline.kill();
      };
    }

    if (phase === 'entering') {
      const timeline = gsap.timeline();
      timeline
        .to(labelRef.current, { autoAlpha: 0, duration: 0.22 }, 0)
        .to(
          panels,
          {
            xPercent: (index: number) => (index === 0 ? -100 : 100),
            duration: 0.62,
            ease: 'power3.out',
          },
          0.06,
        );
      return () => {
        timeline.kill();
      };
    }

    gsap.set(panels, { xPercent: (index: number) => (index === 0 ? -100 : 100) });
    gsap.set(labelRef.current, { autoAlpha: 0 });
  }, [phase]);

  if (phase === 'still') return null;

  const copy = COPY[heading];

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden>
      <div ref={leftRef} className="absolute inset-y-0 left-0 w-1/2 bg-[#f2e9de]" />
      <div ref={rightRef} className="absolute inset-y-0 right-0 w-1/2 bg-[#f2e9de]" />
      <div ref={labelRef} className="absolute inset-0 grid place-items-center opacity-0">
        <div className="text-center">
          <p className="font-display text-xl text-[#3f4756]">{copy.name}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#9aa0ad]">{copy.line}</p>
        </div>
      </div>
    </div>
  );
}
