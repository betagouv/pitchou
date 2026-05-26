import type { Knex } from "knex";
import type Fichier from "$types/database/public/Fichier.ts";

export type CreatedFichier = {
  id: Fichier["id"];
  nom: string;
};

export async function createFichier(
  db: Knex,
  overrides: { nom?: string; mediaType?: string; contenu?: Buffer } = {},
): Promise<CreatedFichier> {
  const insert = {
    nom: overrides.nom ?? "saisine.pdf",
    media_type: overrides.mediaType ?? "application/pdf",
    contenu: overrides.contenu ?? Buffer.from("%PDF-1.4 test"),
  };
  const [row] = await db("fichier").insert(insert).returning(["id", "nom"]);
  return { id: row.id, nom: row.nom };
}
