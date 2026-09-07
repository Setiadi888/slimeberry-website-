'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { setCartOpen, useCartCount } from '@/lib/cart';

export function CartButton() {
  const count = useCartCount();
  const badgeRef = useRef<HTMLSpanElement>(null);
  const previous = useRef(count);

  useEffect(() => {
    if (count === previous.current) return;
    previous.current = count;
    if (!badgeRef.current) return;
    gsap.fromTo(
      badgeRef.current,
      { scale: 0.4 },
      { scale: 1, duration: 0.55, ease: 'elastic.out(1, 0.5)' },
    );
  }, [count]);

  return (
    <button
      type="button"
      onClick={() => setCartOpen(true)}
      aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}
      className="relative grid h-10 w-10 place-items-center rounded-full bg-white/80 text-[#3f4756] shadow-[0_2px_10px_rgba(80,60,40,0.12)] backdrop-blur transition hover:bg-white"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
        <path d="M6 8h12l-1 11H7L6 8Z" strokeLinejoin="round" />
        <path d="M9.2 8a2.8 2.8 0 0 1 5.6 0" strokeLinecap="round" />
      </svg>
      {count > 0 && (
        <span
          ref={badgeRef}
          className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#e4738f] px-1 text-[11px] font-semibold text-white"
        >
          {count}
        </span>
      )}
    </button>
  );
}
