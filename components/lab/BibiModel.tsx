'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { CHARACTER_Y } from '@/lib/layout';
import type { WorkerPose } from '@/lib/workerPose';

const MODEL = '/models/bibi-character.glb';

/** How tall Bibi stands in world units. The workers are about 1.1. */
const TARGET_HEIGHT = 1.35;

/**
 * How far he has to rise to be on a stool.
 *
 * The break stools' seats top out at 0.51 above the floor and a character's
 * group origin sits at CHARACTER_Y, so the difference is what it takes to put
 * his base on the seat rather than through it.
 */
const SEAT_LIFT = 0.51 - CHARACTER_Y;

/**
 * Bibi, drawn from a GLB.
 *
 * The first thing in this world that was not built from primitives. Everything
 * else is procedural because there was nothing worth fetching; a rigged,
 * hand-animated character is the opposite case.
 *
 * It reads the same `WorkerPose` object the procedural rig does, which is what
 * lets `Worker` drive both — routing, reactions, poking and footsteps all live
 * up there and know nothing about what is being drawn.
 *
 * The file ships Idle, Wave and Hop. Hop is deliberately never played: Bibi
 * walks his rounds, and a supervisor who bounces between stations reads as a
 * toy rather than as staff. Since there is no walk clip either, locomotion is
 * procedural — a bob, a side-to-side waddle and a forward lean scaled by
 * `pose.locomotion`, which is what a legless bell-shaped creature would
 * actually do.
 */
export function BibiModel({ pose }: { pose: WorkerPose }) {
  const rig = useRef<THREE.Group>(null);
  const sway = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(MODEL);

  /*
    Skeleton-aware clone. A plain Object3D.clone leaves the copy's SkinnedMeshes
    pointing at the original's bones, so the animation would play on a model
    nobody can see — a silent failure that looks like a frozen character.
  */
  const model = useMemo(() => {
    const copy = SkeletonUtils.clone(scene);
    copy.traverse((object: THREE.Object3D) => {
      if ((object as THREE.Mesh).isMesh) {
        /*
          Receives shadow, casts none. Its twenty-six skinned meshes are 94k
          triangles, and a shadow-casting skinned mesh is skinned and drawn a
          second time into the shadow map. The floor's contact shadow already
          grounds him, so the second pass was buying almost nothing.
        */
        object.castShadow = false;
        object.receiveShadow = true;
        // the hit volume in `Worker` answers the pointer, not the mesh
        object.raycast = () => null;
      }
    });
    return copy;
  }, [scene]);

  /**
   * Scale and footing, measured rather than guessed.
   *
   * The exporter's units are its own business, so the model is measured once,
   * normalised to `TARGET_HEIGHT`, and dropped so whatever its lowest point is
   * rests on the floor — the only way to be sure a character stands on the
   * ground rather than in it.
   */
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

  const { actions } = useAnimations(animations, rig);
  const waving = useRef(false);

  useEffect(() => {
    const idle = actions.Idle;
    idle?.reset().fadeIn(0.4).play();
    return () => {
      idle?.fadeOut(0.3);
      actions.Wave?.fadeOut(0.3);
    };
  }, [actions]);

  useFrame((_, delta) => {
    const step = Math.min(delta, 1 / 30);

    // the Wave clip rides over the idle whenever the rig asks for a wave
    const wants = pose.wave > 0.35;
    if (wants !== waving.current) {
      waving.current = wants;
      const wave = actions.Wave;
      if (wave) {
        if (wants) wave.reset().fadeIn(0.25).play();
        else wave.fadeOut(0.4);
      }
    }

    const body = sway.current;
    if (!body) return;

    const walk = pose.locomotion;
    /*
      A waddle rather than a stride: he has no legs to swing, so the walk is
      carried by a vertical bob at twice the step rate and a lean that
      alternates with it. Both fall to nothing when he stops, so standing still
      is genuinely still and the idle clip is left to do the work.
    */
    const bob = Math.abs(Math.sin(pose.phase)) * 0.045 * walk;
    const lean = Math.sin(pose.phase) * 0.09 * walk;

    /*
      Sitting, for something with no legs.

      The others fold at the knee and their feet stay on the floor. Bibi has
      neither, so he perches: lifted the height of the stool's seat so his base
      rests on it, and squashed a little, which is what a soft thing does when it
      settles onto something. The lift is damped like everything else, so he
      climbs on and slides off rather than snapping between the two.
    */
    const seated = pose.sit;

    body.position.y = THREE.MathUtils.damp(
      body.position.y,
      bob + pose.bob + seated * SEAT_LIFT,
      14,
      step,
    );
    const spread = 1 + seated * 0.04;
    body.scale.set(spread, 1 - seated * 0.06, spread);
    body.rotation.z = THREE.MathUtils.damp(body.rotation.z, lean, 12, step);
    body.rotation.x = THREE.MathUtils.damp(
      body.rotation.x,
      // tips forward into a walk, and further forward to peer at something
      -0.07 * walk + 0.16 * pose.inspect,
      10,
      step,
    );

    // being prodded past his patience: a cross little shake
    if (pose.grumpy > 0.01) {
      body.rotation.z += Math.sin(pose.phase * 7) * 0.07 * pose.grumpy;
    }
  });

  return (
    <group ref={rig}>
      <group ref={sway}>
        <group position={[fit.offset[0], fit.offset[1], fit.offset[2]]} scale={fit.scale}>
          <primitive object={model} />
        </group>
      </group>
    </group>
  );
}
