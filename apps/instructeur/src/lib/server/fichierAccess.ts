import { error } from "@sveltejs/kit";

import {
  dossiersAccessibleViaCap,
  isFichierSharedInReadOnly,
} from "@pitchou/server/database/dossier.ts";
import { findFichierAttachment } from "@pitchou/server/database/fichier_access.ts";
import { requireCap } from "./auth.ts";

import type { FichierRelation } from "@pitchou/server/database/fichier_access.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

/**
 * Authorizes a file download: the caller must hold a cap reaching the dossier the
 * file belongs to, and the file must hang off that dossier the way this route
 * serves — a saisine is not downloadable through the décision administrative
 * route, whoever asks.
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

  const attachment = await findFichierAttachment(fileId);
  if (!attachment || !servedRelations.includes(attachment.relation)) {
    error(404, "Fichier non trouvé");
  }

  const access = (await dossiersAccessibleViaCap(attachment.dossier, cap)).get(attachment.dossier);
  if (!access) {
    error(404, "Fichier non trouvé");
  }

  // The cap decides, exactly as it does for the dossier payload: a dossier shared
  // in read-only mode only ever yields its shareable files. `lecture` on top of
  // that is the preview an instructeur who may write asks for.
  const readOnly = access === "lecture" || url.searchParams.get("lecture") === "1";
  if (readOnly && !isFichierSharedInReadOnly(attachment)) {
    error(404, "Fichier non trouvé");
  }
}
