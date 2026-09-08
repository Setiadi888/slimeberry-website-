'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { FLOOR_TOP_Y } from '@/lib/layout';
import { MART_POS } from '@/lib/martLayout';
import { MINI_PRODUCTS, SIGNATURE_PRODUCTS, getProduct } from '@/lib/products';
import { toggleMusic, useMusicEnabled } from '@/lib/audio';
import { readTrolleyPusher } from '@/lib/trolley';
import { getAnchor } from '@/lib/anchors';
import { drawContained, drawFlowerFallback, BRAND, useBrandImage } from '@/lib/brand';
import { useLabQuality } from '@/components/lab/QualityContext';
import { NO_HIT, StationGroup } from '@/components/lab/StationGroup';
import { SlimeTub } from '@/components/lab/SlimeTub';

/** Every tester except the mango, which is the tub kept by the till. */
const CABINET_MINIS = MINI_PRODUCTS.filter((product) => product.id !== 'mango');
const TUB = getProduct('mango');

/* ------------------------------------------------------------ signature wall */

/**
 * The back wall run. Full-size jars at eye level with the price rail under
 * them, faced up the way a real shop merchandises its hero line.
 */
export function SignatureWall() {
  return (
    <StationGroup id="martshelf" position={MART_POS.wallShelf} ringRadius={1.8} ringColor="#d94f75">
      {/* backboard */}
      <RoundedBox args={[3.0, 2.5, 0.12]} radius={0.06} smoothness={3} position={[0, 1.35, -0.4]} receiveShadow>
        <meshStandardMaterial color="#f6dfe6" roughness={0.88} />
      </RoundedBox>

      {/* two shelves: stock below, the faced-up line above */}
      {[0.72, 1.46].map((y) => (
        <RoundedBox key={y} args={[2.9, 0.1, 0.72]} radius={0.04} smoothness={3} position={[0, y, 0]} castShadow receiveShadow raycast={NO_HIT}>
          <meshStandardMaterial color={PALETTE.shell} roughness={0.6} />
        </RoundedBox>
      ))}
      {[0.72, 1.46].map((y) => (
        <mesh key={`rail-${y}`} position={[0, y + 0.07, 0.36]} raycast={NO_HIT}>
          <boxGeometry args={[2.9, 0.1, 0.02]} />
          <meshStandardMaterial color={PALETTE.berry} roughness={0.6} />
        </mesh>
      ))}
      {[-1.48, 1.48].map((x) => (
        <mesh key={x} position={[x, 1.15, -0.05]} castShadow raycast={NO_HIT}>
          <boxGeometry args={[0.1, 2.3, 0.68]} />
          <meshStandardMaterial color={PALETTE.shell} roughness={0.65} />
        </mesh>
      ))}
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow raycast={NO_HIT}>
        <boxGeometry args={[2.9, 0.32, 0.68]} />
        <meshStandardMaterial color="#e9d3d9" roughness={0.8} />
      </mesh>

      {/* the four signature cups, pickable exactly as in the Lab */}
      {SIGNATURE_PRODUCTS.map((product) => (
        <SlimeTub
          key={product.id}
          product={product}
          position={[(product.slot - 1.5) * 0.7, 1.51, 0.06]}
          scale={0.68}
          stickerRotation={(product.slot - 1.5) * 0.16}
        />
      ))}

      {/* backup stock on the lower shelf, decorative */}
      {SIGNATURE_PRODUCTS.map((product, index) => (
        <mesh key={`stock-${product.id}`} position={[(index - 1.5) * 0.7, 0.92, 0.02]} castShadow raycast={NO_HIT}>
          <cylinderGeometry args={[0.16, 0.14, 0.26, 16]} />
          <meshPhysicalMaterial color={product.color} roughness={0.28} clearcoat={0.6} transparent opacity={0.88} />
        </mesh>
      ))}
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
/* A cup is 0.89 wide at scale 1, so 0.3 puts three of them across a 0.8 bay
   with the same footprint the old tester jars had. */
const CUP_SCALE = 0.3;
const CUP_SPACING = 0.26;
const SHELF_Y = [0.12, 0.82, 1.52, 2.22];

/**
 * The record cabinet — the shop's hi-fi corner, built after the reference photo
 * but in the mart's own warm oak rather than dark walnut, so it belongs to this
 * room rather than looking imported from another one.
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
    <StationGroup id="vinyl" position={MART_POS.vinyl} ringRadius={1.6} ringColor="#c9ac8b">
      {/* carcass: back, four uprights, four shelves */}
      <RoundedBox args={[2.6, 2.42, 0.1]} radius={0.04} smoothness={3} position={[0, 1.21, -0.28]} receiveShadow>
        <meshStandardMaterial color="#d9bf9f" roughness={0.82} />
      </RoundedBox>
      {[-1.3, -0.433, 0.433, 1.3].map((x) => (
        <mesh key={x} position={[x, 1.21, 0]} castShadow receiveShadow raycast={NO_HIT}>
          <boxGeometry args={[0.07, 2.42, 0.52]} />
          <meshStandardMaterial color={PALETTE.wood} roughness={0.78} />
        </mesh>
      ))}
      {SHELF_Y.map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow receiveShadow raycast={NO_HIT}>
          <boxGeometry args={[2.6, 0.07, 0.52]} />
          <meshStandardMaterial color={PALETTE.wood} roughness={0.78} />
        </mesh>
      ))}
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow raycast={NO_HIT}>
        <boxGeometry args={[2.62, 0.1, 0.54]} />
        <meshStandardMaterial color={PALETTE.woodDark} roughness={0.82} />
      </mesh>

      {/* ---- top shelf: sleeves on the left and middle, a plant on the right */}
      {sleeves.slice(0, 2).map((texture, index) => (
        <mesh
          key={index}
          position={[BAY_X[index] + (index === 0 ? -0.06 : 0), 1.85, index === 0 ? 0.04 : 0.02]}
          rotation={[0.07, index === 0 ? 0.08 : -0.05, 0]}
          castShadow
          raycast={NO_HIT}
        >
          <boxGeometry args={[0.56, 0.56, 0.02]} />
          <meshStandardMaterial map={texture} roughness={0.72} />
        </mesh>
      ))}
      {sleeves[2] && (
        <mesh position={[BAY_X[0] + 0.12, 1.83, -0.1]} rotation={[0.07, 0.16, 0]} castShadow raycast={NO_HIT}>
          <boxGeometry args={[0.54, 0.54, 0.02]} />
          <meshStandardMaterial map={sleeves[2]} roughness={0.72} />
        </mesh>
      )}
      <group position={[BAY_X[2], 1.59, 0.02]}>
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
          <meshStandardMaterial color="#c2ab90" roughness={0.8} />
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
        ---- the Mainline SB Cups, spread across the three remaining bays ----
        The plain tester jars are gone: every cup on this cabinet is now the
        retail tub, each one taking its own flavour's tint through the gingham
        lid and the flower sticker.
      */}
      {[BAY_X[2], BAY_X[0], BAY_X[1]].map((bayX, bay) => {
        const shelfY = bay === 0 ? 0.855 : 0.155;
        return CABINET_MINIS.slice(bay * 3, bay * 3 + 3).map((product, index) => (
          <SlimeTub
            key={product.id}
            product={product}
            position={[bayX + (index - 1) * CUP_SPACING, shelfY, 0.06]}
            scale={CUP_SCALE}
            stickerRotation={(index - 1) * 0.25}
          />
        ));
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

/* -------------------------------------------------------------------- carpet */

/** The SB mark woven into the rug, drawn once to a canvas. */
function useMonogramTexture(flower: HTMLImageElement | null): THREE.CanvasTexture | null {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, size, size);
    if (flower) drawContained(ctx, flower, size / 2, size / 2, size * 0.94, size * 0.94);
    else drawFlowerFallback(ctx, size / 2, size / 2, size * 0.46, BRAND.blue);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, [flower]);
}

/**
 * A rug cut to the shape of a slime blob, in place of the low gondola that used
 * to sit here. The outline is a circle with two harmonics folded into its
 * radius, which is enough to read as "blob" and not as "circle".
 */
export function BlobCarpet() {
  const flower = useBrandImage('flowerBlue');
  const monogram = useMonogramTexture(flower);

  const geometries = useMemo(() => {
    const blob = (radius: number) => {
      const points: THREE.Vector2[] = [];
      for (let i = 0; i < 72; i += 1) {
        const angle = (i / 72) * Math.PI * 2;
        const wobble = 1 + Math.sin(angle * 3) * 0.11 + Math.sin(angle * 5 + 1.2) * 0.06;
        points.push(
          new THREE.Vector2(Math.cos(angle) * radius * wobble, Math.sin(angle) * radius * wobble),
        );
      }
      return new THREE.ShapeGeometry(new THREE.Shape(points), 12);
    };
    return { outer: blob(1.8), inner: blob(1.28) };
  }, []);

  useEffect(
    () => () => {
      geometries.outer.dispose();
      geometries.inner.dispose();
      monogram?.dispose();
    },
    [geometries, monogram],
  );

  const [x, , z] = MART_POS.carpet;

  return (
    <group position={[x, FLOOR_TOP_Y + 0.004, z]} rotation={[-Math.PI / 2, 0, 0.4]}>
      <mesh geometry={geometries.outer} receiveShadow raycast={NO_HIT}>
        <meshStandardMaterial color={PALETTE.berry} roughness={0.96} />
      </mesh>
      <mesh geometry={geometries.inner} position={[0, 0, 0.003]} raycast={NO_HIT}>
        <meshStandardMaterial color="#f6dfe6" roughness={0.96} />
      </mesh>
      {/* the monogram, turned back upright against the rug's own tilt */}
      {monogram && (
        <mesh position={[0, 0, 0.006]} rotation={[0, 0, -0.4]} raycast={NO_HIT}>
          <planeGeometry args={[2.1, 2.1]} />
          <meshStandardMaterial map={monogram} transparent roughness={0.95} />
        </mesh>
      )}
    </group>
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
    <StationGroup id="checkout" position={MART_POS.counter} ringRadius={1.5} ringColor="#c98f3a">
      <RoundedBox args={[2.2, 0.95, 0.85]} radius={0.07} smoothness={3} position={[0, 0.48, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={PALETTE.wood} roughness={0.78} />
      </RoundedBox>
      <RoundedBox args={[2.34, 0.1, 0.98]} radius={0.04} smoothness={3} position={[0, 1.0, 0]} castShadow receiveShadow raycast={NO_HIT}>
        <meshStandardMaterial color={PALETTE.shell} roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, 0.42, 0.43]} raycast={NO_HIT}>
        <boxGeometry args={[2.06, 0.3, 0.02]} />
        <meshStandardMaterial color={PALETTE.berry} roughness={0.7} />
      </mesh>

      {/* register */}
      <group position={[-0.6, 1.05, -0.02]} rotation={[0, 0.22, 0]}>
        <RoundedBox args={[0.46, 0.28, 0.38]} radius={0.05} smoothness={3} position={[0, 0.14, 0]} castShadow raycast={NO_HIT}>
          <meshStandardMaterial color="#eef2f7" roughness={0.5} />
        </RoundedBox>
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

      {/* the retail tub, kept by the till */}
      {TUB && <SlimeTub product={TUB} position={[0.62, 1.05, 0.06]} scale={0.55} />}

      {[0, 1].map((i) => (
        <mesh key={i} position={[0.02 + i * 0.14, 1.11, -0.3]} rotation={[0, i * 0.4, 0]} castShadow raycast={NO_HIT}>
          <boxGeometry args={[0.2, 0.12, 0.1]} />
          <meshStandardMaterial color="#e3cdb0" roughness={0.85} />
        </mesh>
      ))}
    </StationGroup>
  );
}

/* --------------------------------------------------------- shopping trolley */

const CAGE_RAILS = [0.06, 0.2, 0.34];
/** How it sits when nobody has hold of it. */
const PARK_ROTATION = -0.55;

/**
 * A proper shopping trolley. The cage is suggested with horizontal rails and
 * corner posts rather than modelled as mesh — at this scale the rails are what
 * the eye reads as wire.
 */
export function ShoppingTrolley() {
  const { reducedMotion } = useLabQuality();
  const rootRef = useRef<THREE.Group>(null);
  const wheelsRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);

  const [parkX, , parkZ] = MART_POS.trolley;
  const park = useMemo(() => new THREE.Vector3(parkX, FLOOR_TOP_Y, parkZ), [parkX, parkZ]);
  const goal = useMemo(() => new THREE.Vector3(), []);
  const previous = useRef(new THREE.Vector3(parkX, FLOOR_TOP_Y, parkZ));

  useFrame(({ clock }, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const step = Math.min(delta, 1 / 30);
    const t = clock.getElapsedTime();

    /*
      Whoever is flagged as pushing gets the trolley: it sits a stride in front
      of them, square to the way they are facing, and eases back to its parking
      spot by the door the moment they let go. Damping rather than parenting, so
      it never snaps between the two and needs no reparenting mid-scene.
    */
    const pusher = readTrolleyPusher();
    const handler = pusher ? getAnchor('worker', pusher) : undefined;

    let goalRotation = PARK_ROTATION;
    if (handler) {
      goalRotation = handler.rotation.y;
      goal
        .set(Math.sin(goalRotation), 0, Math.cos(goalRotation))
        .multiplyScalar(0.62)
        .add(handler.position);
      goal.y = FLOOR_TOP_Y;
    } else {
      goal.copy(park);
    }

    root.position.x = THREE.MathUtils.damp(root.position.x, goal.x, 4.5, step);
    root.position.z = THREE.MathUtils.damp(root.position.z, goal.z, 4.5, step);
    root.position.y = FLOOR_TOP_Y;

    let turn = (goalRotation - root.rotation.y) % (Math.PI * 2);
    if (turn > Math.PI) turn -= Math.PI * 2;
    if (turn < -Math.PI) turn += Math.PI * 2;
    root.rotation.y += turn * Math.min(1, step * 4);

    if (reducedMotion) return;

    // how far it actually moved this frame drives the castors and the sway
    const travelled = previous.current.distanceTo(root.position);
    previous.current.copy(root.position);
    const rolling = travelled / Math.max(step, 0.0001);

    if (bodyRef.current) {
      bodyRef.current.rotation.z = Math.sin(t * 0.6) * 0.006 - Math.min(rolling * 0.04, 0.05);
    }
    wheelsRef.current?.children.forEach((wheel, index) => {
      const spin = wheel.children[1];
      if (spin) spin.rotation.x -= rolling * step * 9;
      wheel.rotation.y = rolling > 0.05 ? 0 : Math.sin(t * 0.5 + index) * 0.22;
    });
  });

  return (
    <group ref={rootRef} position={[parkX, FLOOR_TOP_Y, parkZ]} rotation={[0, PARK_ROTATION, 0]}>
      <group ref={bodyRef}>
        <mesh position={[0, 0.44, 0]} rotation={[0.08, 0, 0]} castShadow receiveShadow raycast={NO_HIT}>
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

        {[
          [-0.14, 0.55, -0.16, '#f4879f'],
          [0.12, 0.55, -0.02, '#9dc47f'],
          [-0.02, 0.55, 0.16, '#8ed0e8'],
        ].map(([px, py, pz, tint], index) => (
          <mesh key={index} position={[px as number, py as number, pz as number]} castShadow raycast={NO_HIT}>
            <cylinderGeometry args={[0.1, 0.09, 0.19, 14]} />
            <meshPhysicalMaterial color={tint as string} roughness={0.28} clearcoat={0.6} />
          </mesh>
        ))}
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

/* --------------------------------------------------------------- dressing */

/** Entrance mat, stock boxes and a couple of lived-in details. */
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
        <meshStandardMaterial color="#d9c3ae" roughness={0.95} />
      </mesh>

      <group position={[MART_POS.stock[0], FLOOR_TOP_Y, MART_POS.stock[2]]}>
        {[
          [0, 0.24, 0, 0.2],
          [0.05, 0.7, 0.06, -0.15],
          [0.62, 0.2, -0.18, 0.42],
        ].map(([x, y, z, rot], index) => (
          <RoundedBox
            key={index}
            args={[0.62, index === 2 ? 0.4 : 0.44, 0.5]}
            radius={0.04}
            smoothness={3}
            position={[x, y, z]}
            rotation={[0, rot, 0]}
            castShadow
            receiveShadow
            raycast={NO_HIT}
          >
            <meshStandardMaterial color={index % 2 ? PALETTE.woodDark : PALETTE.wood} roughness={0.85} />
          </RoundedBox>
        ))}
        <mesh position={[0.05, 0.94, 0.06]} rotation={[0, 0.5, 0]} raycast={NO_HIT}>
          <boxGeometry args={[0.16, 0.03, 0.04]} />
          <meshStandardMaterial color={PALETTE.berry} roughness={0.5} />
        </mesh>
      </group>

      <group position={[-4.4, FLOOR_TOP_Y, 1.9]} rotation={[0, 0, 0.14]}>
        <mesh position={[0, 0.75, 0]} castShadow raycast={NO_HIT}>
          <cylinderGeometry args={[0.028, 0.028, 1.5, 8]} />
          <meshStandardMaterial color={PALETTE.woodDark} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.08, 0]} castShadow raycast={NO_HIT}>
          <capsuleGeometry args={[0.11, 0.1, 4, 10]} />
          <meshStandardMaterial color="#c9d0da" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}
