'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { CHARACTER_Y, FLOOR_TOP_Y } from '@/lib/layout';
import type { WorkerPose } from '@/lib/workerPose';
import { useLabQuality } from './QualityContext';
import { WALK_SPEED } from './Worker';

/** The two shop models, by the post rather than the person — see `MartScene`. */
export const KEEPER_MODELS = {
  register: '/models/kasir-01.glb',
  floor: '/models/kasir-02.glb',
} as const;

/**
 * World metres per unit of the mascot models.
 *
 * Fixed rather than solved per file, which is the whole point: the six lab
 * models and the two shop ones are drawn to one another's scale, and normalising
 * each one to the same height would flatten that — a character whose hair piles
 * up would end up with a shorter body to pay for it. The number comes from the
 * one model the furniture was tuned against, the register keeper: 4.254 units
 * tall, standing 1.3, which is the height the counter was cut down to clear.
 */
const UNIT = 1.3 / 4.254;

/**
 * A character group's origin sits this far above the floor, because the drawn
 * rig's shoes hang below its own origin. These models' do not — their feet are
 * on their origin — so the soles have to come back down by the same amount.
 */
const SOLE_DROP = CHARACTER_Y - FLOOR_TOP_Y;

/**
 * Materials that sit inside the head and never touch the silhouette. Everything
 * else casts: a skinned mesh that casts is skinned a second time into the shadow
 * map, and these buy nothing for the pass.
 *
 * Matched on the front of the name, because the two files carry the same
 * materials under different export suffixes.
 */
const PUPILS = 'Deep glossy pupils';
const NO_SHADOW = ['Eye porcelain', PUPILS, 'Cherry red nose', 'Ear concha'];
const castsShadow = (material: string) => !NO_SHADOW.some((name) => material.startsWith(name));

/* ------------------------------------------------------------- the walk cycle */

/**
 * What the Walk clip actually does with the feet, read out of the files rather
 * than guessed at: the cycle is 1.04s long and each foot travels 0.24 rig units
 * peak to peak, which at the family's scale is a step of 73mm.
 *
 * A character covering 0.62 m/s on a 73mm step would have to take seventeen
 * steps a second. Played at any sane rate the feet barely move and the whole
 * character slides along the floor — which is exactly what they were doing.
 *
 * So the stride is opened up at the bone. The feet are scaled away from their
 * rest position after the mixer has written the clip, which turns a 73mm shuffle
 * into a 257mm step — about a fifth of the character's height, which is what a
 * real one is — and then the clip is played at whatever rate makes that stride
 * carry the body at exactly walking speed. The two halves have to agree or it
 * slides again, so neither is a number anybody typed: `WALK_TIME_SCALE` is
 * solved from the other three.
 */
const CLIP_CYCLE = 1.04;
const CLIP_STRIDE = 0.24;
const STRIDE_GAIN = 3.5;
/** How much higher the foot lifts than the clip asks, so the step clears. */
const LIFT_GAIN = 2.2;
const STEP_METRES = CLIP_STRIDE * STRIDE_GAIN * UNIT;
/** Two steps to a cycle; play it so those two steps carry one walk's worth. */
const WALK_TIME_SCALE = (WALK_SPEED * CLIP_CYCLE) / (2 * STEP_METRES);

/** Seconds between greeting hops, so passing the pointer over them is not a jig. */
const HOP_COOLDOWN = 7;

/**
 * A member of staff, drawn from one of the mascot models.
 *
 * Only the drawing lives here. Where they walk, what they stop to do, when they
 * look up at the visitor and what they are thinking are all decided by `Worker`,
 * which writes a `WorkerPose` every frame — the same contract the procedural rig
 * implements, which is why swapping the body changed nothing above the neck.
 *
 * Every file in the set brings Idle, Walk and Hop on an eleven-bone skeleton. Idle and Walk
 * are crossfaded by `pose.locomotion` rather than switched, so setting off and
 * stopping are a blend rather than a cut; Hop is a one-shot, fired when they
 * notice the visitor, because none of the files has a wave and somebody bouncing
 * on the spot is a better hello than a frozen one. Nothing else is clipped: the
 * lean into a shelf, the sway at the till and the cross little shake of being
 * prodded are done to the whole body, as Bibi's are.
 *
 * No root motion in any clip — checked, because a Walk that slides the root
 * would fight `Worker` for the character's position and win every other frame.
 */
export function StaffModel({
  pose,
  src,
  pupils,
}: {
  pose: WorkerPose;
  src: string;
  /** Repaints the iris, for a model whose eye colour was wrong for the part. */
  pupils?: string;
}) {
  const rig = useRef<THREE.Group>(null);
  const sway = useRef<THREE.Group>(null);
  const hopping = useRef(false);
  const nextHop = useRef(0);
  const { scene, animations } = useGLTF(src);
  const { reducedMotion } = useLabQuality();

  /*
    Skeleton-aware clone, as Bibi's and the cat's are: a plain clone leaves the
    copy's skinned meshes bound to the original's bones, so the animation plays
    on a keeper nobody can see.
  */
  const model = useMemo(() => {
    const copy = SkeletonUtils.clone(scene);
    const repainted = new Map<THREE.Material, THREE.Material>();
    copy.traverse((object: THREE.Object3D) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as THREE.MeshStandardMaterial;
      mesh.castShadow = castsShadow(material.name);
      mesh.receiveShadow = true;
      // the hit volume in `Worker` answers the pointer, not the mesh
      mesh.raycast = () => null;
      /*
        The iris, recoloured. On a copy of the material rather than the loaded
        one: `useGLTF` hands every clone of a file the same material instances,
        so painting this one would reach back into the cache and out again into
        anybody else drawn from it.
      */
      if (pupils && material.name.startsWith(PUPILS)) {
        let copyMaterial = repainted.get(material);
        if (!copyMaterial) {
          const fresh = material.clone();
          fresh.color = new THREE.Color(pupils);
          repainted.set(material, fresh);
          copyMaterial = fresh;
        }
        mesh.material = copyMaterial;
      }
    });
    return copy;
  }, [scene, pupils]);

  /*
    The two foot bones and the pose they hang in when nothing is playing. The
    clip writes absolute positions into these every frame, so the rest pose is
    what the amplified stride is measured away from.
  */
  const feet = useMemo(() => {
    const found: { bone: THREE.Object3D; rest: THREE.Vector3 }[] = [];
    /*
      Matched on the front of the name rather than looked up as 'Foot.L': the
      loader sanitises node names on the way in, and a dot is one of the
      characters it replaces, so the bone the file calls Foot.L arrives as
      Foot_L. Asking for the wrong one fails silently — which is exactly how
      the first version of this shipped doing nothing at all.
    */
    model.traverse((object) => {
      if (/^foot[._]?[lr]$/i.test(object.name)) found.push({ bone: object, rest: object.position.clone() });
    });
    return found;
  }, [model]);

  /**
   * Footing, measured rather than guessed.
   *
   * The scale is the family's, and the drop puts this one's soles on the floor.
   * Only the drop: the rig stands over its own origin with its feet either side
   * of it, so centring the bounding box horizontally would shove the character
   * forward to balance the weight of a ponytail.
   */
  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    return { scale: UNIT, drop: -box.min.y * UNIT - SOLE_DROP };
  }, [model]);

  const { actions, mixer } = useAnimations(animations, rig);

  useEffect(() => {
    const { Idle: idle, Walk: walk, Hop: hop } = actions;
    // both locomotion clips run all the time; only their weights move
    idle?.reset().setEffectiveWeight(1).play();
    walk?.reset().setEffectiveWeight(0).play();
    hop?.setLoop(THREE.LoopOnce, 1);
    return () => {
      idle?.stop();
      walk?.stop();
      hop?.stop();
    };
  }, [actions]);

  useFrame(({ clock }, delta) => {
    const step = Math.min(delta, 1 / 30);
    const elapsed = clock.getElapsedTime();

    // the visitor asked the OS to still everything; the clips stop where they are
    mixer.timeScale = reducedMotion ? 0 : 1;

    const walking = pose.locomotion;
    const walk = actions.Walk;
    walk?.setEffectiveWeight(walking);
    // the rate the stride was solved for; it winds down with them as they stop
    if (walk) walk.timeScale = WALK_TIME_SCALE;
    /*
      Idle is never taken all the way out. The walk is a stylised one — short
      steps, a small swing — and leaving a little breathing under it reads better
      than a hard switch between two cycles.
    */
    actions.Idle?.setEffectiveWeight(1 - walking * 0.85);

    /*
      A hop when they notice you. `pose.wave` is the greeting the procedural rig
      answers with a raised arm; this file has no wave, and the cooldown is there
      because the pointer crosses a character far more often than a person would
      actually say hello.
    */
    const greeting = pose.wave > 0.35 && walking < 0.2 && !reducedMotion;
    if (greeting !== hopping.current) {
      hopping.current = greeting;
      const hop = actions.Hop;
      if (hop && greeting && elapsed > nextHop.current) {
        nextHop.current = elapsed + HOP_COOLDOWN;
        hop.reset().setEffectiveWeight(1).fadeIn(0.12).play();
      }
    }

    /*
      Open the stride up, after the mixer has had its say. Rolled on with
      `walking` so a character standing still stands on their own two feet and
      only a moving one gets the longer step.
    */
    const reach = 1 + (STRIDE_GAIN - 1) * walking;
    const lift = 1 + (LIFT_GAIN - 1) * walking;
    for (const { bone, rest } of feet) {
      bone.position.z = rest.z + (bone.position.z - rest.z) * reach;
      bone.position.y = rest.y + (bone.position.y - rest.y) * lift;
    }

    const body = sway.current;
    if (!body) return;

    body.position.y = THREE.MathUtils.damp(body.position.y, pose.bob, 14, step);

    /*
      Everything the clips do not cover, done to the whole body.

      Forward into a shelf they are facing up, a slow sway at the till while they
      work, and straightened up again the moment they turn to the visitor —
      attention cancels the lean rather than adding a pose of its own, which is
      what standing to attention actually is.
    */
    const lean = 0.2 * pose.inspect + 0.05 * pose.work - 0.06 * pose.attention;
    body.rotation.x = THREE.MathUtils.damp(body.rotation.x, lean, 10, step);

    const working = Math.sin(elapsed * 2.6) * 0.05 * pose.work;
    const shake = pose.grumpy > 0.01 ? Math.sin(pose.phase * 7) * 0.07 * pose.grumpy : 0;
    body.rotation.z = THREE.MathUtils.damp(body.rotation.z, working, 8, step) + shake;
  });

  return (
    <group ref={rig}>
      <group ref={sway}>
        <group position={[0, fit.drop, 0]} scale={fit.scale}>
          <primitive object={model} />
        </group>
      </group>
    </group>
  );
}
