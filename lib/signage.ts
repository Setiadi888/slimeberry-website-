/** Small physical labels that explain the factory layout. Decorative only. */
export interface FactoryLabel {
  id: string;
  text: string;
  /** World position of the label's anchor point. */
  position: [number, number, number];
}

export const FACTORY_LABELS: FactoryLabel[] = [
  { id: 'greenhouse', text: '01 · Greenhouse', position: [-5.9, 2.85, -3.75] },
  { id: 'mixing', text: '02 · Mixing Lab', position: [-3.15, 3.15, -3.8] },
  { id: 'texture', text: '03 · Texture Lab', position: [-6.1, 2.0, 0.9] },
  { id: 'qc', text: '04 · Quality Control', position: [1.4, 1.85, 2.15] },
  { id: 'filling', text: '05 · Filling', position: [2.7, 1.95, 2.2] },
  { id: 'labelling', text: '06 · Labelling', position: [4.3, 1.9, 2.2] },
  { id: 'packaging', text: '07 · Packaging', position: [6.6, 2.1, 3.55] },
  { id: 'gachapon', text: '🪙 Gachapon', position: [-6.1, 3.35, -1.2] },
  { id: 'dispatch', text: 'Dispatch', position: [6.3, 1.35, -2.8] },
  { id: 'shop', text: 'Shop', position: [3.3, 3.65, -4.93] },
  { id: 'mart', text: '🚪 SB Mart', position: [6.2, 3.5, -5.2] },
  { id: 'break', text: 'Break Area', position: [-4.6, 1.75, 2.4] },
];

/** Board on the back wall. Numbers drift a little during a visit. */
export const LAB_LOG_POSITION: [number, number, number] = [-7.05, 3.15, -2.6];
