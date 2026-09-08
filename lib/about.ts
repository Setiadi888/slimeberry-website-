'use client';

import { createStore, useStore } from './store';

/**
 * The About copy, kept as data so it can be edited without touching layout.
 *
 * `lines` blocks preserve deliberate line breaks in the poetic passages;
 * `lead` is an emphasised pivot line rather than a heading.
 */
export type AboutBlock =
  | { type: 'title'; text: string }
  | { type: 'subtitle'; text: string }
  | { type: 'lead'; text: string }
  | { type: 'para'; text: string }
  | { type: 'lines'; text: string[] };

export const ABOUT_CONTENT: AboutBlock[] = [
  { type: 'title', text: 'The Lab, Imagined.' },
  {
    type: 'para',
    text: 'The Slimeberry Factory is a world of imagination, created purely for entertainment and play.',
  },
  {
    type: 'para',
    text: 'The characters, stories, factory workers, machinery, and factory environment you see throughout the interactive experience are entirely fictional. The factory setup, production lines, workflows, and visualised production processes are imaginative interpretations created to bring the Slimeberry world to life, and should not be taken as a representation of our actual manufacturing facility or production methods.',
  },
  {
    type: 'para',
    text: 'Some production information and factory data shown throughout the experience may also be fictionalised or presented for entertainment purposes.',
  },
  { type: 'lead', text: 'But the products are real.' },
  {
    type: 'para',
    text: 'The Slimeberry products featured in the factory are based on our actual products and are rendered with care to represent their real-world appearance as accurately as possible. When you discover a product inside the factory, you can add it to your real shopping cart and purchase it directly through the website.',
  },
  {
    type: 'para',
    text: "So while the factory is imaginary, your shopping experience isn't.",
  },
  {
    type: 'para',
    text: 'Explore the factory. Meet the characters. Discover how things might be made.',
  },
  { type: 'para', text: 'Then take your favourite slime home for real.' },
  {
    type: 'lead',
    text: 'Welcome to Slimeberry, where an imaginary factory makes room for real play.',
  },

  { type: 'title', text: 'Made for the way you play.' },
  {
    type: 'para',
    text: 'Slimeberry has two rooms, and they were built for different moods.',
  },
  {
    type: 'para',
    text: 'The Lab is the big one — a whole factory floor to wander, with a belt to follow, a greenhouse to peer into, and three people who will wave back if you watch them long enough. It likes room. On a desktop you get the whole diorama at once, and space to get properly lost in it.',
  },
  { type: 'lead', text: 'SB Mart travels lighter.' },
  {
    type: 'para',
    text: 'The little shop behind the factory wall was built for a phone held in one hand. Fewer things, closer shelves, everything within reach — made for browsing on a train, in a queue, or in the four spare minutes before something else begins.',
  },
  {
    type: 'para',
    text: 'Same jars, same basket, the same SB COIN in your pocket. Only the room changes.',
  },
  { type: 'lead', text: 'And yes, you can take the Lab with you.' },
  {
    type: 'lines',
    text: ['Turn your phone sideways.', 'The Lab is happiest in landscape.'],
  },
  {
    type: 'para',
    text: 'Two rooms, one world. Walk into whichever one suits the day.',
  },

  { type: 'title', text: 'About Us' },
  { type: 'subtitle', text: 'A little play for grown-up days' },
  {
    type: 'para',
    text: 'There was a time when a little tub of slime could make an afternoon feel endless.',
  },
  {
    type: 'para',
    text: 'We remember the feeling — stretching it between our fingers, watching the colours move, discovering a new texture, and losing track of time simply because we were having fun.',
  },
  {
    type: 'para',
    text: 'Somewhere between growing up and getting on with life, we stopped making time for those little moments.',
  },
  { type: 'lead', text: 'Slimeberry was created to bring them back.' },
  {
    type: 'para',
    text: 'Made by people who genuinely love slime, we believe there is something quietly wonderful about making time to play. To slow down. To let your hands wander and your mind rest.',
  },
  {
    type: 'para',
    text: "Our slimes are little reminders that joy doesn't always have to be productive.",
  },
  {
    type: 'lines',
    text: ['Sometimes it can be soft and stretchy.', 'Sometimes colourful and messy.', 'Sometimes it can simply take you back.'],
  },
  {
    type: 'lines',
    text: ['Back to childhood.', 'Back to curiosity.', 'Back to a time when play was enough.'],
  },
  {
    type: 'para',
    text: 'In the middle of busy days, long hours, and the routines of grown-up life, Slimeberry is our little invitation to pause.',
  },
  {
    type: 'lines',
    text: ['To play a little.', 'To feel a little lighter.', "And perhaps, to find a piece of yourself you thought you'd left behind."],
  },
];

const store = createStore({ open: false });

export function setAboutOpen(open: boolean): void {
  store.set((state) => (state.open === open ? state : { open }));
}

export const useAboutOpen = () => useStore(store, (state) => state.open);
