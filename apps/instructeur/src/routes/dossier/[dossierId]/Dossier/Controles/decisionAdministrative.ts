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
  FrontEndPrescription,
  FrontEndDecisionAdministrative,
  ResultatControle,
  TypesActionSuiteControle,
  DecisionAdministrativeForTransfer,
} from "@pitchou/types/API_Pitchou.ts";
import type Controle from "@pitchou/types/database/public/Controle.ts";
import type DecisionAdministrative from "@pitchou/types/database/public/DecisionAdministrative.ts";

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
  if (!prescriptionColumns.some((column) => column in cleanData[0])) {
    throw new PrescriptionImportError(
      "Aucune colonne de prescription reconnue. Utilisez les noms de colonnes du modèle.",
    );
  }

  const decisionNumber = decisionAdministrative.number;
  const conversions: SurfaceConversion[] = [];

  const candidatePrescriptions: Omit<FrontEndPrescription, "id">[] = cleanData
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

      const prescription: Omit<FrontEndPrescription, "id"> = {
        decision_administrative: decisionAdministrative.id,
        due_date: isValidDate(new Date(dueDate)) ? new Date(dueDate) : null,
        article_number: articleNumber == null ? null : String(articleNumber),
        description,
        ...parseQuantities(row, index + 1, conversions),
        controles: undefined,
      };

      const controles: Omit<Controle, "id" | "prescription">[] = [];
      let controleNumber = 1;

      while (true) {
        const controleDateProperty = `${controleNumber} Date contrôle`;
        const resultProperty = `${controleNumber} Résultat contrôle`;
        const commentProperty = `${controleNumber} Commentaire`;
        const postControleActionTypeProperty = `${controleNumber} Type de Suite`;
        const postControleActionDateProperty = `${controleNumber} Date de la suite`;
        const nextDueDateProperty = `${controleNumber} Date Echéance`;

        const controleDate = row[controleDateProperty];
        let result: ResultatControle = row[resultProperty];
        if (result && result.trim() === "non conforme") {
          result = "Non conforme";
        }
        if (result && result.trim() === "conforme") {
          result = "Conforme";
        }
        if (result && result.trim() === "en cours") {
          result = "En cours";
        }
        if (result && result.trim() === "trop tard") {
          result = "Trop tard";
        }

        const comment = row[commentProperty];

        let postControleActionType: TypesActionSuiteControle = row[postControleActionTypeProperty];

        if (postControleActionType && postControleActionType.trim() === "mail") {
          postControleActionType = "Email";
        }
        if (postControleActionType && postControleActionType.trim() === "courrier") {
          postControleActionType = "Courrier";
        }

        const postControleActionDate = row[postControleActionDateProperty];
        const nextDueDate = row[nextDueDateProperty];

        if (controleDate && result) {
          controles.push({
            controle_date: isValidDate(new Date(controleDate)) ? new Date(controleDate) : null,
            result,
            comment,
            post_controle_action_type: postControleActionType,
            post_controle_action_date: isValidDate(new Date(postControleActionDate))
              ? new Date(postControleActionDate)
              : null,
            next_due_date: isValidDate(new Date(nextDueDate)) ? new Date(nextDueDate) : null,
          });

          controleNumber = controleNumber + 1;
        } else {
          break;
        }
      }

      if (controles.length >= 1) {
        // @ts-ignore
        prescription.controles = controles;
      }

      return prescription;
    });

  if (!candidatePrescriptions.length) {
    throw new PrescriptionImportError(
      `Aucune prescription ne correspond à cette décision. La colonne "Numéro décision administrative" doit être vide ou contenir "${decisionNumber ?? ""}".`,
    );
  }

  if (conversions.length && JSON.stringify(conversions) !== JSON.stringify(acceptedConversions)) {
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
