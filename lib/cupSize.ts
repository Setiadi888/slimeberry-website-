/**
 * One size for every cup a visitor can buy, in both rooms.
 *
 * There are four different containers on the shelves — the Mainline tub, the
 * fruit series cup, the boba bucket and the tub-shaped stock prop — each
 * modelled in its own units at its own proportions. Giving them all the same
 * scale would leave them different sizes. Matching their heights, or their
 * widths, would too, because they are not the same shape: a bucket is wider and
 * squatter than a cup, and a tub squatter again.
 *
 * So they are matched by bulk — across the lid, times across again, times tall —
 * against the fruit series cup, the one the others were asked to match:
 *
 *   model               across   tall    bulk at scale 1
 *   fruit series cup     0.904   1.000   0.817
 *   Mainline tub         0.890   0.707   0.560
 *   boba bucket          0.840   0.640   0.452
 *   stock prop           0.326   0.321   0.0341
 */
const FRUIT_CUP = 0.36;

const BULK = {
  fruit: 0.904 * 0.904 * 1.0,
  tub: 0.89 * 0.89 * 0.707,
  bucket: 0.84 * 0.84 * 0.64,
  prop: 0.326 * 0.326 * 0.321,
} as const;

const matched = (bulk: number) => FRUIT_CUP * Math.cbrt(BULK.fruit / bulk);

export const CUP_SCALE = {
  fruit: FRUIT_CUP,
  tub: matched(BULK.tub),
  bucket: matched(BULK.bucket),
  prop: matched(BULK.prop),
} as const;

/** A Mainline tub at that scale, to the top of its lid and across it — for stacking them. */
export const TUB_HEIGHT = 0.707 * CUP_SCALE.tub;
export const TUB_WIDTH = 0.89 * CUP_SCALE.tub;
