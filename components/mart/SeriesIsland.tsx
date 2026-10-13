'use client';

import { useEffect, useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { BUCKET_PRODUCTS, DESSERT_PRODUCTS, FRUIT_PRODUCTS, type Product } from '@/lib/products';
import { FLOOR_TOP_Y } from '@/lib/layout';
import { MART_POS } from '@/lib/martLayout';
import { PALETTE } from '@/lib/palette';
import { drawContained, drawWordmarkFallback, useBrandImage } from '@/lib/brand';
import { NO_HIT, StationGroup } from '@/components/lab/StationGroup';
import { BOX_HEIGHT, ProductBox, type BoxSeries } from './ProductBox';

const CREAM = '#fbf7f0';
const CREAM_DEEP = '#eee4d6';

/* Each line keeps the colour its own stand had, which is what tells the three
   bays apart now that they share one carcass. */
const PURPLE = '#9a4fbb';
const LEAF = '#7cc62b';
const MINT = '#3f8f48';

const DECK_D = 0.34;
/** Front deck, back deck. The step up is a box-height's worth of daylight. */
const FRONT_Y = FLOOR_TOP_Y + 0.42;
const BACK_Y = FRONT_Y + 0.24;
const FRONT_Z = 0.19;
const BACK_Z = -0.17;

/**
 * One pitch for every box on the island, whichever line it belongs to.
 *
 * This is the whole point of putting the three lines on one carcass: the bays
 * are different widths because the fruit series is twice the size of the other
 * two, but every box stands the same distance from the next one, so the run
 * reads as one shelf rather than as three stands pushed together.
 */
const PITCH = 0.4;

interface Bay {
  id: BoxSeries;
  title: string;
  colour: string;
  products: Product[];
  /** Boxes across the bay; the line's own count is laid out two rows deep. */
  columns: number;
}

const BAYS: Bay[] = [
  { id: 'boba', title: 'boba series', colour: PURPLE, products: BUCKET_PRODUCTS, columns: 2 },
  { id: 'fruit', title: 'fruit series', colour: LEAF, products: FRUIT_PRODUCTS, columns: 4 },
  { id: 'dessert', title: 'dessert world', colour: MINT, products: DESSERT_PRODUCTS, columns: 2 },
];

const BAY_WIDTH = (bay: Bay) => bay.columns * PITCH;
const ISLAND_W = BAYS.reduce((total, bay) => total + BAY_WIDTH(bay), 0);

/** Where each bay's centre falls along the island, left to right. */
const BAY_X = (() => {
  let edge = -ISLAND_W / 2;
  return BAYS.map((bay) => {
    const centre = edge + BAY_WIDTH(bay) / 2;
    edge += BAY_WIDTH(bay);
    return centre;
  });
})();

/** A bay's header board: the wordmark, the line's name, and its own colour. */
function useHeaderTexture(title: string, colour: string, wordmark: HTMLImageElement | null) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = CREAM;
    ctx.beginPath();
    ctx.roundRect(4, 4, 504, 152, 22);
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = colour;
    ctx.stroke();

    if (wordmark) drawContained(ctx, wordmark, 96, 80, 132, 84);
    else drawWordmarkFallback(ctx, 96, 86, 74);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.font = 'italic 800 54px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
    ctx.lineWidth = 11;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(title, 318, 82);
    ctx.fillStyle = colour;
    ctx.fillText(title, 318, 82);

    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    return map;
  }, [title, colour, wordmark]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function BayHeader({ bay, x, wordmark }: { bay: Bay; x: number; wordmark: HTMLImageElement | null }) {
  const header = useHeaderTexture(bay.title, bay.colour, wordmark);
  const width = Math.min(BAY_WIDTH(bay) - 0.08, 0.92);
  return (
    <group position={[x, BACK_Y + 0.62, BACK_Z - 0.12]}>
      <RoundedBox args={[width, width * 0.31, 0.03]} radius={0.03} smoothness={3} castShadow>
        <meshStandardMaterial color={CREAM} roughness={0.7} />
      </RoundedBox>
      <mesh position={[0, 0, 0.018]} raycast={NO_HIT}>
        <planeGeometry args={[width - 0.02, width * 0.31 - 0.02]} />
        <meshStandardMaterial map={header} roughness={0.6} />
      </mesh>
    </group>
  );
}

/**
 * The series island: all three lines on one fixture.
 *
 * It replaces the bucket table, the fruit steps and the dessert podium, which
 * had come to be three different pieces of furniture standing in three corners
 * of a small shop. One carcass, square to the room so it lines up with the wall
 * run behind it, in three bays — boba, fruit, dessert, left to right — each in
 * its old stand's colour and under its own header, so the lines are grouped and
 * labelled rather than mixed.
 *
 * Two decks: the back one a step up, so the row behind clears the row in front.
 * Every box on it stands at the same pitch; the bays are different widths only
 * because the fruit series has eight flavours against the others' four.
 *
 * Both keepers' corridors were re-routed around it — the floor it stands on was
 * the middle of the room, which is exactly where everybody walked.
 */
export function SeriesIsland() {
  const wordmark = useBrandImage('wordmark');

  return (
    <StationGroup id="seriesisland" position={MART_POS.seriesIsland} ringRadius={2.0} ringColor={LEAF}>
      {/* plinth, in the oak the wall run is fitted in */}
      <RoundedBox
        args={[ISLAND_W + 0.06, 0.12, 0.84]}
        radius={0.03}
        smoothness={3}
        position={[0, FLOOR_TOP_Y + 0.06, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={PALETTE.woodDark} roughness={0.82} />
      </RoundedBox>
      {/* the body, and the two decks across it */}
      <mesh position={[0, (FLOOR_TOP_Y + FRONT_Y) / 2 + 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[ISLAND_W - 0.1, FRONT_Y - FLOOR_TOP_Y - 0.06, 0.72]} />
        <meshStandardMaterial color={CREAM_DEEP} roughness={0.72} />
      </mesh>
      <RoundedBox
        args={[ISLAND_W, 0.08, DECK_D]}
        radius={0.025}
        smoothness={3}
        position={[0, FRONT_Y - 0.04, FRONT_Z]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={CREAM} roughness={0.6} />
      </RoundedBox>
      <RoundedBox
        args={[ISLAND_W, 0.08, DECK_D]}
        radius={0.025}
        smoothness={3}
        position={[0, BACK_Y - 0.04, BACK_Z]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={CREAM} roughness={0.6} />
      </RoundedBox>
      {/* the riser under the back deck, so it reads as a step and not a shelf */}
      <mesh position={[0, (FRONT_Y + BACK_Y) / 2 - 0.04, BACK_Z - DECK_D / 2 + 0.03]} castShadow raycast={NO_HIT}>
        <boxGeometry args={[ISLAND_W - 0.04, BACK_Y - FRONT_Y, 0.06]} />
        <meshStandardMaterial color={CREAM_DEEP} roughness={0.7} />
      </mesh>

      {BAYS.map((bay, index) => {
        const x = BAY_X[index];
        const half = BAY_WIDTH(bay) / 2;
        /* The line's own colour: a lip along the front of its bay, and a fin
           between it and the next one. */
        return (
          <group key={bay.id}>
            <mesh position={[x, FRONT_Y - 0.045, FRONT_Z + DECK_D / 2 + 0.005]} raycast={NO_HIT}>
              <boxGeometry args={[BAY_WIDTH(bay) - 0.03, 0.05, 0.012]} />
              <meshStandardMaterial color={bay.colour} roughness={0.55} />
            </mesh>
            {index < BAYS.length - 1 && (
              <mesh position={[x + half, FRONT_Y + 0.07, 0]} castShadow raycast={NO_HIT}>
                <boxGeometry args={[0.025, 0.14, 0.7]} />
                <meshStandardMaterial color={CREAM_DEEP} roughness={0.7} />
              </mesh>
            )}

            <BayHeader bay={bay} x={x} wordmark={wordmark} />

            {bay.products.map((product, slot) => {
              /* Front row first, then the step behind it — so a line with more
                 flavours than fits across its bay grows backwards, not sideways
                 into its neighbour. */
              const row = Math.floor(slot / bay.columns);
              const column = slot % bay.columns;
              const back = row > 0;
              const offset = (column - (bay.columns - 1) / 2) * PITCH;
              return (
                <ProductBox
                  key={product.id}
                  product={product}
                  series={bay.id}
                  position={[x + offset, (back ? BACK_Y : FRONT_Y) + 0.003, back ? BACK_Z : FRONT_Z]}
                  // the outer boxes turn in a touch, toward whoever is looking
                  rotation={-offset * 0.22}
                />
              );
            })}
          </group>
        );
      })}

      {/* the rail the headers hang from, end to end */}
      {[-ISLAND_W / 2 + 0.06, ISLAND_W / 2 - 0.06].map((x) => (
        <mesh key={x} position={[x, BACK_Y + 0.34, BACK_Z - 0.12]} castShadow raycast={NO_HIT}>
          <cylinderGeometry args={[0.016, 0.016, 0.68, 10]} />
          <meshStandardMaterial color={CREAM_DEEP} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, BACK_Y + 0.66, BACK_Z - 0.12]} castShadow raycast={NO_HIT}>
        <boxGeometry args={[ISLAND_W - 0.08, 0.022, 0.022]} />
        <meshStandardMaterial color={CREAM_DEEP} roughness={0.6} />
      </mesh>
    </StationGroup>
  );
}

/** What the island measures, for anything that has to walk around it. */
export const ISLAND_WIDTH = ISLAND_W;
