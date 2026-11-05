import { comparePhaseEventsNewestFirst } from "@pitchou/common/phases.ts";
import type { DossierAccess, DossierFull } from "@pitchou/types/API_Pitchou.ts";
import { withResolvedActivite } from "../activite.ts";
import { formatDossierFull, type LoadedDossier } from "../dossier/fullFormat.ts";
import { historicalImpacts } from "./impacts.ts";
import type { DemandeState } from "./state.ts";
import { restoreHistoryDates } from "./dates.ts";

/** Build the same domain view as a live demande, using only frozen data. */
export function historicalDossier(state: DemandeState, access: DossierAccess): DossierFull {
  const snapshot = structuredClone(state);
  restoreHistoryDates(snapshot);
  const files = new Map(snapshot.files.map((file) => [file.id, file]));
  const speciesFile = files.get(snapshot.dossier.especes_impactees!);
  const loaded = {
    ...snapshot.dossier,
    acteurs: snapshot.acteurs,
    latestCommentaire: snapshot.commentaires.at(-1)?.content ?? null,
    especes_impactees_id: speciesFile?.id,
    especes_impactees_name: speciesFile?.name,
    especes_impactees_media_type: speciesFile?.media_type,
    access,
  } as unknown as LoadedDossier;
  const dossier = formatDossierFull(
    loaded,
    snapshot.phases.toSorted(comparePhaseEventsNewestFirst),
    snapshot.avis.map((avis) => {
      const file = files.get(avis.avis_fichier!);
      const saisine = files.get(avis.saisine_fichier!);
      return {
        ...avis,
        avis_file_name: file?.name ?? "",
        avis_fichier_media_type: file?.media_type ?? null,
        avis_file_size: file ? Number(file.size) : null,
        avis_file_created_at: file?.created_at ?? null,
        saisine_file_name: saisine?.name ?? "",
        saisine_fichier_media_type: saisine?.media_type ?? null,
        saisine_file_size: saisine ? Number(saisine.size) : null,
        saisine_file_created_at: saisine?.created_at ?? null,
      };
    }),
    snapshot.files
      .filter(({ id }) => snapshot.pieces.includes(id))
      .map((file) => ({ ...file, size: Number(file.size) })),
    snapshot.decisions.map((decision) => {
      const file = files.get(decision.fichier!);
      return {
        ...decision,
        file_name: file?.name ?? "",
        file_media_type: file?.media_type ?? null,
        file_size: file ? Number(file.size) : null,
      };
    }),
    snapshot.attachments.map((attachment) => {
      const file = files.get(attachment.fichier);
      return {
        ...attachment,
        file_name: file?.name ?? "",
        file_media_type: file?.media_type ?? null,
        file_size: file ? Number(file.size) : 0,
      };
    }),
    snapshot.prescriptions,
    snapshot.controles,
    historicalImpacts(snapshot),
    snapshot.cnpnEmails,
  );
  dossier.porteur_de_projet = snapshot.porteur;
  return withResolvedActivite(dossier);
}
