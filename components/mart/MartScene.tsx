'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls, RoundedBox } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import gsap from 'gsap';
import { PALETTE } from '@/lib/palette';
import {
  MART,
  MART_FACE_X,
  MART_FACE_Z,
  MART_HOME_TARGET,
  MART_POS,
  MART_PRESETS,
  MART_VIEW_DIRECTION,
  martHomePosition,
  solveMartFraming,
  type MartPreset,
} from '@/lib/martLayout';
import { MART_FOV } from '@/lib/martLayout';
import { HOME_FOV } from '@/lib/cameraFraming';
import { drawContained, drawFlowerFallback, BRAND, useBrandImage } from '@/lib/brand';
import { setLabReady } from '@/lib/ready';
import { setViewport } from '@/lib/viewport';
import { getAnchorPosition } from '@/lib/anchors';
import { useSelected } from '@/lib/interaction';
import { enterLab, useRoomPhase } from '@/lib/world';
import { useLabQuality } from '@/components/lab/QualityContext';
import { NO_HIT } from '@/components/lab/StationGroup';
import { Doorway } from '@/components/lab/Doorway';
import { Worker } from '@/components/lab/Worker';
import { KEEPER_MODELS, StaffModel } from '@/components/lab/StaffModel';
import { SeriesIsland } from './SeriesIsland';
import { LabLighting } from '@/components/lab/LabLighting';
import { BotanicalPot } from '@/components/lab/BotanicalPlants';
import { labCast, martCashier, martFloorCashier } from '@/lib/workers';
import { readCrew, useCrew } from '@/lib/shift';
import { setLifeCast, setLifeCat } from '@/lib/factoryLife';
import {
  BlobCarpet,
  Checkout,
  Monstera,
  ShopCat,
  ShopDressing,
  ShoppingTrolley,
  SignatureWall,
  VinylCabinet,
  WestWallCabinets,
} from './MartFixtures';
import { SecurityCamera } from '@/components/lab/SecurityCamera';


/** Which fixture each selectable id frames up. */
const PRESET_FOR: Record<string, MartPreset> = {
  martshelf: 'shelf',
  checkout: 'counter',
  vinyl: 'vinyl',
  seriesisland: 'series',
};

function useMartSignTexture(flower: HTMLImageElement | null): THREE.CanvasTexture | null {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#fbf6ee';
    ctx.fillRect(0, 0, 640, 200);
    ctx.fillStyle = '#e4738f';
    ctx.fillRect(0, 0, 640, 14);
    ctx.fillRect(0, 186, 640, 14);

    // the SB is the flower mark itself, with MART set beside it
    // centred vertically now the tagline underneath it is gone
    if (flower) drawContained(ctx, flower, 196, 100, 140, 140);
    else drawFlowerFallback(ctx, 196, 100, 66, BRAND.green);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#e4738f';
    ctx.font = 'bold 96px ui-rounded, system-ui, sans-serif';
    ctx.fillText('MART', 282, 132);


    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, [flower]);
}

/** The room shell: plinth, floor, two walls, and the fascia sign. */
function MartRoom() {
  const flower = useBrandImage('flowerGreen');
  const sign = useMartSignTexture(flower);
  useEffect(() => () => sign?.dispose(), [sign]);

  return (
    <group>
      <mesh position={[0, -0.71, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={NO_HIT}>
        <circleGeometry args={[16, 48]} />
        <meshStandardMaterial color="#e2d4c0" roughness={0.95} />
      </mesh>
      <ContactShadows
        position={[0, -0.68, 0]}
        scale={16}
        far={1.6}
        blur={2.6}
        opacity={0.32}
        resolution={512}
        frames={1}
        color="#8a7358"
      />

      {/* plinth + floor */}
      <RoundedBox
        args={[MART.width + 0.8, 0.7, MART.depth + 0.8]}
        radius={0.22}
        smoothness={4}
        position={[0, -0.35, 0]}
        receiveShadow
        castShadow
        raycast={NO_HIT}
      >
        <meshStandardMaterial color={PALETTE.floorTrim} roughness={0.85} />
      </RoundedBox>
      <RoundedBox
        args={[MART.width, 0.22, MART.depth]}
        radius={0.09}
        smoothness={3}
        position={[0, 0.02, 0]}
        receiveShadow
        raycast={NO_HIT}
      >
        <meshStandardMaterial color="#f0e6d6" roughness={0.8} />
      </RoundedBox>
      {/* checkerboard hint — a shop floor, not a factory floor */}
      <mesh position={[0, 0.14, 0.3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={NO_HIT}>
        <planeGeometry args={[MART.width - 1.4, MART.depth - 1.6]} />
        <meshStandardMaterial color="#e7dccb" roughness={0.9} />
      </mesh>

      {/* back wall */}
      <RoundedBox
        args={[MART.width, MART.height, 0.34]}
        radius={0.1}
        smoothness={3}
        position={[0, MART.height / 2, MART.wallZ]}
        receiveShadow
        castShadow
        raycast={NO_HIT}
      >
        <meshStandardMaterial color="#f7ece9" roughness={0.92} />
      </RoundedBox>
      <mesh position={[0, 0.62, MART_FACE_Z + 0.02]} raycast={NO_HIT}>
        <boxGeometry args={[MART.width, 0.42, 0.06]} />
        <meshStandardMaterial color={PALETTE.wallTrim} roughness={0.85} />
      </mesh>

      {/* left wall */}
      <RoundedBox
        args={[0.34, MART.height, MART.depth]}
        radius={0.1}
        smoothness={3}
        position={[MART.wallX, MART.height / 2, 0]}
        receiveShadow
        castShadow
        raycast={NO_HIT}
      >
        <meshStandardMaterial color="#f7ece9" roughness={0.92} />
      </RoundedBox>
      <mesh position={[MART_FACE_X + 0.02, 0.62, 0]} raycast={NO_HIT}>
        <boxGeometry args={[0.06, 0.42, MART.depth]} />
        <meshStandardMaterial color={PALETTE.wallTrim} roughness={0.85} />
      </mesh>

      {/* fascia */}
      {sign && (
        <mesh position={[MART_POS.sign[0], MART_POS.sign[1], MART_FACE_Z + 0.06]} castShadow raycast={NO_HIT}>
          <boxGeometry args={[3.0, 0.94, 0.1]} />
          <meshStandardMaterial map={sign} roughness={0.7} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Shop camera. Simpler than the Lab's: no preset rail, no worker tracking — a
 * home framing solved from the aspect, and a close-up when a fixture is tapped.
 */
function MartCamera() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  /* See the note in LabCamera: wait for drei to publish the controls. */
  const attached = useThree((state) => state.controls);
  const selected = useSelected();
  const phase = useRoomPhase();
  const { isCoarsePointer, reducedMotion } = useLabQuality();

  const aspect = size.width / Math.max(size.height, 1);
  const homeDistance = solveMartFraming(aspect);
  /** Guards the one-time walk-in dolly. */
  const arrived = useRef(false);

  /*
    The canvas is created with the Lab's 34° lens. The mart solves its distance
    against a wider 40° one — a small room needs the wider angle to be seen from
    anywhere sensible — so the camera has to actually be told, or the shop
    renders about a sixth tighter than it was framed for. Restored on the way out.
  */
  useEffect(() => {
    const lens = camera as THREE.PerspectiveCamera;
    lens.fov = MART_FOV;
    lens.updateProjectionMatrix();
    return () => {
      lens.fov = HOME_FOV;
      lens.updateProjectionMatrix();
    };
  }, [camera]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const nextPosition = new THREE.Vector3();
    const nextTarget = new THREE.Vector3();

    /*
      Arriving through the door: jump the camera tight to the entrance first, so
      the tween that follows opens the room up around the visitor. This has to
      happen inside the same effect that starts the tween — running it from a
      second effect meant two GSAP timelines animating one camera, and they
      overwrote each other halfway.
    */
    if (!arrived.current) {
      arrived.current = true;
      if (phase === 'entering' && !reducedMotion) {
        camera.position.copy(
          MART_HOME_TARGET.clone().addScaledVector(
            MART_VIEW_DIRECTION,
            Math.max(4.2, homeDistance * 0.42),
          ),
        );
        controls.target.copy(MART_HOME_TARGET);
        controls.update();
      }
    }

    const preset = selected ? PRESET_FOR[selected.id] : undefined;
    const anchor = selected
      ? getAnchorPosition(selected.kind, selected.id, selected.kind === 'product' ? 0.3 : 0.9)
      : null;

    if (phase === 'leaving') {
      // On the way out, close on the door back to the Lab so the wipe lands on
      // the threshold — the mirror of how the Lab hands over.
      nextTarget.set(MART_POS.returnDoor[0], 1.35, MART_POS.returnDoor[2] + 0.25);
      nextPosition.copy(nextTarget).addScaledVector(MART_VIEW_DIRECTION, 3.1);
    } else if (preset) {
      nextTarget.copy(MART_PRESETS[preset].target);
      nextPosition
        .copy(nextTarget)
        .addScaledVector(MART_VIEW_DIRECTION, MART_PRESETS[preset].distance);
    } else if (anchor) {
      nextTarget.copy(anchor);
      nextPosition.copy(anchor).addScaledVector(MART_VIEW_DIRECTION, 3.2).add(new THREE.Vector3(0, 0.3, 0));
    } else {
      nextTarget.copy(MART_HOME_TARGET);
      nextPosition.copy(martHomePosition(aspect));
    }

    if (reducedMotion) {
      camera.position.copy(nextPosition);
      controls.target.copy(nextTarget);
      controls.update();
      return;
    }

    controls.enabled = false;
    const timeline = gsap.timeline({
      defaults: {
        duration: phase === 'leaving' ? 0.82 : 0.95,
        ease: phase === 'leaving' ? 'power2.in' : 'power3.inOut',
        overwrite: 'auto',
      },
      onComplete: () => {
        controls.enabled = true;
      },
    });
    timeline.to(camera.position, { x: nextPosition.x, y: nextPosition.y, z: nextPosition.z }, 0);
    timeline.to(
      controls.target,
      { x: nextTarget.x, y: nextTarget.y, z: nextTarget.z, onUpdate: () => controls.update() },
      0,
    );

    return () => {
      timeline.kill();
      controls.enabled = true;
    };
  }, [selected, phase, attached, camera, aspect, homeDistance, reducedMotion]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan={!isCoarsePointer}
      rotateSpeed={0.4}
      zoomSpeed={0.6}
      minDistance={4.0}
      maxDistance={32}
      minPolarAngle={0.6}
      maxPolarAngle={1.4}
      minAzimuthAngle={0.05}
      maxAzimuthAngle={1.15}
      target={MART_HOME_TARGET}
    />
  );
}

function ReadySignal() {
  const signalled = useRef(false);
  useFrame(() => {
    if (signalled.current) return;
    signalled.current = true;
    setLabReady();
  });
  return null;
}

function ViewportBridge() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  useFrame(() => setViewport(camera, size.width, size.height));
  return null;
}

/**
 * SB Mart.
 *
 * Half the Lab's floor area and a small fraction of its object count: no belt,
 * no production line, one character instead of three, and no particle system.
 * Everything a shopper needs — jars, chiller, island, counter — is a fixture
 * they can tap, and every product uses the very same `Product` component the
 * Lab does, so the cart and the detail panel carry over untouched.
 */
export function MartScene() {
  const { shadows, shadowMapSize } = useLabQuality();
  /*
    The shop keeps the same hours as the factory, and six keepers share it: one
    has it until five in the evening and another through the night. Keyed by id below, so the change of
    shift swaps the character rather than redressing one.
  */
  const crew = useCrew();
  const cashier = martCashier(crew);
  /* And the one who is out on the floor rather than behind the till. */
  const floorKeeper = martFloorCashier(crew);

  // ambient life follows the room: one keeper and a cat, and no machines to rattle
  useEffect(() => {
    setLifeCast([cashier, floorKeeper]);
    setLifeCat('oyen');
    return () => {
      // back to whichever crew is on the factory floor by the time we get there
      setLifeCast(labCast(readCrew()), { tanks: true });
      setLifeCat(null);
    };
  }, [cashier, floorKeeper]);

  return (
    <>
      <MartCamera />
      {/*
        The shop used to carry its own dimmer, flatter rig and read as a much
        darker room than the Lab next door. It now uses the Lab's lighting
        exactly — same key, same fill, same baked environment — so stepping
        through the door is a change of room, not a change of weather.
      */}
      <LabLighting shadows={shadows} shadowMapSize={shadowMapSize} />
      <MartRoom />

      <Doorway
        id="labdoor"
        label="SLIMEBERRY LAB"
        sub="THE FACTORY FLOOR"
        tint="#e4738f"
        glow="#fbe6d2"
        position={MART_POS.returnDoor}
        onEnter={enterLab}
      />

      <SignatureWall />
      {/* all three lines, on one island */}
      <SeriesIsland />
      <VinylCabinet />
      <Checkout />
      {/*
        The keeper's own Suspense boundary, as Bibi has in the Lab: the model is
        1.8MB, and hanging the whole shop off it would mean an empty room until
        the character finished downloading.
      */}
      <Suspense fallback={null}>
        <Worker
          key={cashier.id}
          data={cashier}
          model={(pose) => <StaffModel pose={pose} src={KEEPER_MODELS.register} />}
        />
        <Worker
          key={floorKeeper.id}
          data={floorKeeper}
          /* His irises came out of the file a bright amber that read as a
             torch beam under the shop's lamps; the whites are untouched. */
          model={(pose) => <StaffModel pose={pose} src={KEEPER_MODELS.floor} pupils="#1e6b45" />}
        />
      </Suspense>

      <WestWallCabinets />
      {/* the same camera, in the shop's own corner */}
      <SecurityCamera position={[-4.5, 3.6, -4.1]} scale={1.15} />
      <BlobCarpet />
      <ShoppingTrolley />
      <Monstera />
      <BotanicalPot position={[-4.1, 0.14, -1.6]} kind="fern" scale={0.75} color="#d1d9be" />
      <BotanicalPot position={[4.35, 0.14, 2.8]} kind="monstera" scale={0.8} color="#e6c6c0" />
      <BotanicalPot position={[-3.85, 0.14, 3.7]} kind="fern" scale={0.8} />
      {/* the shop has gone green: a monstera by the till end of the east wall, a
          fern in the front corner, and one beside the door through to the Lab */}
      <BotanicalPot position={[4.4, 0.14, -0.2]} kind="monstera" scale={0.85} color="#dcc8b0" />
      <BotanicalPot position={[4.4, 0.14, 3.9]} kind="fern" scale={0.72} color="#e6c6c0" />
      <BotanicalPot position={[-3.4, 0.14, -3.9]} kind="monstera" scale={0.7} color="#d1d9be" />
      <ShopCat />
      <ShopDressing />

      <ReadySignal />
      <ViewportBridge />
    </>
  );
}
