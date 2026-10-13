'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { getAnchor, getAnchorPosition } from '@/lib/anchors';
import type { EntityRef } from '@/lib/interaction';
import { viewport } from '@/lib/viewport';

const MARGIN = 14;
/** Clear of the header's buttons, which a card must never sit on top of. */
const TOP_MARGIN = 72;
const GAP = 16;
/**
 * How often the subject is re-measured. Things change shape while a card is
 * open — a worker swings their arms, a picked cup lifts and squashes — but not
 * so fast that it needs doing every frame.
 */
const REMEASURE_MS = 300;

type Side = 'right' | 'left' | 'above' | 'below';

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const meshBounds = new THREE.Box3();
const corner = new THREE.Vector3();
const toLocal = new THREE.Matrix4();

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const cornerOf = (box: THREE.Box3, index: number, into: THREE.Vector3) =>
  into.set(
    index & 1 ? box.max.x : box.min.x,
    index & 2 ? box.max.y : box.min.y,
    index & 4 ? box.max.z : box.min.z,
  );

/**
 * The subject's outline, in the subject's own space.
 *
 * Every visible mesh under it counts, except the selection ring: that lies flat
 * on the floor far wider than the thing it marks, and counting it would push the
 * card a metre off anything that has one. Invisible hit volumes are skipped for
 * the same reason. The outline is measured in world space and carried back into
 * the object's own frame, so between measurements it simply rides along with
 * the object — a card beside a walking worker stays beside them.
 */
function measure(object: THREE.Object3D, into: THREE.Box3): void {
  object.updateWorldMatrix(true, true);
  const world = new THREE.Box3();
  object.traverseVisible((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || mesh.geometry?.type === 'RingGeometry') return;
    meshBounds.makeEmpty().expandByObject(mesh);
    world.union(meshBounds);
  });

  into.makeEmpty();
  if (world.isEmpty()) return;
  toLocal.copy(object.matrixWorld).invert();
  for (let index = 0; index < 8; index += 1) {
    into.expandByPoint(cornerOf(world, index, corner).applyMatrix4(toLocal));
  }
}

/** The outline's footprint on screen, in CSS pixels. False if it is all behind the camera. */
function project(
  object: THREE.Object3D,
  local: THREE.Box3,
  camera: THREE.Camera,
  width: number,
  height: number,
  into: Rect,
): boolean {
  let seen = false;
  into.left = Infinity;
  into.top = Infinity;
  into.right = -Infinity;
  into.bottom = -Infinity;
  for (let index = 0; index < 8; index += 1) {
    cornerOf(local, index, corner).applyMatrix4(object.matrixWorld).project(camera);
    if (corner.z > 1 || corner.z < -1) continue;
    seen = true;
    const x = (corner.x * 0.5 + 0.5) * width;
    const y = (-corner.y * 0.5 + 0.5) * height;
    into.left = Math.min(into.left, x);
    into.right = Math.max(into.right, x);
    into.top = Math.min(into.top, y);
    into.bottom = Math.max(into.bottom, y);
  }
  return seen;
}

/**
 * Where a card of this size goes so that it does not cover the subject.
 *
 * Beside it if either side has the room — the wider side first, so the card
 * stays level with what it describes — otherwise above or below it, otherwise
 * whichever side comes closest to fitting. Once a side is chosen it is kept for
 * as long as it still fits, so a card does not flick from side to side while
 * the camera eases in or a worker walks.
 */
function placeBeside(
  subject: Rect,
  cardWidth: number,
  cardHeight: number,
  width: number,
  height: number,
  remembered: { current: Side | null },
): { x: number; y: number } {
  const box = {
    left: clamp(subject.left, 0, width),
    right: clamp(subject.right, 0, width),
    top: clamp(subject.top, 0, height),
    bottom: clamp(subject.bottom, 0, height),
  };
  const room: Record<Side, number> = {
    right: width - MARGIN - box.right - GAP,
    left: box.left - GAP - MARGIN,
    above: box.top - GAP - TOP_MARGIN,
    below: height - MARGIN - box.bottom - GAP,
  };
  const need = (side: Side) => (side === 'right' || side === 'left' ? cardWidth : cardHeight);
  const fits = (side: Side) => room[side] >= need(side);

  let side = remembered.current && fits(remembered.current) ? remembered.current : null;
  if (!side) {
    const byRoom = (a: Side, b: Side) => room[b] - room[a];
    const beside = (['right', 'left'] as Side[]).filter(fits).sort(byRoom);
    const stacked = (['above', 'below'] as Side[]).filter(fits).sort(byRoom);
    side =
      beside[0] ??
      stacked[0] ??
      (['right', 'left', 'above', 'below'] as Side[]).reduce((best, next) =>
        room[next] / need(next) > room[best] / need(best) ? next : best,
      );
  }
  remembered.current = side;

  const middleX = (box.left + box.right) / 2;
  const middleY = (box.top + box.bottom) / 2;
  let x: number;
  let y: number;
  switch (side) {
    case 'right':
      x = box.right + GAP;
      y = middleY - cardHeight / 2;
      break;
    case 'left':
      x = box.left - GAP - cardWidth;
      y = middleY - cardHeight / 2;
      break;
    case 'above':
      x = middleX - cardWidth / 2;
      y = box.top - GAP - cardHeight;
      break;
    default:
      x = middleX - cardWidth / 2;
      y = box.bottom + GAP;
  }

  return {
    x: clamp(x, MARGIN, Math.max(MARGIN, width - cardWidth - MARGIN)),
    y: clamp(y, TOP_MARGIN, Math.max(TOP_MARGIN, height - cardHeight - MARGIN)),
  };
}

/**
 * Positions a DOM card next to a live 3D object — beside it, never on it.
 *
 * It used to aim at a single point floating above the object and put the card
 * to one side of that point, which knew nothing about how big the object was:
 * anything wide, like the fish tank, ended up underneath its own card. It now
 * measures the object's actual outline, projects it to the screen every frame,
 * and places the card in the clear space around that outline.
 *
 * Runs its own rAF loop and writes `transform` straight to the node, so a card
 * tracking a walking worker costs no React renders.
 */
export function AnchoredCard({
  target,
  anchorHeight,
  children,
  className = '',
}: {
  target: EntityRef;
  /** Used only if the subject has no measurable outline. */
  anchorHeight: number;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const current = useRef<{ x: number; y: number } | null>(null);
  const side = useRef<Side | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let raf = 0;
    let previous = performance.now();
    let measuredAt = -Infinity;
    let measured: THREE.Object3D | null = null;
    const outline = new THREE.Box3();
    const subject: Rect = { left: 0, top: 0, right: 0, bottom: 0 };
    const point = new THREE.Vector3();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - previous) / 1000, 1 / 20);
      previous = now;

      const camera = viewport.camera;
      const object = getAnchor(target.kind, target.id);
      if (!camera || !object || viewport.width === 0) {
        node.style.opacity = '0';
        return;
      }

      if (object !== measured || now - measuredAt > REMEASURE_MS) {
        measure(object, outline);
        measured = object;
        measuredAt = now;
      }

      const outlined =
        !outline.isEmpty() && project(object, outline, camera, viewport.width, viewport.height, subject);
      if (!outlined) {
        // nothing to measure: fall back to the one point above the object
        const world = getAnchorPosition(target.kind, target.id, anchorHeight);
        if (!world) {
          node.style.opacity = '0';
          return;
        }
        point.copy(world).project(camera);
        if (point.z > 1) {
          node.style.opacity = '0';
          return;
        }
        subject.left = subject.right = (point.x * 0.5 + 0.5) * viewport.width;
        subject.top = subject.bottom = (-point.y * 0.5 + 0.5) * viewport.height;
      }

      const rect = node.getBoundingClientRect();
      const { x, y } = placeBeside(
        subject,
        rect.width || 200,
        rect.height || 120,
        viewport.width,
        viewport.height,
        side,
      );

      if (!current.current) {
        current.current = { x, y };
      } else {
        // spring-ish smoothing; snappy enough to keep up with a walking worker
        const k = 1 - Math.exp(-16 * dt);
        current.current.x += (x - current.current.x) * k;
        current.current.y += (y - current.current.y) * k;
      }

      node.style.opacity = '1';
      node.style.transform = `translate3d(${Math.round(current.current.x)}px, ${Math.round(current.current.y)}px, 0)`;
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target.kind, target.id, anchorHeight]);

  // a new subject starts fresh, so cards neither fly across the screen nor
  // inherit the last subject's side
  useEffect(() => {
    current.current = null;
    side.current = null;
  }, [target.kind, target.id]);

  return (
    <div
      ref={ref}
      className={`pointer-events-none fixed left-0 top-0 z-30 opacity-0 transition-opacity duration-200 ${className}`}
    >
      {children}
    </div>
  );
}
