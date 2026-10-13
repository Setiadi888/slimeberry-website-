'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment as EnvironmentMap, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { readShift } from '@/lib/shift';

interface LabLightingProps {
  shadows: boolean;
  shadowMapSize: number;
}

/**
 * Day and night, as two settings of the same six lights.
 *
 * The night is not a dimmer day. A factory at three in the morning is not dark —
 * it is *warm*: the daylight that was doing most of the work has gone, and what
 * is left is the building's own tungsten, which is orange, low and comes from
 * inside the room rather than from a window. So the key light drops and turns
 * amber, the two lamps in the ceiling come up rather than down, and the only
 * cool thing left is a thin blue rim standing in for the sky outside.
 *
 * Everything stays legible on purpose. The brief was a different mood, not a
 * harder read: total ambient falls by less than a third, and the fill that
 * separates a pale machine from a pale wall is kept.
 */
const DAY = {
  skyColour: new THREE.Color('#fff6ea'),
  groundColour: new THREE.Color('#c9bfae'),
  hemi: 0.55,
  ambientColour: new THREE.Color('#fff4e8'),
  ambient: 0.35,
  keyColour: new THREE.Color('#fff1dd'),
  key: 1.55,
  fillColour: new THREE.Color('#dce8f5'),
  fill: 0.4,
  lampWarmColour: new THREE.Color('#ffe6c4'),
  lampWarm: 12,
  lampCoolColour: new THREE.Color('#d6f0ff'),
  lampCool: 9,
};

const NIGHT = {
  skyColour: new THREE.Color('#ffd7a8'),
  groundColour: new THREE.Color('#6b5a54'),
  hemi: 0.44,
  ambientColour: new THREE.Color('#ffdcb4'),
  ambient: 0.33,
  keyColour: new THREE.Color('#ffc27e'),
  key: 0.78,
  // the window, and only the window: a thin cold edge so the warmth reads as warm
  fillColour: new THREE.Color('#93a9de'),
  fill: 0.34,
  lampWarmColour: new THREE.Color('#ffb877'),
  lampWarm: 20,
  lampCoolColour: new THREE.Color('#ffd39a'),
  lampCool: 15,
};

const scratch = new THREE.Color();

/**
 * Soft studio lighting for a display-case look: one warm key with shadows, a
 * cool fill, two ceiling lamps, and a baked environment built from Lightformers.
 *
 * The environment is assembled from meshes rather than an HDRI so the scene has
 * no external asset to fetch, and `frames={1}` bakes it once — it is only there
 * to give the glossy surfaces something to reflect, and the scene's environment
 * intensity is what turns it down after dark (see `ShiftSky`).
 */
export function LabLighting({ shadows, shadowMapSize }: LabLightingProps) {
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const keyRef = useRef<THREE.DirectionalLight>(null);
  const fillRef = useRef<THREE.DirectionalLight>(null);
  const warmRef = useRef<THREE.PointLight>(null);
  const coolRef = useRef<THREE.PointLight>(null);

  useFrame(() => {
    const n = readShift().night;

    const hemi = hemiRef.current;
    if (hemi) {
      hemi.color.lerpColors(DAY.skyColour, NIGHT.skyColour, n);
      hemi.groundColor.lerpColors(DAY.groundColour, NIGHT.groundColour, n);
      hemi.intensity = THREE.MathUtils.lerp(DAY.hemi, NIGHT.hemi, n);
    }
    const ambient = ambientRef.current;
    if (ambient) {
      ambient.color.lerpColors(DAY.ambientColour, NIGHT.ambientColour, n);
      ambient.intensity = THREE.MathUtils.lerp(DAY.ambient, NIGHT.ambient, n);
    }
    const key = keyRef.current;
    if (key) {
      key.color.lerpColors(DAY.keyColour, NIGHT.keyColour, n);
      key.intensity = THREE.MathUtils.lerp(DAY.key, NIGHT.key, n);
    }
    const fill = fillRef.current;
    if (fill) {
      fill.color.lerpColors(DAY.fillColour, NIGHT.fillColour, n);
      fill.intensity = THREE.MathUtils.lerp(DAY.fill, NIGHT.fill, n);
    }
    const warm = warmRef.current;
    if (warm) {
      warm.color.lerpColors(DAY.lampWarmColour, NIGHT.lampWarmColour, n);
      warm.intensity = THREE.MathUtils.lerp(DAY.lampWarm, NIGHT.lampWarm, n);
    }
    const cool = coolRef.current;
    if (cool) {
      cool.color.copy(scratch.lerpColors(DAY.lampCoolColour, NIGHT.lampCoolColour, n));
      cool.intensity = THREE.MathUtils.lerp(DAY.lampCool, NIGHT.lampCool, n);
    }
  });

  return (
    <>
      <hemisphereLight ref={hemiRef} args={['#fff6ea', '#c9bfae', 0.55]} />
      <ambientLight ref={ambientRef} intensity={0.35} color="#fff4e8" />

      <directionalLight
        ref={keyRef}
        position={[6.5, 9, 5.5]}
        intensity={1.55}
        color="#fff1dd"
        castShadow={shadows}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
        shadow-bias={-0.0012}
        shadow-normalBias={0.02}
      />

      {/* Cool bounce from the open side of the diorama. */}
      <directionalLight ref={fillRef} position={[-7, 4.5, 6]} intensity={0.4} color="#dce8f5" />
      <pointLight ref={warmRef} position={[-2.2, 3.2, -2.2]} intensity={12} distance={9} decay={2} color="#ffe6c4" />
      <pointLight ref={coolRef} position={[2.4, 2.6, -2.8]} intensity={9} distance={8} decay={2} color="#d6f0ff" />

      <EnvironmentMap resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.4} color="#fffaf2" position={[0, 6, 3]} scale={[9, 5, 1]} rotation={[-Math.PI / 2.4, 0, 0]} />
        <Lightformer form="rect" intensity={1.1} color="#e8f2ff" position={[-6, 3, 2]} scale={[5, 5, 1]} rotation={[0, Math.PI / 2.5, 0]} />
        <Lightformer form="rect" intensity={0.9} color="#ffeede" position={[6, 3, 1]} scale={[5, 5, 1]} rotation={[0, -Math.PI / 2.5, 0]} />
        <Lightformer form="circle" intensity={1.6} color="#ffffff" position={[1.5, 5, -3]} scale={3} />
      </EnvironmentMap>
    </>
  );
}
