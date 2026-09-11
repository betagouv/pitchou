import type Controle from "@pitchou/types/database/public/Controle.ts";
import type DecisionAdministrative from "@pitchou/types/database/public/DecisionAdministrative.ts";
import type EvenementPhaseDossier from "@pitchou/types/database/public/EvenementPhaseDossier.ts";
import type File from "@pitchou/types/database/public/File.ts";
import type Prescription from "@pitchou/types/database/public/Prescription.ts";
import type {
  DossierCnpnEmailSentEvent,
  DossierFull,
  FrontEndFichier,
  FrontEndImpactOnEspece,
  FrontEndPrescription,
} from "@pitchou/types/API_Pitchou.ts";
import type { OtherAttachmentWithFileDescription } from "../other_attachment.ts";
import type { AvisWithFiles, DecisionWithFile } from "./fullQueries.ts";
import type CapDossier from "@pitchou/types/database/public/CapDossier.ts";

/**
 * The download routes authorize on the cap, so every file URL handed to the
 * browser carries the cap the dossier was fetched with — the same way the
 * capability URLs do.
 */
function fichierUrl(route: string, id: File["id"], cap: CapDossier["cap"]): string {
  return `${route}/${id}?cap=${encodeURIComponent(cap)}`;
}

function describeFichier(
  id: File["id"] | null | undefined,
  name: File["name"],
  media_type: File["media_type"],
  size: number | null,
  route: string,
  cap: CapDossier["cap"],
  created_at?: File["created_at"] | null,
): FrontEndFichier | undefined {
  return id
    ? {
        id,
        url: fichierUrl(route, id, cap),
        name: name as string,
        media_type: media_type as string,
        size,
        ...(created_at ? { created_at } : {}),
      }
    : undefined;
}

export type LoadedDossier = DossierFull & {
  especes_impactees_id?: File["id"] | null;
  especes_impactees_media_type?: string;
  especes_impactees_name?: string;
  demandeur_personne_morale_address?: string;
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
  dossier.demandeur_address =
    dossier.demandeur_personne_morale_address || dossier.demandeur_personne_physique_address || "";
  delete dossier.demandeur_personne_morale_address;
  dossier.evenementsPhase = events;
  dossier.cnpnEmailSentEvents = cnpnEmailSentEvents;
  dossier.avisExpert = avisRows.map(
    ({
      avis_fichier,
      avis_file_name,
      avis_fichier_media_type,
      avis_file_size,
      avis_file_created_at,
      saisine_fichier,
      saisine_file_name,
      saisine_fichier_media_type,
      saisine_file_size,
      saisine_file_created_at,
      ...avis
    }) => {
      const avisFile = describeFichier(
        avis_fichier,
        avis_file_name,
        avis_fichier_media_type,
        avis_file_size,
        "/avis-expert/fichier",
        cap,
        avis_file_created_at,
      );
      const saisineFile = describeFichier(
        saisine_fichier,
        saisine_file_name,
        saisine_fichier_media_type,
        saisine_file_size,
        "/avis-expert/fichier",
        cap,
        saisine_file_created_at,
      );
      return {
        ...avis,
        avis_fichier_url: avisFile?.url,
        saisine_fichier_url: saisineFile?.url,
        avis_fichier_description: avisFile,
        saisine_fichier_description: saisineFile,
      };
    },
  );
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
  const controlesByPrescription = new Map<Prescription["id"], Controle[]>();
  for (const controle of controles) {
    const values = controlesByPrescription.get(controle.prescription) || [];
    values.push(controle);
    controlesByPrescription.set(controle.prescription, values);
  }
  const prescriptionsByDecision = new Map<DecisionAdministrative["id"], FrontEndPrescription[]>();
  for (const prescription of prescriptions) {
    const frontEndPrescription = prescription as FrontEndPrescription;
    frontEndPrescription.controles = controlesByPrescription.get(prescription.id);
    const values = prescriptionsByDecision.get(prescription.decision_administrative) || [];
    values.push(frontEndPrescription);
    prescriptionsByDecision.set(prescription.decision_administrative, values);
  }
  if (decisions.length) {
    dossier.decisionsAdministratives = decisions.map(
      ({
        id,
        number,
        type,
        signature_date,
        obligations_end_date,
        fichier,
        file_name,
        file_media_type,
        file_size,
        dossier: decisionDossier,
      }) => {
        const file = describeFichier(
          fichier,
          file_name,
          file_media_type,
          file_size,
          "/decision-administrative/fichier",
          cap,
        );
        return {
          id,
          number,
          type,
          signature_date,
          obligations_end_date,
          prescriptions: prescriptionsByDecision.get(id),
          fichier_url: file?.url,
          fichier_description: file,
          dossier: decisionDossier,
        };
      },
    );
  }
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
