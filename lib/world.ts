'use client';

import { createStore, useStore } from './store';
import { hoverEntity, selectEntity } from './interaction';

/**
 * The Slimeberry world is two connected rooms, not two pages.
 *
 * The Lab is the large desktop environment; SB Mart is the compact shop behind
 * the door in its back wall. Only one is mounted at a time — they share the
 * canvas, the cart, the SB COIN wallet and every product record, so walking
 * through the door changes what is rendered and nothing else about the session.
 *
 * `phase` drives the walk-through: the camera dollies at the door while the
 * wipe closes, the rooms swap behind it, and the new room's camera pulls back
 * as it opens.
 */
export type RoomId = 'lab' | 'mart';
export type RoomPhase = 'still' | 'leaving' | 'entering';

/** Camera dolly toward the door, then the swap. */
const LEAVE_MS = 900;
/** Reveal on the far side. */
const ENTER_MS = 700;

interface WorldState {
  room: RoomId;
  phase: RoomPhase;
  /** False until the device has been measured, so SSR and hydration agree. */
  resolved: boolean;
}

const store = createStore<WorldState>({ room: 'lab', phase: 'still', resolved: false });

let timers: ReturnType<typeof setTimeout>[] = [];

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

function travel(to: RoomId): void {
  const current = store.get();
  if (current.room === to || current.phase !== 'still') return;

  clearTimers();
  // Drop whatever was open before we go. The other room re-registers its own
  // anchors on mount, so a card left over from this one would point at nothing
  // and drag the arriving camera to a stale position.
  selectEntity(null);
  hoverEntity(null);
  store.set((state) => ({ ...state, phase: 'leaving' }));

  timers.push(
    setTimeout(() => {
      store.set((state) => ({ ...state, room: to, phase: 'entering' }));
      timers.push(
        setTimeout(() => {
          store.set((state) => ({ ...state, phase: 'still' }));
        }, ENTER_MS),
      );
    }, LEAVE_MS),
  );
}

export const enterMart = () => travel('mart');
export const enterLab = () => travel('lab');

/**
 * Picks the room this device should open in. Phones get SB Mart — it is built
 * for them — and everything else gets the Lab. Called from an effect rather
 * than at module scope so the server's markup and the first client render match.
 */
export function resolveInitialRoom(): void {
  if (store.get().resolved) return;
  const phone =
    window.innerWidth < 820 ||
    (window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 1100);
  store.set((state) => ({ ...state, room: phone ? 'mart' : 'lab', resolved: true }));
}

export function stopWorldTimers(): void {
  clearTimers();
}

export const useRoom = () => useStore(store, (state) => state.room);
export const useRoomPhase = () => useStore(store, (state) => state.phase);
export const useRoomResolved = () => useStore(store, (state) => state.resolved);
/** Non-reactive read, for per-frame code. */
export const readRoom = () => store.get();
