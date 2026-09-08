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
  /** The shop tune. */
  music: boolean;
  /** Footsteps, voices, the door, the till. */
  effects: boolean;
  /** False until the stored preference has been read. */
  ready: boolean;
}

const store = createStore<AudioState>({ music: false, effects: false, ready: false });

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

/** Four bars, as semitone offsets from A2. Warm, unhurried, faintly nostalgic. */
const PROGRESSION = [
  { root: 5, chord: [0, 4, 7, 11] }, // Fmaj7
  { root: 0, chord: [0, 4, 7, 9] }, // C6
  { root: 2, chord: [0, 3, 7, 10] }, // Dm7
  { root: -2, chord: [0, 4, 7, 11] }, // Bbmaj7
] as const;

/** Pentatonic degrees the melody is allowed to use. */
const PENTATONIC = [0, 2, 4, 7, 9, 12, 14];

const BPM = 68;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

const midi = (semitones: number) => 55 * 2 ** (semitones / 12);

let musicTimer: ReturnType<typeof setInterval> | null = null;
let nextBarAt = 0;
let barIndex = 0;

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

function scheduleBar(at: number, index: number) {
  if (!ctx || !musicBus) return;
  const { root, chord } = PROGRESSION[index % PROGRESSION.length];

  // pad — the chord, held soft across the bar
  chord.forEach((interval, voiceIndex) => {
    voice(
      'triangle',
      midi(root + interval + 12),
      at + voiceIndex * 0.02,
      BAR * 0.96,
      0.05,
      musicBus!,
    );
  });

  // bass — root, once, low and short
  voice('sine', midi(root - 12), at, BEAT * 1.8, 0.11, musicBus);

  // melody — a few pentatonic notes, placed differently each bar so the loop
  // never announces itself, but seeded off the bar so it stays in character
  const seed = index * 2.3994;
  for (let beat = 0; beat < 4; beat += 1) {
    const roll = Math.abs(Math.sin(seed + beat * 1.7)) ;
    if (roll < 0.42) continue;
    const degree = PENTATONIC[Math.floor(roll * PENTATONIC.length) % PENTATONIC.length];
    voice('sine', midi(root + degree + 24), at + beat * BEAT, BEAT * 0.7, 0.045, musicBus);
  }
}

function tick() {
  if (!ctx) return;
  // schedule a little ahead of the clock so timing never depends on the timer
  while (nextBarAt < ctx.currentTime + 1.5) {
    scheduleBar(nextBarAt, barIndex);
    nextBarAt += BAR;
    barIndex += 1;
  }
}

function startMusic() {
  const context = ensureContext();
  if (!context || musicTimer) return;
  nextBarAt = context.currentTime + 0.15;
  barIndex = 0;
  tick();
  musicTimer = setInterval(tick, 260);
}

function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
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
  filter.frequency.value = 780 + Math.random() * 260;

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.05, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(sfxBus);
  source.start(now);
  source.stop(now + 0.12);
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
    window.localStorage.setItem(KEY, JSON.stringify({ music: next.music, effects: next.effects }));
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

  if (next.music) startMusic();
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
  store.set((state) => ({ ...state, ready: true }));
}

export function stopSound(): void {
  stopMusic();
  fadeMaster(0.0001);
}

export const useMusicEnabled = () => useStore(store, (state) => state.music);
export const useEffectsEnabled = () => useStore(store, (state) => state.effects);
/** True when anything at all is audible — what the header icon reflects. */
export const useSoundEnabled = () => useStore(store, (state) => state.music || state.effects);
export const isSoundEnabled = () => anyOn(store.get());
