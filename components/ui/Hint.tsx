'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useHintDismissed } from '@/lib/interaction';

export function Hint() {
  const ref = useRef<HTMLDivElement>(null);
  const dismissed = useHintDismissed();

  useEffect(() => {
    if (!ref.current) return;
    if (dismissed) {
      gsap.to(ref.current, { autoAlpha: 0, y: 8, duration: 0.4, ease: 'power2.out' });
      return;
    }
    const tween = gsap.fromTo(
      ref.current,
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.7, delay: 1.1, ease: 'power2.out' },
    );
    return () => {
      tween.kill();
    };
  }, [dismissed]);

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute bottom-20 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/75 px-4 py-2 text-center text-xs text-[#5a6172] opacity-0 shadow-[0_2px_12px_rgba(80,60,40,0.12)] backdrop-blur sm:bottom-24 sm:text-sm"
    >
      Drag to look around · meet Juno, Caca and Bimo
    </div>
  );
}
