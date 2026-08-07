export const dossierMainActiviteOptions = [
  "Aménagements fonciers (AFAF, remembrement)",
  "Carrières",
  "Conservation des espèces",
  "Demande à caractère scientifique",
  "Desaîrage",
  "Dommages aux biens et activités",
  "Événementiel avec ou sans aménagement temporaire",
  "Exploitation forestière",
  "Industries de production de biens et marchandises",
  "Infrastructures - Autres",
  "Infrastructures aéroportuaires",
  "Infrastructures des ouvrages de défense contre la mer",
  "Infrastructures de transport ferroviaire",
  "Infrastructures de transport maritime et fluvial",
  "Infrastructures de transport routières",
  "Installations agricoles",
  "Installations de gestion des déchets",
  "Installations de loisir et de tourisme",
  "Pédagogique enseignement",
  "Péril animalier",
  "Plate-formes logistiques, centres commerciaux",
  "Préservation de la sécurité et santé publique",
  "Production énergie autre-projets liés au nucléaire",
  "Production énergie renouvelable - Éolien",
  "Production énergie renouvelable - Éolien -  Suivi mortalité",
  "Production énergie renouvelable - Photovoltaïque",
  "Production énergie renouvelable - Hydroélectricité",
  "Production énergie renouvelable - Méthaniseur, biomasse",
  "Production énergie renouvelable - Autres",
  "Projets de bâtiments pour les services publics-installations sportives",
  "Projets liés à la gestion de l’eau",
  "Restauration écologique",
  "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art",
  "Transport (autres canalisations)",
  "Transport eau aqueduc",
  "Transport énergie électrique",
  "Transport gaz",
  "Transport hydrocarbures",
  "Urbanisation logement (déclaration préalable travaux, PC, permis d’aménager)",
  "UTN (Unité Touristique Nouvelle)",
  "ZAC",
  "Autre",
] as const;

export const dossierRequestContextOptions = [
  "Vous souhaitez bénéficier d'un accompagnement amont",
  "Vous avez conclu à l'absence de nécessité de dérogation, compte tenu des mesures d'Évitement et de Réduction prévues et vous souhaitez échanger avec le service instructeur",
  "Vous souhaitez déposer un dossier de demande de dérogation",
] as const;

export const restaurationDemandeOptions = ["Destruction de nids d'Hirondelles", "Autre"] as const;

export const transportDemandeOptions = ["Destruction de nids de Cigognes", "Autre"] as const;

export const dossierMainActivitesWithoutRequestContext = [
  "Demande à caractère scientifique",
  "Desaîrage",
  "Pédagogique enseignement",
  "Production énergie renouvelable - Éolien -  Suivi mortalité",
] as const;

export const dossierMainActivitesRequiringSpeciesFile = [
  "Demande à caractère scientifique",
  "Desaîrage",
  "Pédagogique enseignement",
  "Production énergie renouvelable - Éolien -  Suivi mortalité",
] as const;

export function requiresSpeciesFile(
  mainActivite: string | null | undefined,
  requestContext: string | null | undefined,
): boolean {
  return (
    requestContext === dossierRequestContextOptions[2] ||
    dossierMainActivitesRequiringSpeciesFile.includes(
      mainActivite as (typeof dossierMainActivitesRequiringSpeciesFile)[number],
    )
  );
}

export function requiresOperationDates(
  mainActivite: string | null | undefined,
  requestContext: string | null | undefined,
): boolean {
  return (
    requestContext === dossierRequestContextOptions[1] ||
    requestContext === dossierRequestContextOptions[2] ||
    dossierMainActivitesWithoutRequestContext.includes(
      mainActivite as (typeof dossierMainActivitesWithoutRequestContext)[number],
    )
  );
}

export function requiresCompleteDossierAttachment(
  mainActivite: string | null | undefined,
  requestContext: string | null | undefined,
  motifDerogation: string | null | undefined,
): boolean {
  return (
    requiresSpeciesFile(mainActivite, requestContext) &&
    !requiresScientificDemandeType(motifDerogation)
  );
}

export function requiresNoDerogationArgumentAttachment(
  requestContext: string | null | undefined,
): boolean {
  return requestContext === dossierRequestContextOptions[1];
}

export const restaurationMainActivite =
  "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art";

export const transportMainActivites = [
  "Infrastructures de transport ferroviaire",
  "Transport énergie électrique",
] as const;

export const dossierLocationScopeOptions = [
  "communes",
  "departements",
  "regions",
  "france",
] as const;

export const motifDerogationOptions = [
  "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l’environnement).",
  "Dans l’intérêt de la sécurité aérienne.",
  "Pour prévenir des dommages importants notamment aux cultures, à l'élevage, aux forêts, aux pêcheries, aux eaux et à d'autres formes de propriété.",
  "Pour la protection de la flore et de la faune et la conservation des habitats naturels.",
  "A des fins de recherche et d’éducation.",
  "A des fins de repeuplement et de réintroduction de ces espèces et pour des opérations de reproduction nécessaires à ces fins, y compris la propagation artificielle des plantes.",
  "Pour permettre la prise ou la détention d'un nombre limité et spécifié de certains spécimens, dans des conditions strictement contrôlées, d'une manière sélective et dans une mesure limitée.",
] as const;

export const legacyMotifDerogationOptions = [
  "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l’environnement)",
  "Dans l’intérêt de la sécurité aérienne",
  "Pour prévenir des dommages importants notamment aux cultures, à l'élevage, aux forêts, aux pêcheries, aux eaux et à d'autres formes de propriété",
  "Pour la protection de la flore et de la faune et la conservation des habitats naturels",
  "A des fins de recherche et d’enseignement",
  "A des fins de repeuplement et de réintroduction de ces espèces et pour des opérations de reproduction nécessaires à ces fins, y compris la propagation artificielle des plantes",
  "Pour permettre la prise ou la détention d'un nombre limité et spécifié de certains spécimens, dans des conditions strictement contrôlées, d'une manière sélective et dans une mesure limitée",
] as const;

export function requiresScientificDemandeType(motifDerogation: string | null | undefined): boolean {
  return (
    motifDerogation === motifDerogationOptions[4] ||
    motifDerogation === legacyMotifDerogationOptions[4]
  );
}

export function requiresEspecesPriseDetentionLimiteeType(
  motifDerogation: string | null | undefined,
): boolean {
  return (
    motifDerogation === motifDerogationOptions[6] ||
    motifDerogation === legacyMotifDerogationOptions[6]
  );
}

export {
  requiresScientificPurposes,
  scientifiqueCaptureModeOptions,
  scientifiqueDemandePurposeOptions,
  scientifiqueDemandeTypeOptions,
} from "./dossierFormOptions/scientificOptions.ts";

export const aeProcedureOptions = [
  "Autorisation ICPE",
  "Autorisation loi sur l'eau",
  "Autre",
] as const;

export const especesPriseDetentionLimiteeTypeOptions = [
  "Espèces autres que oiseaux",
  "Oiseaux autre que pour la fauconnerie",
  "Oiseaux pour la fauconnerie",
  "Oiseaux chassables",
  "Oiseaux non chassables et utilisation d’une méthode interdite par l’annexe IV",
] as const;

export const eolienMortalityActionOptions = [
  "Transport des individus blessés vers un centre de soin",
  "Transport des cadavres pour analyse au bureau",
  "Envoi des cadavres collectés vers le MNHN/UMR CESCO pour abonder au programme de veille sanitaire",
] as const;

export { dossierRegionOptions } from "./dossierFormOptions/regionOptions.ts";
