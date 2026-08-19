/**
 * Grid templates shared by a section's column headers and its dossier tiles, so both stay
 * aligned. They live here rather than in either component because both must use the exact
 * same tracks.
 */

/** Outer row: the dépôt date gutter, then the tile (or the header labels). */
export const ROW_GRID = "grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-3";

/**
 * Columns inside a tile: suivi, activité, nom du projet, pétitionnaire/localisation,
 * avancement, prochaine action, alertes, actions. Below `lg` the tile stacks instead, since
 * eight columns cannot fit; the header row is hidden at those widths.
 *
 * Every track has a fixed size or a fixed minimum shared by all tiles; the actions column in
 * particular must NOT be `auto`, or a tile with a comment button would resolve different
 * column widths than its neighbours and the columns would no longer line up.
 */
export const TILE_GRID =
  "flex flex-col gap-3 lg:grid lg:grid-cols-[2.5rem_2.5rem_minmax(8rem,1.5fr)_minmax(8rem,1.3fr)_minmax(10.5rem,1.1fr)_minmax(7rem,1fr)_minmax(6.5rem,0.9fr)_4.5rem] lg:items-start lg:gap-x-4 lg:gap-y-0";
