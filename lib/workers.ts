import type { WorkerAppearance } from '@/components/lab/WorkerModel';
import { BREAK_SEATS, STAND } from './layout';
import type { Crew } from './shift';
import type { RoamPlan } from './roaming';

/**
 * The characters, described as data. Every worker interaction — hover card,
 * focus card, reactions, thought bubbles — reads from here, so there is no
 * per-character branching anywhere in the components.
 *
 * There are two crews. The day crew and the night crew do the same three jobs at
 * the same three stations, so they share the three beats defined below; what is
 * different is who they are, which is what the thoughts are for. Nobody on the
 * night shift thinks about the courier at half four.
 */
export interface WorkerStat {
  label: string;
  value: string;
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
  /**
   * Thoughts for whoever is on the floor after dark. Only the supervisor needs
   * these — he is the one person who works both shifts, so his half of the
   * conversation has to know which one it is in.
   */
  nightThoughts?: string[];
  /** What they say when the visitor will not stop prodding them. */
  complaints: string[];
  currentTask: string;
  /** Product this worker is currently handling. */
  productId: string;
  progress?: number;
  stats: WorkerStat[];
  status: string;
  appearance: WorkerAppearance;
  /**
   * The model this character is drawn from. The six on the factory floor and the
   * two in the shop are mascot files; anybody without one falls back to the
   * procedural rig, which reads the same pose and the same `appearance`.
   */
  glb?: string;
  /**
   * Where this character may be and how they get between those places. The
   * corridor is fixed and measured; which stop they head for next is not. See
   * `lib/roaming.ts`.
   */
  roam: RoamPlan;
}

/**
 * What anybody on the factory floor thinks about, wherever they happen to be
 * standing. Added to every character's own thoughts rather than written into
 * each of them, because none of it belongs to one person: it is the building,
 * the hour, the weather and the queue for the fingerprint scanner.
 */
const FACTORY_LIFE: readonly string[] = [
  'The air conditioning has two settings: off, and Bandung in July.',
  'Fingerprint scanner did not read me again. I am here. I am clearly here.',
  'Whose nasi padang is that? It has been on the bench since the morning shift.',
  'Es teh manis after this batch. That is the deal I have made with myself.',
  'The bakso cart is outside. I can hear the little bell from in here.',
  'Nine in the morning and the label printer is already having feelings.',
  'Pak supervisor is walking this way with a clipboard. Look busy. Look delighted.',
  'If the rain gets any heavier nobody is getting home before nine.',
  'Indomie for lunch. Indomie for lunch tomorrow. I have made my peace.',
  'Whoever keeps setting the radio to dangdut: thank you, sincerely.',
  'There is a cicak on the ceiling above the mixer. He has been here longer than me.',
  'The floor is wet, the sign is missing, and so I am the sign.',
  'JANGAN LUPA BAHAGIA, says the poster. The poster has never run a batch.',
  'THR is two months away and I have spent it four times already.',
  'Somebody put their ice cream in the sample fridge. That fridge is for samples.',
  'The mosquito in here knows the safety procedure better than the new intern.',
  'My ojol order is beeping in the locker. That is mine. That is definitely mine.',
  'Traffic was so bad this morning I rehearsed a whole resignation speech. It was good.',
  'That meeting could have been one message. All of them could have been one message.',
  'The sticker says DO NOT TOUCH. Everybody touches.',
  'The water gallon is empty and whoever finished it has evaporated.',
  'Half four. The queue for the scanner starts forming at twenty past.',
  'Sudah makan? is not a question here, it is a greeting, and the answer is never no.',
  'Somebody has taken the good scissors back to their own bench. Again.',
  'Two fans, one plug, and a decision to make.',
];

/** And the shop's own, for whoever is on the till. */
const SHOP_LIFE: readonly string[] = [
  'The ojol drivers shelter by the door when it rains. The shop is nicer with people in it.',
  'Somebody asked for a plastic bag and we had a whole conversation about it.',
  'QRIS. Everybody wants QRIS. I have reprinted that little code four times.',
  'The card machine works perfectly. It just likes to think about it first.',
  'The warung across the road sells three things and all of them beat my lunch.',
  'Nine thousand in change and not one coin in the drawer that helps.',
  'Jam karet is real, and it lives in the delivery schedule.',
  'A whole family came in to look at one jar and left extremely happy.',
  'The fan turns left, turns right, and cools absolutely nobody.',
  'Somebody has parked a motorbike across the doorway. There is a car park.',
  'Lebaran week and everyone wants the hampers we have not made yet.',
  'Somebody asked if we deliver. We do not. He remains hopeful.',
  'It is raining, nobody is coming, and I am going to rearrange everything.',
  'If I face this shelf one more time it will start facing me back.',
  'Titip motor sebentar, he said, and left for an hour.',
  'The cat has opinions about the new arrangement. The cat always has opinions.',
];

/** Facing for anyone stood at the staff door: square on to it, about to go. */
const OUT_THROUGH_DOOR = -Math.PI / 2;

/**
 * The stop every character is sent to when their shift ends.
 *
 * Weight zero keeps it out of the random draw — this is somewhere you are sent,
 * never somewhere you choose — and the enormous dwell means whoever reaches it
 * stays put until the handover takes them off the floor.
 */
const doorStop = (node: number, along = 0) => ({
  id: 'door',
  /*
    Each beat gets its own spot along the wall rather than all three sharing the
    threshold — three people arriving on the same half metre reads as three
    people appearing, which is the one thing the door is there to avoid.
  */
  at: [STAND.staffDoor[0], STAND.staffDoor[1] + along] as [number, number],
  node,
  facing: OUT_THROUGH_DOOR,
  dwell: [999, 999] as [number, number],
  action: 'idle' as const,
  weight: 0,
});

/* ------------------------------------------------------------- the three beats */

/**
 * The mixer's beat: the mixer itself, the greenhouse it is fed from, the texture
 * bench down the west wall, the staff door beside it, and the long walk across
 * the middle of the floor to the break corner — which since filling and the
 * coffee table swapped ends is now the far side of the factory from her station.
 */
const MIXER_BEAT: RoamPlan = {
  lane: [
    [4.3, 0.9],
    [3.0, 1.0],
    [1.6, 1.0],
    [0.2, 0.9],
    [-1.4, 0.2],
    [-2.4, -1.2],
    [...STAND.mixer],
    [...STAND.mixerLane],
    [...STAND.greenhouse],
    [...STAND.staffDoor],
    [-6.0, -0.6],
    [...STAND.sink],
  ],
  stops: [
    {
      id: 'mixer',
      at: [...STAND.mixer],
      node: 6,
      facing: Math.PI,
      dwell: [5, 9],
      action: 'work',
      startsMachine: true,
      weight: 4,
    },
    {
      id: 'greenhouse',
      at: [...STAND.greenhouse],
      node: 8,
      facing: Math.PI,
      dwell: [3.5, 6],
      action: 'inspect',
      carries: true,
      then: 'mixer',
      weight: 2,
    },
    {
      // a wash at the sink, which is what the far end of this corridor is for
      id: 'sink',
      at: [...STAND.sink],
      node: 11,
      facing: -Math.PI / 2,
      dwell: [4, 6.5],
      action: 'work',
      washes: true,
      weight: 2,
    },
    { id: 'floor', at: [-1.4, 0.2], node: 4, dwell: [2, 4], action: 'idle' },
    {
      id: 'break',
      at: [BREAK_SEATS.mixer[0], BREAK_SEATS.mixer[1]],
      node: 0,
      facing: BREAK_SEATS.mixer[2],
      dwell: [9, 15],
      action: 'sit',
    },
    doorStop(9, 0.5),
  ],
};

/**
 * The inspector's beat: the QC bench, the belt beside it, the west end of the
 * bench run, the open floor, and the break corner two desks along. The benches
 * run unbroken from x 0.75 to 3.35, so the only way off the strip and into the
 * room is round their west end — which is what node 4 is for.
 */
const QC_BEAT: RoamPlan = {
  lane: [
    /* Prepended, so quality control can get to the sink as well: every stop
       below counts from here, which is why their node indices are one higher
       than the order they are written in. */
    [...STAND.sink],
    [...STAND.staffDoor],
    [-5.2, -1.0],
    [-3.4, -0.2],
    [-1.8, 0.5],
    [0.25, 1.25],
    [0.25, 3.02],
    [...STAND.qc],
    [...STAND.qcFar],
    [...STAND.labelling],
    [4.0, 3.05],
  ],
  stops: [
    {
      id: 'sink',
      at: [...STAND.sink],
      node: 0,
      facing: -Math.PI / 2,
      dwell: [4, 6],
      action: 'work',
      washes: true,
    },
    {
      id: 'bench',
      at: [...STAND.qc],
      node: 7,
      facing: Math.PI,
      dwell: [5, 9],
      action: 'inspect',
      weight: 4,
    },
    {
      id: 'belt',
      at: [...STAND.qcFar],
      node: 8,
      facing: 0,
      dwell: [3, 5.5],
      action: 'work',
      weight: 2,
    },
    {
      id: 'labelling',
      at: [...STAND.labelling],
      node: 9,
      facing: Math.PI,
      dwell: [3, 5.5],
      action: 'inspect',
      weight: 2,
    },
    { id: 'westend', at: [0.25, 3.02], node: 6, facing: 0, dwell: [2.5, 4.5], action: 'inspect' },
    { id: 'floor', at: [-1.8, 0.5], node: 4, dwell: [2, 4], action: 'idle' },
    {
      id: 'break',
      at: [BREAK_SEATS.qc[0], BREAK_SEATS.qc[1]],
      node: 10,
      facing: BREAK_SEATS.qc[2],
      dwell: [9, 15],
      action: 'sit',
    },
    doorStop(0, -0.5),
  ],
};

/**
 * The packer's beat, and the longest in the room: in at the staff door, down
 * past the filling machine at the west end of the belt, along the whole front
 * strip through packaging and labelling, round the east end and down to the
 * order trolley. A line, not a loop — the benches make the strip a dead end at
 * both ends but one.
 */
const PACKING_BEAT: RoamPlan = {
  lane: [
    [...STAND.staffDoor],
    [-5.9, -0.8],
    [-5.5, 1.8],
    [-5.5, 3.05],
    [...STAND.filling],
    [-3.6, 3.05],
    [-2.2, 2.85],
    [-1.0, 2.75],
    [0.2, 2.95],
    [...STAND.qc],
    [...STAND.labelling],
    [4.0, 3.05],
    [...STAND.eastTurn],
    [6.05, 2.8],
    [...STAND.eastLane],
    [5.15, -1.2],
    [...STAND.trolley],
  ],
  stops: [
    {
      id: 'filling',
      at: [...STAND.filling],
      node: 4,
      facing: 0,
      dwell: [3.5, 6],
      action: 'work',
      weight: 3,
    },
    {
      id: 'labelling',
      at: [...STAND.labelling],
      node: 10,
      facing: 0,
      dwell: [3.5, 6],
      action: 'work',
      weight: 3,
    },
    {
      id: 'packing',
      at: [-1.0, 2.75],
      node: 7,
      facing: 0,
      dwell: [3, 5],
      action: 'inspect',
      weight: 2,
    },
    {
      // He loads the order trolley here and leaves it where it stands.
      id: 'trolley',
      at: [...STAND.trolley],
      node: 16,
      facing: 2.5,
      dwell: [3, 5],
      action: 'work',
      weight: 2,
    },
    {
      id: 'break',
      at: [BREAK_SEATS.packing[0], BREAK_SEATS.packing[1]],
      node: 13,
      facing: BREAK_SEATS.packing[2],
      dwell: [8, 13],
      action: 'sit',
    },
    doorStop(0),
  ],
};

/* ------------------------------------------------------------- the day crew */

export const DAY_WORKERS: WorkerData[] = [
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
      'The paddle is dragging. Something in there is thick.',
      'Two degrees warmer and it will fold like silk.',
      'Whoever cut the basil this morning — thank you. Properly.',
      'Bloom the colour first. Always the colour first.',
      'This one wants resting, not stirring.',
      'The chamomile is early. Nobody told the chamomile.',
      'Half a scoop under. Nobody will taste it. I will taste it.',
      'The greenhouse smells like the good batch.',
      'Ribbon test. Three seconds and it is ready.',
      'Second tank is running cold again.',
      'A good fold is quiet. You can hear when it is wrong.',
      'Blueberry goes in last or it bruises the whole tank.',
      'Warm bowl, cold syrup. Never the other way round.',
      'That is a skin forming. Somebody left the lid off.',
      'The strawberry is riper than the recipe expects.',
      'Nine turns clockwise, then leave it alone.',
      'You can hear the paddle change note when it takes.',
      'I have made this four hundred times and I still watch it.',
      'Under-mixed is fixable. Over-mixed is a lesson.',
      'The scale reads 0.4 heavy. The scale is wrong, not me.',
      'It wants ten more minutes and nobody has ten more minutes.',
      'Third tray of mint today and the beds are still full.',
      'If the ribbon breaks, the batch is tired.',
      'That colour is doing something I did not ask it to do.',
      'Smell it before you look at it. The nose is honest.',
      'Somebody has swapped my measuring jug for a smaller one.',
      'Rest, fold, rest. That is the whole job.',
      ...FACTORY_LIFE,
    ],
    complaints: [
      'You have poked me nine times. The batch is counting.',
      'I will lose my place in the recipe, you know.',
      'Yes? Still mixing. Same as the last eight times.',
      'This is going to curdle and it will be your fault.',
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
    /* The record still carries a drawn look because the hover card tints itself
       with `cap`; it is the model's own colour now, not the old rig's. */
    appearance: { skin: '#f3c9a2', hair: '#3f3a35', cap: '#3f4e74' },
    glb: '/models/laboran-01.glb',
    roam: MIXER_BEAT,
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
      'Nine point four. I will take nine point four.',
      'That is a crease, not a fold. There is a difference.',
      'Hold. Count. Release. Hold. Count. Release.',
      'Colour is even the whole way down. Good.',
      'It snapped. Straight back to the mixer.',
      'Third jar running within a tenth.',
      'Somebody has moved my calipers.',
      'Too tacky. It will pull the lid off in the box.',
      'Sheen is right, and sheen is usually last to arrive.',
      'I log every single one. Somebody has to.',
      'If it does not pass here it does not pass anywhere.',
      'The label is straight. I checked twice. I will check again.',
      'Rebound under a second. That is a good jar.',
      'Nobody notices the ones I stop. That is the point of me.',
      'Same batch, different jar, half a point apart. Why.',
      'A reject is not a failure. A reject that ships is.',
      'Weigh it, stretch it, hold it up to the light.',
      'That one is beautiful and I am not allowed to say so.',
      'Twelve passed, one back to the tank, and it is not yet eleven.',
      'The lid seats a hair proud on this run.',
      'Print is smudging on the third label of every roll.',
      'I would rather stop the line than sign that off.',
      'Room is two degrees warm. Everything reads soft in a warm room.',
      'My handwriting on this sheet is getting worse by the hour.',
      'Consistency is not the same as good. Both, please.',
      'The good ones feel finished before you measure them.',
      'One more, then the coffee. One more.',
      ...FACTORY_LIFE,
    ],
    complaints: [
      'I am trying to measure something. Precisely.',
      'Every tap is another line on the reject sheet.',
      'Do you want this batch checked or not?',
      'I have counted. That was nine. I count things.',
    ],
    currentTask: 'Checking Strawberry Cloud',
    productId: 'strawberry',
    status: 'Approved',
    stats: [
      { label: 'Texture', value: '9.2 / 10' },
      { label: 'Stretch', value: '9.5 / 10' },
      { label: 'Status', value: 'Approved' },
    ],
    appearance: { skin: '#8d5a3b', hair: '#2c2622', cap: '#ffab21' },
    glb: '/models/laboran-04.glb',
    roam: QC_BEAT,
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
      'Fill line is high on this run. Again.',
      'Lid, seal, label, done. Lid, seal, label, done.',
      'Whoever stacked these did not stack these.',
      'One more row and the trolley is full.',
      'That seal did not catch. Doing it again.',
      'Corners first, then the tape. Corners first.',
      'Two mango, one matcha, and a note saying be careful.',
      'The labels are drying slow today.',
      'If it rattles, it is not packed.',
      'Nobody has ever once thanked a box.',
      'Right. Where was I. Twelve.',
      'The nozzle is dripping between jars. Somebody look at that.',
      'Fill, cap, box. It only goes wrong if you rush the cap.',
      'This one is going to Semarang. Long way for a small jar.',
      'Sixteen. No — fifteen. Starting again.',
      'Tape gun is out. Tape gun is always out.',
      'A box that will not close is a box that is too full.',
      'Pallet is three rows up and it is not even lunch.',
      'Somebody has put a heavy one on top of a light one.',
      'The arm places them better than I do. I am fine about it.',
      'Fragile sticker, both sides, every time.',
      'Nobody sees the packing. Everybody sees a dent.',
      'That trolley has been in four places today and it is not mine.',
      'One good box beats three fast ones.',
      'Straight lines, flat corners, and out the door.',
      'The last one of a run is always the one that goes wrong.',
      'I will restack it. I will not say anything. I will restack it.',
      ...FACTORY_LIFE,
    ],
    complaints: [
      'Mate. The courier comes at half four.',
      'Every time you tap I put the tape down.',
      'I have got twelve boxes and one of you.',
      'Ask me one more time and I am hiding in the crates.',
    ],
    currentTask: 'Packaging Strawberry Cloud',
    productId: 'strawberry',
    status: 'Ready to ship',
    stats: [
      { label: 'Batch', value: 'SB-024' },
      { label: 'Packed', value: '18 today' },
      { label: 'Status', value: 'Ready to ship' },
    ],
    appearance: { skin: '#e8b28a', hair: '#8a5a3c', cap: '#a8503c' },
    glb: '/models/laboran-03.glb',
    roam: PACKING_BEAT,
  },
];

/* ----------------------------------------------------------- the night crew */

/**
 * The second shift.
 *
 * Same three jobs, same three beats, different three people — and deliberately a
 * different register. The day crew are busy; the night crew have the building to
 * themselves, and it shows in what they think about. Nobody after dark is
 * worried about the courier.
 */
export const NIGHT_WORKERS: WorkerData[] = [
  {
    id: 'nala',
    name: 'Nala',
    role: 'Slime Mixer · Night',
    emoji: '🌙',
    personality: 'Unhurried, exact, talks to the machine',
    dialogue: [
      'Slow batch tonight. Slow is better.',
      'Nobody rushes a mix at two in the morning.',
      'Listen to it. It tells you when it is ready.',
    ],
    thoughts: [
      'Nothing folds like a cold room folds.',
      'Good evening, paddle. Same again.',
      'The night batch always comes out smoother. I have theories.',
      'Half speed. There is nobody waiting.',
      'Chamomile last, and only a whisper of it.',
      'The tank hums a different note after midnight.',
      'This one will be beautiful and nobody will see it made.',
      'Warm the syrup by hand. The heater is too keen.',
      'I have the whole greenhouse to myself.',
      'Two in the morning is the best light for judging pink.',
      'Rest it twenty minutes. We have twenty minutes.',
      'The day crew leave the scoops in the wrong drawer.',
      'Mint picked at night smells greener. That is not science.',
      'Slower paddle, finer bubble. Every time.',
      'Somebody rinsed this properly. Thank you, whoever you are.',
      'The building settles at three. You can hear the walls.',
      'I will leave a note about the second tank.',
      'It is not stirring. It is persuading.',
      'One batch, done properly, beats four done quickly.',
      'Blueberry tonight. The colour is a good excuse to stay awake.',
      'Nothing on the board until six. Lovely.',
      'The ribbon is holding four seconds. Four is generous.',
      'Whoever set the timer to eleven minutes was guessing.',
      'I can hear the belt from here and it sounds happy.',
      'Cold hands are better hands for this.',
      'That is the smell. That is the one.',
      'Wash the bowl before it sets, not after. Always after, though.',
      'The morning lot will think this took effort. It did.',
      'A quiet mixer is a good mixer.',
      'Tea, then the second tank.',
      'I have been talking to a machine for an hour.',
      'Sunrise in two batches.',
      ...FACTORY_LIFE,
    ],
    complaints: [
      'It is the middle of the night and you are poking me.',
      'The batch is resting. So was I.',
      'You are going to make me lose count and it is very quiet in here.',
      'Nine times. In the dark. Remarkable.',
    ],
    currentTask: 'Mixing Midnight Blueberry',
    productId: 'blueberry',
    progress: 46,
    status: 'Mixing',
    stats: [
      { label: 'Colour', value: 'Deep blue' },
      { label: 'Scent', value: 'Blueberry & vanilla' },
      { label: 'Texture', value: 'Slow fold' },
    ],
    appearance: { skin: '#c58a5f', hair: '#2c2622', cap: '#3271b5' },
    glb: '/models/laboran-05.glb',
    roam: MIXER_BEAT,
  },
  {
    id: 'rendi',
    name: 'Rendi',
    role: 'Quality Control · Night',
    emoji: '🔎',
    personality: 'Quick, decisive, superstitious about the third jar',
    dialogue: [
      'Pass. Pass. That one — no.',
      'The third jar of a run always lies. I check it twice.',
      'If I can feel the seam, the customer can feel the seam.',
    ],
    thoughts: [
      'The third jar of every run. Every time. I do not know why.',
      'Under this light you can see everything. That is why I like it.',
      'Nine point six. At this hour I do not trust nine point six.',
      'Softer than the day run. Colder room, softer slime.',
      'Reject. Sorry. Reject.',
      'Two hundred checked and the pen has not run out. A good night.',
      'I can hear a bad seal from the next bench.',
      'Nobody argues with me at three in the morning.',
      'Straight, straight, crooked. There is always one.',
      'Hold it up. If the light bends wrong, it is wrong.',
      'The night sheet is cleaner than the day sheet. I am not saying anything.',
      'This batch has been rested properly. You can tell.',
      'One in forty. That is my number and I am keeping it.',
      'Warm hands ruin a stretch test. Rinse them cold.',
      'The scanner arch is a quarter tone off tonight.',
      'If it passes tired, it fails in the morning.',
      'Somebody stacked the pass tray on the reject tray. Somebody.',
      'That is a beautiful jar and I am going to say so out loud.',
      'Count of three, release, watch the rebound.',
      'The label roll is drying too fast in this air.',
      'Fourteen in a row. Fourteen. Do not jinx it.',
      'A tenth under is a tenth under. It does not round up at night.',
      'I like the quiet ones. Easier to hear a fault.',
      'My chair is at the wrong height and I have said so twice.',
      'Colour reads darker under these lamps. Adjust for it.',
      'Bubbles. Straight back to the tank.',
      'This one has been mixed by somebody who cared.',
      'Everything after four in the morning gets checked twice.',
      'Do not sign anything you have not touched.',
      'Fill weight is drifting up. I will note it before the handover.',
      'The pen with the good nib has gone again.',
      'One more tray and then I sit down for exactly nine minutes.',
      ...FACTORY_LIFE,
    ],
    complaints: [
      'I am holding a jar. Please.',
      'That is nine. I keep count even at night.',
      'You have made me drop a reading.',
      'Come back at six and speak to the day lot.',
    ],
    currentTask: 'Checking Midnight Blueberry',
    productId: 'blueberry',
    status: 'Approved',
    stats: [
      { label: 'Texture', value: '9.5 / 10' },
      { label: 'Stretch', value: '9.1 / 10' },
      { label: 'Status', value: 'Approved' },
    ],
    appearance: { skin: '#f3c9a2', hair: '#5c4433', cap: '#8a5ba3' },
    glb: '/models/laboran-06.glb',
    roam: QC_BEAT,
  },
  {
    id: 'tari',
    name: 'Tari',
    role: 'Packaging & Dispatch · Night',
    emoji: '🌘',
    personality: 'Methodical, radio on, counts everything twice',
    dialogue: [
      'Nothing goes out until six, so it goes out right.',
      'Everything on this pallet is square. Look at it.',
      'Radio on, tape ready, off we go.',
    ],
    thoughts: [
      'The first van is not until six. There is time to do it properly.',
      'Square, square, square. Nothing leaves this room crooked.',
      'Counted forty. Counting forty again.',
      'The tape sounds enormous when the room is this quiet.',
      'Nobody stacks a pallet like a night packer.',
      'Fill it, cap it, cool it, then box it. Never box it warm.',
      'This one is going a long way. Double tape.',
      'Six rows and the platform clears itself. I like watching that.',
      'The arm and I have an understanding.',
      'Somebody left the flat-packs the wrong way up. Again.',
      'Radio says rain by five. The loading door will need the mat.',
      'A quiet line is a line that is running right.',
      'I do the awkward orders at night. They deserve the attention.',
      'Eleven for the shop, nine for post, two for whoever Bimo promised.',
      'The label roll ends at the worst possible moment. Always.',
      'Heavy at the bottom. It is not complicated.',
      'That box has a soft corner. Not going out like that.',
      'Nobody sees a night pallet. I still line up the logos.',
      'Warm jars sweat in a box. Wait for them.',
      'The belt sounds lonely at this hour.',
      'Tape, fold, press, count. Tape, fold, press, count.',
      'Morning lot will find this trolley exactly where I left it.',
      'Fragile stickers, both sides, no exceptions.',
      'Three left of the mango and then I can stop.',
      'The palletiser hums a little flat tonight.',
      'One more layer and the platform goes.',
      'If I can hear it move inside, it is packed wrong.',
      'It is nearly light. That is always a surprise.',
      'Sweep first, then hand over. Nobody likes inheriting a mess.',
      'Everything labelled, everything logged, everything squared.',
      'The good tape is hidden and I am the one who hid it.',
      'Last box of the night is always the neatest.',
      ...FACTORY_LIFE,
    ],
    complaints: [
      'You are going to make me lose count and I will start again.',
      'I have four boxes open. Four.',
      'It is the middle of the night. Everything is fine. Please stop.',
      'That is nine. I count things twice, so really it is eighteen.',
    ],
    currentTask: 'Packaging Midnight Blueberry',
    productId: 'blueberry',
    status: 'Ready to ship',
    stats: [
      { label: 'Batch', value: 'SB-025N' },
      { label: 'Packed', value: '31 tonight' },
      { label: 'Status', value: 'Ready to ship' },
    ],
    appearance: { skin: '#e8b28a', hair: '#2c2622', cap: '#d95191' },
    glb: '/models/laboran-02.glb',
    roam: PACKING_BEAT,
  },
];

/**
 * SB Mart's keepers.
 *
 * Six of them share the shop. They are described with the same record as the
 * factory characters, so the hover card, the detail panel, the thought bubbles
 * and the prod counter need no special case — and they all walk one beat,
 * because the beat was measured against the fixtures and the fixtures have not
 * moved. Only who is stood on it changes.
 */
const SHOP_BEAT: RoamPlan = {
  /*
    A shopkeeper alone in a shop does not stand still: most of a shift is out on
    the floor facing up shelves, looking in on the stock corner and wheeling back
    the trolley somebody abandoned. Which end of the corridor they head for is a
    throw each time.

    Laid out fresh when the floor doubled and momo took the middle of it: out from
    behind the counter, along the front of the wall run, across the back of the
    room behind the installation, down the west side and back along the front of
    the floor to the trolley. Measured leg by leg against every fixture with the
    0.28 body radius — the tightest leg clears by 0.45, threading the gap between
    momo's plinth and the series island. The first leg starts at the till and the
    last ends at the trolley; both are meant to.
  */
  lane: [
    [5.0, -4.8],
    [3.3, -4.8],
    [2.4, -4.7],
    [0.0, -3.3],
    [-3.2, -2.6],
    [-4.5, -1.5],
    [-3.6, 1.4],
    [-1.6, 1.95],
    [2.5, 1.95],
    [4.7, 2.4],
    [4.7, 4.0],
    [3.25, 3.96],
  ],
  stops: [
    { id: 'till', at: [5.0, -4.8], node: 0, facing: 0, dwell: [5, 9], action: 'work', weight: 3 },
    { id: 'shelf', at: [2.4, -4.7], node: 2, facing: Math.PI, dwell: [4, 6.5], action: 'inspect', weight: 2 },
    { id: 'stock', at: [-4.5, -1.5], node: 5, facing: 0.4, dwell: [3.5, 5.5], action: 'idle' },
    /* a pause at the installation's shoulder, looking up at it */
    { id: 'floor', at: [2.5, 1.95], node: 8, facing: -2.36, dwell: [2.5, 4.5], action: 'idle' },
    { id: 'trolley', at: [3.25, 3.96], node: 11, facing: 2.59, dwell: [2.5, 4], action: 'work', weight: 2 },
  ],
};

/**
 * The second keeper's beat: the front and the west side of the floor.
 *
 * A shop with two people in it splits the room rather than doubling up — this
 * one has the door, the west side, the installation and the front of the floor,
 * while the till, the back wall and the stock corner stay with whoever is on the
 * register. The corridor was measured the same way every other one here was,
 * against the fixtures' own footprints with the 0.28 body radius: the tightest
 * leg clears by 0.73, and no stop comes within 0.81 of one of the register
 * keeper's or the cat's, so the three of them share a floor without ever sharing
 * a half metre.
 */
const SHOP_FLOOR_BEAT: RoamPlan = {
  lane: [
    [-4.0, -5.0],
    [-3.9, -3.6],
    [-4.4, -0.2],
    [-2.8, 0.9],
    [-3.4, 4.6],
    [-1.4, 4.75],
    [0.85, 5.4],
    [2.3, 5.1],
  ],
  stops: [
    { id: 'door', at: [-4.0, -5.0], node: 0, facing: 0.74, dwell: [3, 5], action: 'idle' },
    /* stands back from the installation and takes it in, as everyone does */
    { id: 'momo', at: [-2.8, 0.9], node: 3, facing: 1.98, dwell: [4, 7], action: 'inspect', weight: 2 },
    { id: 'island', at: [-1.4, 4.75], node: 5, facing: 2.54, dwell: [3.5, 6], action: 'work', weight: 2 },
    { id: 'front', at: [0.85, 5.4], node: 6, facing: 0.3, dwell: [2, 4], action: 'idle' },
    { id: 'east', at: [2.3, 5.1], node: 7, facing: 2.85, dwell: [2.5, 4.5], action: 'inspect' },
  ],
};

/** What every keeper's card says, since they all take both shifts in turn. */
const KEEPER_STATS = (serves: string): WorkerStat[] => [
  { label: 'Shift', value: 'Days and nights, in turn' },
  { label: 'Serves', value: serves },
  { label: 'Register', value: 'SB-MART-01' },
];

export const MART_CASHIERS: WorkerData[] = [
  {
    id: 'ara',
    name: 'Ara',
    role: 'SB Mart Keeper',
    emoji: '🍓',
    personality: 'Tidy, sunny, quietly competitive about the shelf',
    dialogue: [
      'Welcome to SB Mart — everything on the wall came up from the lab this morning.',
      'Take a basket. The minis are cheaper in threes, though I never say that out loud.',
      'If you want a tub, the good ones are behind the counter.',
    ],
    thoughts: [
      'The front shelf needs facing.',
      'Somebody has moved the strawberry again.',
      'Three in a row have asked for the blue one.',
      'Minis at the front, tubs at eye level. Always.',
      'Is that the last mango?',
      'My clip matches the shelf today. Nobody noticed.',
      'Oyen is on the counter. Oyen is always on the counter.',
      'I have faced this row four times this week.',
      'Bag, receipt, thank you, next. It is a nice rhythm.',
      'Rain outside. Everyone buys more in the rain.',
      'Two coins short. It will turn up under the mat.',
      'A shop is just a room where you are pleased to see people.',
      ...SHOP_LIFE,
    ],
    nightThoughts: [
      'Nobody since half nine. The shelf has never looked better.',
      'The fridge is the loudest thing in the building.',
      'I have put the minis in size order. Nobody will ever know.',
      'Sunrise turns the whole wall pink. Worth the shift.',
    ],
    complaints: [
      'Take a basket, take a jar, take a breath.',
      'I am right here. I have been right here.',
      'You can just say hello, you know.',
      'The register makes that noise if you keep going.',
    ],
    currentTask: 'Facing the front shelf',
    productId: 'strawberry',
    status: 'On shift',
    stats: KEEPER_STATS('The strawberry line'),
    appearance: {
      skin: '#f0c6a4',
      hair: '#4a3a30',
      cap: '#e2445c',
      accent: '#6ab04c',
      hairStyle: 'high-bun',
      headwear: 'strawberry-clip',
      uniform: '#fbfaf7',
      trousers: '#f6c6d2',
      shoes: '#fdfaf4',
      sling: '#4a4038',
      motif: 'berry',
      eyes: 'round',
      outfit: 'mart',
    },
    roam: SHOP_BEAT,
  },
  {
    id: 'kiko',
    name: 'Kiko',
    role: 'SB Mart Keeper',
    emoji: '🐱',
    personality: 'Brisk, deadpan, always slightly cold',
    dialogue: [
      'Evening. Baskets are by the door.',
      'The red ones are mine. Professionally speaking.',
      'If it is not on the wall, it is not in the back either.',
    ],
    thoughts: [
      'This hat is not regulation. Nobody has said anything.',
      'Cold cabinet is a degree warm. I will mention it. I will forget.',
      'Oyen looked at me. I looked back. He won.',
      'Somebody asked if we do coffee. We do not do coffee.',
      'Float counted. Float counted again. Same number.',
      'My tail took a mini off the end cap. Nobody saw.',
      'The door has stopped sighing. That is new.',
      'Two left of the matcha. I will not say that out loud.',
      'Wipe the counter, flip the record, count the float.',
      'Fresh delivery smells like the factory. Everything does.',
      'I like the hour before we open best.',
      'Whoever faced this shelf did it beautifully. It was me.',
      ...SHOP_LIFE,
    ],
    nightThoughts: [
      'A shop at three in the morning is a very calm place to think.',
      'That is a taxi. That is not a customer.',
      'The chiller hums a different note after midnight.',
      'I could close for an hour and nobody would ever know.',
    ],
    complaints: [
      'I am a cat in a hat behind a till. There is nothing more to see.',
      'You have said hello nine times now.',
      'Prod the record player instead. That one at least sings.',
      'I am not going anywhere. Neither, apparently, are you.',
    ],
    currentTask: 'Minding the register',
    productId: 'blueberry',
    status: 'On shift',
    stats: KEEPER_STATS('Whoever comes'),
    appearance: {
      skin: '#fbf7f0',
      hair: '#8a5a3c',
      cap: '#d8382f',
      accent: '#fdfaf4',
      species: 'cat',
      fur: '#8a5a3c',
      muzzle: '#ffffff',
      headwear: 'beanie',
      uniform: '#fbfaf7',
      trousers: '#d8382f',
      shoes: '#f4ece1',
      sling: '#3a3430',
      tail: true,
      motif: 'drop',
      eyes: 'round',
      outfit: 'mart',
    },
    roam: SHOP_BEAT,
  },
  {
    id: 'rio',
    name: 'Rio',
    role: 'SB Mart Keeper',
    emoji: '🕶️',
    personality: 'Easy, chatty, forever about to reorganise something',
    dialogue: [
      'Hey — the new drop came up this morning, it is on the end cap.',
      'Basket? Basket. There you go.',
      'The fruit series is the one everybody photographs.',
    ],
    thoughts: [
      'These are indoor sunglasses and I stand by it.',
      'End cap looks better with the yellow at eye level.',
      'Somebody left the trolley in the middle again.',
      'The record needs flipping. In a minute.',
      'Nobody buys the yellow. I like the yellow.',
      'I could face this shelf with my eyes shut.',
      'That child pressed every lid. Every single lid.',
      'The good bags are behind the counter for the good customers.',
      'Delivery at four. Probably five.',
      'Blue sells out first and I still order the same amount.',
      'If I move the buckets forward, do they sell? They sell.',
      'One day I will get this whole wall properly straight.',
      ...SHOP_LIFE,
    ],
    nightThoughts: [
      'Nobody since half ten. Just me and the fridge.',
      'Restocked the whole wall. Took twenty minutes.',
      'Half four. The bakery van goes past at half four.',
      'A night shift is a long think with a till in front of it.',
    ],
    complaints: [
      'Friend. I have served you nine times.',
      'You can just say hello, you know.',
      'Go and press the turntable, it is more fun than me.',
      'Still here. Still the same guy.',
    ],
    currentTask: 'Building the end cap',
    productId: 'fruit-apple',
    status: 'On shift',
    stats: KEEPER_STATS('The fruit series'),
    appearance: {
      skin: '#c58a5f',
      hair: '#2c2622',
      cap: '#2b2b30',
      accent: '#7f6dc0',
      hairStyle: 'curly-crop',
      headwear: 'sunglasses',
      uniform: '#fbfaf7',
      trousers: '#2f3138',
      shoes: '#fbfaf7',
      sling: '#7f6dc0',
      motif: 'star',
      eyes: 'focused',
      outfit: 'mart',
    },
    roam: SHOP_BEAT,
  },
  {
    id: 'lulu',
    name: 'Lulu',
    role: 'SB Mart Keeper',
    emoji: '🎧',
    personality: 'Quiet, precise, humming something nobody else can hear',
    dialogue: [
      'Hello. Everything is where the sign says it is.',
      'The orange one is new. It is very good.',
      'I can hear you — the music is quiet.',
    ],
    thoughts: [
      'One song for every shelf. This one is two songs long.',
      'The mango goes first. It always goes first.',
      'Somebody put a mini back in the wrong row. It bothers me.',
      'Faced this shelf twice. Facing it again.',
      'The fridge hums a whole tone under this song.',
      'I have counted the buckets three times. Eleven.',
      'Oyen has claimed the warm patch by the register.',
      'Rain on the door. The mat will have opinions.',
      'The lab smells sweeter at night.',
      'I will flip the record. After this one.',
      'Two tubs of matcha and a whole shift to sell them.',
      'Everything on this wall is in size order now.',
      ...SHOP_LIFE,
    ],
    nightThoughts: [
      'The shop at four is the best room in the building.',
      'One customer since midnight. He bought nothing. Lovely man.',
      'Whoever restocks at four does it beautifully.',
      'Twenty minutes and the day lot walk in complaining about the cold.',
    ],
    complaints: [
      'I can hear you. The headphones are not that loud.',
      'You have said hello nine times.',
      'There is a cat. Say hello to the cat.',
      'I am counting. You are not helping.',
    ],
    currentTask: 'Counting the wall',
    productId: 'peach',
    status: 'On shift',
    stats: KEEPER_STATS('The quiet hours'),
    appearance: {
      skin: '#fdf8f2',
      hair: '#fdf8f2',
      cap: '#f28ba8',
      accent: '#fff3f6',
      species: 'bunny',
      fur: '#fdf8f2',
      muzzle: '#ffffff',
      headwear: 'headphones',
      uniform: '#fbfaf7',
      trousers: '#f08b3c',
      shoes: '#fbfaf7',
      motif: 'moon',
      eyes: 'soft',
      outfit: 'mart',
    },
    roam: SHOP_BEAT,
  },
  {
    id: 'beno',
    name: 'Beno',
    role: 'SB Mart Keeper',
    emoji: '🐻',
    personality: 'Slow, kind, takes the long way round the shop',
    dialogue: [
      'Take your time. Nobody is behind you.',
      'The buckets are heavier than they look. I will carry it.',
      'If you cannot reach it, that is what I am for.',
    ],
    thoughts: [
      'Everything on the top shelf is my job. Fine by me.',
      'The trolley goes back by the door. Every time.',
      'Somebody has stacked the buckets four high again.',
      'I like the hour before we open.',
      'Cold cabinet is humming happily today.',
      'The flower on this cap was a present.',
      'Three crates up from the lab. I will do it in two.',
      'Oyen sat on the receipt roll. Again.',
      'A shop is just shelves and good manners.',
      'Whoever faced the minis put the yellow at the back.',
      'The door sighs when it is about to rain.',
      'Slow morning. Nice morning.',
      ...SHOP_LIFE,
    ],
    nightThoughts: [
      'Nobody in since eleven. The shelves have never been straighter.',
      'The fridge and I are the only ones talking.',
      'Restocked the wall twice, out of habit.',
      'Sunrise comes in across the floor at half five.',
    ],
    complaints: [
      'That is nine hellos. I counted.',
      'I am right here, friend.',
      'There is a whole shop behind you.',
      'Go on — go and say hello to the cat.',
    ],
    currentTask: 'Restocking the top shelf',
    productId: 'boba-blue',
    status: 'On shift',
    stats: KEEPER_STATS('The heavy lifting'),
    appearance: {
      skin: '#8a5a3c',
      hair: '#8a5a3c',
      cap: '#6b7a4a',
      accent: '#fdfaf4',
      species: 'bear',
      fur: '#7a4d31',
      muzzle: '#c99a6c',
      headwear: 'flower-cap',
      uniform: '#fbfaf7',
      trousers: '#6b7a4a',
      shoes: '#fbfaf7',
      sling: '#55633c',
      motif: 'leaf',
      eyes: 'round',
      outfit: 'mart',
    },
    roam: SHOP_BEAT,
  },
  {
    id: 'nino',
    name: 'Nino',
    role: 'SB Mart Keeper',
    emoji: '🐧',
    personality: 'Formal, delighted by deliveries, runs the stockroom like a flight deck',
    dialogue: [
      'Good evening. The shop is fully stocked and ready.',
      'Deliveries land at four. I will be here.',
      'Everything on that wall left the lab this morning.',
    ],
    thoughts: [
      'Stock check complete. All present.',
      'The crate from the lab came up beautifully packed.',
      'These goggles are for the cold store. Mostly.',
      'Four minutes to face the whole wall. A record.',
      'Oyen is in the delivery crate. Of course he is.',
      'Two left of the mango. Noted. Logged.',
      'The register makes that noise when it is thinking.',
      'Every shelf faced, every label forward.',
      'The cold cabinet is my favourite part of this building.',
      'Somebody asked whether the penguin was a costume.',
      'The good bags stay behind the counter. Standard procedure.',
      'Wipe the counter, flip the record, count the float.',
      ...SHOP_LIFE,
    ],
    nightThoughts: [
      'Night watch. Nothing to report.',
      'The cold store hums when it is cold. I like it.',
      'Restock at four. I am ready at half three.',
      'A quiet shop is a well-run shop.',
    ],
    complaints: [
      'You have greeted me nine times. Logged.',
      'I am at my post. I remain at my post.',
      'There is a cat, a machine, and a whole wall of slime.',
      'Understood. Hello. Again.',
    ],
    currentTask: 'Checking the delivery',
    productId: 'matcha',
    status: 'On shift',
    stats: KEEPER_STATS('The four o\'clock delivery'),
    appearance: {
      skin: '#35383f',
      hair: '#35383f',
      cap: '#6f6a8a',
      accent: '#c8cdd6',
      species: 'penguin',
      fur: '#35383f',
      muzzle: '#fdfaf4',
      headwear: 'aviator',
      uniform: '#fbfaf7',
      trousers: '#7b6ea8',
      shoes: '#f0a13a',
      sling: '#7b6ea8',
      motif: 'parcel',
      eyes: 'round',
      outfit: 'mart',
    },
    roam: SHOP_BEAT,
  },
];

/**
 * Bibi, the floor supervisor.
 *
 * Described with the same record as everyone else so the hover card, the detail
 * panel, the thought bubbles and the eight-pokes-and-he-complains counter all
 * work with no special case — but kept out of both crews, because those lists
 * are what the Lab swaps at the handover, and Bibi does not get swapped. He
 * covers both shifts. He has mentioned this.
 *
 * His corridor is the one that touches everyone else's: down past the mixer, out
 * along the front of the benches, and round to the end of the line. A
 * supervisor's beat is other people's workplaces.
 */
export const BIBI: WorkerData = {
  id: 'bibi',
  name: 'Bibi',
  role: 'Floor Supervisor',
  emoji: '🍋',
  personality: 'Encouraging, thorough, quietly anxious about the schedule',
  dialogue: [
    'Everything on this side is running lovely.',
    'Do not mind me. Carry on. Pretend I am not here.',
    'Just having a look at the numbers.',
  ],
  thoughts: [
    'The mixer is ahead of the board again.',
    'Nobody has signed the morning sheet.',
    'That belt sounds half a tone lower than yesterday.',
    'Two rejects. Two is fine. Two is normal.',
    'I should stand somewhere less in the way.',
    'Somebody is going to run out of tape by three.',
    'Everything green. Everything green. Everything green.',
    'Is the tunnel meant to click like that?',
    'Good batch. I will tell them. In a minute.',
    'Four checks done, one to go, then the sheet.',
    'The floor is tidier than it was on Monday.',
    'Nobody needs me right now, which is the point.',
    'I have been standing here a while.',
    'They work better when I am not watching. I know.',
    'Right. One more lap.',
    'Filling is at the west end now and I still walk to the old spot.',
    'The break table has moved and I keep turning the wrong way.',
    'Eleven checks. I would like to get to fifteen.',
    'If I ask how it is going, it stops going.',
    'The clipboard is mostly for my hands.',
    'Handover in twenty minutes and the sheet is half done.',
    'That pallet is one row from clearing itself.',
    'Somebody has finally fixed the wobble on the QC stool.',
    'Praise on the floor, notes on the sheet. Never the other way round.',
    'A quiet line and a full trolley. That is a good afternoon.',
    'I will count the crates once more and then stop counting crates.',
    'Everybody is exactly where they should be. Suspicious.',
    'Note: order more of the wide tape.',
    'The greenhouse lights are on a minute late again.',
    'It is going well. I am allowed to think that.',
    ...FACTORY_LIFE,
  ],
  nightThoughts: [
    'Two crews, one supervisor. I have raised this.',
    'The night lot barely need me and they know it.',
    'The building is a different building after midnight.',
    'Belt sounds cleaner at night. Cooler bearings, probably.',
    'Nobody has signed the night sheet either.',
    'Three in the morning and everything is green.',
    'I like this shift. I would not say that in daylight.',
    'The day crew will find the floor exactly as they left it. Better.',
    'One lap, then the tally, then the other lap.',
    'The tunnel clicks less when the room is cold.',
    'Somebody made tea and did not tell me. Fair enough.',
    'Handover at six. Sheet by half five. Easy.',
    'Nothing has gone wrong for four hours. That is when it goes wrong.',
    'The neon is the brightest thing in here now.',
    'Night tally is ahead of the morning tally. I will mention it. Gently.',
    'They work slower and better. I have written that down.',
    'I should go home. I say that every night.',
    'The greenhouse lamps make the whole west wall pink.',
    'Two rejects all night. Two.',
    'Quiet enough to hear the mixer change note from here.',
    'Somebody should tell them the pallet is nearly full. It is me. I am somebody.',
    'The floor is warm where the belt runs. I never noticed in the day.',
    'Right. One more lap and then the sheet.',
  ],
  complaints: [
    'I am in the middle of an inspection, if you do not mind.',
    'Every time you do that I lose count.',
    'There is a form for this. There is a form for everything.',
    'Nine. I counted nine. I count things for a living.',
  ],
  currentTask: 'Walking the floor',
  productId: 'strawberry',
  status: 'On the floor',
  stats: [
    { label: 'Checks today', value: '11' },
    { label: 'Clipboard', value: 'Yes' },
    { label: 'Shift', value: 'Both of them' },
  ],
  appearance: { skin: '#f6d97a', hair: '#7fb35f', cap: '#f3d78c' },
  /*
    His beat runs along the *south* side of the bench line — behind the desks,
    from the room's point of view — rather than up the working lane between the
    benches and the belt. That lane is eight hundred millimetres wide and the
    people whose desks those are need all of it; a supervisor standing in it to
    look at a clipboard is exactly the thing a supervisor should not be doing.
    So he watches QC and labelling from behind, over their shoulders, which is
    also the more truthful picture of the job.
  */
  roam: {
    lane: [
      [-2.6, -1.8],
      [-1.6, 0.2],
      [-1.2, 1.6],
      [-1.0, 2.75],
      [0.3, 1.5],
      [1.4, 1.3],
      [2.75, 1.3],
      [3.9, 0.7],
      [5.2, 0.5],
      [...STAND.eastLane],
      // the turn in from which the break corner is reached, clear of both the
      // pallet to the east and the packer's stool to the west
      [6.0, 1.6],
    ],
    stops: [
      {
        id: 'mixing',
        at: [-2.6, -1.8],
        node: 0,
        facing: -2.87,
        dwell: [4, 7],
        action: 'inspect',
        weight: 2,
      },
      { id: 'floor', at: [-1.6, 0.2], node: 1, dwell: [2, 4], action: 'idle' },
      {
        // in front of the packaging tunnel, on the open floor south of it
        id: 'packing',
        at: [-1.0, 2.75],
        node: 3,
        facing: 0,
        dwell: [3.5, 6],
        action: 'inspect',
      },
      {
        // behind the QC desk, looking over it at the belt
        id: 'qc',
        at: [1.4, 1.3],
        node: 5,
        facing: 0,
        dwell: [4, 7],
        action: 'inspect',
        weight: 2,
      },
      {
        id: 'labelling',
        at: [2.75, 1.3],
        node: 6,
        facing: 0,
        dwell: [3.5, 6],
        action: 'inspect',
      },
      {
        // the gap between the break corner and the pallet, watching the arm work
        id: 'dispatch',
        at: [5.9, 2.0],
        node: 10,
        facing: 0.74,
        dwell: [3.5, 6],
        action: 'idle',
      },
      {
        /*
          He does sit down, occasionally. One stop in eight, which is about right
          for somebody whose own description of the job is that nobody needs him
          right now — and it is the only time all day he is not walking.
        */
        id: 'break',
        at: [BREAK_SEATS.supervisor[0], BREAK_SEATS.supervisor[1]],
        node: 10,
        facing: BREAK_SEATS.supervisor[2],
        dwell: [10, 17],
        action: 'sit',
      },
    ],
  },
};

/**
 * Whoever is on the till in SB Mart at this hour.
 *
 * Two of the six are named each day — one for the day shift, one for the night —
 * and the pair moves on every morning, so all six come round inside three days
 * and nobody is ever on both halves of one day.
 *
 * The rota turns over at five in the morning rather than at midnight, because a
 * night that began yesterday evening belongs to yesterday's rota: without that,
 * whoever you were talking to at the counter would change into somebody else at
 * twelve o'clock while you watched.
 */
function rosterDay(now: Date): number {
  const local = now.getTime() - now.getTimezoneOffset() * 60_000;
  return Math.floor((now.getHours() < 5 ? local - 86_400_000 : local) / 86_400_000);
}

export const martCashier = (crew: Crew, now = new Date()): WorkerData => {
  const slot = rosterDay(now) * 2 + (crew === 'night' ? 1 : 0);
  const count = MART_CASHIERS.length;
  return MART_CASHIERS[((slot % count) + count) % count];
};

/**
 * The other one on the floor.
 *
 * Two keepers are in the shop at once, and rather than invent a seventh
 * character this is the roster's next name — whoever has the other half of the
 * day — walking their own beat instead of the register's. The roster steps by
 * one each shift, so these two are never the same person.
 */
export const martFloorCashier = (crew: Crew, now = new Date()): WorkerData => ({
  ...martCashier(crew === 'night' ? 'day' : 'night', now),
  roam: SHOP_FLOOR_BEAT,
});

/** The three on the line for a given shift. */
export const crewWorkers = (crew: Crew): WorkerData[] =>
  crew === 'night' ? NIGHT_WORKERS : DAY_WORKERS;

/** Everyone the Lab simulates on a given shift: the three on the line, plus Bibi. */
export const labCast = (crew: Crew): readonly WorkerData[] => [...crewWorkers(crew), BIBI];

/** The day crew's cast, which is what the world falls back to. */
export const LAB_CAST: readonly WorkerData[] = labCast('day');

const EVERYONE = [...DAY_WORKERS, ...NIGHT_WORKERS, ...MART_CASHIERS, BIBI];

export function getWorker(id: string | null | undefined): WorkerData | null {
  if (!id) return null;
  return EVERYONE.find((worker) => worker.id === id) ?? null;
}
