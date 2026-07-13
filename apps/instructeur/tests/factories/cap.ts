import type { Knex } from "knex";

export async function createCapDossier(db: Knex, personneCap: string): Promise<{ cap: string }> {
  const [row] = await db("cap_dossier").insert({ personne_cap: personneCap }).returning(["cap"]);
  return row;
}

export async function createCapEvenementMetrique(
  db: Knex,
  personneCap: string,
): Promise<{ cap: string }> {
  const [row] = await db("cap_évènement_métrique")
    .insert({ personne_cap: personneCap })
    .returning(["cap"]);
  return row;
}

export async function attachCapToGroupe(db: Knex, cap: string, groupeId: string): Promise<void> {
  await db("arête_cap_dossier__groupe_instructeurs").insert({
    cap_dossier: cap,
    groupe_instructeurs: groupeId,
  });
}
