import { isOfficialAvisExpert } from "@pitchou/common/avisExpert.ts";

import type { FichierAttachment } from "../fichier_access.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

/**
 * Whether a read-only viewer may download a file, from how it hangs off its
 * dossier. This is the download side of `dossierFullForReadOnly`: the projection
 * decides which URLs are handed out, this decides which are served. They must
 * agree, which is why they live together.
 */
export function isFichierSharedInReadOnly({ relation, expert }: FichierAttachment): boolean {
  switch (relation) {
    case "avis":
      return isOfficialAvisExpert(expert);
    case "decision-administrative":
    case "especes-impactees":
    case "piece-jointe-petitionnaire":
      return true;
    // A saisine is part of the instruction, and « Autres » attachments are
    // whatever the instructeur filed on the dossier.
    case "saisine":
    case "attachment-autre":
      return false;
  }
}

/**
 * Narrows a dossier down to what a read-only viewer may see.
 *
 * Read-only mode is how a dossier gets shared outside the service, so everything
 * internal to the instruction is dropped here rather than merely hidden by the
 * UI: the browser never receives it. What is left is what the team agreed to
 * share — the projet, the instruction fields, the official avis and the
 * décisions administratives.
 *
 * The instructeur previewing their own dossier goes through the same projection,
 * so what they see is exactly what the person they share it with will get.
 */
export function dossierFullForReadOnly(dossier: DossierFull): DossierFull {
  return {
    ...dossier,

    // Commentaires are the service talking to itself. `free_comment` is the
    // legacy column the commentaires were migrated from; it is still selected
    // with the dossier, so it has to be dropped too.
    free_comment: "",
    latestCommentaire: null,
    cnpnEmailSentEvents: [],

    // Only the avis of the CSRPN, the CNPN and the ministre are shared, and only
    // the avis itself: a saisine says who the service consulted and when, which
    // belongs to the instruction rather than to its outcome.
    avisExpert: dossier.avisExpert
      .filter(({ expert }) => isOfficialAvisExpert(expert))
      .map((avis) => ({
        ...avis,
        saisine_date: null,
        saisine_fichier_url: undefined,
        saisine_fichier_description: undefined,
      })),

    // The décision administrative is the shareable act; its prescriptions — and
    // the contrôles hanging off them — are the service's follow-up work.
    decisionsAdministratives: dossier.decisionsAdministratives?.map((decision) => ({
      ...decision,
      prescriptions: undefined,
    })),

    // « Autres » attachments are whatever the instructeur filed on the dossier,
    // with no guarantee about what is in them.
    otherAttachments: [],
  };
}
