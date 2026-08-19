/**
 * Visual identity of a dossier's « activité principale »: an illustrative icon (a coloured
 * circle with a pictogram, from the Figma « Icones illustratives » page), so a dossier is
 * recognisable at a glance in the list.
 *
 * The SVGs live in `static/icons/activites/`; keys mirror the « Activité principale »
 * options of the démarche (see `Demarche88444.ts`), typos included.
 */

const FALLBACK_SLUG = "autre";

const slugByActivite = new Map<string, string>([
  ["Aménagements fonciers (AFAF, remembrement)", "amenagements-fonciers"],
  ["Carrières", "carrieres"],
  ["Conservation des espèces", "conservation-especes"],
  ["Demande à caractère scientifique", "demande-scientifique"],
  ["Desaîrage", "desairage"],
  ["Dommages aux biens et activités", "dommages-biens-activites"],
  ["Événementiel avec ou sans aménagement temporaire", "evenementiel"],
  ["Exploitation forestière", "exploitation-forestiere"],
  ["Industries de production de biens et marchandises", "industries-production"],
  ["Infrastructures - Autres", "infrastructures-autres"],
  ["Infrastructures aéroportuaires", "infrastructures-aeroportuaires"],
  ["Infrastructures des ouvrages de défense contre la mer", "defense-contre-la-mer"],
  ["Infrastructures de transport ferroviaire", "transport-ferroviaire"],
  ["Infrastructures de transport maritime et fluvial", "transport-maritime-fluvial"],
  ["Infrastructures de transport routières", "transport-routier"],
  ["Installations agricoles", "installations-agricoles"],
  ["Installations de gestion des déchets", "gestion-dechets"],
  ["Installations de loisir et de tourisme", "loisir-tourisme"],
  ["Pédagogique enseignement", "pedagogique-enseignement"],
  ["Péril animalier", "peril-animalier"],
  ["Plate-formes logistiques, centres commerciaux", "plateformes-logistiques"],
  ["Préservation de la sécurité et santé publique", "securite-sante-publique"],
  ["Production énergie autre-projets liés au nucléaire", "energie-nucleaire"],
  ["Production énergie renouvelable - Éolien", "energie-eolien"],
  ["Production énergie renouvelable - Éolien -  Suivi mortalité", "energie-eolien-suivi-mortalite"],
  ["Production énergie renouvelable - Photovoltaïque", "energie-photovoltaique"],
  ["Production énergie renouvelable - Hydroélectricité", "energie-hydroelectricite"],
  ["Production énergie renouvelable - Méthaniseur, biomasse", "energie-methaniseur-biomasse"],
  ["Production énergie renouvelable - Autres", "energie-autres"],
  [
    "Projets de bâtiments pour les services publics-installations sportives",
    "batiments-services-publics",
  ],
  ["Projets liés à la gestion de l’eau", "gestion-eau"],
  ["Restauration écologique", "restauration-ecologique"],
  [
    "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art",
    "restauration-batiments",
  ],
  ["Transport (autres canalisations)", "transport-autres-canalisations"],
  ["Transport eau aqueduc", "transport-eau-aqueduc"],
  ["Transport énergie électrique", "transport-electricite"],
  ["Transport gaz", "transport-gaz"],
  ["Transport hydrocarbures", "transport-hydrocarbures"],
  [
    "Urbanisation logement (déclaration préalable travaux, PC, permis d’aménager)",
    "urbanisation-logement",
  ],
  ["UTN (Unité Touristique Nouvelle)", "unite-touristique-nouvelle"],
  ["ZAC", "zac"],
  ["Autre", FALLBACK_SLUG],
]);

export function activiteIconUrl(mainActivite: string | null | undefined): string {
  const slug = (mainActivite && slugByActivite.get(mainActivite)) || FALLBACK_SLUG;
  return `/icons/activites/${slug}.svg`;
}
