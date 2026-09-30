import { store } from "$lib/state/store.svelte.ts";
import { uploadFichiers } from "$lib/upload/uploadToStorage.ts";

import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

export async function addOtherAttachment(
  dossierId: DossierFull["id"],
  type: string,
  attachmentDate: Date | undefined | null,
  files: FileList,
) {
  const addOtherAttachmentCapability = store.capabilities.addOtherAttachment;

  if (!addOtherAttachmentCapability) {
    throw new Error(`Pas les droits suffisants pour ajouter une pièce jointe`);
  }

  const uploaded = await uploadFichiers(dossierId, Array.from(files));

  return addOtherAttachmentCapability({
    dossier: dossierId,
    type,
    attachment_date: attachmentDate ?? undefined,
    files: uploaded,
  });
}
