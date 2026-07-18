import { store } from "$lib/state/store.svelte.ts";

import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

export function addAttachmentAutre(
  dossierId: DossierFull["id"],
  type: string,
  attachmentDate: Date | undefined | null,
  files: FileList,
) {
  const addAttachmentAutreCapability = store.capabilities.addAttachmentAutre;

  if (!addAttachmentAutreCapability) {
    throw new Error(`Pas les droits suffisants pour ajouter une pièce jointe`);
  }

  const form = new FormData();
  form.append("dossier", JSON.stringify(dossierId));
  form.append("type", type);
  if (attachmentDate) {
    form.append("attachment_date", attachmentDate.toISOString());
  }

  for (const file of files) {
    form.append("files", file);
  }

  return addAttachmentAutreCapability(form);
}
