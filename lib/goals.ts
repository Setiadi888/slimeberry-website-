/**
 * What is on the chalkboard.
 *
 * One line a day, picked by the date rather than at random, so the board says
 * the same thing all day to everyone who looks at it and something else
 * tomorrow. That is the difference between a goal and a slot machine.
 *
 * They are written as they would actually be written on a factory whiteboard by
 * somebody who has been on shift a while: short, specific, and slightly cross.
 */
export const GOALS: readonly string[] = [
  'Make the squishiest squish.',
  'Zero bubbles. One exception.',
  'Stretch it until it sings.',
  'Beat yesterday for wobble.',
  'Nobody licks the mixer.',
  'Less crunch. More squelch.',
  'One perfect ribbon, please.',
  'Everything on this floor should jiggle.',
  'Fewer lids on the floor than Monday.',
  'Slower hands make softer slime.',
  'Make one you would keep.',
  'Name a colour we can spell.',
  'No slime above shoulder height.',
  'Rest the batch. Then rest.',
  'Ninety-nine jars. No heroics.',
  'The mint goes in last. Last.',
  'Somebody please label the labeller.',
  'Fold it like you mean it.',
  'One reject is a good day.',
  'Glitter stays inside the jar.',
  'Try not to invent a new colour.',
  'Softer than yesterday. Again.',
  'Finish the mango. It is watching.',
  'Nothing leaves here crooked.',
  'Count the jars. Then count them.',
  'Whoever hid the tape: today.',
  'Make one stretch a whole metre.',
  'A quiet line is a happy line.',
  'Put the scoops back. All of them.',
  'Bubbles are a choice, not weather.',
  'No purple accidents before lunch.',
  'Squish first. Paperwork after.',
];

/**
 * Today's line.
 *
 * Days are counted in the visitor's own timezone, so the board turns over at
 * their midnight rather than at UTC's — a goal that changed at eight in the
 * morning would be a bug you could watch happen.
 */
export function goalForToday(now = new Date()): string {
  const local = now.getTime() - now.getTimezoneOffset() * 60_000;
  const days = Math.floor(local / 86_400_000);
  return GOALS[((days % GOALS.length) + GOALS.length) % GOALS.length];
}
