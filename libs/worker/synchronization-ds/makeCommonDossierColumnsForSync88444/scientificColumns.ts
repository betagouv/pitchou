import { EOLIEN_SUIVI_MORTALITE_ACTIVITE_CODE } from "@pitchou/common/activiteCodes.ts";
import {
  requiresScientificDemandeType,
  scientifiqueDemandeTypeOptions,
} from "@pitchou/common/dossierFormOptions.ts";
import type {
  BaseChampDS,
  ChampScientifiqueIntervenants,
} from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { Dossier88444ChampById, Dossier88444KeyMap } from "./fieldMaps.ts";
import { makeDossierEolienColumns88444 } from "./eolienColumns.ts";

export function makeDossierScientificColumns88444(
  champById: Dossier88444ChampById,
  keyToChamp: Dossier88444KeyMap,
  activiteCode: string | null,
  motifDerogation: string | undefined,
) {
  const values = (label: Parameters<Dossier88444KeyMap["get"]>[0]) =>
    champById.get(keyToChamp.get(label))?.values;
  const stringValue = (label: Parameters<Dossier88444KeyMap["get"]>[0]) =>
    champById.get(keyToChamp.get(label))?.stringValue;
  const checked = (label: Parameters<Dossier88444KeyMap["get"]>[0]) =>
    champById.get(keyToChamp.get(label))?.checked;
  const demandeTypes = values("Recherche scientifique - Votre demande concerne :");
  const requiresScientific = requiresScientificDemandeType(motifDerogation);
  const windMortality = activiteCode === EOLIEN_SUIVI_MORTALITE_ACTIVITE_CODE;
  const showsOperationDetails = requiresScientific || windMortality;
  const showsCaptureDetails =
    requiresScientific &&
    (demandeTypes ?? []).some((value: string) =>
      scientifiqueDemandeTypeOptions.slice(0, 3).includes(value as never),
    );
  const captureModes = new Set<string>(
    values(`En cas de nécessité de capture d'individus, précisez le mode de capture`) ?? [],
  );
  captureModes.delete("Autre moyen de capture (préciser)");
  const otherCaptureMode = stringValue(`Préciser le(s) autre(s) moyen(s) de capture`)?.trim();
  if (otherCaptureMode) captureModes.add(otherCaptureMode);

  const lightSourceConditions = checked(`Utilisez-vous des sources lumineuses ?`)
    ? stringValue(`Précisez les modalités de l'utilisation des sources lumineuses`)
    : undefined;
  const intervenantsChamp: ChampScientifiqueIntervenants | undefined = champById.get(
    keyToChamp.get(`Qualification des intervenants`),
  );
  const intervenants = intervenantsChamp?.rows.map(({ champs }: { champs: BaseChampDS[] }) => ({
    nom_complet: champs.find(({ label }) => label === "Nom Prénom")?.stringValue,
    qualification: champs.find(({ label }) => label === "Qualification")?.stringValue,
  }));
  const markingConditions = stringValue(`Précisez les modalités de marquage pour chaque taxon`);
  const transportConditions = stringValue(
    `Précisez les modalités de transport et la destination concernant la collecte de matériel biologique`,
  );
  return {
    scientifique_demande_type: demandeTypes ? JSON.stringify(demandeTypes) : undefined,
    scientifique_demande_purposes: values(
      "Captures/Relâchers/Prélèvement - Finalité(s) de la demande",
    )
      ? JSON.stringify(values("Captures/Relâchers/Prélèvement - Finalité(s) de la demande"))
      : undefined,
    scientifique_previous_assessment: checked(
      "Cette demande concerne un programme de suivi déjà existant",
    ),
    especes_prise_detention_limitee_type:
      stringValue("Prise ou détention limité ou spécifié - Précisez") || null,
    scientifique_mortality_measures_taken:
      checked(
        "En cas de mortalité lors de ces suivis, y a-t-il eu des mesures complémentaires prises ?",
      ) ?? null,
    scientifique_mortality_measures_details: stringValue("Précisez ces mesures :") || null,
    ...makeDossierEolienColumns88444(champById, keyToChamp, activiteCode, showsOperationDetails),
    scientifique_capture_mode: showsCaptureDetails ? JSON.stringify([...captureModes]) : null,
    scientifique_light_source_conditions: showsCaptureDetails
      ? (lightSourceConditions ?? null)
      : null,
    scientifique_marking_conditions:
      showsCaptureDetails && (demandeTypes ?? []).includes(scientifiqueDemandeTypeOptions[1])
        ? (markingConditions ?? null)
        : null,
    scientifique_transport_conditions:
      showsCaptureDetails && (demandeTypes ?? []).includes(scientifiqueDemandeTypeOptions[2])
        ? (transportConditions ?? null)
        : null,
    scientifique_intervention_perimeter:
      stringValue(`Précisez le périmètre d'intervention`) || undefined,
    scientifique_intervenants:
      showsOperationDetails && intervenants ? JSON.stringify(intervenants) : null,
    scientifique_other_intervenants_details: showsOperationDetails
      ? stringValue(
          `Apporter des précisions complémentaires sur la possible intervention de stagiaire(s)/vacataire(s)/bénévole(s)`,
        ) || null
      : null,
  };
}
