import { assignDecisions } from "./fullFormat/decisions.ts";
import type Controle from "@pitchou/types/database/public/Controle.ts";
import type EvenementPhaseDossier from "@pitchou/types/database/public/EvenementPhaseDossier.ts";
import type File from "@pitchou/types/database/public/File.ts";
import type Prescription from "@pitchou/types/database/public/Prescription.ts";
import type {
  DossierCnpnEmailSentEvent,
  DossierFull,
  FrontEndImpactOnEspece,
} from "@pitchou/types/API_Pitchou.ts";
import type { OtherAttachmentWithFileDescription } from "../other_attachment.ts";
import type { AvisWithFiles, DecisionWithFile } from "./fullQueries.ts";
import type CapDossier from "@pitchou/types/database/public/CapDossier.ts";
import { withPorteurDeProjet } from "./porteur.ts";

import { fichierUrl, describeFichier, formatAvis } from "./fullFormat/attachments.ts";

export type LoadedDossier = DossierFull & {
  especes_impactees_id?: File["id"] | null;
  especes_impactees_media_type?: string;
  especes_impactees_name?: string;
};

export function formatDossierFull(
  dossier: LoadedDossier,
  events: EvenementPhaseDossier[],
  avisRows: AvisWithFiles[],
  pieces: (Pick<File, "demarche_numerique_created_at" | "id" | "name" | "media_type"> & {
    size: number;
  })[],
  decisions: DecisionWithFile[],
  attachments: OtherAttachmentWithFileDescription[],
  prescriptions: Prescription[],
  controles: Controle[],
  impacts: FrontEndImpactOnEspece[],
  cnpnEmailSentEvents: DossierCnpnEmailSentEvent[],
  cap: CapDossier["cap"],
): DossierFull {
  withPorteurDeProjet(dossier);
  dossier.evenementsPhase = events;
  dossier.cnpnEmailSentEvents = cnpnEmailSentEvents;
  dossier.avisExpert = formatAvis(avisRows, cap);
  dossier.piecesJointesPetitionnaires = pieces.map(({ id, ...piece }) => ({
    id,
    url: fichierUrl("/piece-jointe-petitionnaire/fichier", id, cap),
    ...piece,
  }));
  dossier.especesImpactees = {
    sourceFile:
      dossier.especes_impactees_id &&
      dossier.especes_impactees_media_type &&
      dossier.especes_impactees_name
        ? {
            url: fichierUrl("/especes-impactees", dossier.especes_impactees_id, cap),
            media_type: dossier.especes_impactees_media_type,
            name: dossier.especes_impactees_name,
          }
        : undefined,
    impacts,
  };
  delete dossier.especes_impactees_id;
  delete dossier.especes_impactees_media_type;
  delete dossier.especes_impactees_name;
  assignDecisions(dossier, decisions, prescriptions, controles, cap);
  dossier.otherAttachments = attachments.map(
    ({ fichier, file_name, file_media_type, file_size, ...attachment }) => {
      const file = describeFichier(
        fichier,
        file_name,
        file_media_type,
        file_size,
        "/attachment-autre/fichier",
        cap,
      );
      return { ...attachment, fichier, fichier_url: file?.url, fichier_description: file };
    },
  );
  return dossier;
}
