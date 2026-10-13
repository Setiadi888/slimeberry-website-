'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PALETTE } from '@/lib/palette';
import { squeak } from '@/lib/audio';
import { setLabReady } from '@/lib/ready';
import { setViewport } from '@/lib/viewport';
import { setLifeCast } from '@/lib/factoryLife';
import { useCrew, useCrewMotion } from '@/lib/shift';
import { BIBI, crewWorkers, labCast } from '@/lib/workers';
import { STATION_POS } from '@/lib/layout';
import { enterMart } from '@/lib/world';
import { useLabQuality } from './QualityContext';
import { LabEnvironment } from './Environment';
import { LabLighting } from './LabLighting';
import { LabCamera } from './LabCamera';
import { Greenhouse } from './UpstreamStations';
import { HandSink } from './HandSink';
import { Doorway } from './Doorway';
import { ShiftDoor } from './ShiftDoor';
import { SlimeMachine } from './SlimeMachine';
import { SlimeTank } from './SlimeTank';
import { DischargeChute } from './DischargeChute';
import { Conveyor } from './Conveyor';
import { QCStation } from './QCStation';
import { FillingMachine, LabellingStation, OrderTrolley } from './DownstreamStations';
import { PackagingStation } from './PackagingStation';
import { Palletiser } from './Palletiser';
import { NeonClock } from './NeonClock';
import { PeriodicWall } from './PeriodicWall';
import { BibiModel } from './BibiModel';
import { StaffModel } from './StaffModel';
import { CartFlight } from './CartFlight';
import { ShopShelf } from './ShopShelf';
import { BreakArea } from './BreakArea';
import { Particles } from './Particles';
import { Chalkboard, HiddenSlimeBlob, JunoNotes, Pipes } from './Props';
import { SecurityCamera } from './SecurityCamera';
import { StationSigns } from './StationSign';
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
 *   → TRANSFER LINE → FILLING → PACKAGING → QC → LABELLING → DISPATCH
 *
 * Upstream sits along the back wall and the texture lab runs down the left. The
 * belt starts at the discharge hood in the left wall — jars push out through the
 * strip curtain rather than appearing over the belt — meets the filling gantry
 * almost immediately, goes through the packaging tunnel mid-floor and comes out
 * the far side as boxes, which then pass QC and labelling on their way east. The
 * shop is on the right; the break corner sits at the end of the bench run beside
 * the two desks. Positions come from `lib/layout.ts`.
 */
export function LabScene() {
  const quality = useLabQuality();
  const crew = useCrew();
  const motion = useCrewMotion();
  const onFloor = crewWorkers(crew);

  /*
    Whose thoughts and reactions the ambient scheduler draws from. It follows the
    crew rather than being set once, so the night shift never has the day shift's
    worries put in their heads.
  */
  useEffect(() => {
    setLifeCast(labCast(crew), { tanks: true });
  }, [crew]);

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

      {/* Where the texture bench stood: a walnut sideboard with a fish tank on
          it, and a goldfish in the tank. The reward machine that once shared
          this wall stands in SB Mart, where the coins are actually spent. */}
      <HandSink />

      {/* The staff entrance, between the greenhouse and the texture bench. Shut
          all shift; the one door in the building that opens on a schedule. */}
      <ShiftDoor />

      {/* 05 the belt, fed by the wall discharge, carrying product east */}
      <DischargeChute />
      <Conveyor />
      <QCStation />

      {/* Packaging sits mid-line now: jars go in the west mouth, shippers come
          out the east one, and the palletiser at the end of the belt stacks
          them onto the pallet. */}
      <PackagingStation />
      <Palletiser />

      {/* filling and labelling */}
      <FillingMachine />
      <LabellingStation />

      {/* Orders. The painted dispatch bay and its pallet are gone; the trolley
          that stood beside them took the job over, and gets wheeled about. */}
      <OrderTrolley />

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

      {/* Names on the machines themselves, rather than floating over them. */}
      <StationSigns />

      <Chalkboard position={[0.3, 2.45, -5.36]} />
      {/* Up where the back wall meets the left one, panning the floor. */}
      <SecurityCamera position={[-7.18, 4.78, -5.18]} />

      <NeonClock />
      <PeriodicWall />
      <HiddenSlimeBlob position={[-2.55, 0.3, -4.85]} rotation={0.4} />

      {/*
        Whichever crew is on: three of the six, each drawn from their own mascot
        model. They are keyed by id, so a handover unmounts three characters and
        mounts three others — the incoming three start in the doorway and walk to
        a station, and the outgoing three have already walked out of it by the
        time they go.
      */}
      {onFloor.map((worker) => (
        /*
          A boundary each rather than one around the three, so a crew arrives as
          its models do instead of the whole shift waiting on the slowest file.
        */
        <Suspense key={worker.id} fallback={null}>
          <Worker
            data={worker}
            commute={motion}
            model={worker.glb ? (pose) => <StaffModel pose={pose} src={worker.glb!} /> : undefined}
          />
        </Suspense>
      ))}

      {/*
        Bibi walks the same routing everyone else does — only what gets drawn is
        different. His own Suspense boundary, not the canvas's: the model is
        2.9MB, and hanging the whole room off it would mean an empty Lab until
        the character finished downloading.
      */}
      <Suspense fallback={null}>
        <Worker data={BIBI} voice={squeak} model={(pose) => <BibiModel pose={pose} />} />
      </Suspense>

      <CartFlight />
      <Particles />
      <ReadySignal />
      <ViewportBridge />
    </>
  );
}
