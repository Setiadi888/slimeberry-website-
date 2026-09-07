'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { getAnchorPosition } from '@/lib/anchors';
import type { EntityRef } from '@/lib/interaction';
import { viewport } from '@/lib/viewport';

const MARGIN = 14;
const GAP = 18;

/**
 * Positions a DOM card next to a live 3D object.
 *
 * Runs its own rAF loop and writes `transform` straight to the node, so a card
 * tracking a walking worker costs no React renders. Placement flips to whichever
 * side of the anchor has room, which is what keeps the card off the subject.
 */
export function AnchoredCard({
  target,
  anchorHeight,
  children,
  className = '',
}: {
  target: EntityRef;
  anchorHeight: number;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const current = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let raf = 0;
    let previous = performance.now();
    const projected = new THREE.Vector3();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - previous) / 1000, 1 / 20);
      previous = now;

      const camera = viewport.camera;
      const world = getAnchorPosition(target.kind, target.id, anchorHeight);
      if (!camera || !world || viewport.width === 0) {
        node.style.opacity = '0';
        return;
      }

      projected.copy(world).project(camera);
      // behind the camera
      if (projected.z > 1) {
        node.style.opacity = '0';
        return;
      }

      const screenX = (projected.x * 0.5 + 0.5) * viewport.width;
      const screenY = (-projected.y * 0.5 + 0.5) * viewport.height;

      const rect = node.getBoundingClientRect();
      const width = rect.width || 200;
      const height = rect.height || 120;

      // put the card on whichever side has room, so it never sits on the subject
      const preferLeft = screenX > viewport.width * 0.55;
      let x = preferLeft ? screenX - width - GAP : screenX + GAP;
      let y = screenY - height / 2;

      if (screenY < viewport.height * 0.28) y = screenY + GAP;
      else if (screenY > viewport.height * 0.72) y = screenY - height - GAP;

      x = Math.min(Math.max(x, MARGIN), Math.max(MARGIN, viewport.width - width - MARGIN));
      y = Math.min(Math.max(y, MARGIN), Math.max(MARGIN, viewport.height - height - MARGIN));

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

  // reset the spring when the subject changes so cards do not fly across screen
  useEffect(() => {
    current.current = null;
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
