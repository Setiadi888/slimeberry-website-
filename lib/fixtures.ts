/** Non-character equipment, described as data so the cards need no branching. */
export interface TankFixture {
  id: string;
  productId: string;
  stage: string;
  progress: number;
}

export interface MachineFixture {
  id: string;
  name: string;
  stage: number;
  stages: number;
  /** Who is operating it — resolved against the worker list. */
  workerId: string;
  productId: string;
}

export const TANKS: TankFixture[] = [
  { id: 'tank-strawberry', productId: 'strawberry', stage: 'Mixing', progress: 82 },
  { id: 'tank-matcha', productId: 'matcha', stage: 'Curing', progress: 41 },
];

export const MACHINES: MachineFixture[] = [
  { id: 'mixer', name: 'Mixing Station', stage: 3, stages: 5, workerId: 'juno', productId: 'strawberry' },
];

export const getTank = (id: string) => TANKS.find((tank) => tank.id === id) ?? null;
export const getMachine = (id: string) => MACHINES.find((machine) => machine.id === id) ?? null;

/** The stations a visitor can click to understand the line. */
export interface StationFixture {
  id: string;
  name: string;
  step: string;
  blurb: string;
  stats: Array<{ label: string; value: string }>;
  productId?: string;
  accent: string;
  /** Height above the station's anchor for its floating card. */
  anchorHeight: number;
}

export const STATIONS: StationFixture[] = [
  {
    id: 'packaging',
    name: 'Packaging',
    step: 'Step 07 of 07',
    blurb: 'Labelled jars run into the housing at the end of the belt, are boxed, and go straight out to dispatch.',
    stats: [
      { label: 'Jar size', value: '150 ml' },
      { label: 'Filled today', value: '46' },
      { label: 'Operator', value: 'Bimo' },
    ],
    productId: 'strawberry',
    accent: '#d94f75',
    anchorHeight: 2.2,
  },
  {
    id: 'conveyor',
    name: 'Transfer Line',
    step: 'Step 04 of 07',
    blurb:
      'Jars push out through the discharge hood in the west wall and ride the belt the length of the floor, through quality control, filling and labelling.',
    stats: [
      { label: 'Travel', value: '43 s end to end' },
      { label: 'On the belt', value: '10 jars' },
    ],
    accent: '#6c70a8',
    anchorHeight: 1.5,
  },
  {
    id: 'qc',
    name: 'Quality Control',
    step: 'Step 04 of 07',
    blurb: 'Every batch passes the scanner arch. Caca checks texture and stretch by hand before it is filled.',
    stats: [
      { label: 'Checked today', value: '21' },
      { label: 'Rejected', value: '2' },
      { label: 'Inspector', value: 'Caca' },
    ],
    productId: 'strawberry',
    accent: '#5aa84c',
    anchorHeight: 2.1,
  },
  {
    id: 'dispatch',
    name: 'Dispatch',
    step: 'Ready to ship',
    blurb: 'Boxed orders come straight off packaging and stack here, waiting for the afternoon courier.',
    stats: [
      { label: 'Packed today', value: '18' },
      { label: 'Next pickup', value: '16:30' },
    ],
    accent: '#c98f3a',
    anchorHeight: 1.6,
  },
];

STATIONS.push(
  {
    id: 'greenhouse',
    name: 'Greenhouse',
    step: 'Step 01 of 07',
    blurb: 'Mint, basil, strawberry, blueberry and chamomile, grown on site and picked the morning they are used.',
    stats: [
      { label: 'Beds', value: '5' },
      { label: 'Picked today', value: '3.1 kg' },
    ],
    accent: '#6ea45a',
    anchorHeight: 2.7,
  },
  {
    id: 'gachapon',
    name: 'Slimeberry Gachapon',
    step: 'Rewards',
    blurb:
      'Every order earns one SB COIN. Feed it in, turn the handle, and the machine drops you a capsule with something small and strange inside.',
    stats: [
      { label: 'Cost', value: '1 SB COIN' },
      { label: 'Capsules loaded', value: '212' },
      { label: 'Rarest pull', value: 'Golden Slimeberry' },
    ],
    accent: '#e4738f',
    anchorHeight: 3.3,
  },
  {
    id: 'texture',
    name: 'Texture Lab',
    step: 'Step 03 of 07',
    blurb: 'A press checks stretch and rebound. Too stiff goes back to the mixer; too loose is held to cure.',
    stats: [
      { label: 'Target stretch', value: '9.0+' },
      { label: 'Rebound', value: '0.8 s' },
    ],
    productId: 'strawberry',
    accent: '#5aa84c',
    anchorHeight: 2.1,
  },
  {
    id: 'filling',
    name: 'Filling',
    step: 'Step 05 of 07',
    blurb: 'Approved slime is dosed into jars, 150 ml at a time, straight off the belt.',
    stats: [
      { label: 'Jar size', value: '150 ml' },
      { label: 'Filled today', value: '128' },
    ],
    productId: 'strawberry',
    accent: '#d94f75',
    anchorHeight: 2.1,
  },
  {
    id: 'labelling',
    name: 'Labelling',
    step: 'Step 06 of 07',
    blurb: 'Each jar gets its batch label as it passes — the same number printed on the lid you receive.',
    stats: [
      { label: 'Roll', value: 'Batch SB-024' },
      { label: 'Applied today', value: '124' },
    ],
    productId: 'strawberry',
    accent: '#c98f3a',
    anchorHeight: 2.1,
  },
);

/**
 * SB Mart, plus the two doorways that join it to the Lab. They share the
 * station shape so the hover card and detail panel need no new branch — a
 * doorway is just a station whose blurb tells you where it goes.
 */
STATIONS.push(
  {
    id: 'martdoor',
    name: 'SB Mart',
    step: 'Through the door',
    blurb: 'The little shop behind the factory wall. Same jars, colder, with someone at the till.',
    stats: [
      { label: 'Open', value: 'Every day' },
      { label: 'Cashier', value: 'Dilan' },
    ],
    accent: '#4e9fbe',
    anchorHeight: 2.9,
  },
  {
    id: 'labdoor',
    name: 'Slimeberry Lab',
    step: 'Back through the door',
    blurb: 'Back out onto the factory floor — the line, the greenhouse and the Gachapon.',
    stats: [{ label: 'Leads to', value: 'The factory' }],
    accent: '#e4738f',
    anchorHeight: 2.9,
  },
  {
    id: 'vinyl',
    name: 'The Record Cabinet',
    step: 'SB Mart',
    blurb:
      'Dilan built the shelves himself. Tap the turntable and the shop stereo comes on — tap it again and the room goes quiet.',
    stats: [
      { label: 'Speaker', value: 'Built in' },
      { label: 'Now playing', value: 'Side A' },
    ],
    accent: '#c98f3a',
    anchorHeight: 2.8,
  },
  {
    id: 'martshelf',
    name: 'Signature Wall',
    step: 'SB Mart',
    blurb: 'The four full-size jars, faced up and rotated so the freshest batch is always at the front.',
    stats: [
      { label: 'Lines', value: '4' },
      { label: 'Size', value: '150 ml' },
    ],
    productId: 'strawberry',
    accent: '#d94f75',
    anchorHeight: 2.5,
  },
  {
    id: 'checkout',
    name: 'Checkout',
    step: 'SB Mart',
    blurb: "Dilan's counter. The register is older than the factory and he refuses to replace it.",
    stats: [
      { label: 'Cashier', value: 'Dilan' },
      { label: 'Register', value: 'SB-MART-01' },
    ],
    accent: '#c98f3a',
    anchorHeight: 1.9,
  },
);

export const getStation = (id: string) => STATIONS.find((station) => station.id === id) ?? null;
