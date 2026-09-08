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
  /** Take hold of the shopping trolley here and push it onward. */
  pushOut?: boolean;
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
    thoughts: [
      'Another minute in the mixer.',
      'Too much strawberry in this one?',
      'That fold came out right.',
      'The mint is strong this morning.',
      'Needs one more scoop.',
    ],
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
    // With the ingredient store gone she picks from the greenhouse instead, then
    // carries the tray back along the open lane to the mixer beside it.
    route: [
      { at: [...STAND.mixer], facing: Math.PI, dwell: 5.5, action: 'work', startsMachine: true },
      { at: [...STAND.mixerLane] },
      { at: [...STAND.greenhouse], facing: Math.PI, dwell: 4, action: 'inspect', carryOut: true },
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
    thoughts: [
      'One more stretch test.',
      'Two tenths under target.',
      'This batch passes.',
      'Bubbles right through it.',
      'Softer than yesterday.',
    ],
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
    thoughts: [
      'Where did the tape go?',
      'Twelve boxes before four.',
      'This label is crooked.',
      'Courier comes at half four.',
      'Need more flat-packs.',
    ],
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

/**
 * SB Mart's cashier. He is described with the same record as the factory
 * characters so the hover card and detail panel need no special case, but he is
 * deliberately not in `WORKERS` — that list is what the Lab renders and walks,
 * and Dilan never leaves his counter.
 */
export const DILAN: WorkerData = {
  id: 'dilan',
  name: 'Dilan',
  role: 'SB Mart Cashier',
  emoji: '🧃',
  personality: 'Warm, unhurried, quietly funny',
  dialogue: [
    'Welcome to SB Mart — everything on the wall is fresh from the lab.',
    'Take a basket. The minis are cheaper in threes, but I never say that out loud.',
    'If you want the tub, I keep the good ones behind the counter.',
  ],
  thoughts: [
    'The front shelf needs facing.',
    'Is that the last mango tub?',
    'Float is short again.',
    'Who left the trolley there?',
    'Quiet shift today.',
    'That record is due a flip.',
  ],
  currentTask: 'Minding the register',
  productId: 'mango',
  status: 'On shift',
  stats: [
    { label: 'Shift', value: '09:00 – 18:00' },
    { label: 'Serves', value: 'Cold minis' },
    { label: 'Register', value: 'SB-MART-01' },
  ],
  appearance: { skin: '#c58a5f', hair: '#2c2622', cap: '#8ed0e8' },
  /*
   * He minds the till, but a shopkeeper alone in a shop does not stand still —
   * most of this loop is out on the floor facing up shelves, checking the
   * record and looking at the trolley somebody abandoned. Every leg was walked
   * against the fixtures' footprints with the 0.28 worker radius.
   */
  route: [
    { at: [3.6, -3.0], facing: 0, dwell: 5, action: 'work' },
    { at: [2.1, -3.15] },
    { at: [1.0, -2.9], facing: Math.PI, dwell: 4, action: 'inspect' },
    { at: [-0.6, -1.8] },
    { at: [-2.6, -0.4], facing: 0.4, dwell: 3.5, action: 'idle' },
    { at: [-1.2, 1.3] },
    { at: [1.2, 2.2] },
    // takes the trolley and walks it round the floor before putting it back
    { at: [2.2, 2.5], facing: 1.5, dwell: 2.5, action: 'work', pushOut: true },
    { at: [0.4, 1.5], pushOut: true },
    { at: [-0.8, 0.2], facing: 2.4, dwell: 2, action: 'idle', pushOut: true },
    { at: [0.8, 1.8], pushOut: true },
    { at: [2.3, 2.4], facing: 1.5, dwell: 2, action: 'work' },
    { at: [2.1, 0.5] },
    { at: [2.1, -3.15] },
  ],
};

const EVERYONE = [...WORKERS, DILAN];

export function getWorker(id: string | null | undefined): WorkerData | null {
  if (!id) return null;
  return EVERYONE.find((worker) => worker.id === id) ?? null;
}
