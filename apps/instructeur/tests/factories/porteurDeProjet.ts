import type { Knex } from "knex";

import type { PorteurDeProjetData } from "@pitchou/types/porteurDeProjet.ts";

export const SIRET = "12345678900001";

export function physique(last_name: string, phone: string | null = null): PorteurDeProjetData {
  return {
    personne_physique: {
      first_names: "Camille",
      last_name,
      email: "camille@test.fr",
      address: null,
      phone,
      role: null,
    },
  };
}

export function morale(siret: string): PorteurDeProjetData {
  return { personne_morale: siret } as PorteurDeProjetData;
}

export async function porteurOf(db: Knex, dossierId: number) {
  return db("dossier")
    .leftJoin("porteur_de_projet", "porteur_de_projet.id", "dossier.porteur_de_projet")
    .leftJoin("personne_physique", "personne_physique.id", "porteur_de_projet.personne_physique")
    .select(
      "dossier.porteur_de_projet",
      "porteur_de_projet.personne_morale",
      "porteur_de_projet.personne_physique",
      "personne_physique.last_name",
      "personne_physique.phone",
    )
    .where("dossier.id", dossierId)
    .first();
}

export async function count(db: Knex, table: string): Promise<number> {
  const [{ count }] = await db(table).count();
  return Number(count);
}
