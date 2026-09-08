'use client';

import { useState } from 'react';
import { setAboutOpen } from '@/lib/about';
import { enterLab, enterMart, useRoom, useRoomPhase } from '@/lib/world';
import { CartButton } from './CartButton';
import { SbCoinBalance } from './SbCoinBalance';
import { SoundToggle } from './SoundToggle';

export function Navigation() {
  const room = useRoom();
  const travelling = useRoomPhase() !== 'still';
  const inMart = room === 'mart';
  const [markMissing, setMarkMissing] = useState(false);

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4 sm:px-8 sm:py-6">
      <div className="pointer-events-auto flex items-center gap-2.5">
        {/* The house mark. Falls back to the initials until the artwork is
            dropped into public/brand — held in state rather than mutating the
            DOM from the error handler, which would re-append on every render. */}
        <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-[#8cb63c] text-[12px] font-extrabold tracking-tight text-white shadow-[0_2px_10px_rgba(120,150,60,0.32)]">
          {markMissing ? (
            <span aria-hidden>SB</span>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src="/brand/sb-flower-green.png"
              alt=""
              aria-hidden
              className="h-9 w-9 object-contain"
              onError={() => setMarkMissing(true)}
            />
          )}
        </span>
        <span className="font-display text-lg tracking-tight text-[#3f4756] sm:text-xl">
          Slimeberry
        </span>
        <span className="hidden text-[10px] uppercase tracking-[0.16em] text-[#9aa0ad] sm:inline">
          {inMart ? 'SB Mart' : 'The Lab'}
        </span>
      </div>

      <nav className="pointer-events-auto flex items-center gap-1 sm:gap-3">
        {/* The doors are the real way between the rooms; this is the shortcut
            for anyone who would rather not go looking for one. */}
        <button
          type="button"
          disabled={travelling}
          onClick={() => (inMart ? enterLab() : enterMart())}
          className="rounded-full px-3 py-1.5 text-sm text-[#5a6172] transition hover:bg-white/70 disabled:opacity-40"
        >
          {inMart ? 'The Lab' : 'SB Mart'}
        </button>
        <button
          type="button"
          onClick={() => setAboutOpen(true)}
          className="rounded-full px-3 py-1.5 text-sm text-[#5a6172] transition hover:bg-white/70"
        >
          About us
        </button>
        <SbCoinBalance />
        <SoundToggle />
        <CartButton />
      </nav>
    </header>
  );
}
