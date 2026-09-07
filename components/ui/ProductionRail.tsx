'use client';

import { useEffect, useState } from 'react';
import { setView, useView } from '@/lib/interaction';
import { STAGES, useProductionStage } from '@/lib/production';

/**
 * The five production stages, doubling as factory navigation: the line advances
 * on its own, and tapping a stage flies the camera to where it happens.
 */
export function ProductionRail() {
  const active = useProductionStage();
  const view = useView();
  // Stages 01-03 all happen at the mixing station, so highlighting by camera
  // preset would light three chips at once. Track the chosen chip instead.
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    if (!view) setChosen(null);
  }, [view]);

  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-20 sm:bottom-6 sm:right-6">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-white/72 p-1 shadow-[0_4px_18px_rgba(80,60,40,0.12)] backdrop-blur-md">
        {STAGES.map((stage) => {
          const isLive = stage.id === active.id;
          const isViewing = chosen === stage.id && view === stage.view;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => {
                const next = isViewing ? null : stage.view;
                setChosen(next ? stage.id : null);
                setView(next);
              }}
              aria-label={`Stage ${stage.index}: ${stage.label}`}
              aria-current={isLive ? 'step' : undefined}
              className={`relative rounded-full px-2.5 py-1.5 text-[10px] uppercase tracking-[0.1em] transition ${
                isViewing
                  ? 'bg-[#3f4756] text-white'
                  : isLive
                    ? 'text-[#3f4756]'
                    : 'text-[#9aa0ad] hover:text-[#5a6172]'
              }`}
            >
              <span className="tabular-nums opacity-60">0{stage.index}</span>{' '}
              <span className="hidden sm:inline">{stage.label}</span>
              {isLive && !isViewing && (
                <span className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-[#e4738f]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
