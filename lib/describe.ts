import { formatPrice, getProduct } from './products';
import { getWorker } from './workers';
import { getMachine, getStation, getTank } from './fixtures';
import type { EntityKind, EntityRef } from './interaction';

export interface CardStat {
  label: string;
  value: string;
}

export interface CardBar {
  label: string;
  value: number;
  max: number;
}

/**
 * One normalised shape for everything the visitor can point at, so the hover
 * card and the detail panel render from a single template rather than a switch
 * per entity type.
 */
export interface CardContent {
  eyebrow: string;
  title: string;
  emoji?: string;
  line?: string;
  /** "CURRENT TASK" row — the batch this subject is handling. */
  task?: { emoji: string; label: string };
  stats: CardStat[];
  bars?: CardBar[];
  progress?: number;
  progressLabel?: string;
  footnote?: string;
  /** "Mixed by Juno · Checked by Caca · Packed by Bimo" */
  provenance?: string;
  accent: string;
  productId?: string;
  priceLabel?: string;
  rating?: number;
  /**
   * Worker cards deliberately carry no call to action: they are character and
   * factory information, not shopping surfaces. Products are discovered through
   * the tanks and the display shelf instead.
   */
  cta?: { label: string; action: 'add' | 'view' | 'gachapon' };
  /** How high above the anchor the card should float, in world units. */
  anchorHeight: number;
}

export function describe(ref: EntityRef | null): CardContent | null {
  if (!ref) return null;

  if (ref.kind === 'worker') {
    const worker = getWorker(ref.id);
    if (!worker) return null;
    const product = getProduct(worker.productId);
    return {
      eyebrow: worker.role,
      title: worker.name,
      emoji: worker.emoji,
      line: worker.dialogue[0],
      task: product ? { emoji: product.emoji, label: product.name } : undefined,
      stats: worker.stats,
      progress: worker.progress,
      progressLabel: worker.status,
      accent: worker.appearance.cap,
      anchorHeight: 1.35,
      // no price, no CTA — see the note on CardContent.cta
    };
  }

  if (ref.kind === 'tank') {
    const tank = getTank(ref.id);
    const product = tank ? getProduct(tank.productId) : null;
    if (!tank || !product) return null;
    return {
      eyebrow: 'Inspect slime',
      title: product.name,
      emoji: product.emoji,
      line: product.tags.join(' • '),
      stats: [
        { label: 'Batch', value: product.batch },
        { label: 'Scent', value: product.emoji.repeat(product.metrics.scent) },
      ],
      bars: [
        { label: 'Softness', value: product.metrics.softness, max: 10 },
        { label: 'Stretch', value: product.metrics.stretch, max: 10 },
        { label: 'Gloss', value: product.metrics.gloss, max: 10 },
      ],
      footnote: 'Approved by Caca ✓',
      provenance: 'Mixed by Juno · Checked by Caca · Packed by Bimo',
      accent: product.accent,
      productId: product.id,
      rating: product.rating,
      cta: { label: 'View product', action: 'view' },
      anchorHeight: 2.3,
    };
  }

  if (ref.kind === 'station') {
    const station = getStation(ref.id);
    if (!station) return null;
    const product = station.productId ? getProduct(station.productId) : null;
    const isGachapon = station.id === 'gachapon';
    return {
      eyebrow: station.step,
      title: station.name,
      emoji: isGachapon ? '🪙' : '🏭',
      line: station.blurb,
      task: product ? { emoji: product.emoji, label: product.name } : undefined,
      stats: station.stats,
      accent: station.accent,
      productId: station.productId,
      cta: isGachapon
        ? { label: 'Open the Gachapon', action: 'gachapon' }
        : product
          ? { label: 'See the slime', action: 'view' }
          : undefined,
      anchorHeight: station.anchorHeight,
    };
  }

  if (ref.kind === 'machine') {
    const machine = getMachine(ref.id);
    const worker = machine ? getWorker(machine.workerId) : null;
    const product = machine ? getProduct(machine.productId) : null;
    if (!machine || !product) return null;
    return {
      eyebrow: `Stage 0${machine.stage} / 0${machine.stages}`,
      title: machine.name,
      emoji: '⚙️',
      line: worker ? `${worker.name} is mixing ${product.name}` : product.name,
      stats: [
        { label: 'Colour', value: 'Pink' },
        { label: 'Texture', value: '82%' },
        { label: 'Scent', value: product.scent },
      ],
      progress: 82,
      progressLabel: 'Mixing',
      accent: product.accent,
      productId: product.id,
      cta: { label: 'See product', action: 'view' },
      anchorHeight: 3.0,
    };
  }

  const product = getProduct(ref.id);
  if (!product) return null;
  return {
    eyebrow: product.placement === 'mini' ? 'Tester size' : product.tagline,
    title: product.name,
    emoji: product.emoji,
    line: product.tags.join(' • '),
    stats: [{ label: 'Scent', value: product.scent }],
    accent: product.accent,
    productId: product.id,
    priceLabel: formatPrice(product.price),
    rating: product.rating,
    provenance: `Batch ${product.batch} · mixed by Juno`,
    cta: { label: 'Add to cart', action: 'add' },
    anchorHeight: 0.95,
  };
}

export const anchorHeightFor = (kind: EntityKind): number =>
  kind === 'machine' ? 3.0 : kind === 'tank' ? 2.3 : kind === 'worker' ? 1.35 : kind === 'station' ? 2.0 : 0.95;
