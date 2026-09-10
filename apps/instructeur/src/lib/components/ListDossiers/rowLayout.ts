/**
 * Grid templates shared by a section's column headers and its dossier tiles, so both stay
 * aligned. They live here rather than in either component because both must use the exact
 * same tracks.
 */

/** Outer row: the dépôt date gutter, then the tile (or the header labels). */
export const ROW_GRID = "grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-3";

/** Zero track minimums let long names and badges fit within the parent container. */
export const TILE_GRID =
  "flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.25fr)_minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1.4fr)_1.5rem] lg:gap-y-0";

/** Extending the project group by 16px leaves a 16px gap before the applicant. */
export const PROJECT_GRID =
  "grid min-w-0 grid-cols-[2rem_2rem_minmax(0,1fr)] items-center gap-2 -mb-4 lg:mb-0 lg:-mr-4";
