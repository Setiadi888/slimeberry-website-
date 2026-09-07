'use client';

/**
 * Tiny event buses so scene objects can react to one another without threading
 * refs through the tree — a worker pressing a button starts the mixer, and the
 * cart tells a jar on the shelf to bounce.
 */
export type LabEvent = 'machine:start' | 'tank:splash';

type Handler = () => void;

const handlers = new Map<LabEvent, Set<Handler>>();

export function emitLabEvent(event: LabEvent): void {
  handlers.get(event)?.forEach((handler) => handler());
}

export function onLabEvent(event: LabEvent, handler: Handler): () => void {
  let set = handlers.get(event);
  if (!set) {
    set = new Set();
    handlers.set(event, set);
  }
  set.add(handler);
  return () => {
    set!.delete(handler);
  };
}

type ProductHandler = (productId: string) => void;
const productHandlers = new Set<ProductHandler>();

/** Fired when a product is added to the cart, so its 3D jar can react. */
export function emitProductPulse(productId: string): void {
  productHandlers.forEach((handler) => handler(productId));
}

export function onProductPulse(handler: ProductHandler): () => void {
  productHandlers.add(handler);
  return () => {
    productHandlers.delete(handler);
  };
}
