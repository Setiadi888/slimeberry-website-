/**
 * The periodic table, as a grid.
 *
 * Written as Z-contiguous runs rather than one hundred and eighteen literals:
 * every row of the table is a stretch of consecutive atomic numbers starting at
 * a known column, so a run is all the information there is. The two breaks are
 * where the f-block is lifted out — row six jumps from lanthanum straight to
 * hafnium, and row seven from actinium to rutherfordium — which is exactly why
 * those two rows are two runs each.
 *
 * Lanthanum and actinium sit in group 3 of the main body; cerium onwards and
 * thorium onwards go in the two rows underneath. That is the layout most people
 * have seen on a classroom wall, which is the one to draw.
 */

export interface ElementCell {
  /** Atomic number. */
  z: number;
  symbol: string;
  /** Group, 1 to 18. */
  col: number;
  /** Period 1 to 7, then 8 and 9 for the two f-block rows drawn beneath. */
  row: number;
}

/** [row, first column, symbols, atomic number of the first]. */
const RUNS: ReadonlyArray<readonly [number, number, string, number]> = [
  [1, 1, 'H', 1],
  [1, 18, 'He', 2],
  [2, 1, 'Li Be', 3],
  [2, 13, 'B C N O F Ne', 5],
  [3, 1, 'Na Mg', 11],
  [3, 13, 'Al Si P S Cl Ar', 13],
  [4, 1, 'K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr', 19],
  [5, 1, 'Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe', 37],
  [6, 1, 'Cs Ba La', 55],
  [6, 4, 'Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn', 72],
  [7, 1, 'Fr Ra Ac', 87],
  [7, 4, 'Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og', 104],
  [8, 4, 'Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu', 58],
  [9, 4, 'Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr', 90],
];

export const ELEMENTS: ElementCell[] = RUNS.flatMap(([row, start, symbols, first]) =>
  symbols.split(' ').map((symbol, index) => ({
    z: first + index,
    symbol,
    col: start + index,
    row,
  })),
);

/** Columns in the table, and rows including the two f-block ones. */
export const TABLE_COLS = 18;
export const TABLE_ROWS = 9;
/** Rows of blank space between the main body and the f-block. */
export const TABLE_GAP = 0.55;

/**
 * The five elements slime is made of.
 *
 * Borax is Na₂B₄O₇·10H₂O — sodium, boron, oxygen, hydrogen — and PVA glue is a
 * chain of C₂H₄O. Between them that is boron, sodium, oxygen, carbon and
 * hydrogen, and nothing else, which is what makes it a puzzle with one answer
 * rather than a list to be guessed at.
 */
export const SLIME_ELEMENTS = ['B', 'Na', 'O', 'C', 'H'] as const;

/** True only when exactly the slime five have been pressed. */
export function isSlimeRecipe(chosen: readonly string[]): boolean {
  return (
    chosen.length === SLIME_ELEMENTS.length &&
    SLIME_ELEMENTS.every((symbol) => chosen.includes(symbol))
  );
}
