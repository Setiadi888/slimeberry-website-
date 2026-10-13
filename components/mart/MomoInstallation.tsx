'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { FLOOR_TOP_Y } from '@/lib/layout';
import { MART_POS, MOMO_PLINTH } from '@/lib/martLayout';
import { FINISH, FINISH_PBR } from '@/lib/storeFinish';
import { useLabQuality } from '@/components/lab/QualityContext';
import { NO_HIT, StationGroup } from '@/components/lab/StationGroup';

const MODEL = '/models/momo.glb';

/**
 * How tall momo stands, floor to leaf tip.
 *
 * The room's ceiling is 5.4 and the plinth takes 0.35 of it. At 3.6 the leaf
 * clears the ceiling by about 1.4 — enough air that it reads as a sculpture in a
 * room rather than something wedged under the slab, which is the whole
 * difference between an installation and a mistake.
 */
const TARGET_HEIGHT = 3.6;

/** Seconds between the idle turns of the slow rotation. */
const TURN_PERIOD = 48;

/**
 * The installation: a giant momo on a low plinth in the middle of the shop.
 *
 * This is the one loud thing in a deliberately quiet room — everything else was
 * refitted in concrete, steel and stone so that this reads as the thing the shop
 * is arranged around, the way a Gentle Monster store is built around whatever is
 * standing in the middle of it.
 *
 * It is the same mascot file the characters come from, so it arrives rigged and
 * with clips. It plays Idle, very slowly: a sculpture that breathes rather than
 * performs. Tapping it frames it and switches it to Wave for one pass, which is
 * the only moment it behaves like a character rather than an object.
 *
 * The plinth's footprint is in `MART_POS`/`MOMO_PLINTH` rather than here,
 * because every walking route in the shop was measured against it.
 */
export function MomoInstallation() {
  const rig = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(MODEL);
  const { reducedMotion } = useLabQuality();
  const { actions, mixer } = useAnimations(animations, rig);
  const waving = useRef(false);
  const waveTimeout = useRef<number | null>(null);

  const model = useMemo(() => {
    const copy = SkeletonUtils.clone(scene);
    copy.traverse((object: THREE.Object3D) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // the plinth answers the pointer for the whole piece
      mesh.raycast = () => null;
    });
    return copy;
  }, [scene]);

  /** Measured, not guessed: normalise the file's own height and stand it on the plinth. */
  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const centre = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(centre);
    const scale = size.y > 0 ? TARGET_HEIGHT / size.y : 1;
    return {
      scale,
      offset: [-centre.x * scale, -box.min.y * scale, -centre.z * scale] as const,
    };
  }, [model]);

  useEffect(() => {
    const idle = actions.Idle;
    idle?.reset().fadeIn(0.6).play();
    return () => {
      if (waveTimeout.current) window.clearTimeout(waveTimeout.current);
      waving.current = false;
      idle?.fadeOut(0.4);
      actions.Wave?.fadeOut(0.4);
    };
  }, [actions]);

  useFrame(({ clock }, delta) => {
    /*
      Half speed. The clip was authored for a character the size of a person; on
      something three and a half metres tall the same cadence reads as fidgeting,
      and big things move slowly.
    */
    mixer.timeScale = reducedMotion ? 0 : 0.5;

    const turn = spin.current;
    if (turn && !reducedMotion) {
      // a slow sweep rather than a full rotation: it always faces the room
      turn.rotation.y = Math.sin((clock.getElapsedTime() * Math.PI * 2) / TURN_PERIOD) * 0.3;
    }
  });

  /** Tapped: one pass of Wave over the idle, then back to breathing. */
  const greet = () => {
    const wave = actions.Wave;
    if (!wave || waving.current || reducedMotion) return;
    waving.current = true;
    // The whole sculpture runs at half speed; Wave gets a 2x local rate so
    // its authored three-second greeting completes rather than being cut off.
    wave.reset().setLoop(THREE.LoopOnce, 1).setEffectiveTimeScale(2).fadeIn(0.2).play();
    waveTimeout.current = window.setTimeout(() => {
      wave.fadeOut(0.5);
      waving.current = false;
      waveTimeout.current = null;
    }, 3200);
  };

  return (
    <StationGroup
      id="momo"
      position={MART_POS.momo}
      ringRadius={MOMO_PLINTH.radius + 0.3}
      ringColor="#a0d13a"
      onSelect={greet}
    >
      {/* the plinth: a gallery-white drum with a shadow gap and a lit reveal */}
      <mesh position={[0, FLOOR_TOP_Y + MOMO_PLINTH.height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[MOMO_PLINTH.radius, MOMO_PLINTH.radius, MOMO_PLINTH.height, 64]} />
        <meshStandardMaterial color={FINISH.plinth} roughness={0.42} metalness={0.02} />
      </mesh>
      {/* Generous tap target for the sculpture itself; the imported meshes stay
          out of the raycaster so their fine details do not steal touches. */}
      <mesh position={[0, FLOOR_TOP_Y + MOMO_PLINTH.height + TARGET_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[0.92, 0.92, TARGET_HEIGHT, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/*
        The shadow gap. A plinth that meets the floor flush looks drawn on; a
        recessed band at the bottom is what makes a heavy object look set down.
      */}
      <mesh position={[0, FLOOR_TOP_Y + 0.04, 0]} raycast={NO_HIT}>
        <cylinderGeometry args={[MOMO_PLINTH.radius - 0.06, MOMO_PLINTH.radius - 0.06, 0.08, 64]} />
        <meshStandardMaterial color={FINISH.black} roughness={0.7} />
      </mesh>
      {/* a cool line of light washing up the drum's edge */}
      <mesh position={[0, FLOOR_TOP_Y + MOMO_PLINTH.height - 0.02, 0]} raycast={NO_HIT}>
        <torusGeometry args={[MOMO_PLINTH.radius - 0.02, 0.012, 8, 72]} />
        <meshStandardMaterial
          color={FINISH.led}
          emissive={FINISH.led}
          emissiveIntensity={reducedMotion ? 0.8 : 1.3}
          roughness={0.3}
        />
      </mesh>
      {/* brushed steel toe rail, so the drum has a base rather than an edge */}
      <mesh position={[0, FLOOR_TOP_Y + 0.12, 0]} raycast={NO_HIT}>
        <torusGeometry args={[MOMO_PLINTH.radius + 0.01, 0.018, 8, 72]} />
        <meshStandardMaterial color={FINISH.steel} {...FINISH_PBR.steel} />
      </mesh>

      <group ref={spin} position={[0, FLOOR_TOP_Y + MOMO_PLINTH.height, 0]}>
        <group ref={rig}>
          <group position={[fit.offset[0], fit.offset[1], fit.offset[2]]} scale={fit.scale}>
            <primitive object={model} />
          </group>
        </group>
      </group>

      {/* the spotlight that makes it the subject of the room */}
      <spotLight
        position={[0, 4.9, 1.1]}
        target-position={[0, FLOOR_TOP_Y + 1.6, 0]}
        angle={0.62}
        penumbra={0.8}
        intensity={26}
        distance={11}
        decay={2}
        color="#fff6e8"
      />
    </StationGroup>
  );
}
