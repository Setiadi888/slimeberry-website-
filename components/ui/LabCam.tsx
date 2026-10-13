'use client';

import { useCrew, useCrewMotion } from '@/lib/shift';

/**
 * A quiet nod to the conceit that you are watching the lab through a camera —
 * which is why the workers occasionally wave at it rather than at you.
 *
 * It also carries the one thing about the room a visitor cannot work out by
 * looking: which shift they are watching. The light changes and the faces change
 * with it, but only this says so in words, and only while there is something to
 * say — the middle of a handover is the interesting minute.
 */
export function LabCam() {
  const crew = useCrew();
  const motion = useCrewMotion();
  const changing = motion !== 'settled';
  const tint = changing ? '#f0a24a' : crew === 'night' ? '#8ea6e8' : '#e4738f';
  const label = changing ? 'Shift change' : crew === 'night' ? 'Night shift' : 'Day shift';

  return (
    <div className="pointer-events-none absolute left-5 top-16 z-20 flex items-center gap-1.5 sm:left-8 sm:top-20">
      <span className="relative flex h-1.5 w-1.5">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
          style={{ backgroundColor: tint }}
        />
        <span
          className="relative inline-flex h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: tint }}
        />
      </span>
      <span className="text-[9px] uppercase tracking-[0.18em] text-[#9aa0ad]">
        Lab Cam 01 · {label}
      </span>
    </div>
  );
}
