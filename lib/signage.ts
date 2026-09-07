/** Small physical labels that explain the factory layout. Decorative only. */
export interface FactoryLabel {
  id: string;
  text: string;
  /** World position of the label's anchor point. */
  position: [number, number, number];
}

export const FACTORY_LABELS: FactoryLabel[] = [
  { id: 'greenhouse', text: '01 · Greenhouse', position: [-5.9, 2.85, -3.75] },
  { id: 'ingredients', text: '02 · Ingredients', position: [-3.2, 2.35, -4.0] },
  { id: 'mixing', text: '03 · Mixing Lab', position: [-0.7, 3.15, -3.75] },
  { id: 'colour', text: '04 · Colour Lab', position: [-6.1, 2.1, -1.2] },
  { id: 'texture', text: '05 · Texture Lab', position: [-6.1, 2.0, 0.9] },
  { id: 'qc', text: '06 · Quality Control', position: [1.4, 1.85, 1.15] },
  { id: 'filling', text: '07 · Filling', position: [2.7, 1.95, 1.2] },
  { id: 'labelling', text: '08 · Labelling', position: [4.3, 1.9, 1.2] },
  { id: 'packaging', text: '09 · Packaging', position: [6.6, 2.1, 2.55] },
  { id: 'finished', text: 'Finished Goods', position: [6.9, 2.75, -0.4] },
  { id: 'dispatch', text: 'Dispatch', position: [6.3, 1.35, -2.8] },
  { id: 'break', text: 'Break Area', position: [-6.0, 1.75, 4.0] },
];

/** Board on the back wall. Numbers drift a little during a visit. */
export const LAB_LOG_POSITION: [number, number, number] = [-7.05, 3.15, -2.6];
