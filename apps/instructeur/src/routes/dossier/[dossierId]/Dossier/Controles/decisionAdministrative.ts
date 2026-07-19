import {
  getODSTableRawContent,
  tableRawContentToObjects,
  tableWithoutEmptyRows,
} from "@odfjs/odfjs";

import { isValidDate } from "@pitchou/common/typeFormat.ts";
import { addPrescriptionsAndControles } from "./prescriptions.ts";
import { refreshDossierFull } from "$lib/dossier/dossier.ts";
import { sendEvenement } from "$lib/shared/aarri.ts";
import { store } from "$lib/state/store.svelte.ts";

import type {
  FrontEndPrescription,
  FrontEndDecisionAdministrative,
  ResultatControle,
  TypesActionSuiteControle,
  DecisionAdministrativeForTransfer,
} from "@pitchou/types/API_Pitchou.ts";
import type Controle from "@pitchou/types/database/public/Controle.ts";
import type DecisionAdministrative from "@pitchou/types/database/public/DecisionAdministrative.ts";

/**
 * Finds the data and synchronizes it in the database
 */
export async function createPrescriptionControlesFromFichier(
  fichierPrescriptionControleAB: ArrayBuffer,
  decisionAdministrative: FrontEndDecisionAdministrative,
): Promise<FrontEndPrescription[]> {
  const rawData = await getODSTableRawContent(fichierPrescriptionControleAB);
  const cleanData = [...tableRawContentToObjects(tableWithoutEmptyRows(rawData)).values()][0];

  const decisionNumber = decisionAdministrative.number;

  const candidatePrescriptions: Omit<FrontEndPrescription, "id">[] = cleanData
    // @ts-ignore
    .filter((row) => {
      const prescriptionNumDec =
        row["Numéro décision administrative"] && row["Numéro décision administrative"].trim();
      // Keep the candidate prescription if it has no decision number or if it matches the one of the decision under consideration
      return (
        !prescriptionNumDec || prescriptionNumDec === (decisionNumber && decisionNumber.trim())
      );
    })
    // @ts-ignore
    .map((row) => {
      //console.log('row', row)

      const {
        "Numéro article": articleNumber,
        Description: description,
        "Date échéance": dueDate,
        "Surface compensée": compensatedSurface,
        "Surface évitée": avoidedSurface,
        "Individus compensés": compensatedIndividus,
        "Individus évités": avoidedIndividus,
        "Nids compensés": compensatedNids,
        "Nids évités": avoidedNids,
      } = row;

      const prescription: Omit<FrontEndPrescription, "id"> = {
        decision_administrative: decisionAdministrative.id,
        due_date: isValidDate(new Date(dueDate)) ? new Date(dueDate) : null,
        article_number: articleNumber,
        description,
        compensated_individus: !compensatedIndividus ? undefined : compensatedIndividus,
        avoided_individus: !avoidedIndividus ? undefined : avoidedIndividus,
        compensated_nids: !compensatedNids ? undefined : compensatedNids,
        avoided_nids: !avoidedNids ? undefined : avoidedNids,
        compensated_surface: !compensatedSurface ? undefined : compensatedSurface,
        avoided_surface: !avoidedSurface ? undefined : avoidedSurface,
        controles: undefined,
      };

      let controles: Omit<Controle, "id" | "prescription">[] = [];

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

  //console.log('candidatePrescriptions', candidatePrescriptions)

  // @ts-ignore
  return addPrescriptionsAndControles(candidatePrescriptions).then(() => candidatePrescriptions);
}

export function deleteDecisionAdministrative(
  decisionAdministrativeId: DecisionAdministrative["id"],
): Promise<unknown> {
  const deleteDecisionAdministrative = store.capabilities.deleteDecisionAdministrative;
  if (!deleteDecisionAdministrative) {
    throw new Error(`Pas les droits suffisants pour supprimer une décision administrative`);
  }

  sendEvenement({ type: "supprimerDécisionAdministrative" });

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

  sendEvenement({ type: "ajouterDécisionAdministrative" });

  await modifierDecisionAdministrativeDansDossier(newDecisionAdministrative);

  refreshDossierFull(newDecisionAdministrative.dossier);
}
