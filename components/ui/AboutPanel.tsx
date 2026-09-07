'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ABOUT_CONTENT, setAboutOpen, useAboutOpen } from '@/lib/about';

/**
 * The About reader. Long-form copy needs room to breathe, so this is a proper
 * scrollable sheet rather than one of the small floating cards — but it keeps
 * the same soft, premium surface as the rest of the interface.
 */
export function AboutPanel() {
  const open = useAboutOpen();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const tween = gsap.fromTo(
      panelRef.current,
      { autoAlpha: 0, y: 22, scale: 0.985 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.42, ease: 'power3.out' },
    );
    return () => {
      tween.kill();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAboutOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close about"
        onClick={() => setAboutOpen(false)}
        className="fixed inset-0 z-[55] cursor-default bg-[#2b2620]/18 backdrop-blur-[3px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-label="About Slimeberry"
        className="fixed inset-x-3 bottom-3 top-16 z-[56] overflow-y-auto overscroll-contain rounded-2xl bg-white/95 shadow-[0_18px_60px_rgba(80,60,40,0.28)] backdrop-blur-md sm:inset-x-auto sm:right-6 sm:top-20 sm:bottom-6 sm:w-[26rem]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white/92 px-5 py-3 backdrop-blur-md">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#9aa0ad]">Slimeberry</span>
          <button
            type="button"
            onClick={() => setAboutOpen(false)}
            className="text-[11px] uppercase tracking-[0.1em] text-[#9aa0ad] transition hover:text-[#3f4756]"
          >
            Close
          </button>
        </div>

        <div className="px-5 pb-7">
          {ABOUT_CONTENT.map((block, index) => {
            if (block.type === 'title') {
              return (
                <h2
                  key={index}
                  className={`font-display text-[19px] font-bold uppercase tracking-[0.04em] text-[#3f4756] ${
                    index === 0 ? 'mt-1' : 'mt-8 border-t border-black/8 pt-7'
                  }`}
                >
                  {block.text}
                </h2>
              );
            }
            if (block.type === 'subtitle') {
              return (
                <p key={index} className="mt-1 text-[13px] italic text-[#e4738f]">
                  {block.text}
                </p>
              );
            }
            if (block.type === 'lead') {
              return (
                <p key={index} className="mt-4 text-[14px] font-semibold leading-relaxed text-[#3f4756]">
                  {block.text}
                </p>
              );
            }
            if (block.type === 'lines') {
              return (
                <p key={index} className="mt-4 text-[13.5px] leading-[1.75] text-[#5a6172]">
                  {block.text.map((line, lineIndex) => (
                    <span key={lineIndex} className="block">
                      {line}
                    </span>
                  ))}
                </p>
              );
            }
            return (
              <p key={index} className="mt-3.5 text-[13.5px] leading-relaxed text-[#6a7080]">
                {block.text}
              </p>
            );
          })}
        </div>
      </div>
    </>
  );
}
