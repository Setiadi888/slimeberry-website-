'use client';

import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { createWorkerPose, type WorkerPose } from '@/lib/workerPose';
import { emitLabEvent } from '@/lib/labEvents';
import { registerAnchor, unregisterAnchor } from '@/lib/anchors';
import { hoverEntity, selectEntity, useIsHovered, useIsSelected } from '@/lib/interaction';
import { onWorkerReaction, pokeWorker, readThought, type ReactionType } from '@/lib/factoryLife';
import { footstep, speak } from '@/lib/audio';
import { pickStop, planWalk, rollDwell, type RoamStop } from '@/lib/roaming';
import type { WorkerData } from '@/lib/workers';
import { CHARACTER_Y, FLOOR_TOP_Y } from '@/lib/layout';
import { useLabQuality } from './QualityContext';
import { WorkerModel } from './WorkerModel';

/**
 * Metres a second across the floor. Exported because `StaffModel` has to know
 * it: a walk cycle that does not advance the feet at the speed the body is
 * travelling is the definition of a character sliding.
 */
export const WALK_SPEED = 0.62;
const ARRIVE_EPSILON = 0.05;

/*
  Scratch vectors, shared by every worker.

  These used to be allocated inside the frame loop — three Vector3s per worker
  per frame, which is nine hundred a second across the cast, all of it immediate
  garbage. A frame callback is synchronous and never re-entered, so one instance
  each is enough and nothing can observe the reuse.
*/
const toCamera = new THREE.Vector3();
const toTarget = new THREE.Vector3();

function shortestAngle(from: number, to: number): number {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

/**
 * Walks a worker around their patch.
 *
 * Where they go next is a weighted throw over their own stops; how they get
 * there is not. `planWalk` turns the choice into a list of floor positions that
 * steps onto their measured corridor, walks it, and steps off — and position is
 * only ever advanced by speed x delta along one of those legs. That is the whole
 * reason this looks unscripted without ever walking through a bench: an earlier
 * version picked targets at random and beelined to them, which is exactly how
 * workers ended up inside the furniture.
 */
export function Worker({
  data,
  model,
  voice,
  commute = 'settled',
}: {
  data: WorkerData;
  /**
   * What to draw. Defaults to the procedural rig; Bibi passes a GLB-backed one
   * that reads the same pose object, so everything above the neck of this
   * component — routing, reactions, poking, footsteps — is shared.
   */
  model?: (pose: WorkerPose) => ReactNode;
  /** What they say when noticed. Defaults to the gibberish mumble. */
  voice?: () => void;
  /**
   * Where this character is in their shift.
   *
   * `arriving` starts them at the staff door and sends them straight to a
   * station; `leaving` sends them back to it and keeps them there. Both are
   * routed through the same corridor as everything else — the door is simply
   * another stop, so nobody walks through a bench on their way home.
   */
  commute?: 'arriving' | 'leaving' | 'settled';
}) {
  const groupRef = useRef<THREE.Group>(null);
  const pose = useMemo(() => createWorkerPose(), []);
  const { reducedMotion } = useLabQuality();
  const camera = useThree((state) => state.camera);

  const hovered = useIsHovered('worker', data.id);
  const selected = useIsSelected('worker', data.id);
  const attending = hovered || selected;

  const roam = data.roam;
  const doorStop = useMemo(
    () => roam.stops.find((stop) => stop.id === 'door') ?? roam.stops[0],
    [roam],
  );
  /** Latest value of `commute`, read from inside the frame loop. */
  const commuteRef = useRef(commute);
  commuteRef.current = commute;
  /** Set once, when the shift ends, so the walk home is only laid out once. */
  const goingHome = useRef(false);
  /** Where they are standing (or heading for), and the legs left to walk to it. */
  const here = useRef<RoamStop>(roam.stops[0]);
  const legs = useRef<[number, number][]>([]);
  /** Stops to keep out of the next draw, so a short beat cannot shuffle. */
  const recent = useRef<string[]>([]);
  const walking = useRef(false);
  const dwellUntil = useRef(0);
  const started = useRef(false);
  const attentionSince = useRef(0);
  const reaction = useRef<{ type: ReactionType; until: number } | null>(null);
  /** Sign of the walk cycle last frame, so a footstep fires once per stride. */
  const strideSign = useRef(1);
  /** Captured on departure: what they took with them off the last stop. */
  const carryingOut = useRef(false);

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

  /** Lays out the walk from one stop to another. */
  const walkTo = (from: RoamStop, next: RoamStop) => {
    legs.current = planWalk(roam.lane, from, next);
    here.current = next;
    walking.current = true;
  };

  /** Chooses the next stop and lays out the walk to it. */
  const departFrom = (stop: RoamStop) => {
    // clocking off overrides whatever they were going to do next
    if (commuteRef.current === 'leaving') {
      walkTo(stop, doorStop);
      return;
    }
    const forced = stop.then ? roam.stops.find((next) => next.id === stop.then) : undefined;
    const next = forced ?? pickStop(roam.stops, recent.current);
    walkTo(stop, next);
    // the forced half of an errand is not a free choice, so it does not count
    if (!forced) {
      recent.current = [stop.id, ...recent.current].slice(0, 2);
    }
  };

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const step = Math.min(delta, 1 / 30);
    const elapsed = clock.getElapsedTime();

    /*
      Read before any of the branches below return, because being prodded is
      orthogonal to what they are doing — you are almost always hovering them
      when it happens, and the hover branch bails out early.
    */
    const complaint = readThought();
    const annoyed = Boolean(
      complaint?.insistent &&
        complaint.speaker.kind === 'worker' &&
        complaint.speaker.id === data.id,
    );
    pose.grumpy = THREE.MathUtils.damp(pose.grumpy, annoyed ? 1 : 0, 6, step);

    if (!started.current) {
      // coming on shift, they start in the doorway and walk to a station
      const arriving = commuteRef.current === 'arriving';
      const first = arriving ? doorStop : roam.stops[0];
      here.current = first;
      // y is the floor's top surface plus the rig's foot offset — see CHARACTER_Y
      group.position.set(first.at[0], CHARACTER_Y, first.at[1]);
      group.rotation.y = first.facing ?? 0;
      dwellUntil.current = elapsed + rollDwell(first);
      started.current = true;
      if (arriving) departFrom(first);
    }

    /*
      The shift has ended. Cut whatever dwell is running short — a fifteen second
      sit would otherwise leave somebody at the coffee table well past the point
      the door shuts — and let `departFrom` route them to it.
    */
    if (commuteRef.current === 'leaving' && !goingHome.current) {
      goingHome.current = true;
      dwellUntil.current = Math.min(dwellUntil.current, elapsed + 1.2);
    }

    let desiredFacing = group.rotation.y;

    // ---- reacting to the visitor -----------------------------------------
    if (attending) {
      if (attentionSince.current === 0) {
        attentionSince.current = elapsed;
        // they say something as they look up — no-ops unless sound is on
        if (voice) voice();
        else speak(data.dialogue[Math.floor(Math.random() * data.dialogue.length)], data.id);
      }
      const sinceHover = elapsed - attentionSince.current;

      toCamera.subVectors(camera.position, group.position);
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
        toCamera.subVectors(camera.position, group.position);
        desiredFacing = Math.atan2(toCamera.x, toCamera.z);
        pose.wave = THREE.MathUtils.damp(pose.wave, 1, 7, step);
        pose.attention = THREE.MathUtils.damp(pose.attention, 1, 6, step);
        pose.sip = THREE.MathUtils.damp(pose.sip, 0, 8, step);
      } else if (active.type === 'lookAround') {
        const base = here.current.facing ?? group.rotation.y;
        desiredFacing = base + Math.sin(elapsed * 1.5) * 0.7;
        pose.wave = THREE.MathUtils.damp(pose.wave, 0, 8, step);
        pose.attention = THREE.MathUtils.damp(pose.attention, 0.6, 5, step);
        pose.sip = THREE.MathUtils.damp(pose.sip, 0, 8, step);
      } else {
        desiredFacing = here.current.facing ?? group.rotation.y;
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

    // ---- getting about ----------------------------------------------------
    const stop = here.current;

    if (walking.current) {
      const leg = legs.current[0];

      if (!leg) {
        // already standing where we were sent
        walking.current = false;
        dwellUntil.current = elapsed + rollDwell(stop);
      } else {
        toTarget.set(leg[0] - group.position.x, 0, leg[1] - group.position.z);
        const distance = toTarget.length();

        if (distance <= ARRIVE_EPSILON) {
          group.position.x = leg[0];
          group.position.z = leg[1];
          legs.current.shift();

          if (legs.current.length === 0) {
            if (stop.startsMachine) emitLabEvent('machine:start');
            if (stop.washes) emitLabEvent('sink:use');
            walking.current = false;
            dwellUntil.current = elapsed + rollDwell(stop);
          }
        } else {
          toTarget.divideScalar(distance); // normalise without a second pass
          const advance = Math.min(WALK_SPEED * step, distance);
          group.position.addScaledVector(toTarget, advance);
          desiredFacing = Math.atan2(toTarget.x, toTarget.z);
          pose.phase += step * 7.2;

          // one scuff per half-cycle of the walk, which is one per foot
          const sign = Math.sin(pose.phase) >= 0 ? 1 : -1;
          if (sign !== strideSign.current) {
            strideSign.current = sign;
            footstep();
          }
        }
      }

      pose.locomotion = THREE.MathUtils.damp(pose.locomotion, 1, 8, step);
      pose.work = THREE.MathUtils.damp(pose.work, 0, 9, step);
      pose.inspect = THREE.MathUtils.damp(pose.inspect, 0, 9, step);
      pose.sit = THREE.MathUtils.damp(pose.sit, 0, 7, step);
      pose.bob = 0;
      // whatever they picked up at the stop they left, they still have
      pose.carrying = carryingOut.current;
    } else {
      const sitting = stop.action === 'sit';
      desiredFacing = stop.facing ?? group.rotation.y;
      pose.carrying = false;

      pose.locomotion = THREE.MathUtils.damp(pose.locomotion, 0, 9, step);
      pose.work = THREE.MathUtils.damp(pose.work, stop.action === 'work' ? 1 : 0, 6, step);
      pose.inspect = THREE.MathUtils.damp(pose.inspect, stop.action === 'inspect' ? 1 : 0, 6, step);
      pose.sit = THREE.MathUtils.damp(pose.sit, sitting ? 1 : 0, 5, step);
      pose.phase += step * (stop.action === 'work' ? 5 : 2);
      pose.bob = Math.sin(elapsed * (sitting ? 1.4 : stop.action ? 4.2 : 1.8)) * (sitting ? 0.006 : 0.011);

      if (elapsed >= dwellUntil.current) {
        carryingOut.current = Boolean(stop.carries);
        departFrom(stop);
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
        pokeWorker(data);
        selectEntity({ kind: 'worker', id: data.id });
      }}
    >
      {/* forgiving hit volume — the characters are small on a phone */}
      <mesh visible={false} position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 1.4, 8]} />
      </mesh>

      {model ? model(pose) : <WorkerModel pose={pose} appearance={data.appearance} />}

      <mesh position={[0, FLOOR_TOP_Y - CHARACTER_Y + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={attending}>
        <ringGeometry args={[0.34, 0.42, 32]} />
        <meshBasicMaterial color={data.appearance.cap} transparent opacity={selected ? 0.9 : 0.5} />
      </mesh>
    </group>
  );
}
