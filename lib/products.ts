/**
 * Single source of truth for products. The same records drive every 3D object
 * in the factory (display shelf, ingredient cabinet, conveyor), the product
 * panel and the cart — so wiring a real commerce backend later means replacing
 * this module and nothing else.
 */
export type ProductPlacement = 'signature' | 'mini' | 'bucket' | 'fruit' | 'dessert' | 'station';

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
  /** A surface that changes how the model is drawn — the one holographic cup. */
  finish?: 'holo';
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
 * The boba buckets: clear handled tubs of glitter slime with squishy black
 * pearls pressed against the wall, under the gingham lid label and the purple
 * SB flower.
 *
 * A range of their own rather than more flavours of the cup. They are a
 * different container, a different price and a different kind of fidget, and
 * they are merchandised apart — their own table in SB Mart, their own section
 * of the catalogue — so the cup line and the bucket line never share a shelf.
 *
 * Listed in the order of the product shot: teal, purple, pink, yellow.
 */
const BUCKETS: Product[] = [
  {
    id: 'boba-blue',
    name: 'Blue Raspberry Boba',
    tagline: 'Glitter bucket, pearls near the top',
    description:
      'Sea-glass teal packed with fine silver glitter, with a few black boba pearls caught just under the lid. The pearls are squishy beads, not food — they only look like it.',
    price: 59000,
    color: '#3cc9c8',
    accent: '#1f9aa0',
    scent: 'Blue Raspberry Slush',
    emoji: '🧋',
    tags: ['Glitter', 'Boba pearls', 'Bucket'],
    rating: 5,
    metrics: { softness: 8.6, stretch: 8.9, gloss: 9.6, scent: 4 },
    batch: 'BB-001',
    placement: 'bucket',
    slot: 0,
    model: '/models/boba-blue.glb',
  },
  {
    id: 'boba-taro',
    name: 'Taro Boba',
    tagline: 'Glitter bucket, pearls sunk to the bottom',
    description:
      'Deep violet with the heaviest glitter load of the four. The pearls sink in this one, so they settle along the bottom like the last of a milk tea.',
    price: 59000,
    color: '#7e3cc4',
    accent: '#5b2a96',
    scent: 'Taro Milk Tea',
    emoji: '🧋',
    tags: ['Glitter', 'Boba pearls', 'Bucket'],
    rating: 5,
    metrics: { softness: 8.2, stretch: 8.4, gloss: 9.8, scent: 5 },
    batch: 'BB-002',
    placement: 'bucket',
    slot: 1,
    model: '/models/boba-taro.glb',
  },
  {
    id: 'boba-strawberry',
    name: 'Strawberry Boba',
    tagline: 'Glitter bucket, a ring of pearls',
    description:
      'Bubblegum pink with iridescent glitter and a ring of pearls just under the lid, which is the first thing you see when you pick it up.',
    price: 59000,
    color: '#f483b9',
    accent: '#d6579a',
    scent: 'Strawberry Milk Tea',
    emoji: '🧋',
    tags: ['Glitter', 'Boba pearls', 'Bucket'],
    rating: 5,
    metrics: { softness: 9.0, stretch: 9.2, gloss: 9.4, scent: 5 },
    batch: 'BB-003',
    placement: 'bucket',
    slot: 2,
    model: '/models/boba-strawberry.glb',
  },
  {
    id: 'boba-mango',
    name: 'Mango Boba',
    tagline: 'Glitter bucket, the most pearls',
    description:
      'Sunny yellow with gold glitter and more pearls than the other three — a full band of them all the way round the top.',
    price: 59000,
    color: '#f3e14e',
    accent: '#cfb21c',
    scent: 'Mango Green Tea',
    emoji: '🧋',
    tags: ['Glitter', 'Boba pearls', 'Bucket'],
    rating: 4,
    metrics: { softness: 8.4, stretch: 8.7, gloss: 9.1, scent: 4 },
    batch: 'BB-004',
    placement: 'bucket',
    slot: 3,
    model: '/models/boba-mango.glb',
  },
];

/**
 * The fruit series cups: small straight-sided cups with a chunky ribbed white
 * lid, a gingham label printed in the flavour's own colour, the SB flower on
 * the front and a thick clear base. Eight flavours, one of them holographic.
 *
 * A line of their own with a stand of their own, like the buckets — never
 * shelved among the older tubs, which share the lid artwork but not the cup.
 */
function fruitCup(
  slot: number,
  cup: Pick<Product, 'id' | 'name' | 'color' | 'accent' | 'scent' | 'emoji' | 'description'> &
    Partial<Pick<Product, 'rating' | 'finish'>>,
): Product {
  const holo = cup.finish === 'holo';
  return {
    tagline: holo ? 'Fruit series, holographic' : 'Fruit series cup',
    price: 29000,
    tags: ['Fruit series', holo ? 'Holographic' : 'Glossy', 'Cup'],
    rating: 5,
    metrics: { softness: 8.8, stretch: 8.6, gloss: holo ? 10 : 9.2, scent: 4 },
    batch: `FS-${String(slot + 1).padStart(3, '0')}`,
    placement: 'fruit',
    slot,
    model: `/models/${cup.id}.glb`,
    ...cup,
  };
}

/** In the order of the product shot: back row, middle row, front row. */
const FRUIT: Product[] = [
  fruitCup(0, {
    id: 'fruit-pineapple',
    name: 'Pineapple Pop',
    color: '#f8b62b',
    accent: '#f39a1e',
    scent: 'Pineapple Candy',
    emoji: '🍍',
    description: 'Sunny orange-yellow and very glossy — the one people pick up first. It smells like the sweet, not the fruit.',
  }),
  fruitCup(1, {
    id: 'fruit-strawberry',
    name: 'Strawberry Pop',
    color: '#fb86a4',
    accent: '#f06a92',
    scent: 'Strawberry Chew',
    emoji: '🍓',
    description: 'Strawberry-milk pink, soft and glossy, and quiet when you press it.',
  }),
  fruitCup(2, {
    id: 'fruit-honeydew',
    name: 'Honeydew Pop',
    color: '#5dd3ad',
    accent: '#35bf97',
    scent: 'Honeydew Melon',
    emoji: '🍈',
    description: 'Cool mint-green, somewhere between a honeydew and a sea-glass bottle. A slow, smooth pull.',
  }),
  fruitCup(3, {
    id: 'fruit-grape',
    name: 'Grape Pop',
    color: '#ab87ea',
    accent: '#9570e0',
    scent: 'Grape Soda',
    emoji: '🍇',
    rating: 4,
    description: 'Lavender-purple with a faint grape-soda smell. It holds its shape a beat longer than the others.',
  }),
  fruitCup(4, {
    id: 'fruit-watermelon',
    name: 'Watermelon Pop',
    color: '#f65d5d',
    accent: '#f5739a',
    scent: 'Watermelon Chew',
    emoji: '🍉',
    description: 'Bright watermelon red — the loudest colour on the stand, and the stretchiest cup in the series.',
  }),
  fruitCup(5, {
    id: 'fruit-blueberry',
    name: 'Blueberry Pop',
    color: '#4aa8ef',
    accent: '#2f8fe0',
    scent: 'Blueberry Soda',
    emoji: '🫐',
    description: 'Sky blue, cool to the touch at first, with a blueberry-soda smell that fades to sweet.',
  }),
  fruitCup(6, {
    id: 'fruit-apple',
    name: 'Green Apple Pop',
    color: '#95d940',
    accent: '#7cc62b',
    scent: 'Sour Green Apple',
    emoji: '🍏',
    rating: 4,
    description: 'Zingy lime green and a little firmer than the rest, which makes it the best one for poking.',
  }),
  fruitCup(7, {
    id: 'fruit-dragonfruit',
    name: 'Dragon Fruit Pop',
    color: '#f0bde8',
    accent: '#e584c0',
    scent: 'Dragon Fruit Fizz',
    emoji: '✨',
    finish: 'holo',
    description: 'Pink-lilac with a holographic shimmer that shifts colour as you turn it — the rare one in the series.',
  }),
];

/**
 * Work-in-progress batches sitting at the stations where they are actually
 * being handled. These exist so product discovery is spread through the
 * factory rather than concentrated in the two cabinets.
 */
/**
 * Dessert World: the newest line, and the only one that was boxed before it was
 * ever loose. Four puddings in a green printed box with a window in the lid, so
 * the series is bought by the box rather than by the cup.
 */
function dessertBox(
  slot: number,
  item: Pick<Product, 'id' | 'name' | 'color' | 'accent' | 'scent' | 'emoji' | 'description'>,
): Product {
  return {
    tagline: 'Dessert World box',
    price: 35000,
    tags: ['Dessert World', 'Boxed', 'Whipped'],
    rating: 5,
    metrics: { softness: 9.4, stretch: 7.8, gloss: 8.2, scent: 5 },
    batch: `DW-${String(slot + 1).padStart(3, '0')}`,
    placement: 'dessert',
    slot,
    model: '/models/box-dessert-world.glb',
    ...item,
  };
}

const DESSERT: Product[] = [
  dessertBox(0, {
    id: 'dessert-pandan',
    name: 'Pandan Custard',
    color: '#8cc96a',
    accent: '#4f9e43',
    scent: 'Pandan & Coconut',
    emoji: '🍮',
    description:
      'Soft green custard slime with a slow, heavy fold — the one that smells like the kitchen on a Sunday. Thickest of the four.',
  }),
  dessertBox(1, {
    id: 'dessert-klappertaart',
    name: 'Klappertaart',
    color: '#f6e3c0',
    accent: '#d8ab6a',
    scent: 'Coconut & Cinnamon',
    emoji: '🥥',
    description:
      'Buttery cream with shredded coconut through it. Pulls apart in sheets and smells faintly of cinnamon toast.',
  }),
  dessertBox(2, {
    id: 'dessert-cendol',
    name: 'Cendol',
    color: '#cfe9b4',
    accent: '#7f5a3a',
    scent: 'Palm Sugar & Coconut',
    emoji: '🍧',
    description:
      'Pale coconut body with green jelly worms suspended in it and a dark ribbon of palm sugar that never quite mixes in.',
  }),
  dessertBox(3, {
    id: 'dessert-es-teler',
    name: 'Es Teler',
    color: '#fde9ef',
    accent: '#ef7fa4',
    scent: 'Avocado, Jackfruit & Milk',
    emoji: '🍨',
    description:
      'Milky pink with pieces through it, the way the drink arrives. Loud when you press it, which is the point.',
  }),
];

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

export const PRODUCTS: Product[] = [...SIGNATURE, ...MINIS, ...BUCKETS, ...FRUIT, ...DESSERT, ...STATION];

export const SIGNATURE_PRODUCTS = SIGNATURE;
export const MINI_PRODUCTS = MINIS;
export const BUCKET_PRODUCTS = BUCKETS;
export const FRUIT_PRODUCTS = FRUIT;
export const DESSERT_PRODUCTS = DESSERT;

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
