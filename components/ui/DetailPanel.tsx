'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { addToCart, useCartQuantity } from '@/lib/cart';
import { emitProductPulse } from '@/lib/labEvents';
import { describe } from '@/lib/describe';
import { getProduct } from '@/lib/products';
import { selectEntity, setView, useSelected, type EntityRef } from '@/lib/interaction';
import { JOURNEY, traceProduct, useJourney } from '@/lib/journey';
import { setGachaponOpen } from '@/lib/sbcoin';
import { AnchoredCard } from './AnchoredCard';
import { MetricBars, ProgressBar, Stars, TaskRow } from './CardBody';

/**
 * The panel opened by a click. Anchored to its subject like the hover card, so
 * the factory stays the interface rather than being buried under a sheet.
 *
 * Whether it offers an action comes entirely from the descriptor: worker cards
 * carry no CTA, tanks and machines lead to the product, products sell.
 */
export function DetailPanel() {
  const selected = useSelected();
  const [shown, setShown] = useState<EntityRef | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) {
      setShown(selected);
      return;
    }
    if (!bodyRef.current) {
      setShown(null);
      return;
    }
    const tween = gsap.to(bodyRef.current, {
      autoAlpha: 0,
      y: 10,
      scale: 0.97,
      duration: 0.26,
      ease: 'power2.in',
      onComplete: () => setShown(null),
    });
    return () => {
      tween.kill();
    };
  }, [selected]);

  useEffect(() => {
    if (!shown || !bodyRef.current) return;
    const tween = gsap.fromTo(
      bodyRef.current,
      { autoAlpha: 0, y: 14, scale: 0.96 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.42, ease: 'back.out(1.4)' },
    );
    return () => {
      tween.kill();
    };
  }, [shown]);

  const content = describe(shown);
  const product = getProduct(content?.productId);
  const quantity = useCartQuantity(product?.id ?? '');
  const journey = useJourney();

  // Selecting a product traces its route through the line; anything else clears it.
  const tracedId = shown?.kind === 'product' ? shown.id : null;
  useEffect(() => {
    traceProduct(tracedId);
    return () => traceProduct(null);
  }, [tracedId]);

  if (!shown || !content) return null;

  const handleCta = () => {
    if (!content.cta) return;
    if (content.cta.action === 'gachapon') {
      selectEntity(null);
      setView('gachapon');
      setGachaponOpen(true);
      return;
    }
    if (!product) return;
    if (content.cta.action === 'add') {
      addToCart(product);
      emitProductPulse(product.id);
    } else {
      selectEntity({ kind: 'product', id: product.id });
    }
  };

  return (
    <AnchoredCard target={shown} anchorHeight={content.anchorHeight}>
      <div
        ref={bodyRef}
        className="pointer-events-auto w-[17.5rem] rounded-2xl bg-white/92 p-4 shadow-[0_12px_44px_rgba(80,60,40,0.22)] backdrop-blur-md"
      >
        <button
          type="button"
          onClick={() => selectEntity(null)}
          aria-label="Close"
          className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full text-[#9aa0ad] transition hover:bg-black/5 hover:text-[#3f4756]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex items-start gap-2.5 pr-6">
          {content.emoji && <span className="text-xl leading-none">{content.emoji}</span>}
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.13em]" style={{ color: content.accent }}>
              {content.eyebrow}
            </p>
            <h2 className="font-display text-lg leading-tight text-[#3f4756]">{content.title}</h2>
          </div>
        </div>

        {content.line && (
          <p className="mt-2 text-[12.5px] leading-relaxed text-[#6a7080]">
            {shown.kind === 'worker' ? `“${content.line}”` : content.line}
          </p>
        )}

        <TaskRow content={content} />

        {typeof content.progress === 'number' && (
          <div className="mt-2.5">
            <p className="mb-1 text-[9.5px] uppercase tracking-[0.13em] text-[#9aa0ad]">
              {content.progressLabel}
            </p>
            <ProgressBar value={content.progress} color={content.accent} />
            <p className="mt-1 text-right text-[10px] text-[#8b8f9c]">{content.progress}%</p>
          </div>
        )}

        <MetricBars content={content} />

        {content.stats.length > 0 && (
          <dl className="mt-3 space-y-1">
            {content.stats.map((stat) => (
              <div key={stat.label} className="flex items-baseline justify-between gap-3">
                <dt className="text-[10px] uppercase tracking-[0.1em] text-[#9aa0ad]">{stat.label}</dt>
                <dd className="truncate text-[12px] font-medium text-[#4a5262]">{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {content.footnote && (
          <p className="mt-2.5 text-[11px] font-medium" style={{ color: content.accent }}>
            {content.footnote}
          </p>
        )}

        {content.provenance && (
          <p className="mt-2 text-[10.5px] leading-snug text-[#9aa0ad]">{content.provenance}</p>
        )}

        {(content.priceLabel || content.rating) && (
          <div className="mt-3 flex items-center justify-between">
            {content.priceLabel ? (
              <span className="text-sm font-semibold text-[#3f4756]">{content.priceLabel}</span>
            ) : (
              <span />
            )}
            {content.rating && <Stars rating={content.rating} color={content.accent} />}
          </div>
        )}

        {shown.kind === 'product' && journey.productId === shown.id && (
          <div className="mt-3 border-t border-black/8 pt-2.5">
            <p className="text-[9px] uppercase tracking-[0.13em] text-[#9aa0ad]">Made here</p>
            <div className="mt-1.5 flex items-center gap-[3px]">
              {JOURNEY.map((step, index) => (
                <span
                  key={step.id}
                  className="h-1 flex-1 rounded-full transition-colors duration-300"
                  style={{
                    backgroundColor: index <= journey.step ? content.accent : 'rgba(0,0,0,0.09)',
                  }}
                />
              ))}
            </div>
            <p className="mt-1.5 text-[11px] font-medium text-[#4a5262]">
              {JOURNEY[journey.step].label}
              <span className="ml-1 text-[#9aa0ad]">
                · step {journey.step + 1} of {JOURNEY.length}
              </span>
            </p>
          </div>
        )}

        {content.cta && (product || content.cta.action === 'gachapon') && (
          <button
            type="button"
            onClick={handleCta}
            className="mt-3 w-full rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition active:scale-[0.99]"
            style={{ backgroundColor: content.accent }}
          >
            {content.cta.label}
          </button>
        )}

        {content.cta?.action === 'add' && quantity > 0 && (
          <p className="mt-1.5 text-center text-[11px] text-[#8b8f9c]">{quantity} in cart</p>
        )}
      </div>
    </AnchoredCard>
  );
}
