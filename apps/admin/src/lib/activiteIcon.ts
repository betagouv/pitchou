/**
 * Visual identity of a dossier's activity: an illustrative icon (a coloured circle with a
 * pictogram, from the Figma « Icones illustratives » page), so a dossier is recognisable at a
 * glance in the list.
 *
 * Icons are looked up by the activity's referentiel code — the SVGs in
 * `static/icons/activites/` are named after those codes. Activities created by administrators
 * after the fact have no dedicated icon yet and use the « autre » one.
 */

const FALLBACK_CODE = "autre";

/** The codes that have their own SVG in `static/icons/activites/`. */
const CODES_WITH_ICON = new Set([
  "amenagements-fonciers",
  "autre",
  "batiments-services-publics",
  "carrieres",
  "conservation-especes",
  "defense-contre-la-mer",
  "demande-scientifique",
  "desairage",
  "dommages-biens-activites",
  "energie-autres",
  "energie-eolien-suivi-mortalite",
  "energie-eolien",
  "energie-hydroelectricite",
  "energie-methaniseur-biomasse",
  "energie-nucleaire",
  "energie-photovoltaique",
  "evenementiel",
  "exploitation-forestiere",
  "gestion-dechets",
  "gestion-eau",
  "industries-production",
  "infrastructures-aeroportuaires",
  "infrastructures-autres",
  "installations-agricoles",
  "loisir-tourisme",
  "pedagogique-enseignement",
  "peril-animalier",
  "plateformes-logistiques",
  "restauration-batiments",
  "restauration-ecologique",
  "securite-sante-publique",
  "transport-autres-canalisations",
  "transport-eau-aqueduc",
  "transport-electricite",
  "transport-ferroviaire",
  "transport-gaz",
  "transport-hydrocarbures",
  "transport-maritime-fluvial",
  "transport-routier",
  "unite-touristique-nouvelle",
  "urbanisation-logement",
  "zac",
]);

export function activiteIconUrl(activiteCode: string | null | undefined): string {
  const code = activiteCode && CODES_WITH_ICON.has(activiteCode) ? activiteCode : FALLBACK_CODE;
  return `/icons/activites/${code}.svg`;
}
