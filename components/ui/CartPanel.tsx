'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  changeQuantity,
  placeOrder,
  setCartOpen,
  useCartLines,
  useCartOpen,
  useCartTotal,
} from '@/lib/cart';
import { formatPrice, getProduct } from '@/lib/products';

/**
 * The purchasing layer. The 3D factory is where products are discovered; this
 * is the plain, reliable surface for reviewing and ordering them.
 */
export function CartPanel() {
  const open = useCartOpen();
  const lines = useCartLines();
  const total = useCartTotal();
  const panelRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCartOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close cart"
        onClick={() => setCartOpen(false)}
        className="fixed inset-0 z-40 cursor-default bg-[#2b2620]/10 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Your basket"
        className="fixed inset-x-3 bottom-3 z-50 max-h-[70vh] overflow-y-auto rounded-2xl bg-white/95 p-4 shadow-[0_16px_50px_rgba(80,60,40,0.26)] backdrop-blur-md sm:inset-x-auto sm:right-6 sm:top-20 sm:w-80 sm:max-h-[70vh]"
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg text-[#3f4756]">Your basket</h2>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            className="text-[11px] uppercase tracking-[0.1em] text-[#9aa0ad] transition hover:text-[#3f4756]"
          >
            Close
          </button>
        </div>

        {lines.length === 0 ? (
          <p className="mt-4 text-[13px] leading-relaxed text-[#6a7080]">
            Nothing packed yet. Explore the lab and tap a jar to add one.
          </p>
        ) : (
          <>
            <ul className="mt-3 space-y-2.5">
              {lines.map((line) => {
                const product = getProduct(line.productId);
                if (!product) return null;
                return (
                  <li key={line.productId} className="flex items-center gap-2.5">
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base"
                      style={{ backgroundColor: `${product.color}33` }}
                      aria-hidden
                    >
                      {product.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-[#3f4756]">{product.name}</p>
                      <p className="text-[11px] text-[#8b8f9c]">{formatPrice(product.price)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`Remove one ${product.name}`}
                        onClick={() => changeQuantity(product.id, -1)}
                        className="grid h-6 w-6 place-items-center rounded-full bg-black/5 text-[#5a6172] transition hover:bg-black/10"
                      >
                        −
                      </button>
                      <span className="w-4 text-center text-[12px] tabular-nums text-[#3f4756]">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Add one ${product.name}`}
                        onClick={() => changeQuantity(product.id, 1)}
                        className="grid h-6 w-6 place-items-center rounded-full bg-black/5 text-[#5a6172] transition hover:bg-black/10"
                      >
                        +
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 flex items-baseline justify-between border-t border-black/8 pt-3">
              <span className="text-[11px] uppercase tracking-[0.12em] text-[#9aa0ad]">Total</span>
              <span className="text-sm font-semibold text-[#3f4756]">{formatPrice(total)}</span>
            </div>

            <button
              type="button"
              onClick={placeOrder}
              className="mt-3 w-full rounded-xl bg-[#e4738f] px-4 py-3 text-[13px] font-semibold text-white transition hover:bg-[#d8607e] active:scale-[0.99]"
            >
              Place order
            </button>
            <p className="mt-2 text-center text-[10.5px] text-[#9aa0ad]">
              Prototype — no payment is taken
            </p>
          </>
        )}
      </div>
    </>
  );
}
