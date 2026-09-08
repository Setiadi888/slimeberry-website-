'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  hydrateSound,
  muteAll,
  stopSound,
  toggleEffects,
  toggleMusic,
  useEffectsEnabled,
  useMusicEnabled,
} from '@/lib/audio';

function Switch({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-black/[0.04]"
    >
      <span
        aria-hidden
        className={`relative h-[18px] w-[32px] shrink-0 rounded-full transition-colors ${
          on ? 'bg-[#e4738f]' : 'bg-black/15'
        }`}
      >
        <span
          className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-[left] duration-200 ${
            on ? 'left-[16px]' : 'left-[2px]'
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[12.5px] font-medium text-[#3f4756]">{label}</span>
        <span className="block text-[10.5px] leading-snug text-[#9aa0ad]">{hint}</span>
      </span>
    </button>
  );
}

/**
 * Sound controls.
 *
 * Two switches rather than one, because the shop tune and the world's own
 * noises are different things to want: plenty of people will happily leave the
 * footsteps and the voices on while turning the music off, and a single mute
 * made that impossible.
 *
 * Everything is off on load, every load. Browsers will not start an
 * AudioContext without a gesture, and a page that begins playing by itself is
 * the thing everyone reaches to close.
 */
export function SoundToggle() {
  const music = useMusicEnabled();
  const effects = useEffectsEnabled();
  const anyOn = music || effects;
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hydrateSound();
    return stopSound;
  }, []);

  useEffect(() => {
    if (!open || !menuRef.current) return;
    const tween = gsap.fromTo(
      menuRef.current,
      { autoAlpha: 0, y: -6, scale: 0.97 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.22, ease: 'power3.out' },
    );
    return () => {
      tween.kill();
    };
  }, [open]);

  // close on Escape or on a click anywhere else
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Sound settings"
        title={anyOn ? 'Sound on' : 'Sound off'}
        className="grid h-10 w-10 place-items-center rounded-full bg-white/80 text-[#3f4756] shadow-[0_2px_10px_rgba(80,60,40,0.12)] backdrop-blur transition hover:bg-white"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
          <path d="M4 9.5h3l4.5-3.5v12L7 14.5H4Z" strokeLinejoin="round" />
          {anyOn ? (
            <>
              <path d="M15.5 9.2a3.8 3.8 0 0 1 0 5.6" strokeLinecap="round" />
              <path d="M18 7a7.2 7.2 0 0 1 0 10" strokeLinecap="round" />
            </>
          ) : (
            <path d="M16 9.5l4.5 5M20.5 9.5l-4.5 5" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="dialog"
          aria-label="Sound settings"
          className="absolute right-0 top-12 z-30 w-56 rounded-2xl bg-white/95 p-1.5 opacity-0 shadow-[0_12px_40px_rgba(80,60,40,0.22)] backdrop-blur-md"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[10px] uppercase tracking-[0.16em] text-[#9aa0ad]">
            Sound
          </p>
          <Switch
            label="Music"
            hint="The shop tune"
            on={music}
            onChange={toggleMusic}
          />
          <Switch
            label="Sound effects"
            hint="Footsteps, voices, the door"
            on={effects}
            onChange={toggleEffects}
          />
          {anyOn && (
            <button
              type="button"
              onClick={muteAll}
              className="mt-0.5 w-full rounded-xl px-2.5 py-1.5 text-left text-[11px] text-[#9aa0ad] transition hover:bg-black/[0.04] hover:text-[#5a6172]"
            >
              Turn everything off
            </button>
          )}
        </div>
      )}
    </div>
  );
}
