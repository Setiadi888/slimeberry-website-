'use client';

import { useEffect, useState } from 'react';
import { describe } from '@/lib/describe';
import { useHovered, useSelected } from '@/lib/interaction';
import { AnchoredCard } from './AnchoredCard';
import { ProgressBar } from './CardBody';

/** Compact preview that follows whatever the pointer is over. */
export function HoverCard() {
  const hovered = useHovered();
  const selected = useSelected();
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse)');
    const sync = () => setCoarse(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  // touch devices have no hover; they go straight to the detail panel on tap
  if (coarse || !hovered) return null;
  // Once something is open the preview steps aside — otherwise a worker walking
  // under the pointer stacks a second card behind the panel.
  if (selected) return null;

  const content = describe(hovered);
  if (!content) return null;

  return (
    <AnchoredCard target={hovered} anchorHeight={content.anchorHeight}>
      <div className="w-52 rounded-2xl bg-white/88 p-3 shadow-[0_8px_28px_rgba(80,60,40,0.16)] backdrop-blur-md">
        <div className="flex items-center gap-2">
          {content.emoji && <span className="text-base leading-none">{content.emoji}</span>}
          <div className="min-w-0">
            <p className="truncate text-[10px] uppercase tracking-[0.12em]" style={{ color: content.accent }}>
              {content.eyebrow}
            </p>
            <p className="font-display truncate text-sm leading-tight text-[#3f4756]">{content.title}</p>
          </div>
        </div>

        {content.line && (
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-[#6a7080]">
            {hovered.kind === 'worker' ? `“${content.line}”` : content.line}
          </p>
        )}

        {content.task && (
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-[#4a5262]">
            <span aria-hidden>{content.task.emoji}</span>
            <span className="truncate">{content.task.label}</span>
          </p>
        )}

        {typeof content.progress === 'number' && (
          <div className="mt-2">
            <ProgressBar value={content.progress} color={content.accent} />
            <p className="mt-1 flex justify-between text-[10px] text-[#8b8f9c]">
              <span className="uppercase tracking-[0.1em]">{content.progressLabel}</span>
              <span>{content.progress}%</span>
            </p>
          </div>
        )}

        {/* price previews only on actual products — never on worker cards */}
        {hovered.kind === 'product' && content.priceLabel && (
          <p className="mt-1.5 text-xs font-semibold text-[#3f4756]">{content.priceLabel}</p>
        )}
      </div>
    </AnchoredCard>
  );
}
