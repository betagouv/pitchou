import type { Knex } from "knex";
import type { DossierInitializer } from "@pitchou/types/database/public/Dossier.ts";

export const DEFAULT_NUMERO_DEMARCHE = 88444;

export type CreatedDossier = {
  id: number;
  nom: string | null;
  numéroDémarche: number;
};

export async function createDossier(
  db: Knex,
  overrides: Partial<DossierInitializer> = {},
): Promise<CreatedDossier> {
  const defaults: DossierInitializer = {
    nom: "Dossier de test",
    numéro_démarche: DEFAULT_NUMERO_DEMARCHE,
    date_dépôt: new Date(),
  };
  const insert = { ...defaults, ...overrides };
  const [row] = await db("dossier").insert(insert).returning(["id", "nom", "numéro_démarche"]);
  return {
    id: row.id,
    nom: row.nom,
    numéroDémarche: row["numéro_démarche"],
  };
}

export async function createGroupeInstructeurs(
  db: Knex,
  overrides: { nom?: string; numéro_démarche?: number } = {},
): Promise<{ id: string; nom: string }> {
  const insert = {
    nom: overrides.nom ?? "Groupe de test",
    numéro_démarche: overrides.numéro_démarche ?? DEFAULT_NUMERO_DEMARCHE,
  };
  const [row] = await db("groupe_instructeurs").insert(insert).returning(["id", "nom"]);
  return row;
}

export async function attachDossierToGroupe(
  db: Knex,
  dossierId: number,
  groupeId: string,
): Promise<void> {
  await db("arête_groupe_instructeurs__dossier").insert({
    dossier: dossierId,
    groupe_instructeurs: groupeId,
  });
}
