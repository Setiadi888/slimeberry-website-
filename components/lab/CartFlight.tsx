'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { onProductPulse } from '@/lib/labEvents';
import { getAnchorPosition } from '@/lib/anchors';
import { getProduct } from '@/lib/products';
import { STATION_POS } from '@/lib/layout';
import { useLabQuality } from './QualityContext';

const NO_HIT = () => null;
/** Pooled so an impatient shopper cannot spawn unbounded meshes. */
const POOL = 4;
const FLIGHT_SECONDS = 1.5;

interface Flight {
  active: boolean;
  t: number;
  from: THREE.Vector3;
  colour: THREE.Color;
}

/**
 * Add-to-cart, made physical: the jar you bought lifts off its shelf, arcs
 * across the factory and drops onto the dispatch pallet, where the order crate
 * then appears.
 *
 * Pooled meshes driven from `useFrame` — adding to the cart triggers no React
 * re-render here, and the DOM cart updates independently, so the purchase still
 * works if this never runs (reduced motion, or a missing anchor).
 */
export function CartFlight() {
  const groupRef = useRef<THREE.Group>(null);
  const { reducedMotion } = useLabQuality();

  const flights = useMemo<Flight[]>(
    () =>
      Array.from({ length: POOL }, () => ({
        active: false,
        t: 0,
        from: new THREE.Vector3(),
        colour: new THREE.Color('#ffffff'),
      })),
    [],
  );

  const target = useMemo(
    () => new THREE.Vector3(STATION_POS.dispatch[0], 0.75, STATION_POS.dispatch[2]),
    [],
  );
  const control = useMemo(() => new THREE.Vector3(), []);
  const scratch = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (reducedMotion) return;
    return onProductPulse((id) => {
      const product = getProduct(id);
      const origin = getAnchorPosition('product', id, 0.35);
      if (!product || !origin) return; // nothing to fly from; cart still updates

      const slot = flights.find((flight) => !flight.active);
      if (!slot) return;
      slot.active = true;
      slot.t = 0;
      slot.from.copy(origin);
      slot.colour.set(product.color);
    });
  }, [flights, reducedMotion]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    flights.forEach((flight, index) => {
      const mesh = group.children[index] as THREE.Mesh<
        THREE.BufferGeometry,
        THREE.MeshStandardMaterial
      >;
      if (!mesh) return;

      if (!flight.active) {
        if (mesh.visible) mesh.visible = false;
        return;
      }

      flight.t = Math.min(1, flight.t + delta / FLIGHT_SECONDS);
      const t = flight.t;

      // quadratic arc, lofted over the factory so it reads as a hand-off
      control.copy(flight.from).lerp(target, 0.5);
      control.y = Math.max(flight.from.y, target.y) + 2.6;
      const inv = 1 - t;
      scratch
        .copy(flight.from)
        .multiplyScalar(inv * inv)
        .addScaledVector(control, 2 * inv * t)
        .addScaledVector(target, t * t);

      mesh.visible = true;
      mesh.position.copy(scratch);
      mesh.rotation.y += delta * 3.4;
      mesh.rotation.z = Math.sin(t * Math.PI) * 0.35;
      // shrink into the pallet at the end rather than blinking out
      const settle = t > 0.86 ? 1 - (t - 0.86) / 0.14 : 1;
      mesh.scale.setScalar(0.5 + Math.sin(t * Math.PI) * 0.22 + settle * 0.5);
      mesh.material.color.copy(flight.colour);

      if (t >= 1) {
        flight.active = false;
        mesh.visible = false;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {flights.map((_, index) => (
        <mesh key={index} visible={false} castShadow raycast={NO_HIT}>
          <cylinderGeometry args={[0.16, 0.14, 0.28, 16]} />
          <meshStandardMaterial roughness={0.28} metalness={0.02} />
        </mesh>
      ))}
    </group>
  );
}
