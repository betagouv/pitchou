import { lockDossierAccess, recalculateAssignments } from "@pitchou/server/dossierRouting.ts";
import type { DossierInitializer } from "@pitchou/types/database/public/Dossier.ts";
import type GroupeInstructeurs from "@pitchou/types/database/public/GroupeInstructeurs.ts";
import type { Knex } from "knex";

export const DEFAULT_NUMERO_DEMARCHE = 88444;

export type CreatedDossier = {
  id: number;
  name: string | null;
  demarcheNumber: number;
};

export async function createDossier(
  db: Knex,
  overrides: Partial<DossierInitializer> = {},
): Promise<CreatedDossier> {
  if (!db.isTransaction) return db.transaction((trx) => createDossier(trx, overrides));
  await lockDossierAccess(db as Knex.Transaction);
  const defaults: DossierInitializer = {
    name: "Dossier de test",
    demarche_number: DEFAULT_NUMERO_DEMARCHE,
    source: "demarche_numerique",
    depot_date: new Date(),
  };
  const insert = { ...defaults, ...overrides };
  const [row] = await db("dossier").insert(insert).returning(["id", "name", "demarche_number"]);
  await recalculateAssignments(db as Knex.Transaction, { dossiers: [row.id] });
  return {
    id: row.id,
    name: row.name,
    demarcheNumber: row.demarche_number,
  };
}

export async function createGroupeInstructeurs(
  db: Knex,
  overrides: { name?: string; demarche_number?: number } = {},
): Promise<{ id: GroupeInstructeurs["id"]; name: string }> {
  const insert = {
    name: overrides.name ?? "Groupe de test",
    demarche_number: overrides.demarche_number ?? DEFAULT_NUMERO_DEMARCHE,
  };
  const [row] = await db("groupe_instructeurs").insert(insert).returning(["id", "name"]);
  return row;
}

export async function attachDossierToGroupe(
  db: Knex,
  dossierId: number,
  groupeId: string,
): Promise<void> {
  if (!db.isTransaction)
    return db.transaction((trx) => attachDossierToGroupe(trx, dossierId, groupeId));
  await lockDossierAccess(db as Knex.Transaction);
  const dossier = await db("dossier").where({ id: dossierId }).first();
  const department = dossier.primary_department ?? `test-${dossierId}`;
  await db("dossier").where({ id: dossierId }).update({ primary_department: department });
  await db("groupe_departement")
    .insert({ groupe_instructeurs: groupeId, department })
    .onConflict(["groupe_instructeurs", "department"])
    .ignore();
  await recalculateAssignments(db as Knex.Transaction, { dossiers: [dossierId] });
}
