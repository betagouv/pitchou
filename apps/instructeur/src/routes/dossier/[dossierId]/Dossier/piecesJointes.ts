import type {
  DossierFull,
  FrontEndAvisExpert,
  FrontEndFichier,
} from "@pitchou/types/API_Pitchou.ts";
import type File from "@pitchou/types/database/public/File.ts";
import { isOfficialAvisExpert } from "@pitchou/common/avisExpert.ts";

export type PieceJointeSimple = {
  label: string;
  description?: FrontEndFichier;
  date?: Date | string | null;
  labelDate: string;
  url: string;
  fileId?: File["id"];
  selectedForCnpnByDefault?: boolean;
};

export type PieceJointeGroup = {
  title: string;
  pieces: PieceJointeSimple[];
};

function labelAvisExpert(avisExpert: FrontEndAvisExpert) {
  return avisExpert.expert ?? "Expert";
}

export function piecesJointesProjet(dossier: DossierFull): PieceJointeSimple[] {
  return dossier.piecesJointesPetitionnaires.map(
    ({ id, url, demarche_numerique_created_at, name, media_type, size }) => ({
      label: name || "(fichier sans nom)",
      description: { id, name, media_type, size, url },
      date: demarche_numerique_created_at,
      labelDate: "Date de dépôt",
      url,
      fileId: id,
    }),
  );
}

export function piecesJointesAvis(dossier: DossierFull, readOnly = false): PieceJointeSimple[] {
  return dossier.avisExpert.flatMap((avisExpert) => {
    const pieces: PieceJointeSimple[] = [];
    const expert = labelAvisExpert(avisExpert);

    // Read-only sharing exposes official avis only, never saisines or internal consultations.
    if (readOnly && !isOfficialAvisExpert(avisExpert.expert)) return pieces;

    if (avisExpert.saisine_fichier_url && !readOnly) {
      pieces.push({
        label: `Saisine - ${expert}`,
        description: avisExpert.saisine_fichier_description,
        date: avisExpert.saisine_date,
        labelDate: "Date de saisine",
        url: avisExpert.saisine_fichier_url,
        fileId: avisExpert.saisine_fichier_description?.id,
        selectedForCnpnByDefault: avisExpert.expert?.trim().toUpperCase() === "CNPN",
      });
    }

    if (avisExpert.avis_fichier_url) {
      pieces.push({
        label: `Avis - ${expert}`,
        description: avisExpert.avis_fichier_description,
        date: avisExpert.avis_date,
        labelDate: "Date de l'avis",
        url: avisExpert.avis_fichier_url,
        fileId: avisExpert.avis_fichier_description?.id,
      });
    }

    return pieces;
  });
}

export function piecesJointesDecisions(dossier: DossierFull): PieceJointeSimple[] {
  return (dossier.decisionsAdministratives ?? []).flatMap((decision) => {
    if (!decision.fichier_url) {
      return [];
    }

    return [
      {
        label: `${decision.type || "Décision administrative"}${decision.number ? ` ${decision.number}` : ""}`,
        description: decision.fichier_description,
        date: decision.signature_date,
        labelDate: "Date de signature",
        url: decision.fichier_url,
        fileId: decision.fichier_description?.id,
      },
    ];
  });
}

export function piecesJointesAutres(dossier: DossierFull): PieceJointeSimple[] {
  return dossier.otherAttachments.map((attachment) => ({
    label: attachment.type,
    description: attachment.fichier_description,
    date: attachment.attachment_date,
    labelDate: "Date de la pièce jointe",
    url: attachment.fichier_url ?? "",
    fileId: attachment.fichier,
  }));
}

/**
 * Every downloadable pièce jointe of a dossier, grouped the same way the Pièces jointes tab
 * displays them. Groups without any file are dropped: consumers that list files to pick from
 * have nothing to show for them.
 */
export function piecesJointesGroups(dossier: DossierFull): PieceJointeGroup[] {
  return [
    { title: "Projet", pieces: piecesJointesProjet(dossier) },
    { title: "Avis d'experts", pieces: piecesJointesAvis(dossier) },
    { title: "Décisions administratives", pieces: piecesJointesDecisions(dossier) },
    { title: "Autres", pieces: piecesJointesAutres(dossier) },
  ].filter((group) => group.pieces.some((piece) => piece.url));
}
