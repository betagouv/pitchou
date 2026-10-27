import type { Knex } from "knex";
import { directDatabaseConnection } from "../../database.ts";
import { insertBatches } from "../insertBatches.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type Message from "@pitchou/types/database/public/Message.ts";
import type * as API_DS from "@pitchou/types/demarche-numerique/apiSchema.ts";

export async function dumpDossierMessages(
  idToMessages: Map<Dossier["id"], API_DS.Message[]>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  if (!databaseConnection.isTransaction)
    return databaseConnection.transaction((trx) => dumpDossierMessages(idToMessages, trx));
  const messages: Partial<Message>[] = [];
  for (const [dossierId, apiMessages] of idToMessages) {
    for (const { id, body, createdAt, email } of apiMessages) {
      messages.push({
        content: body,
        date: new Date(createdAt),
        sender_email: email,
        demarche_numerique_id: id,
        dossier: dossierId,
      });
    }
  }
  for (const batch of insertBatches(messages))
    await databaseConnection("message").insert(batch).onConflict("demarche_numerique_id").merge();
}
