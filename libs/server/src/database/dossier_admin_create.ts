import type { Knex } from "knex";

import { directDatabaseConnection, dumpEntreprises } from "../database.ts";
import { ensurePersonneIdByEmail } from "./dossier_admin_personne.ts";
import { assertEditableDossierColumns } from "./dossier_admin_policy.ts";

import { normalizeEmail } from "@pitchou/common/stringManipulation.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { default as Entreprise } from "@pitchou/types/database/public/Entreprise.ts";
import type { PersonneId } from "@pitchou/types/database/public/Personne.ts";
import type {
  AdminDemandeurPersonnePhysique,
  AdminDossierCreation,
} from "./dossier_admin_types.ts";

async function ensureDemandeurPersonnePhysiqueId(
  demandeur: AdminDemandeurPersonnePhysique,
  databaseConnection: Knex.Transaction | Knex,
): Promise<PersonneId> {
  if (demandeur.email) {
    const normalized = normalizeEmail(demandeur.email);
    const existing = await databaseConnection("personne")
      .select("id")
      .where({ email: normalized })
      .first();
    if (existing) return existing.id;

    const [row] = await databaseConnection("personne")
      .insert({
        email: normalized,
        first_names: demandeur.first_names,
        last_name: demandeur.last_name,
      })
      .returning("id");
    return row.id;
  }

  const [row] = await databaseConnection("personne")
    .insert({ first_names: demandeur.first_names, last_name: demandeur.last_name })
    .returning("id");
  return row.id;
}

/** Creates a dossier directly in Pitchou, without Demarche Numerique. */
export async function createDossierFromAdmin(
  creation: AdminDossierCreation,
  adminEmail: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<{ id: DossierId }> {
  assertEditableDossierColumns(creation.columns);

  return databaseConnection.transaction(async (trx) => {
    const groupe = await trx("groupe_instructeurs")
      .select("id")
      .where({ id: creation.groupe_instructeurs })
      .first();
    if (!groupe) {
      throw new TypeError(`Unknown groupe_instructeurs: ${creation.groupe_instructeurs}`);
    }

    const adminPersonneId = await ensurePersonneIdByEmail(adminEmail, trx);

    let demandeurPersonnePhysiqueId: PersonneId | null = null;
    if (creation.demandeur_personne_physique) {
      demandeurPersonnePhysiqueId = await ensureDemandeurPersonnePhysiqueId(
        creation.demandeur_personne_physique,
        trx,
      );
    }

    let demandeurPersonneMoraleSiret: Entreprise["siret"] | null = null;
    if (creation.demandeur_personne_morale) {
      await dumpEntreprises([creation.demandeur_personne_morale as Entreprise], trx);
      demandeurPersonneMoraleSiret = creation.demandeur_personne_morale.siret;
    }

    const [{ id: dossierId }] = await trx("dossier")
      .insert({
        ...creation.columns,
        name: creation.name,
        depot_date: creation.depot_date,
        demandeur_personne_physique: demandeurPersonnePhysiqueId,
        demandeur_personne_morale: demandeurPersonneMoraleSiret,
        demarche_numerique_id: null,
        demarche_numerique_number: null,
        demarche_number: null,
      })
      .returning("id");

    if (creation.demandeur_personne_physique) {
      const { first_names, last_name, email } = creation.demandeur_personne_physique;
      await trx("identite_dossier").insert({
        dossier: dossierId,
        type: "demandeur",
        first_names,
        last_name,
        email: email ? normalizeEmail(email) : null,
      });
    }

    await trx("edge_groupe_instructeurs__dossier").insert({
      dossier: dossierId,
      groupe_instructeurs: creation.groupe_instructeurs,
    });
    await trx("evenement_phase_dossier").insert({
      dossier: dossierId,
      phase: creation.phase,
      timestamp: new Date(),
      caused_by_personne: adminPersonneId,
    });

    return { id: dossierId };
  });
}
