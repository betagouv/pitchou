import { isOfficialAvisExpert } from "@pitchou/common/avisExpert.ts";

import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

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
