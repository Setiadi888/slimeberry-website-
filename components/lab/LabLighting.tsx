'use client';

import { Environment as EnvironmentMap, Lightformer } from '@react-three/drei';

interface LabLightingProps {
  shadows: boolean;
  shadowMapSize: number;
}

/**
 * Soft studio lighting for a display-case look: one warm key with shadows, a
 * cool fill, and a baked environment built from Lightformers.
 *
 * The environment is assembled from meshes rather than an HDRI so the scene has
 * no external asset to fetch, and `frames={1}` bakes it once — the lighting
 * never changes, so there is nothing to recompute per frame.
 */
export function LabLighting({ shadows, shadowMapSize }: LabLightingProps) {
  return (
    <>
      <hemisphereLight args={['#fff6ea', '#c9bfae', 0.55]} />
      <ambientLight intensity={0.35} color="#fff4e8" />

      <directionalLight
        position={[6.5, 9, 5.5]}
        intensity={1.55}
        color="#fff1dd"
        castShadow={shadows}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
        shadow-bias={-0.0012}
        shadow-normalBias={0.02}
      />

      {/* Cool bounce from the open side of the diorama. */}
      <directionalLight position={[-7, 4.5, 6]} intensity={0.4} color="#dce8f5" />
      <pointLight position={[-2.2, 3.2, -2.2]} intensity={12} distance={9} decay={2} color="#ffe6c4" />
      <pointLight position={[2.4, 2.6, -2.8]} intensity={9} distance={8} decay={2} color="#d6f0ff" />

      <EnvironmentMap resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.4} color="#fffaf2" position={[0, 6, 3]} scale={[9, 5, 1]} rotation={[-Math.PI / 2.4, 0, 0]} />
        <Lightformer form="rect" intensity={1.1} color="#e8f2ff" position={[-6, 3, 2]} scale={[5, 5, 1]} rotation={[0, Math.PI / 2.5, 0]} />
        <Lightformer form="rect" intensity={0.9} color="#ffeede" position={[6, 3, 1]} scale={[5, 5, 1]} rotation={[0, -Math.PI / 2.5, 0]} />
        <Lightformer form="circle" intensity={1.6} color="#ffffff" position={[1.5, 5, -3]} scale={3} />
      </EnvironmentMap>
    </>
  );
}
