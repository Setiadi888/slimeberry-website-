'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE } from '@/lib/palette';
import { BELT, FLOOR_TOP_Y, SHIPPER, STATION_POS } from '@/lib/layout';
import { useLabQuality } from './QualityContext';
import { NO_HIT } from './StationGroup';

/* --------------------------------------------------------------- geometry */

/** Just inside the tunnel's east mouth, so a box is never seen appearing. */
const EXIT_X = STATION_POS.packaging[0] + 0.4;
/** On the transfer rollers past the belt's end, where the arm collects. */
const PICK_X = 6.0;

/** Link lengths. Longer than the loading arm's — a palletiser is a bigger machine. */
const UPPER = 0.78;
const FORE = 0.66;
const REACH_LIMIT = UPPER + FORE - 0.02;
/** Shoulder pivot above the plinth's top face. */
const SHOULDER_Y = 0.74;
/** How far below the wrist the gripper holds the box's centre. */
const HOLD_DROP = 0.2;
/** Straight-up clearance between a pick or a place and the swing across. */
const LIFT = 0.34;

const PALLET_TOP = 0.32;
const LAYER_H = SHIPPER.height + 0.015;
/** Two layers of four. Filling it takes eight cycles, then it ships out. */
const CAPACITY = 8;

const BOX_COUNT = 3;
const RIDE_SECONDS = (PICK_X - EXIT_X) / BELT.speed;
/**
 * One box arrives exactly as the last one is gripped, because the arm's cycle is
 * the ride divided by the number of boxes on the belt. That is the whole timing
 * model: everything below is phase-locked to it, so the jaws never close on air.
 */
const ARM_PERIOD = RIDE_SECONDS / BOX_COUNT;

/** Where cargo sits when it is resting on the belt. */
const BELT_BOX_Y = BELT.surfaceY + SHIPPER.height / 2;

/* -------------------------------------------------------------- the cycle */

/**
 * The arm's programme, as fractions of one cycle. Phase 0 is the instant a box
 * reaches the pick point with the gripper already down around it.
 *
 * The two swings happen at height and the two vertical moves happen without any
 * swing, which is both how a real palletiser moves and the only way the box can
 * be seen to be set down rather than swept into place.
 */
const CLOSE_END = 0.075;
const LIFT_END = 0.24;
const CROSS_END = 0.43;
const LOWER_END = 0.585;
const OPEN_END = 0.655;
const CLEAR_END = 0.8;
const RETURN_END = 0.92;

const smooth = (t: number) => t * t * (3 - 2 * t);
/** Eased 0..1 across a window of the cycle, clamped outside it. */
const span = (p: number, from: number, to: number) =>
  smooth(THREE.MathUtils.clamp((p - from) / (to - from), 0, 1));

interface Pose {
  reach: number;
  lift: number;
  swing: number;
}

/**
 * Slot centres on the pallet, in the pallet group's own frame.
 *
 * Precomputed rather than built per call: the frame loop asks for one of these
 * every frame, and the eight of them never change.
 */
const SLOTS: ReadonlyArray<readonly [number, number, number]> = Array.from(
  { length: CAPACITY },
  (_, index) => {
    const layer = Math.floor(index / 4);
    const cell = index % 4;
    return [
      ((cell % 2) - 0.5) * 0.44,
      PALLET_TOP + layer * LAYER_H + SHIPPER.height / 2,
      (Math.floor(cell / 2) - 0.5) * 0.48,
    ] as const;
  },
);

/**
 * The palletiser at the end of the line.
 *
 * It owns everything east of the packaging tunnel: the boxes riding the belt,
 * the arm, and the stack. One owner means the hand-off can be exact — the arm's
 * pick pose is *derived from* where the box is resting rather than hand-tuned to
 * look close, and the carried box is placed at a marker inside the gripper every
 * frame, so it cannot drift out of the jaws.
 *
 * Cosmetic: nothing here answers the pointer.
 */
export function Palletiser() {
  const yawRef = useRef<THREE.Group>(null);
  const shoulderRef = useRef<THREE.Group>(null);
  const elbowRef = useRef<THREE.Group>(null);
  const wristRef = useRef<THREE.Group>(null);
  const handRef = useRef<THREE.Group>(null);
  const jawsRef = useRef<THREE.Group>(null);
  const holdRef = useRef<THREE.Group>(null);
  const lineRef = useRef<THREE.Group>(null);
  const carriedRef = useRef<THREE.Group>(null);
  const stackRef = useRef<THREE.Group>(null);
  const { reducedMotion } = useLabQuality();

  const [baseX, , baseZ] = STATION_POS.palletiser;
  const [palletX, , palletZ] = STATION_POS.pallet;
  const shoulderWorldY = FLOOR_TOP_Y + SHOULDER_Y;
  const held = useMemo(() => new THREE.Vector3(), []);

  /**
   * Turns a world point the gripper should hold into arm coordinates, writing
   * into a pose the caller owns. The frame loop keeps three of these around and
   * reuses them, rather than minting fresh objects sixty times a second.
   */
  const poseFor = useMemo(() => {
    return (out: Pose, x: number, y: number, z: number, extraLift = 0): Pose => {
      const dx = x - baseX;
      const dz = z - baseZ;
      out.reach = Math.hypot(dx, dz);
      // the IK aims the wrist; the box hangs HOLD_DROP under it
      out.lift = y + HOLD_DROP - shoulderWorldY + extraLift;
      out.swing = Math.atan2(-dz, dx);
      return out;
    };
  }, [baseX, baseZ, shoulderWorldY]);

  /** Every pose the loop needs, allocated once. */
  const scratch = useMemo(
    () => ({
      place: { reach: 0, lift: 0, swing: 0 } as Pose,
      placeHigh: { reach: 0, lift: 0, swing: 0 } as Pose,
      current: { reach: 0, lift: 0, swing: 0 } as Pose,
    }),
    [],
  );

  const poses = useMemo(() => {
    const blank = (): Pose => ({ reach: 0, lift: 0, swing: 0 });
    return {
      pick: poseFor(blank(), PICK_X, BELT_BOX_Y, BELT.z),
      pickHigh: poseFor(blank(), PICK_X, BELT_BOX_Y, BELT.z, LIFT),
    };
  }, [poseFor]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const cycle = Math.floor(time / ARM_PERIOD);
    const p = reducedMotion ? 0 : (time % ARM_PERIOD) / ARM_PERIOD;
    /** Which slot this cycle is filling. Slot 0 is also when the pallet ships. */
    const slot = cycle % CAPACITY;

    /* ---- the boxes still on the belt ----------------------------------- */
    lineRef.current?.children.forEach((box, index) => {
      const phase = reducedMotion
        ? index / BOX_COUNT
        : ((time / RIDE_SECONDS) + index / BOX_COUNT) % 1;
      box.position.x = EXIT_X + phase * (PICK_X - EXIT_X);
    });

    /* ---- where the arm should be --------------------------------------- */
    const [ox, oy, oz] = SLOTS[slot];
    const place = poseFor(scratch.place, palletX + ox, FLOOR_TOP_Y + oy, palletZ + oz);
    const placeHigh = scratch.placeHigh;
    placeHigh.reach = place.reach;
    placeHigh.lift = place.lift + LIFT;

    // unwrap so the arm always turns the short way round
    let placeSwing = place.swing;
    while (placeSwing - poses.pick.swing > Math.PI) placeSwing -= Math.PI * 2;
    while (placeSwing - poses.pick.swing < -Math.PI) placeSwing += Math.PI * 2;
    place.swing = placeSwing;
    placeHigh.swing = placeSwing;

    const lerp = (a: Pose, b: Pose, k: number): Pose => {
      const out = scratch.current;
      out.reach = a.reach + (b.reach - a.reach) * k;
      out.lift = a.lift + (b.lift - a.lift) * k;
      out.swing = a.swing + (b.swing - a.swing) * k;
      return out;
    };

    let pose: Pose;
    if (p < CLOSE_END) pose = poses.pick; // down on the box, closing
    else if (p < LIFT_END) pose = lerp(poses.pick, poses.pickHigh, span(p, CLOSE_END, LIFT_END));
    else if (p < CROSS_END) pose = lerp(poses.pickHigh, placeHigh, span(p, LIFT_END, CROSS_END));
    else if (p < LOWER_END) pose = lerp(placeHigh, place, span(p, CROSS_END, LOWER_END));
    else if (p < OPEN_END) pose = place; // down on the pallet, opening
    else if (p < CLEAR_END) pose = lerp(place, placeHigh, span(p, OPEN_END, CLEAR_END));
    else if (p < RETURN_END) pose = lerp(placeHigh, poses.pickHigh, span(p, CLEAR_END, RETURN_END));
    else pose = lerp(poses.pickHigh, poses.pick, span(p, RETURN_END, 1));

    /* ---- two-link IK, elbow up ------------------------------------------ */
    const target = THREE.MathUtils.clamp(
      Math.hypot(pose.reach, pose.lift),
      Math.abs(UPPER - FORE) + 0.02,
      REACH_LIMIT,
    );
    const bend = Math.acos(
      THREE.MathUtils.clamp((target * target - UPPER * UPPER - FORE * FORE) / (2 * UPPER * FORE), -1, 1),
    );
    const shoulder =
      Math.atan2(pose.lift, pose.reach) + Math.atan2(FORE * Math.sin(bend), UPPER + FORE * Math.cos(bend));

    if (yawRef.current) yawRef.current.rotation.y = pose.swing;
    if (shoulderRef.current) shoulderRef.current.rotation.z = shoulder;
    if (elbowRef.current) elbowRef.current.rotation.z = -bend;
    if (wristRef.current) wristRef.current.rotation.z = -Math.PI / 2 - (shoulder - bend);
    /*
      The wrist rolls to cancel the swing, so the box is carried and set down
      square to the pallet rather than skewed to wherever the arm happens to be
      pointing. The hand hangs down its own local +x, so a roll about that axis
      is a rotation about world Y — hence rotation.x, not rotation.y.
    */
    if (handRef.current) handRef.current.rotation.x = pose.swing;

    /* ---- jaws ----------------------------------------------------------- */
    const grip =
      p < CLOSE_END
        ? span(p, 0, CLOSE_END)
        : p < LOWER_END
          ? 1
          : p < OPEN_END
            ? 1 - span(p, LOWER_END, OPEN_END)
            : 0;
    // the jaws close across the box's depth, which is the face they grip
    jawsRef.current?.children.forEach((jaw, index) => {
      jaw.position.z = (index === 0 ? -1 : 1) * (SHIPPER.depth / 2 + 0.08 - grip * 0.072);
    });

    /* ---- the box in the gripper ----------------------------------------- */
    const carried = carriedRef.current;
    if (carried) {
      const carrying = !reducedMotion && p < LOWER_END;
      carried.visible = carrying;
      if (carrying && holdRef.current) {
        // read straight off a marker inside the hand, so it cannot drift
        holdRef.current.getWorldPosition(held);
        carried.position.copy(held);
      }
    }

    /* ---- the stack ------------------------------------------------------ */
    // boxes already down this round, plus the one just released
    const placed = slot + (p >= LOWER_END ? 1 : 0);
    // and, on the cycle after it filled, the whole pallet going out
    const shippingOut = slot === 0 && cycle > 0 && p < 0.18 ? 1 - span(p, 0, 0.18) : 0;

    stackRef.current?.children.forEach((box, index) => {
      if (shippingOut > 0) {
        box.visible = true;
        box.scale.setScalar(shippingOut);
      } else if (index < placed) {
        box.visible = true;
        box.scale.setScalar(1);
      } else {
        box.visible = false;
      }
    });
  });

  return (
    <group>
      {/* ---- boxes riding the belt out of packaging --------------------- */}
      <group ref={lineRef} position={[0, BELT_BOX_Y, BELT.z]}>
        {Array.from({ length: BOX_COUNT }, (_, index) => (
          <group key={index}>
            <Shipper />
          </group>
        ))}
      </group>

      {/* ---- the one currently in the jaws ------------------------------ */}
      <group ref={carriedRef} visible={false}>
        <Shipper />
      </group>

      {/* ---- the stack on the pallet ------------------------------------ */}
      <group position={[palletX, FLOOR_TOP_Y, palletZ]}>
        {/* deck */}
        <RoundedBox args={[1.06, 0.1, 1.06]} radius={0.03} smoothness={3} position={[0, PALLET_TOP - 0.05, 0]} castShadow receiveShadow raycast={NO_HIT}>
          <meshStandardMaterial color={PALETTE.metal} roughness={0.44} metalness={0.4} />
        </RoundedBox>
        {[-0.36, 0, 0.36].map((z) => (
          <mesh key={z} position={[0, 0.12, z]} castShadow receiveShadow raycast={NO_HIT}>
            <boxGeometry args={[1.02, 0.16, 0.2]} />
            <meshStandardMaterial color={PALETTE.metalDark} roughness={0.5} metalness={0.3} />
          </mesh>
        ))}
        {/* painted bay, so the pallet reads as a marked-out spot on the floor */}
        <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={NO_HIT}>
          <ringGeometry args={[0.78, 0.88, 40]} />
          <meshBasicMaterial color={PALETTE.butter} transparent opacity={0.5} />
        </mesh>
      </group>
      <group ref={stackRef}>
        {Array.from({ length: CAPACITY }, (_, index) => {
          const [ox, oy, oz] = SLOTS[index];
          return (
            <group key={index} position={[palletX + ox, FLOOR_TOP_Y + oy, palletZ + oz]} visible={false}>
              <Shipper />
            </group>
          );
        })}
      </group>

      {/* ---- the arm ----------------------------------------------------- */}
      <group position={[baseX, FLOOR_TOP_Y, baseZ]}>
        <mesh position={[0, 0.06, 0]} castShadow receiveShadow raycast={NO_HIT}>
          <cylinderGeometry args={[0.36, 0.4, 0.12, 28]} />
          <meshStandardMaterial color={PALETTE.metalDark} roughness={0.5} metalness={0.35} />
        </mesh>
        {[0, 1, 2, 3].map((i) => {
          const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
          return (
            <mesh key={i} position={[Math.cos(angle) * 0.31, 0.125, Math.sin(angle) * 0.31]} raycast={NO_HIT}>
              <cylinderGeometry args={[0.034, 0.034, 0.03, 8]} />
              <meshStandardMaterial color={PALETTE.metal} roughness={0.35} metalness={0.6} />
            </mesh>
          );
        })}

        <group ref={yawRef} position={[0, 0.12, 0]}>
          <mesh position={[0, 0.1, 0]} castShadow raycast={NO_HIT}>
            <cylinderGeometry args={[0.26, 0.29, 0.2, 26]} />
            <meshStandardMaterial color={PALETTE.machine} roughness={0.42} metalness={0.2} />
          </mesh>
          <RoundedBox args={[0.32, 0.46, 0.36]} radius={0.07} smoothness={3} position={[0, 0.44, 0]} castShadow raycast={NO_HIT}>
            <meshStandardMaterial color={PALETTE.shell} roughness={0.46} metalness={0.14} />
          </RoundedBox>

          <group ref={shoulderRef} position={[0, SHOULDER_Y, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow raycast={NO_HIT}>
              <cylinderGeometry args={[0.125, 0.125, 0.3, 20]} />
              <meshStandardMaterial color={PALETTE.metal} roughness={0.36} metalness={0.5} />
            </mesh>
            <mesh position={[UPPER / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow raycast={NO_HIT}>
              <capsuleGeometry args={[0.092, UPPER - 0.11, 6, 14]} />
              <meshStandardMaterial color={PALETTE.shell} roughness={0.44} metalness={0.16} />
            </mesh>
            <mesh position={[UPPER * 0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]} raycast={NO_HIT}>
              <cylinderGeometry args={[0.095, 0.095, 0.07, 16]} />
              <meshStandardMaterial color={PALETTE.butter} roughness={0.5} />
            </mesh>

            <group ref={elbowRef} position={[UPPER, 0, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} castShadow raycast={NO_HIT}>
                <cylinderGeometry args={[0.098, 0.098, 0.24, 18]} />
                <meshStandardMaterial color={PALETTE.metal} roughness={0.36} metalness={0.5} />
              </mesh>
              <mesh position={[FORE / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow raycast={NO_HIT}>
                <capsuleGeometry args={[0.072, FORE - 0.1, 6, 14]} />
                <meshStandardMaterial color={PALETTE.shell} roughness={0.44} metalness={0.16} />
              </mesh>

              <group ref={wristRef} position={[FORE, 0, 0]}>
                <mesh rotation={[Math.PI / 2, 0, 0]} castShadow raycast={NO_HIT}>
                  <cylinderGeometry args={[0.075, 0.075, 0.18, 16]} />
                  <meshStandardMaterial color={PALETTE.metal} roughness={0.36} metalness={0.52} />
                </mesh>

                {/* everything below the roll joint stays square to the world */}
                <group ref={handRef}>
                  <mesh position={[0.08, 0, 0]} castShadow raycast={NO_HIT}>
                    <boxGeometry args={[0.1, 0.16, 0.16]} />
                    <meshStandardMaterial color={PALETTE.machine} roughness={0.4} metalness={0.24} />
                  </mesh>
                  {/*
                    The hand hangs down the wrist's local +x. This marker is the
                    point the box's centre is held at, and the carried box is
                    written to its world position every frame.
                  */}
                  <group ref={holdRef} position={[HOLD_DROP, 0, 0]} />
                  <group ref={jawsRef} position={[HOLD_DROP * 0.7, 0, 0]}>
                    {[-1, 1].map((side) => (
                      <mesh key={side} position={[0, 0, side * 0.29]} castShadow raycast={NO_HIT}>
                        <boxGeometry args={[0.2, 0.3, 0.028]} />
                        <meshStandardMaterial color={PALETTE.metalDark} roughness={0.45} metalness={0.4} />
                      </mesh>
                    ))}
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

/** A finished shipper: kraft board, a tape seam and the house label. */
function Shipper() {
  return (
    <group>
      <RoundedBox
        args={[SHIPPER.width, SHIPPER.height, SHIPPER.depth]}
        radius={0.022}
        smoothness={3}
        castShadow
        receiveShadow
        raycast={NO_HIT}
      >
        <meshStandardMaterial color={PALETTE.wood} roughness={0.84} />
      </RoundedBox>
      {/* tape down the seam */}
      <mesh position={[0, SHIPPER.height / 2 + 0.002, 0]} raycast={NO_HIT}>
        <boxGeometry args={[0.1, 0.006, SHIPPER.depth + 0.004]} />
        <meshStandardMaterial color="#d8c09a" roughness={0.6} />
      </mesh>
      {/* label on the outward face */}
      <mesh position={[0, 0.01, SHIPPER.depth / 2 + 0.003]} raycast={NO_HIT}>
        <boxGeometry args={[0.17, 0.12, 0.004]} />
        <meshStandardMaterial color="#fdfaf4" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.01, SHIPPER.depth / 2 + 0.007]} raycast={NO_HIT}>
        <cylinderGeometry args={[0.032, 0.032, 0.004, 14]} />
        <meshStandardMaterial color={PALETTE.berry} roughness={0.5} />
      </mesh>
    </group>
  );
}
