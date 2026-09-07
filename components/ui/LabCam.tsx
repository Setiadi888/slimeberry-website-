'use client';

/**
 * A quiet nod to the conceit that you are watching the lab through a camera —
 * which is why the workers occasionally wave at it rather than at you.
 */
export function LabCam() {
  return (
    <div className="pointer-events-none absolute left-5 top-16 z-20 flex items-center gap-1.5 sm:left-8 sm:top-20">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e4738f] opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#e4738f]" />
      </span>
      <span className="text-[9px] uppercase tracking-[0.18em] text-[#9aa0ad]">Lab Cam 01</span>
    </div>
  );
}
