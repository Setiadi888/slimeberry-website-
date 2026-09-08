'use client';

import { useCallback, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { setView } from '@/lib/interaction';
import { dismissAward, setGachaponOpen, usePendingAward } from '@/lib/sbcoin';
import { SB_COIN_CHIP_ID } from './SbCoinBalance';

/**
 * The post-purchase moment: one SB COIN, struck for the order just placed.
 *
 * The coin sits outside the card's surface in the DOM, so the surface can fade
 * while the coin itself flies on to the wallet chip — which is what makes the
 * currency feel like an object being put somewhere rather than a number going
 * up. If the chip is not on screen yet the coin simply flies to the corner it
 * lives in, so the animation never depends on the wallet having rendered first.
 */
export function SbCoinAward() {
  const pending = usePendingAward();
  const backdropRef = useRef<HTMLButtonElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const coinRef = useRef<HTMLSpanElement>(null);
  const leaving = useRef(false);

  useEffect(() => {
    if (!pending) return;
    leaving.current = false;
    const timeline = gsap.timeline();
    timeline
      .fromTo(backdropRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.26 }, 0)
      .fromTo(
        surfaceRef.current,
        { autoAlpha: 0, y: 22, scale: 0.95 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.42, ease: 'back.out(1.5)' },
        0.05,
      )
      .fromTo(
        coinRef.current,
        { y: -70, scale: 0.3, rotateY: 0, autoAlpha: 0 },
        { y: 0, scale: 1, rotateY: 720, autoAlpha: 1, duration: 0.85, ease: 'back.out(1.7)' },
        0.1,
      );
    return () => {
      timeline.kill();
    };
  }, [pending]);

  /** Sends the coin to the wallet, then clears the popup. */
  const stow = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;

    const coin = coinRef.current;
    if (!coin) {
      dismissAward();
      return;
    }

    const from = coin.getBoundingClientRect();
    const chip = document.getElementById(SB_COIN_CHIP_ID)?.getBoundingClientRect();
    const targetX = chip ? chip.left + chip.width / 2 : window.innerWidth - 108;
    const targetY = chip ? chip.top + chip.height / 2 : 44;

    gsap
      .timeline({ onComplete: dismissAward })
      .to([backdropRef.current, surfaceRef.current], { autoAlpha: 0, duration: 0.26 }, 0)
      .to(
        coin,
        {
          x: targetX - (from.left + from.width / 2),
          y: targetY - (from.top + from.height / 2),
          scale: 0.36,
          autoAlpha: 0.9,
          duration: 0.66,
          ease: 'power2.inOut',
        },
        0,
      )
      .to(coin, { autoAlpha: 0, duration: 0.14 }, 0.58);
  }, []);

  const spend = () => {
    dismissAward();
    setView('gachapon');
    setGachaponOpen(true);
  };

  useEffect(() => {
    if (!pending) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') stow();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending, stow]);

  if (!pending) return null;

  return (
    <div role="status" className="fixed inset-0 z-[70] grid place-items-center px-4">
      <button
        ref={backdropRef}
        type="button"
        aria-label="Dismiss"
        onClick={stow}
        className="absolute inset-0 cursor-default bg-[#2b2620]/25 opacity-0 backdrop-blur-[2px]"
      />

      <div className="relative w-full max-w-[20rem]">
        <div
          ref={surfaceRef}
          className="rounded-2xl bg-white/95 px-5 pb-5 pt-11 text-center opacity-0 shadow-[0_16px_50px_rgba(80,60,40,0.26)] backdrop-blur-md"
        >
          <h2 className="font-display text-[17px] leading-tight text-[#3f4756]">
            You got an SB COIN!
          </h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#6a7080]">
            Thank you for your order. That&apos;s <strong className="font-semibold text-[#3f4756]">1 SB COIN</strong>{' '}
            to spend at the Slimeberry Gachapon.
          </p>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={spend}
              className="flex-1 rounded-xl bg-[#e4738f] px-3 py-2.5 text-[12.5px] font-semibold text-white transition hover:bg-[#d8607e] active:scale-[0.99]"
            >
              Use SB COIN
            </button>
            <button
              type="button"
              onClick={stow}
              className="flex-1 rounded-xl bg-black/5 px-3 py-2.5 text-[12.5px] font-semibold text-[#5a6172] transition hover:bg-black/10 active:scale-[0.99]"
            >
              Maybe later
            </button>
          </div>
        </div>

        {/*
          Outside the surface so it survives the card's fade and can fly on.
          Centred with margins rather than translate utilities: GSAP owns the
          transform on this node, and a Tailwind translate would be wiped.
        */}
        <span
          ref={coinRef}
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -ml-7 -mt-7 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-b from-[#f7dd9c] to-[#e0a83f] text-2xl opacity-0 shadow-[0_6px_18px_rgba(190,140,40,0.42)]"
        >
          🪙
        </span>
      </div>
    </div>
  );
}
