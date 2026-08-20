/**
 * Visual identity of a dossier's activity: an illustrative icon (a coloured circle with a
 * pictogram, from the Figma « Icones illustratives » page), so a dossier is recognisable at a
 * glance.
 *
 * Icons are looked up by the activity's referentiel code — the SVGs in `./icons/` are named
 * after those codes. Activities created by administrators after the fact have no dedicated
 * icon yet and use the « autre » one.
 */

const FALLBACK_CODE = "autre";

const iconUrls = import.meta.glob("./icons/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const urlByCode = new Map(
  Object.entries(iconUrls).map(([path, url]) => [
    path.slice("./icons/".length, -".svg".length),
    url,
  ]),
);

export function activiteIconUrl(activiteCode: string | null | undefined): string {
  return urlByCode.get(activiteCode ?? "") ?? (urlByCode.get(FALLBACK_CODE) as string);
}
