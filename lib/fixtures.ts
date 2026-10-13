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
    step: 'Step 05 of 07',
    blurb: 'The belt runs straight through it. Jars go in the west mouth and sealed shippers come out the east one, which is the only place on the line where what you are looking at changes.',
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
    step: 'The whole line',
    blurb:
      'Jars push out through the discharge hood in the west wall, meet the filling gantry a few metres later, and ride the belt into the packaging tunnel. What comes out the far side is a box, and the box carries on east past QC and labelling.',
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
    step: 'Step 06 of 07',
    blurb: 'Every batch passes the scanner arch. Texture and stretch are checked by hand, and the desk sits alongside labelling so nothing gets a label it has not earned.',
    stats: [
      { label: 'Checked today', value: '21' },
      { label: 'Rejected', value: '2' },
      { label: 'Next to', value: 'Labelling' },
    ],
    productId: 'strawberry',
    accent: '#5aa84c',
    anchorHeight: 2.1,
  },
  {
    id: 'trolley',
    name: 'Order Trolley',
    step: 'Ready to ship',
    blurb: 'Everything you add to the cart is boxed and stacked here. Somebody usually wheels it up the line and leaves it somewhere else.',
    stats: [
      { label: 'Packed today', value: '18' },
      { label: 'Next pickup', value: '16:30' },
    ],
    accent: '#c98f3a',
    anchorHeight: 1.35,
  },
];

STATIONS.push(
  {
    id: 'greenhouse',
    name: 'Greenhouse',
    step: 'Step 01 of 07',
    blurb: 'Five mystery seeds, thirty possible plants. Watch the leaves unfurl and the little bed labels reveal what has grown. Each harvest makes room for another surprise.',
    stats: [
      { label: 'Beds', value: '5' },
      { label: 'Botanical collection', value: '30 varieties' },
    ],
    accent: '#6ea45a',
    anchorHeight: 2.7,
  },
  {
    id: 'periodic',
    name: 'The Elements',
    step: 'Lab wall',
    blurb:
      'A lit board of all one hundred and eighteen. Slime is borax and PVA glue, and between them those two are made of five elements and nothing else — press exactly those five and the whole board goes green.',
    stats: [
      { label: 'Elements', value: '118' },
      { label: 'In the recipe', value: '5' },
      { label: 'Wrong ones', value: 'Turn orange' },
    ],
    accent: '#7bbf6a',
    /*
      Negative, which no other card is. The camera frames a station by looking at
      its anchor plus a fixed height, but the *card* hangs off this — and a card
      floating over the middle of the board would cover the half of the puzzle
      you are trying to read. This drops it below the box instead.
    */
    anchorHeight: -0.45,
  },
  {
    id: 'sink',
    name: 'Hand Sink',
    step: 'Before and after',
    blurb:
      'Catering-grade stainless where the fish tank used to stand: pressed basin, swan-neck mixer, soap on the wall. Whoever is on the mixer or on quality control comes over to wash, and the tap only runs while somebody is standing at it.',
    stats: [
      { label: 'Steel', value: '304, like the benches' },
      { label: 'Tap', value: 'Lever, elbow-worked' },
      { label: 'Used by', value: 'Everyone, properly' },
    ],
    accent: '#9aa5ad',
    anchorHeight: 1.5,
  },
  {
    id: 'filling',
    name: 'Filling',
    step: 'Step 04 of 07',
    blurb: 'Slime is dosed into jars, 150 ml at a time, at the west end of the belt — before the packaging tunnel, because a jar has to be full before it can be boxed.',
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
    step: 'Step 07 of 07',
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
    id: 'momo',
    name: 'Momo',
    step: 'The heart of SB Mart',
    blurb: 'Our little mascot, made larger than life. The shop has been arranged around this quiet sculpture; give Momo a tap and you may get a wave back.',
    stats: [
      { label: 'At home', value: 'The middle of the Mart' },
      { label: 'Mood', value: 'A little curious' },
    ],
    accent: '#9bbf49',
    anchorHeight: 2.1,
  },
  {
    id: 'staffdoor',
    name: 'Staff Entrance',
    step: 'Shift change',
    blurb: 'Shut for the whole of a shift. It slides open twice a cycle, for the few minutes it takes one crew to walk out and the next to walk in — and whenever you press it, which calls the other three in early.',
    stats: [
      { label: 'Opens', value: 'At the handover, or on a press' },
      { label: 'Leads to', value: 'The staff corridor' },
      { label: 'Crews', value: 'Day and night' },
    ],
    accent: '#f0c86a',
    anchorHeight: 2.8,
  },
  {
    id: 'martdoor',
    name: 'SB Mart',
    step: 'Through the door',
    blurb: 'The little shop behind the factory wall. Same jars, colder, with someone at the till.',
    stats: [
      { label: 'Open', value: 'Every day' },
      { label: 'Till', value: 'Staffed round the clock' },
    ],
    accent: '#4e9fbe',
    anchorHeight: 2.9,
  },
  {
    id: 'labdoor',
    name: 'Slimeberry Lab',
    step: 'Back through the door',
    blurb: 'Back out onto the factory floor — the line, the greenhouse and the fish tank.',
    stats: [{ label: 'Leads to', value: 'The factory' }],
    accent: '#e4738f',
    anchorHeight: 2.9,
  },
  {
    id: 'vinyl',
    name: 'The Record Cabinet',
    step: 'SB Mart',
    blurb:
      'The keepers built the shelves themselves. Tap the turntable and the shop stereo comes on — tap it again and the room goes quiet.',
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
    anchorHeight: 2.3,
  },
  {
    id: 'seriesisland',
    name: 'The Series Island',
    step: 'SB Mart',
    blurb:
      'All three lines on one fixture, in their printed boxes: boba series, fruit series and dessert world, left to right. Each bay keeps its own colour under its own header, even in the larger gallery room.',
    stats: [
      { label: 'Lines', value: '3' },
      { label: 'Boxes', value: '16' },
      { label: 'Mixed up', value: 'Never' },
    ],
    productId: 'fruit-pineapple',
    accent: '#7cc62b',
    anchorHeight: 1.9,
  },
  {
    id: 'checkout',
    name: 'Checkout',
    step: 'SB Mart',
    blurb: 'The counter. The register is older than the factory and neither of the people who work it will hear of replacing it.',
    stats: [{ label: 'Register', value: 'SB-MART-01' }],
    accent: '#c98f3a',
    anchorHeight: 1.9,
  },
  {
    id: 'marttrolley',
    name: 'Shop Trolley',
    step: 'SB Mart',
    blurb: 'The same order the Lab\u2019s trolley is holding, on this side of the wall. Whatever you add lands in it.',
    stats: [
      { label: 'Owner', value: 'Whoever left it' },
      { label: 'Wheels', value: 'Three good ones' },
    ],
    accent: '#e4738f',
    anchorHeight: 1.5,
  },
  {
    id: 'oyen',
    name: 'Oyen',
    step: 'Shop Cat',
    blurb: 'Came in through the delivery door two winters ago and has not left. Sleeps on Momo’s plinth, supervises from the counter, answers to nothing.',
    stats: [
      { label: 'Post', value: 'Wherever it is warm' },
      { label: 'Duties', value: 'None agreed' },
      { label: 'Naps', value: '11 today' },
    ],
    accent: '#dda86a',
    anchorHeight: 0.85,
  },
  {
    id: 'radio',
    name: 'The Set',
    step: 'SB Mart',
    blurb: 'A valve radio somebody left by the door. The dial runs a hundred years and most of it is static \u2014 but not all of it.',
    stats: [
      { label: 'Band', value: '1990 \u2013 2090' },
      { label: 'Condition', value: 'Warm to the touch' },
    ],
    accent: '#c98f3a',
    anchorHeight: 1.3,
  },
);

export const getStation = (id: string) => STATIONS.find((station) => station.id === id) ?? null;
