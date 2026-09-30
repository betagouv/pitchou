import { store } from "$lib/state/store.svelte.ts";
import { uploadFichiers } from "$lib/upload/uploadToStorage.ts";

import type { default as AvisExpert } from "@pitchou/types/database/public/AvisExpert.ts";
import type { AvisExpertForTransfer, FrontEndAvisExpert } from "@pitchou/types/API_Pitchou.ts";

/**
 * Adds or updates an expert avis. Files go to object storage first; the API
 * then receives their references along with the avis fields.
 */
export async function addOrUpdateAvisExpert(
  frontEndAvisExpert: Pick<FrontEndAvisExpert, "dossier"> & Partial<FrontEndAvisExpert>,
  fileFichierSaisine?: File | undefined,
  fileFichierAvis?: File | undefined,
): Promise<string> {
  const addOrUpdateAvisExpert = store.capabilities.addOrUpdateAvisExpert;
  if (!addOrUpdateAvisExpert) {
    throw new Error(`Pas les droits suffisants pour ajouter ou modifier un avis d'expert`);
  }

  const { dossier, id, avis, avis_date, expert, saisine_date } = frontEndAvisExpert;
  const avisExpert: AvisExpertForTransfer = { dossier };
  // Only send what is set, so an update leaves the other columns untouched.
  if (id) avisExpert.id = id;
  if (avis) avisExpert.avis = avis;
  if (avis_date) avisExpert.avis_date = avis_date;
  if (expert) avisExpert.expert = expert;
  if (saisine_date) avisExpert.saisine_date = saisine_date;

  const files = [fileFichierSaisine, fileFichierAvis];
  const toUpload = files.filter((file): file is File => file !== undefined);
  const uploaded = toUpload.length > 0 ? await uploadFichiers(dossier, toUpload) : [];
  if (fileFichierSaisine) avisExpert.saisine_fichier_upload = uploaded.shift();
  if (fileFichierAvis) avisExpert.avis_fichier_upload = uploaded.shift();

  return addOrUpdateAvisExpert(avisExpert);
}

/**
 * Deletes an expert avis.
 */
export function deleteAvisExpert(avisExpert: Pick<AvisExpert, "id">) {
  const deleteAvisExpert = store.capabilities.deleteAvisExpert;
  if (!deleteAvisExpert) {
    throw new Error(`Pas les droits suffisants pour supprimer un avis d'expert`);
  }

  return deleteAvisExpert(avisExpert.id);
}
