import {
  ACTIVITE_CODES_REQUIRING_SPECIES_FILE,
  ACTIVITE_CODES_WITHOUT_REQUEST_CONTEXT,
} from "./activiteCodes.ts";

// The « Activité principale » options are not hardcoded here: they live in the `activite`
// referentiel table (managed on the /activites admin page) and reach the forms through the
// admin /api/activites endpoint. Behaviour keyed on specific activities uses activiteCodes.ts.

export const dossierRequestContextOptions = [
  "Vous souhaitez bénéficier d'un accompagnement amont",
  "Vous avez conclu à l'absence de nécessité de dérogation, compte tenu des mesures d'Évitement et de Réduction prévues et vous souhaitez échanger avec le service instructeur",
  "Vous souhaitez déposer un dossier de demande de dérogation",
] as const;

export const restaurationDemandeOptions = ["Destruction de nids d'Hirondelles", "Autre"] as const;

export const transportDemandeOptions = ["Destruction de nids de Cigognes", "Autre"] as const;

export function requiresSpeciesFile(
  activiteCode: string | null | undefined,
  requestContext: string | null | undefined,
): boolean {
  return (
    requestContext === dossierRequestContextOptions[2] ||
    ACTIVITE_CODES_REQUIRING_SPECIES_FILE.includes(
      activiteCode as (typeof ACTIVITE_CODES_REQUIRING_SPECIES_FILE)[number],
    )
  );
}

export function requiresOperationDates(
  activiteCode: string | null | undefined,
  requestContext: string | null | undefined,
): boolean {
  return (
    requestContext === dossierRequestContextOptions[1] ||
    requestContext === dossierRequestContextOptions[2] ||
    ACTIVITE_CODES_WITHOUT_REQUEST_CONTEXT.includes(
      activiteCode as (typeof ACTIVITE_CODES_WITHOUT_REQUEST_CONTEXT)[number],
    )
  );
}

export function requiresCompleteDossierAttachment(
  activiteCode: string | null | undefined,
  requestContext: string | null | undefined,
  motifDerogation: string | null | undefined,
): boolean {
  return (
    requiresSpeciesFile(activiteCode, requestContext) &&
    !requiresScientificDemandeType(motifDerogation)
  );
}

export function requiresNoDerogationArgumentAttachment(
  requestContext: string | null | undefined,
): boolean {
  return requestContext === dossierRequestContextOptions[1];
}

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
