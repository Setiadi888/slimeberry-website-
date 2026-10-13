'use client';

import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { readShift } from '@/lib/shift';

/** The studio the diorama sits in: cream by day, a deep warm plum after dark. */
const DAY = new THREE.Color('#f2e9de');
const NIGHT = new THREE.Color('#2b2331');

/**
 * Everything about the hour that lives on the scene rather than on a light.
 *
 * The background and the fog have to move together — the fog exists to fade the
 * studio sweep into the backdrop, so a backdrop that changed while the fog did
 * not would put a visible ring round the diorama. The environment map goes with
 * them: it is baked once, in daylight, and turning its contribution down is what
 * stops every glossy jar in the room reflecting a midday sky at two in the
 * morning.
 *
 * Mounted once, above both rooms, because the hour is a property of the world
 * and not of the room you happen to be standing in.
 */
export function ShiftSky() {
  const scene = useThree((state) => state.scene);
  const gl = useThree((state) => state.gl);

  useFrame(() => {
    const n = readShift().night;

    if (scene.background instanceof THREE.Color) {
      scene.background.lerpColors(DAY, NIGHT, n);
    }
    if (scene.fog) {
      scene.fog.color.lerpColors(DAY, NIGHT, n);
    }
    // the bake is a daylight bake, so it is worth less of the frame after dark
    scene.environmentIntensity = THREE.MathUtils.lerp(1, 0.45, n);
    // and a touch more exposure, which is what keeps the dark half readable
    gl.toneMappingExposure = THREE.MathUtils.lerp(1.02, 1.12, n);
  });

  return null;
}
