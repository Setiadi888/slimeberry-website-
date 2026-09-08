'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { setView } from '@/lib/interaction';
import {
  advanceGachapon,
  getReward,
  insertSbCoin,
  PHASE_MS,
  resetGachapon,
  setGachaponOpen,
  useCollectedCount,
  useDistinctCollected,
  useDrawnRewardId,
  useGachaPhase,
  useGachaponOpen,
  useSbCoinBalance,
  type GachaPhase,
} from '@/lib/sbcoin';

/** What the machine says it is doing, per phase. */
const PHASE_COPY: Record<Exclude<GachaPhase, 'idle' | 'reveal'>, string> = {
  insert: 'Coin accepted…',
  crank: 'Turning the handle…',
  dispense: 'A capsule is dropping…',
};

const RARITY_TINT: Record<string, string> = {
  COMMON: '#8b93a3',
  RARE: '#4e9fbe',
  SPECIAL: '#7f6dc0',
  'ULTRA RARE': '#d8a83c',
};

/**
 * The Gachapon interaction. Deliberately a side panel rather than a full-screen
 * takeover: the physical machine stays visible behind it doing the work, which
 * is the whole point of it living inside the factory.
 *
 * The sequence is timed here and the 3D machine reads the same store, so the
 * panel and the machine can never disagree about which phase is running.
 */
export function GachaponPanel() {
  const open = useGachaponOpen();
  const phase = useGachaPhase();
  const balance = useSbCoinBalance();
  const drawnId = useDrawnRewardId();
  const collected = useCollectedCount();
  const distinct = useDistinctCollected();
  const panelRef = useRef<HTMLDivElement>(null);
  const prizeRef = useRef<HTMLDivElement>(null);

  const reward = phase === 'reveal' ? getReward(drawnId) : null;
  const busy = phase === 'insert' || phase === 'crank' || phase === 'dispense';

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const tween = gsap.fromTo(
      panelRef.current,
      { autoAlpha: 0, y: 18, scale: 0.98 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.36, ease: 'power3.out' },
    );
    return () => {
      tween.kill();
    };
  }, [open]);

  // Drives the machine from one phase to the next.
  useEffect(() => {
    if (phase === 'idle' || phase === 'reveal') return;
    const timer = setTimeout(() => advanceGachapon(phase), PHASE_MS[phase]);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (!reward || !prizeRef.current) return;
    const tween = gsap.fromTo(
      prizeRef.current,
      { autoAlpha: 0, scale: 0.6, y: 10 },
      { autoAlpha: 1, scale: 1, y: 0, duration: 0.52, ease: 'back.out(1.8)' },
    );
    return () => {
      tween.kill();
    };
  }, [reward]);

  const close = () => {
    setGachaponOpen(false);
    resetGachapon();
    setView(null);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      // never yank the panel away mid-sequence
      if (event.key === 'Escape' && !busy) close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busy]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close the Gachapon"
        onClick={() => !busy && close()}
        className="fixed inset-0 z-40 cursor-default bg-[#2b2620]/10 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-label="Slimeberry Gachapon"
        className="fixed inset-x-3 bottom-3 z-50 max-h-[64vh] overflow-y-auto rounded-2xl bg-white/95 p-4 shadow-[0_16px_50px_rgba(80,60,40,0.26)] backdrop-blur-md sm:inset-x-auto sm:right-6 sm:top-20 sm:max-h-[72vh] sm:w-[19rem]"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg leading-tight text-[#3f4756]">
            Slimeberry Gachapon
          </h2>
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="shrink-0 text-[11px] uppercase tracking-[0.1em] text-[#9aa0ad] transition hover:text-[#3f4756] disabled:opacity-40"
          >
            Close
          </button>
        </div>

        <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-[#f7f3ec] px-3 py-2">
          <span className="text-base leading-none" aria-hidden>
            🪙
          </span>
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#3f4756] tabular-nums">
            {balance} SB COIN
          </span>
          {collected > 0 && (
            <span className="ml-auto text-[10.5px] text-[#9aa0ad] tabular-nums">
              {collected} pulled · {distinct} different
            </span>
          )}
        </div>

        {busy && (
          <div className="mt-3.5">
            <p className="text-[12.5px] font-medium text-[#4a5262]">{PHASE_COPY[phase]}</p>
            <div className="mt-2 flex gap-[3px]">
              {(['insert', 'crank', 'dispense'] as const).map((step, index) => {
                const order = ['insert', 'crank', 'dispense'] as const;
                const reached = order.indexOf(phase as (typeof order)[number]) >= index;
                return (
                  <span
                    key={step}
                    className="h-1 flex-1 rounded-full transition-colors duration-300"
                    style={{ backgroundColor: reached ? '#e4738f' : 'rgba(0,0,0,0.09)' }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {reward && (
          <div ref={prizeRef} className="mt-3.5 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#9aa0ad]">✨ You got…</p>
            <div
              className="mx-auto mt-2 grid h-20 w-20 place-items-center rounded-2xl text-4xl"
              style={{ backgroundColor: `${reward.colour}2e` }}
              aria-hidden
            >
              {reward.emoji}
            </div>
            <h3 className="mt-2.5 font-display text-[17px] leading-tight text-[#3f4756]">
              {reward.name}
            </h3>
            <span
              className="mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white"
              style={{ backgroundColor: RARITY_TINT[reward.rarity] ?? '#8b93a3' }}
            >
              {reward.rarity}
            </span>
            <p className="mt-2.5 text-[12px] leading-relaxed text-[#6a7080]">{reward.blurb}</p>
          </div>
        )}

        {phase === 'idle' && (
          <p className="mt-3.5 text-[12.5px] leading-relaxed text-[#6a7080]">
            {balance > 0
              ? 'Drop a coin in the slot and give the handle a turn. Every capsule holds something small from the lab.'
              : 'Every order you place earns one SB COIN. Bring one back here and the machine will trade it for a capsule.'}
          </p>
        )}

        <div className="mt-4 space-y-2">
          {balance > 0 && !busy && (
            <button
              type="button"
              onClick={() => insertSbCoin()}
              className="w-full rounded-xl bg-[#e4738f] px-4 py-3 text-[13px] font-semibold text-white transition hover:bg-[#d8607e] active:scale-[0.99]"
            >
              {phase === 'reveal' ? 'Keep collecting · 1 SB COIN' : 'Insert SB COIN'}
            </button>
          )}

          {balance === 0 && !busy && (
            <button
              type="button"
              onClick={close}
              className="w-full rounded-xl bg-black/5 px-4 py-3 text-[13px] font-semibold text-[#5a6172] transition hover:bg-black/10 active:scale-[0.99]"
            >
              {phase === 'reveal' ? 'Close' : 'Back to the lab'}
            </button>
          )}

          {phase === 'reveal' && balance > 0 && (
            <button
              type="button"
              onClick={close}
              className="w-full rounded-xl bg-black/5 px-4 py-2.5 text-[12.5px] font-semibold text-[#5a6172] transition hover:bg-black/10 active:scale-[0.99]"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </>
  );
}
