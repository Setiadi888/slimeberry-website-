'use client';

import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { HOME_FOV, HOME_POSITION } from '@/lib/cameraFraming';
import { useQuality } from '@/lib/quality';
import { dismissHint, hoverEntity, selectEntity, setView } from '@/lib/interaction';
import { QualityProvider } from './QualityContext';
import { LabScene } from './LabScene';

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl')),
    );
  } catch {
    return false;
  }
}

function Fallback({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#f6efe6] px-6 text-center">
      <div className="max-w-sm">
        <p className="font-display text-2xl text-[#3f4756]">The lab is closed</p>
        <p className="mt-2 text-sm text-[#6a7080]">{message}</p>
      </div>
    </div>
  );
}

export function LabCanvas() {
  const quality = useQuality();
  const [support, setSupport] = useState<'checking' | 'ok' | 'missing'>('checking');
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    setSupport(detectWebGL() ? 'ok' : 'missing');
  }, []);

  if (support === 'missing') {
    return <Fallback message="This browser can't run WebGL, so the 3D laboratory can't be shown here. Try a current version of Chrome, Safari, Firefox or Edge." />;
  }

  if (contextLost) {
    return <Fallback message="The graphics context was lost — usually another tab took the GPU. Reload the page to reopen the lab." />;
  }

  if (support === 'checking') return null;

  return (
    <Canvas
      shadows={quality.shadows}
      dpr={quality.dpr}
      camera={{
        position: [HOME_POSITION.x, HOME_POSITION.y, HOME_POSITION.z],
        fov: HOME_FOV,
        near: 0.5,
        far: 60,
      }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.02;
        scene.background = new THREE.Color('#f2e9de');
        gl.domElement.addEventListener('webglcontextlost', (event) => {
          event.preventDefault();
          setContextLost(true);
        });
      }}
      onPointerMissed={() => {
        // clicking the empty floor returns the visitor to the full view
        selectEntity(null);
        hoverEntity(null);
        setView(null);
        dismissHint();
      }}
    >
      <QualityProvider value={quality}>
        <fog attach="fog" args={['#f2e9de', 22, 44]} />
        <Suspense fallback={null}>
          <LabScene />
        </Suspense>
      </QualityProvider>
    </Canvas>
  );
}
