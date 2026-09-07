'use client';

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import gsap from 'gsap';
import { BASE_DISTANCE, CAMERA_PRESETS, HOME_POSITION, HOME_TARGET, solveFraming } from '@/lib/cameraFraming';
import { useSelected, useView, type EntityKind } from '@/lib/interaction';
import { getAnchorPosition } from '@/lib/anchors';
import { useLabQuality } from './QualityContext';

const FOCUS_HEIGHT: Record<EntityKind, number> = {
  worker: 0.75,
  product: 0.35,
  tank: 1.1,
  machine: 1.5,
  station: 1.1,
};

const FOCUS_DISTANCE: Record<EntityKind, number> = {
  worker: 3.1,
  product: 3.4,
  tank: 4.6,
  machine: 5.6,
  station: 5.2,
};

/**
 * Diorama camera.
 *
 * `maxDistance` must stay above the home distance (~29 for the expanded
 * factory) — OrbitControls clamps on its own update, so a lower cap silently
 * pulls the camera back in after GSAP has placed it. Orbit is deliberately fenced in — a narrow azimuth and polar
 * range keeps the scene readable as a display case and stops the visitor ending
 * up under the floor or behind the walls.
 *
 * GSAP owns the focus transitions; OrbitControls is disabled for their duration
 * so damping and the tween cannot fight over the same camera.
 */
export function LabCamera() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const selected = useSelected();
  const view = useView();
  const { isCoarsePointer, reducedMotion } = useLabQuality();

  const aspect = size.width / Math.max(size.height, 1);
  const { distance: homeDistance, targetShiftX } = solveFraming(aspect);
  // Narrow viewports need presets pushed back a little, but not by the full
  // home factor — presets are meant to be close-ups, and the home scale (up to
  // 2.2x on a phone) would flatten them back into another wide shot.
  const framingBoost = Math.min(homeDistance / BASE_DISTANCE, 1.35);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Different subjects want different framing: a character reads best close
    // and low, a machine needs room to show its whole silhouette.
    const focus = selected
      ? getAnchorPosition(selected.kind, selected.id, FOCUS_HEIGHT[selected.kind])
      : null;
    const focusPoint = focus ? focus.clone() : null;

    const nextPosition = new THREE.Vector3();
    const nextTarget = new THREE.Vector3();

    const homeDirection = HOME_POSITION.clone().sub(HOME_TARGET).normalize();

    const preset = !selected && view ? CAMERA_PRESETS[view] : null;

    if (preset) {
      // A named vantage point: same viewing direction, just closer and aimed
      // at that corner of the factory.
      nextTarget.copy(preset.target);
      nextPosition.copy(preset.target).addScaledVector(homeDirection, preset.distance * framingBoost);
    } else if (focusPoint && selected) {
      // Close in along the home viewing direction so the move reads as a dolly
      // rather than a cut to an unrelated angle.
      const closeUp = FOCUS_DISTANCE[selected.kind] + homeDistance * 0.1;
      nextPosition.copy(focusPoint).addScaledVector(homeDirection, closeUp).add(new THREE.Vector3(0, 0.4, 0));
      nextTarget.copy(focusPoint);
    } else {
      // Scale about the target, not the world origin, so pulling back for a
      // narrow viewport changes the distance without swinging the angle.
      nextTarget.copy(HOME_TARGET).add(new THREE.Vector3(targetShiftX, 0, 0));
      nextPosition.copy(nextTarget).addScaledVector(homeDirection, homeDistance);
    }

    if (reducedMotion) {
      camera.position.copy(nextPosition);
      controls.target.copy(nextTarget);
      controls.update();
      return;
    }

    controls.enabled = false;
    const timeline = gsap.timeline({
      defaults: { duration: 1.15, ease: 'power3.inOut', overwrite: 'auto' },
      onComplete: () => {
        controls.enabled = true;
      },
    });

    timeline.to(camera.position, { x: nextPosition.x, y: nextPosition.y, z: nextPosition.z }, 0);
    timeline.to(
      controls.target,
      { x: nextTarget.x, y: nextTarget.y, z: nextTarget.z, onUpdate: () => controls.update() },
      0,
    );

    return () => {
      timeline.kill();
      controls.enabled = true;
    };
  }, [selected, view, camera, homeDistance, targetShiftX, framingBoost, reducedMotion]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      // Panning on touch competes with page scroll and with tapping products.
      enablePan={!isCoarsePointer}
      panSpeed={0.5}
      rotateSpeed={0.42}
      zoomSpeed={0.6}
      minDistance={7.5}
      maxDistance={36}
      minPolarAngle={0.55}
      maxPolarAngle={1.42}
      minAzimuthAngle={0.16}
      maxAzimuthAngle={1.24}
      target={HOME_TARGET}
    />
  );
}
