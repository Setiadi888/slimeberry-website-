'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PALETTE } from '@/lib/palette';
import { setLabReady } from '@/lib/ready';
import { setViewport } from '@/lib/viewport';
import { WORKERS } from '@/lib/workers';
import { STATION_POS } from '@/lib/layout';
import { STATION_PRODUCTS } from '@/lib/products';
import { enterMart } from '@/lib/world';
import { useLabQuality } from './QualityContext';
import { LabEnvironment } from './Environment';
import { LabLighting } from './LabLighting';
import { LabCamera } from './LabCamera';
import { Greenhouse, TextureLab } from './UpstreamStations';
import { Doorway } from './Doorway';
import { Gachapon } from './Gachapon';
import { SlimeMachine } from './SlimeMachine';
import { SlimeTank } from './SlimeTank';
import { DischargeChute } from './DischargeChute';
import { Conveyor } from './Conveyor';
import { QCStation } from './QCStation';
import { FillingMachine, LabellingStation, Trolley } from './DownstreamStations';
import { PackagingStation } from './PackagingStation';
import { DispatchDock } from './DispatchDock';
import { CartFlight } from './CartFlight';
import { ShopShelf } from './ShopShelf';
import { BreakArea } from './BreakArea';
import { Particles } from './Particles';
import { BimoSupplies, CacaTools, HiddenSlimeBlob, JunoNotes, LabLogBoard, Pipes } from './Props';
import { Product } from './Product';
import { SlimeTub } from './SlimeTub';
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
 *   GREENHOUSE → INGREDIENTS → MIXING → TEXTURE
 *   → TRANSFER LINE → QC → FILLING → LABELLING → PACKAGING → DISPATCH
 *
 * Upstream sits along the back wall and the texture lab runs down the left. The
 * belt starts at the discharge hood in the left wall — jars push out through the
 * strip curtain rather than appearing over the belt — crosses the front through
 * QC, filling and labelling, and packaging closes it on the right. The shop and
 * the break corner share the right-hand side. Positions come from `lib/layout.ts`.
 */
export function LabScene() {
  const quality = useLabQuality();

  return (
    <>
      <LabCamera />
      <LabLighting shadows={quality.shadows} shadowMapSize={quality.shadowMapSize} />

      <LabEnvironment />

      {/* 01 growing */}
      <Greenhouse />

      {/* 02 mixing, now stood against the greenhouse, with the tanks it feeds */}
      <SlimeMachine id="mixer" position={[...STATION_POS.mixing]} />
      <JunoNotes position={[STATION_POS.mixing[0] + 1.4, 0.37, STATION_POS.mixing[2] + 0.6]} rotation={-0.4} />
      <SlimeTank id="tank-strawberry" position={[...STATION_POS.tankMain]} color={PALETTE.berry} radius={0.95} listenToSplash />
      <SlimeTank id="tank-matcha" position={[...STATION_POS.tankSecond]} color={PALETTE.mint} radius={0.68} height={1.2} phase={2.1} />
      <Pipes />

      {/* 04 the texture lab, with the reward machine sharing the left wall */}
      <TextureLab />
      <Gachapon />

      {/* 05 the belt, fed by the wall discharge, carrying product east */}
      <DischargeChute />
      <Conveyor />
      <QCStation />
      <CacaTools position={[STATION_POS.qc[0] - 0.45, 1.0, STATION_POS.qc[2] - 0.02]} rotation={-0.2} />
      {/*
        The one jar left in the old format. It is a test batch part-way through
        QC — not packed, not branded, not a Mainline cup yet — which is exactly
        why it still looks like the plain jar everything else used to be.
      */}
      <Product product={STATION_PRODUCTS[0]} position={[STATION_POS.qc[0] + 0.05, 1.0, STATION_POS.qc[2] + 0.26]} scale={0.78} />

      {/* 07-09 filling, labelling, packaging */}
      <FillingMachine />
      <LabellingStation />
      <BimoSupplies position={[STATION_POS.labelling[0] + 0.05, 1.01, STATION_POS.labelling[2] + 0.24]} rotation={0.1} />
      <PackagingStation />
      <SlimeTub product={STATION_PRODUCTS[1]} position={[6.6, 1.28, 2.65]} scale={0.62} />

      {/* dispatch */}
      <DispatchDock position={[...STATION_POS.dispatch]} rotation={-0.35} />
      <Trolley position={[4.6, 0, -2.6]} rotation={0.6} cargoColor={PALETTE.berry} />

      {/* Retail: the cabinet square against the back wall, and the door beside
          it through to SB Mart — the shop area is the join between the rooms. */}
      <ShopShelf position={STATION_POS.shopShelf} />
      <Doorway
        id="martdoor"
        label="SB MART"
        sub="OPEN · THROUGH HERE"
        tint="#4e9fbe"
        glow="#fdf0d8"
        position={STATION_POS.martDoor}
        onEnter={enterMart}
      />

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
