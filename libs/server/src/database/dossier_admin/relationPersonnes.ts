import type { Knex } from "knex";
import { normalizeEmail } from "@pitchou/common/stringManipulation.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { PersonneId, PersonneInitializer } from "@pitchou/types/database/public/Personne.ts";

const references = [
  ["evenement_phase_dossier", "caused_by_personne"],
  ["edge_personne_follows_dossier", "personne"],
  ["notification", "personne"],
  ["evenement_metrique", "personne"],
  ["dossier_search", "personne"],
] as const;

async function hasReferences(id: PersonneId, trx: Knex.Transaction, excludedDossierId?: DossierId) {
  const dossiers = trx("dossier")
    .select("id")
    .where(function () {
      this.where("demandeur_personne_physique", id).orWhere("deposant", id);
    });
  if (excludedDossierId !== undefined) dossiers.whereNot("id", excludedDossierId);
  if (await dossiers.first()) return true;
  for (const [table, column] of references) {
    if (await trx(table).select(column).where(column, id).first()) return true;
  }
  return false;
}

/** Only the identity of a personne: its contact details now live in personne_physique. */
type DossierPersonne = Pick<PersonneInitializer, "last_name" | "first_names" | "email">;

async function insertPersonne(
  { last_name, first_names, ...personne }: DossierPersonne,
  trx: Knex.Transaction,
): Promise<PersonneId> {
  const email = personne.email ? normalizeEmail(personne.email) : null;
  if (email) {
    const [inserted] = await trx("personne")
      .insert({ last_name, first_names, email })
      .onConflict("email")
      .ignore()
      .returning("id");
    if (inserted) return inserted.id;
  }
  const [inserted] = await trx("personne")
    .insert({ last_name, first_names, email: null })
    .returning("id");
  return inserted.id;
}

export async function updateOrInsertDossierPersonne(
  currentId: PersonneId | null,
  dossierId: DossierId,
  personne: DossierPersonne,
  trx: Knex.Transaction,
): Promise<PersonneId> {
  const current =
    currentId && (await trx("personne").select("access_code").where({ id: currentId }).first());
  if (
    !currentId ||
    !current ||
    current.access_code !== null ||
    (await hasReferences(currentId, trx, dossierId))
  ) {
    return insertPersonne(personne, trx);
  }
  let email = personne.email ? normalizeEmail(personne.email) : null;
  if (
    email &&
    (await trx("personne").select("id").where({ email }).whereNot({ id: currentId }).first())
  )
    email = null;
  await trx("personne")
    .where({ id: currentId })
    .update({
      last_name: personne.last_name ?? null,
      first_names: personne.first_names ?? null,
      email,
    });
  return currentId;
}

export async function deleteUnreferencedDossierPersonnes(
  ids: Array<PersonneId | null>,
  trx: Knex.Transaction,
): Promise<void> {
  for (const id of new Set(ids.filter((value): value is PersonneId => value !== null))) {
    const personne = await trx("personne").select("access_code").where({ id }).first();
    if (personne?.access_code === null && !(await hasReferences(id, trx))) {
      await trx("personne").where({ id }).delete();
    }
  }
}
