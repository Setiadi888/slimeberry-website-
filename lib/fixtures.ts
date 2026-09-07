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
    step: 'Step 09 of 09',
    blurb: 'Labelled jars are boxed at the end of the line and stacked for the finished-goods shelf.',
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
    step: 'Step 06 of 09',
    blurb: 'Mixed slime rides the belt through quality control, filling and labelling.',
    stats: [
      { label: 'Travel', value: '34 s end to end' },
      { label: 'On the belt', value: '8 jars' },
    ],
    accent: '#6c70a8',
    anchorHeight: 1.5,
  },
  {
    id: 'qc',
    name: 'Quality Control',
    step: 'Step 06 of 09',
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
    blurb: 'Approved jars are boxed and stacked here, waiting for the afternoon courier.',
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
    step: 'Step 01 of 09',
    blurb: 'Mint, basil, strawberry, blueberry and chamomile, grown on site and picked the morning they are used.',
    stats: [
      { label: 'Beds', value: '5' },
      { label: 'Picked today', value: '3.1 kg' },
    ],
    accent: '#6ea45a',
    anchorHeight: 2.7,
  },
  {
    id: 'ingredients',
    name: 'Ingredient Store',
    step: 'Step 02 of 09',
    blurb: 'Bases, pigments and essences held at temperature until a batch calls for them.',
    stats: [
      { label: 'Tanks', value: '6' },
      { label: 'Batches held', value: '12' },
    ],
    accent: '#4e9fbe',
    anchorHeight: 2.4,
  },
  {
    id: 'colour',
    name: 'Colour Lab',
    step: 'Step 04 of 09',
    blurb: 'Pigments are matched by eye against the swatch board before a batch is tinted.',
    stats: [
      { label: 'Pigments', value: '6' },
      { label: 'Matched today', value: '9' },
    ],
    productId: 'strawberry',
    accent: '#7f6dc0',
    anchorHeight: 2.2,
  },
  {
    id: 'texture',
    name: 'Texture Lab',
    step: 'Step 05 of 09',
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
    step: 'Step 07 of 09',
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
    step: 'Step 08 of 09',
    blurb: 'Each jar gets its batch label as it passes — the same number printed on the lid you receive.',
    stats: [
      { label: 'Roll', value: 'Batch SB-024' },
      { label: 'Applied today', value: '124' },
    ],
    productId: 'strawberry',
    accent: '#c98f3a',
    anchorHeight: 2.1,
  },
  {
    id: 'finished',
    name: 'Finished Goods',
    step: 'Ready to ship',
    blurb: 'Sealed, labelled and shelved. Orders are picked from here onto the dispatch trolley.',
    stats: [
      { label: 'On the shelf', value: '96 jars' },
      { label: 'Picked today', value: '24' },
    ],
    accent: '#5aa84c',
    anchorHeight: 2.6,
  },
);

export const getStation = (id: string) => STATIONS.find((station) => station.id === id) ?? null;
