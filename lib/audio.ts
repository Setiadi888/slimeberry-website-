'use client';

import { createStore, useStore } from './store';

/**
 * All of Slimeberry's sound, synthesised.
 *
 * There are no audio files and no dependency here: the shop tune, the footsteps
 * and the characters' mumbling are all built from oscillators and a noise burst
 * through the Web Audio API. That matters for this project specifically — the
 * whole world is procedural geometry with nothing to fetch, and a few hundred
 * kilobytes of music would be the single largest thing the page downloads.
 *
 * The voices are a *style* of gibberish speech, not anybody's recordings: one
 * short pitched blip per letter, which is the trick every mumbling-character
 * game uses. Nothing is sampled from anywhere.
 *
 * Nothing is created until the visitor turns sound on, because browsers refuse
 * to start an AudioContext without a gesture anyway.
 */

interface AudioState {
  /** Whether a tune is playing at all. */
  music: boolean;
  /** Which tune. Remembered across visits even though playing is not. */
  track: TrackId;
  /** Footsteps, voices, the door, the till. */
  effects: boolean;
  /** False until the stored preference has been read. */
  ready: boolean;
}

const store = createStore<AudioState>({
  music: false,
  track: 'shop',
  effects: false,
  ready: false,
});

const anyOn = (state: AudioState) => state.music || state.effects;

const KEY = 'slimeberry.sound.v1';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;

/* --------------------------------------------------------------- foundation */

function ensureContext(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;

  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(ctx.destination);

  musicBus = ctx.createGain();
  musicBus.gain.value = 0.62;
  musicBus.connect(master);

  sfxBus = ctx.createGain();
  sfxBus.gain.value = 1;
  sfxBus.connect(master);

  // one second of noise, reused for every footstep
  const frames = ctx.sampleRate;
  noiseBuffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const channel = noiseBuffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) channel[i] = Math.random() * 2 - 1;

  return ctx;
}

/* -------------------------------------------------------------------- music */

/**
 * Three original tunes, all synthesized locally.
 *
 * Each one schedules its own bars a second and a half ahead of the audio clock,
 * so what plays is generated as you listen and never loops exactly — the chords
 * come round, the notes on top of them do not. They are written as two different
 * hours of the same building: the shop tune is the place open and busy, the
 * lo-fi one is the same room at two in the morning with the line idling.
 *
 * Only one runs at a time. Switching is a half-second crossfade rather than a
 * cut, because the outgoing track has up to 1.5s of notes already scheduled and
 * there is no un-scheduling them — what there is, is a gain node of its own to
 * fade them away into.
 */
export type TrackId = 'shop' | 'lofi' | 'classic';

export interface TrackInfo {
  id: TrackId;
  name: string;
  hint: string;
}

export const TRACKS: readonly TrackInfo[] = [
  { id: 'shop', name: 'Shop tune', hint: 'Bright, unhurried' },
  { id: 'lofi', name: 'Lo-fi', hint: 'Slow beat, soft rain' },
  { id: 'classic', name: 'Little Root', hint: 'Ocarina and bells, village morning' },
];

const midi = (semitones: number) => 55 * 2 ** (semitones / 12);

let musicTimer: ReturnType<typeof setInterval> | null = null;
let nextBarAt = 0;
let barIndex = 0;
/** Which track the scheduler is currently filling bars for. */
let playing: TrackId | null = null;
/** The running track's own fader, so it can be faded out from under its own
 *  already-scheduled notes. Null whenever nothing is playing. */
let trackGain: GainNode | null = null;
/** The lo-fi track's rain: one looping noise source and the LFO that swells it. */
let rain: { source: AudioBufferSourceNode; swell: OscillatorNode } | null = null;

function voice(
  type: OscillatorType,
  freq: number,
  at: number,
  duration: number,
  peak: number,
  bus: GainNode,
  glideTo?: number,
) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), at + duration);

  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + Math.min(0.06, duration * 0.3));
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  osc.connect(gain);
  gain.connect(bus);
  osc.start(at);
  osc.stop(at + duration + 0.03);
}

/* ----------------------------------------------------------- track: the shop */

/** Four bars, as semitone offsets from A1. Warm, unhurried, faintly nostalgic. */
const SHOP_PROGRESSION = [
  { root: 5, chord: [0, 4, 7, 11] }, // Fmaj7
  { root: 0, chord: [0, 4, 7, 9] }, // C6
  { root: 2, chord: [0, 3, 7, 10] }, // Dm7
  { root: -2, chord: [0, 4, 7, 11] }, // Bbmaj7
] as const;

/** Pentatonic degrees the melody is allowed to use. */
const PENTATONIC = [0, 2, 4, 7, 9, 12, 14];

const SHOP_BEAT = 60 / 68;
const SHOP_BAR = SHOP_BEAT * 4;

function scheduleShopBar(at: number, index: number) {
  const bus = trackGain;
  if (!ctx || !bus) return;
  const { root, chord } = SHOP_PROGRESSION[index % SHOP_PROGRESSION.length];

  // pad — the chord, held soft across the bar
  chord.forEach((interval, voiceIndex) => {
    voice('triangle', midi(root + interval + 12), at + voiceIndex * 0.02, SHOP_BAR * 0.96, 0.05, bus);
  });

  // bass — root, once, low and short
  voice('sine', midi(root - 12), at, SHOP_BEAT * 1.8, 0.11, bus);

  // melody — a few pentatonic notes, placed differently each bar so the loop
  // never announces itself, but seeded off the bar so it stays in character
  const seed = index * 2.3994;
  for (let beat = 0; beat < 4; beat += 1) {
    const roll = Math.abs(Math.sin(seed + beat * 1.7));
    if (roll < 0.42) continue;
    const degree = PENTATONIC[Math.floor(roll * PENTATONIC.length) % PENTATONIC.length];
    voice('sine', midi(root + degree + 24), at + beat * SHOP_BEAT, SHOP_BEAT * 0.7, 0.045, bus);
  }
}

/* --------------------------------------------------------------- track: lofi */

/**
 * ii-V-I-vi in C, every chord extended to the ninth. The extensions are the
 * whole genre: a plain triad sounds like a hymn, the same triad with a seventh
 * and a ninth on it sounds like a tape someone left running.
 */
const LOFI_PROGRESSION = [
  { root: 5, chord: [0, 3, 7, 10, 14] }, // Dm9
  { root: 10, chord: [0, 4, 7, 10, 14] }, // G9
  { root: 3, chord: [0, 4, 7, 11, 14] }, // Cmaj9
  { root: 0, chord: [0, 3, 7, 10, 14] }, // Am9
] as const;

const LOFI_BEAT = 60 / 74;
const LOFI_BAR = LOFI_BEAT * 4;
/** How far behind the grid the offbeat eighths sit, as a fraction of a beat. */
const LOFI_SWING = 0.055;

/**
 * One key of the felt piano.
 *
 * Two detuned oscillators rather than one, through a lowpass that closes as the
 * note decays. That pair of tricks is the entire sound: the detuning beats
 * slowly against itself the way a piano string does, and a filter that shuts
 * over half a second is what makes a synth note read as *struck* rather than
 * held. Each oscillator's detune also drifts a few cents while it sounds, which
 * is tape wow, and is the difference between warm and merely quiet.
 */
function keyNote(freq: number, at: number, duration: number, peak: number, spread = 7) {
  const bus = trackGain;
  if (!ctx || !bus) return;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 0.7;
  filter.frequency.setValueAtTime(1600, at);
  filter.frequency.exponentialRampToValueAtTime(620, at + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.035);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  filter.connect(gain);
  gain.connect(bus);

  for (const cents of [-spread, spread]) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, at);
    osc.detune.setValueAtTime(cents, at);
    osc.detune.linearRampToValueAtTime(cents * 0.45, at + duration);
    osc.connect(filter);
    osc.start(at);
    osc.stop(at + duration + 0.05);
  }
}

/** A shaped burst of the shared noise buffer — hats, rim, raindrops. */
function noiseBurst(
  at: number,
  duration: number,
  peak: number,
  type: BiquadFilterType,
  freq: number,
  q = 1,
) {
  const bus = trackGain;
  if (!ctx || !bus || !noiseBuffer) return;

  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(bus);
  // a different slice of the buffer each time, so repeated hats are not clones
  source.start(at, Math.random() * 0.5);
  source.stop(at + duration + 0.03);
}

/** Sine swept down an octave and a half in a tenth of a second. That is a kick. */
function kick(at: number, peak: number) {
  const bus = trackGain;
  if (!ctx || !bus) return;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(112, at);
  osc.frequency.exponentialRampToValueAtTime(41, at + 0.12);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.26);

  osc.connect(gain);
  gain.connect(bus);
  osc.start(at);
  osc.stop(at + 0.3);
}

function scheduleLofiBar(at: number, index: number) {
  const bus = trackGain;
  if (!ctx || !bus) return;
  const { root, chord } = LOFI_PROGRESSION[index % LOFI_PROGRESSION.length];
  const swing = LOFI_SWING * LOFI_BEAT;

  // keys — the whole chord, struck once and slightly broken, because nobody's
  // five fingers land at the same millisecond
  chord.forEach((interval, i) => {
    keyNote(midi(root + interval + 12), at + i * 0.026, LOFI_BAR * 0.9, 0.034);
  });

  // bass — the root on the one, then a lazy answer late in the bar
  voice('sine', midi(root - 12), at, LOFI_BEAT * 1.9, 0.1, bus);
  voice('sine', midi(root - 12), at + LOFI_BEAT * 2.5 + swing, LOFI_BEAT * 1.05, 0.062, bus);

  // drums — boom-bap: kick on the one and the and-of-three, rim on two and four
  kick(at, 0.16);
  kick(at + LOFI_BEAT * 2.5 + swing, 0.115);
  noiseBurst(at + LOFI_BEAT, 0.17, 0.042, 'bandpass', 1850, 0.8);
  noiseBurst(at + LOFI_BEAT * 3, 0.17, 0.042, 'bandpass', 1850, 0.8);

  // hats — eighths with the offbeats late, a couple dropped each bar
  for (let eighth = 0; eighth < 8; eighth += 1) {
    if (Math.abs(Math.sin(index * 3.11 + eighth * 2.7)) < 0.22) continue;
    const offbeat = eighth % 2 === 1;
    noiseBurst(
      at + eighth * LOFI_BEAT * 0.5 + (offbeat ? swing : 0),
      0.045,
      offbeat ? 0.011 : 0.018,
      'highpass',
      7200,
    );
  }

  // melody — two possible notes a bar and often neither. Lo-fi leaves the bar
  // mostly empty; filling it is what turns it back into the shop tune.
  const seed = index * 1.771;
  for (const beat of [1.5, 3.25]) {
    const roll = Math.abs(Math.sin(seed + beat * 2.2));
    if (roll < 0.46) continue;
    const degree = chord[Math.floor(roll * chord.length) % chord.length];
    keyNote(midi(root + degree + 24), at + beat * LOFI_BEAT + swing, LOFI_BEAT * 1.4, 0.026, 4);
  }

  // rain — a handful of near drops picked out of the sheet below. Placed at
  // random rather than on the grid, because landing on the beat is the one
  // thing rain never does, and given a narrow resonant band each so every drop
  // has a faint pitch to it: that is the difference between water on a surface
  // and a click. Quieter than anything else in the bar, deliberately.
  for (let i = 0; i < 5; i += 1) {
    noiseBurst(
      at + Math.random() * LOFI_BAR,
      0.016 + Math.random() * 0.022,
      0.004 + Math.random() * 0.005,
      'bandpass',
      1500 + Math.random() * 2300,
      2.6,
    );
  }
}

/**
 * The sheet of rain under the lo-fi track. One looping source for the whole
 * take, not a burst per drop — steady rain is a single continuous sound, and
 * the drops scheduled per bar are only the few that land close enough to hear
 * individually.
 *
 * The filtering is the whole difference between rain and the tape hiss that
 * used to sit here. Measured in octave bands, that hiss climbed all the way to
 * its peak at 8kHz — it was nothing but top end, which is exactly where the ear
 * is most sensitive, so it sat on top of the music however far it was turned
 * down. Rain heard through a window peaks in the low mids and rolls gently off
 * above 4kHz, which is what the lowpass at 2.4kHz gives; the highpass takes the
 * rumble underneath, leaving a band that sits behind the keys rather than in
 * front of them.
 *
 * Between the shape and the level it is about 13dB quieter than the hiss was,
 * and ten of those are in the band the ear cares most about.
 */
function startRain() {
  if (!ctx || !trackGain || !noiseBuffer || rain) return;

  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;

  const body = ctx.createBiquadFilter();
  body.type = 'lowpass';
  body.frequency.value = 2400;
  body.Q.value = 0.4;

  const floorCut = ctx.createBiquadFilter();
  floorCut.type = 'highpass';
  floorCut.frequency.value = 240;

  const gain = ctx.createGain();
  gain.gain.value = 0.0055;

  // Rain comes in waves. A bed held at one exact level is the thing an ear
  // locks on to and then stops being able to hear past; one that breathes over
  // twenty seconds stays underneath and reads as weather.
  const swell = ctx.createOscillator();
  swell.type = 'sine';
  swell.frequency.value = 0.048;
  const swellDepth = ctx.createGain();
  swellDepth.gain.value = 0.002;
  swell.connect(swellDepth);
  swellDepth.connect(gain.gain);
  swell.start();

  source.connect(body);
  body.connect(floorCut);
  floorCut.connect(gain);
  gain.connect(trackGain);
  source.start();

  rain = { source, swell };
}

/* ----------------------------------------------------------------- scheduler */

/* ----------------------------------------------------- track: the little root */

/**
 * Little Root: a village-morning piece, and the shop's slowest.
 *
 * Written in the idiom of a handheld-era town theme rather than lifted from one.
 * What carries the vibe is the arrangement, not a tune: a lilting six-eight, a
 * rocking root-and-fifth bass under it, a soft bell figure on the off-beats, and
 * a plain reedy lead over the top with nothing clever in it. The harmony is as
 * uncomplicated as that kind of music always is — C, F, G and the relative minor,
 * no borrowed chords, every phrase home by the eighth bar. The melody itself is
 * this shop's own.
 *
 * The track's id is still `classic`: that string is what goes into the visitor's
 * saved settings, and renaming it would quietly reset anybody who had this one
 * chosen back to the shop tune.
 */
const ROOT_EIGHTH = 60 / 168;
/** Six eighths to the bar — the sway is the whole point of the metre. */
const ROOT_BAR = ROOT_EIGHTH * 6;

/** Eight bars of plain major harmony, as semitone offsets from A1. */
const ROOT_CHORDS = [
  [3, 7, 10], // C
  [8, 12, 15], // F
  [10, 14, 17], // G
  [12, 15, 19], // Am
  [8, 12, 15], // F
  [3, 7, 10], // C
  [10, 14, 17], // G
  [3, 7, 10], // C
] as const;

/**
 * The lead, bar by bar: note, which eighth it falls on, and how many eighths it
 * holds. Mostly steps, one leap a phrase, and a long note to breathe on at the
 * end of each four bars — which is how a tune like this is built.
 */
const ROOT_MELODY: ReadonlyArray<ReadonlyArray<readonly [number, number, number]>> = [
  [[34, 0, 3], [31, 3, 1], [34, 4, 1], [36, 5, 1]],
  [[39, 0, 3], [36, 3, 1.5], [34, 4.5, 1.5]],
  [[38, 0, 1.5], [36, 1.5, 1.5], [34, 3, 1.5], [29, 4.5, 1.5]],
  [[31, 0, 3], [34, 3, 1.5], [36, 4.5, 1.5]],
  [[39, 0, 1.5], [38, 1.5, 1.5], [36, 3, 1.5], [32, 4.5, 1.5]],
  [[34, 0, 3], [31, 3, 1.5], [29, 4.5, 1.5]],
  [[29, 0, 1.5], [34, 1.5, 1.5], [38, 3, 1.5], [36, 4.5, 1.5]],
  [[39, 0, 5]],
];

function scheduleClassicBar(at: number, index: number) {
  const bus = trackGain;
  if (!ctx || !bus) return;
  const bar = index % ROOT_CHORDS.length;
  const chord = ROOT_CHORDS[bar];

  /*
    Levels were set by rendering a loop of this and a loop of the piano piece it
    replaces through an offline context and comparing them: the arrangement now
    lands at the same loudness as the track it took over from (peak 0.26 against
    0.25, RMS 0.030 against 0.034), and the lead sits level with its own
    accompaniment rather than a half under it, which is where it was when the
    parts were first balanced by eye.
  */
  // a breath of pad under the whole bar, for the lilt to sit on
  chord.forEach((note, i) => {
    voice('sine', midi(note + 12), at + i * 0.03, ROOT_BAR * 1.08, 0.03, bus);
  });

  /*
    The rocking bass. Root on the head of each half-bar and the fifth between
    them — the oom-pah that makes six-eight feel like walking rather than
    counting.
  */
  for (const eighth of [0, 3]) {
    voice('triangle', midi(chord[0]), at + eighth * ROOT_EIGHTH, ROOT_EIGHTH * 1.5, 0.105, bus);
    voice('triangle', midi(chord[0] + 7), at + (eighth + 1.5) * ROOT_EIGHTH, ROOT_EIGHTH * 1.1, 0.042, bus);
  }

  // bells on the off-eighths, a shade under the lead so they never argue with it
  [1, 2, 4, 5].forEach((eighth, i) => {
    keyNote(midi(chord[(i + 1) % chord.length] + 12), at + eighth * ROOT_EIGHTH, ROOT_EIGHTH * 2.2, i % 2 ? 0.032 : 0.042, 2);
  });

  // and the lead over the top
  for (const [note, eighth, length] of ROOT_MELODY[bar]) {
    voice('triangle', midi(note), at + eighth * ROOT_EIGHTH, length * ROOT_EIGHTH * 0.94, 0.15, bus);
  }
}

const TRACK_BAR: Record<TrackId, number> = { shop: SHOP_BAR, lofi: LOFI_BAR, classic: ROOT_BAR };
const TRACK_BARS: Record<TrackId, (at: number, index: number) => void> = {
  shop: scheduleShopBar,
  lofi: scheduleLofiBar,
  classic: scheduleClassicBar,
};

function tick() {
  if (!ctx || !playing) return;
  const bar = TRACK_BAR[playing];
  // schedule a little ahead of the clock so timing never depends on the timer
  while (nextBarAt < ctx.currentTime + 1.5) {
    TRACK_BARS[playing](nextBarAt, barIndex);
    nextBarAt += bar;
    barIndex += 1;
  }
}

function startMusic(track: TrackId) {
  const context = ensureContext();
  if (!context || !musicBus) return;
  if (musicTimer && playing === track) return;

  // fades out whatever was on, including its already-scheduled tail
  stopMusic();

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(1, context.currentTime + 0.4);
  gain.connect(musicBus);
  trackGain = gain;
  playing = track;

  if (track === 'lofi') startRain();

  nextBarAt = context.currentTime + 0.15;
  barIndex = 0;
  tick();
  musicTimer = setInterval(tick, 260);
}

function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
  playing = null;

  // Held locally: a switch starts the next track immediately, and the fade-out
  // below must never reach in and silence *that* one when it lands.
  const going = trackGain;
  const weather = rain;
  trackGain = null;
  rain = null;
  if (!going || !ctx) return;

  const now = ctx.currentTime;
  going.gain.cancelScheduledValues(now);
  going.gain.setValueAtTime(Math.max(0.0001, going.gain.value), now);
  going.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  if (weather) {
    weather.source.stop(now + 0.5);
    weather.swell.stop(now + 0.5);
  }
  setTimeout(() => going.disconnect(), 800);
}

/* ---------------------------------------------------------------- character */

export interface Voice {
  /** Multiplies every blip's pitch. Above 1 is younger/brighter. */
  pitch: number;
  timbre: OscillatorType;
}

/*
 * Pitched up and rounded off to sound cuter. The sawtooth is gone — it was
 * buzzy where the others were soft, and a rasping voice among three sweet ones
 * read as a fault rather than a character. Everyone now sits above their old
 * pitch on triangle or sine, which are the two gentlest waves available.
 */
export const VOICES: Record<string, Voice> = {
  juno: { pitch: 1.42, timbre: 'triangle' },
  caca: { pitch: 1.3, timbre: 'sine' },
  bimo: { pitch: 1.08, timbre: 'triangle' },
  dilan: { pitch: 1.2, timbre: 'sine' },
  // the night crew, each a shade lower than their opposite number on days
  nala: { pitch: 1.24, timbre: 'sine' },
  rendi: { pitch: 1.16, timbre: 'triangle' },
  tari: { pitch: 0.98, timbre: 'sine' },
  ayu: { pitch: 1.34, timbre: 'triangle' },
};

const DEFAULT_VOICE: Voice = { pitch: 1.25, timbre: 'triangle' };

/** Vowels get a longer, lower, two-tone blip; consonants a short bright one. */
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);
/** Caps on a single line, so nothing ever drones. */
const MAX_WORDS = 7;
const MAX_PHONES = 22;

let speakingUntil = 0;

/**
 * Mumbled speech.
 *
 * The first version gave every letter the same short blip, which came out as a
 * flat run of beeps that read as a sound effect rather than as talking. This
 * one borrows the three things that actually make speech legible as speech:
 *
 *  - vowels and consonants sound different — vowels are longer, lower and
 *    carry a second tone at a formant interval, consonants are short and bright;
 *  - words are separated by a real gap, so you hear where they break;
 *  - the whole line has a contour, drifting down towards a full stop and up
 *    towards a question mark.
 *
 * The pitch of each blip still comes from its own letter, so a line always
 * sounds the same and two different lines never do. It stays gibberish — there
 * are no phonemes in here — but it now has the shape of a sentence.
 */
export function speak(line: string, voiceId?: string): void {
  if (!store.get().effects) return;
  const context = ensureContext();
  if (!context || !sfxBus) return;
  // let a line finish before another starts, or hovering spams the mix
  if (context.currentTime < speakingUntil) return;

  const { pitch, timbre } = (voiceId && VOICES[voiceId]) || DEFAULT_VOICE;
  const rising = line.trim().endsWith('?');

  const words = line
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_WORDS);

  const phones = Math.min(
    MAX_PHONES,
    words.reduce((sum, word) => sum + word.length, 0),
  );
  if (phones === 0) return;

  let at = context.currentTime + 0.02;
  let spoken = 0;

  for (const word of words) {
    const letters = [...word];
    for (let index = 0; index < letters.length; index += 1) {
      if (spoken >= MAX_PHONES) break;
      const character = letters[index];
      const progress = spoken / phones;
      // statements settle, questions lift — the single clearest cue that a
      // run of noises is meant to be a sentence
      const contour = rising ? 0.94 + progress * 0.4 : 1.14 - progress * 0.32;
      // and the last blip of every word bounces up, which is the bit that
      // makes the whole thing sound sweet rather than merely legible
      const lilt = index === letters.length - 1 ? 1.12 : 1;

      const rank = character.charCodeAt(0) - 97;
      const vowel = VOWELS.has(character);
      const freq = (vowel ? 186 + rank * 5.5 : 330 + rank * 12) * pitch * contour * lilt;
      const duration = vowel ? 0.108 : 0.048;

      if (vowel) {
        // carrier plus a tone a fifth up: crude, but it is what stops a vowel
        // sounding like a beep. Vowels glide upward now instead of down — a
        // falling vowel sounds weary, a rising one sounds bright.
        voice(timbre, freq, at, duration, 0.05, sfxBus!, freq * 1.06);
        voice('sine', freq * 2, at, duration * 0.7, 0.018, sfxBus!);
      } else {
        voice(timbre, freq, at, duration, 0.032, sfxBus!, freq * 0.86);
      }

      at += duration * (vowel ? 0.8 : 0.74);
      spoken += 1;
    }
    // the gap between words, which is most of what makes it parse
    at += 0.07;
    if (spoken >= MAX_PHONES) break;
  }

  speakingUntil = at + 0.05;
}

/* ---------------------------------------------------------------- footsteps */

let lastStepAt = 0;

/** A soft scuff. Rate-limited globally so three walking workers stay pleasant. */
export function footstep(): void {
  if (!store.get().effects) return;
  const context = ensureContext();
  if (!context || !sfxBus || !noiseBuffer) return;

  const now = context.currentTime;
  if (now - lastStepAt < 0.16) return;
  lastStepAt = now;

  const source = context.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;

  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  // Down from 780Hz: the brightness was the part that read as a scuff. Muffling
  // it leaves a soft indoor footfall you notice without listening for it.
  filter.frequency.value = 340 + Math.random() * 150;

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  // a third of its old level, eased in over three times as long, and cut short
  gain.gain.exponentialRampToValueAtTime(0.016, now + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(sfxBus);
  source.start(now);
  source.stop(now + 0.075);
}

/**
 * The glass door. A band of noise swept upward for the panels running on their
 * track, then a soft knock as they reach the jamb — the two halves of the sound
 * a sliding door actually makes.
 */
export function doorSlide(): void {
  if (!store.get().effects) return;
  const context = ensureContext();
  if (!context || !sfxBus || !noiseBuffer) return;

  const now = context.currentTime;
  const run = 0.46;

  const source = context.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;

  const band = context.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 3.2;
  band.frequency.setValueAtTime(420, now);
  band.frequency.linearRampToValueAtTime(1500, now + run * 0.7);
  band.frequency.linearRampToValueAtTime(900, now + run);

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.075, now + 0.09);
  gain.gain.setValueAtTime(0.075, now + run * 0.62);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + run);

  source.connect(band);
  band.connect(gain);
  gain.connect(sfxBus);
  source.start(now);
  source.stop(now + run + 0.05);

  // the panels arriving at the jamb
  voice('sine', 168, now + run * 0.9, 0.12, 0.06, sfxBus, 96);
}

/** A short confirmation chirp, for doors and the till. */
export function chirp(high = false): void {
  if (!store.get().effects) return;
  const context = ensureContext();
  if (!context || !sfxBus) return;
  const at = context.currentTime + 0.01;
  const base = high ? 660 : 440;
  voice('sine', base, at, 0.09, 0.07, sfxBus, base * 1.5);
  voice('sine', base * 1.5, at + 0.07, 0.12, 0.05, sfxBus);
}

/**
 * One click of the radio dial: a burst of band noise with a tone buried in it.
 *
 * `signal` (0..1) is the whole sound — a weak station is nearly all hiss with a
 * wandering carrier, a strong one is a short clean chime with the noise ducked
 * right down. Nothing is sampled; the noise buffer is the same one the
 * footsteps use.
 */
export function radioTune(signal: number): void {
  if (!store.get().effects) return;
  const context = ensureContext();
  if (!context || !sfxBus || !noiseBuffer) return;

  const now = context.currentTime + 0.01;
  const clarity = Math.min(1, Math.max(0, signal));

  const source = context.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;

  // a clean station is narrow and low; a dead band is wide open and bright
  const band = context.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 900 + (1 - clarity) * 2200;
  band.Q.value = 0.7 + clarity * 2.2;

  const hiss = context.createGain();
  hiss.gain.setValueAtTime(0.0001, now);
  hiss.gain.exponentialRampToValueAtTime(0.004 + (1 - clarity) * 0.028, now + 0.02);
  hiss.gain.exponentialRampToValueAtTime(0.0001, now + 0.16 + (1 - clarity) * 0.12);

  source.connect(band);
  band.connect(hiss);
  hiss.connect(sfxBus);
  source.start(now);
  source.stop(now + 0.34);

  // the carrier: steady when locked on, sliding when it is not
  const carrier = context.createOscillator();
  carrier.type = 'sine';
  const pitch = 380 + clarity * 260;
  carrier.frequency.setValueAtTime(pitch * (1 + (1 - clarity) * 0.35), now);
  carrier.frequency.exponentialRampToValueAtTime(pitch, now + 0.1);

  const tone = context.createGain();
  tone.gain.setValueAtTime(0.0001, now);
  tone.gain.exponentialRampToValueAtTime(0.006 + clarity * 0.03, now + 0.015);
  tone.gain.exponentialRampToValueAtTime(0.0001, now + 0.1 + clarity * 0.14);

  carrier.connect(tone);
  tone.connect(sfxBus);
  carrier.start(now);
  carrier.stop(now + 0.3);
}

let lastMeowAt = 0;

/**
 * Oyen, who does not talk in blips.
 *
 * The workers' voices are one short pitched blip per letter, which is the
 * mumbling-character trick and completely wrong for a cat — using it on him
 * would make him staff. A meow is a single vowel that *moves*: the pitch rises
 * and falls while the mouth opens from "ee" to "ow". So it is two envelopes
 * running at once, one on the oscillators and one on a bandpass standing in for
 * the mouth, and it is the filter sweep that does most of the work. The
 * sawtooth under the triangle is the rasp, and the vibrato arriving late is
 * what stops it sounding like a slide whistle.
 */
export function meow(): void {
  if (!store.get().effects) return;
  const context = ensureContext();
  if (!context || !sfxBus) return;

  const now = context.currentTime;
  // he will answer once, not once per pixel the cursor crosses
  if (now - lastMeowAt < 0.6) return;
  lastMeowAt = now;

  // a little spread each time, so he is not a doorbell
  const pitch = 520 + Math.random() * 120;
  const length = 0.42 + Math.random() * 0.14;

  const out = context.createGain();
  out.gain.setValueAtTime(0.0001, now);
  out.gain.exponentialRampToValueAtTime(0.052, now + 0.05);
  out.gain.setValueAtTime(0.052, now + length * 0.45);
  out.gain.exponentialRampToValueAtTime(0.0001, now + length);
  out.connect(sfxBus);

  // the mouth, opening and closing again
  const mouth = context.createBiquadFilter();
  mouth.type = 'bandpass';
  mouth.Q.value = 3.4;
  mouth.frequency.setValueAtTime(900, now);
  mouth.frequency.exponentialRampToValueAtTime(1780, now + length * 0.3);
  mouth.frequency.exponentialRampToValueAtTime(740, now + length);
  mouth.connect(out);

  // a trickle of unfiltered tone, so the note still has a body
  const air = context.createGain();
  air.gain.value = 0.22;
  air.connect(out);

  const voices: OscillatorNode[] = [];
  for (const [type, level] of [
    ['triangle', 1],
    ['sawtooth', 0.32],
  ] as const) {
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(pitch * 0.86, now);
    osc.frequency.linearRampToValueAtTime(pitch * 1.24, now + length * 0.22);
    osc.frequency.linearRampToValueAtTime(pitch * 0.72, now + length);

    const gain = context.createGain();
    gain.gain.value = level;
    osc.connect(gain);
    gain.connect(mouth);
    gain.connect(air);
    osc.start(now);
    osc.stop(now + length + 0.06);
    voices.push(osc);
  }

  // the wobble, faded in over the tail of the note
  const vibrato = context.createOscillator();
  vibrato.frequency.value = 21;
  const depth = context.createGain();
  depth.gain.setValueAtTime(0, now);
  depth.gain.linearRampToValueAtTime(15, now + length * 0.65);
  vibrato.connect(depth);
  for (const osc of voices) depth.connect(osc.frequency);
  vibrato.start(now);
  vibrato.stop(now + length + 0.06);
}

let lastSqueakAt = 0;

/**
 * Bibi, who is a squeaky toy with a clipboard.
 *
 * Neither the workers' mumble nor the cat's meow: two quick sawtooth bends —
 * up, then a shorter one down — through a bandpass that follows the pitch. That
 * shape is what a rubber toy does when it is squeezed and lets go, and it is
 * the whole joke. Short on purpose; a supervisor who honks for a second every
 * time the cursor grazes him stops being funny by the third time.
 */
export function squeak(): void {
  if (!store.get().effects) return;
  const context = ensureContext();
  if (!context || !sfxBus) return;

  const now = context.currentTime;
  if (now - lastSqueakAt < 0.55) return;
  lastSqueakAt = now;

  /** One bend: a saw sweeping between two pitches, filtered along with it. */
  const bend = (at: number, from: number, to: number, length: number, level: number) => {
    const osc = context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(to, at + length);

    const throat = context.createBiquadFilter();
    throat.type = 'bandpass';
    throat.Q.value = 5.5;
    throat.frequency.setValueAtTime(from * 2.2, at);
    throat.frequency.exponentialRampToValueAtTime(to * 2.2, at + length);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);

    osc.connect(throat);
    throat.connect(gain);
    gain.connect(sfxBus!);
    osc.start(at);
    osc.stop(at + length + 0.03);
  };

  // a little spread, so he is not a doorbell either
  const base = 400 + Math.random() * 90;
  bend(now + 0.01, base, base * 2.15, 0.11, 0.042);
  bend(now + 0.14, base * 1.85, base * 1.15, 0.09, 0.032);
}

/**
 * Notes the wall is allowed to make, as semitones over middle C.
 *
 * A major pentatonic across two octaves, which is the whole trick: there is no
 * interval in it that can clash with another, so running a cursor along a row of
 * elements plays something that sounds composed rather than random. It is the
 * same reason wind chimes are tuned this way.
 */
const SOFT_SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];

let lastHoverAt = 0;

/**
 * One element passing under the cursor.
 *
 * Deliberately below the level of the room: a soft sine with a slow attack and a
 * long tail, a quieter octave above it for shimmer, and the whole thing rolled
 * off at two kilohertz so there is no edge on it. Rate limited, because a cursor
 * dragged across a row would otherwise fire fifteen of these a second and the
 * soothing thing would become a swarm.
 */
export function elementHover(step: number): void {
  if (!store.get().effects) return;
  const context = ensureContext();
  if (!context || !sfxBus) return;

  const now = context.currentTime;
  if (now - lastHoverAt < 0.05) return;
  lastHoverAt = now;

  const semitones = SOFT_SCALE[Math.abs(Math.round(step)) % SOFT_SCALE.length];
  const root = 261.63 * 2 ** (semitones / 12);

  const soften = context.createBiquadFilter();
  soften.type = 'lowpass';
  soften.frequency.value = 2000;
  soften.Q.value = 0.6;

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.02, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);

  soften.connect(gain);
  gain.connect(sfxBus);

  [
    { freq: root, type: 'sine' as OscillatorType, level: 1 },
    { freq: root * 2, type: 'sine' as OscillatorType, level: 0.32 },
  ].forEach(({ freq, type, level }) => {
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const trim = context.createGain();
    trim.gain.value = level;
    osc.connect(trim);
    trim.connect(soften);
    osc.start(now);
    osc.stop(now + 0.68);
  });
}

/**
 * The sound of something clicking into place.
 *
 * Four notes of a major arpeggio, each a little softer than the last. Kept
 * deliberately small — this is a wall puzzle in the corner of a factory, not a
 * level completing.
 */
export function puzzleChime(): void {
  if (!store.get().effects) return;
  const context = ensureContext();
  if (!context || !sfxBus) return;

  const now = context.currentTime;
  [0, 4, 7, 12].forEach((semitones, index) => {
    const at = now + index * 0.08;
    const osc = context.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 523.25 * 2 ** (semitones / 12);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.05 - index * 0.007, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.44);

    osc.connect(gain);
    gain.connect(sfxBus!);
    osc.start(at);
    osc.stop(at + 0.48);
  });
}

/* ------------------------------------------------------------------ control */

function fadeMaster(to: number) {
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), now);
  master.gain.exponentialRampToValueAtTime(Math.max(0.0001, to), now + 0.5);
}

/**
 * Applies a change. Must run from a user gesture the first time, because that
 * is the only moment a browser will let an AudioContext start.
 */
function apply(next: AudioState): void {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ music: next.music, effects: next.effects, track: next.track }),
    );
  } catch {
    // preference simply will not survive a reload
  }

  if (!anyOn(next)) {
    fadeMaster(0.0001);
    stopMusic();
    return;
  }

  const context = ensureContext();
  if (!context) return;
  void context.resume();
  fadeMaster(0.5);

  if (next.music) startMusic(next.track);
  else stopMusic();
}

export function setMusicEnabled(music: boolean): void {
  let next: AudioState | null = null;
  store.set((state) => {
    if (state.music === music) return state;
    next = { ...state, music };
    return next;
  });
  if (next) apply(next);
}

export function setEffectsEnabled(effects: boolean): void {
  let next: AudioState | null = null;
  store.set((state) => {
    if (state.effects === effects) return state;
    next = { ...state, effects };
    return next;
  });
  if (next) apply(next);
}

/**
 * Picks a tune. If one is already playing it crossfades; if the music is off it
 * stays off, because choosing a station is not the same as pressing play.
 */
export function setTrack(track: TrackId): void {
  let next: AudioState | null = null;
  store.set((state) => {
    if (state.track === track) return state;
    next = { ...state, track };
    return next;
  });
  if (next) apply(next);
}

export const toggleMusic = () => setMusicEnabled(!store.get().music);
export const toggleEffects = () => setEffectsEnabled(!store.get().effects);

/** Turns the lot off — what the header's mute does. */
export function muteAll(): void {
  const next: AudioState = { ...store.get(), music: false, effects: false };
  store.set(() => next);
  apply(next);
}

/**
 * Reads the stored preference after mount. It deliberately does not switch
 * sound on by itself even if it was on last time — a page that starts making
 * noise on load is the thing everybody hates — it only marks the toggle as
 * knowing its previous state.
 */
export function hydrateSound(): void {
  if (store.get().ready) return;

  // The *choice* of tune comes back; whether it was playing deliberately does
  // not. Restoring the track costs a visitor nothing if they never press play,
  // and saves the ones who did from re-picking it every time.
  let track: TrackId = 'shop';
  try {
    const raw = window.localStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as { track?: unknown }) : null;
    if (TRACKS.some((option) => option.id === saved?.track)) track = saved!.track as TrackId;
  } catch {
    // no stored preference, or unreadable storage; the default stands
  }

  store.set((state) => ({ ...state, track, ready: true }));
}

export function stopSound(): void {
  stopMusic();
  fadeMaster(0.0001);
}

export const useMusicEnabled = () => useStore(store, (state) => state.music);
export const useTrack = () => useStore(store, (state) => state.track);
export const useEffectsEnabled = () => useStore(store, (state) => state.effects);
/** True when anything at all is audible — what the header icon reflects. */
export const useSoundEnabled = () => useStore(store, (state) => state.music || state.effects);
export const isSoundEnabled = () => anyOn(store.get());
