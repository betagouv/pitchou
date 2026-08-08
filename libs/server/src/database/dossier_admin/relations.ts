import type { Knex } from "knex";
import { normalizeEmail } from "@pitchou/common/stringManipulation.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import {
  deleteUnreferencedDossierPersonnes,
  updateOrInsertDossierPersonne,
} from "./relationPersonnes.ts";
import type { AdminDossierRelations } from "./relationTypes.ts";

export { deleteUnreferencedDossierPersonnes };

export async function updateDossierAdminRelations(
  dossierId: DossierId,
  relations: AdminDossierRelations,
  trx: Knex.Transaction,
): Promise<void> {
  const current = await trx("dossier")
    .select("demandeur_personne_physique", "deposant")
    .where({ id: dossierId })
    .first();
  if (!current) throw new TypeError(`Unknown dossier: ${dossierId}`);
  if (
    !(await trx("groupe_instructeurs")
      .select("id")
      .where({ id: relations.groupe_instructeurs })
      .first())
  ) {
    throw new TypeError(`Unknown groupe_instructeurs: ${relations.groupe_instructeurs}`);
  }
  await trx("edge_groupe_instructeurs__dossier").where({ dossier: dossierId }).delete();
  await trx("edge_groupe_instructeurs__dossier").insert({
    dossier: dossierId,
    groupe_instructeurs: relations.groupe_instructeurs,
  });
  await trx("identite_dossier").where({ dossier: dossierId }).delete();
  await trx("identite_dossier").insert(
    relations.identites.map((identite) => ({
      ...identite,
      dossier: dossierId,
      email: identite.email ? normalizeEmail(identite.email) : null,
    })),
  );
  if (relations.demandeur_type === "personne_physique") {
    const personneId = await updateOrInsertDossierPersonne(
      current.demandeur_personne_physique,
      dossierId,
      relations.demandeur_personne_physique,
      trx,
    );
    await trx("dossier").where({ id: dossierId }).update({
      demandeur_personne_physique: personneId,
      demandeur_personne_morale: null,
      deposant: personneId,
    });
    await deleteUnreferencedDossierPersonnes(
      [current.demandeur_personne_physique, current.deposant].filter((id) => id !== personneId),
      trx,
    );
    return;
  }
  const entreprise = relations.demandeur_personne_morale;
  await trx("entreprise")
    .insert({ ...entreprise, siren: entreprise.siret.slice(0, 9) })
    .onConflict("siret")
    .ignore();
  if (entreprise.legal_name) {
    await trx("entreprise")
      .where({ siret: entreprise.siret })
      .whereNull("legal_name")
      .update({ legal_name: entreprise.legal_name });
  }
  const demandeur = relations.identites.find(({ type }) => type === "demandeur");
  const deposantId = demandeur
    ? await updateOrInsertDossierPersonne(
        current.deposant,
        dossierId,
        {
          last_name: demandeur.last_name,
          first_names: demandeur.first_names,
          email: demandeur.email,
          phone: demandeur.phone,
          role: demandeur.role,
        },
        trx,
      )
    : null;
  await trx("dossier").where({ id: dossierId }).update({
    demandeur_personne_physique: null,
    demandeur_personne_morale: entreprise.siret,
    deposant: deposantId,
  });
  await deleteUnreferencedDossierPersonnes(
    [current.demandeur_personne_physique, current.deposant].filter((id) => id !== deposantId),
    trx,
  );
}
