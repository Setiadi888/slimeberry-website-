# Slimeberry Lab

An interactive miniature slime factory, built so the 3D scene *is* the
storefront rather than decoration wrapped around one. Visitors watch the
production line run, discover products at the stations where they are made,
and add them to a real cart.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![Three.js](https://img.shields.io/badge/three.js-r185-white)

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## The factory

A single production line, laid out in physical order so the flow reads without
labels:

```
greenhouse → ingredients → mixing → colour lab → texture lab
  → conveyor → QC → filling → labelling → packaging → finished goods → dispatch
```

One continuous belt carries product through QC, filling and labelling. Jars are
spawned and retired *inside solid housings* (the packaging chute and the QC
bench), so a jar is never seen appearing or vanishing in the open.

Three characters — **Juno** (mixing), **Caca** (quality control) and **Bimo**
(packaging and dispatch) — walk hand-authored routes with ambient reactions:
waving at the camera, coffee breaks, passing thoughts.

## Commerce

Products are data-driven (`lib/products.ts`) and discoverable throughout the
factory rather than in one display area. Clicking one focuses the camera and
opens a panel anchored to the object; adding to cart flies the jar across the
room onto the dispatch pallet. The cart, quantity controls and order hand-off
work independently of the animation, so purchasing still functions if the 3D
layer is reduced or unavailable.

## Architecture notes

| Concern | Where |
| --- | --- |
| Floor plan | `lib/layout.ts` — geometry, worker routes, camera presets and signage all read from it, so they cannot drift apart |
| Interaction | `lib/interaction.ts` + `lib/anchors.ts` — one hover/select store, plus a live `Object3D` registry the floating cards project from |
| State across the canvas | `lib/store.ts` — a `useSyncExternalStore` store, because React context does not cross the R3F `<Canvas>` boundary |
| Worker animation | `lib/workerPose.ts` — a mutable pose object driven per frame, so animation triggers no re-renders and a rigged GLB can later implement the same contract |

Floating cards write `transform` directly from their own `requestAnimationFrame`
loop; scene objects subscribe to hover state through boolean selectors, so
moving the pointer across the factory re-renders only what changed.

## Performance

Two measured decisions worth knowing about:

- **Transmission is off.** It forced three.js to render the whole scene an extra
  time each frame to fill the transmission buffer — 812 → 547 draw calls,
  47 → 60 fps. The jars still read as glass from clearcoat, sheen and alpha.
- **Resolution scales with viewport area.** A large window at dpr 1.75 asks for
  ~4.9M pixels and becomes fill-rate bound; the cap drops on bigger viewports to
  keep the shaded pixel count roughly flat.

Reduced-motion preferences are respected throughout.

## Assets

The 3D content is procedural — no external models are loaded. `public/models/`
documents where authored GLB/GLTF assets slot in, and which contracts each
placeholder must keep so picking, camera focus and the cart keep working.

## Status

A working prototype. Known gaps: touch interaction has not been verified on a
real device, and there is no payment step — "Place order" plays the hand-off
sequence and clears the basket.
