'use client';

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { Housing } from '@/components/lab/DesignedForms';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { FLOOR_TOP_Y } from '@/lib/layout';
import { pickStop, planWalk, rollDwell } from '@/lib/roaming';
import { MART_POS, MOMO_PLINTH } from '@/lib/martLayout';
import { FINISH, FINISH_PBR } from '@/lib/storeFinish';
import { MINI_PRODUCTS, SIGNATURE_PRODUCTS, getProduct } from '@/lib/products';
import { meow, toggleMusic, useMusicEnabled } from '@/lib/audio';
import {
  RADIO_MAX,
  RADIO_MIN,
  setRadioOpen,
  transmissionFor,
  useRadioYear,
} from '@/lib/radio';
import { useCartLines } from '@/lib/cart';
import { registerAnchor, unregisterAnchor } from '@/lib/anchors';
import { hoverEntity, selectEntity, useIsHovered, useIsSelected } from '@/lib/interaction';
import { useLabQuality } from '@/components/lab/QualityContext';
import { NO_HIT, StationGroup } from '@/components/lab/StationGroup';
import { CUP_SCALE } from '@/lib/cupSize';
import { CatModel, createCatPose } from './CatModel';
import { FruitCup, FruitCupProp } from './FruitCup';

/** Every tester except the mango, which is the tub kept by the till. */
const CABINET_MINIS = MINI_PRODUCTS.filter((product) => product.id !== 'mango');
const TUB = getProduct('mango');

/* ---------------------------------------------------------------- cabinetry */

/** Every cabinet in the shop is this tall, and breaks at these heights. */
const CABINET_H = 2.42;

/**
 * The shop's fitted black-steel cabinet, built from one shared carcass: a back
 * panel, an upright at every bay, shelves at the shared heights and a plinth
 * along the floor.
 *
 * One component for all of them, because a shop is fitted rather than furnished
 * — a run only reads as a run if the shelf lines carry across the join, and they
 * only do that if every carcass is the same carcass.
 *
 * `flush` drops the upright at one end, for a cabinet that butts into its
 * neighbour: two uprights in the same place is a seam that z-fights, and the
 * neighbour's own upright is already standing there closing the bay.
 */
export function ShowcaseCabinet({
  width,
  bays,
  position,
  rotation = 0,
  flush,
  children,
}: {
  width: number;
  bays: number;
  position: [number, number, number];
  rotation?: number;
  flush?: 'left' | 'right';
  children?: ReactNode;
}) {
  const uprights = Array.from({ length: bays + 1 }, (_, i) => -width / 2 + (i * width) / bays).filter(
    (x, i) => !(flush === 'right' && i === bays) && !(flush === 'left' && i === 0),
  );

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RoundedBox
        args={[width, CABINET_H, 0.1]}
        radius={0.04}
        smoothness={3}
        position={[0, CABINET_H / 2, -0.28]}
        receiveShadow
      >
        <meshStandardMaterial color={FINISH.black} {...FINISH_PBR.black} />
      </RoundedBox>
      {uprights.map((x) => (
        <mesh key={x} position={[x, CABINET_H / 2, 0]} castShadow receiveShadow raycast={NO_HIT}>
          <boxGeometry args={[0.07, CABINET_H, 0.52]} />
          <meshStandardMaterial color={FINISH.steel} {...FINISH_PBR.steel} />
        </mesh>
      ))}
      {SHELF_Y.map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow receiveShadow raycast={NO_HIT}>
          <boxGeometry args={[width, 0.07, 0.52]} />
          <meshStandardMaterial color={FINISH.stone} {...FINISH_PBR.stone} />
        </mesh>
      ))}
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow raycast={NO_HIT}>
        <boxGeometry args={[width + 0.02, 0.1, 0.54]} />
        <meshStandardMaterial color={FINISH.black} {...FINISH_PBR.black} />
      </mesh>
      {children}
    </group>
  );
}

/* ------------------------------------------------------------ signature wall */

/** Where the four hero cups and their backup stock stand, bay by bay. */
const SIGNATURE_BAY = 0.85;

/**
 * The back wall run: the hero line at eye level with its backup stock beneath.
 *
 * It used to be a white-and-pink shelf of its own design, which made two
 * different pieces of furniture out of one wall. It is the same steel-and-stone cabinet as
 * the record one now, the same height, the same shelf heights, and it runs right
 * up to it — the two share the upright where they meet, so the back wall reads
 * as one fitted run from the door to the corner.
 */
export function SignatureWall() {
  return (
    <StationGroup id="martshelf" position={MART_POS.wallShelf} ringRadius={1.9} ringColor={FINISH.steel}>
      <ShowcaseCabinet width={3.4} bays={4} position={[0, 0, 0]} flush="right">
        {/* the faced-up line, a cup to a bay */}
        {SIGNATURE_PRODUCTS.map((product) => (
          <FruitCup
            key={product.id}
            product={product}
            position={[(product.slot - 1.5) * SIGNATURE_BAY, SHELF_TOP[2], 0.06]}
            scale={CUP_SCALE.fruit}
            rotation={-(product.slot - 1.5) * 0.12}
          />
        ))}

        {/* backup stock on the shelf below: the same cup as scenery, so these
            never answer the pointer for the pickable ones above them */}
        {SIGNATURE_PRODUCTS.map((product, index) => (
          <FruitCupProp
            key={`stock-${product.id}`}
            product={product}
            position={[(index - 1.5) * SIGNATURE_BAY, SHELF_TOP[1], 0.02]}
            scale={CUP_SCALE.fruit}
          />
        ))}
      </ShowcaseCabinet>
    </StationGroup>
  );
}

/* ------------------------------------------------------------ record cabinet */

/** Sleeve art, drawn rather than fetched — three covers for the top shelf. */
function useSleeveTextures(): THREE.CanvasTexture[] {
  return useMemo(() => {
    if (typeof document === 'undefined') return [];

    const make = (draw: (ctx: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      draw(ctx);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      return texture;
    };

    const sleeves = [
      // a blob on a pink field
      make((ctx) => {
        ctx.fillStyle = '#f4879f';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#fdf3f6';
        ctx.beginPath();
        ctx.ellipse(128, 132, 74, 62, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e4738f';
        ctx.font = 'bold 22px ui-rounded, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SLIMEBERRY', 128, 42);
        ctx.font = '600 14px ui-rounded, system-ui, sans-serif';
        ctx.fillText('SIDE A', 128, 230);
      }),
      // a grid of triangles on cream
      make((ctx) => {
        ctx.fillStyle = '#f5eddc';
        ctx.fillRect(0, 0, 256, 256);
        const tints = ['#9dc47f', '#8ed0e8', '#f7d774', '#b3a4e0', '#f6b58c'];
        for (let row = 0; row < 5; row += 1) {
          for (let col = 0; col <= row; col += 1) {
            ctx.fillStyle = tints[(row + col) % tints.length];
            const x = 128 + (col - row / 2) * 34;
            const y = 70 + row * 30;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 15, y + 26);
            ctx.lineTo(x + 15, y + 26);
            ctx.closePath();
            ctx.fill();
          }
        }
        ctx.fillStyle = '#5a6172';
        ctx.font = 'italic 16px Georgia, serif';
        ctx.textAlign = 'right';
        ctx.fillText('the lab tapes', 236, 240);
      }),
      // a plain portrait sleeve
      make((ctx) => {
        ctx.fillStyle = '#f8f3ea';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#2f3540';
        ctx.fillRect(30, 40, 196, 150);
        ctx.fillStyle = '#8b93a3';
        ctx.beginPath();
        ctx.arc(128, 115, 44, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3f4756';
        ctx.font = 'bold 17px ui-rounded, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('KIND OF SLIME', 32, 222);
      }),
    ];

    return sleeves.filter((texture): texture is THREE.CanvasTexture => Boolean(texture));
  }, []);
}

/** Bay centres across the cabinet, and the shelf heights between them. */
const BAY_X = [-0.867, 0, 0.867];
const SHELF_Y = [0.12, 0.82, 1.52, 2.22];

/*
  Where the nine tester cups stand. They are fruit series cups at the shop's one
  cup size, and at that size they fit two to a bay and no more: three side by
  side are wider than a bay, and two stacked (0.72) are taller than the 0.63
  between shelves, which is how they were arranged when the cups were squatter
  tubs. So they take five bays instead of three — the records all go to the
  top-left bay, and the plant shares the top-right with one cup.
*/
const CUP_PAIR = (0.904 * CUP_SCALE.fruit) / 2 + 0.008;
const SHELF_TOP = SHELF_Y.map((y) => y + 0.035);
const CABINET_SLOTS: ReadonlyArray<readonly [number, number]> = [
  [BAY_X[1] - CUP_PAIR, SHELF_TOP[2]],
  [BAY_X[1] + CUP_PAIR, SHELF_TOP[2]],
  [BAY_X[2] - CUP_PAIR, SHELF_TOP[2]],
  [BAY_X[2] - CUP_PAIR, SHELF_TOP[1]],
  [BAY_X[2] + CUP_PAIR, SHELF_TOP[1]],
  [BAY_X[0] - CUP_PAIR, SHELF_TOP[0]],
  [BAY_X[0] + CUP_PAIR, SHELF_TOP[0]],
  [BAY_X[1] - CUP_PAIR, SHELF_TOP[0]],
  [BAY_X[1] + CUP_PAIR, SHELF_TOP[0]],
];

/**
 * The record cabinet — the shop's hi-fi corner. Its black-steel carcass now
 * shares the signature wall's gallery finish, while the records stay colourful.
 *
 * The turntable is the switch for the background music: click it and the platter
 * starts turning, click it again and it stops. That is the whole control — the
 * header toggle still exists, but in here the record player *is* the stereo.
 */
export function VinylCabinet() {
  const sleeves = useSleeveTextures();
  const platterRef = useRef<THREE.Group>(null);
  const armRef = useRef<THREE.Group>(null);
  const lampRef = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>(null);
  const coneRef = useRef<THREE.Mesh>(null);
  const playing = useMusicEnabled();
  const { reducedMotion } = useLabQuality();

  useEffect(() => () => sleeves.forEach((texture) => texture.dispose()), [sleeves]);

  useFrame(({ clock }, delta) => {
    const step = Math.min(delta, 1 / 30);
    const t = clock.getElapsedTime();

    if (platterRef.current && playing && !reducedMotion) {
      platterRef.current.rotation.y += step * 2.6;
    }
    if (armRef.current) {
      // the arm swings in over the record while it plays, and rests when it stops
      const rest = playing ? -0.34 : 0.12;
      armRef.current.rotation.y = reducedMotion
        ? rest
        : THREE.MathUtils.damp(armRef.current.rotation.y, rest, 5, step);
    }
    if (lampRef.current) {
      lampRef.current.material.emissiveIntensity = playing
        ? 0.55 + (Math.sin(t * 2.4) + 1) * 0.22
        : 0.04;
    }
    // the woofer breathes very slightly while something is playing
    if (coneRef.current) {
      const push = playing && !reducedMotion ? 1 + Math.sin(t * 9.5) * 0.045 : 1;
      coneRef.current.scale.set(1, push, 1);
    }
  });

  return (
    <StationGroup id="vinyl" position={MART_POS.vinyl} ringRadius={1.6} ringColor={FINISH.steel}>
      {/* the carcass this whole shop is fitted out in — three bays of it here,
          closing the run that starts under the banner */}
      <ShowcaseCabinet width={2.6} bays={3} position={[0, 0, 0]} />

      {/* ---- top shelf: the three records fanned in the left bay, cups in the
          middle, and the plant beside one more cup on the right */}
      {sleeves.slice(0, 3).map((texture, index) => (
        <mesh
          key={index}
          position={[BAY_X[0] - 0.06 + index * 0.09, 1.85 - index * 0.01, 0.06 - index * 0.09]}
          rotation={[0.07, [0.08, -0.1, 0.16][index], 0]}
          castShadow
          raycast={NO_HIT}
        >
          <boxGeometry args={[0.56 - index * 0.01, 0.56 - index * 0.01, 0.02]} />
          <meshStandardMaterial map={texture} roughness={0.72} />
        </mesh>
      ))}
      <group position={[BAY_X[2] + 0.2, 1.59, 0.02]}>
        <mesh position={[0, 0.12, 0]} castShadow raycast={NO_HIT}>
          <cylinderGeometry args={[0.14, 0.11, 0.24, 16]} />
          <meshStandardMaterial color="#dba98c" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.245, 0]} raycast={NO_HIT}>
          <cylinderGeometry args={[0.125, 0.125, 0.02, 16]} />
          <meshStandardMaterial color="#cbbfae" roughness={0.95} />
        </mesh>
        {/* a small rosette succulent, matching the Lab's planting */}
        {[
          { count: 6, radius: 0.11, height: 0.28, tilt: 1.1, size: 0.075, tint: '#7fa860' },
          { count: 5, radius: 0.065, height: 0.33, tilt: 0.7, size: 0.058, tint: '#93bb73' },
          { count: 4, radius: 0.03, height: 0.37, tilt: 0.3, size: 0.042, tint: '#a8cf87' },
        ].map((ring, ringIndex) =>
          Array.from({ length: ring.count }, (_, index) => {
            const angle = (index / ring.count) * Math.PI * 2 + ringIndex * 0.5;
            return (
              <mesh
                key={`${ringIndex}-${index}`}
                position={[Math.cos(angle) * ring.radius, ring.height, Math.sin(angle) * ring.radius]}
                rotation={[Math.cos(angle) * ring.tilt, -angle, Math.sin(angle) * ring.tilt]}
                scale={[0.5, 0.32, 1]}
                castShadow
                raycast={NO_HIT}
              >
                <sphereGeometry args={[ring.size, 8, 6]} />
                <meshStandardMaterial color={ring.tint} roughness={0.72} />
              </mesh>
            );
          }),
        )}
      </group>

      {/* ---- middle shelf, left bay: the turntable ------------------------- */}
      <group
        position={[BAY_X[0], 0.855, 0.03]}
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
        onClick={(event) => {
          // the record player is the stereo's switch — the music only, not
          // the footsteps and voices, which belong to the world rather than to it
          event.stopPropagation();
          toggleMusic();
        }}
      >
        {/* forgiving hit volume, so it can be tapped on a phone */}
        <mesh visible={false} position={[0, 0.12, 0]}>
          <boxGeometry args={[0.74, 0.3, 0.5]} />
        </mesh>

        <RoundedBox args={[0.66, 0.07, 0.44]} radius={0.02} smoothness={3} position={[0, 0.035, 0]} castShadow receiveShadow raycast={NO_HIT}>
          <meshStandardMaterial color="#2a2f38" roughness={0.55} />
        </RoundedBox>
        {[
          [-0.27, -0.17],
          [0.27, -0.17],
          [-0.27, 0.17],
          [0.27, 0.17],
        ].map(([fx, fz], index) => (
          <mesh key={index} position={[fx, 0.005, fz]} raycast={NO_HIT}>
            <cylinderGeometry args={[0.024, 0.024, 0.02, 8]} />
            <meshStandardMaterial color="#1d2228" roughness={0.7} />
          </mesh>
        ))}

        <group ref={platterRef} position={[-0.08, 0.08, 0]}>
          <mesh castShadow raycast={NO_HIT}>
            <cylinderGeometry args={[0.185, 0.185, 0.025, 28]} />
            <meshStandardMaterial color="#b9c0ca" roughness={0.42} metalness={0.55} />
          </mesh>
          <mesh position={[0, 0.016, 0]} raycast={NO_HIT}>
            <cylinderGeometry args={[0.175, 0.175, 0.008, 28]} />
            <meshStandardMaterial color="#15181d" roughness={0.42} />
          </mesh>
          <mesh position={[0, 0.021, 0]} raycast={NO_HIT}>
            <cylinderGeometry args={[0.062, 0.062, 0.004, 20]} />
            <meshStandardMaterial color={PALETTE.berry} roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.028, 0]} raycast={NO_HIT}>
            <cylinderGeometry args={[0.008, 0.008, 0.03, 8]} />
            <meshStandardMaterial color="#d9dee6" roughness={0.35} metalness={0.6} />
          </mesh>
        </group>

        <group ref={armRef} position={[0.22, 0.085, -0.14]}>
          <mesh position={[0, 0.01, 0]} raycast={NO_HIT}>
            <cylinderGeometry args={[0.035, 0.04, 0.03, 12]} />
            <meshStandardMaterial color="#8b93a3" roughness={0.4} metalness={0.55} />
          </mesh>
          <mesh position={[-0.11, 0.03, 0.11]} rotation={[0, -0.78, 0]} castShadow raycast={NO_HIT}>
            <boxGeometry args={[0.3, 0.012, 0.012]} />
            <meshStandardMaterial color="#d9dee6" roughness={0.35} metalness={0.5} />
          </mesh>
          <mesh position={[-0.21, 0.022, 0.2]} raycast={NO_HIT}>
            <boxGeometry args={[0.045, 0.026, 0.03]} />
            <meshStandardMaterial color="#2a2f38" roughness={0.5} />
          </mesh>
        </group>

        {/* power lamp — the one bit of state you can read across the room */}
        <mesh ref={lampRef} position={[0.26, 0.075, 0.17]} raycast={NO_HIT}>
          <sphereGeometry args={[0.018, 8, 6]} />
          <meshStandardMaterial color="#9dc47f" emissive="#7bbf6a" emissiveIntensity={0.04} roughness={0.3} />
        </mesh>
      </group>

      {/* ---- middle shelf, centre bay: the built-in speaker ---------------- */}
      <group position={[BAY_X[1], 1.16, 0.12]}>
        <mesh position={[0, 0, -0.06]} castShadow receiveShadow raycast={NO_HIT}>
          <boxGeometry args={[0.78, 0.64, 0.14]} />
          <meshStandardMaterial color={FINISH.black} {...FINISH_PBR.black} />
        </mesh>
        <mesh position={[-0.12, -0.04, 0.02]} rotation={[Math.PI / 2, 0, 0]} raycast={NO_HIT}>
          <cylinderGeometry args={[0.17, 0.17, 0.02, 24]} />
          <meshStandardMaterial color="#20242b" roughness={0.6} />
        </mesh>
        <mesh ref={coneRef} position={[-0.12, -0.04, 0.035]} rotation={[Math.PI / 2, 0, 0]} raycast={NO_HIT}>
          <coneGeometry args={[0.135, 0.07, 24]} />
          <meshStandardMaterial color="#15181d" roughness={0.72} />
        </mesh>
        <mesh position={[-0.12, -0.04, 0.062]} raycast={NO_HIT}>
          <sphereGeometry args={[0.032, 12, 10]} />
          <meshStandardMaterial color="#2f3540" roughness={0.4} metalness={0.2} />
        </mesh>
        <mesh position={[0.19, 0.02, 0.02]} rotation={[Math.PI / 2, 0, 0]} raycast={NO_HIT}>
          <cylinderGeometry args={[0.06, 0.06, 0.02, 18]} />
          <meshStandardMaterial color="#20242b" roughness={0.6} />
        </mesh>
        <mesh position={[0.19, 0.02, 0.04]} raycast={NO_HIT}>
          <sphereGeometry args={[0.032, 12, 10]} />
          <meshStandardMaterial color="#4a5262" roughness={0.35} metalness={0.35} />
        </mesh>
      </group>

      {/*
        ---- the tester cups, two to a bay ----
        Fruit series cups like every other cup in the shop, each taking its own
        flavour's colour through the gingham lid and the flower. Each one turns
        a touch toward the middle of its bay.
      */}
      {CABINET_MINIS.map((product, index) => {
        const slot = CABINET_SLOTS[index];
        if (!slot) return null;
        const [x, y] = slot;
        const bay = BAY_X.reduce((nearest, centre) => (Math.abs(centre - x) < Math.abs(nearest - x) ? centre : nearest));
        return (
          <FruitCup
            key={product.id}
            product={product}
            position={[x, y, 0.06]}
            scale={CUP_SCALE.fruit}
            rotation={Math.sign(bay - x) * 0.12}
          />
        );
      })}

      {/* ---- bottom shelf, right bay: the amplifier ------------------------ */}
      <group position={[BAY_X[2], 0.155, 0.02]}>
        <RoundedBox args={[0.74, 0.16, 0.4]} radius={0.02} smoothness={3} position={[0, 0.08, 0]} castShadow receiveShadow raycast={NO_HIT}>
          <meshStandardMaterial color="#23272e" roughness={0.5} metalness={0.15} />
        </RoundedBox>
        <mesh position={[0, 0.09, 0.203]} raycast={NO_HIT}>
          <boxGeometry args={[0.7, 0.12, 0.01]} />
          <meshStandardMaterial color="#2f3540" roughness={0.42} metalness={0.25} />
        </mesh>
        <mesh position={[0.06, 0.11, 0.21]} raycast={NO_HIT}>
          <boxGeometry args={[0.26, 0.04, 0.01]} />
          <meshStandardMaterial color="#8ed0e8" emissive="#8ed0e8" emissiveIntensity={0.28} roughness={0.4} />
        </mesh>
        {[-0.3, 0.3].map((x) => (
          <mesh key={x} position={[x, 0.08, 0.215]} rotation={[Math.PI / 2, 0, 0]} raycast={NO_HIT}>
            <cylinderGeometry args={[0.034, 0.034, 0.02, 14]} />
            <meshStandardMaterial color="#9aa4b2" roughness={0.4} metalness={0.5} />
          </mesh>
        ))}
        {[-0.16, -0.09, -0.02].map((x) => (
          <mesh key={x} position={[x, 0.055, 0.213]} raycast={NO_HIT}>
            <boxGeometry args={[0.04, 0.016, 0.008]} />
            <meshStandardMaterial color="#5a6172" roughness={0.5} />
          </mesh>
        ))}
      </group>
    </StationGroup>
  );
}

/* ------------------------------------------------------------------- checkout */

/** Counter, register and a bag stand. */
export function Checkout() {
  const drawerRef = useRef<THREE.Group>(null);
  const { reducedMotion } = useLabQuality();

  useFrame(({ clock }) => {
    if (!drawerRef.current || reducedMotion) return;
    const t = clock.getElapsedTime();
    const nudge = Math.max(0, Math.sin(t * 0.32)) ** 8;
    drawerRef.current.position.z = 0.16 + nudge * 0.14;
  });

  return (
    <StationGroup id="checkout" position={MART_POS.counter} ringRadius={1.5} ringColor={FINISH.steel}>
      {/*
        The top is at 0.80, waist height on the cashier. It was 1.05 — most of
        the way up a character who stands 1.3 — and between that and the tub
        standing right in front of the till, the shop camera saw 38% of the
        cashier's face on a desktop and 4% in the checkout close-up. Lowered, with
        the tub moved to the far end, it sees all of it from every framing.
      */}
      <group position={[0,.35,0]}><Housing width={2.2} height={.7} depth={.85} color={FINISH.travertine}/></group>
      {Array.from({length:17},(_,i)=><mesh key={`reed-${i}`} position={[-.96+i*.12,.33,.437]} raycast={NO_HIT}>
        <capsuleGeometry args={[.013,.44,3,6]}/><meshStandardMaterial color={FINISH.stone} roughness={.68}/></mesh>)}
      {/* Pale limestone counter, so the merchandise and Momo supply the colour. */}
      <RoundedBox args={[2.34, 0.1, 0.98]} radius={0.04} smoothness={3} position={[0, COUNTER_TOP - 0.05, 0]} castShadow receiveShadow raycast={NO_HIT}>
        <meshStandardMaterial color={FINISH.stone} {...FINISH_PBR.stone} />
      </RoundedBox>
      <mesh position={[0, 0.3, 0.43]} raycast={NO_HIT}>
        <boxGeometry args={[2.06, 0.22, 0.02]} />
        <meshStandardMaterial color={FINISH.black} {...FINISH_PBR.black} />
      </mesh>

      {/* register */}
      <group position={[-0.6, COUNTER_TOP, -0.02]} rotation={[0, 0.22, 0]}>
        <group position={[0,.14,0]} scale={[.28,.28,.28]}><Housing width={1.64} height={1} depth={1.36} color="#eef2f7"/></group>
        <mesh position={[.12,.285,-.035]} rotation={[-.15,0,0]} raycast={NO_HIT}>
          <boxGeometry args={[.1,.006,.13]}/><meshStandardMaterial color="#fff9ec" roughness={.95}/></mesh>
        <mesh position={[.12,.294,-.07]} raycast={NO_HIT}><boxGeometry args={[.11,.014,.018]}/><meshStandardMaterial color="#788982"/></mesh>
        <mesh position={[0, 0.33, -0.06]} rotation={[-0.45, 0, 0]} castShadow raycast={NO_HIT}>
          <boxGeometry args={[0.34, 0.2, 0.03]} />
          <meshStandardMaterial color={PALETTE.ink} roughness={0.4} />
        </mesh>
        {[-0.1, 0, 0.1].map((x) => (
          <mesh key={x} position={[x, 0.28, 0.1]} raycast={NO_HIT}>
            <boxGeometry args={[0.07, 0.02, 0.07]} />
            <meshStandardMaterial color={PALETTE.berry} roughness={0.5} />
          </mesh>
        ))}
        <group ref={drawerRef} position={[0, 0.05, 0.16]}>
          <mesh castShadow raycast={NO_HIT}>
            <boxGeometry args={[0.42, 0.09, 0.3]} />
            <meshStandardMaterial color="#d9dee6" roughness={0.55} />
          </mesh>
        </group>
      </group>

      {/* the cup kept by the till, at the far end of the counter — not between
          the visitor and the person at the till */}
      {TUB && <FruitCup product={TUB} position={[0.9, COUNTER_TOP, 0.06]} scale={CUP_SCALE.fruit} />}

      {[0, 1].map((i) => (
        <mesh key={i} position={[0.02 + i * 0.14, COUNTER_TOP + 0.06, -0.3]} rotation={[0, i * 0.4, 0]} castShadow raycast={NO_HIT}>
          <boxGeometry args={[0.2, 0.12, 0.1]} />
          <meshStandardMaterial color="#e3cdb0" roughness={0.85} />
        </mesh>
      ))}
    </StationGroup>
  );
}

/* --------------------------------------------------------- shopping trolley */

const CAGE_RAILS = [0.06, 0.2, 0.34];
/** How it stands. Nobody wheels it about any more; it is the shop's basket. */
const PARK_ROTATION = -0.55;
/** Cap on the order stack, matching the Lab's trolley. */
const MAX_CRATES = 6;

/**
 * The shop's trolley: the same order stack the Lab's one carries, parked on the
 * floor where a customer would have left it.
 *
 * It used to follow whoever was flagged as pushing it. That is gone — it stands
 * still, and what it holds is the cart, so adding a jar in either room drops a
 * crate into whichever trolley you happen to be standing next to.
 *
 * The cage is suggested with horizontal rails and corner posts rather than
 * modelled as mesh: at this scale the rails are what the eye reads as wire.
 */
export function ShoppingTrolley() {
  const { reducedMotion } = useLabQuality();
  const lines = useCartLines();
  const rootRef = useRef<THREE.Group>(null);
  const wheelsRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const cratesRef = useRef<THREE.Group>(null);
  const hovered = useIsHovered('station', 'marttrolley');
  const selected = useIsSelected('station', 'marttrolley');
  const active = hovered || selected;

  const [parkX, , parkZ] = MART_POS.trolley;

  useEffect(() => {
    const group = rootRef.current;
    if (!group) return;
    registerAnchor('station', 'marttrolley', group);
    return () => {
      unregisterAnchor('station', 'marttrolley');
      document.body.style.cursor = 'auto';
    };
  }, []);

  // one crate per unit, not per line, so a repeat purchase visibly stacks up
  const crates = lines
    .flatMap((line) => Array.from({ length: line.quantity }, () => line.productId))
    .slice(-MAX_CRATES);

  useFrame(({ clock }, delta) => {
    const step = Math.min(delta, 1 / 30);
    const t = clock.getElapsedTime();

    cratesRef.current?.children.forEach((crate, index) => {
      // settle in with a small drop when a crate first appears
      crate.position.y = THREE.MathUtils.damp(crate.position.y, index * 0.2, 6, step);
      if (!reducedMotion) crate.rotation.y = Math.sin(t * 0.5 + index) * 0.05;
    });

    if (reducedMotion) return;
    // parked, so the castors only ever drift
    wheelsRef.current?.children.forEach((wheel, index) => {
      wheel.rotation.y = Math.sin(t * 0.5 + index) * 0.22;
    });
    if (bodyRef.current) bodyRef.current.rotation.z = Math.sin(t * 0.6) * 0.006;
  });

  return (
    <group
      ref={rootRef}
      position={[parkX, FLOOR_TOP_Y, parkZ]}
      rotation={[0, PARK_ROTATION, 0]}
      onPointerOver={(event) => {
        event.stopPropagation();
        hoverEntity({ kind: 'station', id: 'marttrolley' });
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        hoverEntity(null);
        document.body.style.cursor = 'auto';
      }}
      onClick={(event) => {
        event.stopPropagation();
        selectEntity({ kind: 'station', id: 'marttrolley' });
      }}
    >
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={active} raycast={NO_HIT}>
        <ringGeometry args={[0.58, 0.7, 36]} />
        <meshBasicMaterial color="#e4738f" transparent opacity={selected ? 0.85 : 0.4} />
      </mesh>

      <group ref={bodyRef}>
        {/* the basket floor is the one mesh left pickable, so it can be tapped */}
        <mesh position={[0, 0.44, 0]} rotation={[0.08, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.62, 0.03, 0.84]} />
          <meshStandardMaterial color={PALETTE.metal} roughness={0.42} metalness={0.5} />
        </mesh>

        {[-0.31, 0.31].map((side) =>
          CAGE_RAILS.map((y) => (
            <mesh key={`${side}-${y}`} position={[side, 0.46 + y, 0]} castShadow raycast={NO_HIT}>
              <boxGeometry args={[0.02, 0.02, 0.84]} />
              <meshStandardMaterial color={PALETTE.metal} roughness={0.4} metalness={0.55} />
            </mesh>
          )),
        )}
        {[-0.42, 0.42].map((end) =>
          CAGE_RAILS.map((y) => (
            <mesh key={`e${end}-${y}`} position={[0, 0.46 + y, end]} castShadow raycast={NO_HIT}>
              <boxGeometry args={[0.62, 0.02, 0.02]} />
              <meshStandardMaterial color={PALETTE.metal} roughness={0.4} metalness={0.55} />
            </mesh>
          )),
        )}
        {[
          [-0.31, -0.42],
          [0.31, -0.42],
          [-0.31, 0.42],
          [0.31, 0.42],
        ].map(([px, pz], index) => (
          <mesh key={index} position={[px, 0.64, pz]} castShadow raycast={NO_HIT}>
            <boxGeometry args={[0.025, 0.4, 0.025]} />
            <meshStandardMaterial color={PALETTE.metal} roughness={0.4} metalness={0.55} />
          </mesh>
        ))}

        <mesh position={[0, 0.9, 0.44]} rotation={[0, 0, Math.PI / 2]} castShadow raycast={NO_HIT}>
          <cylinderGeometry args={[0.026, 0.026, 0.66, 12]} />
          <meshStandardMaterial color={PALETTE.berry} roughness={0.5} />
        </mesh>
        {[-0.31, 0.31].map((side) => (
          <mesh key={side} position={[side, 0.79, 0.44]} castShadow raycast={NO_HIT}>
            <boxGeometry args={[0.025, 0.26, 0.025]} />
            <meshStandardMaterial color={PALETTE.metal} roughness={0.4} metalness={0.55} />
          </mesh>
        ))}

        <mesh position={[0, 0.62, 0.3]} rotation={[0.9, 0, 0]} castShadow raycast={NO_HIT}>
          <boxGeometry args={[0.5, 0.02, 0.22]} />
          <meshStandardMaterial color={PALETTE.berry} roughness={0.6} />
        </mesh>

        {/* what you have bought, boxed */}
        <group ref={cratesRef} position={[0, 0.47, 0]}>
          {crates.map((productId, index) => {
            const product = getProduct(productId);
            return (
              <group key={`${productId}-${index}`} position={[0, 0.6, 0]}>
                <RoundedBox args={[0.42, 0.18, 0.5]} radius={0.035} smoothness={3} castShadow raycast={NO_HIT}>
                  <meshStandardMaterial color={PALETTE.wood} roughness={0.8} />
                </RoundedBox>
                <mesh position={[0, 0.1, 0]} castShadow raycast={NO_HIT}>
                  <cylinderGeometry args={[0.075, 0.075, 0.055, 14]} />
                  <meshStandardMaterial color={product?.color ?? PALETTE.berry} roughness={0.35} />
                </mesh>
              </group>
            );
          })}
        </group>
      </group>

      <group ref={wheelsRef}>
        {[
          [-0.26, -0.34],
          [0.26, -0.34],
          [-0.26, 0.34],
          [0.26, 0.34],
        ].map(([px, pz], index) => (
          <group key={index} position={[px, 0.1, pz]}>
            <mesh position={[0, 0.16, 0]} raycast={NO_HIT}>
              <boxGeometry args={[0.03, 0.28, 0.03]} />
              <meshStandardMaterial color={PALETTE.metal} roughness={0.4} metalness={0.55} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow raycast={NO_HIT}>
              <cylinderGeometry args={[0.075, 0.075, 0.05, 14]} />
              <meshStandardMaterial color="#5c6470" roughness={0.65} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/* ------------------------------------------------------- table and radio */

/**
 * The corner by the return door: a side table with somebody's mug going cold on
 * it and a valve radio that still works.
 *
 * Three stacked stock boxes stood here, which said "storage" and nothing else.
 * This says somebody sits here. The table top doubles as the cat's second
 * perch — the boxes were the first one, and he was not going to give it up.
 */
function SideTable() {
  const year = useRadioYear();
  const needleRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.MeshStandardMaterial>(null);
  const rootRef = useRef<THREE.Group>(null);
  const hovered = useIsHovered('station', 'radio');
  const selected = useIsSelected('station', 'radio');
  const { reducedMotion } = useLabQuality();

  const [tx, , tz] = MART_POS.sideTable;
  const tuning = transmissionFor(year);
  // where the needle sits on the dial, as a fraction of the band
  const sweep = (year - RADIO_MIN) / (RADIO_MAX - RADIO_MIN);

  useEffect(() => {
    const group = rootRef.current;
    if (!group) return;
    registerAnchor('station', 'radio', group);
    return () => {
      unregisterAnchor('station', 'radio');
      document.body.style.cursor = 'auto';
    };
  }, []);

  useFrame(({ clock }, delta) => {
    const step = Math.min(delta, 1 / 30);
    // the needle eases across rather than snapping, the way a real one would
    if (needleRef.current) {
      const target = (0.5 - sweep) * 1.7;
      needleRef.current.rotation.z = THREE.MathUtils.damp(needleRef.current.rotation.z, target, 8, step);
    }
    if (glowRef.current) {
      // the dial lamp swells on a strong station and gutters on a weak one
      const flicker = reducedMotion ? 1 : 0.82 + Math.sin(clock.getElapsedTime() * 7.3) * 0.18 * (1 - tuning.signal);
      glowRef.current.emissiveIntensity = (0.25 + tuning.signal * 1.05) * flicker;
    }
  });

  return (
    <group ref={rootRef} position={[tx, FLOOR_TOP_Y, tz]} rotation={[0, 0.24, 0]}>
      {/* A compact stone-and-steel pedestal keeps the radio in its own corner. */}
      <RoundedBox args={[0.88, 0.06, 0.62]} radius={0.02} smoothness={3} position={[0, 0.6, 0]} castShadow receiveShadow raycast={NO_HIT}>
        <meshStandardMaterial color={FINISH.stone} {...FINISH_PBR.stone} />
      </RoundedBox>
      <mesh position={[0, 0.3, 0]} castShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.085, 0.085, 0.58, 16]} />
        <meshStandardMaterial color={FINISH.steel} {...FINISH_PBR.steel} />
      </mesh>
      <mesh position={[0, 0.025, 0]} receiveShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.27, 0.29, 0.05, 32]} />
        <meshStandardMaterial color={FINISH.black} {...FINISH_PBR.black} />
      </mesh>

      {/* the mug, going cold */}
      <group position={[0.26, 0.63, -0.14]} rotation={[0, -0.5, 0]}>
        <mesh position={[0, 0.008, 0]} castShadow receiveShadow raycast={NO_HIT}>
          <cylinderGeometry args={[0.085, 0.08, 0.016, 18]} />
          <meshStandardMaterial color="#fdfaf4" roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.075, 0]} castShadow raycast={NO_HIT}>
          <cylinderGeometry args={[0.058, 0.053, 0.12, 18]} />
          <meshStandardMaterial color="#fdfaf4" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.048, 0]} raycast={NO_HIT}>
          <cylinderGeometry args={[0.0595, 0.055, 0.038, 18]} />
          <meshStandardMaterial color={PALETTE.mint} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.128, 0]} raycast={NO_HIT}>
          <cylinderGeometry args={[0.049, 0.049, 0.01, 18]} />
          <meshStandardMaterial color="#5b3a26" roughness={0.28} />
        </mesh>
        <mesh position={[0.064, 0.075, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow raycast={NO_HIT}>
          <torusGeometry args={[0.032, 0.009, 8, 14, Math.PI * 1.1]} />
          <meshStandardMaterial color="#fdfaf4" roughness={0.4} />
        </mesh>
      </group>

      {/* the set */}
      <group
        position={[-0.21, 0.63, -0.15]}
        rotation={[0, 0.42, 0]}
        onPointerOver={(event) => {
          event.stopPropagation();
          hoverEntity({ kind: 'station', id: 'radio' });
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          hoverEntity(null);
          document.body.style.cursor = 'auto';
        }}
        onClick={(event) => {
          event.stopPropagation();
          setRadioOpen(true);
        }}
      >
        {/* bakelite case — the one mesh that answers the pointer */}
        <group position={[0,.12,0]} scale={[.2,.2,.2]}><Housing width={1.7} height={1.2} depth={.85} color="#6b452e"/></group>
        <mesh position={[0, 0.245, 0]} raycast={NO_HIT}>
          <boxGeometry args={[0.29, 0.015, 0.13]} />
          <meshStandardMaterial color="#54341f" roughness={0.5} />
        </mesh>

        {/* speaker cloth, with the slats that read as a grille */}
        <mesh position={[-0.07, 0.14, 0.088]} raycast={NO_HIT}>
          <boxGeometry args={[0.15, 0.14, 0.01]} />
          <meshStandardMaterial color="#c9b48c" roughness={0.95} />
        </mesh>
        {[-0.05, -0.025, 0, 0.025, 0.05].map((offset) => (
          <mesh key={offset} position={[-0.07 + offset, 0.14, 0.094]} raycast={NO_HIT}>
            <boxGeometry args={[0.008, 0.13, 0.006]} />
            <meshStandardMaterial color="#7a5f3d" roughness={0.9} />
          </mesh>
        ))}

        {/* the dial: a lit face with a needle across it */}
        <mesh position={[0.085, 0.155, 0.088]} raycast={NO_HIT}>
          <boxGeometry args={[0.12, 0.075, 0.01]} />
          <meshStandardMaterial
            ref={glowRef}
            color="#f4e3bd"
            emissive={tuning.tint}
            emissiveIntensity={0.5}
            roughness={0.6}
          />
        </mesh>
        {[-0.04, -0.02, 0, 0.02, 0.04].map((offset) => (
          <mesh key={offset} position={[0.085 + offset, 0.178, 0.094]} raycast={NO_HIT}>
            <boxGeometry args={[0.003, 0.014, 0.004]} />
            <meshStandardMaterial color="#6b452e" roughness={0.8} />
          </mesh>
        ))}
        <group ref={needleRef} position={[0.085, 0.155, 0.096]}>
          <mesh position={[0, 0, 0]} raycast={NO_HIT}>
            <boxGeometry args={[0.004, 0.07, 0.004]} />
            <meshStandardMaterial color="#d94f75" roughness={0.5} />
          </mesh>
        </group>

        {/* tuning and volume */}
        {[-0.11, 0.11].map((kx) => (
          <mesh key={kx} position={[kx, 0.045, 0.092]} rotation={[Math.PI / 2, 0, 0]} castShadow raycast={NO_HIT}>
            <cylinderGeometry args={[0.024, 0.026, 0.022, 14]} />
            <meshStandardMaterial color="#e7d7b6" roughness={0.5} />
          </mesh>
        ))}

        {/* aerial, bent where somebody knocked it */}
        <mesh position={[0.12, 0.3, -0.05]} rotation={[0, 0, -0.22]} castShadow raycast={NO_HIT}>
          <cylinderGeometry args={[0.004, 0.005, 0.32, 6]} />
          <meshStandardMaterial color={PALETTE.metal} roughness={0.35} metalness={0.6} />
        </mesh>

        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={hovered || selected} raycast={NO_HIT}>
          <ringGeometry args={[0.22, 0.27, 28]} />
          <meshBasicMaterial color="#c98f3a" transparent opacity={selected ? 0.85 : 0.45} />
        </mesh>
      </group>
    </group>
  );
}

/* --------------------------------------------------------------- dressing */

/**
 * The standing lamp in the corner behind the side table.
 *
 * It carries a real light as well as a lit shade — a small point source with a
 * short falloff, so it pools warmth into the corner the wall lights never reach
 * rather than lifting the whole room. No shadow map: at this size and intensity
 * it would cost more than it showed.
 *
 * Press it and it goes off, like a lamp. The state is local because nothing
 * else in the world needs to know — this is a switch on an object, not a
 * setting, and the whole fixture is the hit target so it can be caught with a
 * thumb on a phone.
 */
function StandingLamp() {
  const [lx, , lz] = MART_POS.lamp;
  const [lit, setLit] = useState(true);
  const [hovered, setHovered] = useState(false);

  return (
    <group
      position={[lx, FLOOR_TOP_Y, lz]}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
      onClick={(event) => {
        event.stopPropagation();
        setLit((on) => !on);
      }}
    >
      {/* one forgiving hit volume down the whole lamp, rather than asking for
          a tap on a 4cm pole */}
      <mesh visible={false} position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 1.9, 8]} />
      </mesh>
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={hovered} raycast={NO_HIT}>
        <ringGeometry args={[0.26, 0.32, 28]} />
        <meshBasicMaterial color="#f0c86a" transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, 0.02, 0]} castShadow receiveShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.19, 0.22, 0.04, 20]} />
        <meshStandardMaterial color={FINISH.black} {...FINISH_PBR.black} />
      </mesh>
      <mesh position={[0, 0.78, 0]} castShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.017, 0.022, 1.52, 10]} />
        <meshStandardMaterial color={FINISH.steel} {...FINISH_PBR.steel} />
      </mesh>
      {/* A brushed-steel joint beneath the milky gallery shade. */}
      <mesh position={[0, 1.52, 0]} castShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.03, 0.03, 0.05, 12]} />
        <meshStandardMaterial color={FINISH.steel} {...FINISH_PBR.steel} />
      </mesh>
      {/* the shade, lit from inside */}
      <mesh position={[0, 1.72, 0]} castShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.2, 0.27, 0.32, 24, 1, true]} />
        <meshStandardMaterial
          color={lit ? '#f1f1ef' : '#c8c9c7'}
          emissive={FINISH.led}
          emissiveIntensity={lit ? 0.4 : 0}
          roughness={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 1.57, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={NO_HIT}>
        <meshStandardMaterial
          color={lit ? FINISH.led : FINISH.concrete}
          emissive={FINISH.led}
          emissiveIntensity={lit ? 0.8 : 0}
        />
        <circleGeometry args={[0.26, 22]} />
      </mesh>
      {lit && <pointLight position={[0, 1.6, 0]} intensity={2.6} distance={4.4} decay={2} color={FINISH.led} />}
    </group>
  );
}

/** Entrance mat, the corner lamp and a couple of lived-in details. */
export function ShopDressing() {
  return (
    <group>
      <mesh
        position={[MART_POS.mat[0], FLOOR_TOP_Y + 0.004, MART_POS.mat[2]]}
        rotation={[-Math.PI / 2, 0, 0.1]}
        receiveShadow
        raycast={NO_HIT}
      >
        <planeGeometry args={[1.5, 0.95]} />
        <meshStandardMaterial color={FINISH.black} roughness={0.85} />
      </mesh>

      <SideTable />
      <StandingLamp />

    </group>
  );
}

/* ------------------------------------------------------------------ monstera */

/**
 * One monstera leaf as a flat shape: an elongated blade whose width is pinched
 * almost to the midrib at a few points down each side. Those pinches are what
 * read as the plant's splits — cutting real holes would need a shape with
 * holes per leaf, and at this size the silhouette does all the work.
 */
function monsteraLeaf(length: number, width: number, notches: number[]): THREE.ShapeGeometry {
  const steps = 34;
  const profile = (t: number) => Math.sin(Math.PI * Math.min(1, t * 1.08)) ** 0.7;
  const pinch = (t: number, offset: number) => {
    let factor = 1;
    for (const notch of notches) {
      const distance = Math.abs(t - (notch + offset));
      if (distance < 0.06) factor = Math.min(factor, 0.16 + (distance / 0.06) * 0.84);
    }
    return factor;
  };

  const points: THREE.Vector2[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    points.push(new THREE.Vector2(width * profile(t) * pinch(t, 0), t * length));
  }
  for (let i = steps; i >= 0; i -= 1) {
    const t = i / steps;
    points.push(new THREE.Vector2(-width * profile(t) * pinch(t, 0.04), t * length));
  }
  return new THREE.ShapeGeometry(new THREE.Shape(points), 6);
}

/** Each leaf: [length, width, tilt, spin, lean, notch positions]. */
const MONSTERA_LEAVES: Array<[number, number, number, number, number, number[]]> = [
  [0.72, 0.34, -0.5, 0.2, 0.16, [0.34, 0.62, 0.84]],
  [0.64, 0.3, -0.42, 2.3, -0.22, [0.4, 0.7]],
  [0.58, 0.28, -0.62, 4.1, 0.26, [0.36, 0.66, 0.88]],
  [0.5, 0.24, -0.34, 5.4, -0.12, [0.44, 0.74]],
  [0.44, 0.21, -0.72, 1.2, 0.3, [0.4, 0.72]],
];

/** A monstera in a woven pot — the one big leafy thing in an otherwise tidy shop. */
export function Monstera() {
  const leavesRef = useRef<THREE.Group>(null);
  const { reducedMotion } = useLabQuality();

  const geometries = useMemo(
    () => MONSTERA_LEAVES.map(([length, width, , , , notches]) => monsteraLeaf(length, width, notches)),
    [],
  );
  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries]);

  useFrame(({ clock }) => {
    if (!leavesRef.current || reducedMotion) return;
    const t = clock.getElapsedTime();
    leavesRef.current.children.forEach((leaf, index) => {
      // each blade drifts on its own phase, the way a big leaf catches a draught
      leaf.rotation.z = MONSTERA_LEAVES[index][4] + Math.sin(t * 0.4 + index * 1.3) * 0.05;
    });
  });

  const [x, , z] = MART_POS.monstera;

  return (
    <group position={[x, FLOOR_TOP_Y, z]}>
      {/* woven pot */}
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow raycast={NO_HIT}>
        <cylinderGeometry args={[0.32, 0.24, 0.56, 22]} />
        <meshStandardMaterial color="#d9bf9f" roughness={0.9} />
      </mesh>
      {[0.14, 0.3, 0.46].map((y) => (
        <mesh key={y} position={[0, y, 0]} raycast={NO_HIT}>
          <cylinderGeometry args={[0.325 - (0.46 - y) * 0.14, 0.325 - (0.46 - y) * 0.14, 0.035, 22]} />
          <meshStandardMaterial color="#c9ac8b" roughness={0.92} />
        </mesh>
      ))}
      <mesh position={[0, 0.57, 0]} raycast={NO_HIT}>
        <cylinderGeometry args={[0.3, 0.3, 0.03, 22]} />
        <meshStandardMaterial color="#6b5a48" roughness={0.98} />
      </mesh>

      <group ref={leavesRef} position={[0, 0.58, 0]}>
        {MONSTERA_LEAVES.map(([length, , tilt, spin, lean], index) => (
          <group key={index} rotation={[0, spin, lean]}>
            {/* stalk */}
            <mesh
              position={[0, length * 0.42, 0]}
              rotation={[tilt * 0.5, 0, 0]}
              castShadow
              raycast={NO_HIT}
            >
              <cylinderGeometry args={[0.016, 0.022, length * 0.9, 7]} />
              <meshStandardMaterial color="#5f8c48" roughness={0.8} />
            </mesh>
            {/* blade */}
            <mesh
              geometry={geometries[index]}
              position={[0, length * 0.8, length * 0.16]}
              rotation={[tilt, 0, 0]}
              castShadow
              raycast={NO_HIT}
            >
              <meshStandardMaterial
                color={index % 2 ? '#4f7f3d' : '#5f9c4a'}
                roughness={0.62}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/* ---------------------------------------------------------------- shop cat */

/**
 * Where the cat goes and what it does there. `y` is the surface it stands on, so
 * a stop higher than the floor is reached by jumping rather than walking.
 */
interface CatStop {
  id: string;
  at: [number, number];
  node: number;
  y: number;
  dwell: [number, number];
  action: 'sleep' | 'sit' | 'watch' | 'hide';
  facing?: number;
  weight?: number;
}

/** The checkout's top surface — where the till, the tub and a sitting cat all stand. */
const COUNTER_TOP = 0.8;

/**
 * Around the outer edge of the gallery floor. The old line cut straight
 * through the new installation, so every leg now stays beyond the plinth's
 * 1.9 m radius and the series island's front edge.
 */
const CAT_LANE: [number, number][] = [
  [4.1, -2.8],
  [3.4, -2.3],
  [2.6, -1.3],
  [2.6, 0.7],
  [2.5, 1.9],
  [2.3, 4.5],
  [1.6, 5.2],
  [-2.7, 5.2],
  [-3.2, 2.25],
  [-3.0, 0.5],
  [-3.2, -2.5],
  [-4.2, -3.3],
  [-5.2, -3.6],
];

/**
 * And the places worth going, hung off that corridor. It used to walk them in a
 * fixed cycle, which you could set a watch by; now it picks — weighted, so it is
 * mostly asleep on Momo's plinth and occasionally up somewhere it should not be, which
 * is the correct distribution for a cat.
 *
 * Every stop is clear of the keeper's own: the two of them cross the floor, which is
 * what a shop looks like, but they never stand in the same half metre.
 */
const CAT_STOPS: CatStop[] = [
  { id: 'plinth', at: [MART_POS.cat[0], MART_POS.cat[2]], node: 4, y: FLOOR_TOP_Y + MOMO_PLINTH.height, dwell: [12, 20], action: 'sleep', facing: -0.9, weight: 3 },
  { id: 'counter', at: [5.0, -3.95], node: 0, y: COUNTER_TOP, dwell: [7, 12], action: 'sit', facing: 0.3, weight: 2 },
  // On the floor beside the table, not on it — the radio and the mug live up
  // there and he was sitting on both.
  { id: 'corner', at: [-4.15, -3.1], node: 11, y: FLOOR_TOP_Y, dwell: [5, 9], action: 'sit', facing: 1.4, weight: 2 },
  { id: 'hide', at: [-5.2, -3.6], node: 12, y: FLOOR_TOP_Y, dwell: [8, 14], action: 'hide', facing: 1.5, weight: 2 },
  { id: 'east', at: [2.6, 0.7], node: 3, y: FLOOR_TOP_Y, dwell: [1.5, 3.5], action: 'watch' },
  { id: 'front', at: [1.6, 5.2], node: 6, y: FLOOR_TOP_Y, dwell: [1.5, 3.5], action: 'watch' },
  { id: 'west', at: [-3.0, 0.5], node: 9, y: FLOOR_TOP_Y, dwell: [1.5, 3], action: 'watch' },
];

const CAT_SPEED = 0.62;
const CAT_ARRIVE = 0.06;
const JUMP_SECONDS = 0.62;

function shortestTurn(from: number, to: number): number {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

/**
 * The shop cat.
 *
 * It walks its round, jumps up onto the counter and the stock boxes, and hides
 * in the corner — driven the same way the characters are, by a hand-authored
 * loop advanced only by speed x delta, so it can never end up somewhere the
 * route did not send it. Height changes are jumps: a parabola between the two
 * surfaces.
 *
 * This decides; it does not draw. Each frame it writes a `CatPose`, and the
 * Mochi cat model in `CatModel` reads it — walking, sitting, sleeping and the
 * stretch of a jump all come out of those four numbers.
 *
 * Purely decorative. It keeps the interaction hierarchy intact, where only
 * workers, machines, stations and products answer the pointer.
 */
export function ShopCat() {
  const rootRef = useRef<THREE.Group>(null);
  const hovered = useIsHovered('station', 'oyen');
  const selected = useIsSelected('station', 'oyen');
  /** What the model reads each frame. */
  const catPose = useMemo(createCatPose, []);
  const { reducedMotion } = useLabQuality();

  /** Where it is headed, and the corridor legs left to get there. */
  const here = useRef<CatStop>(CAT_STOPS[0]);
  const legs = useRef<[number, number][]>([]);
  const recent = useRef<string[]>([]);
  const walking = useRef(false);
  const dwellUntil = useRef(0);
  const started = useRef(false);
  const jump = useRef<{
    from: THREE.Vector3;
    to: THREE.Vector3;
    t: number;
    /** True when the arc lands on the leg's target rather than partway. */
    consumes: boolean;
    final: boolean;
  } | null>(null);
  /** 1 = up on all fours, 0 = curled on the floor. */
  const upright = useRef(0);
  const sitting = useRef(0);
  const speed = useRef(0);

  useEffect(() => {
    const group = rootRef.current;
    if (!group) return;
    registerAnchor('station', 'oyen', group);
    return () => {
      unregisterAnchor('station', 'oyen');
      document.body.style.cursor = 'auto';
    };
  }, []);

  /** Chooses somewhere new and lays out the walk to it. */
  const wanderOff = () => {
    const from = here.current;
    const next = pickStop(CAT_STOPS, recent.current);
    legs.current = planWalk(CAT_LANE, from, next);
    here.current = next;
    recent.current = [from.id, ...recent.current].slice(0, 2);
    walking.current = true;
  };

  useFrame(({ clock }, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const step = Math.min(delta, 1 / 30);
    const elapsed = clock.getElapsedTime();

    if (!started.current) {
      const first = CAT_STOPS[0];
      here.current = first;
      root.position.set(first.at[0], first.y, first.at[1]);
      root.rotation.y = first.facing ?? 0;
      dwellUntil.current = elapsed + rollDwell(first);
      started.current = true;
    }

    const stop = here.current;
    let wantUpright = 1;
    let wantSitting = 0;
    let moving = 0;
    let facing = root.rotation.y;

    /** Settles onto whatever it has just reached. */
    const arrive = () => {
      walking.current = false;
      dwellUntil.current = elapsed + rollDwell(stop);
    };

    // ---- mid-jump --------------------------------------------------------
    if (jump.current) {
      const arc = jump.current;
      arc.t = Math.min(1, arc.t + step / JUMP_SECONDS);
      root.position.lerpVectors(arc.from, arc.to, arc.t);
      root.position.y += Math.sin(arc.t * Math.PI) * 0.42;
      wantUpright = 1;
      if (arc.t >= 1) {
        root.position.copy(arc.to);
        const { consumes, final } = arc;
        jump.current = null;
        if (final) {
          legs.current = [];
          arrive();
        } else if (consumes) {
          legs.current.shift();
        }
        // otherwise it landed partway along and walks the rest of the leg
      }
    } else if (walking.current && !reducedMotion) {
      // ---- walking -------------------------------------------------------
      const leg = legs.current[0];

      if (!leg) {
        arrive();
      } else {
        const last = legs.current.length === 1;
        const dx = leg[0] - root.position.x;
        const dz = leg[1] - root.position.z;
        const distance = Math.hypot(dx, dz);
        // corridor nodes are all on the floor; only the last leg can be a perch
        const legY = last ? stop.y : FLOOR_TOP_Y;

        /*
          Height changes are jumps in both directions, and the two are not
          symmetric. It gathers itself and springs the last stride *up* onto a
          surface — but coming *down* it goes as soon as it sets off, landing
          partway along and walking the rest, because a cat does not shuffle to
          the edge of a counter and step off.
        */
        if (legY > root.position.y + 0.05 && distance < 0.75) {
          jump.current = {
            from: root.position.clone(),
            to: new THREE.Vector3(leg[0], legY, leg[1]),
            t: 0,
            consumes: true,
            final: last,
          };
        } else if (legY < root.position.y - 0.05) {
          const near = distance <= 0.7;
          const reach = Math.min(0.7, distance);
          jump.current = {
            from: root.position.clone(),
            to: near
              ? new THREE.Vector3(leg[0], legY, leg[1])
              : new THREE.Vector3(
                  root.position.x + (dx / distance) * reach,
                  legY,
                  root.position.z + (dz / distance) * reach,
                ),
            t: 0,
            consumes: near,
            final: near && last,
          };
          facing = Math.atan2(dx, dz);
        } else if (distance <= CAT_ARRIVE) {
          root.position.x = leg[0];
          root.position.z = leg[1];
          legs.current.shift();
          if (legs.current.length === 0) arrive();
        } else {
          const advance = Math.min(CAT_SPEED * step, distance);
          root.position.x += (dx / distance) * advance;
          root.position.z += (dz / distance) * advance;
          facing = Math.atan2(dx, dz);
          moving = 1;
        }
      }
    } else {
      // ---- dwelling ------------------------------------------------------
      facing = stop.facing ?? root.rotation.y;
      if (stop.action === 'sleep') wantUpright = 0;
      else if (stop.action === 'hide') wantUpright = 0.22;
      else if (stop.action === 'sit') wantSitting = 1;

      if (!reducedMotion && elapsed >= dwellUntil.current) wanderOff();
    }

    // turn toward travel before committing to it, the way an animal does
    root.rotation.y += shortestTurn(root.rotation.y, facing) * Math.min(1, step * 5);

    upright.current = THREE.MathUtils.damp(upright.current, wantUpright, 4, step);
    sitting.current = THREE.MathUtils.damp(sitting.current, wantSitting, 5, step);
    speed.current = THREE.MathUtils.damp(speed.current, moving, 6, step);
    // hand the decision to the model, which does the drawing
    catPose.up = upright.current;
    catPose.sit = sitting.current;
    catPose.run = speed.current;
    catPose.airborne = jump.current !== null;
  });

  return (
    <group
      ref={rootRef}
      position={[MART_POS.cat[0], FLOOR_TOP_Y + MOMO_PLINTH.height, MART_POS.cat[2]]}
      onPointerOver={(event) => {
        event.stopPropagation();
        hoverEntity({ kind: 'station', id: 'oyen' });
        // his own voice, not the workers' mumble — see meow() in lib/audio
        meow();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        hoverEntity(null);
        document.body.style.cursor = 'auto';
      }}
      onClick={(event) => {
        event.stopPropagation();
        selectEntity({ kind: 'station', id: 'oyen' });
      }}
    >
      {/* forgiving hit volume — he is a small cat in a big room */}
      <mesh visible={false} position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.32, 8, 6]} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={hovered || selected} raycast={NO_HIT}>
        <ringGeometry args={[0.3, 0.37, 28]} />
        <meshBasicMaterial color="#dda86a" transparent opacity={selected ? 0.85 : 0.45} />
      </mesh>
      {/*
        Its own Suspense boundary, as Bibi has in the Lab: the rest of the shop
        does not wait on the cat's file, and until it arrives the controller
        above simply walks an unseen cat along its route.
      */}
      <Suspense fallback={null}>
        <CatModel pose={catPose} />
      </Suspense>
    </group>
  );
}

/* -------------------------------------------------------------------- mural */
