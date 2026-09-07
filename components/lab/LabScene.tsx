'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PALETTE } from '@/lib/palette';
import { setLabReady } from '@/lib/ready';
import { setViewport } from '@/lib/viewport';
import { WORKERS } from '@/lib/workers';
import { STATION_POS } from '@/lib/layout';
import { STATION_PRODUCTS } from '@/lib/products';
import { useLabQuality } from './QualityContext';
import { LabEnvironment } from './Environment';
import { LabLighting } from './LabLighting';
import { LabCamera } from './LabCamera';
import { Greenhouse, IngredientStore, ColourLab, TextureLab } from './UpstreamStations';
import { SlimeMachine } from './SlimeMachine';
import { SlimeTank } from './SlimeTank';
import { Conveyor } from './Conveyor';
import { QCStation } from './QCStation';
import { FillingMachine, LabellingStation, FinishedGoods, Trolley } from './DownstreamStations';
import { PackagingStation } from './PackagingStation';
import { DispatchDock } from './DispatchDock';
import { CartFlight } from './CartFlight';
import { ProductShelf } from './ProductShelf';
import { MiniShelf } from './MiniShelf';
import { BreakArea } from './BreakArea';
import { Particles } from './Particles';
import { BimoSupplies, CacaTools, HiddenSlimeBlob, JunoNotes, LabLogBoard, Pipes } from './Props';
import { Product } from './Product';
import { Worker } from './Worker';

/** Lifts the loading cover once a real frame has been drawn. */
function ReadySignal() {
  const signalled = useRef(false);
  useFrame(() => {
    if (signalled.current) return;
    signalled.current = true;
    setLabReady();
  });
  return null;
}

/**
 * Publishes the camera and canvas size so the DOM floating cards can project
 * world positions to screen space without React re-rendering every frame.
 */
function ViewportBridge() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  useFrame(() => setViewport(camera, size.width, size.height));
  return null;
}

/**
 * The full line, in physical order:
 *
 *   GREENHOUSE → INGREDIENTS → MIXING → COLOUR → TEXTURE
 *   → CONVEYOR → QC → FILLING → LABELLING → PACKAGING → FINISHED GOODS → DISPATCH
 *
 * Upstream sits along the back wall, the labs run down the left, the belt
 * crosses the front carrying product through QC, filling and labelling, and
 * packaging closes it on the right. Every position comes from `lib/layout.ts`.
 */
export function LabScene() {
  const quality = useLabQuality();

  return (
    <>
      <LabCamera />
      <LabLighting shadows={quality.shadows} shadowMapSize={quality.shadowMapSize} />

      <LabEnvironment />

      {/* 01-02 growing and ingredient holding */}
      <Greenhouse />
      <IngredientStore />

      {/* 03 mixing, with the batch tanks it feeds */}
      <SlimeMachine id="mixer" position={[...STATION_POS.mixing]} />
      <JunoNotes position={[STATION_POS.mixing[0] + 1.4, 0.37, STATION_POS.mixing[2] + 0.6]} rotation={-0.4} />
      <SlimeTank id="tank-strawberry" position={[...STATION_POS.tankMain]} color={PALETTE.berry} radius={0.95} listenToSplash />
      <SlimeTank id="tank-matcha" position={[...STATION_POS.tankSecond]} color={PALETTE.mint} radius={0.68} height={1.2} phase={2.1} />
      <Pipes />

      {/* 04-05 the labs */}
      <ColourLab />
      <TextureLab />
      <Product product={STATION_PRODUCTS[1]} position={[-5.6, 1.01, -0.85]} scale={0.78} />

      {/* 06 the belt, carrying product through the back half of the line */}
      <Conveyor />
      <QCStation />
      <CacaTools position={[STATION_POS.qc[0] - 0.45, 1.0, STATION_POS.qc[2] - 0.02]} rotation={-0.2} />
      <Product product={STATION_PRODUCTS[0]} position={[STATION_POS.qc[0] + 0.05, 1.0, STATION_POS.qc[2] + 0.26]} scale={0.78} />

      {/* 07-09 filling, labelling, packaging */}
      <FillingMachine />
      <LabellingStation />
      <BimoSupplies position={[STATION_POS.labelling[0] + 0.05, 1.01, STATION_POS.labelling[2] + 0.24]} rotation={0.1} />
      <PackagingStation />

      {/* finished stock and dispatch */}
      <FinishedGoods />
      <DispatchDock position={[...STATION_POS.dispatch]} rotation={-0.35} />
      <Trolley position={[4.6, 0, -2.6]} rotation={0.6} cargoColor={PALETTE.berry} />

      {/* retail and rest */}
      <ProductShelf position={[5.6, 0, -4.5]} rotation={0.25} />
      <MiniShelf position={[...STATION_POS.miniShelf]} rotation={Math.PI / 2} />
      <BreakArea />

      <LabLogBoard position={[-7.5, 3.15, -2.6]} rotation={Math.PI / 2} />
      <HiddenSlimeBlob position={[-2.55, 0.3, -4.85]} rotation={0.4} />

      {WORKERS.map((worker) => (
        <Worker key={worker.id} data={worker} />
      ))}

      <CartFlight />
      <Particles />
      <ReadySignal />
      <ViewportBridge />
    </>
  );
}
