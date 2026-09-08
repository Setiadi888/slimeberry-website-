'use client';

import { createStore, useStore } from './store';

/**
 * SB COIN — the Slimeberry collectible currency, and the Gachapon it opens.
 *
 * One SB COIN is minted per successfully placed order and never for browsing,
 * adding to the cart or abandoning a checkout. Each coin is tied to the order id
 * that earned it and those ids are remembered, so replaying or refreshing the
 * order state can never mint a second coin for the same order.
 *
 * The reward pool is small on purpose: this is a delightful post-purchase
 * moment, not an inventory system.
 */
export type Rarity = 'COMMON' | 'RARE' | 'SPECIAL' | 'ULTRA RARE';

export interface GachaReward {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  /** Capsule and card tint. */
  colour: string;
  blurb: string;
  /** Relative draw weight. */
  weight: number;
}

export const REWARDS: GachaReward[] = [
  {
    id: 'mini-blob',
    name: 'Mini Slime Blob',
    emoji: '🫧',
    rarity: 'COMMON',
    colour: '#8ed0e8',
    blurb: 'A thumb-sized blob that escaped the mixer. It breathes if you watch long enough.',
    weight: 26,
  },
  {
    id: 'tiny-berry',
    name: 'Tiny Berry',
    emoji: '🫐',
    rarity: 'COMMON',
    colour: '#7f93d8',
    blurb: 'Picked this morning from the greenhouse, then shrunk for reasons nobody wrote down.',
    weight: 24,
  },
  {
    id: 'spare-jar',
    name: 'Spare Jar Charm',
    emoji: '🫙',
    rarity: 'COMMON',
    colour: '#a8bacf',
    blurb: 'An empty 60 ml jar, keychain-sized. Bimo makes these when the belt is quiet.',
    weight: 20,
  },
  {
    id: 'sticker',
    name: 'SB Flower Sticker',
    emoji: '🌸',
    rarity: 'RARE',
    colour: '#f2a8c4',
    blurb: 'The same five-petal flower we press onto every lid. Slightly holographic.',
    weight: 14,
  },
  {
    id: 'strawberry-slimeberry',
    name: 'Strawberry Slimeberry',
    emoji: '🍓',
    rarity: 'RARE',
    colour: '#f4879f',
    blurb: 'The house character, in soft-serve pink. The one everybody wants first.',
    weight: 13,
  },
  {
    id: 'juno-figure',
    name: 'Juno Collectible',
    emoji: '🧪',
    rarity: 'SPECIAL',
    colour: '#e4738f',
    blurb: 'Our mixer, roughly 4 cm tall, still holding a scoop of something pink.',
    weight: 8,
  },
  {
    id: 'caca-figure',
    name: 'Caca Collectible',
    emoji: '🔬',
    rarity: 'SPECIAL',
    colour: '#9dc47f',
    blurb: 'Quality control, arms folded, unconvinced. Comes with a miniature clipboard.',
    weight: 7,
  },
  {
    id: 'bimo-figure',
    name: 'Bimo Collectible',
    emoji: '📦',
    rarity: 'SPECIAL',
    colour: '#f3d78c',
    blurb: 'Mid-wave, mid-sentence, holding a box he has already labelled twice.',
    weight: 7,
  },
  {
    id: 'mini-conveyor',
    name: 'Mini Transfer Line',
    emoji: '🏭',
    rarity: 'SPECIAL',
    colour: '#c8d2de',
    blurb: 'A palm-sized section of belt. The rollers turn. We do not know why we made it.',
    weight: 5,
  },
  {
    id: 'golden-slimeberry',
    name: 'Golden Slimeberry',
    emoji: '✨',
    rarity: 'ULTRA RARE',
    colour: '#f0c86a',
    blurb: 'One in every few hundred capsules. Nobody at the lab will admit who paints them.',
    weight: 3,
  },
];

export const getReward = (id: string | null | undefined) =>
  id ? (REWARDS.find((reward) => reward.id === id) ?? null) : null;

export const RARITY_ORDER: Rarity[] = ['COMMON', 'RARE', 'SPECIAL', 'ULTRA RARE'];

/** Sequence the machine plays. Phase durations live in PHASE_MS. */
export type GachaPhase = 'idle' | 'insert' | 'crank' | 'dispense' | 'reveal';

/** Roughly 4.2 s from coin to reveal — inside the 3-6 s the brief asks for. */
export const PHASE_MS: Record<Exclude<GachaPhase, 'idle' | 'reveal'>, number> = {
  insert: 900,
  crank: 1300,
  dispense: 1400,
};

interface SbCoinState {
  balance: number;
  /** Order ids already paid out, so a coin can never be minted twice. */
  awarded: string[];
  /** Reward id -> how many of it the visitor has pulled. */
  collected: Record<string, number>;
  /** Set when an order mints a coin; drives the award popup. */
  pendingAward: string | null;
  /** Gachapon overlay visibility. */
  open: boolean;
  phase: GachaPhase;
  /** performance.now() when the current phase began. */
  phaseAt: number;
  /** Drawn at insert, revealed at the end of the sequence. */
  drawn: string | null;
}

const store = createStore<SbCoinState>({
  balance: 0,
  awarded: [],
  collected: {},
  pendingAward: null,
  open: false,
  phase: 'idle',
  phaseAt: 0,
  drawn: null,
});

/* ------------------------------------------------------------------ storage */

const KEY = 'slimeberry.sbcoin.v1';
let hydrated = false;

/**
 * Restores the wallet after mount rather than at module scope: the server
 * renders a zero balance, so reading storage during the first render would
 * produce a hydration mismatch.
 */
export function hydrateSbCoin(): void {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<SbCoinState>;
    store.set((state) => ({
      ...state,
      balance: Math.max(0, Number(saved.balance) || 0),
      awarded: Array.isArray(saved.awarded) ? saved.awarded.slice(-50) : [],
      collected: saved.collected && typeof saved.collected === 'object' ? saved.collected : {},
    }));
  } catch {
    // private mode, blocked storage, corrupt payload — a fresh wallet is fine
  }
}

function persist(state: SbCoinState): void {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        balance: state.balance,
        // capped so a long-lived wallet cannot grow without bound
        awarded: state.awarded.slice(-50),
        collected: state.collected,
      }),
    );
  } catch {
    // non-fatal: the wallet simply will not survive a reload
  }
}

/* -------------------------------------------------------------------- award */

/**
 * Mints one SB COIN for a completed order. Idempotent per order id, which is
 * what stops a refreshed or replayed order state from paying out twice.
 */
export function awardSbCoin(orderId: string | null): void {
  if (!orderId) return;
  store.set((state) => {
    if (state.awarded.includes(orderId)) return state;
    const next: SbCoinState = {
      ...state,
      balance: state.balance + 1,
      awarded: [...state.awarded, orderId].slice(-50),
      pendingAward: orderId,
    };
    persist(next);
    return next;
  });
}

export function dismissAward(): void {
  store.set((state) => (state.pendingAward === null ? state : { ...state, pendingAward: null }));
}

/* ----------------------------------------------------------------- gachapon */

export function setGachaponOpen(open: boolean): void {
  store.set((state) =>
    state.open === open
      ? state
      : {
          ...state,
          open,
          pendingAward: open ? null : state.pendingAward,
          // leaving mid-sequence resets the machine rather than stranding it
          phase: open ? state.phase : 'idle',
          drawn: open ? state.drawn : null,
        },
  );
}

function drawReward(): string {
  const total = REWARDS.reduce((sum, reward) => sum + reward.weight, 0);
  let roll = Math.random() * total;
  for (const reward of REWARDS) {
    roll -= reward.weight;
    if (roll <= 0) return reward.id;
  }
  return REWARDS[0].id;
}

/**
 * Spends exactly one SB COIN and starts the machine. Returns false when there
 * is nothing to spend or a sequence is already running, so the caller never has
 * to guard the balance itself.
 */
export function insertSbCoin(): boolean {
  let started = false;
  store.set((state) => {
    if (state.balance < 1 || (state.phase !== 'idle' && state.phase !== 'reveal')) return state;
    started = true;
    const next: SbCoinState = {
      ...state,
      balance: state.balance - 1,
      phase: 'insert',
      phaseAt: performance.now(),
      drawn: drawReward(),
      pendingAward: null,
    };
    persist(next);
    return next;
  });
  return started;
}

/** Advances the machine. Called by the overlay's timer, once per phase. */
export function advanceGachapon(from: GachaPhase): void {
  store.set((state) => {
    if (state.phase !== from) return state;
    const order: GachaPhase[] = ['insert', 'crank', 'dispense', 'reveal'];
    const index = order.indexOf(from);
    if (index < 0 || index === order.length - 1) return state;
    const phase = order[index + 1];

    if (phase !== 'reveal') return { ...state, phase, phaseAt: performance.now() };

    // the capsule is open — bank the collectible
    const id = state.drawn;
    const collected = id
      ? { ...state.collected, [id]: (state.collected[id] ?? 0) + 1 }
      : state.collected;
    const next: SbCoinState = { ...state, phase, phaseAt: performance.now(), collected };
    persist(next);
    return next;
  });
}

export function resetGachapon(): void {
  store.set((state) =>
    state.phase === 'idle' ? state : { ...state, phase: 'idle', phaseAt: performance.now(), drawn: null },
  );
}

/* ---------------------------------------------------------------- selectors */

export const useSbCoinBalance = () => useStore(store, (state) => state.balance);
export const usePendingAward = () => useStore(store, (state) => state.pendingAward);
export const useGachaponOpen = () => useStore(store, (state) => state.open);
export const useGachaPhase = () => useStore(store, (state) => state.phase);
export const useDrawnRewardId = () => useStore(store, (state) => state.drawn);
export const useCollectedCount = () =>
  useStore(store, (state) => Object.values(state.collected).reduce((sum, n) => sum + n, 0));
export const useDistinctCollected = () =>
  useStore(store, (state) => Object.keys(state.collected).length);

/** Non-reactive read, for the 3D machine's per-frame animation. */
export const readGacha = () => store.get();
