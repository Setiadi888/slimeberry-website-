'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useCartToast } from '@/lib/cart';

export function Toast() {
  const message = useCartToast();
  const [visible, setVisible] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message) {
      setVisible(message);
      return;
    }
    if (!ref.current) {
      setVisible(null);
      return;
    }
    const tween = gsap.to(ref.current, {
      autoAlpha: 0,
      y: -8,
      duration: 0.35,
      ease: 'power2.in',
      onComplete: () => setVisible(null),
    });
    return () => {
      tween.kill();
    };
  }, [message]);

  useEffect(() => {
    if (!visible || !ref.current) return;
    gsap.fromTo(
      ref.current,
      { autoAlpha: 0, y: -12 },
      { autoAlpha: 1, y: 0, duration: 0.45, ease: 'back.out(1.6)' },
    );
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      ref={ref}
      role="status"
      className="pointer-events-none absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-full bg-[#3f4756] px-4 py-2 text-sm text-white shadow-[0_6px_24px_rgba(60,50,45,0.28)] sm:top-24"
    >
      {visible}
    </div>
  );
}
