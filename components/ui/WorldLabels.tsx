'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { FACTORY_LABELS, LAB_LOG_POSITION } from '@/lib/signage';
import { useSelected } from '@/lib/interaction';
import { useTracedLabelId } from '@/lib/journey';
import { viewport } from '@/lib/viewport';

/**
 * Factory signage and the lab log, projected from world space into the DOM.
 *
 * All of it runs on ONE shared rAF loop that writes transforms directly to the
 * nodes — seven separate loops (or seven per-frame React updates) would be a
 * needless cost for what is essentially static set dressing.
 */
export function WorldLabels() {
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = useSelected();
  const tracedLabelId = useTracedLabelId();
  const [log, setLog] = useState({ mixed: 24, approved: 21, packed: 18 });

  // the numbers tick along slowly, so the board feels like a live tally
  useEffect(() => {
    const timer = setInterval(() => {
      setLog((current) => ({
        mixed: current.mixed + 1,
        approved: current.approved + (Math.random() > 0.25 ? 1 : 0),
        packed: current.packed + (Math.random() > 0.4 ? 1 : 0),
      }));
    }, 26000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const nodes = Array.from(container.children) as HTMLElement[];
    const points = [...FACTORY_LABELS.map((label) => label.position), LAB_LOG_POSITION];
    const projected = new THREE.Vector3();
    // Writing style every frame forces a recalc per node; cache and only write
    // on change, which for static signage means almost never once settled.
    const last = nodes.map(() => ({ x: 0, y: 0, visible: false }));
    let raf = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const camera = viewport.camera;
      if (!camera || viewport.width === 0) return;

      nodes.forEach((node, index) => {
        const point = points[index];
        if (!point) return;
        projected.set(point[0], point[1], point[2]).project(camera);

        const cache = last[index];

        if (projected.z > 1) {
          if (cache.visible) {
            node.style.opacity = '0';
            cache.visible = false;
          }
          return;
        }

        const x = Math.round((projected.x * 0.5 + 0.5) * viewport.width);
        const y = Math.round((-projected.y * 0.5 + 0.5) * viewport.height);
        const onScreen = x > -60 && x < viewport.width + 60 && y > -40 && y < viewport.height + 40;

        if (onScreen !== cache.visible) {
          node.style.opacity = onScreen ? '1' : '0';
          cache.visible = onScreen;
        }
        if (x !== cache.x || y !== cache.y) {
          node.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
          cache.x = x;
          cache.y = y;
        }
      });
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-10 transition-opacity duration-300 ${
        selected && !tracedLabelId ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {FACTORY_LABELS.map((label) => {
        const traced = tracedLabelId === label.id;
        return (
          <span
            key={label.id}
            className={`absolute left-0 top-0 whitespace-nowrap rounded-full px-2 py-[3px] text-[9px] uppercase tracking-[0.14em] opacity-0 shadow-[0_1px_6px_rgba(80,60,40,0.08)] backdrop-blur-[2px] transition-colors duration-300 ${
              traced ? 'bg-[#3f4756] text-white' : 'bg-white/55 text-[#7b8290]'
            } ${tracedLabelId && !traced ? 'opacity-40' : ''}`}
          >
            {label.text}
          </span>
        );
      })}

      <span className="absolute left-0 top-0 block rounded-lg bg-white/72 px-2.5 py-1.5 text-left opacity-0 shadow-[0_2px_10px_rgba(80,60,40,0.1)] backdrop-blur-[2px]">
        <span className="block text-[8.5px] uppercase tracking-[0.14em] text-[#9aa0ad]">
          Today&apos;s lab log
        </span>
        <span className="mt-0.5 block text-[10px] leading-snug text-[#5a6172]">
          🧪 {log.mixed} batches mixed
          <br />
          🔬 {log.approved} approved
          <br />
          📦 {log.packed} orders packed
        </span>
      </span>
    </div>
  );
}
