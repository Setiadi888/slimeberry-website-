'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { useLabQuality } from '@/components/lab/QualityContext';

const MODEL = '/models/mochi-cat.glb';

/**
 * How tall the cat stands, ear tips and raised tail included. The workers are
 * about 1.3; the drawn cat this replaced came to a little under half of that.
 */
const TARGET_HEIGHT = 0.5;

/** Where its rump is, along its length — what it rocks back onto to sit. */
const RUMP_Z = -0.1;

/* Materials in the file, by name. */
const FUR = 'Fur_cream_orange';
const EYES = 'Eyes_obsidian';
const CATCHLIGHT = 'Eye_catchlight';

/** What the shop cat's controller decides each frame, and the model reads. */
export interface CatPose {
  /** 1 up on all fours, 0 curled flat asleep. */
  up: number;
  /** 1 sat back on its haunches. */
  sit: number;
  /** 0..1, how much it is walking. */
  run: number;
  airborne: boolean;
}

export const createCatPose = (): CatPose => ({ up: 1, sit: 0, run: 0, airborne: false });

/**
 * The bounds of just the vertices one primitive draws. Every primitive in this
 * file shares one vertex buffer, so a geometry's own bounding box is the whole
 * cat — useless for finding where an eye is.
 */
function indexedBounds(geometry: THREE.BufferGeometry): THREE.Box3 {
  const box = new THREE.Box3();
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const point = new THREE.Vector3();
  const count = index ? index.count : position.count;
  for (let i = 0; i < count; i += 1) {
    point.fromBufferAttribute(position, index ? index.getX(i) : i);
    box.expandByPoint(point);
  }
  return box;
}

/**
 * Oyen, drawn from the Mochi cat model.
 *
 * Only the drawing lives here. Where the cat goes, when it jumps, where it sits
 * and sleeps are all decided by `ShopCat`, which writes a `CatPose` every frame;
 * this reads it — the same split the workers use with `WorkerPose`.
 *
 * The file brings Idle, Walk, Tail_Wag and Ear_Twitch, all on one skeleton, and
 * they are layered rather than switched: Walk fades in with the pace, Idle keeps
 * breathing underneath it, the tail wags while it sits contented, and an ear
 * twitches at something every few seconds. It has no sit or sleep clip, so those
 * are done to the whole body: sitting rocks it back onto its rump, sleeping
 * settles it flatter and wider, and its eyes close — the open eyes are hidden
 * and a pair of drawn arcs, riding on the body bone, shown instead.
 */
export function CatModel({ pose }: { pose: CatPose }) {
  const rig = useRef<THREE.Group>(null);
  const rock = useRef<THREE.Group>(null);
  const squash = useRef<THREE.Group>(null);
  const eyesShut = useRef(false);
  const twitchAt = useRef(3);
  const { scene, animations } = useGLTF(MODEL);
  const { reducedMotion } = useLabQuality();

  /*
    Skeleton-aware clone, as Bibi's is: a plain clone would leave the copy's
    skinned meshes bound to the original's bones, and the animation would play
    on a cat nobody can see.
  */
  const { model, openEyes, closedEyes, release } = useMemo(() => {
    const copy = SkeletonUtils.clone(scene) as THREE.Object3D;
    copy.updateMatrixWorld(true);

    const open: THREE.Object3D[] = [];
    const eyes: THREE.Mesh[] = [];
    copy.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const name = (mesh.material as THREE.Material).name;
      // the fur is the silhouette; the eyes, nose and whiskers cast nothing worth a pass
      mesh.castShadow = name === FUR;
      mesh.receiveShadow = true;
      // the hit volume in `ShopCat` answers the pointer, not the mesh
      mesh.raycast = () => null;
      if (name === EYES || name === CATCHLIGHT) open.push(mesh);
      if (name === EYES) eyes.push(mesh);
    });

    const arc = new THREE.TorusGeometry(1, 0.22, 6, 16, Math.PI);
    const ink = new THREE.MeshStandardMaterial({ color: '#2b2220', roughness: 0.6 });
    const closed: THREE.Mesh[] = [];
    const body = copy.getObjectByName('Body');
    if (body) {
      const toBody = body.matrixWorld.clone().invert();
      for (const eye of eyes) {
        const box = indexedBounds(eye.geometry);
        const width = box.max.x - box.min.x;
        const front = new THREE.Vector3(
          (box.min.x + box.max.x) / 2,
          (box.min.y + box.max.y) / 2,
          box.max.z + 0.01,
        );
        const shut = new THREE.Mesh(arc, ink);
        // mesh space, through the rest pose, into the body bone's own space
        shut.position.copy(front.applyMatrix4(eye.matrixWorld).applyMatrix4(toBody));
        // a half-torus is an arch; turned over it is a sleeping eye
        shut.rotation.z = Math.PI;
        shut.scale.setScalar(width * 0.42);
        shut.visible = false;
        shut.raycast = () => null;
        body.add(shut);
        closed.push(shut);
      }
    }

    return {
      model: copy,
      openEyes: open,
      closedEyes: closed,
      release: () => {
        arc.dispose();
        ink.dispose();
      },
    };
  }, [scene]);

  useEffect(() => release, [release]);

  /** Measured and normalised, then dropped so its lowest point rests on the floor. */
  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    const scale = size.y > 0 ? TARGET_HEIGHT / size.y : 1;
    return {
      scale,
      offset: [-centre.x * scale, -box.min.y * scale, -centre.z * scale] as const,
    };
  }, [model]);

  const { actions, mixer } = useAnimations(animations, rig);

  useEffect(() => {
    const { Idle: idle, Walk: walk, Tail_Wag: wag, Ear_Twitch: twitch } = actions;
    idle?.reset().play();
    walk?.reset().setEffectiveWeight(0).play();
    wag?.reset().setEffectiveWeight(0).play();
    twitch?.setLoop(THREE.LoopOnce, 1);
    return () => {
      idle?.stop();
      walk?.stop();
      wag?.stop();
      twitch?.stop();
    };
  }, [actions]);

  useFrame((state, delta) => {
    const step = Math.min(delta, 1 / 30);
    mixer.timeScale = reducedMotion ? 0 : 1;

    const awake = pose.up;
    const { Idle: idle, Walk: walk, Tail_Wag: wag, Ear_Twitch: twitch } = actions;
    walk?.setEffectiveWeight(pose.run * awake);
    idle?.setEffectiveWeight(1 - pose.run * 0.85);
    // breathing slows right down once it is asleep
    if (idle) idle.timeScale = 0.5 + awake * 0.5;
    wag?.setEffectiveWeight(pose.sit * 0.8 * (1 - pose.run));

    const now = state.clock.elapsedTime;
    if (twitch && !reducedMotion && awake > 0.6 && now > twitchAt.current) {
      twitch.reset().play();
      twitchAt.current = now + 4 + Math.random() * 7;
    }

    // curled up it goes flatter and wider; mid-jump it stretches out
    const body = squash.current;
    if (body) {
      const flat = 1 - awake;
      const stretch = pose.airborne ? 1 : 0;
      const tall = (1 - flat * 0.32) * (1 + stretch * 0.08);
      const wide = (1 + flat * 0.12) * (1 - stretch * 0.05);
      body.scale.y = THREE.MathUtils.damp(body.scale.y, tall, 10, step);
      const across = THREE.MathUtils.damp(body.scale.x, wide, 10, step);
      body.scale.x = across;
      body.scale.z = across;
    }

    // sitting: rocked back onto its rump, front end up
    if (rock.current) {
      rock.current.rotation.x = THREE.MathUtils.damp(rock.current.rotation.x, -0.24 * pose.sit, 8, step);
    }

    const shut = awake < 0.45;
    if (shut !== eyesShut.current) {
      eyesShut.current = shut;
      openEyes.forEach((mesh) => {
        mesh.visible = !shut;
      });
      closedEyes.forEach((mesh) => {
        mesh.visible = shut;
      });
    }
  });

  return (
    <group ref={rig}>
      {/* pivoted at the rump, so rocking back to sit lifts the front rather than sinking the back */}
      <group ref={rock} position={[0, 0, RUMP_Z]}>
        <group position={[0, 0, -RUMP_Z]}>
          <group ref={squash}>
            <group position={[fit.offset[0], fit.offset[1], fit.offset[2]]} scale={fit.scale}>
              <primitive object={model} />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
