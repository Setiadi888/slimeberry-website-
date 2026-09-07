'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { createWorkerPose } from '@/lib/workerPose';
import { emitLabEvent } from '@/lib/labEvents';
import { registerAnchor, unregisterAnchor } from '@/lib/anchors';
import { hoverEntity, selectEntity, useIsHovered, useIsSelected } from '@/lib/interaction';
import { onWorkerReaction, type ReactionType } from '@/lib/factoryLife';
import type { WorkerData } from '@/lib/workers';
import { useLabQuality } from './QualityContext';
import { WorkerModel } from './WorkerModel';

const WALK_SPEED = 0.62;
const ARRIVE_EPSILON = 0.05;

function shortestAngle(from: number, to: number): number {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

/**
 * Walks a worker around their own hand-authored route.
 *
 * The previous version chose destinations at random and snapped the worker onto
 * the target if the walk outran a randomised timeout — which is what produced
 * both the furniture-walking and the teleports. Position is now only ever
 * advanced by speed × delta along a leg whose lane was chosen to be clear, so
 * neither can happen.
 */
export function Worker({ data }: { data: WorkerData }) {
  const groupRef = useRef<THREE.Group>(null);
  const pose = useMemo(() => createWorkerPose(), []);
  const { reducedMotion } = useLabQuality();
  const camera = useThree((state) => state.camera);

  const hovered = useIsHovered('worker', data.id);
  const selected = useIsSelected('worker', data.id);
  const attending = hovered || selected;

  const route = data.route;
  const legIndex = useRef(0);
  const walking = useRef(false);
  const dwellUntil = useRef(0);
  const started = useRef(false);
  const attentionSince = useRef(0);
  const reaction = useRef<{ type: ReactionType; until: number } | null>(null);

  useEffect(
    () =>
      onWorkerReaction((event) => {
        if (event.workerId !== data.id) return;
        reaction.current = { type: event.type, until: event.until };
      }),
    [data.id],
  );

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    registerAnchor('worker', data.id, group);
    return () => {
      unregisterAnchor('worker', data.id);
      document.body.style.cursor = 'auto';
    };
  }, [data.id]);

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const step = Math.min(delta, 1 / 30);
    const elapsed = clock.getElapsedTime();

    if (!started.current) {
      const first = route[0];
      group.position.set(first.at[0], 0, first.at[1]);
      group.rotation.y = first.facing ?? 0;
      dwellUntil.current = elapsed + (first.dwell ?? 1);
      started.current = true;
    }

    let desiredFacing = group.rotation.y;

    // ---- reacting to the visitor -----------------------------------------
    if (attending) {
      if (attentionSince.current === 0) attentionSince.current = elapsed;
      const sinceHover = elapsed - attentionSince.current;

      const toCamera = new THREE.Vector3().subVectors(camera.position, group.position);
      desiredFacing = Math.atan2(toCamera.x, toCamera.z);

      pose.locomotion = THREE.MathUtils.damp(pose.locomotion, 0, 10, step);
      pose.attention = THREE.MathUtils.damp(pose.attention, 1, 7, step);
      pose.work = THREE.MathUtils.damp(pose.work, 0, 8, step);
      pose.inspect = THREE.MathUtils.damp(pose.inspect, 0, 8, step);
      // a short wave on arrival, then settle into simply looking over
      pose.wave = THREE.MathUtils.damp(pose.wave, sinceHover < 1.4 ? 1 : 0, 6, step);
      pose.sip = THREE.MathUtils.damp(pose.sip, 0, 8, step);
      pose.phase += step * 5;
      pose.bob = Math.sin(elapsed * 2.4) * 0.012;

      // hold the route clock so they resume where they left off
      dwellUntil.current = Math.max(dwellUntil.current, elapsed + 0.25);
      group.rotation.y += shortestAngle(group.rotation.y, desiredFacing) * Math.min(1, step * 6);
      return;
    }

    attentionSince.current = 0;

    // ---- scheduled factory reaction ---------------------------------------
    const active = reaction.current && Date.now() < reaction.current.until ? reaction.current : null;
    if (!active) reaction.current = null;

    if (active) {
      pose.locomotion = THREE.MathUtils.damp(pose.locomotion, 0, 10, step);
      pose.work = THREE.MathUtils.damp(pose.work, 0, 8, step);
      pose.inspect = THREE.MathUtils.damp(pose.inspect, 0, 8, step);
      pose.phase += step * 4;
      pose.bob = Math.sin(elapsed * 2.6) * 0.01;
      // hold the route while the moment plays out
      dwellUntil.current = Math.max(dwellUntil.current, elapsed + 0.25);

      if (active.type === 'wave') {
        // waving at the camera, not at the cursor — the miniature workers
        // notice they are being watched
        const toCamera = new THREE.Vector3().subVectors(camera.position, group.position);
        desiredFacing = Math.atan2(toCamera.x, toCamera.z);
        pose.wave = THREE.MathUtils.damp(pose.wave, 1, 7, step);
        pose.attention = THREE.MathUtils.damp(pose.attention, 1, 6, step);
        pose.sip = THREE.MathUtils.damp(pose.sip, 0, 8, step);
      } else if (active.type === 'lookAround') {
        const base = route[legIndex.current].facing ?? group.rotation.y;
        desiredFacing = base + Math.sin(elapsed * 1.5) * 0.7;
        pose.wave = THREE.MathUtils.damp(pose.wave, 0, 8, step);
        pose.attention = THREE.MathUtils.damp(pose.attention, 0.6, 5, step);
        pose.sip = THREE.MathUtils.damp(pose.sip, 0, 8, step);
      } else {
        desiredFacing = route[legIndex.current].facing ?? group.rotation.y;
        pose.sip = THREE.MathUtils.damp(pose.sip, 1, 6, step);
        pose.wave = THREE.MathUtils.damp(pose.wave, 0, 8, step);
        pose.attention = THREE.MathUtils.damp(pose.attention, 0.3, 5, step);
      }

      group.rotation.y += shortestAngle(group.rotation.y, desiredFacing) * Math.min(1, step * 6);
      return;
    }

    pose.attention = THREE.MathUtils.damp(pose.attention, 0, 6, step);
    pose.wave = THREE.MathUtils.damp(pose.wave, 0, 8, step);
    pose.sip = THREE.MathUtils.damp(pose.sip, 0, 8, step);

    if (reducedMotion) {
      pose.locomotion = 0;
      pose.work = 0;
      pose.inspect = 0;
      pose.bob = 0;
      return;
    }

    // ---- following the route ---------------------------------------------
    if (walking.current) {
      const target = route[legIndex.current];
      const toTarget = new THREE.Vector3(target.at[0] - group.position.x, 0, target.at[1] - group.position.z);
      const distance = toTarget.length();

      if (distance <= ARRIVE_EPSILON) {
        group.position.x = target.at[0];
        group.position.z = target.at[1];

        if (target.startsMachine) emitLabEvent('machine:start');

        if (target.dwell && target.dwell > 0) {
          walking.current = false;
          dwellUntil.current = elapsed + target.dwell;
        } else {
          // a travel corner: keep walking straight into the next leg
          legIndex.current = (legIndex.current + 1) % route.length;
        }
      } else {
        toTarget.divideScalar(distance); // normalise without a second pass
        const advance = Math.min(WALK_SPEED * step, distance);
        group.position.addScaledVector(toTarget, advance);
        desiredFacing = Math.atan2(toTarget.x, toTarget.z);
        pose.phase += step * 7.2;
      }

      pose.locomotion = THREE.MathUtils.damp(pose.locomotion, 1, 8, step);
      pose.work = THREE.MathUtils.damp(pose.work, 0, 9, step);
      pose.inspect = THREE.MathUtils.damp(pose.inspect, 0, 9, step);
      pose.bob = 0;
      const previous = route[(legIndex.current - 1 + route.length) % route.length];
      pose.carrying = Boolean(previous.carryOut);
    } else {
      const here = route[legIndex.current];
      desiredFacing = here.facing ?? group.rotation.y;

      pose.locomotion = THREE.MathUtils.damp(pose.locomotion, 0, 9, step);
      pose.work = THREE.MathUtils.damp(pose.work, here.action === 'work' ? 1 : 0, 6, step);
      pose.inspect = THREE.MathUtils.damp(pose.inspect, here.action === 'inspect' ? 1 : 0, 6, step);
      pose.phase += step * (here.action === 'work' ? 5 : 2);
      pose.bob = Math.sin(elapsed * (here.action ? 4.2 : 1.8)) * 0.011;

      if (elapsed >= dwellUntil.current) {
        walking.current = true;
        legIndex.current = (legIndex.current + 1) % route.length;
      }
    }

    group.rotation.y += shortestAngle(group.rotation.y, desiredFacing) * Math.min(1, step * 7);
  });

  return (
    <group
      ref={groupRef}
      onPointerOver={(event) => {
        event.stopPropagation();
        hoverEntity({ kind: 'worker', id: data.id });
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        hoverEntity(null);
        document.body.style.cursor = 'auto';
      }}
      onClick={(event) => {
        event.stopPropagation();
        selectEntity({ kind: 'worker', id: data.id });
      }}
    >
      {/* forgiving hit volume — the characters are small on a phone */}
      <mesh visible={false} position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 1.4, 8]} />
      </mesh>

      <WorkerModel pose={pose} appearance={data.appearance} />

      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={attending}>
        <ringGeometry args={[0.34, 0.42, 32]} />
        <meshBasicMaterial color={data.appearance.cap} transparent opacity={selected ? 0.9 : 0.5} />
      </mesh>
    </group>
  );
}
