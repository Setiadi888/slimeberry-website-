/**
 * SB Mart's finishes, after its refit in the manner of a Gentle Monster store.
 *
 * The point of that look is restraint around one big gesture: a near-monochrome
 * room of polished concrete, pale plaster, matte black steel, brushed stainless
 * and pale stone, so the installation in the middle is the only loud thing in
 * it. The product keeps its colour — it is what is for sale — and almost nothing
 * else does.
 *
 * One table for the whole shop, so the room, the fixtures, the island and the
 * installation cannot drift into four slightly different greys.
 */
export const FINISH = {
  /** Polished concrete floor. */
  concrete: '#bdbfbd',
  concreteSeam: '#a8aaa8',
  /** The diorama's base slab, graphite rather than the old warm trim. */
  base: '#3a3b3e',
  /** Pale plaster walls. */
  wall: '#e7e5e0',
  /** Matte black steel — fixture carcasses, the counter's kick, the bags. */
  black: '#1e1f22',
  /** Brushed stainless — uprights, fins, trims. */
  steel: '#c4c8cb',
  /** Pale limestone — shelves and decks, the thing product stands on. */
  stone: '#ece7de',
  /** Travertine — the monolithic volumes: the counter, the island's body. */
  travertine: '#d9cdb8',
  /** Gallery white — the installation's plinth. */
  plinth: '#f3f2ef',
  /** Cool linear LED, in the coves and under the shelves. */
  led: '#eef4ff',
} as const;

/** Material settings that go with them, so a finish reads the same everywhere. */
export const FINISH_PBR = {
  steel: { metalness: 0.85, roughness: 0.32 },
  black: { metalness: 0.25, roughness: 0.58 },
  stone: { metalness: 0, roughness: 0.46 },
  concrete: { metalness: 0.04, roughness: 0.3 },
} as const;
