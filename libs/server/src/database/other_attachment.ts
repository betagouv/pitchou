import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { registerUploadedFichier } from "./fichier_upload.ts";

import type { FrontEndOtherAttachment, UploadedFichier } from "@pitchou/types/API_Pitchou.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type File from "@pitchou/types/database/public/File.js";

export type OtherAttachmentForCreation = {
  dossier: Dossier["id"];
  type: string;
  attachment_date?: Date | null;
  /** Files the browser already sent to object storage. */
  files: UploadedFichier[];
};

export type OtherAttachmentWithFileDescription = Omit<
  FrontEndOtherAttachment,
  "fichier_description" | "fichier_url"
> & {
  file_name: File["name"];
  file_media_type: File["media_type"];
  file_size: number;
};

export async function addOtherAttachment(
  attachment: OtherAttachmentForCreation,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const ids = [];

  for (const file of attachment.files) {
    const { id: fileId } = await registerUploadedFichier(file, databaseConnection);

    const [{ id }] = await databaseConnection("other_attachment")
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

export async function getOtherAttachmentsForDossier(
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<OtherAttachmentWithFileDescription[]> {
  return databaseConnection("other_attachment")
    .select([
      "other_attachment.*",
      "file_other_attachment.name as file_name",
      "file_other_attachment.media_type as file_media_type",
      databaseConnection.raw("file_other_attachment.size::integer as file_size"),
    ])
    .leftJoin("file as file_other_attachment", {
      "file_other_attachment.id": "other_attachment.fichier",
    })
    .where({ dossier: dossierId })
    .orderBy("attachment_date", "desc")
    .orderBy("created_at", "desc");
}
