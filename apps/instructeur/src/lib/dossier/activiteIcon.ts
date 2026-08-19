/**
 * Visual identity of a dossier's « activité principale »: a DSFR icon plus a DSFR colour
 * family, so a dossier is recognisable at a glance in the list.
 */
export type ActiviteIcon = {
  /** DSFR icon class, e.g. `fr-icon-windy-line` */
  icon: string;
  /** DSFR colour family, e.g. `blue-ecume`, used to build the `--*-<family>` tokens */
  family: string;
};

const FALLBACK: ActiviteIcon = { icon: "fr-icon-folder-2-line", family: "grey" };

const iconByActivite = new Map<string, ActiviteIcon>([
  [
    "Aménagements fonciers (AFAF, remembrement)",
    { icon: "fr-icon-road-map-line", family: "brown-cafe-creme" },
  ],
  ["Carrières", { icon: "fr-icon-hammer-line", family: "brown-caramel" }],
  ["Conservation des espèces", { icon: "fr-icon-leaf-line", family: "green-bourgeon" }],
  ["Demande à caractère scientifique", { icon: "fr-icon-microscope-line", family: "blue-cumulus" }],
  ["Desaîrage", { icon: "fr-icon-windy-line", family: "blue-ecume" }],
  [
    "Dommages aux biens et activités",
    { icon: "fr-icon-alert-line", family: "orange-terre-battue" },
  ],
  [
    "Événementiel avec ou sans aménagement temporaire",
    { icon: "fr-icon-megaphone-line", family: "purple-glycine" },
  ],
  ["Exploitation forestière", { icon: "fr-icon-plant-line", family: "green-emeraude" }],
  [
    "Industries de production de biens et marchandises",
    { icon: "fr-icon-building-4-line", family: "brown-opera" },
  ],
  ["Infrastructures - Autres", { icon: "fr-icon-road-map-line", family: "beige-gris-galet" }],
  ["Infrastructures aéroportuaires", { icon: "fr-icon-send-plane-line", family: "blue-ecume" }],
  [
    "Infrastructures des ouvrages de défense contre la mer",
    { icon: "fr-icon-flood-line", family: "blue-cumulus" },
  ],
  [
    "Infrastructures de transport ferroviaire",
    { icon: "fr-icon-train-line", family: "blue-ecume" },
  ],
  [
    "Infrastructures de transport maritime et fluvial",
    { icon: "fr-icon-ship-2-line", family: "blue-cumulus" },
  ],
  [
    "Infrastructures de transport routières",
    { icon: "fr-icon-car-line", family: "beige-gris-galet" },
  ],
  ["Installations agricoles", { icon: "fr-icon-seedling-line", family: "green-tilleul-verveine" }],
  [
    "Installations de gestion des déchets",
    { icon: "fr-icon-recycle-line", family: "green-menthe" },
  ],
  [
    "Installations de loisir et de tourisme",
    { icon: "fr-icon-hotel-line", family: "pink-macaron" },
  ],
  ["Pédagogique enseignement", { icon: "fr-icon-school-line", family: "purple-glycine" }],
  ["Péril animalier", { icon: "fr-icon-alert-line", family: "red-marianne" }],
  [
    "Plate-formes logistiques, centres commerciaux",
    { icon: "fr-icon-shopping-cart-2-line", family: "brown-opera" },
  ],
  [
    "Préservation de la sécurité et santé publique",
    { icon: "fr-icon-first-aid-kit-line", family: "red-marianne" },
  ],
  [
    "Production énergie autre-projets liés au nucléaire",
    { icon: "fr-icon-flashlight-line", family: "yellow-moutarde" },
  ],
  [
    "Production énergie renouvelable - Éolien",
    { icon: "fr-icon-windy-line", family: "blue-ecume" },
  ],
  [
    "Production énergie renouvelable - Éolien -  Suivi mortalité",
    { icon: "fr-icon-windy-line", family: "blue-cumulus" },
  ],
  [
    "Production énergie renouvelable - Photovoltaïque",
    { icon: "fr-icon-sun-line", family: "yellow-tournesol" },
  ],
  [
    "Production énergie renouvelable - Hydroélectricité",
    { icon: "fr-icon-drop-line", family: "blue-cumulus" },
  ],
  [
    "Production énergie renouvelable - Méthaniseur, biomasse",
    { icon: "fr-icon-leaf-line", family: "green-tilleul-verveine" },
  ],
  [
    "Production énergie renouvelable - Autres",
    { icon: "fr-icon-lightbulb-line", family: "yellow-moutarde" },
  ],
  [
    "Projets de bâtiments pour les services publics-installations sportives",
    { icon: "fr-icon-government-line", family: "blue-france" },
  ],
  ["Projets liés à la gestion de l’eau", { icon: "fr-icon-drop-line", family: "blue-ecume" }],
  ["Restauration écologique", { icon: "fr-icon-seedling-line", family: "green-bourgeon" }],
  [
    "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art",
    { icon: "fr-icon-hammer-line", family: "brown-caramel" },
  ],
  [
    "Transport (autres canalisations)",
    { icon: "fr-icon-road-map-line", family: "beige-gris-galet" },
  ],
  ["Transport eau aqueduc", { icon: "fr-icon-drop-line", family: "blue-cumulus" }],
  ["Transport énergie électrique", { icon: "fr-icon-flashlight-line", family: "yellow-moutarde" }],
  ["Transport gaz", { icon: "fr-icon-gas-station-line", family: "orange-terre-battue" }],
  ["Transport hydrocarbures", { icon: "fr-icon-gas-station-line", family: "brown-caramel" }],
  [
    "Urbanisation logement (déclaration préalable travaux, PC, permis d’aménager)",
    { icon: "fr-icon-home-4-line", family: "brown-cafe-creme" },
  ],
  ["UTN (Unité Touristique Nouvelle)", { icon: "fr-icon-hotel-line", family: "pink-tuile" }],
  ["ZAC", { icon: "fr-icon-building-4-line", family: "beige-gris-galet" }],
  ["Autre", FALLBACK],
]);

export function activiteIcon(mainActivite: string | null | undefined): ActiviteIcon {
  return (mainActivite && iconByActivite.get(mainActivite)) || FALLBACK;
}
