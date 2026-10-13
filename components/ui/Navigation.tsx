'use client';

import { setAboutOpen } from '@/lib/about';
import { useBrandImage } from '@/lib/brand';
import { enterLab, enterMart, useRoom, useRoomPhase } from '@/lib/world';
import { CartButton } from './CartButton';
import { SoundToggle } from './SoundToggle';

export function Navigation() {
  const room = useRoom();
  const travelling = useRoomPhase() !== 'still';
  const inMart = room === 'mart';
  /*
    Through the brand loader like every other mark, rather than an <img> of its
    own pointing at the file. That img asked for the PNG on every load whether
    or not it had been supplied — the one 404 the loader could never stop.
  */
  const mark = useBrandImage('flowerGreen');

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 px-3 py-4 min-[420px]:px-5 sm:px-8 sm:py-6">
      <div className="pointer-events-auto flex items-center gap-2.5">
        {/* The house mark: the real flower once it is supplied, the initials
            until then. */}
        <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#8cb63c] text-[12px] font-extrabold tracking-tight text-white shadow-[0_2px_10px_rgba(120,150,60,0.32)]">
          {mark ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={mark.src} alt="" aria-hidden className="h-9 w-9 object-contain" />
          ) : (
            <span aria-hidden>SB</span>
          )}
        </span>
        {/* The name gives way first on a phone: the mark already says whose
            shop this is, and the room switch is worth more than the word. */}
        <span className="hidden font-display text-lg tracking-tight text-[#3f4756] min-[420px]:inline sm:text-xl">
          Slimeberry
        </span>
        <span className="hidden text-[10px] uppercase tracking-[0.16em] text-[#9aa0ad] sm:inline">
          {inMart ? 'SB Mart' : 'The Lab'}
        </span>
      </div>

      <nav className="pointer-events-auto flex items-center gap-0.5 sm:gap-3">
        {/* The doors are the real way between the rooms; this is the shortcut
            for anyone who would rather not go looking for one. */}
        <button
          type="button"
          disabled={travelling}
          onClick={() => (inMart ? enterLab() : enterMart())}
          className="whitespace-nowrap rounded-full px-2 py-1.5 text-[13px] max-[359px]:px-1.5 text-[#5a6172] transition hover:bg-white/70 disabled:opacity-40 sm:px-3 sm:text-sm"
        >
          {inMart ? 'The Lab' : 'SB Mart'}
        </button>
        <button
          type="button"
          onClick={() => setAboutOpen(true)}
          className="whitespace-nowrap rounded-full px-2 py-1.5 text-[13px] max-[359px]:px-1.5 text-[#5a6172] transition hover:bg-white/70 sm:px-3 sm:text-sm"
        >
          About us
        </button>
        {/* The one link that leaves the diorama: a flat catalogue page for
            anyone who came to read the jars rather than walk around them. */}
        <a
          href="/shop"
          className="whitespace-nowrap rounded-full px-2 py-1.5 text-[13px] max-[359px]:px-1.5 text-[#5a6172] transition hover:bg-white/70 sm:px-3 sm:text-sm"
        >
          Shop
        </a>
        <SoundToggle />
        <CartButton />
      </nav>
    </header>
  );
}
