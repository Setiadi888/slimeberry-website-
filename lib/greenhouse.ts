/** A small botanical collection, rendered from species-specific silhouettes. */
export type LeafForm = 'oval' | 'heart' | 'lance' | 'split' | 'fern' | 'palm' | 'round' | 'grass';
export type BloomForm = 'none' | 'berry' | 'daisy' | 'spike' | 'trumpet' | 'pepper';
export interface PlantSpecies {
    id: string;
    name: string;
    leaf: LeafForm;
    bloom: BloomForm;
    green: string;
    accent: string;
    height: number;
    spread: number;
    leaves: number;
    petals: number;
}
const plant = (id: string, name: string, leaf: LeafForm, bloom: BloomForm, green: string, accent: string, height: number, spread: number, leaves: number, petals = 5): PlantSpecies => ({ id, name, leaf, bloom, green, accent, height, spread, leaves, petals });
export const PLANT_SPECIES: readonly PlantSpecies[] = [
    plant('mint', 'Mint', 'oval', 'none', '#71a76c', '#b8d7a2', .62, .7, 12),
    plant('basil', 'Basil', 'oval', 'spike', '#54834c', '#faf0d8', .78, .9, 10),
    plant('strawberry', 'Strawberry', 'heart', 'berry', '#557c4f', '#e66b78', .5, 1.05, 9),
    plant('blueberry', 'Blueberry', 'oval', 'berry', '#668c75', '#687abd', .94, .65, 14),
    plant('chamomile', 'Chamomile', 'fern', 'daisy', '#95ad65', '#fff3ce', .68, .65, 6, 10),
    plant('lavender', 'Lavender', 'lance', 'spike', '#839887', '#b6a0d4', .9, .46, 12),
    plant('rosemary', 'Rosemary', 'grass', 'none', '#63866f', '#b3c4b4', .78, .42, 20),
    plant('pandan', 'Pandan', 'grass', 'none', '#71994e', '#afc586', .85, 1.2, 9),
    plant('lemongrass', 'Lemongrass', 'grass', 'none', '#9caf64', '#d4dba0', 1.1, .65, 16),
    plant('butterfly-pea', 'Butterfly pea', 'oval', 'trumpet', '#679764', '#787bc9', .86, .72, 14, 5),
    plant('jasmine', 'Jasmine', 'oval', 'daisy', '#427552', '#fffbec', .73, .85, 12, 5),
    plant('hibiscus', 'Hibiscus', 'heart', 'trumpet', '#54854e', '#e991a7', .9, .98, 8, 5),
    plant('sunflower', 'Sunflower', 'heart', 'daisy', '#77924c', '#f3cb6a', 1.13, .75, 6, 12),
    plant('marigold', 'Marigold', 'fern', 'daisy', '#709451', '#eca85e', .6, .88, 7, 14),
    plant('cosmos', 'Cosmos', 'fern', 'daisy', '#7c9b61', '#e8a9c4', .93, .55, 6, 8),
    plant('tulip', 'Tulip', 'lance', 'trumpet', '#7da491', '#e3a2b5', .73, .65, 4, 6),
    plant('orchid', 'Orchid', 'lance', 'trumpet', '#568c75', '#d3b1da', .87, .85, 5, 3),
    plant('peace-lily', 'Peace lily', 'lance', 'trumpet', '#477b58', '#fff4d8', .94, .92, 8, 1),
    plant('anthurium', 'Anthurium', 'heart', 'trumpet', '#3f7d64', '#d9828e', .76, .95, 7, 1),
    plant('monstera', 'Monstera', 'split', 'none', '#588556', '#c4d5a0', 1.05, 1.16, 6),
    plant('boston-fern', 'Boston fern', 'fern', 'none', '#79a56a', '#bad494', .8, 1.18, 9),
    plant('maidenhair', 'Maidenhair fern', 'round', 'none', '#81b681', '#cce2ad', .56, .92, 20),
    plant('calathea', 'Calathea', 'oval', 'none', '#728e6b', '#c6d2a3', .77, 1.08, 8),
    plant('pothos', 'Golden pothos', 'heart', 'none', '#8cae58', '#e0ce80', .65, 1.12, 11),
    plant('pilea', 'Pilea', 'round', 'none', '#6fa081', '#b6cea1', .7, .96, 8),
    plant('areca', 'Areca palm', 'palm', 'none', '#73a369', '#b6c583', 1.18, 1.1, 6),
    plant('banana', 'Mini banana', 'lance', 'none', '#84a85a', '#d1d78d', 1.12, 1.32, 5),
    plant('chilli', 'Chilli', 'lance', 'pepper', '#588b5c', '#dd755a', .83, .67, 13),
    plant('cherry-tomato', 'Cherry tomato', 'heart', 'berry', '#749659', '#ed9670', .95, .75, 10),
    plant('coffee', 'Coffee', 'oval', 'berry', '#47785a', '#bb6970', 1.04, .78, 12),
    /* The berry shelf. A slime factory that calls itself Slimeberry ought to be
       growing more than one of them, so the beds now draw from ten. */
    plant('raspberry', 'Raspberry', 'heart', 'berry', '#5d8558', '#d9556b', .88, .82, 11),
    plant('blackberry', 'Blackberry', 'oval', 'berry', '#4d7a4f', '#4a3d60', .92, .9, 12),
    plant('mulberry', 'Mulberry', 'heart', 'berry', '#618f57', '#6b2f4a', 1.02, .95, 10),
    plant('gooseberry', 'Gooseberry', 'round', 'berry', '#7ba05f', '#b6cf72', .66, .88, 13),
    plant('cranberry', 'Cranberry', 'grass', 'berry', '#5f8a63', '#c8324b', .54, .62, 18),
    plant('redcurrant', 'Redcurrant', 'split', 'berry', '#6a9152', '#e0485a', .8, .86, 9),
    plant('blackcurrant', 'Blackcurrant', 'split', 'berry', '#527d4d', '#3f3554', .84, .8, 10),
    plant('elderberry', 'Elderberry', 'fern', 'berry', '#4e7a58', '#2f3b57', 1.06, 1.0, 8),
    plant('goji', 'Goji berry', 'lance', 'berry', '#7f9a55', '#e06a3c', .96, .58, 15),
    plant('ciplukan', 'Ciplukan', 'heart', 'berry', '#6d9a5a', '#e8b54f', .7, .9, 11),
];
/** Draw through a shuffled collection before reshuffling. Five beds never
 * contain the same species, and a harvested bed never immediately repeats. */
const occupied = new Map<number, string>();
let deck: PlantSpecies[] = [];
export function drawPlant(bed: number): PlantSpecies {
    const excluded = new Set(occupied.values());
    let index = deck.findIndex((species) => !excluded.has(species.id));
    if (index < 0) {
        deck = [...PLANT_SPECIES];
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        index = deck.findIndex((species) => !excluded.has(species.id));
    }
    const [species] = deck.splice(index, 1);
    occupied.set(bed, species.id);
    return species;
}
export const releasePlant = (bed: number) => occupied.delete(bed);
export const GROW_SECONDS = 52;
export const HOLD_SECONDS = 32;
export const HARVEST_SECONDS = 7;
export function growthAt(age: number, bed: number) {
    const grow = GROW_SECONDS + bed * 4;
    const harvestAt = grow + HOLD_SECONDS + bed * 2;
    return { growth: Math.min(1, Math.max(0, age / grow)),
        harvest: Math.min(1, Math.max(0, (age - harvestAt) / HARVEST_SECONDS)),
        complete: age >= harvestAt + HARVEST_SECONDS + 2 };
}
