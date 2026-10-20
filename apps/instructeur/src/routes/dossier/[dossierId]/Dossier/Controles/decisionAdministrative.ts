import { parseControles } from "./decisionAdministrative/controles.ts";
import {
  getODSTableRawContent,
  tableRawContentToObjects,
  tableWithoutEmptyRows,
} from "@odfjs/odfjs";

import { isValidDate } from "@pitchou/common/typeFormat.ts";
import { addPrescriptionsAndControles } from "./prescriptions.ts";
import { refreshDossierFull } from "$lib/dossier/dossier.ts";
import { store } from "$lib/state/store.svelte.ts";
import { parseQuantities } from "./decisionAdministrative/quantities.ts";
import {
  PrescriptionImportError,
  SurfaceConversionRequired,
  type SurfaceConversion,
} from "./decisionAdministrative/errors.ts";

import type {
  PrescriptionWithNewControles,
  FrontEndDecisionAdministrative,
  DecisionAdministrativeForTransfer,
} from "@pitchou/types/API_Pitchou.ts";
import type DecisionAdministrative from "@pitchou/types/database/public/DecisionAdministrative.ts";

const prescriptionColumns = [
  "Numéro article",
  "Description",
  "Date échéance",
  "Surface compensée",
  "Surface évitée",
  "Individus compensés",
  "Individus évités",
  "Nids compensés",
  "Nids évités",
];

export async function createPrescriptionControlesFromFichier(
  fichierPrescriptionControleAB: ArrayBuffer,
  decisionAdministrative: FrontEndDecisionAdministrative,
  acceptedConversions: SurfaceConversion[] = [],
): Promise<number> {
  let rawData;
  try {
    rawData = await getODSTableRawContent(fichierPrescriptionControleAB);
  } catch {
    throw new PrescriptionImportError(
      "Le fichier n'est pas un tableur ODS valide. Enregistrez-le au format ODS puis sélectionnez-le à nouveau.",
    );
  }
  const cleanData = [...tableRawContentToObjects(tableWithoutEmptyRows(rawData)).values()][0];

  if (!cleanData?.length) {
    throw new PrescriptionImportError(
      "La première feuille du fichier ne contient aucune prescription.",
    );
  }
  if (!prescriptionColumns.some((column) => column in cleanData[0])) {
    throw new PrescriptionImportError(
      "Aucune colonne de prescription reconnue. Utilisez les noms de colonnes du modèle.",
    );
  }

  const decisionNumber = decisionAdministrative.number;
  const conversions: SurfaceConversion[] = [];

  const candidatePrescriptions: PrescriptionWithNewControles[] = cleanData
    .filter((row) => {
      const prescriptionNumDec = String(row["Numéro décision administrative"] ?? "").trim();
      return (
        !prescriptionNumDec || prescriptionNumDec === (decisionNumber && decisionNumber.trim())
      );
    })
    .map((row, index) => {
      const {
        "Numéro article": articleNumber,
        Description: description,
        "Date échéance": dueDate,
      } = row;

      const prescription: PrescriptionWithNewControles = {
        decision_administrative: decisionAdministrative.id,
        due_date: isValidDate(new Date(dueDate)) ? new Date(dueDate) : null,
        article_number: articleNumber == null ? null : String(articleNumber),
        description,
        ...parseQuantities(row, index + 1, conversions),
        controles: undefined,
      };

      const controles = parseControles(row);

      if (controles.length > 0) {
        prescription.controles = controles;
      }

      return prescription;
    });

  if (candidatePrescriptions.length === 0) {
    throw new PrescriptionImportError(
      `Aucune prescription ne correspond à cette décision. La colonne "Numéro décision administrative" doit être vide ou contenir "${decisionNumber ?? ""}".`,
    );
  }

  if (
    conversions.length > 0 &&
    JSON.stringify(conversions) !== JSON.stringify(acceptedConversions)
  ) {
    throw new SurfaceConversionRequired(conversions);
  }
  await addPrescriptionsAndControles(candidatePrescriptions);
  return candidatePrescriptions.length;
}

export function deleteDecisionAdministrative(
  decisionAdministrativeId: DecisionAdministrative["id"],
): Promise<unknown> {
  const deleteDecisionAdministrative = store.capabilities.deleteDecisionAdministrative;
  if (!deleteDecisionAdministrative) {
    throw new Error(`Pas les droits suffisants pour supprimer une décision administrative`);
  }

  return deleteDecisionAdministrative(decisionAdministrativeId);
}

export async function saveNewDecisionAdministrative(
  newDecisionAdministrative: DecisionAdministrativeForTransfer,
) {
  const modifierDecisionAdministrativeDansDossier =
    store.capabilities.modifierDecisionAdministrativeDansDossier;

  if (!modifierDecisionAdministrativeDansDossier) {
    throw new Error(`Pas les droits suffisants pour créer une décision administrative`);
  }

  if (!newDecisionAdministrative.dossier) {
    throw new TypeError(
      `décisionAdministrativeEnCréation.dossier manquant dans saveNewDecisionAdministrative`,
    );
  }

  await modifierDecisionAdministrativeDansDossier(newDecisionAdministrative);

  refreshDossierFull(newDecisionAdministrative.dossier);
}
