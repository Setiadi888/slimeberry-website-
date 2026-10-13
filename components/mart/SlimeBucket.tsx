'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, type Ref } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Product as ProductData } from '@/lib/products';
import { useJiggle } from '@/lib/useJiggle';
import { onProductPulse } from '@/lib/labEvents';
import { registerAnchor, unregisterAnchor } from '@/lib/anchors';
import { hoverEntity, selectEntity, useIsHovered, useIsSelected } from '@/lib/interaction';
import { drawContained, drawFlowerFallback, drawWordmarkFallback, useBrandImage } from '@/lib/brand';
import { sharedBox, sharedSphere } from '@/lib/shared3d';
import { useLabQuality } from '@/components/lab/QualityContext';

/** The flower sticker and the splash on the lid label, as in the product shot. */
const FLOWER_PURPLE = '#9a4fbb';
const SPLASH_LILAC = '#bf93dc';
const GINGHAM_PINK = 'rgba(236, 112, 150, 0.36)';

/* The tub, in its own units: about 0.8 across the lid and 0.64 tall. */
const SHELL_H = 0.56;
const SHELL_R_TOP = 0.385;
const SHELL_R_BOTTOM = 0.312;
const FILL_BOTTOM = 0.025;
const FILL_TOP = 0.53;
const FILL_R_BOTTOM = 0.29;
const FILL_R_TOP = 0.358;
const LID_R = 0.405;
const LUG_X = LID_R + 0.015;
const LUG_Y = 0.52;
const TAB_COUNT = 16;
const STICKER_BOTTOM = 0.11;
const STICKER_TOP = 0.39;
/** Half the angle the sticker wraps round the wall — about as wide as it is tall. */
const STICKER_HALF = 0.43;
const PEARL_R = 0.028;
/**
 * The handle's rest angle about its lugs: hung down the back of the tub. Worked
 * out against the taper rather than eyeballed — any flatter and the middle of
 * the arc passes through the wall, because the tub is widest exactly where the
 * handle hangs.
 */
const HANDLE_REST = -2.1;
const HANDLE_RISE = 0.44;

const shellRadiusAt = (y: number) => SHELL_R_BOTTOM + (SHELL_R_TOP - SHELL_R_BOTTOM) * (y / SHELL_H);
const fillRadiusAt = (y: number) =>
  FILL_R_BOTTOM + (FILL_R_TOP - FILL_R_BOTTOM) * ((y - FILL_BOTTOM) / (FILL_TOP - FILL_BOTTOM));

type WallPearl = readonly [angle: number, y: number];
type TopPearl = readonly [angle: number, radius: number];

/**
 * Where the boba sit, per bucket, read off the product shot: a few caught under
 * the lid in the teal, sunk to the bottom in the purple, a ring in the pink and
 * a full band in the yellow. Angles are measured from the sticker side.
 *
 * Wall pearls are pressed into the slime's surface so they show through the
 * clear wall the way the real ones do; top pearls sit on the surface and are
 * seen through the ring of clear lid round the label.
 */
const PEARLS: ReadonlyArray<{ wall: readonly WallPearl[]; top: readonly TopPearl[] }> = [
  {
    wall: [[-0.62, 0.44], [-0.36, 0.455], [0.55, 0.445], [2.6, 0.44]],
    top: [[0.4, 0.22], [2.2, 0.18]],
  },
  {
    wall: [[0.28, 0.07], [0.52, 0.075], [0.76, 0.068], [-0.66, 0.07], [2.9, 0.072], [-2.3, 0.07]],
    top: [],
  },
  {
    wall: [[-0.95, 0.44], [-0.62, 0.455], [-0.26, 0.44], [0.1, 0.455], [0.47, 0.44], [1.5, 0.45], [-1.9, 0.45]],
    top: [[0.2, 0.25], [1.4, 0.2], [-1.1, 0.24]],
  },
  {
    wall: [
      [-1.0, 0.44], [-0.7, 0.455], [-0.4, 0.44], [-0.1, 0.455], [0.2, 0.44],
      [0.5, 0.455], [0.8, 0.445], [1.6, 0.45], [2.4, 0.44], [-2.0, 0.45],
    ],
    top: [[0.6, 0.26], [-0.5, 0.21], [2.6, 0.24], [1.7, 0.15]],
  },
];

/* ------------------------------------------------------------------ textures */

/*
  Cached at module level rather than per bucket. Every bucket's label and
  sticker are the same artwork, and a colour's glitter is the same for any
  bucket of that colour — drawing them per instance would upload identical
  canvases once per bucket, and again every time the shop is re-entered.
*/
const glitterMaps = new Map<string, THREE.CanvasTexture>();
const labelMaps = new Map<HTMLImageElement | 'drawn', THREE.CanvasTexture>();
let sparkleMap: THREE.CanvasTexture | null = null;
let stickerMap: THREE.CanvasTexture | null = null;

/** Seeded, so the glitter is laid down the same way on every visit. */
function seeded(text: string): () => number {
  let seed = 0;
  for (let i = 0; i < text.length; i += 1) seed = (seed * 31 + text.charCodeAt(i)) % 2147483647;
  seed = seed || 1;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

function canvasOf(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d')! };
}

/** The slime's colour with fine glitter through it, a little darker where it settles. */
function glitterMap(color: string): THREE.CanvasTexture {
  const cached = glitterMaps.get(color);
  if (cached) return cached;

  const size = 256;
  const { canvas, ctx } = canvasOf(size, size);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);

  const depth = ctx.createLinearGradient(0, 0, 0, size);
  depth.addColorStop(0, 'rgba(255,255,255,0.12)');
  depth.addColorStop(1, 'rgba(0,0,0,0.14)');
  ctx.fillStyle = depth;
  ctx.fillRect(0, 0, size, size);

  const rand = seeded(color);
  for (let i = 0; i < 1600; i += 1) {
    ctx.fillStyle = `rgba(255,255,255,${0.14 + rand() * 0.42})`;
    const speck = rand() < 0.8 ? 1 : 2;
    ctx.fillRect(Math.floor(rand() * size), Math.floor(rand() * size), speck, speck);
  }
  for (let i = 0; i < 700; i += 1) {
    ctx.fillStyle = `rgba(0,0,0,${0.06 + rand() * 0.12})`;
    ctx.fillRect(Math.floor(rand() * size), Math.floor(rand() * size), 1, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 1);
  texture.anisotropy = 4;
  glitterMaps.set(color, texture);
  return texture;
}

/**
 * The glints: sparse bright specks on black, used as the emissive map.
 *
 * Sampled nearest-neighbour with no mipmaps, deliberately. Filtered, specks
 * this small average away into a faint lightening of the whole tub; unfiltered
 * they stay as hard points of light that flicker as the bucket squashes or the
 * camera moves — which is precisely what glitter does, and costs nothing.
 */
export function glintsTexture(): THREE.CanvasTexture {
  if (sparkleMap) return sparkleMap;

  const size = 256;
  const { canvas, ctx } = canvasOf(size, size);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);

  const rand = seeded('glints');
  for (let i = 0; i < 180; i += 1) {
    const bright = 150 + Math.floor(rand() * 105);
    ctx.fillStyle = `rgb(${bright},${bright},${bright})`;
    ctx.fillRect(Math.floor(rand() * size), Math.floor(rand() * size), 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 1);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  sparkleMap = texture;
  return texture;
}

/** The purple SB flower on the front of every bucket. */
function sticker(): THREE.CanvasTexture {
  if (stickerMap) return stickerMap;

  const size = 256;
  const { canvas, ctx } = canvasOf(size, size);
  ctx.clearRect(0, 0, size, size);
  // the bloom reaches 1.08 of its radius, so 116 just fits a 256 canvas
  drawFlowerFallback(ctx, size / 2, size / 2, 116, FLOWER_PURPLE);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  stickerMap = texture;
  return texture;
}

/**
 * The lid label: pink gingham, a lilac splash across the lower half, the
 * wordmark over both, and the do-not-eat roundel at the foot. The real wordmark
 * is used the moment it is supplied, the drawn one until then — the same rule
 * every other label in the world follows.
 */
function label(wordmark: HTMLImageElement | null): THREE.CanvasTexture {
  const key = wordmark ?? 'drawn';
  const cached = labelMaps.get(key);
  if (cached) return cached;

  const size = 512;
  const c = size / 2;
  const { canvas, ctx } = canvasOf(size, size);

  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, c - 4, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  const band = size / 14;
  ctx.fillStyle = GINGHAM_PINK;
  for (let i = 0; i < 14; i += 2) {
    ctx.fillRect(i * band, 0, band, size);
    ctx.fillRect(0, i * band, size, band);
  }

  ctx.fillStyle = SPLASH_LILAC;
  ctx.beginPath();
  ctx.moveTo(0, 318);
  ctx.bezierCurveTo(90, 270, 150, 350, 250, 300);
  ctx.bezierCurveTo(340, 255, 420, 300, 512, 238);
  ctx.lineTo(512, 512);
  ctx.lineTo(0, 512);
  ctx.closePath();
  ctx.fill();
  for (const [x, y, r] of [
    [120, 352, 20],
    [372, 300, 16],
    [446, 282, 12],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // a soft halo so the wordmark sits on the check rather than fighting it
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(c, c - 20, 190, 120, 0, 0, Math.PI * 2);
  ctx.fill();

  if (wordmark) drawContained(ctx, wordmark, c, c - 22, size * 0.7, size * 0.5);
  else drawWordmarkFallback(ctx, c, c - 8, 240);

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(c, 432, 27, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d64545';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(c, 432, 20, 0, Math.PI * 2);
  ctx.moveTo(c - 14, 418);
  ctx.lineTo(c + 14, 446);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  labelMaps.set(key, texture);
  return texture;
}

/* ------------------------------------------------------- geometry, materials */

let plastic: {
  shell: THREE.MeshPhysicalMaterial;
  rim: THREE.MeshPhysicalMaterial;
  handle: THREE.MeshPhysicalMaterial;
  pearl: THREE.MeshStandardMaterial;
} | null = null;

/**
 * The clear plastic, shared by every bucket. Never mutated after this — the one
 * material that animates, the glittering slime, belongs to each bucket alone.
 *
 * The wall is nearly invisible and the lid and rim cloudier, which is how clear
 * PP reads in the photo: you see straight through the thin wall, and the thick
 * moulded parts go milky.
 */
function sharedPlastic() {
  if (plastic) return plastic;
  plastic = {
    shell: new THREE.MeshPhysicalMaterial({
      color: '#f3f8fc',
      roughness: 0.06,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    rim: new THREE.MeshPhysicalMaterial({
      color: '#eef4f8',
      roughness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    handle: new THREE.MeshPhysicalMaterial({
      color: '#eef4f8',
      roughness: 0.1,
      clearcoat: 1,
      transparent: true,
      opacity: 0.62,
    }),
    pearl: new THREE.MeshStandardMaterial({ color: '#1e1722', roughness: 0.3, metalness: 0.04 }),
  };
  return plastic;
}

let handleTube: THREE.TubeGeometry | null = null;
let stickerWrap: THREE.CylinderGeometry | null = null;

/** The bail handle: a half-ellipse from lug to lug, as a thin tube. */
function handleGeometry(): THREE.TubeGeometry {
  if (handleTube) return handleTube;
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 20; i += 1) {
    const t = (i / 20) * Math.PI;
    points.push(new THREE.Vector3(Math.cos(t) * LUG_X, Math.sin(t) * HANDLE_RISE, 0));
  }
  handleTube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, 0.012, 6, false);
  return handleTube;
}

/**
 * A strip of cone matching the wall's taper, so the sticker wraps the tub
 * instead of standing off it as a flat card whose edges float in the air.
 */
function stickerGeometry(): THREE.CylinderGeometry {
  if (stickerWrap) return stickerWrap;
  stickerWrap = new THREE.CylinderGeometry(
    shellRadiusAt(STICKER_TOP) + 0.003,
    shellRadiusAt(STICKER_BOTTOM) + 0.003,
    STICKER_TOP - STICKER_BOTTOM,
    16,
    1,
    true,
    -STICKER_HALF,
    STICKER_HALF * 2,
  );
  return stickerWrap;
}

/* ----------------------------------------------------------------- component */

interface SlimeBucketProps {
  product: ProductData;
  position: [number, number, number];
  scale?: number;
  /** Turns the whole bucket — sticker, pearls and handle together. */
  rotation?: number;
}

/**
 * Every mesh of a boba bucket, in its own units, standing on its own origin.
 * Shared by the pickable bucket on the SB Mart table and the plain one riding
 * the Lab's belt. The handle is hung from a group the caller can hold, so the
 * pickable one can swing it.
 */
function BucketBody({
  product,
  handleRef,
  bodyRef,
}: {
  product: ProductData;
  handleRef?: Ref<THREE.Group>;
  bodyRef?: Ref<THREE.MeshPhysicalMaterial>;
}) {
  const wallPearlsRef = useRef<THREE.InstancedMesh>(null);
  const topPearlsRef = useRef<THREE.InstancedMesh>(null);
  const tabsRef = useRef<THREE.InstancedMesh>(null);
  const wordmark = useBrandImage('wordmark');

  const materials = useMemo(sharedPlastic, []);
  const glitter = useMemo(() => glitterMap(product.color), [product.color]);
  const glints = useMemo(glintsTexture, []);
  const flower = useMemo(sticker, []);
  const lidLabel = useMemo(() => label(wordmark), [wordmark]);
  const handleShape = useMemo(handleGeometry, []);
  const stickerShape = useMemo(stickerGeometry, []);
  const pearlShape = useMemo(() => sharedSphere(PEARL_R, 12, 10), []);
  const tabShape = useMemo(() => sharedBox(0.05, 0.07, 0.018), []);
  const layout = PEARLS[product.slot % PEARLS.length];

  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();

    const wall = wallPearlsRef.current;
    if (wall) {
      layout.wall.forEach(([angle, y], index) => {
        const radius = fillRadiusAt(y) - 0.004;
        matrix.makeTranslation(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
        wall.setMatrixAt(index, matrix);
      });
      wall.instanceMatrix.needsUpdate = true;
    }

    const top = topPearlsRef.current;
    if (top) {
      layout.top.forEach(([angle, radius], index) => {
        matrix.makeTranslation(Math.sin(angle) * radius, FILL_TOP + 0.008, Math.cos(angle) * radius);
        top.setMatrixAt(index, matrix);
      });
      top.instanceMatrix.needsUpdate = true;
    }

    const tabs = tabsRef.current;
    if (tabs) {
      const turn = new THREE.Matrix4();
      for (let i = 0; i < TAB_COUNT; i += 1) {
        // offset half a step, so no tab lands on a handle lug
        turn.makeRotationY(((i + 0.5) / TAB_COUNT) * Math.PI * 2);
        matrix.makeTranslation(0, 0.535, LID_R + 0.006).premultiply(turn);
        tabs.setMatrixAt(i, matrix);
      }
      tabs.instanceMatrix.needsUpdate = true;
    }
  }, [layout]);

  return (
    <>
      {/* the slime: glitter in the colour, glints lit on top of it */}
      <mesh position={[0, (FILL_TOP + FILL_BOTTOM) / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[FILL_R_TOP, FILL_R_BOTTOM, FILL_TOP - FILL_BOTTOM, 44]} />
        <meshPhysicalMaterial
          ref={bodyRef}
          map={glitter}
          emissiveMap={glints}
          emissive="#ffffff"
          emissiveIntensity={0.32}
          roughness={0.3}
          clearcoat={0.4}
          clearcoatRoughness={0.25}
        />
      </mesh>

      {/* the boba */}
      <instancedMesh
        ref={wallPearlsRef}
        args={[pearlShape, materials.pearl, layout.wall.length]}
        castShadow
        frustumCulled={false}
      />
      {layout.top.length > 0 && (
        <instancedMesh
          ref={topPearlsRef}
          args={[pearlShape, materials.pearl, layout.top.length]}
          frustumCulled={false}
        />
      )}

      {/* the clear tub and its thicker, cloudier base */}
      <mesh position={[0, SHELL_H / 2, 0]} material={materials.shell}>
        <cylinderGeometry args={[SHELL_R_TOP, SHELL_R_BOTTOM, SHELL_H, 44, 1, true]} />
      </mesh>
      <mesh position={[0, 0.012, 0]} material={materials.rim} receiveShadow>
        <cylinderGeometry args={[SHELL_R_BOTTOM, SHELL_R_BOTTOM - 0.012, 0.024, 44]} />
      </mesh>

      {/* the flower sticker, wrapped round the wall */}
      <mesh position={[0, (STICKER_TOP + STICKER_BOTTOM) / 2, 0]} geometry={stickerShape}>
        <meshStandardMaterial map={flower} alphaTest={0.5} roughness={0.5} />
      </mesh>

      {/* lid skirt, its tamper tabs, and the two lugs the handle hangs from */}
      <mesh position={[0, 0.555, 0]} material={materials.rim}>
        <cylinderGeometry args={[LID_R, LID_R, 0.11, 48, 1, true]} />
      </mesh>
      <instancedMesh ref={tabsRef} args={[tabShape, materials.rim, TAB_COUNT]} frustumCulled={false} />
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * LUG_X, LUG_Y, 0]}
          rotation={[0, 0, Math.PI / 2]}
          material={materials.handle}
        >
          <cylinderGeometry args={[0.03, 0.03, 0.03, 12]} />
        </mesh>
      ))}

      {/* lid plate, its raised ring, and the printed label */}
      <mesh position={[0, 0.6, 0]} material={materials.rim}>
        <cylinderGeometry args={[LID_R, LID_R, 0.035, 48]} />
      </mesh>
      <mesh position={[0, 0.622, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.rim}>
        <torusGeometry args={[0.3, 0.016, 8, 48]} />
      </mesh>
      <mesh position={[0, 0.619, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.27, 48]} />
        <meshStandardMaterial map={lidLabel} roughness={0.5} polygonOffset polygonOffsetFactor={-1} />
      </mesh>

      {/* the handle, pivoting on the lugs */}
      <group ref={handleRef} position={[0, LUG_Y, 0]} rotation={[HANDLE_REST, 0, 0]}>
        <mesh geometry={handleShape} material={materials.handle} castShadow />
      </group>
    </>
  );
}

/**
 * A boba bucket: a clear, tapered, handled tub of glitter slime with black
 * pearls pressed against the wall, a gingham label on the lid and the purple SB
 * flower on the front.
 *
 * Its own model rather than a variant of `SlimeTub`, because almost nothing is
 * shared — the cup is opaque and printed, this is clear and the slime is the
 * surface. What *is* shared is the whole interaction contract: the anchor, the
 * hover and select, the jiggle spring and the add-to-cart pulse are exactly the
 * cup's, so the camera, the cards and the cart cannot tell the two apart.
 *
 * The handle is live. A squeeze swings it out from the tub and lets it fall
 * back, and it only ever swings outward, since the other way is through the wall.
 */
export function SlimeBucket({ product, position, scale = 1, rotation = 0 }: SlimeBucketProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bucketRef = useRef<THREE.Group>(null);
  const handleRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const { impulse, update } = useJiggle(140, 8);
  const { reducedMotion } = useLabQuality();
  /** So four buckets side by side do not glitter in unison. */
  const phase = product.slot * 1.7;

  const hovered = useIsHovered('product', product.id);
  const selected = useIsSelected('product', product.id);
  const active = hovered || selected;

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    registerAnchor('product', product.id, group);
    return () => {
      unregisterAnchor('product', product.id);
      document.body.style.cursor = 'auto';
    };
  }, [product.id]);

  useEffect(
    () =>
      onProductPulse((id) => {
        if (id === product.id) impulse(3.4);
      }),
    [impulse, product.id],
  );

  useFrame((state, delta) => {
    const bucket = bucketRef.current;
    if (!bucket) return;

    const wobble = update(delta);
    bucket.position.y = THREE.MathUtils.damp(bucket.position.y, active ? 0.12 * scale : 0, 8, delta);
    const target = (selected ? 1.12 : hovered ? 1.06 : 1) * scale;
    const eased = THREE.MathUtils.damp(bucket.scale.x, target, 9, delta);
    bucket.scale.set(eased * (1 - wobble * 0.28), eased * (1 + wobble * 0.46), eased * (1 - wobble * 0.28));

    const handle = handleRef.current;
    if (handle) handle.rotation.x = HANDLE_REST + Math.min(Math.abs(wobble) * 1.6, 0.9);

    const body = bodyRef.current;
    if (body) {
      const base = active ? 0.55 : 0.32;
      body.emissiveIntensity = reducedMotion
        ? base
        : base + Math.sin(state.clock.elapsedTime * 1.3 + phase) * 0.08;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
      <group
        ref={bucketRef}
        scale={scale}
        onPointerOver={(event) => {
          event.stopPropagation();
          hoverEntity({ kind: 'product', id: product.id });
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          hoverEntity(null);
          document.body.style.cursor = 'auto';
        }}
        onClick={(event) => {
          event.stopPropagation();
          impulse(1.5);
          selectEntity({ kind: 'product', id: product.id });
        }}
      >
        {/* forgiving hit volume, handle included */}
        <mesh visible={false} position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.47, 0.47, 0.8, 8]} />
        </mesh>
        <BucketBody product={product} handleRef={handleRef} bodyRef={bodyRef} />
      </group>

      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={active} scale={scale}>
        <ringGeometry args={[0.47, 0.56, 36]} />
        <meshBasicMaterial color={product.accent} transparent opacity={selected ? 0.85 : 0.4} />
      </mesh>
    </group>
  );
}

/**
 * A boba bucket as scenery — cargo on the Lab's belt. The same model with none
 * of the picking, for the same reason as the fruit cup's prop.
 */
export function BucketProp({ product, position, scale = 1, rotation = 0 }: SlimeBucketProps) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((object) => {
      object.raycast = () => null;
    });
  }, []);
  return (
    <group ref={ref} position={position} rotation={[0, rotation, 0]} scale={scale}>
      <BucketBody product={product} />
    </group>
  );
}
