import type { Knex } from "knex";
import type { DossierInitializer } from "@pitchou/types/database/public/Dossier.ts";
import type GroupeInstructeurs from "@pitchou/types/database/public/GroupeInstructeurs.ts";

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
  const defaults: DossierInitializer = {
    name: "Dossier de test",
    demarche_number: DEFAULT_NUMERO_DEMARCHE,
    source: "demarche_numerique",
    depot_date: new Date(),
  };
  const insert = { ...defaults, ...overrides };
  const [row] = await db("dossier").insert(insert).returning(["id", "name", "demarche_number"]);
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
  await db("edge_groupe_instructeurs__dossier").insert({
    dossier: dossierId,
    groupe_instructeurs: groupeId,
  });
}

/**
 * Shares a dossier with a groupe in read-only mode. Unlike
 * `attachDossierToGroupe`, this does not hand over the instruction — and several
 * groupes can be given the same dossier this way.
 */
export async function shareDossierWithGroupe(
  db: Knex,
  dossierId: number,
  groupeId: string,
): Promise<void> {
  await db("edge_groupe_instructeurs__dossier_lecture").insert({
    dossier: dossierId,
    groupe_instructeurs: groupeId,
  });
}
