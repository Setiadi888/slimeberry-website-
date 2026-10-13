'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { startFactoryLife, useThought } from '@/lib/factoryLife';
import { useHovered, useSelected } from '@/lib/interaction';
import { AnchoredCard } from './AnchoredCard';

/**
 * Runs the ambient event scheduler and renders the occasional thought bubble.
 * Kept in the DOM tree rather than the canvas so the bubble is crisp text.
 */
export function FactoryLife() {
  const thought = useThought();
  const selected = useSelected();
  const hovered = useHovered();
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

  /* Their card already occupies this spot, and the two stack illegibly. If you
     are looking at someone you get what they say out loud, not what they were
     idly thinking a moment earlier — unless they are complaining *about* being
     prodded, which is aimed at you and rides above the card instead. */
  const engaged = (reference: { kind: string; id: string } | null) =>
    reference?.kind === thought.speaker.kind && reference.id === thought.speaker.id;
  if (!thought.insistent && (engaged(selected) || engaged(hovered))) return null;

  return (
    <AnchoredCard target={thought.speaker} anchorHeight={thought.height}>
      <div ref={bubbleRef} className="relative">
        <div
          className={`max-w-[15rem] rounded-2xl px-3 py-1.5 text-[11.5px] shadow-[0_6px_20px_rgba(80,60,40,0.16)] backdrop-blur-md ${
            thought.insistent ? 'bg-[#3f4756]/94 text-white' : 'bg-white/92 text-[#4a5262]'
          }`}
        >
          {thought.text}
        </div>
        {/* little tail so it reads as a thought, not a label */}
        <span
          className={`absolute -bottom-1 left-4 h-2 w-2 rotate-45 rounded-[2px] ${
            thought.insistent ? 'bg-[#3f4756]/94' : 'bg-white/92'
          }`}
        />
      </div>
    </AnchoredCard>
  );
}
