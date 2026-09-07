'use client';

import { setAboutOpen } from '@/lib/about';
import { CartButton } from './CartButton';

export function Navigation() {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4 sm:px-8 sm:py-6">
      <div className="pointer-events-auto flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e4738f] text-base shadow-[0_2px_10px_rgba(180,90,110,0.3)]">
          <span aria-hidden>🫐</span>
        </span>
        <span className="font-display text-lg tracking-tight text-[#3f4756] sm:text-xl">Slimeberry</span>
      </div>

      <nav className="pointer-events-auto flex items-center gap-1 sm:gap-3">
        <a
          className="hidden rounded-full px-3 py-1.5 text-sm text-[#5a6172] transition hover:bg-white/70 sm:block"
          href="#"
        >
          Shop
        </a>
        <a
          className="hidden rounded-full px-3 py-1.5 text-sm text-[#5a6172] transition hover:bg-white/70 sm:block"
          href="#"
        >
          The Lab
        </a>
        <button
          type="button"
          onClick={() => setAboutOpen(true)}
          className="rounded-full px-3 py-1.5 text-sm text-[#5a6172] transition hover:bg-white/70"
        >
          About us
        </button>
        <CartButton />
      </nav>
    </header>
  );
}
