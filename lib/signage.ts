/**
 * Factory signage.
 *
 * These used to be DOM chips projected from world space, floating a metre above
 * each machine. They read as an interface laid over the diorama rather than as
 * part of it, so they are now real plaques bolted to the thing they name — the
 * same trick the discharge hood's placard has always used: a canvas texture on
 * a small plate, lit from the scene's own lights.
 *
 * Every position below is the centre of the plate in world space, sitting a few
 * millimetres proud of the surface it is fixed to. The printed face looks down
 * its own +z, so `rotation` is what turns it to face the room.
 */
export interface StationSign {
  /** Matches a station id, so the product journey can light the right plate. */
  id: string;
  /** Badge on the left of the plate. Omitted for the areas that are not steps. */
  step?: string;
  text: string;
  accent: string;
  position: [number, number, number];
  /** Y rotation. 0 faces +z; Math.PI / 2 faces +x. */
  rotation?: number;
  /** Plate width in metres; the height follows from the artwork's aspect. */
  width?: number;
  /**
   * Sits the plate on a little foot instead of standoff pins — for the two that
   * stand on a surface rather than being fixed to a face.
   */
  stand?: boolean;
}

export const STATION_SIGNS: StationSign[] = [
  // fixed to the front board of the raised bed
  {
    id: 'greenhouse',
    step: '01',
    text: 'GREENHOUSE',
    accent: '#8fbc6d',
    position: [-5.9, 0.29, -2.965],
    width: 0.86,
  },
  // on the mixer's front panel, under the transfer pipe
  {
    id: 'mixing',
    step: '02',
    text: 'MIXING LAB',
    accent: '#e4738f',
    position: [-2.6, 0.66, -3.05],
    width: 0.8,
  },
  // out on its own at the west end of the belt, first thing a jar meets
  {
    id: 'filling',
    step: '04',
    text: 'FILLING',
    accent: '#e4738f',
    position: [-4.6, 0.62, 2.615],
    width: 0.7,
  },
  // on the tunnel's front face, between the belt mouths and the hazard band
  {
    id: 'packaging',
    step: '05',
    text: 'PACKAGING',
    accent: '#d94f75',
    position: [-1.0, 1.06, 4.57],
    width: 0.82,
  },
  {
    id: 'qc',
    step: '06',
    text: 'QUALITY CONTROL',
    accent: '#7bbf6a',
    position: [1.4, 0.62, 2.6],
    width: 0.86,
  },
  // shoulder to shoulder with QC now, which is how the two are read
  {
    id: 'labelling',
    step: '07',
    text: 'LABELLING',
    accent: '#f3d78c',
    position: [2.75, 0.62, 2.615],
    width: 0.72,
  },
  // on the shop cabinet's cornice
  {
    id: 'shop',
    text: 'SHOP',
    accent: '#e4738f',
    position: [3.3, 3.35, -4.36],
    width: 0.72,
  },
  // standing on the cafe table, the way a reserved card would
  {
    id: 'break',
    text: 'BREAK AREA',
    accent: '#f0c86a',
    position: [4.03, 1.105, 2.37],
    width: 0.5,
    stand: true,
  },
];
