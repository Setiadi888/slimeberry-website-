'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { Product as ProductData } from '@/lib/products';
import { useJiggle } from '@/lib/useJiggle';
import { onProductPulse } from '@/lib/labEvents';
import { registerAnchor, unregisterAnchor } from '@/lib/anchors';
import { hoverEntity, selectEntity, useIsHovered, useIsSelected } from '@/lib/interaction';

/** The three printed display boxes, one per series. */
export const BOX_MODELS = {
  boba: '/models/box-boba-series.glb',
  fruit: '/models/box-fruit-series.glb',
  dessert: '/models/box-dessert-world.glb',
} as const;

export type BoxSeries = keyof typeof BOX_MODELS;

/**
 * How wide a box stands in the shop, whichever series it is.
 *
 * One number for all three, the way `CUP_SCALE` is one number for every cup:
 * the three files are drawn to each other's scale, and a shelf of boxes that
 * disagreed about their own size would read as a mistake rather than as a range.
 * 0.34 is the cup's own 0.325 plus the cardboard around it, which is what a box
 * with one cup in it would actually measure.
 */
const BOX_WIDTH = 0.34;

/**
 * Where the file's own geometry sits, and what it takes to stand it on a shelf.
 *
 * Measured once per file rather than per box: all three are authored a long way
 * off their own origin — the fruit box's centre is five units out in x — so a
 * box dropped in unmeasured lands somewhere else entirely. Unlike the
 * characters, these are centred horizontally as well as dropped, because a box
 * has no feet to stand over: its footprint is the whole of it.
 */
function useBoxFit(src: string) {
  const { scene } = useGLTF(src);
  return useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const centre = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(centre);
    const scale = size.x > 0 ? BOX_WIDTH / size.x : 1;
    return {
      scene,
      scale,
      offset: [-centre.x * scale, -box.min.y * scale, -centre.z * scale] as const,
      /** What it stands, once scaled — the stands space their rows off this. */
      height: size.y * scale,
    };
  }, [scene, src]);
}

/** The height of a box on a shelf, for a stand laying out its rows. */
export const BOX_HEIGHT = 0.31;

interface ProductBoxProps {
  product: ProductData;
  series: BoxSeries;
  position: [number, number, number];
  scale?: number;
  rotation?: number;
}

/**
 * One printed display box, standing on a stand and answering the pointer.
 *
 * The same contract the cups and the buckets have — it registers the product's
 * anchor so the card can point at it, lifts and swells under the pointer, and
 * jiggles when something elsewhere pulses the product — so replacing a stand's
 * cups with boxes cost the shop none of its picking. What is in the box is what
 * the card says; the printing on the outside belongs to the series, which is why
 * a stand only ever carries one series' boxes.
 */
export function ProductBox({ product, series, position, scale = 1, rotation = 0 }: ProductBoxProps) {
  const groupRef = useRef<THREE.Group>(null);
  const boxRef = useRef<THREE.Group>(null);
  const { impulse, update } = useJiggle(140, 8);
  const fit = useBoxFit(BOX_MODELS[series]);

  const hovered = useIsHovered('product', product.id);
  const selected = useIsSelected('product', product.id);
  const active = hovered || selected;

  /*
    A copy per box. One loaded scene cannot be in eight places at once, and a
    clone shares its geometry and materials with the original, so a shelf of
    boxes is one upload however many of them are stood on it.
  */
  const model = useMemo(() => {
    const copy = fit.scene.clone(true);
    copy.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // the invisible hull below answers the pointer, not the printing
      mesh.raycast = () => null;
    });
    return copy;
  }, [fit.scene]);

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

  useFrame((_, delta) => {
    const box = boxRef.current;
    if (!box) return;
    const wobble = update(delta);
    box.position.y = THREE.MathUtils.damp(box.position.y, active ? 0.1 * scale : 0, 8, delta);
    const target = (selected ? 1.12 : hovered ? 1.06 : 1) * scale;
    const eased = THREE.MathUtils.damp(box.scale.x, target, 9, delta);
    box.scale.set(eased * (1 - wobble * 0.2), eased * (1 + wobble * 0.34), eased * (1 - wobble * 0.2));
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
      <group
        ref={boxRef}
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
        {/* one hull for the pointer, rather than three printed meshes of it */}
        <mesh visible={false} position={[0, BOX_HEIGHT / 2, 0]}>
          <boxGeometry args={[BOX_WIDTH, BOX_HEIGHT, BOX_WIDTH]} />
        </mesh>
        <group position={[fit.offset[0], fit.offset[1], fit.offset[2]]} scale={fit.scale}>
          <primitive object={model} />
        </group>
      </group>

      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={active} scale={scale}>
        <ringGeometry args={[0.2, 0.26, 36]} />
        <meshBasicMaterial color={product.accent} transparent opacity={selected ? 0.85 : 0.4} />
      </mesh>
    </group>
  );
}
