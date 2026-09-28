import type Dossier from "../database/public/Dossier.ts";
import type File from "../database/public/File.ts";

/**
 * A file the browser already sent to object storage through a signed URL.
 * The API registers it under this id once the surrounding entity is saved.
 */
export type UploadedFichier = { id: File["id"]; name: string };

export type UploadUrlRequest = {
  dossier: Dossier["id"];
  /** One entry per file; the byte size is part of the URL signature. */
  files: { size: number }[];
};

/** Where to PUT one file. `id` becomes the file id once registered. */
export type UploadUrl = { id: File["id"]; url: string };

export type AvisExpertForTransfer = {
  dossier: Dossier["id"];
  id?: string;
  expert?: string | null;
  avis?: string | null;
  saisine_date?: Date | string | null;
  avis_date?: Date | string | null;
  saisine_fichier_upload?: UploadedFichier;
  avis_fichier_upload?: UploadedFichier;
};

export type OtherAttachmentForTransfer = {
  dossier: Dossier["id"];
  type: string;
  attachment_date?: Date | string | null;
  files: UploadedFichier[];
};
