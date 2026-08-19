import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { getPersonneByDossierCap } from "./personne.ts";

import type Commentaire from "@pitchou/types/database/public/Commentaire.ts";
import type { default as CapDossier } from "@pitchou/types/database/public/CapDossier.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";

/** A comment as served to the front, its author identified by email. */
export type CommentaireView = Pick<Commentaire, "id" | "content" | "created_at" | "updated_at"> & {
  /** Null for the comment migrated from the former free comment. */
  author_email: string | null;
};

const viewColumns = [
  "commentaire.id",
  "commentaire.content",
  "commentaire.created_at",
  "commentaire.updated_at",
  "personne.email as author_email",
];

export async function getDossierCommentaires(
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<CommentaireView[]> {
  return databaseConnection("commentaire")
    .leftJoin("personne", { "personne.id": "commentaire.personne" })
    .select(viewColumns)
    .where({ "commentaire.dossier": dossierId })
    .orderBy("commentaire.created_at", "desc");
}

export async function addCommentaireFromCap(
  cap: CapDossier["cap"],
  dossierId: Dossier["id"],
  content: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<CommentaireView> {
  const personne = await getPersonneByDossierCap(cap);

  if (!personne) {
    throw new Error(`Aucune personne n'a été trouvée pour la capability : ${cap}`);
  }

  const [{ id }] = await databaseConnection("commentaire")
    .insert({ dossier: dossierId, personne: personne.id, content })
    .returning("id");

  return { id, content, created_at: new Date(), updated_at: null, author_email: personne.email };
}

/**
 * Edits a comment's content. Only the author may edit their comment; returns
 * false when the comment does not belong to them (or does not exist).
 */
export async function updateCommentaireFromCap(
  cap: CapDossier["cap"],
  dossierId: Dossier["id"],
  commentaireId: Commentaire["id"],
  content: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<boolean> {
  const personne = await getPersonneByDossierCap(cap);

  if (!personne) {
    throw new Error(`Aucune personne n'a été trouvée pour la capability : ${cap}`);
  }

  const updatedCount = await databaseConnection("commentaire")
    .update({ content, updated_at: databaseConnection.fn.now() })
    .where({ id: commentaireId, dossier: dossierId, personne: personne.id });

  return updatedCount > 0;
}
