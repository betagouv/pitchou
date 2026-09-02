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
 * Every track has a fixed size or a fixed minimum shared by all tiles; none may be `auto`,
 * or a tile whose content differs would resolve different column widths than its neighbours
 * and the columns would no longer line up.
 */
/**
 * The minimums must add up to what a 1024 px window can hold once the date gutter,
 * the gaps and the page padding are taken out — about 49rem — or the whole page
 * scrolls sideways. The alertes track takes the largest share of what is left, so
 * « Modifié il y a 12 jours » fits on one line as soon as the window has any room
 * to spare; it only wraps on the narrowest desktops.
 */
export const TILE_GRID =
  "flex flex-col gap-3 lg:grid lg:grid-cols-[2.5rem_3rem_minmax(7rem,1.4fr)_minmax(7rem,1.2fr)_minmax(9rem,1fr)_minmax(6.5rem,1fr)_minmax(9.5rem,1.1fr)_4.5rem] lg:items-start lg:gap-x-4 lg:gap-y-0";
