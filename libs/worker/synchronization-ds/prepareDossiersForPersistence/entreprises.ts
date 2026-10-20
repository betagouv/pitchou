import { dumpEntreprises } from "@pitchou/server/database.ts";
import { logActionsDossier } from "@pitchou/server/database/action_dossier.ts";
import { companyPropertyLabels } from "@pitchou/types/notification.ts";
import type { ActionDossierInitializer } from "@pitchou/types/database/public/ActionDossier.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type Entreprise from "@pitchou/types/database/public/Entreprise.ts";
import type {
  DossierEntreprisesPersonneInitializersForInsert,
  DossierEntreprisesPersonneInitializersForUpdate,
} from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";
import type { Knex } from "knex";
export async function prepareEntreprises(
  dossiers: (
    | DossierEntreprisesPersonneInitializersForInsert
    | DossierEntreprisesPersonneInitializersForUpdate
  )[],
  dossiersToUpdateForSync: DossierEntreprisesPersonneInitializersForUpdate[],
  transaction: Knex.Transaction,
) {
  const entreprisesBySiret = new Map<Entreprise["siret"], Entreprise>();
  for (const { dossier } of dossiers) {
    const entreprise = dossier.demandeur_personne_morale;
    if (!entreprise) continue;
    if (!entreprise.siret) {
      throw new TypeError(
        `Siret manquant pour l'entreprise ${JSON.stringify(entreprise)} (id_DN: ${dossier.demarche_numerique_id})`,
      );
    }
    entreprisesBySiret.set(entreprise.siret, entreprise as Entreprise);
  }
  const companyActions: ActionDossierInitializer[] = [];
  if (dossiersToUpdateForSync.length || entreprisesBySiret.size) {
    const current: (Entreprise & {
      dossier: DossierId;
      demarche_numerique_number: string;
      source: string;
    })[] = await transaction("dossier as d")
      .leftJoin("entreprise as e", "e.siret", "d.demandeur_personne_morale")
      .select("e.*", "d.id as dossier", "d.demarche_numerique_number", "d.source")
      .where(function () {
        this.where(function () {
          this.where("d.source", "demarche_numerique").whereIn(
            "d.demarche_numerique_number",
            dossiersToUpdateForSync
              .map(({ dossier }) => dossier.demarche_numerique_number)
              .filter((number) => number != null),
          );
        }).orWhereIn("d.demandeur_personne_morale", [...entreprisesBySiret.keys()]);
      });
    const incomingByNumber = new Map(
      dossiersToUpdateForSync.map(({ dossier }) => [
        dossier.demarche_numerique_number,
        dossier.demandeur_personne_morale,
      ]),
    );
    const storedCompanies: Entreprise[] = entreprisesBySiret.size
      ? await transaction("entreprise")
          .select("*")
          .whereIn("siret", [...entreprisesBySiret.keys()])
      : [];
    const storedBySiret = new Map(storedCompanies.map((company) => [company.siret, company]));
    const writtenProperties = new Set([...entreprisesBySiret.values()].flatMap(Object.keys));
    companyActions.push(
      ...companyChangeActions(
        current,
        incomingByNumber,
        storedBySiret,
        entreprisesBySiret,
        writtenProperties,
      ),
    );
    await logActionsDossier(companyActions, transaction);
  }
  if (entreprisesBySiret.size >= 1) {
    await dumpEntreprises([...entreprisesBySiret.values()], transaction);
  }

  return new Set(companyActions.map(({ dossier }) => dossier));
}

function companyChangeActions(
  current: (Entreprise & {
    dossier: DossierId;
    demarche_numerique_number: string;
    source: string;
  })[],
  incomingByNumber: Map<
    string | null | undefined,
    DossierEntreprisesPersonneInitializersForUpdate["dossier"]["demandeur_personne_morale"]
  >,
  storedBySiret: Map<Entreprise["siret"], Entreprise>,
  entreprisesBySiret: Map<Entreprise["siret"], Entreprise>,
  writtenProperties: Set<string>,
): ActionDossierInitializer[] {
  const companyActions: ActionDossierInitializer[] = [];
  for (const row of current) {
    const inBatch =
      row.source === "demarche_numerique" && incomingByNumber.has(row.demarche_numerique_number);
    const targetSiret = inBatch
      ? incomingByNumber.get(row.demarche_numerique_number)?.siret
      : row.siret;
    // Knex writes the union of the batch's columns. Missing values in those
    // columns become NULL; columns absent from the entire batch are retained.
    const after = targetSiret
      ? {
          ...storedBySiret.get(targetSiret),
          ...Object.fromEntries(
            [...writtenProperties].map((property) => [
              property,
              entreprisesBySiret.get(targetSiret)?.[property as keyof Entreprise] ?? null,
            ]),
          ),
        }
      : null;
    for (const property of Object.keys(companyPropertyLabels) as (keyof Entreprise)[]) {
      const from = row[property] || null;
      const to = after?.[property] || null;
      if (from === to) continue;
      const label = `Entreprise : ${companyPropertyLabels[property]}`;
      companyActions.push({
        dossier: row.dossier,
        type: "champ_modifie",
        author_petitionnaire: true,
        data: {
          field: label,
          label,
          notification_field: `entreprise.${property}`,
          from,
          to,
          notification: true,
        },
      });
    }
  }
  return companyActions;
}
