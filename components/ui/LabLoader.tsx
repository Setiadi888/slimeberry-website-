'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useLabReady } from '@/lib/ready';

/**
 * Covers the canvas until the scene has actually rendered a frame, rather than
 * guessing with a timer.
 */
export function LabLoader() {
  const ready = useLabReady();
  const ref = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dotsRef.current) return;
    const tween = gsap.to(dotsRef.current.children, {
      y: -7,
      duration: 0.42,
      ease: 'sine.inOut',
      stagger: { each: 0.12, repeat: -1, yoyo: true },
      repeat: -1,
      yoyo: true,
    });
    return () => {
      tween.kill();
    };
  }, []);

  useEffect(() => {
    if (!ready || !ref.current) return;
    const tween = gsap.to(ref.current, {
      autoAlpha: 0,
      duration: 0.6,
      delay: 0.15,
      ease: 'power2.out',
      onComplete: () => {
        if (ref.current) ref.current.style.display = 'none';
      },
    });
    return () => {
      tween.kill();
    };
  }, [ready]);

  return (
    <div ref={ref} className="absolute inset-0 z-40 grid place-items-center bg-[#f2e9de]">
      <div className="flex flex-col items-center gap-4">
        <p className="font-display text-lg text-[#3f4756]">Warming up the lab</p>
        <div ref={dotsRef} className="flex gap-2">
          {['#e4738f', '#9dc47f', '#7f93d8'].map((color) => (
            <span key={color} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          ))}
        </div>
      </div>
    </div>
  );
}
