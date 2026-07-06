import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { stockerNouveauFichier } from "./fichier.ts";

import type { FrontEndAttachmentAutre } from "@pitchou/types/API_Pitchou.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type Fichier from "@pitchou/types/database/public/Fichier.ts";

export type AttachmentAutreForCreation = {
  dossier: Dossier["id"];
  type: string;
  attachment_date?: Date | null;
  files: {
    nom: string;
    media_type: string | null;
    contenu: Buffer;
  }[];
};

export type AttachmentAutreWithFileDescription = Omit<
  FrontEndAttachmentAutre,
  "fichier_description" | "fichier_url"
> & {
  fichier_nom: Fichier["nom"];
  fichier_media_type: Fichier["media_type"];
  fichier_taille: number;
};

export async function addAttachmentAutre(
  attachment: AttachmentAutreForCreation,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const ids = [];

  for (const file of attachment.files) {
    const { id: fileId } = await stockerNouveauFichier(file, databaseConnection);

    const [{ id }] = await databaseConnection("attachment_autre")
      .insert({
        dossier: attachment.dossier,
        fichier: fileId,
        type: attachment.type,
        attachment_date: attachment.attachment_date,
      })
      .returning("id");

    ids.push(id);
  }

  return ids;
}

export async function getAttachmentAutresForDossier(
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<AttachmentAutreWithFileDescription[]> {
  return databaseConnection("attachment_autre")
    .select([
      "attachment_autre.*",
      "fichier_attachment_autre.nom as fichier_nom",
      "fichier_attachment_autre.media_type as fichier_media_type",
      databaseConnection.raw(
        "coalesce(length(fichier_attachment_autre.contenu), file_attachment_autre.taille)::integer as fichier_taille",
      ),
    ])
    .leftJoin("fichier as fichier_attachment_autre", {
      "fichier_attachment_autre.id": "attachment_autre.fichier",
    })
    .leftJoin("file as file_attachment_autre", {
      "file_attachment_autre.id": "fichier_attachment_autre.file_id",
    })
    .where({ dossier: dossierId })
    .orderBy("attachment_date", "desc")
    .orderBy("created_at", "desc");
}
