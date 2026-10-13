'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, type Ref } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Product as ProductData } from '@/lib/products';
import { useJiggle } from '@/lib/useJiggle';
import { onProductPulse } from '@/lib/labEvents';
import { registerAnchor, unregisterAnchor } from '@/lib/anchors';
import { hoverEntity, selectEntity, useIsHovered, useIsSelected } from '@/lib/interaction';
import { drawContained, drawWordmarkFallback, useBrandImage } from '@/lib/brand';
import { sharedBox } from '@/lib/shared3d';
import { useLabQuality } from '@/components/lab/QualityContext';
import { glintsTexture } from './SlimeBucket';

const LID_WHITE = '#fbfbfa';
const SB_NAVY = '#24348f';
const LEAF_GREEN = '#4caf2a';

/* The cup in its own units: 1.0 to the top of the lid, 0.9 across it. */
const BASE_TOP = 0.25;
const FILL_TOP = 0.74;
const BODY_R_TOP = 0.397;
const BODY_R_BOTTOM = 0.387;
const WALL_GAP = 0.01;
const LID_R = 0.452;
const LID_BOTTOM = 0.715;
const LID_TOP = 1.0;
const RIB_COUNT = 28;
const STICKER_BOTTOM = 0.33;
const STICKER_TOP = 0.67;
/** Half the angle the flower wraps round the cup — about as wide as it is tall. */
const STICKER_HALF = 0.43;

const bodyRadiusAt = (y: number) => BODY_R_BOTTOM + (BODY_R_TOP - BODY_R_BOTTOM) * (y / FILL_TOP);

/** Hex to rgba, so a flavour's own colour can be printed as translucent check. */
function withAlpha(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

/* ------------------------------------------------------------------ textures */

/* Cached by what they depend on, not per cup: eight cups, eight labels, and a
   re-entered shop reuses every one of them. */
const labelMaps = new Map<string, THREE.CanvasTexture>();
const stickerMaps = new Map<string, THREE.CanvasTexture>();

function canvasOf(size: number) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return { canvas, ctx: canvas.getContext('2d')! };
}

function finished(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * The lid label, as on the product shot: gingham in the flavour's own colour
 * inside a white rim, the stacked wordmark, "fruit series" in green between two
 * little crosses, and the do-not-eat roundel. The holographic cup's check is a
 * pastel rainbow instead of one colour.
 */
function label(product: ProductData, wordmark: HTMLImageElement | null): THREE.CanvasTexture {
  const holo = product.finish === 'holo';
  const key = `${holo ? 'holo' : product.color}|${wordmark ? 'real' : 'drawn'}`;
  const cached = labelMaps.get(key);
  if (cached) return cached;

  const size = 512;
  const c = size / 2;
  const { canvas, ctx } = canvasOf(size);

  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, c - 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  let stripe: string | CanvasGradient = withAlpha(product.color, 0.42);
  if (holo) {
    const rainbow = ctx.createLinearGradient(0, 0, size, size);
    const stops = ['#ff96be', '#ffd782', '#8ce1b9', '#8cc3ff', '#cda0ff'];
    stops.forEach((colour, index) => rainbow.addColorStop(index / (stops.length - 1), withAlpha(colour, 0.5)));
    stripe = rainbow;
  }
  const band = size / 13;
  ctx.fillStyle = stripe;
  for (let i = 0; i < 13; i += 2) {
    ctx.fillRect(i * band, 0, band, size);
    ctx.fillRect(0, i * band, size, band);
  }
  ctx.restore();

  // the white rim the label is printed with
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(c, c, c - 10, 0, Math.PI * 2);
  ctx.stroke();

  if (wordmark) drawContained(ctx, wordmark, c, c - 40, size * 0.66, size * 0.44);
  else drawWordmarkFallback(ctx, c, c - 28, 220);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.font = 'italic 800 46px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText('fruit series', c, c + 96);
  ctx.fillStyle = LEAF_GREEN;
  ctx.fillText('fruit series', c, c + 96);
  for (const side of [-1, 1]) {
    const x = c + side * 168;
    ctx.fillRect(x - 12, c + 93, 24, 7);
    ctx.fillRect(x - 3.5, c + 84, 7, 25);
  }

  const y = c + 168;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(c, y, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SB_NAVY;
  ctx.beginPath();
  ctx.ellipse(c, y, 13, 7, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e04848';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(c, y, 22, 0, Math.PI * 2);
  ctx.moveTo(c - 16, y - 16);
  ctx.lineTo(c + 16, y + 16);
  ctx.stroke();

  const texture = finished(canvas);
  labelMaps.set(key, texture);
  return texture;
}

/**
 * The flower on the front: a white-edged bloom in the flavour's accent with "SB"
 * in navy. Not the brand fallback, which letters it in white — on these cups the
 * letters are dark, outlined in white, and that is most of what makes it read.
 */
function sticker(tint: string): THREE.CanvasTexture {
  const cached = stickerMaps.get(tint);
  if (cached) return cached;

  const size = 256;
  const c = size / 2;
  const r = 112;
  const { canvas, ctx } = canvasOf(size);
  ctx.clearRect(0, 0, size, size);

  const bloom = (petal: number, middle: number, colour: string) => {
    ctx.fillStyle = colour;
    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(c + Math.cos(angle) * r * 0.52, c + Math.sin(angle) * r * 0.52, petal, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(c, c, middle, 0, Math.PI * 2);
    ctx.fill();
  };
  bloom(r * 0.56, r * 0.66, '#ffffff');
  bloom(r * 0.44, r * 0.54, tint);

  ctx.font = `900 ${r * 0.62}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = r * 0.12;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText('SB', c, c + r * 0.04);
  ctx.fillStyle = SB_NAVY;
  ctx.fillText('SB', c, c + r * 0.04);

  const texture = finished(canvas);
  stickerMaps.set(tint, texture);
  return texture;
}

/* ------------------------------------------------------- geometry, materials */

let plastic: {
  wall: THREE.MeshPhysicalMaterial;
  base: THREE.MeshPhysicalMaterial;
  seam: THREE.MeshStandardMaterial;
  lid: THREE.MeshStandardMaterial;
} | null = null;

/**
 * Shared by every cup and never changed afterwards. The thick clear base reads
 * silver in the photo — it is reflecting the table, not tinted — so it is drawn
 * as a bright, slightly metallic grey rather than as another transparent layer.
 */
function sharedPlastic() {
  if (plastic) return plastic;
  plastic = {
    wall: new THREE.MeshPhysicalMaterial({
      color: '#f5f9fc',
      roughness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
    base: new THREE.MeshPhysicalMaterial({
      color: '#cdd2d9',
      roughness: 0.14,
      metalness: 0.35,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    }),
    seam: new THREE.MeshStandardMaterial({ color: '#a9b0ba', roughness: 0.4 }),
    lid: new THREE.MeshStandardMaterial({ color: LID_WHITE, roughness: 0.38 }),
  };
  return plastic;
}

let lidLathe: THREE.LatheGeometry | null = null;
let stickerWrap: THREE.CylinderGeometry | null = null;

/** The chunky lid, revolved: a tall straight skirt with a rounded top shoulder. */
function lidGeometry(): THREE.LatheGeometry {
  if (lidLathe) return lidLathe;
  const profile = [
    [BODY_R_TOP - 0.002, LID_BOTTOM],
    [LID_R - 0.007, LID_BOTTOM],
    [LID_R, LID_BOTTOM + 0.02],
    [LID_R, 0.955],
    [0.44, 0.988],
    [0.41, LID_TOP],
    [0, LID_TOP],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  lidLathe = new THREE.LatheGeometry(profile, 48);
  return lidLathe;
}

/** A strip of the cup's own wall, just outside the clear layer, for the flower. */
function stickerGeometry(): THREE.CylinderGeometry {
  if (stickerWrap) return stickerWrap;
  stickerWrap = new THREE.CylinderGeometry(
    bodyRadiusAt(STICKER_TOP) + WALL_GAP + 0.004,
    bodyRadiusAt(STICKER_BOTTOM) + WALL_GAP + 0.004,
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

interface FruitCupProps {
  product: ProductData;
  position: [number, number, number];
  scale?: number;
  /** Turns the whole cup, flower and all. */
  rotation?: number;
}

/**
 * Every mesh of a fruit series cup, in its own units, standing on its own
 * origin. Shared by the pickable cup on the SB Mart stand and the plain one
 * riding the Lab's belt, so the two can never drift apart.
 */
function CupBody({ product, bodyRef }: { product: ProductData; bodyRef?: Ref<THREE.MeshPhysicalMaterial> }) {
  const ribsRef = useRef<THREE.InstancedMesh>(null);
  const wordmark = useBrandImage('wordmark');

  const holo = product.finish === 'holo';
  const materials = useMemo(sharedPlastic, []);
  const lidShape = useMemo(lidGeometry, []);
  const stickerShape = useMemo(stickerGeometry, []);
  const ribShape = useMemo(() => sharedBox(0.02, 0.2, 0.012), []);
  const lidLabel = useMemo(() => label(product, wordmark), [product, wordmark]);
  const flower = useMemo(() => sticker(product.accent), [product.accent]);
  const glints = useMemo(() => (holo ? glintsTexture() : null), [holo]);

  useLayoutEffect(() => {
    const ribs = ribsRef.current;
    if (!ribs) return;
    const matrix = new THREE.Matrix4();
    const turn = new THREE.Matrix4();
    for (let i = 0; i < RIB_COUNT; i += 1) {
      turn.makeRotationY((i / RIB_COUNT) * Math.PI * 2);
      matrix.makeTranslation(0, 0.845, LID_R + 0.004).premultiply(turn);
      ribs.setMatrixAt(i, matrix);
    }
    ribs.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <>
      {/* the thick clear base, and the seam where the slime sits on it */}
      <mesh position={[0, BASE_TOP / 2, 0]} material={materials.base} castShadow receiveShadow>
        <cylinderGeometry args={[bodyRadiusAt(BASE_TOP), BODY_R_BOTTOM, BASE_TOP, 40]} />
      </mesh>
      <mesh position={[0, BASE_TOP, 0]} material={materials.seam}>
        <cylinderGeometry args={[bodyRadiusAt(BASE_TOP) + 0.004, bodyRadiusAt(BASE_TOP) + 0.004, 0.014, 40]} />
      </mesh>

      {/* the slime */}
      <mesh position={[0, (BASE_TOP + FILL_TOP) / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[BODY_R_TOP, bodyRadiusAt(BASE_TOP), FILL_TOP - BASE_TOP, 40]} />
        {holo ? (
          <meshPhysicalMaterial
            ref={bodyRef}
            color={product.color}
            roughness={0.2}
            clearcoat={0.8}
            clearcoatRoughness={0.1}
            iridescence={1}
            iridescenceIOR={1.45}
            iridescenceThicknessRange={[180, 820]}
            sheen={0.8}
            sheenColor="#c8ecff"
            emissiveMap={glints}
            emissive="#ffffff"
            emissiveIntensity={0.28}
          />
        ) : (
          <meshPhysicalMaterial color={product.color} roughness={0.24} clearcoat={0.6} clearcoatRoughness={0.14} />
        )}
      </mesh>

      {/* the clear wall round all of it */}
      <mesh position={[0, FILL_TOP / 2, 0]} material={materials.wall}>
        <cylinderGeometry args={[BODY_R_TOP + WALL_GAP, BODY_R_BOTTOM + WALL_GAP, FILL_TOP, 40, 1, true]} />
      </mesh>

      {/* the flower */}
      <mesh position={[0, (STICKER_TOP + STICKER_BOTTOM) / 2, 0]} geometry={stickerShape}>
        <meshStandardMaterial map={flower} alphaTest={0.5} roughness={0.45} />
      </mesh>

      {/* the lid, its ribbed skirt, and the label on top */}
      <mesh geometry={lidShape} material={materials.lid} castShadow receiveShadow />
      <instancedMesh ref={ribsRef} args={[ribShape, materials.lid, RIB_COUNT]} castShadow frustumCulled={false} />
      <mesh position={[0, LID_TOP + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 48]} />
        <meshStandardMaterial map={lidLabel} roughness={0.45} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
    </>
  );
}

/**
 * A fruit series cup: a thick clear base, the slime above it in a straight clear
 * wall, the SB flower on the front, and a chunky ribbed white lid carrying the
 * gingham label.
 *
 * The same interaction contract as every other product — anchor, hover and
 * select, the jiggle spring and the add-to-cart pulse — so the camera, the cards
 * and the cart treat it exactly as they treat a jar or a bucket.
 *
 * The holographic one is the only cup with a different surface: an iridescent
 * film that shifts hue with the viewing angle, with the bucket glitter's glints
 * lit on top of it.
 */
export function FruitCup({ product, position, scale = 1, rotation = 0 }: FruitCupProps) {
  const groupRef = useRef<THREE.Group>(null);
  const cupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const { impulse, update } = useJiggle(140, 8);
  const { reducedMotion } = useLabQuality();
  const phase = product.slot * 1.3;

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
    const cup = cupRef.current;
    if (!cup) return;

    const wobble = update(delta);
    cup.position.y = THREE.MathUtils.damp(cup.position.y, active ? 0.12 * scale : 0, 8, delta);
    const target = (selected ? 1.12 : hovered ? 1.06 : 1) * scale;
    const eased = THREE.MathUtils.damp(cup.scale.x, target, 9, delta);
    cup.scale.set(eased * (1 - wobble * 0.28), eased * (1 + wobble * 0.46), eased * (1 - wobble * 0.28));

    const body = bodyRef.current;
    if (body) {
      const base = active ? 0.5 : 0.28;
      body.emissiveIntensity = reducedMotion
        ? base
        : base + Math.sin(state.clock.elapsedTime * 1.1 + phase) * 0.08;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
      <group
        ref={cupRef}
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
        <mesh visible={false} position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 1.05, 8]} />
        </mesh>
        <CupBody product={product} bodyRef={bodyRef} />
      </group>

      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={active} scale={scale}>
        <ringGeometry args={[0.5, 0.6, 36]} />
        <meshBasicMaterial color={product.accent} transparent opacity={selected ? 0.85 : 0.4} />
      </mesh>
    </group>
  );
}

/**
 * A fruit series cup as scenery — cargo on the Lab's belt. The same model with
 * none of the picking: a cup riding the line must not register a product
 * anchor, or it would fight the one on the stand for the same id, and nothing
 * in it answers the pointer.
 */
export function FruitCupProp({ product, position, scale = 1, rotation = 0 }: FruitCupProps) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((object) => {
      object.raycast = () => null;
    });
  }, []);
  return (
    <group ref={ref} position={position} rotation={[0, rotation, 0]} scale={scale}>
      <CupBody product={product} />
    </group>
  );
}
