/**
 * Illustrative icon of a type d'impact (the classification pictogram combined with an impact
 * glyph), from the Figma « Icones illustratives » page.
 *
 * Icons are looked up by identifiant Pitchou — the SVGs in `./icons/impact/` are named after
 * those identifiers. Impacts without a type, or with a type added to the referentiel after the
 * icons were drawn, have no icon.
 */

const iconUrls = import.meta.glob("./icons/impact/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export function typeImpactIconUrl(
  identifiantPitchou: string | null | undefined,
): string | undefined {
  return identifiantPitchou ? iconUrls[`./icons/impact/${identifiantPitchou}.svg`] : undefined;
}
