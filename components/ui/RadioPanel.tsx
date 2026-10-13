'use client';

import { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { radioTune } from '@/lib/audio';
import {
  RADIO_MAX,
  RADIO_MIN,
  setRadioOpen,
  transmissionFor,
  tuneRadio,
  useRadioOpen,
  useRadioYear,
} from '@/lib/radio';

/** Deterministic flecks of interference, so a weak band looks like one. */
function noiseFor(year: number, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const n = Math.sin(year * 12.9898 + index * 78.233) * 43758.5453;
    const m = Math.sin(year * 39.425 + index * 12.345) * 24634.6345;
    return {
      left: (n - Math.floor(n)) * 100,
      top: (m - Math.floor(m)) * 100,
    };
  });
}

/**
 * The tuner for the set by the door.
 *
 * A side sheet rather than a takeover, so
 * the radio itself stays visible on the table behind it. The dial is a slider
 * because the shop is read on a phone far more often than not, with a pair of
 * step buttons beside it for anyone hunting a single year.
 *
 * Signal strength is the whole design: it drives the interference over the
 * type, how many bars light, and the noise burst you hear on each click. The
 * quiet years are meant to be nearly unreadable.
 */
export function RadioPanel() {
  const open = useRadioOpen();
  const year = useRadioYear();
  const panelRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const signal = transmissionFor(year);
  const flecks = useMemo(() => noiseFor(year, 26), [year]);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const tween = gsap.fromTo(
      panelRef.current,
      { autoAlpha: 0, y: 18 },
      { autoAlpha: 1, y: 0, duration: 0.32, ease: 'power3.out' },
    );
    return () => {
      tween.kill();
    };
  }, [open]);

  // the transmission resolves out of the noise each time the dial moves
  useEffect(() => {
    if (!open || !textRef.current) return;
    const tween = gsap.fromTo(
      textRef.current,
      { autoAlpha: 0.15, filter: 'blur(3px)' },
      { autoAlpha: 1, filter: 'blur(0px)', duration: 0.34, ease: 'power2.out' },
    );
    return () => {
      tween.kill();
    };
  }, [open, year]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setRadioOpen(false);
      if (event.key === 'ArrowLeft') step(-1);
      if (event.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, year]);

  const dial = (next: number) => {
    if (next === year) return;
    tuneRadio(next);
    radioTune(transmissionFor(next).signal);
  };
  const step = (by: number) => dial(year + by);

  if (!open) return null;

  const bars = Math.round(signal.signal * 5);

  return (
    <>
      <button
        type="button"
        aria-label="Turn the radio off"
        onClick={() => setRadioOpen(false)}
        className="fixed inset-0 z-40 cursor-default bg-[#2b2620]/10 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-label="Radio"
        className="fixed inset-x-3 bottom-3 z-50 rounded-2xl bg-[#2a2622]/95 p-4 text-[#efe6d6] shadow-[0_16px_50px_rgba(30,22,14,0.4)] backdrop-blur-md sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-20 sm:w-[20rem]"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg leading-tight text-[#f6efe2]">The Set</h2>
          <button
            type="button"
            onClick={() => setRadioOpen(false)}
            className="shrink-0 text-[11px] uppercase tracking-[0.1em] text-[#9a9086] transition hover:text-[#f6efe2]"
          >
            Off
          </button>
        </div>

        {/* the tuning eye */}
        <div className="mt-3 rounded-xl bg-[#161310] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="flex items-end justify-between">
            <span
              className="font-display text-4xl leading-none tracking-tight tabular-nums"
              style={{ color: signal.tint }}
            >
              {year}
            </span>
            <span className="flex items-end gap-[3px] pb-1" aria-hidden>
              {[0, 1, 2, 3, 4].map((index) => (
                <span
                  key={index}
                  className="w-[3px] rounded-sm transition-colors duration-200"
                  style={{
                    height: 5 + index * 3,
                    background: index < bars ? signal.tint : 'rgba(239,230,214,0.16)',
                  }}
                />
              ))}
            </span>
          </div>

          <p className="mt-1.5 text-[10px] uppercase tracking-[0.16em] text-[#9a9086]">
            {signal.station}
          </p>

          {/* the transmission, with the band's interference laid over it */}
          <div className="relative mt-2.5 min-h-[3.6rem] overflow-hidden">
            <div ref={textRef}>
              <p
                className="text-[12.5px] leading-snug"
                style={{ opacity: 0.45 + signal.signal * 0.55 }}
              >
                {signal.lines[0]}
              </p>
              {signal.lines[1] && (
                <p
                  className="mt-1 text-[11.5px] leading-snug text-[#c3b8a6]"
                  style={{ opacity: 0.35 + signal.signal * 0.55 }}
                >
                  {signal.lines[1]}
                </p>
              )}
            </div>
            <span className="pointer-events-none absolute inset-0" aria-hidden>
              {flecks.map((fleck, index) => (
                <span
                  key={index}
                  className="absolute h-[2px] w-[7px] rounded-full bg-[#efe6d6]"
                  style={{
                    left: `${fleck.left}%`,
                    top: `${fleck.top}%`,
                    opacity: (1 - signal.signal) * 0.5,
                  }}
                />
              ))}
            </span>
          </div>
        </div>

        {/* the dial */}
        {signal.source && <a href={signal.source} target="_blank" rel="noreferrer"
          className="mt-2 inline-block text-[10px] text-[#c3b8a6] underline decoration-white/20 underline-offset-2 hover:text-white">
          From the archive · {signal.sourceName}
        </a>}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            aria-label="Tune down one year"
            onClick={() => step(-1)}
            disabled={year <= RADIO_MIN}
            className="h-8 w-8 shrink-0 rounded-full bg-white/8 text-base leading-none text-[#efe6d6] transition hover:bg-white/16 disabled:opacity-30"
          >
            −
          </button>
          <input
            type="range"
            min={RADIO_MIN}
            max={RADIO_MAX}
            step={1}
            value={year}
            aria-label={`Dial, ${RADIO_MIN} to ${RADIO_MAX}`}
            onChange={(event) => dial(Number(event.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/14 accent-[#f0c86a]"
          />
          <button
            type="button"
            aria-label="Tune up one year"
            onClick={() => step(1)}
            disabled={year >= RADIO_MAX}
            className="h-8 w-8 shrink-0 rounded-full bg-white/8 text-base leading-none text-[#efe6d6] transition hover:bg-white/16 disabled:opacity-30"
          >
            +
          </button>
        </div>

        <div className="mt-1 flex justify-between text-[9.5px] uppercase tracking-[0.14em] text-[#7d746b]">
          <span>{RADIO_MIN}</span>
          <span>{RADIO_MAX}</span>
        </div>
      </div>
    </>
  );
}
