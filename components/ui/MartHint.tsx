'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useSelected } from '@/lib/interaction';
import { useRoomPhase } from '@/lib/world';

/**
 * SB Mart's only piece of chrome: one line telling a first-time visitor that
 * the shelves are tappable, which retires itself as soon as they tap anything.
 */
export function MartHint() {
  const selected = useSelected();
  const phase = useRoomPhase();
  const [dismissed, setDismissed] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (selected) setDismissed(true);
  }, [selected]);

  useEffect(() => {
    if (dismissed || phase !== 'still' || !ref.current) return;
    const tween = gsap.fromTo(
      ref.current,
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.5, delay: 0.5, ease: 'power2.out' },
    );
    return () => {
      tween.kill();
    };
  }, [dismissed, phase]);

  if (dismissed || phase !== 'still') return null;

  return (
    <p
      ref={ref}
      className="pointer-events-none absolute inset-x-0 bottom-6 z-20 mx-auto w-fit rounded-full bg-white/75 px-4 py-2 text-center text-[12px] text-[#5a6172] opacity-0 shadow-[0_4px_18px_rgba(80,60,40,0.12)] backdrop-blur-md"
    >
      Tap a jar to see it · say hello to Dilan
    </p>
  );
}
