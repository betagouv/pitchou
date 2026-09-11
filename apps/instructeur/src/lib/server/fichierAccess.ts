import { error } from "@sveltejs/kit";

import {
  dossiersAccessibleViaCap,
  isFichierSharedInReadOnly,
} from "@pitchou/server/database/dossier.ts";
import { findFichierAttachments } from "@pitchou/server/database/fichier_access.ts";
import { requireCap } from "./auth.ts";

import type { FichierRelation } from "@pitchou/server/database/fichier_access.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

/**
 * Authorizes a file download if any attachment matches both the route and the
 * caller's access to that attachment's dossier. Permissions on separate edges
 * must not combine to grant access.
 *
 * Everything unauthorized answers 404 rather than 403, so a probe cannot tell an
 * inaccessible file from one that does not exist.
 */
export async function requireFichierAccess(
  url: URL,
  fileId: FileId,
  servedRelations: readonly FichierRelation[],
): Promise<void> {
  const cap = requireCap(url);

  const attachments = (await findFichierAttachments(fileId)).filter(({ relation }) =>
    servedRelations.includes(relation),
  );
  if (attachments.length === 0) {
    error(404, "Fichier non trouvé");
  }

  const accessByDossier = await dossiersAccessibleViaCap(
    attachments.map(({ dossier }) => dossier),
    cap,
  );

  // The cap decides, exactly as it does for the dossier payload: a dossier shared
  // in read-only mode only ever yields its shareable files. `lecture` on top of
  // that is the preview an instructeur who may write asks for.
  const allowed = attachments.some((attachment) => {
    const access = accessByDossier.get(attachment.dossier);
    if (!access) return false;
    const readOnly = access === "lecture" || url.searchParams.get("lecture") === "1";
    return !readOnly || isFichierSharedInReadOnly(attachment);
  });
  if (!allowed) {
    error(404, "Fichier non trouvé");
  }
}
