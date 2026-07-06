import { envoyerÉvènement } from "$lib/shared/aarri.ts";
import { store } from "$lib/state/store.svelte.ts";

import type {
  default as AvisExpert,
  AvisExpertInitializer,
} from "@pitchou/types/database/public/AvisExpert.ts";
import type { FrontEndAvisExpert } from "@pitchou/types/API_Pitchou.ts";

/**
 * Ajoute un avis d'expert.
 */
export function ajouterOuModifierAvisExpert(
  frontEndAvisExpert: Pick<FrontEndAvisExpert, "dossier"> & Partial<FrontEndAvisExpert>,
  fileFichierSaisine?: File | undefined,
  fileFichierAvis?: File | undefined,
): Promise<string> {
  const addOrUpdateAvisExpert = store.capabilities.addOrUpdateAvisExpert;
  if (!addOrUpdateAvisExpert) {
    throw new Error(`Pas les droits suffisants pour ajouter ou modifier un avis d'expert`);
  }

  const form = new FormData();

  const copyFrontEndAvisExpert = Object.assign({}, frontEndAvisExpert);

  delete copyFrontEndAvisExpert.avis_fichier_url;
  delete copyFrontEndAvisExpert.saisine_fichier_url;
  delete copyFrontEndAvisExpert.avis_fichier_description;
  delete copyFrontEndAvisExpert.saisine_fichier_description;

  const avisExpert: Pick<AvisExpert, "dossier"> & AvisExpertInitializer = {
    ...copyFrontEndAvisExpert,
  };

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
 */
export function supprimerAvisExpert(avisExpert: Pick<AvisExpert, "id">) {
  const deleteAvisExpert = store.capabilities.deleteAvisExpert;
  if (!deleteAvisExpert) {
    throw new Error(`Pas les droits suffisants pour supprimer un avis d'expert`);
  }

  envoyerÉvènement({ type: "supprimerAvisExpert" });
  return deleteAvisExpert(avisExpert.id);
}
