/**
 * Grid templates shared by a section's column headers and its dossier tiles, so both stay
 * aligned. They live here rather than in either component because both must use the exact
 * same tracks.
 */

/** A 34px date gutter on narrow desktops leaves room for full headers beside 136px alerts. */
export const ROW_GRID =
  "grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-3 lg:grid-cols-[2.125rem_minmax(0,1fr)] xl:grid-cols-[3.25rem_minmax(0,1fr)]";

/** Reserve room for alert words and the 127px next-action label. */
export const TILE_GRID =
  "flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(8rem,2.2fr)_minmax(12.25rem,1.6fr)_minmax(10.5rem,1.6fr)_minmax(8rem,1fr)_minmax(8.5rem,0.8fr)_1.5rem] lg:gap-x-4 lg:gap-y-0 xl:gap-x-8";

/** Extend the project group to leave a 16px gap before the applicant at either breakpoint. */
export const PROJECT_GRID =
  "grid min-w-0 grid-cols-[2rem_2rem_minmax(0,1fr)] items-center gap-2 -mb-4 lg:mb-0 lg:mr-0 xl:-mr-4";
