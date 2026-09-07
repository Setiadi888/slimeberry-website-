/**
 * Single source of truth for products. The same records drive every 3D object
 * in the factory (display shelf, ingredient cabinet, conveyor), the product
 * panel and the cart — so wiring a real commerce backend later means replacing
 * this module and nothing else.
 */
export type ProductPlacement = 'signature' | 'mini' | 'station';

export interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Whole-rupiah, e.g. 49000 -> Rp 49.000 */
  price: number;
  /** Slime body colour. */
  color: string;
  /** Lid and label colour. */
  accent: string;
  scent: string;
  emoji: string;
  tags: string[];
  rating: number;
  /** Inspection readout, 0-10 (scent is 1-5 and rendered as icons). */
  metrics: { softness: number; stretch: number; gloss: number; scent: number };
  batch: string;
  placement: ProductPlacement;
  /** Position within its fixture, left to right. */
  slot: number;
  /** Future GLB replacement for the procedural jar. */
  model: string;
}

/** The four signature jars on the display cabinet. */
const SIGNATURE: Product[] = [
  {
    id: 'strawberry',
    name: 'Strawberry Cloud',
    tagline: 'Soft-serve pink, jam-thick',
    description:
      'Our first batch and still the favourite. Whipped slowly with real strawberry essence until it stretches like warm taffy.',
    price: 49000,
    color: '#f4879f',
    accent: '#d94f75',
    scent: 'Strawberry Milk',
    emoji: '🍓',
    tags: ['Soft', 'Fluffy', 'Cloud-like'],
    rating: 5,
    metrics: { softness: 9.2, stretch: 9.5, gloss: 10, scent: 5 },
    batch: 'SB-024',
    placement: 'signature',
    slot: 0,
    model: '/models/strawberry.glb',
  },
  {
    id: 'matcha',
    name: 'Matcha Cloud',
    tagline: 'Stone-ground, cloud-soft',
    description:
      'Ceremonial-grade matcha folded through a butter-clear base. Dense, quiet, and faintly grassy when you press it.',
    price: 54000,
    color: '#9dc47f',
    accent: '#5f8c48',
    scent: 'Roasted Matcha',
    emoji: '🍵',
    tags: ['Dense', 'Buttery', 'Slow-pull'],
    rating: 5,
    metrics: { softness: 7.8, stretch: 8.4, gloss: 8.0, scent: 4 },
    batch: 'SB-025',
    placement: 'signature',
    slot: 1,
    model: '/models/matcha.glb',
  },
  {
    id: 'blueberry',
    name: 'Blueberry Cloud',
    tagline: 'Deep, glossy, a little wild',
    description:
      'Cured for two days so the colour settles into a deep bruise-blue. The glossiest jar we make.',
    price: 52000,
    color: '#7f93d8',
    accent: '#4c5da8',
    scent: 'Wild Blueberry',
    emoji: '🫐',
    tags: ['Glossy', 'Thick', 'Deep-set'],
    rating: 4,
    metrics: { softness: 8.1, stretch: 7.6, gloss: 9.8, scent: 4 },
    batch: 'SB-026',
    placement: 'signature',
    slot: 2,
    model: '/models/blueberry.glb',
  },
  {
    id: 'peach',
    name: 'Peach Cloud',
    tagline: 'Sunlit, downy, gentle',
    description:
      'A soft cling batch with fine peach fuzz suspended inside. Warms up fast in the hand and holds its shape.',
    price: 51000,
    color: '#f6b58c',
    accent: '#d98452',
    scent: 'White Peach',
    emoji: '🍑',
    tags: ['Downy', 'Warm', 'Soft-cling'],
    rating: 5,
    metrics: { softness: 9.6, stretch: 8.8, gloss: 7.4, scent: 5 },
    batch: 'SB-027',
    placement: 'signature',
    slot: 3,
    model: '/models/peach.glb',
  },
];

/** Tester-size jars on the ingredient cabinet — small, cheap, fully buyable. */
const MINI_SEED: Array<[string, string, string, string, string, number]> = [
  ['bubblegum', 'Bubblegum Mini', '#f2a8c4', '#d46b93', 'Pink Bubblegum', 19000],
  ['lychee', 'Lychee Mini', '#f7d9e3', '#dba0b6', 'Lychee Rose', 19000],
  ['melon', 'Melon Mini', '#a8d96a', '#7aa844', 'Honey Melon', 21000],
  ['taro', 'Taro Mini', '#b3a4e0', '#7f6dc0', 'Taro Latte', 21000],
  ['mango', 'Mango Mini', '#f7d774', '#d8a83c', 'Alphonso Mango', 22000],
  ['cotton', 'Cotton Mini', '#e7eef7', '#a8bacf', 'Cotton Sugar', 19000],
  ['grape', 'Grape Mini', '#9b8ecb', '#6b5da8', 'Concord Grape', 22000],
  ['mint', 'Mint Mini', '#9fe0d0', '#5fae9b', 'Cool Mint', 21000],
  ['vanilla', 'Vanilla Mini', '#f4e6c8', '#cbae7c', 'Vanilla Bean', 19000],
  ['ocean', 'Ocean Mini', '#8ed0e8', '#4e9fbe', 'Sea Salt Breeze', 22000],
];

const MINIS: Product[] = MINI_SEED.map(([id, name, color, accent, scent, price], index) => ({
  id,
  name,
  tagline: 'Tester size, 60 ml',
  description: `A 60 ml tester of our ${scent.toLowerCase()} batch — enough for a week of fidgeting, mixed from the same base as the full jars.`,
  price,
  color,
  accent,
  scent,
  emoji: '🫙',
  tags: ['Tester', '60 ml'],
  rating: index % 3 === 0 ? 4 : 5,
  metrics: { softness: 8.4, stretch: 8.0, gloss: 8.6, scent: 4 },
  batch: `MN-${String(index + 1).padStart(3, '0')}`,
  placement: 'mini',
  slot: index,
  model: `/models/${id}.glb`,
}));

/**
 * Work-in-progress batches sitting at the stations where they are actually
 * being handled. These exist so product discovery is spread through the
 * factory rather than concentrated in the two cabinets.
 */
const STATION: Product[] = [
  {
    id: 'lavender-wip',
    name: 'Lavender Cloud',
    tagline: 'On the QC bench',
    description:
      "A test batch Caca is part-way through checking. Softer than the shelf jars and still finding its stretch — we release it when she signs it off.",
    price: 47000,
    color: '#c3b3e8',
    accent: '#7f6dc0',
    scent: 'Lavender Milk',
    emoji: '💜',
    tags: ['Test batch', 'Soft', 'Unreleased'],
    rating: 4,
    batch: 'SB-031',
    metrics: { softness: 9.0, stretch: 7.2, gloss: 8.3, scent: 4 },
    placement: 'station',
    slot: 0,
    model: '/models/lavender.glb',
  },
  {
    id: 'honey-wip',
    name: 'Honey Cloud',
    tagline: 'Waiting to be packed',
    description:
      'A small batch already approved and queued at the packing bench. Thick, slow and faintly warm — Bimo boxes these first because they sell out.',
    price: 53000,
    color: '#f0c86a',
    accent: '#c98f3a',
    scent: 'Wildflower Honey',
    emoji: '🍯',
    tags: ['Small batch', 'Thick', 'Slow-pull'],
    rating: 5,
    batch: 'SB-029',
    metrics: { softness: 8.2, stretch: 9.1, gloss: 9.4, scent: 5 },
    placement: 'station',
    slot: 1,
    model: '/models/honey.glb',
  },
];

export const STATION_PRODUCTS = STATION;

export const PRODUCTS: Product[] = [...SIGNATURE, ...MINIS, ...STATION];

export const SIGNATURE_PRODUCTS = SIGNATURE;
export const MINI_PRODUCTS = MINIS;

export function getProduct(id: string | null | undefined): Product | null {
  if (!id) return null;
  return PRODUCTS.find((product) => product.id === id) ?? null;
}

const IDR = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export function formatPrice(price: number): string {
  return IDR.format(price);
}
