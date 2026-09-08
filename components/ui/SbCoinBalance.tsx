'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { setView } from '@/lib/interaction';
import { hydrateSbCoin, setGachaponOpen, useSbCoinBalance } from '@/lib/sbcoin';

/** The award popup flies its coin at this element. */
export const SB_COIN_CHIP_ID = 'sb-coin-chip';

/**
 * The wallet, kept deliberately small: a coin, a number, and a way into the
 * machine. Shopping stays the foreground, so it is not rendered at all until
 * there is a coin to spend.
 */
export function SbCoinBalance() {
  const balance = useSbCoinBalance();
  const chipRef = useRef<HTMLButtonElement>(null);
  const previous = useRef(balance);

  // Restored after mount, never during render: the server has no wallet, so
  // reading storage any earlier would produce a hydration mismatch.
  useEffect(() => {
    hydrateSbCoin();
  }, []);

  useEffect(() => {
    if (balance === previous.current) return;
    const grew = balance > previous.current;
    previous.current = balance;
    if (!chipRef.current || !grew) return;
    const tween = gsap.fromTo(
      chipRef.current,
      { scale: 0.68 },
      { scale: 1, duration: 0.62, ease: 'elastic.out(1, 0.5)' },
    );
    return () => {
      tween.kill();
    };
  }, [balance]);

  if (balance < 1) return null;

  return (
    <button
      ref={chipRef}
      id={SB_COIN_CHIP_ID}
      type="button"
      onClick={() => {
        setView('gachapon');
        setGachaponOpen(true);
      }}
      aria-label={`${balance} SB COIN available. Open the Slimeberry Gachapon.`}
      className="flex items-center gap-1.5 rounded-full bg-white/80 py-1.5 pl-2 pr-3 text-[#3f4756] shadow-[0_2px_10px_rgba(80,60,40,0.12)] backdrop-blur transition hover:bg-white"
    >
      <span className="text-sm leading-none" aria-hidden>
        🪙
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] tabular-nums">
        {balance} <span className="hidden sm:inline">SB COIN</span>
      </span>
    </button>
  );
}
