# Models

Drop authored GLB/GLTF assets here. The prototype ships with procedural
stand-ins so nothing blocks on art, and each stand-in has a defined seam for
replacement:

| Placeholder | Replace with | Contract to keep |
| --- | --- | --- |
| `components/lab/Product.tsx` | `strawberry.glb`, `matcha.glb`, `blueberry.glb`, `peach.glb` (paths already in `lib/products.ts`) | keep the outer `<group>`, the pointer handlers and the `registerFocusTarget` call so camera focus and picking keep working |
| `components/lab/WorkerModel.tsx` | a rigged character GLB | accept the same `pose: WorkerPose` object and map its fields onto an `AnimationMixer`; `Worker.tsx` needs no changes |
| `components/lab/SlimeMachine.tsx` | `machine.glb` | keep the `machine:start` event subscription driving the mixer speed |

Load with `useGLTF` from `@react-three/drei` and preload via `useGLTF.preload()`.
Every model already sits behind the `<Suspense>` boundary in `LabCanvas.tsx`.
