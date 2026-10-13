'use client';

import { createStore, useStore } from './store';
import { INDONESIAN_RADIO } from './radioHistory';

/**
 * The set by the door.
 *
 * Its dial runs a hundred years and every one of them says something different.
 * That is the whole design: a band where three years in a row give you the same
 * line is a band you stop turning, and the only reason to put a dial on a radio
 * is to reward turning it.
 *
 * The shape of the century is fixed. The bottom is dead air with real bulletins
 * drifting through it from a long way off — the years before any of this was
 * invented, when the only thing on the band was the world getting on with
 * itself. It warms into ordinary radio, which turns nostalgic simply by being
 * far enough away. 2026 is the Lab. Then the Lab's own years, mostly overheard
 * as two people talking. And then it gets quiet, and then it gets strange, and
 * by the time the dial is red the thing in the tanks has started answering.
 *
 * Every year returns the same transmission every time. A radio you can re-tune
 * to is a place; a radio that says something new each time is a slot machine.
 */
export const RADIO_MIN = 1990;
export const RADIO_MAX = 2090;
export const RADIO_START = 2026;

/** One or two lines. A second line is an afterthought, and reads quieter. */
export type Lines = [string] | [string, string];

export interface Transmission {
  source?: string;
  sourceName?: string;
  /** What the dial reckons it has found. */
  station: string;
  /** 0..1 clarity. Drives the static, the bars and how readable the type is. */
  signal: number;
  lines: Lines;
  tint: string;
}

interface Era {
  from: number;
  to: number;
  station: string;
  signal: number;
  tint: string;
}

/*
  Station, strength and colour come from the era; the words come from the year.
  The tint ramp is the story in one column: grey, then the warm middle of the
  century, then green for the Lab, then blue for the machines that replaced its
  night shift, and then pink deepening to red as the thing being made stops
  being a product.
*/
const ERAS: Era[] = [
  { from: 1990, to: 1997, station: 'EMPTY BAND', signal: 0.06, tint: '#9aa0ad' },
  { from: 1998, to: 2004, station: 'TEST PATTERN', signal: 0.18, tint: '#9aa0ad' },
  { from: 2005, to: 2012, station: 'NIGHT SHOW', signal: 0.36, tint: '#b3a4e0' },
  { from: 2013, to: 2019, station: 'CORNER SHOP FM', signal: 0.58, tint: '#f3d78c' },
  { from: 2020, to: 2025, station: 'LOCAL · 1 MW', signal: 0.72, tint: '#8ed0e8' },
  { from: 2026, to: 2026, station: 'SB-01 · SLIMEBERRY LAB', signal: 1, tint: '#8cb63c' },
  { from: 2027, to: 2029, station: 'SB-01', signal: 0.93, tint: '#8cb63c' },
  { from: 2030, to: 2030, station: 'SB-02 · AUTOMATION', signal: 1, tint: '#4e9fbe' },
  { from: 2031, to: 2044, station: 'SB NETWORK', signal: 0.86, tint: '#4e9fbe' },
  { from: 2045, to: 2064, station: 'UNLISTED', signal: 0.62, tint: '#e4738f' },
  { from: 2065, to: 2084, station: 'CARRIER · SOURCE UNKNOWN', signal: 0.4, tint: '#d94f75' },
  { from: 2085, to: 2089, station: '—', signal: 0.24, tint: '#c2333f' },
  { from: 2090, to: 2090, station: 'ALL BANDS', signal: 1, tint: '#c2333f' },
];

/*
  One entry per year, 1990 to 2090.

  The historical years are read the way a bulletin actually reads them — flat,
  slightly late, and more interested in the human detail than the significance.
  They are real events, kept to ones worth hearing about on a shop radio; the
  years in between are the band itself, or somebody leaving a microphone open.
*/
const TRANSMISSIONS: Record<number, Lines> = {
  // ---- dead air, with the world leaking through it ------------------------
  1990: ['A radio in a little Indonesian shop, just after the afternoon rain.', '“Kopi dulu. The next song can wait.”'],
  1991: ['“—and the Soviet Union has, as of tonight, ceased to exist.”', 'The signal folds back into hiss before the next sentence.'],
  1992: ['Carrier tone. Underneath it, very faintly, a crowd in Barcelona.'],
  1993: ['Someone is rewinding a cassette with a pencil.', '“Do not lose my place. That is the good side.”'],
  1994: ['“Your request is coming up after the break.”', 'A shopkeeper waits beside the radio with one finger on Record.'],
  1995: ['Someone testing a transmitter. They count to four and give up.'],
  1996: ['“—Atlanta. The Games. The heat.”', 'The rest is lost under a wash of static.'],
  1997: ['Rain on a tin awning. A spoon against a glass.', 'Someone asks for one more song before the shop closes.'],

  // ---- test pattern -------------------------------------------------------
  1998: ['“—two students have registered a search engine.”', '“Nobody has heard of it. Nobody will.”'],
  1999: ['“—and no, the computers will not all stop at midnight.”', 'He says probably. He says it twice.'],
  2000: ['A modem handshake. Eleven seconds of it. Then it gives up.'],
  2001: ['“—an encyclopaedia that anyone at all can edit.”', '“They are expecting vandalism. They are right.”'],
  2002: ['“—the notes and the coins are in twelve countries this morning.”'],
  2003: ['“—they have finished reading the human genome. All of it.”', 'The anchor sounds unsure what to do with that.'],
  2004: ['Shipping forecast. All of the names are wrong.'],

  // ---- the night show, where it starts sounding like memory ---------------
  2005: ['“—somebody has put a video of an elephant online.”', '“Forty people watched it. Forty.”'],
  2006: ['“—Pluto has been demoted. Letters to the usual address.”'],
  2007: ['“—a telephone with no buttons on it at all.”', '“He held it up like a man holding up a fish.”'],
  2008: ['A song you almost know, halfway through, on a radio in another room.'],
  2009: ['“—and that was for everybody still awake.”', '“There are more of you than you think.”'],
  2010: ['Someone reading out a phone-in number. Nobody is calling.'],
  2011: ['“—they have thrown a robot the size of a car at Mars.”', '“They expect it to survive the landing.”'],
  2012: ['“—it landed. It has sent back a photograph of its own wheel.”', 'You can hear him grinning through it.'],

  // ---- corner shop FM -----------------------------------------------------
  2013: ['“—a rock came through the sky over Chelyabinsk before breakfast.”'],
  2014: ['“—we have landed on a comet. On a comet.”', '“It bounced. Twice.”'],
  2015: ['“—New Horizons went past Pluto this week.”', '“Nine years out, and it did not slow down once.”'],
  2016: ['“—two black holes met, and the shake of it reached us.”'],
  2017: ['“Bring an umbrella. That is the whole forecast. That is all I have.”'],
  2018: ['“—they have put a car in space. A red one.”', '“There is a mannequin in the driver’s seat.”'],
  2019: ['“—the first photograph of a black hole. It looks like a doughnut.”', 'He apologises for having said doughnut.'],

  // ---- local, and something on the industrial estate ----------------------
  2020: ['“—two of ours went up on a commercial rocket this morning.”', '“Everything else can wait. That was the good news.”'],
  2021: ['“—the big telescope went up on Christmas Day.”', '“Folded like a piece of origami. It has to open itself.”'],
  2022: ['“—the first pictures came back and he has stopped talking.”', 'For this presenter that is genuinely unusual.'],
  2023: ['“—a lander touched down near the Moon’s south pole.”', '“First anybody has managed it down there.”'],
  2024: ['“—the shadow crossed us this afternoon. The birds went quiet.”'],
  2025: ['“—the unit on the industrial estate. They will not say what they make.”', '“Something green. Something that moves on its own.”'],

  // ---- the Lab ------------------------------------------------------------
  2026: ['“Welcome to Slimeberry Lab.”', 'Mind the belt, mind the jars, and please do not feed the tanks.'],
  2027: ['“Batch four hundred. Juno says it is the best fold she has ever had.”'],
  2028: ['“We have taken on a cat.”', '“He has taken on the counter.”'],
  2029: ['“Second line opens in the spring. Bigger tanks. Quieter ones.”'],
  2030: ['“Slimeberry has automated slime production.”', 'The night shift is now nobody at all.'],
  2031: ['“Output is up ninety per cent.”', '“Nobody has touched a paddle in four years.”'],
  2032: ['“Did you set line three to run overnight?”', '“No. Did you?”'],
  2033: ['“—the tanks finished the batch early again.”', 'Nobody minds. Nobody says so either.'],
  2034: ['“Bimo says the belt sounds different this week.”', '“Bimo says a lot of things.”'],
  2035: ['“—line six was not on the plan. Line six is on the plan now.”'],
  2036: ['“Juno, did you label this one?”', '“That is not my handwriting.”'],
  2037: ['“—the shop has stopped ordering. The shelves fill overnight.”'],
  2038: ['“It matched the colour without being asked.”', '“That will be the sensor. That is all that is.”'],
  2039: ['“—every jar this quarter has come out within a tenth. Every one.”'],
  2040: ['“Has anyone been in the cold room?”', '“The cold room does not open from the inside.”'],
  2041: ['“—we no longer publish the recipe. There is nothing left to publish.”'],
  2042: ['“Caca has stopped running the stretch test.”', '“She says it passes before she asks it to.”'],
  2043: ['“—the night tally is higher than the day tally. It has been for a year.”'],
  2044: ['“Somebody has left a radio on down there.”', '“There is no radio down there.”'],

  // ---- unlisted: it starts having opinions --------------------------------
  2045: ['“It reads the recipe now.”', '“It has begun making suggestions.”'],
  2046: ['Room tone. Underneath it, something very large, breathing slowly.'],
  2047: ['“Please stop calling it the product.”'],
  2048: ['“It prefers the mint.”', '“It does not prefer. It cannot prefer.”'],
  2049: ['“—we have moved the tanks further apart. They were leaning.”'],
  2050: ['“—the anniversary broadcast has been postponed.”', 'No reason is given, and none is asked for.'],
  2051: ['“It has started finishing our sentences on the log sheet.”'],
  2052: ['A voice reading numbers. They are batch weights.', 'It never once stops for breath.'],
  2053: ['“Do not open the lid before it is ready.”', '“How does it tell you it is ready?”'],
  2054: ['“—the west tank has grown past its marks.”', '“We have painted new marks.”'],
  2055: ['“It knows which of us is on shift.”', '“Everyone knows which of us is on shift.”'],
  2056: ['Someone humming.', 'Then something much lower humming the same tune.'],
  2057: ['“—no visitors this month. The floor is not safe for visitors.”'],
  2058: ['“Ask it what it wants.”', '“I did. It wants more of the mint.”'],
  2059: ['“—the doors are keyed now. From the outside only.”'],
  2060: ['A long silence, with somebody breathing into it,', 'waiting for a cue that never comes.'],
  2061: ['“It has learned the jingle.”', '“It hums the jingle.”'],
  2062: ['“—the tanks have gone out to the old quarry. There was no room left.”'],
  2063: ['“Do not say the word factory near it.”', '“It does not like being called a place.”'],
  2064: ['“—production figures will no longer be released.”', 'Nor, it turns out, will anything else.'],

  // ---- carrier, source unknown: it is bigger than the building ------------
  2065: ['Not speech. A rhythm.', 'Two long, one short. Over and over and over.'],
  2066: ['Every station on the band is playing the same four notes.'],
  2067: ['“—the quarry site is green from the air. All of it is green.”'],
  2068: ['“It answered the telephone.”', '“We do not have a telephone.”'],
  2069: ['A choir, very faint, made out of one voice repeated.'],
  2070: ['“—shipping is suspended. It arrives on its own now.”'],
  2071: ['Somebody counting.', 'They reach four hundred and begin again.'],
  2072: ['“—the coast road is closed. It is not flooding.”', '“It is something else.”'],
  2073: ['The station identification plays, then repeats,', 'then repeats again, slower.'],
  2074: ['“Is anyone receiving this?”', 'A pause exactly long enough for an answer.'],
  2075: ['“—do not put it in water. We are asking.”', '“We are well past telling.”'],
  2076: ['A weather report, read carefully, for a place on no map.'],
  2077: ['“It has our voices now.”', '“It has had our voices for years.”'],
  2078: ['Static that rises and falls in time with something breathing.'],
  2079: ['“—the last of the tanks has gone. Not emptied. Gone.”'],
  2080: ['A children’s programme, word for word, from fifty years ago.', 'Nobody made it. It is simply on.'],
  2081: ['“We taught it to be sweet.”', '“We taught it to be patient.”'],
  2082: ['The carrier holds perfectly steady for four minutes', 'and says nothing at all.'],
  2083: ['“—if you are hearing this, you are further away than we are.”'],
  2084: ['Something enormous settles,', 'and the whole band shifts a semitone.'],

  // ---- it is talking to you now -------------------------------------------
  2085: ['The voice is warm, and very close, and not a person.'],
  2086: ['“we grew.”', '“thank you for the sugar.”'],
  2087: ['“you are still down there. good. stay.”'],
  2088: ['“we remember juno. she was kind to the mint.”'],
  2089: ['“we are at the door. it is a nice door.”'],
  2090: ['“STOP MAKING SLIME.”', '…please. there are enough of us now.'],
};

/** Every year is written out, so this is only ever a guard against a bad dial. */
const FALLBACK: Lines = ['Carrier tone. Nothing riding on it.'];

export function transmissionFor(year: number): Transmission {
  const era = ERAS.find((band) => year >= band.from && year <= band.to) ?? ERAS[0];
  const local = INDONESIAN_RADIO[year];
  return {
    station: local ? 'RADIO NUSANTARA · MEMORY LANE' : era.station,
    signal: local ? Math.max(.7, era.signal) : era.signal,
    tint: era.tint,
    lines: local?.lines ?? TRANSMISSIONS[year] ?? FALLBACK,
    source: local?.source,
    sourceName: local?.sourceName,
  };
}

const store = createStore<{ open: boolean; year: number }>({ open: false, year: RADIO_START });

export function setRadioOpen(open: boolean): void {
  store.set((state) => (state.open === open ? state : { ...state, open }));
}

/** Clamped to the band, so the dial cannot be run off either end. */
export function tuneRadio(year: number): void {
  const clamped = Math.min(RADIO_MAX, Math.max(RADIO_MIN, Math.round(year)));
  store.set((state) => (state.year === clamped ? state : { ...state, year: clamped }));
}

export const useRadioOpen = () => useStore(store, (state) => state.open);
export const useRadioYear = () => useStore(store, (state) => state.year);
export const readRadioYear = () => store.get().year;
