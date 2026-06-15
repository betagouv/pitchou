import {
  getODSTableRawContent,
  tableRawContentToObjects,
  tableWithoutEmptyRows,
} from "@odfjs/odfjs";

import { isValidDate } from "@pitchou/common/typeFormat.ts";
import { ajouterPrescriptionsEtContrôles } from "./prescriptions.ts";
import { refreshDossierComplet } from "./dossier.ts";
import { envoyerÉvènement } from "./aarri.ts";
import { store } from "../store.svelte.ts";

import type {
  FrontEndPrescription,
  FrontEndDécisionAdministrative,
  RésultatContrôle,
  TypesActionSuiteContrôle,
  DécisionAdministrativePourTransfer,
} from "@pitchou/types/API_Pitchou.ts";
import type Contrôle from "@pitchou/types/database/public/Contrôle.ts";
import type DécisionAdministrative from "@pitchou/types/database/public/DécisionAdministrative.ts";

/**
 * Trouve les données et les synchronise en BDD
 */
export async function créerPrescriptionContrôlesÀPartirDeFichier(
  fichierPrescriptionContrôleAB: ArrayBuffer,
  décisionAdministrative: FrontEndDécisionAdministrative,
): Promise<FrontEndPrescription[]> {
  const rawData = await getODSTableRawContent(fichierPrescriptionContrôleAB);
  const cleanData = [...tableRawContentToObjects(tableWithoutEmptyRows(rawData)).values()][0];

  const numéroDécision = décisionAdministrative.numéro;

  const candidatsPrescriptions: Omit<FrontEndPrescription, "id">[] = cleanData
    // @ts-ignore
    .filter((row) => {
      const prescriptionNumDec =
        row["Numéro décision administrative"] && row["Numéro décision administrative"].trim();
      // Garder la prescription candidate si elle n'a pas de numéro de décision ou s'il matche celui de la décision considéré
      return (
        !prescriptionNumDec || prescriptionNumDec === (numéroDécision && numéroDécision.trim())
      );
    })
    // @ts-ignore
    .map((row) => {
      //console.log('row', row)

      const {
        "Numéro article": numéro_article,
        Description: description,
        "Date échéance": date_échéance,
        "Surface compensée": surface_compensée,
        "Surface évitée": surface_évitée,
        "Individus compensés": individus_compensés,
        "Individus évités": individus_évités,
        "Nids compensés": nids_compensés,
        "Nids évités": nids_évités,
      } = row;

      const prescription: Omit<FrontEndPrescription, "id"> = {
        décision_administrative: décisionAdministrative.id,
        date_échéance: isValidDate(new Date(date_échéance)) ? new Date(date_échéance) : null,
        numéro_article,
        description,
        individus_compensés: !individus_compensés ? undefined : individus_compensés,
        individus_évités: !individus_évités ? undefined : individus_évités,
        nids_compensés: !nids_compensés ? undefined : nids_compensés,
        nids_évités: !nids_évités ? undefined : nids_évités,
        surface_compensée: !surface_compensée ? undefined : surface_compensée,
        surface_évitée: !surface_évitée ? undefined : surface_évitée,
        contrôles: undefined,
      };

      let contrôles: Omit<Contrôle, "id" | "prescription">[] = [];

      let numéroContrôle = 1;

      while (true) {
        const date_contrôleProp = `${numéroContrôle} Date contrôle`;
        const résultatProp = `${numéroContrôle} Résultat contrôle`;
        const commentaireProp = `${numéroContrôle} Commentaire`;
        const type_action_suite_contrôleProp = `${numéroContrôle} Type de Suite`;
        const date_action_suite_contrôleProp = `${numéroContrôle} Date de la suite`;
        const date_prochaine_échéanceProp = `${numéroContrôle} Date Echéance`;

        const date_contrôle = row[date_contrôleProp];
        let résultat: RésultatContrôle = row[résultatProp];
        if (résultat && résultat.trim() === "non conforme") {
          résultat = "Non conforme";
        }
        if (résultat && résultat.trim() === "conforme") {
          résultat = "Conforme";
        }
        if (résultat && résultat.trim() === "en cours") {
          résultat = "En cours";
        }
        if (résultat && résultat.trim() === "trop tard") {
          résultat = "Trop tard";
        }

        const commentaire = row[commentaireProp];

        let type_action_suite_contrôle: TypesActionSuiteContrôle =
          row[type_action_suite_contrôleProp];

        if (type_action_suite_contrôle && type_action_suite_contrôle.trim() === "mail") {
          type_action_suite_contrôle = "Email";
        }
        if (type_action_suite_contrôle && type_action_suite_contrôle.trim() === "courrier") {
          type_action_suite_contrôle = "Courrier";
        }

        const date_action_suite_contrôle = row[date_action_suite_contrôleProp];
        const date_prochaine_échéance = row[date_prochaine_échéanceProp];

        if (date_contrôle && résultat) {
          contrôles.push({
            date_contrôle: isValidDate(new Date(date_contrôle)) ? new Date(date_contrôle) : null,
            résultat,
            commentaire,
            type_action_suite_contrôle,
            date_action_suite_contrôle: isValidDate(new Date(date_action_suite_contrôle))
              ? new Date(date_action_suite_contrôle)
              : null,
            date_prochaine_échéance: isValidDate(new Date(date_prochaine_échéance))
              ? new Date(date_prochaine_échéance)
              : null,
          });

          numéroContrôle = numéroContrôle + 1;
        } else {
          break;
        }
      }

      if (contrôles.length >= 1) {
        // @ts-ignore
        prescription.contrôles = contrôles;
      }

      return prescription;
    });

  //console.log('candidatsPrescriptions', candidatsPrescriptions)

  // @ts-ignore
  return ajouterPrescriptionsEtContrôles(candidatsPrescriptions).then(() => candidatsPrescriptions);
}

export function supprimerDécisionAdministrative(
  décisionAdministrativeId: DécisionAdministrative["id"],
): Promise<unknown> {
  const deleteDecisionAdministrative = store.capabilities.deleteDecisionAdministrative;
  if (!deleteDecisionAdministrative) {
    throw new Error(`Pas les droits suffisants pour supprimer une décision administrative`);
  }

  envoyerÉvènement({ type: "supprimerDécisionAdministrative" });

  return deleteDecisionAdministrative(décisionAdministrativeId);
}

export async function sauvegardeNouvelleDécisionAdministrative(
  décisionAdministrativeEnCréation: DécisionAdministrativePourTransfer,
) {
  const modifierDécisionAdministrativeDansDossier =
    store.capabilities.modifierDécisionAdministrativeDansDossier;

  if (!modifierDécisionAdministrativeDansDossier) {
    throw new Error(`Pas les droits suffisants pour créer une décision administrative`);
  }

  if (!décisionAdministrativeEnCréation.dossier) {
    throw new TypeError(
      `décisionAdministrativeEnCréation.dossier manquant dans sauvegardeNouvelleDécisionAdministrative`,
    );
  }

  envoyerÉvènement({ type: "ajouterDécisionAdministrative" });

  await modifierDécisionAdministrativeDansDossier(décisionAdministrativeEnCréation);

  refreshDossierComplet(décisionAdministrativeEnCréation.dossier);
}
