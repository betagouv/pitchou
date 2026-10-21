import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { EntrepriseSiret } from "@pitchou/types/database/public/Entreprise.ts";
import type { PersonnePhysiqueId } from "@pitchou/types/database/public/PersonnePhysique.ts";
import type { PorteurDeProjetId } from "@pitchou/types/database/public/PorteurDeProjet.ts";
import type { PorteurDeProjetInitializer } from "@pitchou/types/porteurDeProjet.ts";

/**
 * Finds the porteur de projet shared by every dossier of this SIRET, or creates it.
 * The entreprise row is created with the SIRET only when it does not exist yet.
 */
async function porteurDeProjetIdForSiret(
  siret: EntrepriseSiret,
  databaseConnection: Knex.Transaction | Knex,
): Promise<PorteurDeProjetId> {
  await databaseConnection("entreprise")
    .insert({ siret, siren: siret.slice(0, 9) })
    .onConflict("siret")
    .ignore();
  const existing = await databaseConnection("porteur_de_projet")
    .select("id")
    .where({ personne_morale: siret })
    .first();
  if (existing) return existing.id;
  const [{ id }] = await databaseConnection("porteur_de_projet")
    .insert({ personne_morale: siret })
    .returning("id");
  return id;
}

/**
 * Stores the porteur de projet of each dossier (Démarche Numérique synchronization or admin).
 * A personne physique belongs to its dossier and is updated in place. A porteur left
 * without dossier is deleted by the delete_orphan_porteur_de_projet trigger.
 */
export async function savePorteursDeProjet(
  porteurByDossierId: Map<DossierId, PorteurDeProjetInitializer>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  if (!databaseConnection.isTransaction)
    return databaseConnection.transaction((trx) => savePorteursDeProjet(porteurByDossierId, trx));
  if (porteurByDossierId.size === 0) return;

  const current: {
    id: DossierId;
    porteur_de_projet: PorteurDeProjetId | null;
    personne_physique: PersonnePhysiqueId | null;
  }[] = await databaseConnection("dossier")
    .leftJoin("porteur_de_projet", "porteur_de_projet.id", "dossier.porteur_de_projet")
    .select("dossier.id", "dossier.porteur_de_projet", "porteur_de_projet.personne_physique")
    .whereIn("dossier.id", [...porteurByDossierId.keys()]);
  const currentByDossier = new Map(current.map((row) => [row.id, row]));

  // Sequential, so that two dossiers of the same SIRET share one porteur.
  for (const [dossierId, porteur] of porteurByDossierId) {
    const before = currentByDossier.get(dossierId);
    let porteurId: PorteurDeProjetId | null = null;

    if (porteur?.type === "personne_physique") {
      const { type: _type, ...personnePhysique } = porteur;
      if (before?.personne_physique) {
        await databaseConnection("personne_physique")
          .where({ id: before.personne_physique })
          .update(personnePhysique);
        porteurId = before.porteur_de_projet;
      } else {
        const [{ id: personnePhysiqueId }] = await databaseConnection("personne_physique")
          .insert(personnePhysique)
          .returning("id");
        [{ id: porteurId }] = await databaseConnection("porteur_de_projet")
          .insert({ personne_physique: personnePhysiqueId })
          .returning("id");
      }
    } else if (porteur?.type === "personne_morale") {
      porteurId = await porteurDeProjetIdForSiret(porteur.siret, databaseConnection);
    }

    if (porteurId !== (before?.porteur_de_projet ?? null)) {
      await databaseConnection("dossier")
        .where({ id: dossierId })
        .update({ porteur_de_projet: porteurId });
    }
  }
}
