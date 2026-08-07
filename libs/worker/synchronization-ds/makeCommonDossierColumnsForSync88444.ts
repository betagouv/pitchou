import {
  restaurationMainActivite,
  transportMainActivites,
} from "@pitchou/common/dossierFormOptions.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { ChampDescriptor } from "@pitchou/types/demarche-numerique/schema.ts";
import type { DossierInitializer, DossierMutator } from "@pitchou/types/database/public/Dossier.ts";
import { indexDossier88444Champs } from "./makeCommonDossierColumnsForSync88444/dossier88444FieldMaps.ts";
import { makeDossierLocationColumns88444 } from "./makeCommonDossierColumnsForSync88444/makeDossierLocationColumns88444.ts";
import { makeDossierScientificColumns88444 } from "./makeCommonDossierColumnsForSync88444/makeDossierScientificColumns88444.ts";

export function makeCommonDossierColumnsForSync88444(
  dossierDS: DossierDS88444,
  pitchouKeyToChampDS: Map<keyof DossierDemarcheNumerique88444, ChampDescriptor["id"]>,
): DossierInitializer | DossierMutator {
  const { id, number, champs } = dossierDS;
  const champById = indexDossier88444Champs(champs);
  const stringValue = (label: keyof DossierDemarcheNumerique88444) =>
    champById.get(pitchouKeyToChampDS.get(label))?.stringValue;
  const checked = (label: keyof DossierDemarcheNumerique88444) =>
    champById.get(pitchouKeyToChampDS.get(label))?.checked;
  const name = stringValue("Nom du projet premettant de l'identifier clairement");
  const description = stringValue("Description synthétique du projet");
  const mainActivite = stringValue("Activité principale");
  const interventionStartDate = champById.get(
    pitchouKeyToChampDS.get("Date de début d’intervention"),
  )?.date;
  const interventionEndDate = champById.get(
    pitchouKeyToChampDS.get("Date de fin d’intervention"),
  )?.date;
  const commissioningDate = champById.get(pitchouKeyToChampDS.get("Date de mise en service"))?.date;
  const parsedDuration = Number(stringValue("Durée de la dérogation"));
  const interventionDuration =
    Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : null;
  const noOtherSolution = stringValue(
    `Synthèse des éléments démontrant qu'il n'existe aucune alternative au projet`,
  )?.trim();
  const motifDerogation = stringValue(`Motif de la dérogation`);
  const motifDerogationJustification = stringValue(
    `Synthèse des éléments justifiant le motif de la dérogation`,
  )?.trim();

  const linkedToAeRegimeValue = stringValue(
    "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?",
  );
  let linkedToAeRegime = null;
  if (linkedToAeRegimeValue === "Oui" || linkedToAeRegimeValue === "true") {
    linkedToAeRegime = true;
  }
  if (linkedToAeRegimeValue === "Non" || linkedToAeRegimeValue === "false") {
    linkedToAeRegime = false;
  }
  const aeProcedures = champById.get(
    pitchouKeyToChampDS.get("À quelle procédure le projet est-il soumis ?"),
  )?.values;

  const compensatedNidsValue = stringValue(
    "Indiquer le nombre de nids artificiels posés en compensation",
  );
  const compensatedNidsCount = compensatedNidsValue ? Number(compensatedNidsValue) : null;
  const destroyedNidsValue = stringValue("Nombre de nids d'Hirondelles détruits");
  const destroyedNidsCount = destroyedNidsValue ? Number(destroyedNidsValue) : null;
  const railOrElectricTransport = stringValue(
    "Transport ferroviaire ou électrique - Votre demande concerne :",
  );
  const type = destroyedNidsValue
    ? "Hirondelle"
    : railOrElectricTransport === "Destruction de nids de Cigognes"
      ? "Cigogne"
      : null;
  const requiresCompensatedNidsCount =
    (mainActivite === restaurationMainActivite && type === "Hirondelle") ||
    (transportMainActivites.includes(mainActivite as never) && type === "Cigogne");

  // JSON columns are serialized before insertion even though generated row types describe reads.
  // @ts-expect-error Serialized JSON values intentionally differ from Kanel's read-side types.
  return {
    demarche_numerique_id: id,
    demarche_numerique_number: String(number),
    source: "demarche_numerique",
    ecological_inventory_completed: checked(
      "Avez-vous réalisé un état des lieux écologique complet ?",
    ),
    especes_present_in_influence_area: checked(
      "Des spécimens ou habitats d'espèces protégées sont-ils présents dans l'aire d'influence de votre projet ?",
    ),
    risk_despite_erc_mesures: checked(
      "Après mises en oeuvre de mesures d'évitement et de réduction, un risque suffisamment caractérisé pour les espèces protégées demeure-t-il ?",
    ),
    name,
    description,
    main_activite: mainActivite,
    intervention_start_date: interventionStartDate ?? null,
    intervention_end_date: interventionEndDate ?? null,
    commissioning_date: commissioningDate ?? null,
    intervention_duration: interventionDuration,
    no_other_satisfactory_solution_justification: noOtherSolution,
    motif_derogation: motifDerogation,
    motif_derogation_justification: motifDerogationJustification,
    ...makeDossierLocationColumns88444(champs, champById, pitchouKeyToChampDS),
    linked_to_ae_regime: linkedToAeRegime,
    ae_procedures: aeProcedures ? JSON.stringify(aeProcedures) : null,
    ae_other_procedure: null,
    mesures_erc_planned: checked("Des mesures ERC sont-elles prévues ?"),
    ...makeDossierScientificColumns88444(
      champById,
      pitchouKeyToChampDS,
      mainActivite,
      motifDerogation,
    ),
    dossier_oiseau_simple_compensated_nids_count: requiresCompensatedNidsCount
      ? compensatedNidsCount
      : null,
    dossier_oiseau_simple_destroyed_nids_count: destroyedNidsCount,
    type,
  };
}
