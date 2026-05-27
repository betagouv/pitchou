/** @import { default as AvisExpert, AvisExpertInitializer } from "../../types/database/public/AvisExpert" */
/** @import { FrontEndAvisExpert } from '../../types/API_Pitchou.js' */

import { envoyerÉvènement } from "./aarri.js";
import { store } from "../store.svelte.ts";

/**
 * Ajoute un avis d'expert.
 *
 * @param {Pick<FrontEndAvisExpert, "dossier"> & Partial<FrontEndAvisExpert>} frontEndAvisExpert
 * @param {File | undefined} [fileFichierSaisine]
 * @param {File | undefined} [fileFichierAvis]
 * @returns {Promise<string>}
 */
export function ajouterOuModifierAvisExpert(
  frontEndAvisExpert,
  fileFichierSaisine,
  fileFichierAvis,
) {
  const addOrUpdateAvisExpert = store.capabilities.addOrUpdateAvisExpert;
  if (!addOrUpdateAvisExpert) {
    throw new Error(`Pas les droits suffisants pour ajouter ou modifier un avis d'expert`);
  }

  const form = new FormData();

  const copyFrontEndAvisExpert = Object.assign({}, frontEndAvisExpert);

  delete copyFrontEndAvisExpert.avis_fichier_url;
  delete copyFrontEndAvisExpert.saisine_fichier_url;

  /**@type {Pick<AvisExpert, "dossier"> & AvisExpertInitializer} */
  const avisExpert = { ...copyFrontEndAvisExpert };

  // Dans un objet FormData, la valeur de la clef ne peut être qu'un string ou un Blob,
  // et dossier est de type number & {__brand: "public.dossier";}
  // @ts-expect-error
  form.append("dossier", avisExpert.dossier);

  // Dans le cas d'une modification,
  // on fournit l'id de l'avis d'expert
  if (avisExpert.id) {
    form.append("id", avisExpert.id);
    envoyerÉvènement({ type: "modifierAvisExpert" });
  } else {
    // Dans le cas d'un ajout
    envoyerÉvènement({ type: "ajouterAvisExpert" });
  }

  if (avisExpert.avis) {
    form.append("avis", avisExpert.avis);
  }

  if (avisExpert.date_avis) {
    form.append("date_avis", avisExpert.date_avis.toJSON());
  }

  if (avisExpert.expert) {
    form.append("expert", avisExpert.expert);
  }

  if (avisExpert.date_saisine) {
    form.append("date_saisine", avisExpert.date_saisine.toJSON());
  }

  if (fileFichierSaisine) {
    form.append("blobFichierSaisine", fileFichierSaisine);
  }

  if (fileFichierAvis) {
    form.append("blobFichierAvis", fileFichierAvis);
  }

  return addOrUpdateAvisExpert(form);
}

/**
 * Supprime un avis d'expert.
 * @param {Pick<AvisExpert, "id">} avisExpert
 */
export function supprimerAvisExpert(avisExpert) {
  const deleteAvisExpert = store.capabilities.deleteAvisExpert;
  if (!deleteAvisExpert) {
    throw new Error(`Pas les droits suffisants pour supprimer un avis d'expert`);
  }

  envoyerÉvènement({ type: "supprimerAvisExpert" });
  return deleteAvisExpert(avisExpert.id);
}
