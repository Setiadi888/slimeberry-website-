/**
 * The rig contract between worker behaviour and worker visuals.
 *
 * `Worker` mutates this object every frame; `WorkerModel` reads it and applies
 * transforms. It is deliberately a plain mutable object rather than React state
 * so driving the animation never triggers a re-render — and so a future
 * GLB-backed model can implement the same contract by mapping these fields onto
 * an AnimationMixer instead of onto primitive meshes.
 */
export interface WorkerPose {
  /** Walk cycle, radians. */
  phase: number;
  /** 0 = planted, 1 = full stride. Eased, so stops and starts are smooth. */
  locomotion: number;
  /** 0..1 arm-pumping while operating a machine. */
  work: number;
  /** 0..1 leaning in to examine something. */
  inspect: number;
  /** 0..1 raised waving arm. */
  wave: number;
  /** 0..1 attending to the visitor — head up, body still. */
  attention: number;
  /** 0..1 raising a coffee cup — the break-time reaction. */
  sip: number;
  /** Holding a crate in both hands. */
  carrying: boolean;
  /** Vertical bob applied to the whole body. */
  bob: number;
}

export function createWorkerPose(): WorkerPose {
  return {
    phase: 0,
    locomotion: 0,
    work: 0,
    inspect: 0,
    wave: 0,
    attention: 0,
    sip: 0,
    carrying: false,
    bob: 0,
  };
}
