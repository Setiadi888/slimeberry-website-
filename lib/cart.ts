'use client';

import { createStore, useStore } from './store';
import { PRODUCTS, type Product } from './products';
import { recordOrder } from './dashboard';
import { awardSbCoin } from './sbcoin';

export interface CartLine {
  productId: string;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  /** Transient confirmation message, cleared on a timer. */
  toast: string | null;
  open: boolean;
  /** Set while the order-received sequence plays. */
  fulfilling: boolean;
  /**
   * Identifies the order currently being placed. SB COIN is minted against this
   * id, and the wallet remembers which ids it has already paid, so no amount of
   * refreshing or replaying can earn a second coin for the same order.
   */
  orderId: string | null;
}

const cartStore = createStore<CartState>({
  lines: [],
  toast: null,
  open: false,
  fulfilling: false,
  orderId: null,
});

let orderSeq = 0;
const nextOrderId = () => `SB-${Date.now().toString(36)}-${(++orderSeq).toString(36)}`;

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function addToCart(product: Product): void {
  cartStore.set((state) => {
    const existing = state.lines.find((line) => line.productId === product.id);
    const lines = existing
      ? state.lines.map((line) =>
          line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line,
        )
      : [...state.lines, { productId: product.id, quantity: 1 }];

    return { ...state, lines, toast: `${product.name} added to cart` };
  });

  recordOrder(1);

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    cartStore.set((state) => ({ ...state, toast: null }));
  }, 2600);
}

export function clearCart(): void {
  cartStore.set((state) => ({ ...state, lines: [] }));
}

export function setCartOpen(open: boolean): void {
  cartStore.set((state) => (state.open === open ? state : { ...state, open }));
}

export function changeQuantity(productId: string, delta: number): void {
  cartStore.set((state) => ({
    ...state,
    lines: state.lines
      .map((line) =>
        line.productId === productId ? { ...line, quantity: line.quantity + delta } : line,
      )
      .filter((line) => line.quantity > 0),
  }));
}

/**
 * Stand-in for checkout. Plays the hand-off sequence, then empties the basket.
 * A real payment step would slot in here, and would supply the order id rather
 * than one being minted locally.
 */
export function placeOrder(): void {
  cartStore.set((state) =>
    state.fulfilling || state.lines.length === 0
      ? state
      : { ...state, open: false, fulfilling: true, orderId: nextOrderId() },
  );
}

/**
 * The single successful-order state. SB COIN is minted here — never on add to
 * cart, never on opening a product, never on an abandoned checkout.
 */
export function finishOrder(): void {
  const { orderId } = cartStore.get();
  cartStore.set((state) => ({
    ...state,
    fulfilling: false,
    lines: [],
    toast: null,
    orderId: null,
  }));
  awardSbCoin(orderId);
}

export const useCartOpen = () => useStore(cartStore, (state) => state.open);
export const useCartFulfilling = () => useStore(cartStore, (state) => state.fulfilling);

const countLines = (lines: CartLine[]) =>
  lines.reduce((total, line) => total + line.quantity, 0);

export const useCartCount = () => useStore(cartStore, (state) => countLines(state.lines));

/** Cart contents, for the miniature dispatch dock inside the factory. */
export const useCartLines = () => useStore(cartStore, (state) => state.lines);
export const useCartToast = () => useStore(cartStore, (state) => state.toast);

export function useCartTotal(): number {
  return useStore(cartStore, (state) =>
    state.lines.reduce((total, line) => {
      const product = PRODUCTS.find((candidate) => candidate.id === line.productId);
      return product ? total + product.price * line.quantity : total;
    }, 0),
  );
}

/** How many of one product are in the cart — used for the in-scene badge. */
export function useCartQuantity(productId: string): number {
  return useStore(
    cartStore,
    (state) => state.lines.find((line) => line.productId === productId)?.quantity ?? 0,
  );
}
