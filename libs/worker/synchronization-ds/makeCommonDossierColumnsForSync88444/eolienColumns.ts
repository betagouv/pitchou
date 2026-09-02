import { EOLIEN_SUIVI_MORTALITE_ACTIVITE_CODE } from "@pitchou/common/activiteCodes.ts";
import { eolienMortalityActionOptions } from "@pitchou/common/dossierFormOptions.ts";
import type { Dossier88444ChampById, Dossier88444KeyMap } from "./fieldMaps.ts";

const positiveNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const positiveInteger = (value: unknown) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

export function makeDossierEolienColumns88444(
  champById: Dossier88444ChampById,
  keyToChamp: Dossier88444KeyMap,
  activiteCode: string | null,
  showsOperationDetails: boolean,
) {
  const getString = (label: Parameters<Dossier88444KeyMap["get"]>[0]) =>
    champById.get(keyToChamp.get(label))?.stringValue;
  const windMortality = activiteCode === EOLIEN_SUIVI_MORTALITE_ACTIVITE_CODE;
  const actions = champById.get(
    keyToChamp.get("Suivi de mortalité - Votre demande concerne :"),
  )?.values;
  const validActions = (actions ?? []).filter((value: string) =>
    eolienMortalityActionOptions.includes(value as never),
  );
  const showsCarcassAnalysis =
    windMortality && validActions.includes(eolienMortalityActionOptions[1]);
  const monitoredTurbinesCount = positiveInteger(getString("Nombre d'éoliennes à suivre"));
  const monitoringVisitsCount = positiveInteger(getString("Nombre de passages pendant le suivi"));
  const weeklyVisitsCount = positiveInteger(getString("Nombre de passages par semaine de suivi"));
  return {
    eolien_commissioning_year: positiveNumber(getString("Année de mise en service")),
    eolien_turbines_count: positiveNumber(getString("Nombre d'éoliennes")),
    eolien_tip_height: positiveNumber(getString("Hauteur totale bout de pale (m)")),
    eolien_rotor_diameter: positiveNumber(getString("Diamètre du rotor (m)")),
    eolien_ground_clearance: positiveNumber(getString("Garde au sol (m)")),
    scientifique_suivi_protocol_description: showsOperationDetails
      ? getString("Description du protocole de suivi") || null
      : null,
    eolien_monitored_turbines_count: windMortality ? monitoredTurbinesCount : null,
    eolien_field_inventory_period: windMortality
      ? getString("Période des inventaires terrain") || null
      : null,
    eolien_monitoring_visits_count: windMortality ? monitoringVisitsCount : null,
    eolien_weekly_monitoring_visits_count: windMortality ? weeklyVisitsCount : null,
    eolien_mortality_actions:
      windMortality && validActions.length >= 1 ? JSON.stringify(validActions) : null,
    eolien_carcass_collection_method: showsCarcassAnalysis
      ? getString("Description du mode de collecte sur le terrain") || null
      : null,
    eolien_carcass_preservation_method: showsCarcassAnalysis
      ? getString("Méthode de conservation") || null
      : null,
    eolien_carcass_examination_address: showsCarcassAnalysis
      ? getString("Adresse des locaux où seront examinés les cadavres") || null
      : null,
  };
}
