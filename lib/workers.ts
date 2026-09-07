import type { WorkerAppearance } from '@/components/lab/WorkerModel';
import { STAND } from './layout';

/**
 * The three characters, described as data. Every worker interaction — hover
 * card, focus panel, reactions — reads from here, so there is no per-character
 * branching anywhere in the components.
 */
export interface WorkerStat {
  label: string;
  value: string;
}

export interface WorkerRoutePoint {
  /** Floor position, x/z. */
  at: [number, number];
  /** Facing while stood here, radians. Omit on pure travel corners. */
  facing?: number;
  /** Seconds spent here. 0 means walk straight through. */
  dwell?: number;
  /** Animation played while dwelling. */
  action?: 'work' | 'idle' | 'inspect';
  /** Carry the crate along the leg that leaves this point. */
  carryOut?: boolean;
  /** Kick the mixer when arriving here. */
  startsMachine?: boolean;
}

export interface WorkerData {
  id: string;
  name: string;
  role: string;
  emoji: string;
  personality: string;
  dialogue: string[];
  /** Short idle musings for the occasional thought bubble. */
  thoughts: string[];
  currentTask: string;
  /** Product this worker is currently handling. */
  productId: string;
  progress?: number;
  stats: WorkerStat[];
  status: string;
  appearance: WorkerAppearance;
  /**
   * A hand-authored loop. Workers follow this polyline forever, which keeps
   * their movement purposeful and — because every leg was chosen to run down an
   * open lane — stops them cutting through the furniture.
   */
  route: WorkerRoutePoint[];
}

export const WORKERS: WorkerData[] = [
  {
    id: 'juno',
    name: 'Juno',
    role: 'Slime Mixer',
    emoji: '🧪',
    personality: 'Chill, creative, curious',
    dialogue: [
      'Just getting the texture right…',
      'Almost perfect. Give it a little more mix.',
      'One more scoop of strawberry, I think.',
    ],
    thoughts: ['Should I make it fluffier?', 'More scent…?', 'Ooh, nice swirl.'],
    currentTask: 'Mixing Strawberry Cloud',
    productId: 'strawberry',
    progress: 82,
    status: 'Mixing',
    stats: [
      { label: 'Colour', value: 'Pink' },
      { label: 'Scent', value: 'Strawberry Milk' },
      { label: 'Texture', value: 'Extra fluffy' },
    ],
    appearance: { skin: '#f3c9a2', hair: '#3f3a35', cap: '#e4738f' },
    // mixing lab -> batch storage, along the open lane in front of the back wall
    // fetches from the ingredient store, then works the mixer
    route: [
      { at: [...STAND.mixer], facing: Math.PI, dwell: 5.5, action: 'work', startsMachine: true },
      { at: [...STAND.mixerLane] },
      { at: [...STAND.ingredients], facing: Math.PI, dwell: 4, action: 'inspect', carryOut: true },
      { at: [...STAND.mixerLane] },
    ],
  },
  {
    id: 'caca',
    name: 'Caca',
    role: 'Quality Control',
    emoji: '🔬',
    personality: 'Perfectionist, observant, slightly picky',
    dialogue: [
      'Hmm… the texture needs to be a little softer.',
      'Perfect. This batch passes!',
      'Let me stretch it one more time.',
    ],
    thoughts: ['Hmm…', 'Almost too soft.', 'One more stretch test.'],
    currentTask: 'Checking Strawberry Cloud',
    productId: 'strawberry',
    status: 'Approved',
    stats: [
      { label: 'Texture', value: '9.2 / 10' },
      { label: 'Stretch', value: '9.5 / 10' },
      { label: 'Status', value: 'Approved' },
    ],
    appearance: { skin: '#8d5a3b', hair: '#2c2622', cap: '#9dc47f' },
    // stationed at the QC bench, right where the belt delivers
    // stationed at the QC bench, right where the belt delivers
    route: [
      { at: [...STAND.qc], facing: Math.PI, dwell: 5.5, action: 'inspect' },
      { at: [...STAND.qcFar], facing: 0, dwell: 3.5, action: 'work' },
    ],
  },
  {
    id: 'bimo',
    name: 'Bimo',
    role: 'Packaging & Dispatch',
    emoji: '📦',
    personality: 'Energetic, friendly, slightly impatient',
    dialogue: [
      'Another one ready to go!',
      "Let's get this one shipped!",
      'Sealed, labelled, done.',
    ],
    thoughts: ['Where did that box go?', 'Tape. I need tape.', 'Twelve today!'],
    currentTask: 'Packaging Strawberry Cloud',
    productId: 'strawberry',
    status: 'Ready to ship',
    stats: [
      { label: 'Batch', value: 'SB-024' },
      { label: 'Packed', value: '18 today' },
      { label: 'Status', value: 'Ready to ship' },
    ],
    appearance: { skin: '#e8b28a', hair: '#8a5a3c', cap: '#f3d78c' },
    // fills at packaging, loads the belt, then walks the finished boxes east to
    // dispatch — the two halves of his job, at opposite ends of the line
    // works the back half of the line: filling, labelling, then out to dispatch
    route: [
      { at: [...STAND.filling], facing: 0, dwell: 3.5, action: 'work' },
      { at: [...STAND.labelling], facing: 0, dwell: 3.5, action: 'work', carryOut: true },
      // runs the lane east before turning south, so he clears the benches
      { at: [...STAND.eastTurn] },
      { at: [...STAND.eastLane] },
      { at: [...STAND.dispatch], facing: 1.9, dwell: 3.5, action: 'work' },
      { at: [...STAND.eastLane] },
      { at: [...STAND.eastTurn] },
    ],
  },
];

export function getWorker(id: string | null | undefined): WorkerData | null {
  if (!id) return null;
  return WORKERS.find((worker) => worker.id === id) ?? null;
}
