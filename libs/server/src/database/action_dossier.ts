import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import type ActionDossier from "@pitchou/types/database/public/ActionDossier.ts";
import type { ActionDossierInitializer } from "@pitchou/types/database/public/ActionDossier.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";

/** An action as served to the front, its author identified by email. */
export type ActionDossierView = Pick<
  ActionDossier,
  "id" | "type" | "data" | "created_at" | "author_petitionnaire"
> & {
  author_email: string | null;
};

/**
 * Records actions in a dossier's historique. Fire-and-forget shape: callers
 * pass fully-built rows; an empty list is a no-op.
 */
export async function logActionsDossier(
  actions: ActionDossierInitializer[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  if (actions.length === 0) return;
  await databaseConnection("action_dossier").insert(
    // JSON columns must be serialized for insertion.
    actions.map((action) => ({ ...action, data: JSON.stringify(action.data ?? {}) })),
  );
}

export async function getDossierActions(
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<ActionDossierView[]> {
  return databaseConnection("action_dossier")
    .leftJoin("personne", { "personne.id": "action_dossier.author_personne" })
    .select([
      "action_dossier.id",
      "action_dossier.type",
      "action_dossier.data",
      "action_dossier.created_at",
      "action_dossier.author_petitionnaire",
      "personne.email as author_email",
    ])
    .where({ "action_dossier.dossier": dossierId })
    .orderBy("action_dossier.created_at", "desc");
}
