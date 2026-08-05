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

const personneReferenceColumns = [
  ["evenement_phase_dossier", "caused_by_personne"],
  ["edge_personne_follows_dossier", "personne"],
  ["notification", "personne"],
  ["evenement_metrique", "personne"],
  ["dossier_search", "personne"],
] as const;

async function hasPersonneReferences(
  personneId: PersonneId,
  trx: Knex.Transaction,
  excludedDossierId?: DossierId,
): Promise<boolean> {
  const dossierQuery = trx("dossier")
    .select("id")
    .where(function () {
      this.where("demandeur_personne_physique", personneId).orWhere("deposant", personneId);
    });
  if (excludedDossierId !== undefined) dossierQuery.whereNot("id", excludedDossierId);
  if (await dossierQuery.first()) return true;

  for (const [table, column] of personneReferenceColumns) {
    if (await trx(table).select(column).where(column, personneId).first()) return true;
  }
  return false;
}

async function canReuseDossierPersonne(
  personneId: PersonneId,
  dossierId: DossierId,
  trx: Knex.Transaction,
): Promise<boolean> {
  const personne = await trx("personne").select("access_code").where({ id: personneId }).first();
  return Boolean(
    personne &&
    personne.access_code === null &&
    !(await hasPersonneReferences(personneId, trx, dossierId)),
  );
}

async function updateOrInsertDossierPersonne(
  currentPersonneId: PersonneId | null,
  dossierId: DossierId,
  personne: PersonneInitializer,
  trx: Knex.Transaction,
): Promise<PersonneId> {
  if (!currentPersonneId || !(await canReuseDossierPersonne(currentPersonneId, dossierId, trx))) {
    return insertDossierPersonne(personne, trx);
  }

  let email = personne.email ? normalizeEmail(personne.email) : null;
  if (email) {
    const emailOwner = await trx("personne")
      .select("id")
      .where({ email })
      .whereNot({ id: currentPersonneId })
      .first();
    if (emailOwner) email = null;
  }
  await trx("personne")
    .where({ id: currentPersonneId })
    .update({
      last_name: personne.last_name ?? null,
      first_names: personne.first_names ?? null,
      email,
      address: personne.address ?? null,
      phone: personne.phone ?? null,
      role: personne.role ?? null,
    });
  return currentPersonneId;
}

async function deleteUnreferencedDossierPersonnes(
  personneIds: Array<PersonneId | null>,
  trx: Knex.Transaction,
): Promise<void> {
  for (const personneId of new Set(personneIds.filter((id): id is PersonneId => id !== null))) {
    const personne = await trx("personne").select("access_code").where({ id: personneId }).first();
    if (
      !personne ||
      personne.access_code !== null ||
      (await hasPersonneReferences(personneId, trx))
    ) {
      continue;
    }
    await trx("personne").where({ id: personneId }).delete();
  }
}

export async function updateDossierAdminRelations(
  dossierId: DossierId,
  relations: AdminDossierRelations,
  trx: Knex.Transaction,
): Promise<void> {
  const currentDossier = await trx("dossier")
    .select("demandeur_personne_physique", "deposant")
    .where({ id: dossierId })
    .first();
  if (!currentDossier) throw new TypeError(`Unknown dossier: ${dossierId}`);

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
    const personneId = await updateOrInsertDossierPersonne(
      currentDossier.demandeur_personne_physique,
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
      [currentDossier.demandeur_personne_physique, currentDossier.deposant].filter(
        (id) => id !== personneId,
      ),
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
        currentDossier.deposant,
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
    [currentDossier.demandeur_personne_physique, currentDossier.deposant].filter(
      (id) => id !== deposantId,
    ),
    trx,
  );
}
