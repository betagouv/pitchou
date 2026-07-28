import type { Knex } from "knex";

import { normalizeEmail } from "@pitchou/common/stringManipulation.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { EntrepriseSiret } from "@pitchou/types/database/public/Entreprise.ts";
import type { GroupeInstructeursId } from "@pitchou/types/database/public/GroupeInstructeurs.ts";
import type { PersonneId, PersonneInitializer } from "@pitchou/types/database/public/Personne.ts";

export type AdminIdentiteDossierType = "demandeur" | "mandataire" | "representant";

export type AdminDossierIdentite = {
  type: AdminIdentiteDossierType;
  last_name: string | null;
  first_names: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
};

export type AdminDemandeurPersonnePhysiqueRelations = {
  last_name: string;
  first_names: string;
  email: string | null;
  address: string | null;
  phone: string | null;
  role: string | null;
};

export type AdminDemandeurPersonneMoraleRelations = {
  siret: EntrepriseSiret;
  legal_name: string | null;
  address: string | null;
  postal_code: string | null;
  department: string | null;
  region: string | null;
};

type AdminDossierRelationsBase = {
  groupe_instructeurs: GroupeInstructeursId;
  identites: AdminDossierIdentite[];
};

export type AdminDossierRelations = AdminDossierRelationsBase &
  (
    | {
        demandeur_type: "personne_physique";
        demandeur_personne_physique: AdminDemandeurPersonnePhysiqueRelations;
        demandeur_personne_morale: null;
      }
    | {
        demandeur_type: "personne_morale";
        demandeur_personne_physique: null;
        demandeur_personne_morale: AdminDemandeurPersonneMoraleRelations;
      }
  );

async function insertDossierPersonne(
  personne: PersonneInitializer,
  trx: Knex.Transaction,
): Promise<PersonneId> {
  const email = personne.email ? normalizeEmail(personne.email) : null;
  if (email) {
    const [inserted] = await trx("personne")
      .insert({ ...personne, email })
      .onConflict("email")
      .ignore()
      .returning("id");
    if (inserted) return inserted.id;
  }

  const [inserted] = await trx("personne")
    .insert({ ...personne, email: null })
    .returning("id");
  return inserted.id;
}

export async function updateDossierAdminRelations(
  dossierId: DossierId,
  relations: AdminDossierRelations,
  trx: Knex.Transaction,
): Promise<void> {
  const groupe = await trx("groupe_instructeurs")
    .select("id")
    .where({ id: relations.groupe_instructeurs })
    .first();
  if (!groupe) {
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
    const personneId = await insertDossierPersonne(relations.demandeur_personne_physique, trx);
    await trx("dossier").where({ id: dossierId }).update({
      demandeur_personne_physique: personneId,
      demandeur_personne_morale: null,
      deposant: personneId,
    });
    return;
  }

  const entreprise = relations.demandeur_personne_morale;
  await trx("entreprise")
    .insert({ ...entreprise, siren: entreprise.siret.slice(0, 9) })
    .onConflict("siret")
    .ignore();

  const demandeur = relations.identites.find(({ type }) => type === "demandeur");
  if (!demandeur) throw new TypeError("A demandeur identity is required");
  const deposantId = await insertDossierPersonne(
    {
      last_name: demandeur.last_name,
      first_names: demandeur.first_names,
      email: demandeur.email,
      phone: demandeur.phone,
      role: demandeur.role,
    },
    trx,
  );
  await trx("dossier").where({ id: dossierId }).update({
    demandeur_personne_physique: null,
    demandeur_personne_morale: entreprise.siret,
    deposant: deposantId,
  });
}
