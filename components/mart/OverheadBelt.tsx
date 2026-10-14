'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { BUCKET_PRODUCTS, FRUIT_PRODUCTS } from '@/lib/products';
import { CUP_SCALE } from '@/lib/cupSize';
import { MART_FACE_X, MART_FACE_Z } from '@/lib/martLayout';
import { FINISH, FINISH_PBR } from '@/lib/storeFinish';
import { useLabQuality } from '@/components/lab/QualityContext';
import { NO_HIT } from '@/components/lab/StationGroup';
import { BucketProp } from './SlimeBucket';
import { FruitCupProp } from './FruitCup';

/** How high the belt hangs. Above the SB MART sign (top 4.22), below the 5.4 ceiling. */
const MOUNT_Y = 4.5;
/** The belt runs this far in front of each wall face. */
const PROUD = 0.5;
const BELT_HALF = 0.28;
/** The brackets wear the wall's own tone, a hair darker, so only a soft shadow finds them. */
const BRACKET = '#ddd9d1';
/** Metres a second — a touch above the Lab's 0.32, for a long smooth overhead run. */
const SPEED = 0.42;

const V = (x: number, z: number) => new THREE.Vector3(x, MOUNT_Y, z);

/**
 * The belt's centreline, as one arc-length-parameterised path.
 *
 * It emerges from a pit in the back wall, turns out into the room, runs the
 * length of the back wall, rounds the corner on a smooth fillet, runs the length
 * of the west wall, and tucks into a pit in the west wall. A short stub at each
 * end runs on *into* the wall, so the point where the loop closes is behind solid
 * plaster and never seen — the same trick the Lab's belt uses with its spawn and
 * retire sitting inside the discharge hood and the packaging tunnel.
 */
function buildPath() {
  const zB = MART_FACE_Z + PROUD; // back-wall run
  const xW = MART_FACE_X + PROUD; // west-wall run

  const apA = V(5.3, MART_FACE_Z); // aperture in the back wall
  const apB = V(xW - PROUD, 5.6); // aperture in the west wall (x = MART_FACE_X)

  const path = new THREE.CurvePath<THREE.Vector3>();
  // stub behind the back wall → aperture (hidden)
  path.add(new THREE.LineCurve3(V(5.3, MART_FACE_Z - 0.3), apA));
  // tuck: emerge heading +z, turn to -x
  path.add(new THREE.QuadraticBezierCurve3(apA, V(5.3, zB), V(4.8, zB)));
  // the long back-wall run
  path.add(new THREE.LineCurve3(V(4.8, zB), V(-5.7, zB)));
  // the corner
  path.add(new THREE.QuadraticBezierCurve3(V(-5.7, zB), V(xW, zB), V(xW, -5.15)));
  // the long west-wall run
  path.add(new THREE.LineCurve3(V(xW, -5.15), V(xW, 5.1)));
  // tuck: turn to -x, enter the west wall
  path.add(new THREE.QuadraticBezierCurve3(V(xW, 5.1), V(xW, 5.6), apB));
  // stub on into the west wall (hidden)
  path.add(new THREE.LineCurve3(apB, V(MART_FACE_X - 0.3, 5.6)));
  return path;
}

const UP = new THREE.Vector3(0, 1, 0);

/** A flat ribbon following the path, built with a steady +Y up so it never banks. */
function ribbon(path: THREE.CurvePath<THREE.Vector3>, samples: number, half: number, yOff: number) {
  const pos: number[] = [];
  const idx: number[] = [];
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  const r = new THREE.Vector3();
  for (let i = 0; i <= samples; i += 1) {
    path.getPointAt(i / samples, p);
    path.getTangentAt(i / samples, t);
    r.crossVectors(UP, t).normalize().multiplyScalar(half);
    pos.push(p.x + r.x, p.y + yOff, p.z + r.z);
    pos.push(p.x - r.x, p.y + yOff, p.z - r.z);
    if (i < samples) {
      const a = i * 2;
      idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geom.setIndex(idx);
  geom.computeVertexNormals();
  return geom;
}

/** A hooded discharge pit, in the shop's gallery finish rather than the Lab's hazard yellow. */
function DischargePit({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  const stripsRef = useRef<THREE.Group>(null);
  const lampRef = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>(null);
  const { reducedMotion } = useLabQuality();
  const STRIPS = 7;
  const halfZ = BELT_HALF + 0.12;
  const halfY = 0.3;

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (lampRef.current) {
      lampRef.current.material.emissiveIntensity = reducedMotion ? 0.6 : 0.3 + (Math.sin(time * 2.4) + 1) * 0.5;
    }
    if (stripsRef.current && !reducedMotion) {
      stripsRef.current.children.forEach((strip, i) => {
        strip.rotation.x = Math.sin(time * 1.6 + i * 0.7) * 0.07;
      });
    }
  });

  const stripW = (halfZ * 2) / STRIPS;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* the recess: a dark panel just proud of the wall, hiding cargo until it clears */}
      <mesh position={[0, 0, 0.01]} raycast={NO_HIT}>
        <boxGeometry args={[halfZ * 2, halfY * 2, 0.02]} />
        <meshStandardMaterial color="#111316" roughness={1} />
      </mesh>
      {/* steel frame around it */}
      {[-1, 1].map((s) => (
        <mesh key={`v${s}`} position={[s * (halfZ + 0.05), 0, 0.06]} castShadow raycast={NO_HIT}>
          <boxGeometry args={[0.1, halfY * 2 + 0.2, 0.12]} />
          <meshStandardMaterial color={FINISH.steel} {...FINISH_PBR.steel} />
        </mesh>
      ))}
      <mesh position={[0, halfY + 0.05, 0.06]} castShadow raycast={NO_HIT}>
        <boxGeometry args={[halfZ * 2 + 0.2, 0.1, 0.12]} />
        <meshStandardMaterial color={FINISH.steel} {...FINISH_PBR.steel} />
      </mesh>
      <mesh position={[0, -halfY - 0.05, 0.06]} castShadow raycast={NO_HIT}>
        <boxGeometry args={[halfZ * 2 + 0.2, 0.1, 0.12]} />
        <meshStandardMaterial color={FINISH.black} {...FINISH_PBR.black} />
      </mesh>
      {/* projecting hood */}
      <mesh position={[0, halfY + 0.16, 0.18]} rotation={[-0.42, 0, 0]} castShadow raycast={NO_HIT}>
        <boxGeometry args={[halfZ * 2 + 0.26, 0.06, 0.3]} />
        <meshStandardMaterial color={FINISH.steel} {...FINISH_PBR.steel} />
      </mesh>
      {/* dark rubber strip curtain, hung above cargo height */}
      <group ref={stripsRef} position={[0, halfY - 0.04, 0.05]}>
        {Array.from({ length: STRIPS }, (_, i) => (
          <mesh key={i} position={[(i - (STRIPS - 1) / 2) * stripW, -0.12, 0]} raycast={NO_HIT}>
            <boxGeometry args={[stripW * 0.86, 0.24, 0.012]} />
            <meshStandardMaterial color="#26282c" roughness={0.92} transparent opacity={0.94} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      {/* running lamp */}
      <mesh ref={lampRef} position={[halfZ + 0.05, halfY + 0.12, 0.1]} raycast={NO_HIT}>
        <sphereGeometry args={[0.045, 12, 10]} />
        <meshStandardMaterial color={FINISH.led} emissive={FINISH.led} emissiveIntensity={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

/**
 * The overhead belt in SB Mart.
 *
 * A single belt hung near the top of the two walls, carrying the shop's slime —
 * boba buckets and fruit cups in turn — smoothly around the corner. It is
 * ambient rather than interactive: unlike the Lab's conveyor it answers no
 * pointer and opens no card; it is the shop's stock arriving overhead, the way a
 * real one would run a line round the ceiling to keep the floor clear.
 *
 * Both the slats and the cargo move by arc length along the same path at one
 * speed, so the belt surface never slides out from under what stands on it.
 */
export function OverheadBelt() {
  const slatsRef = useRef<THREE.InstancedMesh>(null);
  const cargoRef = useRef<THREE.Group>(null);
  const { reducedMotion } = useLabQuality();

  const path = useMemo(() => buildPath(), []);
  const length = useMemo(() => path.getLength(), [path]);

  const geom = useMemo(() => {
    const samples = Math.max(120, Math.round(length * 7));
    return {
      top: ribbon(path, samples, BELT_HALF, 0),
      frame: ribbon(path, samples, BELT_HALF + 0.05, -0.08),
      railL: ribbon(path, samples, BELT_HALF + 0.015, 0.03),
    };
  }, [path, length]);
  useEffect(
    () => () => {
      geom.top.dispose();
      geom.frame.dispose();
      geom.railL.dispose();
    },
    [geom],
  );

  const SLATS = Math.min(120, Math.round(length / 0.3));
  const CARGO = Math.max(2, Math.round(length / 1.7 / 2) * 2);

  const cargo = useMemo(
    () =>
      Array.from({ length: CARGO }, (_, i) => {
        const bucket = i % 2 === 1;
        const pair = Math.floor(i / 2);
        return {
          bucket,
          product: bucket
            ? BUCKET_PRODUCTS[pair % BUCKET_PRODUCTS.length]
            : FRUIT_PRODUCTS[(pair * 3) % FRUIT_PRODUCTS.length],
          offset: i / CARGO,
        };
      }),
    [CARGO],
  );

  const tmp = useMemo(
    () => ({
      p: new THREE.Vector3(),
      t: new THREE.Vector3(),
      r: new THREE.Vector3(),
      m: new THREE.Matrix4(),
    }),
    [],
  );

  // place everything once so a reduced-motion visitor still sees a laden belt
  const laid = useRef(false);
  useFrame(({ clock }) => {
    if (reducedMotion && laid.current) return;
    const base = reducedMotion ? 0 : (clock.getElapsedTime() * SPEED) / length;

    const slats = slatsRef.current;
    if (slats) {
      for (let i = 0; i < SLATS; i += 1) {
        const u = (base + i / SLATS) % 1;
        path.getPointAt(u, tmp.p);
        path.getTangentAt(u, tmp.t);
        tmp.r.crossVectors(UP, tmp.t).normalize();
        tmp.m.makeBasis(tmp.r, UP, tmp.t).setPosition(tmp.p.x, tmp.p.y + 0.012, tmp.p.z);
        slats.setMatrixAt(i, tmp.m);
      }
      slats.instanceMatrix.needsUpdate = true;
    }

    const group = cargoRef.current;
    if (group) {
      group.children.forEach((item, i) => {
        const u = (base + cargo[i].offset) % 1;
        path.getPointAt(u, tmp.p);
        path.getTangentAt(u, tmp.t);
        item.position.set(tmp.p.x, tmp.p.y + 0.02, tmp.p.z);
        item.rotation.y = Math.atan2(tmp.t.x, tmp.t.z);
      });
    }
    laid.current = true;
  });

  // where the brackets hang from each wall
  const brackets: Array<[number, number, number]> = [];
  for (let x = 3.6; x > -5.0; x -= 2.6) brackets.push([x, MOUNT_Y, MART_FACE_Z + PROUD]);
  for (let z = -4.0; z < 5.0; z += 2.6) brackets.push([MART_FACE_X + PROUD, MOUNT_Y, z]);

  return (
    <group>
      <mesh geometry={geom.frame} raycast={NO_HIT}>
        <meshStandardMaterial color={FINISH.steel} {...FINISH_PBR.steel} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geom.top} raycast={NO_HIT}>
        <meshStandardMaterial color="#2c2e33" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geom.railL} raycast={NO_HIT}>
        <meshStandardMaterial color={FINISH.black} {...FINISH_PBR.black} side={THREE.DoubleSide} />
      </mesh>

      <instancedMesh
        ref={slatsRef}
        args={[undefined, undefined, SLATS]}
        frustumCulled={false}
        raycast={NO_HIT}
      >
        <boxGeometry args={[BELT_HALF * 2 - 0.02, 0.012, 0.05]} />
        <meshStandardMaterial color="#51555c" roughness={0.9} />
      </instancedMesh>

      <group ref={cargoRef}>
        {cargo.map(({ product, bucket }, i) => (
          <group key={i}>
            {bucket ? (
              <BucketProp product={product} position={[0, 0, 0]} scale={CUP_SCALE.bucket} />
            ) : (
              <FruitCupProp product={product} position={[0, 0, 0]} scale={CUP_SCALE.fruit} />
            )}
          </group>
        ))}
      </group>

      {/* hangers off the two walls */}
      {brackets.map(([bx, by, bz], i) => {
        const onBack = bz === MART_FACE_Z + PROUD;
        /*
          One slim shelf the belt sits on rather than an arm-and-drop bracket,
          in the wall's own matte tone — so the belt reads as resting on the wall
          rather than bolted off it. The shelf runs from under the belt back to a
          flush pad on the wall, with a soft diagonal brace so it still looks
          carried. Local frame: the wall is at -z; the west run is the same piece
          turned a quarter.
        */
        return (
          <group key={i} position={[bx, by, bz]} rotation={[0, onBack ? 0 : Math.PI / 2, 0]}>
            {/* the shelf, just under the belt frame */}
            <RoundedBox
              args={[0.05, 0.028, PROUD + 0.06]}
              radius={0.012}
              smoothness={2}
              position={[0, -0.1, -PROUD / 2 + 0.02]}
              castShadow
              receiveShadow
              raycast={NO_HIT}
            >
              <meshStandardMaterial color={BRACKET} roughness={0.92} metalness={0} />
            </RoundedBox>
            {/* a soft diagonal brace down to the wall */}
            <mesh position={[0, -0.24, -PROUD + 0.17]} rotation={[0.7, 0, 0]} castShadow raycast={NO_HIT}>
              <boxGeometry args={[0.026, 0.4, 0.026]} />
              <meshStandardMaterial color={BRACKET} roughness={0.92} metalness={0} />
            </mesh>
            {/* a flush pad where it meets the wall, so the join is clean */}
            <mesh position={[0, -0.18, -PROUD + 0.012]} raycast={NO_HIT}>
              <boxGeometry args={[0.1, 0.34, 0.016]} />
              <meshStandardMaterial color={BRACKET} roughness={0.94} metalness={0} />
            </mesh>
          </group>
        );
      })}

      <DischargePit position={[5.3, MOUNT_Y, MART_FACE_Z + 0.02]} rotation={0} />
      <DischargePit position={[MART_FACE_X + 0.02, MOUNT_Y, 5.6]} rotation={Math.PI / 2} />
    </group>
  );
}
