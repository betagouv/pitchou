import type { Knex } from "knex";
import type File from "@pitchou/types/database/public/File.ts";

import { directDatabaseConnection } from "../database.js";

export function addFile(
  f: Partial<File>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Partial<File>> {
  return databaseConnection("file")
    .insert(f)
    .returning([
      "id",
      "name",
      "media_type",
      "size",
      "demarche_numerique_checksum",
      "demarche_numerique_created_at",
    ])
    .then((rows) => rows[0] as Partial<File>);
}

export function getFile(
  id: File["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<File | undefined> {
  return databaseConnection("file").select("*").where("id", id).first();
}

export function deleteFile(
  id: File["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<number> {
  return databaseConnection("file").delete().where({ id });
}
