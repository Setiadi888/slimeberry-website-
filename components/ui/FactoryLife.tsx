'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { startFactoryLife, useThought } from '@/lib/factoryLife';
import { getWorker } from '@/lib/workers';
import { AnchoredCard } from './AnchoredCard';

/**
 * Runs the ambient event scheduler and renders the occasional thought bubble.
 * Kept in the DOM tree rather than the canvas so the bubble is crisp text.
 */
export function FactoryLife() {
  const thought = useThought();
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => startFactoryLife(), []);

  useEffect(() => {
    if (!thought || !bubbleRef.current) return;
    const tween = gsap.fromTo(
      bubbleRef.current,
      { autoAlpha: 0, y: 8, scale: 0.9 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.38, ease: 'back.out(2)' },
    );
    return () => {
      tween.kill();
    };
  }, [thought]);

  if (!thought) return null;
  const worker = getWorker(thought.workerId);
  if (!worker) return null;

  return (
    <AnchoredCard target={{ kind: 'worker', id: thought.workerId }} anchorHeight={1.5}>
      <div ref={bubbleRef} className="relative">
        <div className="rounded-2xl bg-white/92 px-3 py-1.5 text-[11.5px] text-[#4a5262] shadow-[0_6px_20px_rgba(80,60,40,0.16)] backdrop-blur-md">
          {thought.text}
        </div>
        {/* little tail so it reads as a thought, not a label */}
        <span className="absolute -bottom-1 left-4 h-2 w-2 rotate-45 rounded-[2px] bg-white/92" />
      </div>
    </AnchoredCard>
  );
}
